import{execFile}from'node:child_process';
import{mkdir,readFile,readdir,stat}from'node:fs/promises';
import{join,resolve}from'node:path';
import{promisify}from'node:util';
import type{Pool}from'pg';
import{config}from'../../config.js';
import{findDependencyMentions}from'../../lib/validation/dependencies.js';
import{validateExtraction,type ValidationInput}from'../../lib/validation/rules.js';
import type{ChainedJobResult,Job,JobProcessor}from'../job-queue.js';

const run=promisify(execFile);
export const INGESTION_STAGES=['prepare','segment','extract-qp','extract-ms','match','assets','classify','depends','validate','crosscheck','persist']as const;
export type IngestionStage=typeof INGESTION_STAGES[number];
type Artifact=Record<string,unknown>;
export type IngestionStageHandler=(paperId:string,input:Artifact)=>Promise<Artifact>;

export function createIngestionProcessors(pool:Pool,overrides:Partial<Record<IngestionStage,IngestionStageHandler>>={}):Record<string,JobProcessor>{
  const handlers:Record<IngestionStage,IngestionStageHandler>={
    prepare:(_refId,input)=>prepareInput(pool,input),segment:(_refId,input)=>segmentInput(input),
    'extract-qp':unavailable('extract-qp'),'extract-ms':unavailable('extract-ms'),match:(_paperId,input)=>matchExtractedArtifacts(input),
    assets:unavailable('assets'),classify:unavailable('classify'),depends:(_paperId,input)=>detectDependencyCandidates(input),validate:(_paperId,input)=>validateIngestionArtifact(input),
    crosscheck:unavailable('crosscheck'),persist:unavailable('persist'),...overrides,
  };
  const processors:Record<string,JobProcessor>={
    'ingest-paper':async(job)=>{const paperId=String((job.payload as any).paperId);return chain(job,paperId,'source_papers',{paperId},'prepare')},
    'ingest-bundle':async(job)=>{const payload=job.payload as{runId:string;qpPaperId:string;msPaperId:string};return chain(job,payload.runId,'ingestion_runs',payload,'prepare')},
  };
  for(const [index,stage]of INGESTION_STAGES.entries())processors[`ingest-${stage}`]=async(job)=>{
    const payload=job.payload as{refId?:string;refTable?:'source_papers'|'ingestion_runs';paperId?:string;previousJobId:string};
    const input=await previousArtifact(pool,payload.previousJobId);
    const refId=payload.refId??String(payload.paperId),refTable=payload.refTable??'source_papers';
    const result=await handlers[stage](refId,input);
    const next=INGESTION_STAGES[index+1];
    return next?chain(job,refId,refTable,result,next):result;
  };
  return processors;
}

function chain(job:Job,refId:string,refTable:'source_papers'|'ingestion_runs',result:Artifact,next:IngestionStage):ChainedJobResult{const prefix=refTable==='ingestion_runs'?'ingest-run':'ingest';return{result,next:{kind:`ingest-${next}`,payload:{refId,refTable,previousJobId:job.id},idempotencyKey:`${prefix}:${refId}:${next}`,refTable,refId}}}
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

async function prepareInput(pool:Pool,input:Artifact):Promise<Artifact>{
  const qpPaperId=typeof input.qpPaperId==='string'?input.qpPaperId:null,msPaperId=typeof input.msPaperId==='string'?input.msPaperId:null;
  if(qpPaperId&&msPaperId)return{...input,qp:await preparePaper(pool,qpPaperId),ms:await preparePaper(pool,msPaperId)};
  const paperId=typeof input.paperId==='string'?input.paperId:null;if(!paperId)throw new Error('ingestion_paper_not_found');return preparePaper(pool,paperId);
}

async function segmentInput(input:Artifact):Promise<Artifact>{
  if(isArtifact(input.qp)&&isArtifact(input.ms))return{...input,qp:await segmentPreparedArtifact(input.qp),ms:await segmentPreparedArtifact(input.ms)};
  return segmentPreparedArtifact(input);
}

export async function segmentPreparedArtifact(input:Artifact):Promise<Artifact>{
  const pageImages=asStrings(input.pageImages),textPath=String(input.textPath??'');if(!pageImages.length||!textPath)throw new Error('ingestion_prepare_artifact_invalid');
  const pages=(await readFile(textPath,'utf8')).split('\f');const batches=[]as Array<{pageNumbers:number[];images:string[];text:string}>;
  for(let start=0;start<pageImages.length;start+=2){const end=Math.min(start+3,pageImages.length),indexes=Array.from({length:end-start},(_,i)=>start+i);batches.push({pageNumbers:indexes.map(i=>i+1),images:indexes.map(i=>pageImages[i]!),text:indexes.map(i=>pages[i]??'').join('\n\f\n')});if(end===pageImages.length)break;}
  return{...input,batches};
}

