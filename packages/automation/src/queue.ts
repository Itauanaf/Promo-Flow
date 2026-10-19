import { Queue,type JobsOptions } from "bullmq";

export const PUBLICATION_QUEUE="promoflow-publications";export const DEAD_LETTER_QUEUE="promoflow-publications-dead";
export interface PublicationJobData{jobId:string;ruleId:string;offerId:string;destinationId:string;idempotencyKey:string;scheduledAt:string;}
export function redisConnection(url:string){const parsed=new URL(url);return{host:parsed.hostname,port:Number(parsed.port||6379),username:parsed.username||undefined,password:parsed.password||undefined,tls:parsed.protocol==="rediss:"?{}:undefined};}
export function createPublicationQueue(redisUrl:string){return new Queue<PublicationJobData>(PUBLICATION_QUEUE,{connection:redisConnection(redisUrl),defaultJobOptions:{attempts:5,backoff:{type:"exponential",delay:2_000},removeOnComplete:{age:86_400,count:5_000},removeOnFail:false} satisfies JobsOptions});}
export async function enqueuePublication(queue:Queue<PublicationJobData>,data:PublicationJobData){const bullJobId=data.idempotencyKey.replaceAll(":","_");return queue.add("publish",data,{jobId:bullJobId,delay:Math.max(0,new Date(data.scheduledAt).getTime()-Date.now())});}
