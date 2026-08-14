import{randomUUID}from'node:crypto';import type{Pool}from'pg';import{JobQueue,type ChainedJobResult,type JobProcessor}from'./job-queue.js';
export class JobRunner{private stopped=false;private workerId=`worker-${randomUUID()}`;constructor(private pool:Pool,private processors:Record<string,JobProcessor>,private pollMs=1000){}
async runOnce(kinds?:string[]){const queue=new JobQueue(this.pool);const job=await queue.claim(this.workerId,kinds);if(!job)return false;try{const processor=this.processors[job.kind];if(!processor)throw Error(`No processor for ${job.kind}`);const result=await processor(job);if(isChained(result))await queue.succeedAndEnqueue(job.id,result);else await queue.succeed(job.id,result);}catch(error){await queue.fail(job,error)}return true}
async start(){const queue=new JobQueue(this.pool);await queue.recoverStale();while(!this.stopped){const worked=await this.runOnce();if(!worked)await new Promise(r=>setTimeout(r,this.pollMs))}}
stop(){this.stopped=true}}
function isChained(value:unknown):value is ChainedJobResult{return typeof value==='object'&&value!==null&&'result'in value&&'next'in value}
