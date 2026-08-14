import type{Pool,PoolClient}from'pg';
import type{IngestionStageHandler}from'./ingestion.js';
import type{Classification,DetectedDependency,ExtractedQuestion,ExtractedScheme}from'./ingestion-contract.js';

type Artifact=Record<string,unknown>;
type Finding={code:string;severity:'error'|'warning';message:string;details?:unknown};
type CrossCheck={path:string;agrees:boolean;disagreements?:unknown;confidence:number;promptVersion?:string};
type SourceMeta={qpPaperId:string;msPaperId:string|null;componentId:string;syllabusCode:string;component:number;variant:number;year:number;series:'FM'|'MJ'|'ON'};

export interface PersistPaperResult{questionCount:number;leafCount:number;approvedCount:number;needsReviewCount:number;findingCount:number;pendingAssetCount:number}

export function createPersistPaperHandler(pool:Pool):IngestionStageHandler{return(_refId,input)=>persistPaperArtifact(pool,input)}

/**
 * Persist one normalized QP/MS bundle atomically.
 *
 * Re-runs deliberately rewrite every derived child row. Keeping a stale old
 * subtopic, mark point, dependency or crop request is more dangerous than doing
 * a little extra work, because the bank would then contain a mixture of two
 * extraction revisions.
 */
