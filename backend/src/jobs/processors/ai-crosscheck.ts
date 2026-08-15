import{z}from'zod';import type{Pool}from'pg';import{loadPrompt,recordAiCall,recordAiFailure,type AiUsage,type ClaudeUserBlock}from'../../lib/ai/claude.js';import type{IngestionStageHandler}from'./ingestion.js';import type{Classification,DetectedDependency,ExtractedQuestion,ExtractedScheme}from'./ingestion-contract.js';

type Artifact=Record<string,unknown>;type AiClient={model:string;complete<T>(input:{purpose:string;prompt:{version:string;body:string};content:ClaudeUserBlock[];maxTokens?:number}):Promise<{data:T;usage:AiUsage;raw:unknown}>};
export const crossCheckSchema=z.object({agrees:z.boolean(),confidence:z.number().min(0).max(1),disagreements:z.array(z.object({field:z.string(),severity:z.enum(['error','warning']),message:z.string()}).strict())}).strict();
export type CrossCheckVerdict={path:string;agrees:boolean;confidence:number;disagreements:Array<{field:string;severity:'error'|'warning';message:string}>;promptVersion:string};

export function createAiCrossCheckHandler(pool:Pool,client:AiClient):IngestionStageHandler{return(_refId,input)=>crossCheckStage(pool,client,input)}

export async function crossCheckStage(pool:Pool,client:AiClient,input:Artifact):Promise<Artifact>{
 const questions=asArray<ExtractedQuestion>(input.questions),schemes=asArray<ExtractedScheme>(input.markSchemes),classifications=asArray<Classification>(input.classifications),dependencies=asArray<DetectedDependency>(input.dependencies);const prepared=paperId(input,'qp');if(!prepared||!questions.length)return input;
 const prompt=await loadPrompt('cross-check',2),schemeByPath=new Map(schemes.map(item=>[item.path,item])),classificationByPath=new Map(classifications.map(item=>[item.path,item])),crossChecks:CrossCheckVerdict[]=[];
 for(const leaf of questions.filter(question=>question.marks!==null)){
  const scheme=schemeByPath.get(leaf.path),classification=classificationByPath.get(leaf.path),leafDependencies=dependencies.filter(item=>item.fromPath===leaf.path);
  if(!scheme){crossChecks.push({path:leaf.path,agrees:false,confidence:1,disagreements:[{field:'mark_scheme',severity:'error',message:'No matched mark scheme is available for this leaf.'}],promptVersion:prompt.version});continue}
  const payload={question:{...leaf,inheritedContext:inheritedContext(questions,leaf)},mark_scheme:scheme,classification:classification??null,dependencies:leafDependencies};
  const started=Date.now();
  try{const response=await client.complete<unknown>({purpose:'crosscheck',prompt,content:[{type:'text',text:JSON.stringify(payload)}],maxTokens:2048});await recordAiCall(pool,response.usage,{table:'source_papers',id:prepared});const parsed=crossCheckSchema.parse(response.data);crossChecks.push({path:leaf.path,agrees:parsed.agrees,confidence:parsed.confidence,disagreements:parsed.disagreements,promptVersion:prompt.version})}
  catch(error){await recordAiFailure(pool,{purpose:'crosscheck',model:client.model,promptVersion:prompt.version,ref:{table:'source_papers',id:prepared},error,latencyMs:Date.now()-started});throw error}
 }
 const hasBlocking=crossChecks.some(check=>!check.agrees||check.disagreements.some(item=>item.severity==='error')||check.confidence<.8);
 return{...input,crossChecks,reviewStatus:input.reviewStatus==='approved_candidate'&&!hasBlocking?'approved_candidate':'needs_review'};
}
function inheritedContext(questions:ExtractedQuestion[],leaf:ExtractedQuestion){const blocks:string[]=[];let parent=leaf.parentPath;while(parent){const item=questions.find(question=>question.path===parent);if(!item)break;if(item.contextMd)blocks.unshift(item.contextMd);parent=item.parentPath}if(leaf.contextMd)blocks.push(leaf.contextMd);return blocks.join('\n\n')||null}
function paperId(input:Artifact,side:'qp'|'ms'){const value=input[side];return value&&typeof value==='object'&&typeof(value as Record<string,unknown>).paperId==='string'?String((value as Record<string,unknown>).paperId):null}
function asArray<T>(value:unknown){return Array.isArray(value)?value as T[]:[]}
