import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { buildSourceRunKey } from './corpus-enqueue.js';
import { planFailedCorpusResume, resumeFailedCorpusRun } from './corpus-resume.js';

const qpSha='a'.repeat(64),msSha='b'.repeat(64),base=buildSourceRunKey('real-paper-v2',qpSha,msSha);

function mockPool(input:{runStatus?:string;attemptNo?:number;runKey?:string;failedKind?:string;predecessorStatus?:string;predecessorBytes?:number;duplicate?:boolean}={}){
  const runStatus=input.runStatus??'failed',attemptNo=input.attemptNo??1,runKey=input.runKey??`${base}:attempt-${attemptNo}`,failedKind=input.failedKind??'ingest-classify',predecessorStatus=input.predecessorStatus??'succeeded',predecessorBytes=input.predecessorBytes??155801;
  const query=vi.fn(async(sql:string,values?:unknown[])=>{
    if(sql==='begin'||sql==='begin read only'||sql==='commit'||sql==='rollback')return{rowCount:null,rows:[]};
    if(sql.startsWith('select ir.id,ir.status::text'))return{rowCount:1,rows:[{id:'run-1',status:runStatus,attempt_no:attemptNo,run_key:runKey,qp_sha:qpSha,ms_sha:msSha}]};
    if(sql.startsWith('select id,kind,payload,error'))return{rowCount:1,rows:[{id:'failed-1',kind:failedKind,payload:{refId:'run-1',refTable:'ingestion_runs',previousJobId:'prev-1',runKey}}]};
    if(sql.startsWith('select id,kind,status::text status,octet_length'))return{rowCount:1,rows:[{id:'prev-1',kind:'ingest-assets',status:predecessorStatus,result_bytes:predecessorBytes}]};
    if(sql.startsWith('select id,status::text status from jobs where idempotency_key'))return{rowCount:input.duplicate?1:0,rows:input.duplicate?[{id:'dupe',status:'queued'}]:[]};
    if(sql.startsWith('insert into jobs'))return{rowCount:1,rows:[{id:'resume-job',status:'queued'}]};
    if(sql.startsWith('update ingestion_runs'))return{rowCount:1,rows:[]};
    throw new Error(`unexpected query: ${sql} ${JSON.stringify(values)}`);
  });
  const client={query,release:vi.fn()} as unknown as PoolClient;
  return{pool:{connect:vi.fn().mockResolvedValue(client)} as unknown as Pool,query,client};
}

describe('corpus durable resume',()=>{
  it('plans a failed classify retry from the immutable succeeded assets artifact',async()=>{
    const p=mockPool();
    const plan=await planFailedCorpusResume(p.pool,'run-1');
    expect(plan).toMatchObject({runId:'run-1',failedKind:'ingest-classify',stage:'classify',predecessorJobId:'prev-1',predecessorKind:'ingest-assets',predecessorResultBytes:155801,previousAttemptNo:1,nextAttemptNo:2,safe:true});
    expect(plan.nextRunKey).toBe(`${base}:attempt-2`);
    expect(p.query.mock.calls.map(([sql])=>sql)).toContain('begin read only');
    expect(p.query.mock.calls.some(([sql])=>String(sql).startsWith('insert into jobs'))).toBe(false);
  });

  it('queues only the failed durable stage and increments the run attempt atomically',async()=>{
    const p=mockPool();
    const result=await resumeFailedCorpusRun(p.pool,'run-1');
    expect(result).toMatchObject({jobId:'resume-job',jobStatus:'queued',nextAttemptNo:2,stage:'classify'});
    const insert=p.query.mock.calls.find(([sql])=>String(sql).startsWith('insert into jobs'));
    expect(insert?.[1]).toEqual(expect.arrayContaining([
      'ingest-classify',
      expect.objectContaining({refId:'run-1',previousJobId:'prev-1',runKey:`${base}:attempt-2`}),
      `ingest-run:run-1:${base}:attempt-2:classify`,
    ]));
    const update=p.query.mock.calls.find(([sql])=>String(sql).startsWith('update ingestion_runs'));
    expect(update?.[1]).toEqual(['run-1',2,`${base}:attempt-2`]);
    expect(p.query.mock.calls.map(([sql])=>sql)).toEqual(expect.arrayContaining(['begin','commit']));
  });

  it('refuses stages whose predecessor may depend on worker-local prepared files',async()=>{
    const p=mockPool({failedKind:'ingest-assets'});
    await expect(planFailedCorpusResume(p.pool,'run-1')).rejects.toThrow('corpus_resume_stage_not_durable:ingest-assets');
  });

  it('refuses resume after QP/MS bytes or pipeline version changed',async()=>{
    const p=mockPool({runKey:`other-pipeline:${'a'.repeat(20)}:${'b'.repeat(20)}:attempt-1`});
    await expect(planFailedCorpusResume(p.pool,'run-1')).rejects.toThrow('corpus_resume_source_or_pipeline_changed');
  });

  it('refuses a missing/empty predecessor artifact and duplicate attempt',async()=>{
    await expect(planFailedCorpusResume(mockPool({predecessorBytes:0}).pool,'run-1')).rejects.toThrow('corpus_resume_predecessor_artifact_empty');
    await expect(planFailedCorpusResume(mockPool({duplicate:true}).pool,'run-1')).rejects.toThrow('corpus_resume_attempt_already_exists:queued');
  });

  it('requires a failed run',async()=>{
    await expect(planFailedCorpusResume(mockPool({runStatus:'approved'}).pool,'run-1')).rejects.toThrow('corpus_resume_run_not_failed:approved');
  });
});