export async function persistPaperArtifact(pool:Pool,input:Artifact):Promise<Artifact>{
 const questions=asArray<ExtractedQuestion>(input.questions),schemes=asArray<ExtractedScheme>(input.markSchemes),classifications=asArray<Classification>(input.classifications),dependencies=asArray<DetectedDependency>(input.dependencies),findings=asFindings(input.validationFindings),crossChecks=asArray<CrossCheck>(input.crossChecks);
 if(!questions.length)throw new Error('ingestion_persist_no_questions');
 const meta=await sourceMeta(pool,input),classificationByPath=new Map(classifications.map(item=>[item.path,item])),schemeByPath=new Map(schemes.map(item=>[item.path,item]));
 const globalError=findings.some(item=>item.severity==='error');
 const crossCheckReady=crossChecks.length>0&&crossChecks.every(item=>item.agrees&&item.confidence>=.8);
 const paperCanAutoApprove=input.reviewStatus==='approved_candidate'&&!globalError&&crossCheckReady;
 const client=await pool.connect();
 try{
  await client.query('begin');
  const idByPath=new Map<string,string>();
  const ordered=[...questions].sort((a,b)=>depth(a.path)-depth(b.path)||pathOrder(a.path,b.path));
  for(const[index,question]of ordered.entries()){
   const parentId=question.parentPath?idByPath.get(question.parentPath)??null:null;
   if(question.parentPath&&!parentId)throw new Error(`ingestion_persist_missing_parent:${question.path}->${question.parentPath}`);
   const classification=classificationByPath.get(question.path),assetNeedsReview=question.assets.some(asset=>!asset.contentMd),localIssues=[...question.issues,...(classification?.issues??[])];
   const status=paperCanAutoApprove&&!localIssues.length&&!assetNeedsReview?'approved':'needs_review';
   const displayRef=fullDisplayRef(meta,question.path);
   const row=await client.query(`insert into questions(source_paper_id,component_id,parent_id,label,path,display_ref,depth,sort_order,stem_md,context_md,command_word,marks,ao,answer_kind,answer_lines,status,extract_confidence,prompt_version,notes)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    on conflict(source_paper_id,path) do update set parent_id=excluded.parent_id,label=excluded.label,display_ref=excluded.display_ref,depth=excluded.depth,sort_order=excluded.sort_order,stem_md=excluded.stem_md,context_md=excluded.context_md,command_word=excluded.command_word,marks=excluded.marks,ao=excluded.ao,answer_kind=excluded.answer_kind,answer_lines=excluded.answer_lines,status=excluded.status,extract_confidence=excluded.extract_confidence,prompt_version=excluded.prompt_version,notes=excluded.notes,updated_at=now()
    returning id`,[meta.qpPaperId,meta.componentId,parentId,question.label,question.path,displayRef,depth(question.path),index,question.stemMd,question.contextMd,question.commandWord,question.marks,classification?.ao??null,question.answerKind,question.answerLines,status,question.confidence,'extract-question.v1',localIssues.length?localIssues.join('; '):null]);
   idByPath.set(question.path,String(row.rows[0].id));
  }

  const questionIds=[...idByPath.values()];
  if(questionIds.length){
   await client.query(`delete from validation_findings where (ref_table='questions' and ref_id=any($1::uuid[])) or (ref_table='source_papers' and ref_id=$2)`,[questionIds,meta.qpPaperId]);
   await client.query(`delete from cross_checks where ref_table='questions' and ref_id=any($1::uuid[])`,[questionIds]);
   await client.query(`delete from question_assets where question_id=any($1::uuid[])`,[questionIds]);
   await client.query(`delete from question_subtopics where question_id=any($1::uuid[])`,[questionIds]);
   await client.query(`delete from question_learning_objectives where question_id=any($1::uuid[])`,[questionIds]);
   await client.query(`delete from question_dependencies where question_id=any($1::uuid[])`,[questionIds]);
   await client.query(`delete from mark_schemes where question_id=any($1::uuid[])`,[questionIds]);
  }

  let pendingAssetCount=0;
  for(const question of questions){
   const questionId=idByPath.get(question.path)!;
   for(const[sortOrder,asset]of question.assets.entries()){
    const cropStatus=asset.contentMd?'not_needed':asset.bbox&&asset.page?'pending':'failed';if(cropStatus==='pending')pendingAssetCount++;
    await client.query(`insert into question_assets(question_id,kind,storage_path,content_md,alt_text,sort_order,source_page,source_bbox,crop_status,crop_error)
     values($1,$2,null,$3,$4,$5,$6,$7::jsonb,$8,$9)`,[questionId,asset.kind,asset.contentMd,asset.altText,sortOrder,asset.page,asset.bbox?JSON.stringify(asset.bbox):null,cropStatus,cropStatus==='failed'?'missing_source_bbox_or_content':null]);
   }
   const classification=classificationByPath.get(question.path);
   if(classification){
    const weight=classification.subtopics.length?1/classification.subtopics.length:1;
    for(const subtopic of classification.subtopics)await client.query(`insert into question_subtopics(question_id,subtopic_id,is_primary,weight,confidence,set_by) values($1,$2,$3,$4,$5,'ai')`,[questionId,subtopic.id,subtopic.isPrimary,weight,subtopic.confidence]);
    for(const objective of classification.learningObjectives)await client.query(`insert into question_learning_objectives(question_id,lo_id,confidence) values($1,$2,$3)`,[questionId,objective.id,objective.confidence]);
   }
  }

  for(const dependency of dependencies){
   const fromId=idByPath.get(dependency.fromPath),toId=idByPath.get(dependency.toPath);if(!fromId||!toId)continue;
   await client.query(`insert into question_dependencies(question_id,depends_on_id,kind,strength,evidence,detected_by,confidence) values($1,$2,$3,$4,$5,'ai',$6)`,[fromId,toId,dependency.kind,dependency.strength,dependency.evidence,dependency.confidence]);
  }

  for(const scheme of schemes){
   const questionId=idByPath.get(scheme.path);if(!questionId)continue;const question=questions.find(item=>item.path===scheme.path),classification=classificationByPath.get(scheme.path),assetNeedsReview=Boolean(question?.assets.some(asset=>!asset.contentMd));const localIssues=[...(scheme.issues??[]),...(question?.issues??[]),...(classification?.issues??[])];const status=paperCanAutoApprove&&!localIssues.length&&!assetNeedsReview?'approved':'needs_review';
   const inserted=await client.query(`insert into mark_schemes(question_id,source_paper_id,scheme_type,max_marks,guidance_md,status,extract_confidence,prompt_version) values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,[questionId,meta.msPaperId,scheme.schemeType,scheme.maxMarks,scheme.guidanceMd,status,scheme.confidence,'extract-markscheme.v1']);
   const markSchemeId=String(inserted.rows[0].id),groupIds=new Map<string,string>();
   for(const[sortOrder,group]of scheme.groups.entries()){const insertedGroup=await client.query(`insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order) values($1,$2,$3,$4,$5,$6) returning id`,[markSchemeId,group.label,group.nRequired,group.marksPerPoint,group.maxMarks,sortOrder]);groupIds.set(group.label,String(insertedGroup.rows[0].id))}
   for(const[sortOrder,point]of scheme.points.entries())await client.query(`insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order) values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10)`,[markSchemeId,point.groupLabel?groupIds.get(point.groupLabel)??null:null,point.code,point.text,point.marks,JSON.stringify(point.accept),JSON.stringify(point.reject),JSON.stringify(point.requires),point.isBod,sortOrder]);
   for(const level of scheme.levels)await client.query(`insert into mark_scheme_levels(mark_scheme_id,level_number,min_marks,max_marks,descriptor_md,indicative_content_md) values($1,$2,$3,$4,$5,null)`,[markSchemeId,level.levelNumber,level.minMarks,level.maxMarks,level.descriptorMd]);
  }

  for(const finding of findings)await client.query(`insert into validation_findings(rule_code,severity,ref_table,ref_id,message,details) values($1,$2,'source_papers',$3,$4,$5::jsonb)`,[finding.code,finding.severity,meta.qpPaperId,finding.message,finding.details===undefined?null:JSON.stringify(finding.details)]);
  for(const check of crossChecks){const questionId=idByPath.get(check.path);if(!questionId)continue;await client.query(`insert into cross_checks(ref_table,ref_id,checker_prompt_version,agrees,disagreement,confidence) values('questions',$1,$2,$3,$4::jsonb,$5)`,[questionId,check.promptVersion??'cross-check.v1',check.agrees,check.disagreements===undefined?null:JSON.stringify(check.disagreements),check.confidence])}

  await client.query('commit');
  const leaves=questions.filter(question=>question.marks!==null),approvedCount=paperCanAutoApprove?leaves.filter(question=>!question.issues.length&&!classificationByPath.get(question.path)?.issues.length&&!question.assets.some(asset=>!asset.contentMd)).length:0;
  const result:PersistPaperResult={questionCount:questions.length,leafCount:leaves.length,approvedCount,needsReviewCount:leaves.length-approvedCount,findingCount:findings.length,pendingAssetCount};
  const finalReviewStatus=result.needsReviewCount===0&&result.pendingAssetCount===0&&paperCanAutoApprove?'approved_candidate':'needs_review';
  return{...input,reviewStatus:finalReviewStatus,persistResult:result};
 }catch(error){await client.query('rollback');throw error}finally{client.release()}
}

async function sourceMeta(pool:Pool,input:Artifact):Promise<SourceMeta>{
 const qpPaperId=paperId(input,'qp');if(!qpPaperId)throw new Error('ingestion_persist_missing_qp');const msPaperId=paperId(input,'ms');
 const result=await pool.query(`select sp.id qp_paper_id,sp.component_id,sp.year,sp.series::text series,sp.variant,s.code syllabus_code,c.number component from source_papers sp join syllabi s on s.id=sp.syllabus_id join components c on c.id=sp.component_id where sp.id=$1`,[qpPaperId]);if(!result.rowCount)throw new Error('ingestion_paper_not_found');const row=result.rows[0];return{qpPaperId,msPaperId,componentId:String(row.component_id),syllabusCode:String(row.syllabus_code),component:Number(row.component),variant:Number(row.variant),year:Number(row.year),series:row.series};
}
function fullDisplayRef(meta:SourceMeta,path:string){const paper=meta.variant>=10?meta.variant:meta.component*10+meta.variant,series=meta.series==='MJ'?'M/J':meta.series==='ON'?'O/N':'F/M',year=String(meta.year).slice(-2);return`${meta.syllabusCode}/${paper}/${series}/${year} Q${refFromPath(path)}`}
function refFromPath(path:string){const[root,...rest]=path.split('.');return`${root}${rest.map(part=>`(${part})`).join('')}`}
function depth(path:string){return path.split('.').length-1}
function pathOrder(left:string,right:string){return left.localeCompare(right,undefined,{numeric:true,sensitivity:'base'})}
function paperId(input:Artifact,side:'qp'|'ms'){const value=input[side];return value&&typeof value==='object'&&typeof(value as Record<string,unknown>).paperId==='string'?String((value as Record<string,unknown>).paperId):null}
function asArray<T>(value:unknown){return Array.isArray(value)?value as T[]:[]}
function asFindings(value:unknown):Finding[]{return Array.isArray(value)?value.filter((item):item is Finding=>Boolean(item)&&typeof item==='object'&&typeof(item as Finding).code==='string'&&((item as Finding).severity==='error'||(item as Finding).severity==='warning')):[]}
