import type{Pool}from'pg';
import{imageBlock,loadPrompt,recordAiCall,recordAiFailure,type AiUsage,type ClaudeUserBlock,type PromptFile}from'../../lib/ai/claude.js';
import{findDependencyMentions}from'../../lib/validation/dependencies.js';
import type{IngestionStageHandler}from'./ingestion.js';
import{classificationSchema,dependencyOutputSchema,mergeQuestions,mergeSchemes,normalizeMs,normalizeQp,type Classification,type DetectedDependency,type ExtractedQuestion,type ExtractedScheme}from'./ingestion-contract.js';

type Artifact=Record<string,unknown>;
type Batch={pageNumbers:number[];images:string[];text:string};
type Prepared={paperId:string;batches:Batch[];[key:string]:unknown};
type AiClient={model:string;complete<T>(input:{purpose:string;prompt:{version:string;body:string};content:ClaudeUserBlock[];maxTokens?:number}):Promise<{data:T;usage:AiUsage;raw:unknown}>};
type ImageLoader=(path:string)=>Promise<ClaudeUserBlock>;
type CatalogRow={subtopic_id:string;subtopic_code:string;subtopic_title:string;topic_number:number;topic_title:string;lo_id:string|null;lo_code:string|null;lo_text:string|null};

export function createAiIngestionHandlers(pool:Pool,client:AiClient,imageLoader:ImageLoader=imageBlock):Partial<Record<'extract-qp'|'extract-ms'|'classify'|'depends',IngestionStageHandler>>{
 return{
  'extract-qp':(_refId,input)=>extractQuestionsStage(pool,client,input,imageLoader),
  'extract-ms':(_refId,input)=>extractMarkSchemesStage(pool,client,input,imageLoader),
  classify:(_refId,input)=>classifyQuestionsStage(pool,client,input),
  depends:(_refId,input)=>detectDependenciesStage(pool,client,input),
 };
}
export const createAiExtractionHandlers=createAiIngestionHandlers;

export async function extractQuestionsStage(pool:Pool,client:AiClient,input:Artifact,imageLoader:ImageLoader=imageBlock):Promise<Artifact>{
 const prepared=pickPrepared(input,'qp');if(!prepared)return input;
 const metadata=await paperMetadata(pool,prepared.paperId);
 if(metadata.kind!=='QP')return input;
 const prompt=await loadPrompt('extract-question',1);let questions:ExtractedQuestion[]=[];let carryoverPaths=new Set<string>();const conflicts:string[]=[];const batchTotals:number[]=[];
 for(const batch of prepared.batches){
  const priorRefs=questions.filter(question=>!carryoverPaths.has(question.path)).map(question=>question.path);
  const content=await extractionContent(batch,{metadata,prior_refs:priorRefs,carryover_refs:[...carryoverPaths]},imageLoader);
  const response=await callAndRecord(pool,client,{purpose:'extract_qp',prompt,content,maxTokens:8192,ref:{table:'source_papers',id:prepared.paperId}});
  const normalized=normalizeQp(response.data),incomingPaths=new Set(normalized.questions.map(question=>question.path));
  // A truncated path is intentionally allowed to be re-emitted by the overlap
  // batch. Replace the partial copy without treating normal completion as an
  // overlap conflict. If the model fails to re-emit it, keep it unresolved so
  // final validation can block automatic approval.
  const mergeBase=questions.filter(question=>!(carryoverPaths.has(question.path)&&incomingPaths.has(question.path)));
  const merged=mergeQuestions(mergeBase,normalized.questions);questions=merged.questions;conflicts.push(...merged.conflicts);batchTotals.push(normalized.pageTotalMarks);
  const nextCarryover=new Set<string>();for(const path of carryoverPaths)if(!incomingPaths.has(path))nextCarryover.add(path);
  if(normalized.truncated){const boundaryPage=Math.max(...batch.pageNumbers);for(const question of normalized.questions)if(question.sourcePages.includes(boundaryPage))nextCarryover.add(question.path)}
  carryoverPaths=nextCarryover;
 }
 return{...input,questions,qp:{...prepared,extraction:{questionCount:questions.length,batchTotals,overlapConflicts:[...new Set(conflicts)],unresolvedCarryoverPaths:[...carryoverPaths]}}};
}

export async function extractMarkSchemesStage(pool:Pool,client:AiClient,input:Artifact,imageLoader:ImageLoader=imageBlock):Promise<Artifact>{
 const prepared=pickPrepared(input,'ms');if(!prepared)return input;
 const metadata=await paperMetadata(pool,prepared.paperId);
 if(metadata.kind!=='MS')return input;
 const prompt=await loadPrompt('extract-markscheme',2);let schemes:ExtractedScheme[]=[];const conflicts:string[]=[];
 for(const batch of prepared.batches){
  const content=await extractionContent(batch,{metadata},imageLoader);
  const response=await callAndRecord(pool,client,{purpose:'extract_ms',prompt,content,maxTokens:8192,ref:{table:'source_papers',id:prepared.paperId}});
  const merged=mergeSchemes(schemes,normalizeMs(response.data));schemes=merged.schemes;conflicts.push(...merged.conflicts);
 }
 return{...input,markSchemes:schemes,ms:{...prepared,extraction:{schemeCount:schemes.length,overlapConflicts:[...new Set(conflicts)]}}};
}

