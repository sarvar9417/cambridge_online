import type{Pool}from'pg';import type{Actor}from'../lib/actor.js';import{DomainError}from'./assignments-service.js';import{JobQueue}from'../jobs/job-queue.js';
export class IngestionService{constructor(private pool:Pool){}private owner(a:Actor){if(a.role!=='owner')throw new DomainError('owner_only',403)}
async register(a:Actor,input:{syllabusId:string;componentId:string;year:number;series:'MJ'|'ON'|'FM';variant:number;kind:'QP'|'MS'|'IN'|'ER'|'GT';storagePath:string;sha256:string}){this.owner(a);const c=await this.pool.connect();let run:any=null,committed=false;try{await c.query('begin');const paper=await c.query(`insert into source_papers(syllabus_id,component_id,year,series,variant,kind,storage_path,sha256,uploaded_by)values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(sha256)do update set storage_path=excluded.storage_path returning id,sha256`,[input.syllabusId,input.componentId,input.year,input.series,input.variant,input.kind,input.storagePath,input.sha256,a.id]);if(input.kind==='QP'||input.kind==='MS'){run=(await c.query(`insert into ingestion_runs(syllabus_id,component_id,year,series,variant,qp_paper_id,ms_paper_id)
values($1,$2,$3,$4,$5,case when $6='QP' then $7::uuid end,case when $6='MS' then $7::uuid end)
on conflict(component_id,year,series,variant)do update set qp_paper_id=coalesce(excluded.qp_paper_id,ingestion_runs.qp_paper_id),ms_paper_id=coalesce(excluded.ms_paper_id,ingestion_runs.ms_paper_id),updated_at=now()
returning id,qp_paper_id,ms_paper_id`,[input.syllabusId,input.componentId,input.year,input.series,input.variant,input.kind,paper.rows[0].id])).rows[0]}await c.query('commit');committed=true;if(run?.qp_paper_id&&run?.ms_paper_id){await new JobQueue(this.pool).enqueue({kind:'ingest-bundle',payload:{runId:run.id,qpPaperId:run.qp_paper_id,msPaperId:run.ms_paper_id},idempotencyKey:`ingest-run:${run.id}`,refTable:'ingestion_runs',refId:run.id});await this.pool.query(`update ingestion_runs set status='queued',updated_at=now() where id=$1 and status='waiting_for_pair'`,[run.id])}else if(!run)await new JobQueue(this.pool).enqueue({kind:'ingest-paper',payload:{paperId:paper.rows[0].id},idempotencyKey:`ingest:${input.sha256}`,refTable:'source_papers',refId:paper.rows[0].id});return{...paper.rows[0],ingestionRunId:run?.id??null,waitingForPair:Boolean(run&&(!run.qp_paper_id||!run.ms_paper_id))}}catch(e){if(!committed)await c.query('rollback');throw e}finally{c.release()}}
async jobs(a:Actor){this.owner(a);const r=await this.pool.query(`select j.id,j.kind,j.status,j.attempts,j.max_attempts,j.error,j.created_at,j.finished_at,sp.storage_path from jobs j left join source_papers sp on sp.id=j.ref_id where j.ref_table='source_papers' order by j.created_at desc limit 100`);return r.rows}
async review(a:Actor,options:{findingCode?:string;limit?:number;offset?:number;syllabusCode?:string}={}){this.owner(a);const r=await this.pool.query(`select q.id,q.display_ref,q.stem_md,q.context_md,q.marks,q.command_word,q.answer_kind,q.answer_lines,q.status,q.extract_confidence,q.notes,q.content_json is not null as structured,sp.storage_path,sp.source_url,sy.code as syllabus_code,coalesce(json_agg(json_build_object('id',vf.id,'code',vf.rule_code,'severity',vf.severity,'message',vf.message))filter(where vf.id is not null),'[]')findings from questions q join source_papers sp on sp.id=q.source_paper_id join syllabi sy on sy.id=sp.syllabus_id left join validation_findings vf on vf.ref_table='questions' and vf.ref_id=q.id and vf.resolved_at is null where q.status='needs_review' and($1::text is null or ($1='__unflagged__' and not exists(select 1 from validation_findings f where f.ref_table='questions' and f.ref_id=q.id and f.resolved_at is null)) or exists(select 1 from validation_findings grouped where grouped.ref_table='questions' and grouped.ref_id=q.id and grouped.resolved_at is null and grouped.rule_code=$1)) and ($4::text is null or sy.code=$4) group by q.id,sp.id,sy.code order by q.created_at,q.id limit $2 offset $3`,[options.findingCode??null,Math.min(options.limit??100,100),options.offset??0,options.syllabusCode??null]);return r.rows}
/** 0478 review: use the exact source paper's syllabus version, never cross-map. */
async taxonomy(a:Actor,id:string){
  this.owner(a);
  const r=await this.pool.query(`select q.id,q.display_ref,p.syllabus_id,
    qs.subtopic_id as current_topic_id,ql.lo_id as current_lo_id,
    st.code as current_topic_code,st.title as current_topic_title,lo.text as current_lo_text,
    m.guidance_md as mark_scheme
    from questions q join source_papers p on p.id=q.source_paper_id
    join syllabi sy on sy.id=p.syllabus_id
    join question_subtopics qs on qs.question_id=q.id and qs.is_primary
    join subtopics st on st.id=qs.subtopic_id
    join question_learning_objectives ql on ql.question_id=q.id
    join learning_objectives lo on lo.id=ql.lo_id
    join mark_schemes m on m.question_id=q.id and m.status='approved' and m.max_marks=q.marks
    where q.id=$1 and q.status='needs_review' and sy.code='0478'
      and q.prompt_version='source-backed-0478-oidc-v1'
      and q.content_json->'source'->>'sha256'=p.sha256
      and q.content_json->'source'->>'paperId'=p.id::text
      and not exists(select 1 from validation_findings f where f.ref_table='questions' and f.ref_id=q.id and f.resolved_at is null)`,[id]);
  if(r.rowCount!==1)throw new DomainError('taxonomy_review_unavailable',409);
  const current=r.rows[0];
  const options=await this.pool.query(`select lo.id,lo.code,lo.text,st.code as topic_code,st.title as topic_title
    from learning_objectives lo join subtopics st on st.id=lo.subtopic_id
    join topics t on t.id=st.topic_id where t.syllabus_id=$1 order by t.sort_order,st.sort_order,lo.sort_order,lo.id`,[current.syllabus_id]);
  return{current,options:options.rows};
}
async approveTaxonomy(a:Actor,id:string,input:{loId:string;expectedLoId:string}){
  this.owner(a);
  const c=await this.pool.connect();
  try{
    await c.query('begin');
    const selected=await c.query(`select q.id,q.status,q.reviewed_by,q.reviewed_at,qs.subtopic_id,qs.set_by,
      ql.lo_id,qs.confidence as topic_confidence,ql.confidence as lo_confidence,
      target.id target_lo,target.subtopic_id target_topic
      from questions q join source_papers p on p.id=q.source_paper_id join syllabi sy on sy.id=p.syllabus_id
      join question_subtopics qs on qs.question_id=q.id and qs.is_primary
      join question_learning_objectives ql on ql.question_id=q.id
      join learning_objectives target on target.id=$2
      join subtopics dst on dst.id=target.subtopic_id
      join topics t on t.id=dst.topic_id and t.syllabus_id=p.syllabus_id
      where q.id=$1 and q.status='needs_review' and sy.code='0478'
        and q.prompt_version='source-backed-0478-oidc-v1' and ql.lo_id=$3
        and q.content_json->'source'->>'sha256'=p.sha256
        and q.content_json->'source'->>'paperId'=p.id::text
        and (select count(*) from question_subtopics x where x.question_id=q.id)=1
        and (select count(*) from question_learning_objectives x where x.question_id=q.id)=1
        and exists(select 1 from mark_schemes m where m.question_id=q.id and m.status='approved' and m.max_marks=q.marks)
        and not exists(select 1 from validation_findings f where f.ref_table='questions' and f.ref_id=q.id and f.resolved_at is null)
      for update of q,qs,ql`,[id,input.loId,input.expectedLoId]);
    if(selected.rowCount!==1)throw new DomainError('taxonomy_review_changed_or_invalid',409);
    const before=selected.rows[0];
    await c.query(`update question_subtopics set subtopic_id=$2,set_by='owner-corpus-review' where question_id=$1 and is_primary`,[id,before.target_topic]);
    await c.query(`update question_learning_objectives set lo_id=$2 where question_id=$1`,[id,before.target_lo]);
    const result=await c.query(`update questions set status='approved',reviewed_by=$2,reviewed_at=now(),updated_at=now() where id=$1 returning id,status`,[id,a.id]);
    await c.query(`insert into audit_log(actor_id,action,ref_table,ref_id,before,after) values($1,'ingestion.review_taxonomy','questions',$2,$3,$4)`,[a.id,id,before,{status:'approved',subtopic_id:before.target_topic,lo_id:before.target_lo}]);
    await c.query('commit');
    return result.rows[0];
  }catch(error){await c.query('rollback');throw error}finally{c.release()}
}
async decide(a:Actor,id:string,status:'approved'|'rejected'){this.owner(a);const c=await this.pool.connect();try{await c.query('begin');const before=await c.query(`select q.id,q.status,q.reviewed_by,q.reviewed_at,exists(select 1 from validation_findings f where f.ref_table='questions' and f.ref_id=q.id and f.resolved_at is null and f.severity='error') as blocking_error from questions q where q.id=$1 and q.status='needs_review' for update of q`,[id]);if(!before.rowCount)throw new DomainError('not_found',404);if(status==='approved'&&before.rows[0].blocking_error)throw new DomainError('source_repair_required',409);const result=await c.query(`update questions set status=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now() where id=$1 returning id,status`,[id,status,a.id]);await c.query(`insert into audit_log(actor_id,action,ref_table,ref_id,before,after)values($1,'ingestion.review_decide','questions',$2,$3,$4)`,[a.id,id,before.rows[0],result.rows[0]]);await c.query('commit');return result.rows[0]}catch(error){await c.query('rollback');throw error}finally{c.release()}}
async bulkApprove(a:Actor,findingCode:string){this.owner(a);const c=await this.pool.connect();try{await c.query('begin');const selected=await c.query(`select q.id,q.status,q.reviewed_by,q.reviewed_at from questions q where q.status='needs_review' and exists(select 1 from validation_findings vf where vf.ref_table='questions' and vf.ref_id=q.id and vf.rule_code=$1 and vf.resolved_at is null and vf.severity='warning') and not exists(select 1 from validation_findings other where other.ref_table='questions' and other.ref_id=q.id and other.resolved_at is null and (other.severity='error' or other.rule_code<>$1)) and q.content_json is null order by q.created_at,q.id limit 100 for update of q`,[findingCode]);for(const before of selected.rows){await c.query(`update questions set status='approved',reviewed_by=$2,reviewed_at=now(),updated_at=now() where id=$1`,[before.id,a.id]);await c.query(`update validation_findings set resolved_at=now(),resolved_by=$2,resolution='false_positive' where ref_table='questions' and ref_id=$1 and rule_code=$3 and resolved_at is null`,[before.id,a.id,findingCode]);await c.query(`insert into audit_log(actor_id,action,ref_table,ref_id,before,after)values($1,'ingestion.review_bulk_approve','questions',$2,$3,jsonb_build_object('status','approved','findingCode',$4))`,[a.id,before.id,before,findingCode])}await c.query('commit');return{updated:selected.rowCount??0}}catch(error){await c.query('rollback');throw error}finally{c.release()}}
async edit(a:Actor,id:string,input:{stemMd:string;marks:number|null;commandWord:string|null}){this.owner(a);const c=await this.pool.connect();try{await c.query('begin');const before=await c.query(`select id,stem_md,marks,command_word,status,content_json is not null as structured from questions where id=$1 and status='needs_review' for update`,[id]);if(!before.rowCount)throw new DomainError('not_found',404);if(before.rows[0].structured)throw new DomainError('canonical_source_repair_required',409);const result=await c.query(`update questions set stem_md=$2,marks=$3,command_word=$4::command_word,updated_at=now() where id=$1 returning id,stem_md,marks,command_word,status`,[id,input.stemMd,input.marks,input.commandWord]);await c.query(`insert into audit_log(actor_id,action,ref_table,ref_id,before,after)values($1,'ingestion.review_edit','questions',$2,$3,$4)`,[a.id,id,before.rows[0],result.rows[0]]);await c.query('commit');return result.rows[0]}catch(error){await c.query('rollback');throw error}finally{c.release()}}
async undo(a:Actor){this.owner(a);const c=await this.pool.connect();try{await c.query('begin');const audit=await c.query(`select al.id,al.action,al.ref_id,al.before from audit_log al where al.actor_id=$1 and al.action in('ingestion.review_decide','ingestion.review_bulk_approve','ingestion.review_edit','ingestion.review_taxonomy') and not exists(select 1 from audit_log undo where undo.action='ingestion.review_undo' and undo.after->>'undoneAuditId'=al.id::text) order by al.created_at desc for update limit 1`,[a.id]);if(!audit.rowCount)throw new DomainError('not_found',404);const entry=audit.rows[0];let result;if(entry.action==='ingestion.review_edit')result=await c.query(`update questions set stem_md=$2,marks=$3,command_word=$4::command_word,updated_at=now() where id=$1 returning id,status`,[entry.ref_id,entry.before.stem_md,entry.before.marks,entry.before.command_word]);else {
if(entry.action==='ingestion.review_taxonomy'){
  const locked=await c.query(`select id from questions where id=$1 and status='approved' for update`,[entry.ref_id]);
  if(!locked.rowCount)throw new DomainError('taxonomy_review_changed_or_invalid',409);
  const tags=await c.query(`update question_subtopics set subtopic_id=$2,set_by=$3 where question_id=$1 and is_primary and subtopic_id=$4 returning question_id`,[entry.ref_id,entry.before.subtopic_id,entry.before.set_by,entry.before.target_topic]);
  const objectives=await c.query(`update question_learning_objectives set lo_id=$2 where question_id=$1 and lo_id=$3 returning question_id`,[entry.ref_id,entry.before.lo_id,entry.before.target_lo]);
  if(tags.rowCount!==1||objectives.rowCount!==1)throw new DomainError('taxonomy_review_changed_or_invalid',409);
}
result=await c.query(`update questions set status=$2::review_status,reviewed_by=$3::uuid,reviewed_at=$4::timestamptz,updated_at=now() where id=$1 returning id,status`,[entry.ref_id,String(entry.before.status),entry.before.reviewed_by??null,entry.before.reviewed_at??null]);}await c.query(`insert into audit_log(actor_id,action,ref_table,ref_id,before,after)values($1,'ingestion.review_undo','questions',$2,$3,jsonb_build_object('undoneAuditId',$4::text))`,[a.id,entry.ref_id,result.rows[0],entry.id]);await c.query('commit');return result.rows[0]}catch(error){await c.query('rollback');throw error}finally{c.release()}}}
