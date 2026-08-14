import type{Pool,PoolClient}from'pg';
import{enqueueJob}from'./job-queue.js';
import type{CorpusQueuePlan,CorpusQueueItem}from'./corpus-queue-plan.js';

export interface CorpusEnqueueResult{queued:Array<{key:string;runId:string;attemptNo:number;runKey:string;jobId:string;jobStatus:string}>;skippedActive:Array<{key:string;runId:string;status:'queued'|'processing'}>;blockedSources:string[];skippedComplete:string[]}
interface PairMetadata{syllabusId:string;componentId:string;year:number;series:'FM'|'MJ'|'ON';variant:number;qpSha:string;msSha:string}

export async function enqueueCorpusPlan(pool:Pool,plan:CorpusQueuePlan,input:{pipelineVersion?:string}={}):Promise<CorpusEnqueueResult>{
 const pipelineVersion=input.pipelineVersion??'real-paper-v2';const queued:CorpusEnqueueResult['queued']=[],skippedActive:CorpusEnqueueResult['skippedActive']=[];
 for(const item of plan.items){const client=await pool.connect();try{await client.query('begin');const metadata=await loadPairMetadata(client,item);const baseRunKey=buildSourceRunKey(pipelineVersion,metadata.qpSha,metadata.msSha);const existing=await client.query(`select id,status,attempt_no from ingestion_runs where component_id=$1 and year=$2 and series=$3 and variant=$4 for update`,[metadata.componentId,metadata.year,metadata.series,metadata.variant]);
   if(existing.rowCount&&['queued','processing'].includes(String(existing.rows[0].status))){const row=existing.rows[0];await client.query('commit');skippedActive.push({key:item.key,runId:String(row.id),status:String(row.status)as'queued'|'processing'});continue}
   let runId:string,attemptNo:number;
   if(existing.rowCount){const updated=await client.query(`update ingestion_runs set qp_paper_id=$2,ms_paper_id=$3,status='queued',attempt_no=attempt_no+1,run_key=$4,updated_at=now() where id=$1 returning id,attempt_no`,[existing.rows[0].id,item.qpPaperId,item.msPaperId,baseRunKey]);runId=String(updated.rows[0].id);attemptNo=Number(updated.rows[0].attempt_no)}
   else{const inserted=await client.query(`insert into ingestion_runs(syllabus_id,component_id,year,series,variant,qp_paper_id,ms_paper_id,status,attempt_no,run_key) values($1,$2,$3,$4,$5,$6,$7,'queued',1,$8) returning id,attempt_no`,[metadata.syllabusId,metadata.componentId,metadata.year,metadata.series,metadata.variant,item.qpPaperId,item.msPaperId,baseRunKey]);runId=String(inserted.rows[0].id);attemptNo=Number(inserted.rows[0].attempt_no)}
   const runKey=`${baseRunKey}:attempt-${attemptNo}`;await client.query(`update ingestion_runs set run_key=$2 where id=$1`,[runId,runKey]);
   const job=await enqueueJob(client,{kind:'ingest-bundle',payload:{runId,qpPaperId:item.qpPaperId,msPaperId:item.msPaperId,runKey},idempotencyKey:`ingest-run:${runId}:${runKey}:bundle`,priority:50,refTable:'ingestion_runs',refId:runId});
   await client.query('commit');queued.push({key:item.key,runId,attemptNo,runKey,jobId:String(job.id),jobStatus:String(job.status)});
  }catch(error){await safeRollback(client);throw new Error(`corpus_enqueue_failed:${item.key}:${error instanceof Error?error.message:String(error)}`)}finally{client.release()}}
 return{queued,skippedActive,blockedSources:plan.blockedSources,skippedComplete:plan.skippedComplete};
}

export function buildSourceRunKey(pipelineVersion:string,qpSha:string,msSha:string){const clean=(value:string)=>value.toLowerCase().replace(/[^a-z0-9._-]/g,'-');return`${clean(pipelineVersion)}:${clean(qpSha).slice(0,20)}:${clean(msSha).slice(0,20)}`}
async function loadPairMetadata(client:PoolClient,item:CorpusQueueItem):Promise<PairMetadata>{const result=await client.query(`select qp.syllabus_id,qp.component_id,qp.year,qp.series::text series,qp.variant,qp.kind::text qp_kind,qp.sha256 qp_sha,ms.syllabus_id ms_syllabus_id,ms.component_id ms_component_id,ms.year ms_year,ms.series::text ms_series,ms.variant ms_variant,ms.kind::text ms_kind,ms.sha256 ms_sha from source_papers qp join source_papers ms on ms.id=$2 where qp.id=$1`,[item.qpPaperId,item.msPaperId]);if(!result.rowCount)throw new Error('source_pair_not_found');const row=result.rows[0];if(row.qp_kind!=='QP'||row.ms_kind!=='MS')throw new Error('source_pair_kind_mismatch');if(String(row.syllabus_id)!==String(row.ms_syllabus_id)||String(row.component_id)!==String(row.ms_component_id)||Number(row.year)!==Number(row.ms_year)||String(row.series)!==String(row.ms_series)||Number(row.variant)!==Number(row.ms_variant))throw new Error('source_pair_metadata_mismatch');return{syllabusId:String(row.syllabus_id),componentId:String(row.component_id),year:Number(row.year),series:row.series,variant:Number(row.variant),qpSha:String(row.qp_sha),msSha:String(row.ms_sha)}}
async function safeRollback(client:PoolClient){try{await client.query('rollback')}catch{}}
