import { createHash, randomInt } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import type { PortableQuestion } from './selection-review.js';
import { DomainError } from './assignments-service.js';
import { LiveExamBuilderService } from './live-exam-builder-service.js';

export interface LiveExamDraftSettings {
  questionOrder: 'fixed' | 'shuffled';
  timingMode: 'teacher' | 'per_question';
  allowLateJoin: boolean;
  autoCloseWhenAllSubmitted: boolean;
  teacherOverrideEnabled: boolean;
  displayNameMode: 'first_name' | 'full_name' | 'anonymous';
}

export const DEFAULT_LIVE_EXAM_DRAFT_SETTINGS: LiveExamDraftSettings = {
  questionOrder: 'fixed',
  timingMode: 'teacher',
  allowLateJoin: false,
  autoCloseWhenAllSubmitted: true,
  teacherOverrideEnabled: true,
  displayNameMode: 'first_name',
};

type MarkSchemeSnapshot = {
  id: string;
  schemeType: string;
  maxMarks: number;
  guidanceMd: string | null;
  points: Array<{
    id:string; code:string; text:string; marks:number; accept:unknown; reject:unknown;
    requires:unknown; isBod:boolean; groupId:string|null;
  }>;
  groups: Array<{
    id:string; label:string|null; nRequired:number; marksPerPoint:number;
    maxMarks:number; awardMode:'fixed'|'point_marks';
  }>;
};

type StoredQuestionSnapshot = PortableQuestion;

type DraftScope = {
  id:string;
  classId:string;
  syllabusId:string;
  topicId:string|null;
  subtopicId:string|null;
  status:string;
};

function storedPortable(portable: PortableQuestion): StoredQuestionSnapshot {
  return {
    ...portable,
    contextBlocks: portable.contextBlocks.map((block) => ({
      ...block,
      assets: block.assets.map((asset) => ({ ...asset, url: null })),
    })),
  };
}

function normalizeSettings(
  patch: Partial<LiveExamDraftSettings> | undefined,
  current: LiveExamDraftSettings = DEFAULT_LIVE_EXAM_DRAFT_SETTINGS,
): LiveExamDraftSettings {
  return { ...current, ...(patch ?? {}) };
}

function settingsFromJson(value: unknown): LiveExamDraftSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_LIVE_EXAM_DRAFT_SETTINGS;
  const raw=value as Record<string,unknown>;
  return normalizeSettings({
    questionOrder: raw.questionOrder === 'shuffled' ? 'shuffled' : 'fixed',
    timingMode: raw.timingMode === 'per_question' ? 'per_question' : 'teacher',
    allowLateJoin: raw.allowLateJoin === true,
    autoCloseWhenAllSubmitted: raw.autoCloseWhenAllSubmitted !== false,
    teacherOverrideEnabled: raw.teacherOverrideEnabled !== false,
    displayNameMode: raw.displayNameMode === 'full_name'
      ? 'full_name'
      : raw.displayNameMode === 'anonymous' ? 'anonymous' : 'first_name',
  });
}

export class LiveExamBuilderCommandService {
  private readonly readModel: LiveExamBuilderService;

