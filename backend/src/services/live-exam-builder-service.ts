import { randomInt } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import type { PortableQuestion } from './selection-review.js';
import { DomainError } from './assignments-service.js';
import { assertExpectedLiveExamVersion } from './live-exam-transition-guard.js';

export type LiveExamBuilderMarkingMode = 'teacher' | 'peer' | 'self';

export interface LiveExamBuilderSettings {
  questionOrder: 'fixed' | 'shuffled';
  timingMode: 'teacher' | 'per_question';
  defaultTimeLimitSeconds: number | null;
  allowLateJoin: boolean;
  autoCloseWhenAllSubmitted: boolean;
  peerMarkingEnabled: boolean;
  teacherOverrideEnabled: boolean;
  displayNameMode: 'first_name' | 'full_name' | 'anonymous';
}

export const DEFAULT_LIVE_EXAM_BUILDER_SETTINGS: LiveExamBuilderSettings = {
  questionOrder: 'fixed',
  timingMode: 'teacher',
  defaultTimeLimitSeconds: null,
  allowLateJoin: false,
  autoCloseWhenAllSubmitted: true,
  peerMarkingEnabled: true,
  teacherOverrideEnabled: true,
  displayNameMode: 'first_name',
};

type Queryable = Pick<Pool, 'query'> | PoolClient;
type StoredQuestionSnapshot = PortableQuestion;

type MarkSchemePointSnapshot = {
  id: string;
  code: string;
  text: string;
  marks: number;
  accept: unknown;
  reject: unknown;
  requires: unknown;
  isBod: boolean;
  groupId: string | null;
};

type MarkSchemeSnapshot = {
  id: string;
  schemeType: string;
  maxMarks: number;
  guidanceMd: string | null;
  points: MarkSchemePointSnapshot[];
  groups: Array<{
    id: string;
    label: string | null;
    nRequired: number;
    marksPerPoint: number;
    maxMarks: number;
    awardMode: 'fixed' | 'point_marks';
  }>;
};

type DraftScope = {
  id: string;
  classId: string;
  syllabusId: string;
  syllabusCode: string;
  topicId: string;
  subtopicId: string | null;
  version: number;
  settings: Record<string, unknown>;
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
  patch: Partial<LiveExamBuilderSettings> | undefined,
  current: LiveExamBuilderSettings = DEFAULT_LIVE_EXAM_BUILDER_SETTINGS,
): LiveExamBuilderSettings {
  const merged = { ...current, ...(patch ?? {}) };
  if (
    merged.defaultTimeLimitSeconds !== null
    && (!Number.isInteger(merged.defaultTimeLimitSeconds)
      || merged.defaultTimeLimitSeconds < 30
      || merged.defaultTimeLimitSeconds > 7200)
  ) {
    throw new DomainError('live_builder_invalid_time_limit', 400);
  }
  return merged;
}

function firstString(value: unknown) {
  if (!Array.isArray(value)) return null;
  const first = value[0];
  return typeof first === 'string' ? first : null;
}

export class LiveExamBuilderService {
  constructor(
    private readonly pool: Pool,
    private readonly questions: PgQuestionsRepository,
  ) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  private async controlledClasses(actor: Actor) {
    this.assertStaff(actor);
    return this.pool.query(
      `select c.id,c.name,c.grade,c.level::text level,c.academic_year,c.syllabus_id,
         s.code syllabus_code,s.subject
       from classes c
       join syllabi s on s.id=c.syllabus_id
       where c.archived_at is null and (
         ($1='owner' and c.school_id=$2)
         or ($1='teacher' and (c.owner_id=$3 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3
         )))
       )
       order by c.academic_year desc,c.name`,
      [actor.role,actor.schoolId,actor.id],
    );
  }

