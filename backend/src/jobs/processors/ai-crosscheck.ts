import{z}from'zod';import type{Pool}from'pg';import{imageBlock,loadPrompt,recordAiCall,recordAiFailure,type AiUsage,type ClaudeUserBlock}from'../../lib/ai/claude.js';import type{IngestionStageHandler}from'./ingestion.js';import type{Classification,DetectedDependency,ExtractedQuestion,ExtractedScheme}from'./ingestion-contract.js';

type Artifact=Record<string,unknown>;type Batch={pageNumbers:number[];images:string[];text:string};type Prepared={paperId:string;batches:Batch[];[key:string]:unknown};type PageEvidence={page:number;image:string;text:string};type ImageLoader=(path:string)=>Promise<ClaudeUserBlock>;type AiClient={model:string;complete<T>(input:{purpose:string;prompt:{version:string;body:string};content:ClaudeUserBlock[];maxTokens?:number}):Promise<{data:T;usage:AiUsage;raw:unknown}>};
export const crossCheckSchema=z.object({agrees:z.boolean(),confidence:z.number().min(0).max(1),disagreements:z.array(z.object({field:z.string(),severity:z.enum(['error','warning']),message:z.string()}).strict())}).strict();
export type CrossCheckEvidence={sourceMode:'page_image+text_layer';qpPaperId:string;msPaperId:string;qpPages:number[];msPages:number[]};
export type CrossCheckVerdict={path:string;agrees:boolean;confidence:number;disagreements:Array<{field:string;severity:'error'|'warning';message:string}>;promptVersion:string;evidence?:CrossCheckEvidence};

export function createAiCrossCheckHandler(pool:Pool,client:AiClient,imageLoader:ImageLoader=imageBlock):IngestionStageHandler{return(_refId,input)=>crossCheckStage(pool,client,input,imageLoader)}

export async function crossCheckStage(pool:Pool,client:AiClient,input:Artifact,imageLoader:ImageLoader=imageBlock):Promise<Artifact>{
 const questions=asArray<ExtractedQuestion>(input.questions),schemes=asArray<ExtractedScheme>(input.markSchemes),classifications=asArray<Classification>(input.classifications),dependencies=asArray<DetectedDependency>(input.dependencies),qp=preparedPaper(input,'qp'),ms=preparedPaper(input,'ms');if(!qp||!questions.length)return input;
 const prompt=await loadPrompt('cross-check',3),schemeByPath=new Map(schemes.map(item=>[item.path,item])),classificationByPath=new Map(classifications.map(item=>[item.path,item])),crossChecks:CrossCheckVerdict[]=[];
 const qpPages=pageMap(qp),msPages=ms?pageMap(ms):new Map<number,PageEvidence>();
 for(const leaf of questions.filter(question=>question.marks!==null)){
  const scheme=schemeByPath.get(leaf.path),classification=classificationByPath.get(leaf.path),leafDependencies=dependencies.filter(item=>item.fromPath===leaf.path);
  if(!scheme){crossChecks.push(disagreement(leaf.path,prompt.version,'mark_scheme','No matched mark scheme is available for this leaf.'));continue}
  if(!ms){crossChecks.push(disagreement(leaf.path,prompt.version,'source.mark_scheme','Prepared original Mark Scheme evidence is unavailable.'));continue}
  const qEvidence=leaf.sourcePages.map(page=>qpPages.get(page)).filter((item):item is PageEvidence=>Boolean(item));
  if(!leaf.sourcePages.length||new Set(qEvidence.map(item=>item.page)).size!==new Set(leaf.sourcePages).size){crossChecks.push(disagreement(leaf.path,prompt.version,'source.question','One or more original Question Paper source pages are unavailable.'));continue}
  const mEvidence=markSchemeEvidence(msPages,leaf.path);
  if(!mEvidence.length){crossChecks.push(disagreement(leaf.path,prompt.version,'source.mark_scheme','The question reference was not found in the prepared original Mark Scheme text layer.'));continue}
  const evidence:CrossCheckEvidence={sourceMode:'page_image+text_layer',qpPaperId:qp.paperId,msPaperId:ms.paperId,qpPages:qEvidence.map(item=>item.page),msPages:mEvidence.map(item=>item.page)};
  const payload={question:{...leaf,inheritedContext:inheritedContext(questions,leaf)},mark_scheme:scheme,classification:classification??null,dependencies:leafDependencies,source_evidence:evidence};
  const content:ClaudeUserBlock[]=[{type:'text',text:`## Candidate extraction\n${JSON.stringify(payload)}`}];
  await appendEvidence(content,'ORIGINAL QUESTION PAPER',qEvidence,imageLoader);
  await appendEvidence(content,'ORIGINAL MARK SCHEME',mEvidence,imageLoader);
  const started=Date.now();
  try{const response=await client.complete<unknown>({purpose:'crosscheck',prompt,content,maxTokens:2048});await recordAiCall(pool,response.usage,{table:'source_papers',id:qp.paperId});const parsed=crossCheckSchema.parse(response.data);crossChecks.push({path:leaf.path,agrees:parsed.agrees,confidence:parsed.confidence,disagreements:parsed.disagreements,promptVersion:prompt.version,evidence})}
  catch(error){await recordAiFailure(pool,{purpose:'crosscheck',model:client.model,promptVersion:prompt.version,ref:{table:'source_papers',id:qp.paperId},error,latencyMs:Date.now()-started});throw error}
 }
 const hasBlocking=crossChecks.some(check=>!check.agrees||check.disagreements.some(item=>item.severity==='error')||check.confidence<.8);
 return{...input,crossChecks,reviewStatus:input.reviewStatus==='approved_candidate'&&!hasBlocking?'approved_candidate':'needs_review'};
}

