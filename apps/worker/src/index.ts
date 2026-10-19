import { Queue, Worker } from "bullmq";
import { DEAD_LETTER_QUEUE, PUBLICATION_QUEUE, PublicationProcessor, createPublicationQueue, redisConnection, type ProcessorDependencies, type PublicationJobData } from "@promoflow/automation";
import { startHealthServer } from "./health";
export { startHealthServer } from "./health";

export function createPublicationWorker(redisUrl:string,dependencies:ProcessorDependencies){const connection=redisConnection(redisUrl);const processor=new PublicationProcessor(dependencies);const deadLetter=new Queue<PublicationJobData>(DEAD_LETTER_QUEUE,{connection});const worker=new Worker<PublicationJobData>(PUBLICATION_QUEUE,async job=>processor.process(job.data),{connection,concurrency:5,limiter:{max:20,duration:1_000},lockDuration:30_000,maxStalledCount:1});worker.on("failed",async(job)=>{if(job&&job.attemptsMade>=Number(job.opts.attempts??1)){await deadLetter.add("dead-letter",job.data,{jobId:`dead_${job.id}`,removeOnComplete:false});console.error("Publication moved to dead-letter queue",{jobId:job.data.jobId,code:"ATTEMPTS_EXHAUSTED"});}});return{worker,deadLetter,close:async()=>{await worker.close();await deadLetter.close();}};}

async function startReadinessRuntime() {
  const redisUrl = process.env.REDIS_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!redisUrl || !supabaseUrl || !supabaseKey) {
    throw new Error("REDIS_URL and Supabase public configuration are required");
  }

  const queue = createPublicationQueue(redisUrl);
  const server = startHealthServer(Number(process.env.PORT ?? 3000), {
    redis: async () => {
      await queue.getJobCounts();
      return true;
    },
    database: async () => {
      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
        headers: { apikey: supabaseKey, authorization: `Bearer ${supabaseKey}` },
        signal: AbortSignal.timeout(5_000),
      });
      return response.ok;
    },
  });

  console.log(JSON.stringify({ status: "ready", publicationConsumer: "disabled", safety: "global-pause" }));
  const close = async () => {
    server.close();
    await queue.close();
  };
  process.once("SIGTERM", () => void close());
  process.once("SIGINT", () => void close());
}

if (process.env.RUN_PROMOFLOW_WORKER === "true") {
  throw new Error("Publication consumer dependencies are not composed; automatic sending remains disabled.");
}

if (process.env.NODE_ENV === "production" || process.env.START_READINESS_RUNTIME === "true") {
  void startReadinessRuntime().catch((error) => {
    console.error(error instanceof Error ? error.message : "Worker bootstrap failed");
    process.exit(1);
  });
}
