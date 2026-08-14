import{describe,expect,it,vi}from'vitest';import type{Pool}from'pg';import{createIngestionProcessors}from'./ingestion.js';
const job=(kind:string,payload:unknown)=>({id:`job-${kind}`,kind,payload,attempts:1,maxAttempts:3});
describe('versioned ingestion run keys',()=>{
 it('threads runKey through every durable stage key',async()=>{
  const runKey='real-paper-v2:qp123:ms456';
  const processors=createIngestionProcessors({query:vi.fn().mockResolvedValue({rowCount:1,rows:[{result:{prepared:true}}]})}as unknown as Pool,{prepare:vi.fn().mockResolvedValue({prepared:true})});
  const start=await processors['ingest-bundle']!(job('ingest-bundle',{runId:'run-a',qpPaperId:'qp-a',msPaperId:'ms-a',runKey}));
  expect(start).toMatchObject({next:{kind:'ingest-prepare',idempotencyKey:`ingest-run:run-a:${runKey}:prepare`,payload:{runKey}}});
  const next=await processors['ingest-prepare']!(job('ingest-prepare',{refId:'run-a',refTable:'ingestion_runs',previousJobId:'previous',runKey}));
  expect(next).toMatchObject({next:{kind:'ingest-segment',idempotencyKey:`ingest-run:run-a:${runKey}:segment`,payload:{runKey}}});
 });
});
