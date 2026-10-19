import { Queue, Worker } from "bullmq";
import { DEAD_LETTER_QUEUE, PUBLICATION_QUEUE, PublicationProcessor, createPublicationQueue, redisConnection, type ProcessorDependencies, type PublicationJobData } from "@promoflow/automation";
import { startHealthServer } from "./health";
import { createProductionDependencies } from "./production-dependencies";
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
  const consumerEnabled = process.env.RUN_PROMOFLOW_WORKER === "true";
  if (consumerEnabled && (!process.env.SUPABASE_SECRET_KEY || !process.env.TELEGRAM_BOT_TOKEN)) {
    throw new Error("SUPABASE_SECRET_KEY and TELEGRAM_BOT_TOKEN are required when the consumer is enabled");
  }
  const consumer = consumerEnabled ? createPublicationWorker(redisUrl, createProductionDependencies({
    supabaseUrl: process.env.SUPABASE_URL ?? supabaseUrl,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? "",
    telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    allowOnlyTestDestinations: process.env.ALLOW_ONLY_TEST_DESTINATIONS !== "false",
  })) : undefined;
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

  console.log(JSON.stringify({ status: "ready", publicationConsumer: consumerEnabled ? "enabled" : "disabled", safety: "global-pause" }));
  const close = async () => {
    server.close();
    await consumer?.close();
    await queue.close();
  };
  process.once("SIGTERM", () => void close());
  process.once("SIGINT", () => void close());
}

if (process.env.NODE_ENV === "production" || process.env.START_READINESS_RUNTIME === "true") {
  void startReadinessRuntime().catch((error) => {
    console.error(error instanceof Error ? error.message : "Worker bootstrap failed");
    process.exit(1);
  });
}
