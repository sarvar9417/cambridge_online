import { randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export interface LiveChallengeSettings {
  questionOrder: 'fixed' | 'shuffled';
  timingMode: 'teacher' | 'per_question';
  defaultTimeLimitSeconds: number | null;
  allowLateJoin: boolean;
  autoCloseWhenAllSubmitted: boolean;
  peerMarkingEnabled: boolean;
  teacherOverrideEnabled: boolean;
  leaderboardMode: 'marks' | 'marks_plus_small_speed_bonus';
  displayNameMode: 'first_name' | 'full_name' | 'anonymous';
}

export const DEFAULT_LIVE_CHALLENGE_SETTINGS: LiveChallengeSettings = {
  questionOrder: 'fixed',
  timingMode: 'teacher',
  defaultTimeLimitSeconds: null,
  allowLateJoin: false,
  autoCloseWhenAllSubmitted: true,
  peerMarkingEnabled: true,
  teacherOverrideEnabled: true,
  leaderboardMode: 'marks',
  displayNameMode: 'first_name',
};

export type LiveChallengeSettingsPatch = Partial<LiveChallengeSettings>;

interface QueryExecutor {
  query: Pool['query'];
}

interface ChallengeScope {
  id: string;
  teacherId: string;
  classId: string;
  syllabusId: string;
  topicId: string | null;
  subtopicId: string | null;
  status: string;
}

interface EligibleQuestionRow {
  id: string;
  display_ref: string;
  stem_md: string | null;
  command_word: string | null;
  marks: number;
  answer_kind: string;
  ao: string | null;
  year: number;
  series: string;
  variant: number;
  component: number;
  source_occurrence_snapshot: unknown;
  mark_scheme_snapshot: unknown;
}

function settingsToJson(settings: LiveChallengeSettings) {
  return {
    question_order: settings.questionOrder,
    timing_mode: settings.timingMode,
    default_time_limit_seconds: settings.defaultTimeLimitSeconds,
    allow_late_join: settings.allowLateJoin,
    auto_close_when_all_submitted: settings.autoCloseWhenAllSubmitted,
    peer_marking_enabled: settings.peerMarkingEnabled,
    teacher_override_enabled: settings.teacherOverrideEnabled,
    leaderboard_mode: settings.leaderboardMode,
    display_name_mode: settings.displayNameMode,
  };
}

export function normalizeLiveChallengeSettings(
  patch: LiveChallengeSettingsPatch | undefined,
  current: LiveChallengeSettings = DEFAULT_LIVE_CHALLENGE_SETTINGS,
): LiveChallengeSettings {
  const merged = { ...current, ...(patch ?? {}) };
  if (
    merged.defaultTimeLimitSeconds !== null
    && (!Number.isInteger(merged.defaultTimeLimitSeconds)
      || merged.defaultTimeLimitSeconds < 10
      || merged.defaultTimeLimitSeconds > 7200)
  ) {
    throw new DomainError('live_challenge_invalid_time_limit', 400);
  }
  return merged;
}

function randomJoinCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = '';
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return code;
}

function parseSettings(value: unknown): LiveChallengeSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_LIVE_CHALLENGE_SETTINGS;
  const raw = value as Record<string, unknown>;
  return normalizeLiveChallengeSettings({
    questionOrder: raw.question_order === 'shuffled' ? 'shuffled' : 'fixed',
    timingMode: raw.timing_mode === 'per_question' ? 'per_question' : 'teacher',
    defaultTimeLimitSeconds: typeof raw.default_time_limit_seconds === 'number'
      ? raw.default_time_limit_seconds
      : null,
    allowLateJoin: raw.allow_late_join === true,
    autoCloseWhenAllSubmitted: raw.auto_close_when_all_submitted !== false,
    peerMarkingEnabled: raw.peer_marking_enabled !== false,
    teacherOverrideEnabled: raw.teacher_override_enabled !== false,
    leaderboardMode: raw.leaderboard_mode === 'marks_plus_small_speed_bonus'
      ? 'marks_plus_small_speed_bonus'
      : 'marks',
    displayNameMode: raw.display_name_mode === 'full_name'
      ? 'full_name'
      : raw.display_name_mode === 'anonymous'
        ? 'anonymous'
        : 'first_name',
  });
}

