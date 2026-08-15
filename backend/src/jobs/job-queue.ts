import type{Pool,PoolClient}from'pg';
export interface Job{id:string;kind:string;payload:unknown;attempts:number;maxAttempts:number;refTable?:string;refId?:string}
export interface NextJob{kind:string;payload?:unknown;idempotencyKey:string;priority?:number;refTable?:string;refId?:string}
export interface ChainedJobResult{result:unknown;next:NextJob}
export interface EnqueueJobInput{kind:string;payload?:unknown;idempotencyKey:string;priority?:number;refTable?:string;refId?:string}

/**
 * Every statement the queue issues, in one place so a test can hand them to
 * PostgreSQL and have it check the parameter types.
 *
 * That check is not academic. `fail` used to bind $2 to both `status=$2`, which
 * deduces the job_status enum, and a bare `$2='failed'`, which deduces text;
 * PostgreSQL refuses to unify those and threw. Because it threw inside the
 * failure path, every job error was replaced by this statement's own error and
 * the run stalled with nothing recorded. Only a real parse catches that, so the
 * SQL lives here rather than inline.
 */
export const JOB_QUEUE_SQL={
 enqueue:`insert into jobs(kind,payload,idempotency_key,priority,ref_table,ref_id)values($1,$2,$3,$4,$5,$6) on conflict(idempotency_key)do update set idempotency_key=excluded.idempotency_key returning id,status`,
 claimSelect:`select id,kind,payload,attempts,max_attempts,ref_table,ref_id from jobs where status='queued' and scheduled_at<=now() and($1::text[] is null or kind=any($1)) order by priority,created_at for update skip locked limit 1`,
 claimMark:`update jobs set status='running',locked_at=now(),locked_by=$2,started_at=coalesce(started_at,now()),attempts=attempts+1 where id=$1`,
 claimRun:`update ingestion_runs set status='processing',updated_at=now() where id=$1 and status in('queued','processing')`,
 succeed:`with completed as(update jobs set status='succeeded',result=$2,finished_at=now(),locked_at=null,locked_by=null where id=$1 returning kind,ref_table,ref_id) update ingestion_runs ir set status=case when $2::jsonb->>'reviewStatus'='needs_review' then 'needs_review' else 'approved' end,updated_at=now() from completed c where c.kind='ingest-persist' and c.ref_table='ingestion_runs' and ir.id=c.ref_id`,
 succeedChained:`update jobs set status='succeeded',result=$2,finished_at=now(),locked_at=null,locked_by=null where id=$1`,
 enqueueChained:`insert into jobs(kind,payload,idempotency_key,priority,ref_table,ref_id)values($1,$2,$3,$4,$5,$6)on conflict(idempotency_key)do nothing`,
 // $2 stays text and is cast only where it lands in the column, so the bare
 // literal comparisons below agree with it.
 fail:`with failed_job as(update jobs set status=$2::job_status,error=$3,finished_at=case when $2='failed' then now() else null end,scheduled_at=case when $2='queued' then now()+least(300,power(2,$4))*interval '1 second' else scheduled_at end,locked_at=null,locked_by=null where id=$1 returning ref_table,ref_id) update ingestion_runs ir set status='failed',updated_at=now() from failed_job j where $2='failed' and j.ref_table='ingestion_runs' and ir.id=j.ref_id`,
 recoverStale:`update jobs set status='queued',locked_at=null,locked_by=null,scheduled_at=now() where status='running' and locked_at<now()-$1*interval '1 minute' returning id`,
}as const;

export async function enqueueJob(queryable:Pool|PoolClient,input:EnqueueJobInput){const r=await queryable.query(JOB_QUEUE_SQL.enqueue,[input.kind,input.payload??{},input.idempotencyKey,input.priority??100,input.refTable??null,input.refId??null]);return r.rows[0]}
export class JobQueue{constructor(private pool:Pool){}
async enqueue(input:EnqueueJobInput){return enqueueJob(this.pool,input)}
async claim(workerId:string,kinds?:string[]):Promise<Job|null>{const c=await this.pool.connect();try{await c.query('begin');const r=await c.query(JOB_QUEUE_SQL.claimSelect,[kinds?.length?kinds:null]);if(!r.rowCount){await c.query('commit');return null}const row=r.rows[0];await c.query(JOB_QUEUE_SQL.claimMark,[row.id,workerId]);if(row.ref_table==='ingestion_runs')await c.query(JOB_QUEUE_SQL.claimRun,[row.ref_id]);await c.query('commit');return{id:row.id,kind:row.kind,payload:row.payload,attempts:row.attempts+1,maxAttempts:row.max_attempts,refTable:row.ref_table??undefined,refId:row.ref_id??undefined}}catch(e){await c.query('rollback');throw e}finally{c.release()}}
async succeed(id:string,result:unknown){await this.pool.query(JOB_QUEUE_SQL.succeed,[id,result])}
async succeedAndEnqueue(id:string,completion:ChainedJobResult){const c=await this.pool.connect();try{await c.query('begin');await c.query(JOB_QUEUE_SQL.succeedChained,[id,completion.result]);const n=completion.next;await c.query(JOB_QUEUE_SQL.enqueueChained,[n.kind,n.payload??{},n.idempotencyKey,n.priority??100,n.refTable??null,n.refId??null]);await c.query('commit')}catch(error){await c.query('rollback');throw error}finally{c.release()}}
async fail(job:Job,error:unknown){const terminal=job.attempts>=job.maxAttempts;await this.pool.query(JOB_QUEUE_SQL.fail,[job.id,terminal?'failed':'queued',error instanceof Error?error.message:String(error),job.attempts])}
async recoverStale(minutes=10){const r=await this.pool.query(JOB_QUEUE_SQL.recoverStale,[minutes]);return r.rowCount??0}}
export type JobProcessor=(job:Job,client?:PoolClient)=>Promise<unknown>;