  private async requireClassControl(executor: Queryable, actor: Actor, classId: string) {
    this.assertStaff(actor);
    const result = await executor.query(
      `select c.id,c.syllabus_id,s.code syllabus_code
       from classes c
       join syllabi s on s.id=c.syllabus_id
       where c.id=$1 and c.archived_at is null and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (c.owner_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
         )))
       )`,
      [classId,actor.role,actor.schoolId,actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return {
      id:String(result.rows[0].id),
      syllabusId:String(result.rows[0].syllabus_id),
      syllabusCode:String(result.rows[0].syllabus_code),
    };
  }

  private async validateTaxonomy(
    executor: Queryable,
    syllabusId: string,
    topicId: string,
    subtopicId: string | null,
  ) {
    const result = await executor.query(
      `select s.id syllabus_id,s.code syllabus_code,t.id topic_id,t.number topic_number,
         st.id subtopic_id,st.code subtopic_code
       from syllabi s
       join topics t on t.syllabus_id=s.id and t.id=$2
       left join subtopics st on st.topic_id=t.id and ($3::uuid is null or st.id=$3)
       where s.id=$1 and ($3::uuid is null or st.id is not null)`,
      [syllabusId,topicId,subtopicId],
    );
    if (!result.rowCount) throw new DomainError('live_builder_invalid_taxonomy', 400);
    return result.rows[0] as {
      syllabus_id:string;
      syllabus_code:string;
      topic_id:string;
      topic_number:number;
      subtopic_id:string|null;
      subtopic_code:string|null;
    };
  }

  private async lockDraft(client: PoolClient, actor: Actor, sessionId: string): Promise<DraftScope> {
    this.assertStaff(actor);
    const result = await client.query(
      `select les.id,les.class_id,les.status::text,les.version,les.settings,
         c.syllabus_id,s.code syllabus_code
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       join syllabi s on s.id=c.syllabus_id
       where les.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (c.owner_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
         )))
       )
       for update of les`,
      [sessionId,actor.role,actor.schoolId,actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    const row = result.rows[0];
    if (row.status !== 'draft') throw new DomainError('live_invalid_state', 409);
    const settings = row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
      ? row.settings as Record<string,unknown>
      : {};
    const topicId = firstString(settings.topicIds);
    const subtopicId = firstString(settings.subtopicIds);
    if (!topicId) throw new DomainError('live_builder_invalid_taxonomy', 409);
    return {
      id:String(row.id),
      classId:String(row.class_id),
      syllabusId:String(row.syllabus_id),
      syllabusCode:String(row.syllabus_code),
      topicId,
      subtopicId,
      version:Number(row.version),
      settings,
    };
  }

  private async bump(
    client: PoolClient,
    sessionId: string,
    actorId: string,
    eventType: string,
    payload: Record<string,unknown> = {},
  ) {
    const changed = await client.query(
      `update live_exam_sessions set version=version+1,updated_at=now()
       where id=$1 returning version`,
      [sessionId],
    );
    const version = Number(changed.rows[0].version);
    await client.query(
      `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
       values($1,$2,$3,$4,$5::jsonb)`,
      [sessionId,actorId,eventType,version,JSON.stringify(payload)],
    );
    return version;
  }

  private async markScheme(executor: Queryable, questionId: string): Promise<MarkSchemeSnapshot> {
    const result = await executor.query(
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
    if (!result.rows[0]?.scheme) throw new DomainError('live_question_not_ready', 409);
    return result.rows[0].scheme as MarkSchemeSnapshot;
  }

  private async eligibleRows(
    executor: Queryable,
    input: {
      syllabusId:string;
      topicId:string;
      subtopicId:string|null;
      ids?:string[];
      limit:number;
      seed?:string;
    },
  ) {
    const taxonomy = await this.validateTaxonomy(executor,input.syllabusId,input.topicId,input.subtopicId);
    const values:unknown[] = [taxonomy.syllabus_code,taxonomy.topic_number,taxonomy.subtopic_code,input.syllabusId];
    const conditions = [
      `q.status='approved'`,
      `q.marks>0`,
      `q.parent_id is not null`,
      `ms.status='approved'`,
      `not exists(select 1 from question_dependencies qd where qd.question_id=q.id)`,
      `source_syllabus.code=$1`,
      `exists(
        select 1 from question_subtopics qst
        join subtopics mapped_subtopic on mapped_subtopic.id=qst.subtopic_id
        join topics mapped_topic on mapped_topic.id=mapped_subtopic.topic_id
        join syllabi mapped_syllabus on mapped_syllabus.id=mapped_topic.syllabus_id
        where qst.question_id=q.id
          and mapped_syllabus.code=$1 and mapped_topic.number=$2
          and ($3::text is null or mapped_subtopic.code=$3)
      )`,
      `exists(
        select 1
        from question_learning_objectives qlo
        join learning_objectives source_lo on source_lo.id=qlo.lo_id
        join subtopics source_st on source_st.id=source_lo.subtopic_id
        join topics source_t on source_t.id=source_st.topic_id
        where qlo.question_id=q.id and (
          source_t.syllabus_id=$4::uuid
          or exists(
            select 1
            from learning_objective_compatibility compat
            join learning_objectives target_lo on target_lo.id=compat.target_lo_id
            join subtopics target_st on target_st.id=target_lo.subtopic_id
            join topics target_t on target_t.id=target_st.topic_id
            where compat.source_lo_id=qlo.lo_id
              and compat.relation in('equivalent','subtopic_compatible')
              and target_t.syllabus_id=$4::uuid
          )
        )
      )`,
    ];
    if (input.ids) {
      values.push(input.ids);
      conditions.push(`q.id=any($${values.length}::uuid[])`);
    }
    let order = `sp.year desc,sp.series,c.number,sp.variant,q.display_ref`;
    if (input.seed) {
      values.push(input.seed);
      order = `md5(q.id::text || $${values.length}::text),${order}`;
    }
    values.push(input.limit);
    const result = await executor.query(
      `select distinct q.id,q.display_ref,q.stem_md,q.command_word::text command_word,
         q.marks,q.answer_kind::text answer_kind,q.ao::text ao,
         sp.year,sp.series::text series,sp.variant,c.number component
       from questions q
       join mark_schemes ms on ms.question_id=q.id
       join source_papers sp on sp.id=q.source_paper_id
       join syllabi source_syllabus on source_syllabus.id=sp.syllabus_id
       join components c on c.id=q.component_id
       where ${conditions.join(' and ')}
       order by ${order}
       limit $${values.length}`,
      values,
    );
    return result.rows;
  }

  private async snapshotQuestion(actor: Actor, executor: Queryable, questionId: string) {
    const [portable,scheme] = await Promise.all([
      this.questions.portable(actor,questionId),
      this.markScheme(executor,questionId),
    ]);
    if (!portable) throw new DomainError('live_question_not_ready', 409);
    if (portable.contextBlocks.some(
      (block) => block.assets.some((asset) => asset.storagePath && !asset.contentMd && !asset.url),
    )) throw new DomainError('live_assets_unavailable', 409);
    return { portable:storedPortable(portable), scheme };
  }

  async builderOptions(actor: Actor, syllabusId?: string) {
    const classes = await this.controlledClasses(actor);
    const syllabusIds = [...new Set(classes.rows.map((row) => String(row.syllabus_id)))];
    const selectedSyllabusId = syllabusId ?? syllabusIds[0] ?? null;
    if (syllabusId && !syllabusIds.includes(syllabusId)) throw new DomainError('not_found', 404);

    const taxonomy = selectedSyllabusId ? await this.pool.query(
      `select t.id topic_id,t.number topic_number,t.title topic_title,t.sort_order topic_sort,
         st.id subtopic_id,st.code subtopic_code,st.title subtopic_title,st.sort_order subtopic_sort
       from topics t
       left join subtopics st on st.topic_id=t.id
       where t.syllabus_id=$1
       order by t.sort_order,t.number,st.sort_order,st.code`,
      [selectedSyllabusId],
    ) : { rows: [] as Record<string,unknown>[] };

    const syllabi = [...new Map(classes.rows.map((row) => [String(row.syllabus_id), {
      id: String(row.syllabus_id),
      code: String(row.syllabus_code),
      subject: String(row.subject),
    }])).values()];

    const topicMap = new Map<string,{
      id:string;
      number:number;
      title:string;
      subtopics:Array<{id:string;code:string;title:string}>;
    }>();
    for (const row of taxonomy.rows) {
      const id = String(row.topic_id);
      if (!topicMap.has(id)) topicMap.set(id, {
        id,
        number:Number(row.topic_number),
        title:String(row.topic_title),
        subtopics:[],
      });
      if (row.subtopic_id) topicMap.get(id)!.subtopics.push({
        id:String(row.subtopic_id),
        code:String(row.subtopic_code),
        title:String(row.subtopic_title),
      });
    }

    return {
      syllabi,
      selectedSyllabusId,
      topics:[...topicMap.values()],
      classes:classes.rows.map((row) => ({
        id:String(row.id),
        name:String(row.name),
        grade:row.grade,
        level:row.level,
        academicYear:row.academic_year,
        syllabusId:String(row.syllabus_id),
        syllabusCode:String(row.syllabus_code),
      })),
      defaultSettings:DEFAULT_LIVE_EXAM_BUILDER_SETTINGS,
    };
  }

  async eligibleQuestions(
    actor: Actor,
    input: { syllabusId:string; topicId:string; subtopicId?:string; limit:number },
  ) {
    const classes = await this.controlledClasses(actor);
    if (!classes.rows.some((row) => String(row.syllabus_id) === input.syllabusId)) {
      throw new DomainError('not_found', 404);
    }
    const rows = await this.eligibleRows(this.pool,{
      syllabusId:input.syllabusId,
      topicId:input.topicId,
      subtopicId:input.subtopicId ?? null,
      limit:input.limit,
    });
    return rows.map((row) => ({
      id:String(row.id),
      displayRef:String(row.display_ref),
      stem:row.stem_md,
      commandWord:row.command_word,
      marks:Number(row.marks),
      answerKind:row.answer_kind,
      ao:row.ao,
      year:Number(row.year),
      series:row.series,
      variant:Number(row.variant),
      component:Number(row.component),
    }));
  }

  async createDraft(actor: Actor, input: {
    classId:string;
    title:string;
    topicId:string;
    subtopicId?:string;
    markingMode:LiveExamBuilderMarkingMode;
    settings?:Partial<LiveExamBuilderSettings>;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const controlled = await this.requireClassControl(client,actor,input.classId);
      await this.validateTaxonomy(client,controlled.syllabusId,input.topicId,input.subtopicId ?? null);
      const settings = normalizeSettings(input.settings);
      const storedSettings = {
        topicIds:[input.topicId],
        subtopicIds:input.subtopicId ? [input.subtopicId] : [],
        questionOrder:settings.questionOrder,
        timingMode:settings.timingMode,
        defaultTimeLimitSeconds:settings.defaultTimeLimitSeconds,
        allowLateJoin:settings.allowLateJoin,
        autoCloseWhenAllSubmitted:settings.autoCloseWhenAllSubmitted,
        peerMarkingEnabled:settings.peerMarkingEnabled,
        teacherOverrideEnabled:settings.teacherOverrideEnabled,
        displayNameMode:settings.displayNameMode,
      };
      const created = await client.query(
        `insert into live_exam_sessions(
           class_id,host_id,title,join_code,status,marking_mode,question_time_limit_s,settings
         ) values($1,$2,$3,null,'draft',$4,$5,$6::jsonb)
         returning id,class_id,title,status::text,marking_mode::text,version,created_at`,
        [input.classId,actor.id,input.title,input.markingMode,settings.defaultTimeLimitSeconds,JSON.stringify(storedSettings)],
      );
      const row = created.rows[0];
      await client.query(
        `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
         values($1,$2,'draft.created',1,$3::jsonb)`,
        [row.id,actor.id,JSON.stringify({ topicId:input.topicId,subtopicId:input.subtopicId ?? null })],
      );
      await client.query('commit');
      return {
        id:String(row.id),
        classId:String(row.class_id),
        title:String(row.title),
        status:String(row.status),
        markingMode:String(row.marking_mode),
        version:Number(row.version),
        questionCount:0,
        settings,
        createdAt:row.created_at,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async draft(actor: Actor, sessionId: string) {
    this.assertStaff(actor);
    const result = await this.pool.query(
      `select les.id,les.class_id,les.title,les.status::text,les.marking_mode::text,les.version,les.settings,
         c.name class_name,c.syllabus_id,s.code syllabus_code
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       join syllabi s on s.id=c.syllabus_id
       where les.id=$1 and les.status='draft' and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (c.owner_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
         )))
       )`,
      [sessionId,actor.role,actor.schoolId,actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    const questions = await this.pool.query(
      `select leq.question_id,leq.position,leq.marks,
         coalesce(leq.question_snapshot->>'sourceRef',leq.question_snapshot->'leaf'->>'displayRef','') display_ref
       from live_exam_questions leq where leq.session_id=$1 order by leq.position`,
      [sessionId],
    );
    const row = result.rows[0];
    return {
      id:String(row.id),
      classId:String(row.class_id),
      className:String(row.class_name),
      syllabusId:String(row.syllabus_id),
      syllabusCode:String(row.syllabus_code),
      title:String(row.title),
      status:String(row.status),
      markingMode:String(row.marking_mode),
      version:Number(row.version),
      settings:row.settings,
      questions:questions.rows.map((question) => ({
        id:String(question.question_id),
        position:Number(question.position),
        marks:Number(question.marks),
        displayRef:String(question.display_ref),
      })),
    };
  }

  private async replaceQuestionsLocked(
    client: PoolClient,
    actor: Actor,
    draft: DraftScope,
    questionIds: string[],
  ) {
    const uniqueIds = [...new Set(questionIds)];
    if (uniqueIds.length !== questionIds.length) throw new DomainError('live_builder_duplicate_question', 400);
    if (uniqueIds.length > 20) throw new DomainError('live_builder_question_limit', 400);
    if (!uniqueIds.length) {
      await client.query('delete from live_exam_questions where session_id=$1',[draft.id]);
      return 0;
    }
    const eligible = await this.eligibleRows(client,{
      syllabusId:draft.syllabusId,
      topicId:draft.topicId,
      subtopicId:draft.subtopicId,
      ids:uniqueIds,
      limit:uniqueIds.length,
    });
    const eligibleIds = new Set(eligible.map((row) => String(row.id)));
    if (eligibleIds.size !== uniqueIds.length || uniqueIds.some((id) => !eligibleIds.has(id))) {
      throw new DomainError('live_builder_questions_ineligible', 409);
    }
    const snapshots = await Promise.all(uniqueIds.map(async (questionId) => ({
      questionId,
      ...(await this.snapshotQuestion(actor,client,questionId)),
    })));
    await client.query('delete from live_exam_questions where session_id=$1',[draft.id]);
    for (const [position,snapshot] of snapshots.entries()) {
      await client.query(
        `insert into live_exam_questions(
           session_id,question_id,position,marks,question_snapshot,mark_scheme_snapshot
         ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
        [draft.id,snapshot.questionId,position,snapshot.portable.leaf.marks,
          JSON.stringify(snapshot.portable),JSON.stringify(snapshot.scheme)],
      );
    }
    return snapshots.length;
  }

  async replaceQuestions(actor: Actor, sessionId: string, questionIds: string[], expectedVersion: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const draft = await this.lockDraft(client,actor,sessionId);
      assertExpectedLiveExamVersion(draft,expectedVersion);
      const questionCount = await this.replaceQuestionsLocked(client,actor,draft,questionIds);
      const version = await this.bump(client,sessionId,actor.id,'draft.questions_replaced',{
        questionCount,selectionMode:'manual',
      });
      await client.query('commit');
      return { id:sessionId,status:'draft' as const,questionCount,selectionMode:'manual' as const,version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async autoSelect(actor: Actor, sessionId: string, count: number, expectedVersion: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const draft = await this.lockDraft(client,actor,sessionId);
      assertExpectedLiveExamVersion(draft,expectedVersion);
      const rows = await this.eligibleRows(client,{
        syllabusId:draft.syllabusId,
        topicId:draft.topicId,
        subtopicId:draft.subtopicId,
        limit:count,
        seed:sessionId,
      });
      if (rows.length < count) throw new DomainError('live_question_pool_small', 409);
      const questionIds = rows.map((row) => String(row.id));
      const questionCount = await this.replaceQuestionsLocked(client,actor,draft,questionIds);
      const version = await this.bump(client,sessionId,actor.id,'draft.questions_replaced',{
        questionCount,selectionMode:'auto',
      });
      await client.query('commit');
      return { id:sessionId,status:'draft' as const,questionCount,selectionMode:'auto' as const,questionIds,version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async publish(actor: Actor, sessionId: string, expectedVersion: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const draft = await this.lockDraft(client,actor,sessionId);
      assertExpectedLiveExamVersion(draft,expectedVersion);
      const selected = await client.query(
        `select question_id,position from live_exam_questions where session_id=$1 order by position`,
        [sessionId],
      );
      if (!selected.rowCount) throw new DomainError('live_builder_questions_required', 409);
      const questionIds = selected.rows.map((row) => String(row.question_id));
      const eligible = await this.eligibleRows(client,{
        syllabusId:draft.syllabusId,
        topicId:draft.topicId,
        subtopicId:draft.subtopicId,
        ids:questionIds,
        limit:questionIds.length,
      });
      const eligibleIds = new Set(eligible.map((row) => String(row.id)));
      if (eligibleIds.size !== questionIds.length || questionIds.some((id) => !eligibleIds.has(id))) {
        throw new DomainError('live_builder_questions_ineligible', 409);
      }

      for (const row of selected.rows) {
        const questionId = String(row.question_id);
        const snapshot = await this.snapshotQuestion(actor,client,questionId);
        await client.query(
          `update live_exam_questions
           set marks=$3,question_snapshot=$4::jsonb,mark_scheme_snapshot=$5::jsonb
           where session_id=$1 and question_id=$2`,
          [sessionId,questionId,snapshot.portable.leaf.marks,
            JSON.stringify(snapshot.portable),JSON.stringify(snapshot.scheme)],
        );
      }

      let joinCode:string|null = null;
      for (let attempt=0; attempt<8; attempt+=1) {
        const candidate = String(randomInt(100000,1000000));
        await client.query('savepoint live_publish_code');
        try {
          const updated = await client.query(
            `update live_exam_sessions
             set status='published',join_code=$2,published_at=coalesce(published_at,now()),updated_at=now()
             where id=$1 and status='draft'
             returning join_code`,
            [sessionId,candidate],
          );
          if (!updated.rowCount) throw new DomainError('live_invalid_state', 409);
          joinCode = String(updated.rows[0].join_code);
          await client.query('release savepoint live_publish_code');
          break;
        } catch (error) {
          await client.query('rollback to savepoint live_publish_code');
          if (typeof error === 'object' && error && 'code' in error && error.code === '23505') continue;
          throw error;
        }
      }
      if (!joinCode) throw new DomainError('live_join_code_conflict', 409);
      const version = await this.bump(client,sessionId,actor.id,'challenge.published',{
        questionCount:questionIds.length,
      });
      await client.query('commit');
      return {
        id:sessionId,
        status:'published' as const,
        joinCode,
        questionCount:questionIds.length,
        version,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }
}