function disagreement(path:string,promptVersion:string,field:string,message:string):CrossCheckVerdict{return{path,agrees:false,confidence:1,disagreements:[{field,severity:'error',message}],promptVersion}}
function preparedPaper(input:Artifact,side:'qp'|'ms'):Prepared|null{const value=input[side];return value&&typeof value==='object'&&typeof(value as Prepared).paperId==='string'&&Array.isArray((value as Prepared).batches)?value as Prepared:null}
function pageMap(prepared:Prepared){const map=new Map<number,PageEvidence>();for(const batch of prepared.batches){const texts=batch.text.split(/\n?\f\n?/);for(const[index,page]of batch.pageNumbers.entries()){if(map.has(page))continue;const image=batch.images[index];if(!image)continue;map.set(page,{page,image,text:texts[index]??''})}}return map}
function markSchemeEvidence(pages:Map<number,PageEvidence>,path:string){const refs=[...pages.values()].sort((a,b)=>a.page-b.page),pattern=questionRefPattern(path),start=refs.filter(item=>pattern.test(item.text)).map(item=>item.page);const wanted=new Set<number>();for(const page of start){wanted.add(page);if(pages.has(page+1))wanted.add(page+1)}return[...wanted].sort((a,b)=>a-b).map(page=>pages.get(page)!).filter(Boolean)}
function questionRefPattern(path:string){const[root,...parts]=path.split('.');const nested=parts.map(part=>`\\s*\\(\\s*${escapeRegExp(part)}\\s*\\)`).join('');return new RegExp(`(?:^|\\n)\\s*${escapeRegExp(root)}${nested}(?=\\s|$)`,'im')}
function escapeRegExp(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
async function appendEvidence(content:ClaudeUserBlock[],label:string,evidence:PageEvidence[],imageLoader:ImageLoader){for(const item of evidence){content.push({type:'text',text:`## ${label} — page ${item.page}`});content.push(await imageLoader(item.image));content.push({type:'text',text:`### Text layer — page ${item.page}\n${item.text}`})}}
function inheritedContext(questions:ExtractedQuestion[],leaf:ExtractedQuestion){const blocks:string[]=[];let parent=leaf.parentPath;while(parent){const item=questions.find(question=>question.path===parent);if(!item)break;if(item.contextMd)blocks.unshift(item.contextMd);parent=item.parentPath}if(leaf.contextMd)blocks.push(leaf.contextMd);return blocks.join('\n\n')||null}
function asArray<T>(value:unknown){return Array.isArray(value)?value as T[]:[]}
