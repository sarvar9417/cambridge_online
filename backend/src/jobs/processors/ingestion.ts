import{execFile}from'node:child_process';
import{mkdir,readFile,readdir,stat}from'node:fs/promises';
import{join,resolve}from'node:path';
import{promisify}from'node:util';
import type{Pool}from'pg';
import{config}from'../../config.js';
import{findDependencyMentions}from'../../lib/validation/dependencies.js';
import{validateExtraction,type Finding,type ValidationInput}from'../../lib/validation/rules.js';
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
    assets:unavailable('assets'),classify:unavailable('classify'),depends:(_paperId,input)=>detectDependencyCandidates(input),validate:(_paperId,input)=>validateIngestionArtifact(input,pool),
    crosscheck:unavailable('crosscheck'),persist:unavailable('persist'),...overrides,
  };
  const processors:Record<string,JobProcessor>={
    'ingest-paper':async(job)=>{const paperId=String((job.payload as any).paperId);return chain(job,paperId,'source_papers',{paperId},'prepare')},
    'ingest-bundle':async(job)=>{const payload=job.payload as{runId:string;qpPaperId:string;msPaperId:string;runKey?:string};return chain(job,payload.runId,'ingestion_runs',payload,'prepare',payload.runKey)},
  };
  for(const [index,stage]of INGESTION_STAGES.entries())processors[`ingest-${stage}`]=async(job)=>{
    const payload=job.payload as{refId?:string;refTable?:'source_papers'|'ingestion_runs';paperId?:string;previousJobId:string;runKey?:string};
    const input=await previousArtifact(pool,payload.previousJobId);
    const refId=payload.refId??String(payload.paperId),refTable=payload.refTable??'source_papers';
    const result=await handlers[stage](refId,input);
    const next=INGESTION_STAGES[index+1];
    return next?chain(job,refId,refTable,result,next,payload.runKey):result;
  };
  return processors;
}

function chain(job:Job,refId:string,refTable:'source_papers'|'ingestion_runs',result:Artifact,next:IngestionStage,runKey?:string):ChainedJobResult{
  const prefix=refTable==='ingestion_runs'?`ingest-run:${refId}${runKey?`:${runKey}`:''}`:`ingest:${refId}`;
  return{result,next:{kind:`ingest-${next}`,payload:{refId,refTable,previousJobId:job.id,...(runKey?{runKey}:{})},idempotencyKey:`${prefix}:${next}`,refTable,refId}}
}
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

/** Build the deterministic validator input directly from normalized real-paper artifacts. */
export async function buildValidationInput(pool:Pool,input:Artifact):Promise<ValidationInput>{
  const qp=isArtifact(input.qp)?input.qp:null;
  const paperId=qp&&typeof qp.paperId==='string'?qp.paperId:typeof input.paperId==='string'?input.paperId:null;
  if(!paperId)throw new Error('ingestion_validation_paper_missing');
  const totalResult=await pool.query(`select c.total_marks from source_papers sp join components c on c.id=sp.component_id where sp.id=$1`,[paperId]);
  if(!totalResult.rowCount)throw new Error('ingestion_validation_component_missing');
  const componentTotal=Number(totalResult.rows[0].total_marks);
  if(!Number.isFinite(componentTotal))throw new Error('ingestion_validation_component_total_invalid');

  const questions=asRecords(input.questions);
  const classifications=new Map<string,Record<string,unknown>>();
  for(const item of asRecords(input.classifications)){const path=stringField(item,'path');if(path)classifications.set(path,item)}
  const validationQuestions:ValidationInput['questions']=questions.map(question=>{
    const path=stringField(question,'path');
    const parentId=nullableString(question.parentPath??question.parent_path);
    const marks=nullableNumber(question.marks);
    const stem=firstText(question,['stemMd','stem_md','stem','stemLatex','stem_latex'])||firstText(question,['contextMd','context_md','context','contextLatex','context_latex'])||'';
    const classification=classifications.get(path),subtopics=classification?asRecords(classification.subtopics):[];
    const assets=Array.isArray(question.assets)?question.assets:[];
    return{id:path,path,parentId,marks,stem,commandWord:nullableString(question.commandWord??question.command_word),answerKind:firstText(question,['answerKind','answer_kind'])||'text',answerLines:nullableNumber(question.answerLines??question.answer_lines),assetCount:assets.length,subtopicConfidences:subtopics.map(item=>Number(item.confidence)).filter(Number.isFinite),extractConfidence:numberOr(question.confidence??question.extractConfidence??question.extract_confidence,0)};
  });

  const validationSchemes:ValidationInput['schemes']=asRecords(input.markSchemes).flatMap(scheme=>{
    const questionId=stringField(scheme,'questionPath')||stringField(scheme,'question_path')||stringField(scheme,'path');if(!questionId)return[];
    const groups=asRecords(scheme.groups),points=asRecords(scheme.points),levels=asRecords(scheme.levels);
    const nRequired=groups.length?Math.max(...groups.map(group=>numberOr(group.nRequired??group.n_required,0))):undefined;
    const groupMaxMarks=groups.length?Math.max(...groups.map(group=>numberOr(group.maxMarks??group.max_marks,0))):undefined;
    return[{questionId,type:firstText(scheme,['schemeType','scheme_type','type'])||'all_required',maxMarks:numberOr(scheme.maxMarks??scheme.max_marks,0),points:points.map(point=>numberOr(point.marks,0)),...(nRequired!==undefined?{nRequired}:{}),...(groupMaxMarks!==undefined?{groupMaxMarks}:{}),...(levels.length?{levels:levels.length}:{})}];
  });
  const dependencies=normalizeValidationDependencies(input.dependencies);
  const assetCandidates=asRecords(input.assetCandidates);
  const validationAssets:ValidationInput['assets']=assetCandidates.flatMap(asset=>{
    const storagePath=firstText(asset,['storagePath','storage_path']);const size=numberOr(asset.size??asset.sizeBytes??asset.size_bytes,storagePath?4096:0);
    return storagePath?[{storagePath,size}]:[];
  });
  return{componentTotal,questions:validationQuestions,schemes:validationSchemes,assets:validationAssets,...(dependencies.length?{dependencies}:{})};
}