  constructor(
    private readonly pool: Pool,
    private readonly questions: PgQuestionsRepository,
  ) {
    this.readModel = new LiveExamBuilderService(pool);
  }

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  private async requireClassControl(executor: Pick<Pool,'query'>|PoolClient, actor: Actor, classId: string) {
    this.assertStaff(actor);
    const result=await executor.query(
      `select c.id,c.syllabus_id,s.code syllabus_code
       from classes c join syllabi s on s.id=c.syllabus_id
       where c.id=$1 and c.archived_at is null and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (
           c.owner_id=$4 or exists(
             select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
           )
         ))
       )`,
      [classId,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('not_found',404);
    return result.rows[0] as {id:string;syllabus_id:string;syllabus_code:string};
  }

  private async validateTaxonomy(
    executor: Pick<Pool,'query'>|PoolClient,
    syllabusId:string,
    topicId:string|null,
    subtopicId:string|null,
  ) {
    if(!topicId&&subtopicId)throw new DomainError('live_invalid_taxonomy',400);
    const result=await executor.query(
      `select s.id syllabus_id,t.id topic_id,st.id subtopic_id
       from syllabi s
       left join topics t on t.syllabus_id=s.id and ($2::uuid is null or t.id=$2)
       left join subtopics st on st.topic_id=t.id and ($3::uuid is null or st.id=$3)
       where s.id=$1
         and ($2::uuid is null or t.id is not null)
         and ($3::uuid is null or st.id is not null)`,
      [syllabusId,topicId,subtopicId],
    );
    if(!result.rowCount)throw new DomainError('live_invalid_taxonomy',400);
  }

  private async requireDraft(
    executor: Pick<Pool,'query'>|PoolClient,
    actor: Actor,
    sessionId:string,
    lock=false,
  ):Promise<DraftScope> {
    this.assertStaff(actor);
    const result=await executor.query(
      `select les.id,les.class_id,les.syllabus_id,les.topic_id,les.subtopic_id,les.status::text status
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where les.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (
           c.owner_id=$4 or exists(
             select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
           )
         ))
       ) ${lock?'for update of les':''}`,
      [sessionId,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('not_found',404);
    const row=result.rows[0];
    if(row.status!=='draft')throw new DomainError('live_not_draft',409);
    return {
      id:String(row.id),classId:String(row.class_id),syllabusId:String(row.syllabus_id),
      topicId:row.topic_id?String(row.topic_id):null,
      subtopicId:row.subtopic_id?String(row.subtopic_id):null,status:String(row.status),
    };
  }

  private async markScheme(questionId:string):Promise<MarkSchemeSnapshot> {
    const result=await this.pool.query(
      `select jsonb_build_object(
         'id',ms.id,'schemeType',ms.scheme_type,'maxMarks',ms.max_marks,'guidanceMd',ms.guidance_md,
         'points',coalesce((select jsonb_agg(jsonb_build_object(
           'id',msp.id,'code',msp.code,'text',msp.text,'marks',msp.marks,
           'accept',msp.accept,'reject',msp.reject,'requires',msp.requires,'isBod',msp.is_bod,
           'groupId',msp.group_id
         ) order by msp.sort_order,msp.id) from mark_scheme_points msp where msp.mark_scheme_id=ms.id),'[]'::jsonb),
         'groups',coalesce((select jsonb_agg(jsonb_build_object(
           'id',msg.id,'label',msg.label,'nRequired',msg.n_required,
           'marksPerPoint',msg.marks_per_point,'maxMarks',msg.max_marks,'awardMode',msg.award_mode
         ) order by msg.sort_order,msg.id) from mark_scheme_groups msg where msg.mark_scheme_id=ms.id),'[]'::jsonb)
       ) scheme
       from mark_schemes ms
       where ms.question_id=$1 and ms.status='approved'`,
      [questionId],
    );
    if(!result.rows[0]?.scheme)throw new DomainError('live_question_not_ready',409);
    return result.rows[0].scheme as MarkSchemeSnapshot;
  }

  private async snapshots(actor:Actor,questionIds:string[]) {
    return Promise.all(questionIds.map(async(questionId)=>{
      const [portable,markScheme]=await Promise.all([
        this.questions.portable(actor,questionId),
        this.markScheme(questionId),
      ]);
      if(!portable)throw new DomainError('live_question_not_ready',409);
      if(portable.contextBlocks.some((block)=>block.assets.some(
        (asset)=>asset.storagePath&&!asset.contentMd&&!asset.url,
      )))throw new DomainError('live_assets_unavailable',409);
      return {questionId,portable:storedPortable(portable),markScheme};
    }));
  }

  private async ensureEligible(actor:Actor,scope:DraftScope,questionIds:string[]) {
    const unique=[...new Set(questionIds)];
    if(!unique.length)throw new DomainError('live_questions_required',400);
    if(unique.length!==questionIds.length)throw new DomainError('live_duplicate_question',400);
    const eligible=await this.readModel.eligibleQuestions(actor,{
      syllabusId:scope.syllabusId,
      topicId:scope.topicId??undefined,
      subtopicId:scope.subtopicId??undefined,
      limit:500,
    });
    const allowed=new Set(eligible.map((item)=>item.id));
    if(unique.some((id)=>!allowed.has(id)))throw new DomainError('live_questions_ineligible',409);
    return unique;
  }

  private async bump(
    client:PoolClient,
    sessionId:string,
    actorId:string,
    eventType:string,
    payload:Record<string,unknown>={},
  ) {
    const changed=await client.query(
      `update live_exam_sessions set version=version+1,updated_at=now()
       where id=$1 returning version`,
      [sessionId],
    );
    const version=Number(changed.rows[0].version);
    await client.query(
      `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
       values($1,$2,$3,$4,$5::jsonb)`,
      [sessionId,actorId,eventType,version,JSON.stringify(payload)],
    );
    return version;
  }

  async createDraft(actor:Actor,input:{
    classId:string;
    title:string;
    syllabusId:string;
    topicId?:string|null;
    subtopicId?:string|null;
    markingMode:'teacher'|'peer'|'self';
    questionTimeLimitS?:number|null;
    settings?:Partial<LiveExamDraftSettings>;
  }) {
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      const klass=await this.requireClassControl(client,actor,input.classId);
      if(String(klass.syllabus_id)!==input.syllabusId)throw new DomainError('live_class_syllabus_mismatch',409);
      await this.validateTaxonomy(client,input.syllabusId,input.topicId??null,input.subtopicId??null);
      const settings=normalizeSettings(input.settings);
      const result=await client.query(
        `insert into live_exam_sessions(
           class_id,host_id,title,join_code,status,marking_mode,question_time_limit_s,
           settings,syllabus_id,topic_id,subtopic_id
         ) values($1,$2,$3,null,'draft',$4,$5,$6::jsonb,$7,$8,$9)
         returning id,class_id,title,status::text,marking_mode::text,question_time_limit_s,
           syllabus_id,topic_id,subtopic_id,settings,version,created_at`,
        [input.classId,actor.id,input.title,input.markingMode,input.questionTimeLimitS??null,
          JSON.stringify(settings),input.syllabusId,input.topicId??null,input.subtopicId??null],
      );
      const row=result.rows[0];
      await client.query(
        `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
         values($1,$2,'session.draft_created',1,$3::jsonb)`,
        [row.id,actor.id,JSON.stringify({syllabusId:input.syllabusId,topicId:input.topicId??null,subtopicId:input.subtopicId??null})],
      );
      await client.query('commit');
      return {
        id:String(row.id),classId:String(row.class_id),title:String(row.title),status:String(row.status),
        markingMode:String(row.marking_mode),questionTimeLimitS:row.question_time_limit_s===null?null:Number(row.question_time_limit_s),
        syllabusId:String(row.syllabus_id),topicId:row.topic_id?String(row.topic_id):null,
        subtopicId:row.subtopic_id?String(row.subtopic_id):null,settings:settingsFromJson(row.settings),
        version:Number(row.version),createdAt:row.created_at,
      };
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async builderState(actor:Actor,sessionId:string) {
    this.assertStaff(actor);
    const session=await this.pool.query(
      `select les.id,les.class_id,les.title,les.status::text,les.marking_mode::text,
         les.question_time_limit_s,les.syllabus_id,les.topic_id,les.subtopic_id,les.settings,
         les.join_code,les.version,les.created_at,les.updated_at,les.published_at
       from live_exam_sessions les join classes c on c.id=les.class_id
       where les.id=$1 and les.status in('draft','published') and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (
           c.owner_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4)
         ))
       )`,
      [sessionId,actor.role,actor.schoolId,actor.id],
    );
    if(!session.rowCount)throw new DomainError('not_found',404);
    const questions=await this.pool.query(
      `select id,question_id,position,marks,
         coalesce(question_snapshot->>'sourceRef',question_snapshot->'leaf'->>'displayRef','') display_ref
       from live_exam_questions where session_id=$1 order by position`,
      [sessionId],
    );
    const row=session.rows[0];
    return {
      id:String(row.id),classId:String(row.class_id),title:String(row.title),status:String(row.status),
      markingMode:String(row.marking_mode),questionTimeLimitS:row.question_time_limit_s===null?null:Number(row.question_time_limit_s),
      syllabusId:String(row.syllabus_id),topicId:row.topic_id?String(row.topic_id):null,
      subtopicId:row.subtopic_id?String(row.subtopic_id):null,settings:settingsFromJson(row.settings),
      joinCode:row.join_code?String(row.join_code):null,version:Number(row.version),
      createdAt:row.created_at,updatedAt:row.updated_at,publishedAt:row.published_at,
      questions:questions.rows.map((item)=>({
        id:String(item.id),questionId:String(item.question_id),position:Number(item.position),
        marks:Number(item.marks),displayRef:String(item.display_ref),
      })),
    };
  }

  async replaceQuestions(actor:Actor,sessionId:string,questionIds:string[]) {
    const scope=await this.requireDraft(this.pool,actor,sessionId);
    const ids=await this.ensureEligible(actor,scope,questionIds);
    const built=await this.snapshots(actor,ids);
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      await this.requireDraft(client,actor,sessionId,true);
      await client.query('delete from live_exam_questions where session_id=$1',[sessionId]);
      for(const [position,item] of built.entries()){
        await client.query(
          `insert into live_exam_questions(
             session_id,question_id,position,marks,question_snapshot,mark_scheme_snapshot
           ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
          [sessionId,item.questionId,position,item.portable.leaf.marks,
            JSON.stringify(item.portable),JSON.stringify(item.markScheme)],
        );
      }
      const version=await this.bump(client,sessionId,actor.id,'session.questions_replaced',{
        questionCount:ids.length,selectionMode:'manual',
      });
      await client.query('commit');
      return {sessionId,questionIds:ids,questionCount:ids.length,selectionMode:'manual' as const,version};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async autoSelect(actor:Actor,sessionId:string,count:number) {
    const scope=await this.requireDraft(this.pool,actor,sessionId);
    const pool=await this.readModel.eligibleQuestions(actor,{
      syllabusId:scope.syllabusId,topicId:scope.topicId??undefined,
      subtopicId:scope.subtopicId??undefined,limit:500,
    });
    const ordered=[...pool].sort((left,right)=>{
      const a=createHash('sha256').update(`${sessionId}:${left.id}`).digest('hex');
      const b=createHash('sha256').update(`${sessionId}:${right.id}`).digest('hex');
      return a.localeCompare(b);
    });
    if(ordered.length<count)throw new DomainError('live_question_pool_small',409);
    const ids=ordered.slice(0,count).map((item)=>item.id);
    const result=await this.replaceQuestions(actor,sessionId,ids);
    return {...result,selectionMode:'auto' as const};
  }

  async updateDraft(actor:Actor,sessionId:string,input:{
    title?:string;
    markingMode?:'teacher'|'peer'|'self';
    questionTimeLimitS?:number|null;
    settings?:Partial<LiveExamDraftSettings>;
  }) {
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      await this.requireDraft(client,actor,sessionId,true);
      const current=await client.query('select settings from live_exam_sessions where id=$1',[sessionId]);
      const settings=normalizeSettings(input.settings,settingsFromJson(current.rows[0]?.settings));
      const updated=await client.query(
        `update live_exam_sessions set
           title=coalesce($2,title),
           marking_mode=coalesce($3::live_exam_marking_mode,marking_mode),
           question_time_limit_s=case when $4::boolean then $5::int else question_time_limit_s end,
           settings=$6::jsonb,updated_at=now()
         where id=$1
         returning title,marking_mode::text,question_time_limit_s,settings`,
        [sessionId,input.title??null,input.markingMode??null,input.questionTimeLimitS!==undefined,input.questionTimeLimitS??null,JSON.stringify(settings)],
      );
      const version=await this.bump(client,sessionId,actor.id,'session.draft_updated',{
        titleChanged:input.title!==undefined,markingModeChanged:input.markingMode!==undefined,
        timeLimitChanged:input.questionTimeLimitS!==undefined,settingsChanged:input.settings!==undefined,
      });
      await client.query('commit');
      const row=updated.rows[0];
      return {sessionId,title:String(row.title),markingMode:String(row.marking_mode),
        questionTimeLimitS:row.question_time_limit_s===null?null:Number(row.question_time_limit_s),
        settings:settingsFromJson(row.settings),version};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }

  async publish(actor:Actor,sessionId:string) {
    const initial=await this.requireDraft(this.pool,actor,sessionId);
    const selected=await this.pool.query(
      `select question_id from live_exam_questions where session_id=$1 order by position`,[sessionId],
    );
    const ids=selected.rows.map((row)=>String(row.question_id));
    if(!ids.length)throw new DomainError('live_questions_required',409);
    await this.ensureEligible(actor,initial,ids);
    const built=await this.snapshots(actor,ids);

    for(let attempt=0;attempt<8;attempt+=1){
      const client=await this.pool.connect();
      try{
        await client.query('begin');
        await this.requireDraft(client,actor,sessionId,true);
        for(const item of built){
          await client.query(
            `update live_exam_questions set marks=$3,question_snapshot=$4::jsonb,mark_scheme_snapshot=$5::jsonb
             where session_id=$1 and question_id=$2`,
            [sessionId,item.questionId,item.portable.leaf.marks,JSON.stringify(item.portable),JSON.stringify(item.markScheme)],
          );
        }
        const joinCode=String(randomInt(100000,1000000));
        await client.query(
          `update live_exam_sessions set status='published',join_code=$2,published_at=now(),updated_at=now()
           where id=$1`,
          [sessionId,joinCode],
        );
        const version=await this.bump(client,sessionId,actor.id,'session.published',{questionCount:ids.length});
        await client.query('commit');
        return {sessionId,status:'published' as const,joinCode,questionCount:ids.length,version};
      }catch(error){
        await client.query('rollback');
        if(typeof error==='object'&&error&&'code'in error&&error.code==='23505')continue;
        throw error;
      }finally{client.release()}
    }
    throw new DomainError('live_join_code_conflict',409);
  }

  async openLobby(actor:Actor,sessionId:string) {
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      this.assertStaff(actor);
      const result=await client.query(
        `select les.id,les.status::text,les.join_code
         from live_exam_sessions les join classes c on c.id=les.class_id
         where les.id=$1 and (
           ($2='owner' and c.school_id=$3)
           or ($2='teacher' and (
             c.owner_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4)
           ))
         ) for update of les`,
        [sessionId,actor.role,actor.schoolId,actor.id],
      );
      if(!result.rowCount)throw new DomainError('not_found',404);
      if(result.rows[0].status!=='published'||!result.rows[0].join_code)throw new DomainError('live_invalid_state',409);
      await client.query(`update live_exam_sessions set status='lobby',updated_at=now() where id=$1`,[sessionId]);
      const version=await this.bump(client,sessionId,actor.id,'session.lobby_opened');
      await client.query('commit');
      return {sessionId,status:'lobby' as const,joinCode:String(result.rows[0].join_code),version};
    }catch(error){await client.query('rollback');throw error}finally{client.release()}
  }
}