export async function classifyQuestionsStage(pool:Pool,client:AiClient,input:Artifact):Promise<Artifact>{
 const questions=asQuestions(input.questions),schemes=asSchemes(input.markSchemes),prepared=pickPrepared(input,'qp');if(!prepared||!questions.length)return input;
 const [catalog,metadata]=await Promise.all([syllabusCatalog(pool,prepared.paperId),paperMetadata(pool,prepared.paperId)]),subtopics=new Map<string,CatalogRow>(),los=new Map<string,{id:string;code:string}>();
 for(const row of catalog){if(!subtopics.has(row.subtopic_code))subtopics.set(row.subtopic_code,row);if(row.lo_id&&row.lo_code)los.set(row.lo_code,{id:row.lo_id,code:row.lo_code})}
 const catalogText=JSON.stringify(groupCatalog(catalog));const template=await loadPrompt('classify-question',1),classifications:Classification[]=[];
 for(const question of questions.filter(question=>question.marks!==null)){
  const scheme=schemes.find(item=>item.path===question.path),questionContext=JSON.stringify({path:question.path,context_md:contextFor(questions,question),stem_md:question.stemMd,marks:question.marks,command_word:question.commandWord});
  const markScheme=JSON.stringify(scheme??null),msPointsText=scheme?.points.map(point=>`${point.code}: ${point.text}`).join('\n')??'';
  const prompt:PromptFile={version:template.version,body:renderTemplate(template.body,{
    question_stem_and_context:questionContext,mark_scheme:markScheme,subtopic_list_with_learning_objectives:catalogText,
    stem_latex:question.stemMd??'',command_word:question.commandWord??'',marks:String(question.marks??''),component_name:metadata.component_name,level:metadata.level,ms_points_text:msPointsText,
  })};
  const response=await callAndRecord(pool,client,{purpose:'classify',prompt,content:[{type:'text',text:'Return the classification JSON only.'}],maxTokens:2048,ref:{table:'source_papers',id:prepared.paperId}});
  const parsed=classificationSchema.parse(response.data),issues:string[]=[];
  const mappedSubtopics=parsed.subtopics.flatMap(item=>{const found=subtopics.get(item.code);if(!found){issues.push(`unknown_subtopic:${item.code}`);return[]}return[{id:found.subtopic_id,code:item.code,isPrimary:item.is_primary,confidence:item.confidence,reason:item.reason}]});
  const mappedLos=parsed.learning_objectives.flatMap(item=>{const found=los.get(item.code);if(!found){issues.push(`unknown_learning_objective:${item.code}`);return[]}return[{id:found.id,code:item.code,confidence:item.confidence}]});
  if(!mappedSubtopics.length)issues.push('classification_has_no_valid_subtopic');
  classifications.push({path:question.path,subtopics:mappedSubtopics,learningObjectives:mappedLos,ao:parsed.ao,aoConfidence:parsed.ao_confidence,issues});
 }
 return{...input,classifications};
}

