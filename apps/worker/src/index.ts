import { Queue, Worker } from "bullmq";
import { DEAD_LETTER_QUEUE, PUBLICATION_QUEUE, PublicationProcessor, redisConnection, type ProcessorDependencies, type PublicationJobData } from "@promoflow/automation";
export { startHealthServer } from "./health";

export function createPublicationWorker(redisUrl:string,dependencies:ProcessorDependencies){const connection=redisConnection(redisUrl);const processor=new PublicationProcessor(dependencies);const deadLetter=new Queue<PublicationJobData>(DEAD_LETTER_QUEUE,{connection});const worker=new Worker<PublicationJobData>(PUBLICATION_QUEUE,async job=>processor.process(job.data),{connection,concurrency:5,limiter:{max:20,duration:1_000},lockDuration:30_000,maxStalledCount:1});worker.on("failed",async(job)=>{if(job&&job.attemptsMade>=Number(job.opts.attempts??1)){await deadLetter.add("dead-letter",job.data,{jobId:`dead_${job.id}`,removeOnComplete:false});console.error("Publication moved to dead-letter queue",{jobId:job.data.jobId,code:"ATTEMPTS_EXHAUSTED"});}});return{worker,deadLetter,close:async()=>{await worker.close();await deadLetter.close();}};}

if(process.env.RUN_PROMOFLOW_WORKER==="true"){throw new Error("Worker dependencies must be composed by the deployment bootstrap; direct production sending is disabled by default.");}