export class LiveChallengeService {
  constructor(private readonly pool: Pool) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  private async requireClassControl(executor: QueryExecutor, actor: Actor, classId: string) {
    this.assertStaff(actor);
    const result = await executor.query(
      `select c.id,c.school_id,c.syllabus_id,s.code syllabus_code
       from classes c
       join syllabi s on s.id=c.syllabus_id
       where c.id=$1 and c.archived_at is null and (
         ($2='owner' and c.school_id=$3)
         or c.owner_id=$4
         or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4)
       )`,
      [classId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return result.rows[0] as { id:string; school_id:string; syllabus_id:string; syllabus_code:string };
  }

  private async validateTaxonomy(
    executor: QueryExecutor,
    syllabusId: string,
    topicId: string | null,
    subtopicId: string | null,
  ) {
    if (!topicId && subtopicId) throw new DomainError('live_challenge_invalid_taxonomy', 400);
    const result = await executor.query(
      `select s.id syllabus_id,s.code syllabus_code,t.id topic_id,t.number topic_number,t.title topic_title,
        st.id subtopic_id,st.code subtopic_code,st.title subtopic_title
       from syllabi s
       left join topics t on t.syllabus_id=s.id and ($2::uuid is null or t.id=$2)
       left join subtopics st on st.topic_id=t.id and ($3::uuid is null or st.id=$3)
       where s.id=$1
         and ($2::uuid is null or t.id is not null)
         and ($3::uuid is null or st.id is not null)`,
      [syllabusId, topicId, subtopicId],
    );
    if (!result.rowCount) throw new DomainError('live_challenge_invalid_taxonomy', 400);
    return result.rows[0] as {
      syllabus_id:string; syllabus_code:string; topic_id:string|null; topic_number:number|null;
      topic_title:string|null; subtopic_id:string|null; subtopic_code:string|null; subtopic_title:string|null;
    };
  }

  async builderOptions(actor: Actor, syllabusId?: string) {
    this.assertStaff(actor);
    const classes = await this.pool.query(
      `select c.id,c.name,c.grade,c.level::text level,c.academic_year,c.syllabus_id,
        s.code syllabus_code,s.subject
       from classes c join syllabi s on s.id=c.syllabus_id
       where c.archived_at is null and (
         ($1='owner' and c.school_id=$2)
         or c.owner_id=$3
         or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3)
       )
       order by c.academic_year desc,c.name`,
      [actor.role, actor.schoolId, actor.id],
    );
    const syllabusIds = [...new Set(classes.rows.map((row) => String(row.syllabus_id)))];
    const selectedSyllabusId = syllabusId ?? syllabusIds[0] ?? null;
    if (syllabusId && !syllabusIds.includes(syllabusId)) throw new DomainError('not_found', 404);

    const taxonomy = selectedSyllabusId
      ? await this.pool.query(
          `select t.id topic_id,t.number topic_number,t.title topic_title,t.sort_order topic_sort,
             st.id subtopic_id,st.code subtopic_code,st.title subtopic_title,st.sort_order subtopic_sort
           from topics t
           left join subtopics st on st.topic_id=t.id
           where t.syllabus_id=$1
           order by t.sort_order,t.number,st.sort_order,st.code`,
          [selectedSyllabusId],
        )
      : { rows: [] as Record<string, unknown>[] };

    const syllabi = [...new Map(classes.rows.map((row) => [String(row.syllabus_id), {
      id: row.syllabus_id,
      code: row.syllabus_code,
      subject: row.subject,
    }])).values()];
    const topicMap = new Map<string, {
      id:string; number:number; title:string; subtopics:Array<{id:string;code:string;title:string}>;
    }>();
    for (const row of taxonomy.rows) {
      const id = String(row.topic_id);
      if (!topicMap.has(id)) topicMap.set(id, {
        id,
        number: Number(row.topic_number),
        title: String(row.topic_title),
        subtopics: [],
      });
      if (row.subtopic_id) topicMap.get(id)!.subtopics.push({
        id: String(row.subtopic_id),
        code: String(row.subtopic_code),
        title: String(row.subtopic_title),
      });
    }
    return {
      syllabi,
      selectedSyllabusId,
      topics: [...topicMap.values()],
      classes: classes.rows.map((row) => ({
        id: row.id,
        name: row.name,
        grade: row.grade,
        level: row.level,
        academicYear: row.academic_year,
        syllabusId: row.syllabus_id,
        syllabusCode: row.syllabus_code,
      })),
      defaultSettings: DEFAULT_LIVE_CHALLENGE_SETTINGS,
    };
  }

  private async eligibleRows(
    executor: QueryExecutor,
    input: {
      syllabusId:string;
      topicId:string|null;
      subtopicId:string|null;
      ids?:string[];
      limit:number;
      seed?:string;
    },
  ): Promise<EligibleQuestionRow[]> {
    const taxonomy = await this.validateTaxonomy(executor, input.syllabusId, input.topicId, input.subtopicId);
    const values: unknown[] = [taxonomy.syllabus_code, taxonomy.topic_number, taxonomy.subtopic_code];
    const idFilter = input.ids?.length
      ? `and q.id=any($${values.push(input.ids)}::uuid[])`
      : '';
    const limitRef = `$${values.push(input.limit)}`;
    const order = input.seed
      ? `md5(q.id::text || $${values.push(input.seed)}),sp.year desc,sp.series,c.number,sp.variant,q.sort_order`
      : `sp.year desc,sp.series,c.number,sp.variant,q.sort_order`;

    const result = await executor.query(
      `select q.id,q.display_ref,q.stem_md,q.command_word::text command_word,q.marks,q.answer_kind::text answer_kind,
          q.ao::text ao,sp.year,sp.series::text series,sp.variant,c.number component,
          jsonb_build_object(
            'occurrenceId',occ.id,'sourcePaperId',occ.source_paper_id,
            'markSchemeSourcePaperId',occ.mark_scheme_source_paper_id,
            'sourcePath',occ.source_path,'displayRef',occ.display_ref,
            'equivalenceBasis',occ.equivalence_basis,'verifiedAt',occ.verified_at,
            'qpSha256',lower(sp.sha256),'msSha256',lower(ms_sp.sha256),
            'year',sp.year,'series',sp.series::text,'variant',sp.variant,'component',c.number
          ) source_occurrence_snapshot,
          jsonb_build_object(
            'id',ms.id,'schemeType',ms.scheme_type::text,'maxMarks',ms.max_marks,
            'guidanceMd',ms.guidance_md,'reviewedAt',ms.reviewed_at,
            'sourcePaperId',ms.source_paper_id,'sourceSha256',lower(ms_sp.sha256),
            'points',coalesce((select jsonb_agg(jsonb_build_object(
              'id',msp.id,'code',msp.code,'text',msp.text,'marks',msp.marks,
              'accept',msp.accept,'reject',msp.reject,'requires',msp.requires,
              'isBod',msp.is_bod,'groupId',msp.group_id
            ) order by msp.sort_order,msp.id) from mark_scheme_points msp where msp.mark_scheme_id=ms.id),'[]'::jsonb),
            'groups',coalesce((select jsonb_agg(jsonb_build_object(
              'id',msg.id,'label',msg.label,'nRequired',msg.n_required,
              'marksPerPoint',msg.marks_per_point,'maxMarks',msg.max_marks
            ) order by msg.sort_order,msg.id) from mark_scheme_groups msg where msg.mark_scheme_id=ms.id),'[]'::jsonb),
            'levels',coalesce((select jsonb_agg(jsonb_build_object(
              'levelNumber',msl.level_number,'minMarks',msl.min_marks,'maxMarks',msl.max_marks,
              'descriptorMd',msl.descriptor_md,'indicativeContentMd',msl.indicative_content_md
            ) order by msl.level_number) from mark_scheme_levels msl where msl.mark_scheme_id=ms.id),'[]'::jsonb)
          ) mark_scheme_snapshot
       from questions q
       join source_papers sp on sp.id=q.source_paper_id and sp.kind='QP'::paper_kind
       join syllabi sy on sy.id=sp.syllabus_id and sy.code=$1
       join components c on c.id=q.component_id
       join mark_schemes ms on ms.question_id=q.id and ms.status='approved'::review_status and ms.max_marks=q.marks
       join source_papers ms_sp on ms_sp.id=ms.source_paper_id and ms_sp.kind='MS'::paper_kind
       join question_source_occurrences occ on occ.question_id=q.id and occ.is_primary
         and occ.source_paper_id=sp.id and occ.mark_scheme_source_paper_id=ms_sp.id
       where q.status='approved'::review_status
         and q.marks>0
         and q.answer_kind in ('text','pseudocode','code')
         and sp.source_url is not null
         and lower(coalesce(sp.sha256,'')) ~ '^[0-9a-f]{64}$'
         and ms_sp.source_url is not null
         and lower(coalesce(ms_sp.sha256,'')) ~ '^[0-9a-f]{64}$'
         and q.content_version=1 and q.content_json is not null
         and q.content_json->'source'->>'paperId'=sp.id::text
         and lower(coalesce(q.content_json->'source'->>'sha256',''))=lower(sp.sha256)
         and ($2::int is null or exists(
           select 1 from question_subtopics qst
           join subtopics mst on mst.id=qst.subtopic_id
           join topics mt on mt.id=mst.topic_id
           join syllabi msy on msy.id=mt.syllabus_id
           where qst.question_id=q.id and msy.code=$1 and mt.number=$2
         ))
         and ($3::text is null or exists(
           select 1 from question_subtopics qst
           join subtopics mst on mst.id=qst.subtopic_id
           join topics mt on mt.id=mst.topic_id
           join syllabi msy on msy.id=mt.syllabus_id
           where qst.question_id=q.id and msy.code=$1 and mt.number=$2 and mst.code=$3
         ))
         and not exists(
           select 1 from validation_findings vf
           where vf.ref_table='questions' and vf.ref_id=q.id
             and vf.severity='error' and vf.resolved_at is null
         )
         and not exists(
           select 1 from question_dependencies qd
           where qd.question_id=q.id and qd.kind='answer_ref' and qd.strength='required'
         )
         and not exists(
           select 1
           from jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) block
           where block->>'type'='asset'
             and not exists(
               select 1 from question_assets qa
               where qa.id::text=block->>'assetId'
                 and qa.question_id=q.id
                 and (
                   nullif(btrim(coalesce(qa.storage_path,'')),'') is not null
                   or nullif(btrim(coalesce(qa.svg_markup,'')),'') is not null
                   or nullif(btrim(coalesce(qa.content_md,'')),'') is not null
                 )
             )
         )
         ${idFilter}
       order by ${order}
       limit ${limitRef}`,
      values,
    );
    return result.rows.map((row) => ({ ...row, marks:Number(row.marks), year:Number(row.year), variant:Number(row.variant), component:Number(row.component) })) as EligibleQuestionRow[];
  }

  async eligibleQuestions(actor: Actor, input: {
    syllabusId:string; topicId?:string; subtopicId?:string; limit?:number;
  }) {
    this.assertStaff(actor);
    const rows = await this.eligibleRows(this.pool, {
      syllabusId: input.syllabusId,
      topicId: input.topicId ?? null,
      subtopicId: input.subtopicId ?? null,
      limit: Math.min(Math.max(input.limit ?? 100, 1), 500),
    });
    return rows.map((row) => ({
      id: row.id,
      displayRef: row.display_ref,
      stemMd: row.stem_md,
      commandWord: row.command_word,
      marks: row.marks,
      answerKind: row.answer_kind,
      ao: row.ao,
      year: row.year,
      series: row.series,
      variant: row.variant,
      component: row.component,
    }));
  }

  async list(actor: Actor) {
    this.assertStaff(actor);
    const result = await this.pool.query(
      `select lc.id,lc.title,lc.class_id,c.name class_name,lc.syllabus_id,s.code syllabus_code,
        lc.topic_id,t.title topic_title,lc.subtopic_id,st.title subtopic_title,
        lc.join_code,lc.status::text status,lc.settings_json,lc.current_question_position,
        lc.state_version,lc.created_at,lc.published_at,lc.started_at,lc.finished_at,
        (select count(*)::int from live_challenge_questions lcq where lcq.challenge_id=lc.id) question_count
       from live_challenges lc
       join classes c on c.id=lc.class_id
       join syllabi s on s.id=lc.syllabus_id
       left join topics t on t.id=lc.topic_id
       left join subtopics st on st.id=lc.subtopic_id
       where (
         ($1='owner' and c.school_id=$2)
         or lc.teacher_id=$3
         or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3)
       )
       order by lc.created_at desc`,
      [actor.role, actor.schoolId, actor.id],
    );
    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      classId: row.class_id,
      className: row.class_name,
      syllabusId: row.syllabus_id,
      syllabusCode: row.syllabus_code,
      topicId: row.topic_id,
      topicTitle: row.topic_title,
      subtopicId: row.subtopic_id,
      subtopicTitle: row.subtopic_title,
      joinCode: row.join_code,
      status: row.status,
      settings: parseSettings(row.settings_json),
      currentQuestionPosition: row.current_question_position,
      stateVersion: Number(row.state_version),
      questionCount: Number(row.question_count),
      createdAt: row.created_at,
      publishedAt: row.published_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    }));
  }

  async createDraft(actor: Actor, input: {
    classId:string;
    title:string;
    syllabusId:string;
    topicId?:string|null;
    subtopicId?:string|null;
    settings?:LiveChallengeSettingsPatch;
    questionIds?:string[];
  }) {
    this.assertStaff(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const klass = await this.requireClassControl(client, actor, input.classId);
      if (klass.syllabus_id !== input.syllabusId) throw new DomainError('live_challenge_class_syllabus_mismatch', 409);
      await this.validateTaxonomy(client, input.syllabusId, input.topicId ?? null, input.subtopicId ?? null);
      const settings = normalizeLiveChallengeSettings(input.settings);
      const created = await client.query(
        `insert into live_challenges(
           teacher_id,class_id,title,syllabus_id,topic_id,subtopic_id,settings_json,status
         ) values($1,$2,$3,$4,$5,$6,$7::jsonb,'DRAFT')
         returning id,title,class_id,syllabus_id,topic_id,subtopic_id,status::text status,settings_json,state_version,created_at`,
        [actor.id,input.classId,input.title,input.syllabusId,input.topicId??null,input.subtopicId??null,JSON.stringify(settingsToJson(settings))],
      );
      const challenge = created.rows[0] as Record<string, unknown>;
      const ids = input.questionIds ?? [];
      if (ids.length) await this.replaceQuestionsInTransaction(client, actor, String(challenge.id), ids, false);
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'challenge.draft_created',$3::jsonb)`,
        [challenge.id, actor.id, JSON.stringify({ questionCount:ids.length })],
      );
      await client.query('commit');
      return {
        id: challenge.id,
        title: challenge.title,
        classId: challenge.class_id,
        syllabusId: challenge.syllabus_id,
        topicId: challenge.topic_id,
        subtopicId: challenge.subtopic_id,
        status: challenge.status,
        settings,
        stateVersion: Number(challenge.state_version),
        questionCount: ids.length,
        createdAt: challenge.created_at,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  private async requireDraft(executor: QueryExecutor, actor: Actor, challengeId: string, lock = false): Promise<ChallengeScope> {
    this.assertStaff(actor);
    const result = await executor.query(
      `select lc.id,lc.teacher_id,lc.class_id,lc.syllabus_id,lc.topic_id,lc.subtopic_id,lc.status::text status
       from live_challenges lc join classes c on c.id=lc.class_id
       where lc.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or lc.teacher_id=$4
         or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4)
       ) ${lock ? 'for update of lc' : ''}`,
      [challengeId,actor.role,actor.schoolId,actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    const row = result.rows[0];
    if (row.status !== 'DRAFT') throw new DomainError('live_challenge_not_draft', 409);
    return {
      id: row.id,
      teacherId: row.teacher_id,
      classId: row.class_id,
      syllabusId: row.syllabus_id,
      topicId: row.topic_id,
      subtopicId: row.subtopic_id,
      status: row.status,
    };
  }

  private async replaceQuestionsInTransaction(
    client: PoolClient,
    actor: Actor,
    challengeId: string,
    questionIds: string[],
    lockChallenge = true,
  ) {
    const challenge = await this.requireDraft(client, actor, challengeId, lockChallenge);
    const uniqueIds = [...new Set(questionIds)];
    if (uniqueIds.length !== questionIds.length) throw new DomainError('live_challenge_duplicate_question', 400);
    if (!uniqueIds.length) throw new DomainError('live_challenge_questions_required', 400);
    const rows = await this.eligibleRows(client, {
      syllabusId: challenge.syllabusId,
      topicId: challenge.topicId,
      subtopicId: challenge.subtopicId,
      ids: uniqueIds,
      limit: uniqueIds.length,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    if (byId.size !== uniqueIds.length) throw new DomainError('live_challenge_questions_ineligible', 409);

    await client.query('delete from live_challenge_questions where challenge_id=$1', [challengeId]);
    for (const [index, id] of uniqueIds.entries()) {
      const row = byId.get(id)!;
      await client.query(
        `insert into live_challenge_questions(
           challenge_id,question_id,position,max_marks_snapshot,source_occurrence_snapshot,
           mark_scheme_snapshot,time_limit_seconds
         ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
        [challengeId,id,index+1,row.marks,JSON.stringify(row.source_occurrence_snapshot),JSON.stringify(row.mark_scheme_snapshot),null],
      );
    }
    return uniqueIds.length;
  }

  async replaceQuestions(actor: Actor, challengeId: string, questionIds: string[]) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const count = await this.replaceQuestionsInTransaction(client, actor, challengeId, questionIds);
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'challenge.questions_replaced',$3::jsonb)`,
        [challengeId,actor.id,JSON.stringify({ questionCount:count, selectionMode:'manual' })],
      );
      await client.query('commit');
      return { id:challengeId, questionCount:count, selectionMode:'manual' as const };
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async autoSelect(actor: Actor, challengeId: string, count: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const challenge = await this.requireDraft(client, actor, challengeId, true);
      const rows = await this.eligibleRows(client, {
        syllabusId: challenge.syllabusId,
        topicId: challenge.topicId,
        subtopicId: challenge.subtopicId,
        limit: count,
        seed: challengeId,
      });
      if (rows.length < count) throw new DomainError('live_challenge_pool_insufficient', 409);
      const selectedIds = rows.map((row) => row.id);
      await this.replaceQuestionsInTransaction(client, actor, challengeId, selectedIds, false);
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'challenge.questions_replaced',$3::jsonb)`,
        [challengeId,actor.id,JSON.stringify({ questionCount:count, selectionMode:'auto' })],
      );
      await client.query('commit');
      return { id:challengeId, questionCount:count, selectionMode:'auto' as const, questionIds:selectedIds };
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async updateDraft(actor: Actor, challengeId: string, input: { title?:string; settings?:LiveChallengeSettingsPatch }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await this.requireDraft(client, actor, challengeId, true);
      const current = await client.query('select settings_json,title from live_challenges where id=$1', [challengeId]);
      const settings = normalizeLiveChallengeSettings(input.settings, parseSettings(current.rows[0]?.settings_json));
      const updated = await client.query(
        `update live_challenges set title=coalesce($2,title),settings_json=$3::jsonb,updated_at=now(),state_version=state_version+1
         where id=$1 returning id,title,status::text status,settings_json,state_version,updated_at`,
        [challengeId,input.title??null,JSON.stringify(settingsToJson(settings))],
      );
      await client.query(
        `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
         values($1,$2,'challenge.draft_updated',$3::jsonb)`,
        [challengeId,actor.id,JSON.stringify({ titleChanged:input.title!==undefined, settingsChanged:input.settings!==undefined })],
      );
      await client.query('commit');
      return { id:updated.rows[0].id,title:updated.rows[0].title,status:updated.rows[0].status,settings,stateVersion:Number(updated.rows[0].state_version),updatedAt:updated.rows[0].updated_at };
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  }

  async publish(actor: Actor, challengeId: string) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const client = await this.pool.connect();
      try {
        await client.query('begin');
        const challenge = await this.requireDraft(client, actor, challengeId, true);
        const selected = await client.query(
          `select question_id,position from live_challenge_questions where challenge_id=$1 order by position`,
          [challengeId],
        );
        if (!selected.rowCount) throw new DomainError('live_challenge_questions_required', 409);
        const ids = selected.rows.map((row) => String(row.question_id));
        const eligible = await this.eligibleRows(client, {
          syllabusId:challenge.syllabusId,
          topicId:challenge.topicId,
          subtopicId:challenge.subtopicId,
          ids,
          limit:ids.length,
        });
        const byId = new Map(eligible.map((row) => [row.id,row]));
        if (byId.size !== ids.length) throw new DomainError('live_challenge_questions_ineligible', 409);

        for (const item of selected.rows) {
          const row = byId.get(String(item.question_id))!;
          await client.query(
            `update live_challenge_questions set max_marks_snapshot=$3,
               source_occurrence_snapshot=$4::jsonb,mark_scheme_snapshot=$5::jsonb
             where challenge_id=$1 and question_id=$2`,
            [challengeId,row.id,row.marks,JSON.stringify(row.source_occurrence_snapshot),JSON.stringify(row.mark_scheme_snapshot)],
          );
        }

        const joinCode = randomJoinCode();
        const updated = await client.query(
          `update live_challenges set status='PUBLISHED',join_code=$2,published_at=now(),updated_at=now(),state_version=state_version+1
           where id=$1 returning id,title,class_id,join_code,status::text status,state_version,published_at`,
          [challengeId,joinCode],
        );
        await client.query(
          `insert into live_challenge_events(challenge_id,actor_id,event_type,payload_json)
           values($1,$2,'challenge.published',$3::jsonb)`,
          [challengeId,actor.id,JSON.stringify({ joinCode, questionCount:ids.length })],
        );
        await client.query('commit');
        const row = updated.rows[0];
        return { id:row.id,title:row.title,classId:row.class_id,joinCode:row.join_code,status:row.status,stateVersion:Number(row.state_version),publishedAt:row.published_at,questionCount:ids.length };
      } catch (error) {
        await client.query('rollback');
        if (typeof error === 'object' && error && 'code' in error && error.code === '23505' && attempt < 7) continue;
        throw error;
      } finally { client.release(); }
    }
    throw new DomainError('live_challenge_join_code_unavailable', 409);
  }
}