export async function detectDependenciesStage(pool:Pool,client:AiClient,input:Artifact):Promise<Artifact>{
 const questions=asQuestions(input.questions),prepared=pickPrepared(input,'qp');if(!prepared||!questions.length)return input;
 const prompt=await loadPrompt('detect-dependencies',1),dependencies:DetectedDependency[]=[],dependencyCandidates:Array<{rootPath:string;candidates:unknown[]}>=[],dependencyIssues:string[]=[];
 const roots=[...new Set(questions.map(question=>question.path.split('.')[0]!))];
 for(const rootPath of roots){
  const tree=questions.filter(question=>question.path===rootPath||question.path.startsWith(`${rootPath}.`));const candidates=tree.flatMap(question=>{
    if(question.marks===null||!question.stemMd)return[];const mentions=findDependencyMentions(question.stemMd);return mentions.length?[{from_path:question.path,stem_md:question.stemMd,mentions}]:[];
  });
  if(!candidates.length)continue;dependencyCandidates.push({rootPath,candidates});
  const response=await callAndRecord(pool,client,{purpose:'depends',prompt,content:[{type:'text',text:JSON.stringify({tree:tree.map(question=>({path:question.path,stem_md:question.stemMd,context_md:question.contextMd,assets:question.assets.map(asset=>({kind:asset.kind,content_md:asset.contentMd,alt_text:asset.altText}))})),candidates})}],maxTokens:3072,ref:{table:'source_papers',id:prepared.paperId}});
  const parsed=dependencyOutputSchema.parse(response.data),paths=new Set(tree.map(question=>question.path));
  for(const item of parsed.dependencies){
    if(item.kind==='none')continue;
    if(!paths.has(item.from_path)||!paths.has(item.to_path)||item.from_path.split('.')[0]!==rootPath||item.to_path.split('.')[0]!==rootPath){dependencyIssues.push(`invalid_dependency_path:${item.from_path}->${item.to_path}`);continue}
    const issues:string[]=[];let strength=item.strength;if(item.kind==='answer_ref'&&strength!=='required'){strength='required';issues.push('answer_ref_strength_normalized_to_required')}
    dependencies.push({fromPath:item.from_path,toPath:item.to_path,kind:item.kind,strength,evidence:item.evidence,confidence:item.confidence,note:item.note,issues});
  }
 }
 return{...input,dependencyCandidates,dependencies,dependencyIssues};
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
function asQuestions(value:unknown){return Array.isArray(value)?value as ExtractedQuestion[]:[]}
function asSchemes(value:unknown){return Array.isArray(value)?value as ExtractedScheme[]:[]}

async function paperMetadata(pool:Pool,paperId:string){
 const result=await pool.query(`select sp.id,sp.kind::text kind,sp.year,sp.series::text series,sp.variant,s.code syllabus,c.number component,c.name component_name,c.level::text level,c.total_marks
  from source_papers sp join syllabi s on s.id=sp.syllabus_id join components c on c.id=sp.component_id where sp.id=$1`,[paperId]);
 if(!result.rowCount)throw new Error('ingestion_paper_not_found');return result.rows[0]as{kind:string;year:number;series:string;variant:number;syllabus:string;component:number;component_name:string;level:string;total_marks:number};
}
async function syllabusCatalog(pool:Pool,paperId:string):Promise<CatalogRow[]>{
 const result=await pool.query(`select st.id subtopic_id,st.code subtopic_code,st.title subtopic_title,t.number topic_number,t.title topic_title,
   lo.id lo_id,lo.code lo_code,lo.text lo_text
  from source_papers sp join topics t on t.syllabus_id=sp.syllabus_id join subtopics st on st.topic_id=t.id
  left join learning_objectives lo on lo.subtopic_id=st.id
  where sp.id=$1 and (t.component_id=sp.component_id or t.component_id is null)
  order by t.sort_order,st.sort_order,lo.sort_order`,[paperId]);return result.rows as CatalogRow[];
}
function groupCatalog(rows:CatalogRow[]){
 const topics=new Map<number,{number:number;title:string;subtopics:Map<string,{code:string;title:string;learning_objectives:Array<{code:string;text:string}>}>}>();
 for(const row of rows){let topic=topics.get(row.topic_number);if(!topic){topic={number:row.topic_number,title:row.topic_title,subtopics:new Map()};topics.set(row.topic_number,topic)}let subtopic=topic.subtopics.get(row.subtopic_code);if(!subtopic){subtopic={code:row.subtopic_code,title:row.subtopic_title,learning_objectives:[]};topic.subtopics.set(row.subtopic_code,subtopic)}if(row.lo_code&&row.lo_text)subtopic.learning_objectives.push({code:row.lo_code,text:row.lo_text})}
 return[...topics.values()].map(topic=>({...topic,subtopics:[...topic.subtopics.values()]}));
}
function contextFor(questions:ExtractedQuestion[],leaf:ExtractedQuestion){const blocks:string[]=[];let parent=leaf.parentPath;while(parent){const found=questions.find(question=>question.path===parent);if(!found)break;if(found.contextMd)blocks.unshift(found.contextMd);parent=found.parentPath}if(leaf.contextMd)blocks.push(leaf.contextMd);return blocks.join('\n\n')||null}
function renderTemplate(template:string,values:Record<string,string>){return template.replace(/\{\{([a-z0-9_]+)\}\}|\{([a-z0-9_]+)\}/gi,(match:string,doubleKey:string|undefined,singleKey:string|undefined)=>values[doubleKey??singleKey??'']??match)}

async function extractionContent(batch:Batch,header:Record<string,unknown>,imageLoader:ImageLoader):Promise<ClaudeUserBlock[]>{
 const textPages=batch.text.split('\n\f\n');const content:ClaudeUserBlock[]=[{type:'text',text:`Input metadata:\n${JSON.stringify(header)}`}];
 for(let index=0;index<batch.images.length;index++){
  content.push(await imageLoader(batch.images[index]!));
  content.push({type:'text',text:`## Text layer, page ${batch.pageNumbers[index]??index+1}\n\n${textPages[index]??''}`});
 }
 return content;
}
