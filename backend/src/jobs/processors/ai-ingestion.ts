import type{Pool}from'pg';
import{imageBlock,loadPrompt,recordAiCall,recordAiFailure,type AiUsage,type ClaudeUserBlock}from'../../lib/ai/claude.js';
import type{IngestionStageHandler}from'./ingestion.js';
import{mergeQuestions,mergeSchemes,normalizeMs,normalizeQp,type ExtractedQuestion,type ExtractedScheme}from'./ingestion-contract.js';

type Artifact=Record<string,unknown>;
type Batch={pageNumbers:number[];images:string[];text:string};
type Prepared={paperId:string;batches:Batch[];[key:string]:unknown};
type AiClient={model:string;complete<T>(input:{purpose:string;prompt:{version:string;body:string};content:ClaudeUserBlock[];maxTokens?:number}):Promise<{data:T;usage:AiUsage;raw:unknown}>};
type ImageLoader=(path:string)=>Promise<ClaudeUserBlock>;

export function createAiExtractionHandlers(pool:Pool,client:AiClient,imageLoader:ImageLoader=imageBlock):Partial<Record<'extract-qp'|'extract-ms',IngestionStageHandler>>{
 return{
  'extract-qp':(_refId,input)=>extractQuestionsStage(pool,client,input,imageLoader),
  'extract-ms':(_refId,input)=>extractMarkSchemesStage(pool,client,input,imageLoader),
 };
}

export async function extractQuestionsStage(pool:Pool,client:AiClient,input:Artifact,imageLoader:ImageLoader=imageBlock):Promise<Artifact>{
 const prepared=pickPrepared(input,'qp');if(!prepared)return input;
 const metadata=await paperMetadata(pool,prepared.paperId);
 if(metadata.kind!=='QP')return input;
 const prompt=await loadPrompt('extract-question',1);let questions:ExtractedQuestion[]=[];const conflicts:string[]=[];const batchTotals:number[]=[];
 for(const batch of prepared.batches){
  const content=await extractionContent(batch,{metadata,prior_refs:questions.map(question=>question.path)},imageLoader);
  const response=await callAndRecord(pool,client,{purpose:'extract_qp',prompt,content,maxTokens:8192,ref:{table:'source_papers',id:prepared.paperId}});
  const normalized=normalizeQp(response.data),merged=mergeQuestions(questions,normalized.questions);questions=merged.questions;conflicts.push(...merged.conflicts);batchTotals.push(normalized.pageTotalMarks);
 }
 return{...input,questions,qp:{...prepared,extraction:{questionCount:questions.length,batchTotals,overlapConflicts:[...new Set(conflicts)]}}};
}

export async function extractMarkSchemesStage(pool:Pool,client:AiClient,input:Artifact,imageLoader:ImageLoader=imageBlock):Promise<Artifact>{
 const prepared=pickPrepared(input,'ms');if(!prepared)return input;
 const metadata=await paperMetadata(pool,prepared.paperId);
 if(metadata.kind!=='MS')return input;
 const prompt=await loadPrompt('extract-markscheme',1);let schemes:ExtractedScheme[]=[];const conflicts:string[]=[];
 for(const batch of prepared.batches){
  const content=await extractionContent(batch,{metadata},imageLoader);
  const response=await callAndRecord(pool,client,{purpose:'extract_ms',prompt,content,maxTokens:8192,ref:{table:'source_papers',id:prepared.paperId}});
  const merged=mergeSchemes(schemes,normalizeMs(response.data));schemes=merged.schemes;conflicts.push(...merged.conflicts);
 }
 return{...input,markSchemes:schemes,ms:{...prepared,extraction:{schemeCount:schemes.length,overlapConflicts:[...new Set(conflicts)]}}};
}

async function callAndRecord(pool:Pool,client:AiClient,input:{purpose:string;prompt:{version:string;body:string};content:ClaudeUserBlock[];maxTokens:number;ref:{table:string;id:string}}){
 const started=Date.now();
 try{const response=await client.complete<unknown>(input);await recordAiCall(pool,response.usage,input.ref);return response}
 catch(error){await recordAiFailure(pool,{purpose:input.purpose,model:client.model,promptVersion:input.prompt.version,ref:input.ref,error,latencyMs:Date.now()-started});throw error}
}

function pickPrepared(input:Artifact,side:'qp'|'ms'):Prepared|null{
 const nested=input[side];if(isPrepared(nested))return nested;
 if(isPrepared(input))return input;
 return null;
}
function isPrepared(value:unknown):value is Prepared{return Boolean(value&&typeof value==='object'&&typeof(value as Prepared).paperId==='string'&&Array.isArray((value as Prepared).batches))}

async function paperMetadata(pool:Pool,paperId:string){
 const result=await pool.query(`select sp.id,sp.kind::text kind,sp.year,sp.series::text series,sp.variant,s.code syllabus,c.number component,c.name component_name,c.level::text level,c.total_marks
  from source_papers sp join syllabi s on s.id=sp.syllabus_id join components c on c.id=sp.component_id where sp.id=$1`,[paperId]);
 if(!result.rowCount)throw new Error('ingestion_paper_not_found');return result.rows[0]as{kind:string;year:number;series:string;variant:number;syllabus:string;component:number;component_name:string;level:string;total_marks:number};
}

async function extractionContent(batch:Batch,header:Record<string,unknown>,imageLoader:ImageLoader):Promise<ClaudeUserBlock[]>{
 const textPages=batch.text.split('\n\f\n');const content:ClaudeUserBlock[]=[{type:'text',text:`Input metadata:\n${JSON.stringify(header)}`}];
 for(let index=0;index<batch.images.length;index++){
  content.push(await imageLoader(batch.images[index]!));
  content.push({type:'text',text:`## Text layer, page ${batch.pageNumbers[index]??index+1}\n\n${textPages[index]??''}`});
 }
 return content;
}
