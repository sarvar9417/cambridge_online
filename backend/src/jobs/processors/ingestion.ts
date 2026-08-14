import{execFile}from'node:child_process';
import{mkdir,readFile,readdir,stat}from'node:fs/promises';
import{join,resolve}from'node:path';
import{promisify}from'node:util';
import type{Pool}from'pg';
import{config}from'../../config.js';
import type{ChainedJobResult,Job,JobProcessor}from'../job-queue.js';

const run=promisify(execFile);
export const INGESTION_STAGES=['prepare','segment','extract-qp','extract-ms','match','assets','classify','validate','crosscheck','persist']as const;
export type IngestionStage=typeof INGESTION_STAGES[number];
type Artifact=Record<string,unknown>;
export type IngestionStageHandler=(paperId:string,input:Artifact)=>Promise<Artifact>;

export function createIngestionProcessors(pool:Pool,overrides:Partial<Record<IngestionStage,IngestionStageHandler>>={}):Record<string,JobProcessor>{
  const handlers:Record<IngestionStage,IngestionStageHandler>={
    prepare:(paperId)=>preparePaper(pool,paperId),segment:(_paperId,input)=>segmentPreparedArtifact(input),
    'extract-qp':unavailable('extract-qp'),'extract-ms':unavailable('extract-ms'),match:unavailable('match'),
    assets:unavailable('assets'),classify:unavailable('classify'),validate:unavailable('validate'),
    crosscheck:unavailable('crosscheck'),persist:unavailable('persist'),...overrides,
  };
  const processors:Record<string,JobProcessor>={'ingest-paper':async(job)=>chain(job,String((job.payload as any).paperId),{},'prepare')};
  for(const [index,stage]of INGESTION_STAGES.entries())processors[`ingest-${stage}`]=async(job)=>{
    const payload=job.payload as{paperId:string;previousJobId:string};
    const input=await previousArtifact(pool,payload.previousJobId);
    const result=await handlers[stage](payload.paperId,input);
    const next=INGESTION_STAGES[index+1];
    return next?chain(job,payload.paperId,result,next):result;
  };
  return processors;
}

function chain(job:Job,paperId:string,result:Artifact,next:IngestionStage):ChainedJobResult{return{result,next:{kind:`ingest-${next}`,payload:{paperId,previousJobId:job.id},idempotencyKey:`ingest:${paperId}:${next}`,refTable:'source_papers',refId:paperId}}}
function unavailable(stage:IngestionStage):IngestionStageHandler{return async()=>{throw new Error(`ingestion_stage_unavailable:${stage}`)}}
async function previousArtifact(pool:Pool,id:string){const result=await pool.query(`select result from jobs where id=$1 and status='succeeded'`,[id]);if(!result.rowCount)throw new Error('ingestion_previous_stage_missing');return(result.rows[0].result??{})as Artifact}

async function preparePaper(pool:Pool,paperId:string):Promise<Artifact>{
  const pdftoppm=config.PDFTOPPM_PATH,pdftotext=config.PDFTOTEXT_PATH;
  if(!pdftoppm||!pdftotext)throw new Error('ingestion_prepare_unavailable:poppler');
  const paper=await pool.query(`select storage_path from source_papers where id=$1`,[paperId]);if(!paper.rowCount)throw new Error('ingestion_paper_not_found');
  const source=resolve(String(paper.rows[0].storage_path));await stat(source);
  const outputDir=resolve(config.EXPORT_DIR,'..','ingestion',paperId,'prepared');await mkdir(outputDir,{recursive:true});
  const imagePrefix=join(outputDir,'page'),textPath=join(outputDir,'pages.txt');
  await run(pdftoppm,['-png','-r','200',source,imagePrefix],{maxBuffer:10*1024*1024});
  await run(pdftotext,['-layout',source,textPath],{maxBuffer:10*1024*1024});
  const pageImages=(await readdir(outputDir)).filter(name=>/^page-\d+\.png$/.test(name)).sort((a,b)=>pageNumber(a)-pageNumber(b)).map(name=>join(outputDir,name));
  if(!pageImages.length)throw new Error('ingestion_prepare_no_pages');
  await pool.query(`update source_papers set page_count=$2 where id=$1`,[paperId,pageImages.length]);
  return{paperId,sourcePath:source,outputDir,textPath,pageImages,pageCount:pageImages.length};
}

export async function segmentPreparedArtifact(input:Artifact):Promise<Artifact>{
  const pageImages=asStrings(input.pageImages),textPath=String(input.textPath??'');if(!pageImages.length||!textPath)throw new Error('ingestion_prepare_artifact_invalid');
  const pages=(await readFile(textPath,'utf8')).split('\f');const batches=[]as Array<{pageNumbers:number[];images:string[];text:string}>;
  for(let start=0;start<pageImages.length;start+=2){const end=Math.min(start+3,pageImages.length),indexes=Array.from({length:end-start},(_,i)=>start+i);batches.push({pageNumbers:indexes.map(i=>i+1),images:indexes.map(i=>pageImages[i]!),text:indexes.map(i=>pages[i]??'').join('\n\f\n')});if(end===pageImages.length)break;}
  return{...input,batches};
}
function asStrings(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[]}
function pageNumber(name:string){return Number(name.match(/(\d+)/)?.[1]??0)}