export async function validateIngestionArtifact(input:Artifact,pool?:Pool):Promise<Artifact>{
  let candidate:ValidationInput;
  if(isValidationInput(input.validationInput))candidate=input.validationInput;
  else{if(!pool)throw new Error('ingestion_validation_artifact_invalid');candidate=await buildValidationInput(pool,input)}
  const dependencies=normalizeValidationDependencies(input.dependencies);
  const validationInput:ValidationInput=dependencies.length?{...candidate,dependencies}:candidate;
  const findings:Finding[]=[...validateExtraction(validationInput),...artifactFindings(input)];
  return{...input,validationInput,validationFindings:findings,reviewStatus:findings.length?'needs_review':'approved_candidate'};
}

function artifactFindings(input:Artifact):Finding[]{
  const findings:Finding[]=[];const add=(code:`V${string}`,severity:'error'|'warning',message:string)=>findings.push({code,severity,message});
  const questionIssues=asRecords(input.questions).flatMap(question=>asStrings(question.issues));
  const schemeIssues=asRecords(input.markSchemes).flatMap(scheme=>asStrings(scheme.issues));
  if([...questionIssues,...schemeIssues].includes('overlap_conflict'))add('V24','error','Overlapping extraction batches disagree.');
  const classificationIssues=asRecords(input.classifications).flatMap(item=>asStrings(item.issues));
  if(classificationIssues.length)add('V25','error',`Classification contains ${classificationIssues.length} unresolved issue(s).`);
  const dependencyIssues=asStrings(input.dependencyIssues);if(dependencyIssues.length)add('V26','warning',`Dependency classification contains ${dependencyIssues.length} unresolved issue(s).`);
  const assetIssues=asRecords(input.assetCandidates).filter(asset=>firstText(asset,['status','cropStatus','crop_status'])==='failed');if(assetIssues.length)add('V27','error',`Asset extraction contains ${assetIssues.length} failed candidate(s).`);
  const report=isArtifact(input.matchReport)?input.matchReport:{};const unmatchedQuestions=asStrings(report.unmatchedQuestions),unmatchedSchemes=asStrings(report.unmatchedSchemes);
  if(unmatchedQuestions.length||unmatchedSchemes.length)add('V28','error',`QP/MS coverage mismatch (${unmatchedQuestions.length} question(s), ${unmatchedSchemes.length} scheme(s)).`);
  const duplicates=asStrings(report.duplicateQuestionRefs);if(duplicates.length)add('V29','error',`Duplicate extracted question reference(s): ${duplicates.join(', ')}.`);
  return findings;
}
function asStrings(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[]}
function isArtifact(value:unknown):value is Artifact{return typeof value==='object'&&value!==null&&!Array.isArray(value)}
function asRecords(value:unknown){return Array.isArray(value)?value.filter((item):item is Record<string,unknown>=>typeof item==='object'&&item!==null&&!Array.isArray(item)):[]}
function displayRef(value:Record<string,unknown>){const ref=value.displayRef??value.display_ref;return typeof ref==='string'?ref.trim():''}
function stringField(value:Record<string,unknown>,key:string){const field=value[key];return typeof field==='string'?field.trim():''}
function matchKey(value:Record<string,unknown>){return stringField(value,'path')||displayRef(value)}
function nullableString(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null}
function nullableNumber(value:unknown){return typeof value==='number'&&Number.isFinite(value)?value:null}
function numberOr(value:unknown,fallback:number){const number=typeof value==='number'?value:Number(value);return Number.isFinite(number)?number:fallback}
function firstText(value:Record<string,unknown>,keys:string[]){for(const key of keys){const text=stringField(value,key);if(text)return text}return''}
function normalizeValidationDependencies(value:unknown):NonNullable<ValidationInput['dependencies']>{
  return asRecords(value).flatMap(dependency=>{
    const fromPath=stringField(dependency,'fromPath')||stringField(dependency,'from_path');
    const kind=stringField(dependency,'kind');
    return fromPath&&kind?[{fromPath,kind}]:[];
  });
}
function isValidationInput(value:unknown):value is ValidationInput{return typeof value==='object'&&value!==null&&typeof(value as any).componentTotal==='number'&&Array.isArray((value as any).questions)&&Array.isArray((value as any).schemes)&&Array.isArray((value as any).assets)}
function pageNumber(name:string){return Number(name.match(/(\d+)/)?.[1]??0)}