/** QP/MS extraction happens before DB question ids exist, so canonical path is the primary join key. */
export async function matchExtractedArtifacts(input:Artifact):Promise<Artifact>{
  const questions=asRecords(input.questions),schemes=asRecords(input.markSchemes);const refs=new Map<string,Record<string,unknown>>(),duplicates:string[]=[];
  for(const question of questions){const ref=matchKey(question);if(!ref)continue;if(refs.has(ref))duplicates.push(ref);else refs.set(ref,question)}
  const matched:Record<string,unknown>[]=[],unmatchedSchemes:string[]=[];
  for(const scheme of schemes){const ref=matchKey(scheme),question=ref?refs.get(ref):undefined;if(!ref||!question){unmatchedSchemes.push(ref||'(missing)');continue}
    const item:Record<string,unknown>={...scheme};const id=stringField(question,'id'),path=stringField(question,'path');if(id)item.questionId=id;if(path)item.questionPath=path;matched.push(item)}
  const matchedRefs=new Set(matched.map(item=>matchKey(item)));const unmatchedQuestions=[...refs.keys()].filter(ref=>!matchedRefs.has(ref));
  return{...input,markSchemes:matched,matchReport:{duplicateQuestionRefs:[...new Set(duplicates)],unmatchedQuestions,unmatchedSchemes}};
}

/**
 * DEPENDS stage 1: deterministic, deliberately broad sibling-reference scan.
 * A provider/human override may replace this handler and add classified
 * `dependencies` (`text_ref` / `answer_ref`). Without that classification V23
 * keeps the paper in review instead of silently treating the leaf as portable.
 */
export async function detectDependencyCandidates(input:Artifact):Promise<Artifact>{
  const questions=asRecords(input.questions);
  const dependencyCandidates=questions.flatMap(question=>{
    const path=stringField(question,'path');
    const stem=stringField(question,'stemMd')||stringField(question,'stem_md')||stringField(question,'stem')||stringField(question,'stemLatex')||stringField(question,'stem_latex');
    if(!path||!stem)return[];
    const mentions=findDependencyMentions(stem);
    return mentions.length?[{fromPath:path,mentions}]:[];
  });
  return{...input,dependencyCandidates};
}

export async function validateIngestionArtifact(input:Artifact):Promise<Artifact>{
  const candidate=input.validationInput;if(!isValidationInput(candidate))throw new Error('ingestion_validation_artifact_invalid');
  const dependencies=normalizeValidationDependencies(input.dependencies);
  const validationInput:ValidationInput=dependencies.length?{...candidate,dependencies}:candidate;
  const findings=validateExtraction(validationInput);return{...input,validationInput,validationFindings:findings,reviewStatus:findings.length?'needs_review':'approved_candidate'};
}
function asStrings(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[]}
function isArtifact(value:unknown):value is Artifact{return typeof value==='object'&&value!==null&&!Array.isArray(value)}
function asRecords(value:unknown){return Array.isArray(value)?value.filter((item):item is Record<string,unknown>=>typeof item==='object'&&item!==null):[]}
function displayRef(value:Record<string,unknown>){const ref=value.displayRef??value.display_ref;return typeof ref==='string'?ref.trim():''}
function stringField(value:Record<string,unknown>,key:string){const field=value[key];return typeof field==='string'?field.trim():''}
function matchKey(value:Record<string,unknown>){return stringField(value,'path')||displayRef(value)}
function normalizeValidationDependencies(value:unknown):NonNullable<ValidationInput['dependencies']>{
  return asRecords(value).flatMap(dependency=>{
    const fromPath=stringField(dependency,'fromPath')||stringField(dependency,'from_path');
    const kind=stringField(dependency,'kind');
    return fromPath&&kind?[{fromPath,kind}]:[];
  });
}
function isValidationInput(value:unknown):value is ValidationInput{return typeof value==='object'&&value!==null&&typeof(value as any).componentTotal==='number'&&Array.isArray((value as any).questions)&&Array.isArray((value as any).schemes)&&Array.isArray((value as any).assets)}
function pageNumber(name:string){return Number(name.match(/(\d+)/)?.[1]??0)}