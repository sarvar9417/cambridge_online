import { createHash, randomInt, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { AssetUrlSigner } from '../jobs/asset-store.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import type { PortableQuestion } from './selection-review.js';
import { DomainError } from './assignments-service.js';
import { computeScore, type Scheme } from '../lib/marking.js';

export type LiveExamMarkingMode = 'teacher' | 'peer' | 'self';
export type LiveExamStatus = 'lobby' | 'question_open' | 'marking' | 'review' | 'finished' | 'cancelled';
const QUESTION_DEADLINE_GRACE_S = 10;

export interface CreateLiveExamInput {
  classId: string;
  title: string;
  topicIds: string[];
  subtopicIds: string[];
  questionCount: number;
  questionTimeLimitS?: number;
  markingMode: LiveExamMarkingMode;
  includeDiagrams: boolean;
  excludeSeen: boolean;
  questionIds?: string[];
  questionOrder?: 'fixed' | 'shuffled';
  allowLateJoin?: boolean;
  autoCloseWhenAllSubmitted?: boolean;
  teacherOverrideEnabled?: boolean;
  leaderboardMode?: 'marks' | 'marks_speed_tiebreak';
}

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
  levels: Array<{
    id: string;
    levelNumber: number;
    minMarks: number;
    maxMarks: number;
    descriptorMd: string;
    indicativeContentMd: string | null;
  }>;
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

type StoredQuestionSnapshot = Omit<PortableQuestion, 'dependencies'> & {
  dependencies: Array<Omit<PortableQuestion['dependencies'][number], 'evidence' | 'confidence'>>;
};

type PeerAnswer = { answerId: string; studentId: string };

/**
 * A deterministic derangement for peer marking.
 *
 * Sorting before rotating makes reconnects and retries produce exactly the same
 * assignments. With two students reciprocal marking is unavoidable; with one
 * student the caller falls back to genuine self-assessment.
 */
export function assignPeerReviewers(answers: PeerAnswer[], seed: string) {
  const ordered = [...answers].sort((a, b) => {
    const left = createHash('sha256').update(`${seed}:${a.studentId}`).digest('hex');
    const right = createHash('sha256').update(`${seed}:${b.studentId}`).digest('hex');
    return left.localeCompare(right);
  });
  if (ordered.length < 2) return ordered.map((answer) => ({ ...answer, reviewerId: answer.studentId, kind: 'self' as const }));
  return ordered.map((answer, index) => ({
    ...answer,
    reviewerId: ordered[(index + 1) % ordered.length]!.studentId,
    kind: 'peer' as const,
  }));
}

function words(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function storedPortable(portable: PortableQuestion): StoredQuestionSnapshot {
  return {
    ...portable,
    dependencies: portable.dependencies.map(({ evidence: _evidence, confidence: _confidence, ...dependency }) => dependency),
    contextBlocks: portable.contextBlocks.map((block) => ({
      ...block,
      assets: block.assets.map((asset) => ({ ...asset, url: null })),
    })),
  };
}

export class LiveExamService {
  private readonly signedAssetCache = new Map<string, { value: Promise<string | null>; expiresAt: number }>();

  constructor(
    private readonly pool: Pool,
    private readonly questions: PgQuestionsRepository,
    private readonly assetUrlSigner?: AssetUrlSigner,
  ) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  private async requireClassControl(executor: Pick<Pool, 'query'> | PoolClient, actor: Actor, classId: string) {
    this.assertStaff(actor);
    const result = await executor.query(
      `select c.id,c.name
       from classes c
       where c.id=$1 and c.archived_at is null and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (c.owner_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
         )))
       )`,
      [classId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return result.rows[0] as { id: string; name: string };
  }

  private async lockControlledSession(client: PoolClient, actor: Actor, sessionId: string) {
    this.assertStaff(actor);
    const result = await client.query(
      `select les.*
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where les.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (c.owner_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
         )))
       )
       for update of les`,
      [sessionId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return result.rows[0] as Record<string, unknown>;
  }

  private assertExpectedVersion(session: Record<string, unknown>, expectedVersion?: number) {
    if (expectedVersion !== undefined && Number(session.version) !== expectedVersion) {
      throw new DomainError('live_state_conflict', 409, {
        currentVersion: Number(session.version),
        currentStatus: session.status,
      });
    }
  }

  private async bump(
    client: PoolClient,
    sessionId: string,
    actorId: string | null,
    eventType: string,
    payload: Record<string, unknown> = {},
  ) {
    const changed = await client.query(
      `update live_exam_sessions
       set version=version+1,updated_at=now()
       where id=$1
       returning version`,
      [sessionId],
    );
    const version = Number(changed.rows[0].version);
    await client.query(
      `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
       values($1,$2,$3,$4,$5::jsonb)`,
      [sessionId, actorId, eventType, version, JSON.stringify(payload)],
    );
    return version;
  }

  private async markScheme(questionId: string): Promise<MarkSchemeSnapshot> {
    const result = await this.pool.query(
      `select jsonb_build_object(
         'id',ms.id,'schemeType',ms.scheme_type,'maxMarks',ms.max_marks,'guidanceMd',ms.guidance_md,
         'levels',coalesce((select jsonb_agg(jsonb_build_object(
           'id',msl.id,'levelNumber',msl.level_number,'minMarks',msl.min_marks,
           'maxMarks',msl.max_marks,'descriptorMd',msl.descriptor_md,
           'indicativeContentMd',msl.indicative_content_md
         ) order by msl.level_number,msl.id) from mark_scheme_levels msl where msl.mark_scheme_id=ms.id),'[]'::jsonb),
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
       from canonical_mark_schemes ms
       where ms.question_id=$1 and ms.status='approved'`,
      [questionId],
    );
    if (!result.rows[0]?.scheme) throw new DomainError('live_question_not_ready', 409);
    return result.rows[0].scheme as MarkSchemeSnapshot;
  }

  private async chooseQuestionIds(actor: Actor, input: CreateLiveExamInput, requireExact = true) {
    // Keep the random ordering seed first and bind the class ID for both
    // syllabus-safe LO resolution and optional seen-question filtering.
    // Every value is referenced in the SQL so PostgreSQL can infer its type.
    const values: unknown[] = [randomUUID(), input.classId];
    const classParameter = '$2';
    const filters = [
      `q.status='approved'`,
      `q.marks>0`,
      `ms.status='approved'`,
      `(ms.scheme_type <> 'levels_of_response'::scheme_type or exists(
        select 1 from mark_scheme_levels msl where msl.mark_scheme_id=ms.id
      ))`,
      // Finished sessions publish mastery into the class syllabus. Prefer direct
      // or explicitly reviewed LO compatibility, but do not discard a valid
      // Cambridge question solely because an older syllabus split its LOs
      // differently. A high-confidence primary subtopic may fall back to the
      // same stable topic-number + subtopic-code in the class syllabus; the
      // learning-evidence trigger records that fallback as subtopic evidence,
      // never as an invented learning-objective match.
      `exists(
        select 1
        from classes live_class
        where live_class.id=${classParameter}
          and (
            exists(
              select 1
              from question_learning_objectives qlo
              join learning_objectives direct_lo on direct_lo.id=qlo.lo_id
              join subtopics direct_st on direct_st.id=direct_lo.subtopic_id
              join topics direct_t on direct_t.id=direct_st.topic_id
              where qlo.question_id=q.id
                and direct_t.syllabus_id=live_class.syllabus_id
            )
            or exists(
              select 1
              from question_learning_objectives qlo
              join learning_objective_compatibility compat
                on compat.source_lo_id=qlo.lo_id
               and compat.relation in ('equivalent','subtopic_compatible')
              join learning_objectives target_lo on target_lo.id=compat.target_lo_id
              join subtopics target_st on target_st.id=target_lo.subtopic_id
              join topics target_t on target_t.id=target_st.topic_id
              where qlo.question_id=q.id
                and target_t.syllabus_id=live_class.syllabus_id
            )
            or exists(
              select 1
              from question_subtopics qst
              join subtopics source_st on source_st.id=qst.subtopic_id
              join topics source_t on source_t.id=source_st.topic_id
              join topics target_t
                on target_t.syllabus_id=live_class.syllabus_id
               and target_t.number=source_t.number
              join subtopics target_st
                on target_st.topic_id=target_t.id
               and target_st.code=source_st.code
              where qst.question_id=q.id
                and qst.is_primary
                and coalesce(qst.confidence,0)>=0.95
            )
          )
      )`,
    ];
    if (input.topicIds.length) {
      values.push(input.topicIds);
      const parameter = `$${values.length}`;
      filters.push(`exists(
        select 1 from question_subtopics qst
        join subtopics mapped_subtopic on mapped_subtopic.id=qst.subtopic_id
        join topics mapped_topic on mapped_topic.id=mapped_subtopic.topic_id
        join syllabi mapped_syllabus on mapped_syllabus.id=mapped_topic.syllabus_id
        where qst.question_id=q.id and exists(
          select 1 from topics selected_topic
          join syllabi selected_syllabus on selected_syllabus.id=selected_topic.syllabus_id
          where selected_topic.id=any(${parameter}::uuid[])
            and selected_syllabus.code=mapped_syllabus.code
            and selected_topic.number=mapped_topic.number
        )
      )`);
    }
    if (input.subtopicIds.length) {
      values.push(input.subtopicIds);
      const parameter = `$${values.length}`;
      filters.push(`exists(
        select 1 from question_subtopics qst
        join subtopics mapped_subtopic on mapped_subtopic.id=qst.subtopic_id
        join topics mapped_topic on mapped_topic.id=mapped_subtopic.topic_id
        join syllabi mapped_syllabus on mapped_syllabus.id=mapped_topic.syllabus_id
        where qst.question_id=q.id and exists(
          select 1 from subtopics selected_subtopic
          join topics selected_topic on selected_topic.id=selected_subtopic.topic_id
          join syllabi selected_syllabus on selected_syllabus.id=selected_topic.syllabus_id
          where selected_subtopic.id=any(${parameter}::uuid[])
            and selected_syllabus.code=mapped_syllabus.code
            and selected_topic.number=mapped_topic.number
            and selected_subtopic.code=mapped_subtopic.code
        )
      )`);
    }
    if (!input.includeDiagrams) {
      filters.push(`not exists(
        with recursive ancestry as (
          select q.id,q.parent_id
          union all
          select parent.id,parent.parent_id
          from ancestry child join questions parent on parent.id=child.parent_id
        )
        select 1 from ancestry join question_assets qa on qa.question_id=ancestry.id
        where qa.kind in ('diagram','image')
      )`);
    }
    if (input.questionIds?.length) {
      values.push(input.questionIds);
      filters.push(`q.id=any($${values.length}::uuid[])`);
    }
    if (input.excludeSeen) {
      filters.push(`not exists(
        select 1 from assignment_questions aq
        join assignments a on a.id=aq.assignment_id
        where aq.question_id=q.id and a.class_id=${classParameter}
      )`);
      filters.push(`not exists(
        select 1 from live_exam_questions leq
        join live_exam_sessions previous on previous.id=leq.session_id
        where leq.question_id=q.id and previous.class_id=${classParameter}
      )`);
    }
    values.push(input.questionCount);
    const result = await this.pool.query(
      `select candidate.id
       from (
         select distinct q.id
         from questions q
         join canonical_mark_schemes ms on ms.question_id=q.id
         where ${filters.join(' and ')}
       ) candidate
       order by md5(candidate.id::text || $1::text)
       limit $${values.length}`,
      values,
    );
    if (requireExact && (result.rowCount ?? 0) < input.questionCount) throw new DomainError('live_question_pool_small', 409);
    const selected = result.rows.map((row) => String(row.id));
    if (input.questionIds?.length && input.questionOrder !== 'shuffled') {
      const available = new Set(selected);
      return input.questionIds.filter((id) => available.has(id));
    }
    return selected;
  }

  private async expandRequiredDependencies(questionIds: string[]) {
    if (!questionIds.length) return [];
    const result = await this.pool.query(
      `with recursive closure(question_id) as (
         select unnest($1::uuid[])
         union
         select qd.depends_on_id
         from closure c
         join question_dependencies qd on qd.question_id=c.question_id
         where qd.strength::text='required'
       )
       select c.question_id,q.status::text status,q.marks,
         exists(
           select 1 from canonical_mark_schemes ms
           where ms.question_id=c.question_id and ms.status='approved'
         ) mark_scheme_ready,
         coalesce(
           array_agg(qd.depends_on_id order by target.sort_order,target.id)
             filter(where qd.depends_on_id is not null),
           '{}'::uuid[]
         ) dependencies
       from closure c
       join questions q on q.id=c.question_id
       left join question_dependencies qd
         on qd.question_id=c.question_id and qd.strength::text='required'
       left join questions target on target.id=qd.depends_on_id
       group by c.question_id,q.status,q.marks`,
      [questionIds],
    );

    const nodes = new Map<string, { status:string; marks:number|null; markSchemeReady:boolean; dependencies:string[] }>();
    for (const row of result.rows) {
      nodes.set(String(row.question_id), {
        status: String(row.status),
        marks: row.marks == null ? null : Number(row.marks),
        markSchemeReady: Boolean(row.mark_scheme_ready),
        dependencies: (row.dependencies ?? []).map(String),
      });
    }

    const ordered: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (questionId: string) => {
      if (visited.has(questionId)) return;
      if (visiting.has(questionId)) throw new DomainError('live_dependency_cycle', 409);
      const node = nodes.get(questionId);
      if (!node) throw new DomainError('live_dependency_target_missing', 409);
      if (node.status !== 'approved' || !node.marks || !node.markSchemeReady) {
        throw new DomainError('live_question_not_ready', 409);
      }
      visiting.add(questionId);
      for (const dependencyId of node.dependencies) visit(dependencyId);
      visiting.delete(questionId);
      visited.add(questionId);
      ordered.push(questionId);
    };
    for (const questionId of questionIds) visit(questionId);
    if (ordered.length > 60) throw new DomainError('live_dependency_bundle_too_large', 409);
    return ordered;
  }

  async eligibleQuestions(
    actor: Actor,
    input: Omit<CreateLiveExamInput, 'title' | 'markingMode' | 'questionCount'> & { limit: number },
  ) {
    await this.requireClassControl(this.pool, actor, input.classId);
    if (!input.topicIds.length && !input.subtopicIds.length) throw new DomainError('live_topic_required', 400);
    const ids = await this.chooseQuestionIds(actor, {
      ...input,
      title: 'Question preview',
      markingMode: 'teacher',
      questionCount: input.limit,
      questionIds: undefined,
    }, false);
    const rows = await Promise.all(ids.map(async (questionId) => {
      const portable = await this.questions.portable(actor, questionId);
      if (!portable) return null;
      return {
        id: questionId,
        displayRef: portable.sourceRef,
        marks: portable.leaf.marks,
        commandWord: portable.leaf.commandWord,
        stem: portable.leaf.stem,
        hasAssets: portable.contextBlocks.some((block) => block.assets.length > 0),
        dependencyCount: portable.dependencies.filter((dependency) => dependency.strength === 'required').length,
      };
    }));
    return rows.filter((row): row is NonNullable<typeof row> => row !== null);
  }

  async create(actor: Actor, input: CreateLiveExamInput) {
    await this.requireClassControl(this.pool, actor, input.classId);
    if (!input.topicIds.length && !input.subtopicIds.length) throw new DomainError('live_topic_required', 400);
    if (input.questionIds?.length && input.questionIds.length !== input.questionCount) {
      throw new DomainError('live_question_selection_mismatch', 400);
    }

    const questionIds = await this.chooseQuestionIds(actor, input);
    const expandedQuestionIds = await this.expandRequiredDependencies(questionIds);
    const snapshots = await Promise.all(expandedQuestionIds.map(async (questionId) => {
      const [portable, markScheme] = await Promise.all([
        this.questions.portable(actor, questionId),
        this.markScheme(questionId),
      ]);
      if (!portable) throw new DomainError('live_question_not_ready', 409);
      if (input.includeDiagrams && portable.contextBlocks.some(
        (block) => block.assets.some((asset) => asset.storagePath && !asset.contentMd && !asset.url),
      )) throw new DomainError('live_assets_unavailable', 409);
      return { questionId, portable: storedPortable(portable), markScheme };
    }));

    const client = await this.pool.connect();
    try {
      await this.requireClassControl(client, actor, input.classId);
      let session;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await client.query('begin');
        try {
          const joinCode = String(randomInt(100000, 1000000));
          session = await client.query(
            `insert into live_exam_sessions(
               class_id,host_id,title,join_code,marking_mode,question_time_limit_s,settings
             ) values($1,$2,$3,$4,$5,$6,$7::jsonb)
             returning id,class_id,title,join_code,status,marking_mode,question_time_limit_s,version,created_at`,
            [input.classId, actor.id, input.title, joinCode, input.markingMode,
              input.questionTimeLimitS ?? null,
              JSON.stringify({
                topicIds: input.topicIds,
                subtopicIds: input.subtopicIds,
                includeDiagrams: input.includeDiagrams,
                excludeSeen: input.excludeSeen,
                questionOrder: input.questionOrder ?? 'shuffled',
                allowLateJoin: input.allowLateJoin ?? false,
                autoCloseWhenAllSubmitted: input.autoCloseWhenAllSubmitted ?? false,
                teacherOverrideEnabled: input.teacherOverrideEnabled ?? true,
                leaderboardMode: input.leaderboardMode ?? 'marks',
                requestedQuestionCount: questionIds.length,
                dependencyQuestionCount: Math.max(0, expandedQuestionIds.length - questionIds.length),
              })],
          );
          break;
        } catch (error) {
          await client.query('rollback');
          if (typeof error === 'object' && error && 'code' in error && error.code === '23505' && attempt < 4) continue;
          throw error;
        }
      }
      if (!session) throw new DomainError('live_join_code_conflict', 409);
      for (const [position, snapshot] of snapshots.entries()) {
        await client.query(
          `insert into live_exam_questions(
             session_id,question_id,position,marks,question_snapshot,mark_scheme_snapshot
           ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
          [session.rows[0].id, snapshot.questionId, position, snapshot.portable.leaf.marks,
            JSON.stringify(snapshot.portable), JSON.stringify(snapshot.markScheme)],
        );
      }
      await client.query(
        `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
         values($1,$2,'session.created',1,$3::jsonb)`,
        [session.rows[0].id, actor.id, JSON.stringify({
          questionCount: snapshots.length,
          requestedQuestionCount: questionIds.length,
          dependencyQuestionCount: Math.max(0, expandedQuestionIds.length - questionIds.length),
        })],
      );
      await client.query('commit');
      return { ...this.mapSession(session.rows[0]), questionCount: snapshots.length };
    } catch (error) {
      await client.query('rollback');
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        throw new DomainError('live_join_code_conflict', 409);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async list(actor: Actor) {
    const result = await this.pool.query(
      `select les.id,les.class_id,les.title,les.join_code,les.status::text,les.marking_mode::text,
         les.question_time_limit_s,les.current_question_index,les.version,les.created_at,les.updated_at,
         les.paused_at,les.pause_remaining_s,les.settings,
         c.name class_name,
         (select count(*) from live_exam_questions leq where leq.session_id=les.id)::int question_count,
         (select count(*) from live_exam_participants lep where lep.session_id=les.id and lep.left_at is null)::int participant_count
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where (
         ($1='student' and exists(
           select 1 from live_exam_participants lep
           where lep.session_id=les.id and lep.student_id=$2 and lep.left_at is null
         ))
         or ($1='owner' and c.school_id=$3)
         or ($1='teacher' and (c.owner_id=$2 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$2
         )))
       )
       order by (les.status not in ('finished','cancelled')) desc,les.updated_at desc
       limit 50`,
      [actor.role, actor.id, actor.schoolId],
    );
    return result.rows.map((row) => ({
      ...this.mapSession(row),
      className: row.class_name,
      questionCount: Number(row.question_count),
      participantCount: Number(row.participant_count),
    }));
  }

  async join(actor: Actor, code: string) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const room = await client.query(
        `select les.*
         from live_exam_sessions les
         join enrollments e on e.class_id=les.class_id and e.student_id=$2 and e.left_at is null
         where les.join_code=$1
           and coalesce(
             (to_jsonb(les)->>'join_code_expires_at')::timestamptz,
             'infinity'::timestamptz
           ) > now() and (
           les.status='lobby'
           or (les.status='question_open' and coalesce((les.settings->>'allowLateJoin')::boolean,false))
         )
         for update of les`,
        [code, actor.id],
      );
      if (!room.rowCount) throw new DomainError('live_code_not_found', 404);
      const session = room.rows[0];
      const result = await client.query(
        `insert into live_exam_participants(session_id,student_id,left_at,last_seen_at)
         values($1,$2,null,now())
         on conflict(session_id,student_id) do update set left_at=null,last_seen_at=now()
         returning id,session_id,joined_at`,
        [session.id, actor.id],
      );
      const participant = result.rows[0];
      if (session.status === 'question_open') {
        await client.query(
          `insert into live_exam_answers(session_question_id,participant_id)
           select leq.id,$2 from live_exam_questions leq
           where leq.session_id=$1 and leq.position=$3
           on conflict(session_question_id,participant_id) do nothing`,
          [session.id, participant.id, session.current_question_index],
        );
      }
      await this.bump(client, String(session.id), actor.id, 'participant.joined', {
        participantId: participant.id,
        late: session.status !== 'lobby',
      });
      await client.query('commit');
      return { sessionId: participant.session_id, participantId: participant.id };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async heartbeat(actor: Actor, sessionId: string) {
    if (actor.role === 'student') {
      const result = await this.pool.query(
        `update live_exam_participants set last_seen_at=now()
         where session_id=$1 and student_id=$2 and left_at is null returning id`,
        [sessionId, actor.id],
      );
      if (!result.rowCount) throw new DomainError('not_found', 404);
    } else {
      await this.requireClassControlForSession(actor, sessionId);
    }
    await this.closeExpiredQuestion(sessionId);
    return { serverNow: new Date() };
  }

  private async closeExpiredQuestion(sessionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        `select * from live_exam_sessions where id=$1 for update`, [sessionId],
      );
      const session = result.rows[0];
      if (!session || session.status !== 'question_open' || session.paused_at
        || !session.question_started_at || session.question_time_limit_s === null) {
        await client.query('commit');
        return false;
      }
      const expired = await client.query(
        `select now() > $1::timestamptz + $2::int * interval '1 second'
           + $3::int * interval '1 second' expired`,
        [session.question_started_at, session.question_time_limit_s, QUESTION_DEADLINE_GRACE_S],
      );
      if (!expired.rows[0].expired) {
        await client.query('commit');
        return false;
      }
      await this.revealWithinTransaction(client, session, null);
      await client.query('commit');
      return true;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async requireClassControlForSession(actor: Actor, sessionId: string) {
    const result = await this.pool.query('select class_id from live_exam_sessions where id=$1', [sessionId]);
    if (!result.rowCount) throw new DomainError('not_found', 404);
    await this.requireClassControl(this.pool, actor, String(result.rows[0].class_id));
  }

  private async hydratePortable(snapshot: StoredQuestionSnapshot) {
    if (!this.assetUrlSigner) return snapshot;
    const contextBlocks = await Promise.all(snapshot.contextBlocks.map(async (block) => ({
      ...block,
      assets: await Promise.all(block.assets.map(async (asset) => {
        if (!asset.storagePath) return asset;
        const now = Date.now();
        const cached = this.signedAssetCache.get(asset.storagePath);
        let value = cached && cached.expiresAt > now ? cached.value : undefined;
        if (!value) {
          value = this.assetUrlSigner!.signStoragePath(asset.storagePath, 300);
          this.signedAssetCache.set(asset.storagePath, { value, expiresAt: now + 240_000 });
          value.catch(() => this.signedAssetCache.delete(asset.storagePath!));
          if (this.signedAssetCache.size > 500) {
            for (const [path, entry] of this.signedAssetCache) {
              if (entry.expiresAt <= now) this.signedAssetCache.delete(path);
            }
          }
        }
        const url = await value;
        return { ...asset, url };
      })),
    })));
    return { ...snapshot, contextBlocks };
  }

  async snapshot(actor: Actor, sessionId: string, projector = false): Promise<Record<string, unknown>> {
    const access = await this.pool.query(
      `select les.*,c.name class_name,u.full_name host_name,
         ($2<>'student') is_staff,
         lep.id participant_id
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       join users u on u.id=les.host_id
       left join live_exam_participants lep on lep.session_id=les.id and lep.student_id=$3 and lep.left_at is null
       where les.id=$1 and (
         ($2='student' and lep.id is not null)
         or ($2='owner' and c.school_id=$4)
         or ($2='teacher' and (c.owner_id=$3 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3
         )))
       )`,
      [sessionId, actor.role, actor.id, actor.schoolId],
    );
    if (!access.rowCount) throw new DomainError('not_found', 404);
    if (await this.closeExpiredQuestion(sessionId)) return this.snapshot(actor, sessionId, projector);
    const session = access.rows[0];
    const isStaff = Boolean(session.is_staff);
    if (projector && !isStaff) throw new DomainError('staff_only', 403);
    const detailedStaff = isStaff && !projector;
    const participantId = session.participant_id ? String(session.participant_id) : null;

    const [questionRows, participantRows] = await Promise.all([
      this.pool.query(
        `select id,question_id,position,marks,
           case when position=$2 then question_snapshot end question_snapshot,
           case when position=$2 then mark_scheme_snapshot end mark_scheme_snapshot,
           coalesce(question_snapshot->>'sourceRef',question_snapshot->'leaf'->>'displayRef','') display_ref
         from live_exam_questions where session_id=$1 order by position`,
        [sessionId, Number(session.current_question_index)],
      ),
      detailedStaff
        ? this.pool.query(
          `select lep.id,lep.student_id,u.full_name,lep.joined_at,lep.last_seen_at,
             a.id answer_id,a.submitted_at,a.final_score,a.score_source,a.moderated_at
           from live_exam_participants lep
           join users u on u.id=lep.student_id
           left join live_exam_questions leq on leq.session_id=lep.session_id and leq.position=$2
           left join live_exam_answers a on a.session_question_id=leq.id and a.participant_id=lep.id
           where lep.session_id=$1 and lep.left_at is null
           order by u.full_name`,
          [sessionId, Number(session.current_question_index)],
        )
        : this.pool.query(
          `select count(*)::int participant_count,
             count(*) filter(where a.submitted_at is not null)::int submitted_count
           from live_exam_participants lep
           left join live_exam_questions leq on leq.session_id=lep.session_id and leq.position=$2
           left join live_exam_answers a on a.session_question_id=leq.id and a.participant_id=lep.id
           where lep.session_id=$1 and lep.left_at is null`,
          [sessionId, Number(session.current_question_index)],
        ),
    ]);
    const currentRow = questionRows.rows.find((row) => Number(row.position) === Number(session.current_question_index));
    const reveal = ['marking', 'review', 'finished'].includes(String(session.status));
    const dependencyWork = currentRow ? await this.pool.query(
      `select qd.depends_on_id question_id,qd.kind::text kind,qd.strength::text strength,
         target.display_ref,leq.position,
         case when $4::uuid is null then null else a.answer_text end own_answer,
         a.submitted_at
       from question_dependencies qd
       join questions target on target.id=qd.depends_on_id
       left join live_exam_questions leq
         on leq.session_id=$1
        and leq.question_id=qd.depends_on_id
        and leq.position<$2
       left join live_exam_answers a
         on a.session_question_id=leq.id
        and a.participant_id=$4::uuid
       where qd.question_id=$3 and qd.strength::text='required'
       order by leq.position nulls last,target.sort_order,target.id`,
      [sessionId, Number(session.current_question_index), currentRow.question_id, participantId],
    ) : { rows: [] };
    const question = currentRow ? {
      id: currentRow.id,
      sourceQuestionId: currentRow.question_id,
      position: Number(currentRow.position),
      marks: Number(currentRow.marks),
      portable: await this.hydratePortable(currentRow.question_snapshot as StoredQuestionSnapshot),
      dependencyWork: dependencyWork.rows.map((row) => ({
        questionId: String(row.question_id),
        displayRef: String(row.display_ref),
        kind: String(row.kind),
        strength: String(row.strength),
        position: row.position == null ? null : Number(row.position),
        ownAnswer: row.own_answer == null ? null : String(row.own_answer),
        submittedAt: row.submitted_at ?? null,
      })),
    } : null;

    let ownAnswer: Record<string, unknown> | null = null;
    let review: Record<string, unknown> | null = null;
    let teacherAnswers: Record<string, unknown>[] = [];
    if (currentRow && participantId) {
      const answerResult = await this.pool.query(
        `select id,answer_text,word_count,submitted_at,final_score,final_feedback_md,score_source,moderated_at,updated_at
         from live_exam_answers where session_question_id=$1 and participant_id=$2`,
        [currentRow.id, participantId],
      );
      if (answerResult.rows[0]) ownAnswer = this.mapAnswer(answerResult.rows[0]);
      if (reveal) review = await this.reviewFor(actor, sessionId, String(currentRow.id));
    }
    if (currentRow && detailedStaff && reveal) {
      const answerResult = await this.pool.query(
        `select a.id,a.answer_text,a.word_count,a.submitted_at,a.final_score,a.final_feedback_md,
           a.score_source,a.moderated_at,a.updated_at,u.full_name student_name,lep.student_id,
           r.id review_id,r.status::text review_status,r.kind::text review_kind,
           coalesce((
             select array_agg(rp.mark_scheme_point_id order by rp.mark_scheme_point_id)
             from live_exam_review_points rp
             where rp.review_id=r.id and rp.matched
           ),'{}'::uuid[]) review_matched_point_ids
         from live_exam_answers a
         join live_exam_participants lep on lep.id=a.participant_id
         join users u on u.id=lep.student_id
         left join live_exam_reviews r on r.answer_id=a.id and r.session_question_id=a.session_question_id
         where a.session_question_id=$1
         order by u.full_name`,
        [currentRow.id],
      );
      teacherAnswers = answerResult.rows.map((row) => ({
        ...this.mapAnswer(row),
        studentName: row.student_name,
        studentId: row.student_id,
        reviewId: row.review_id,
        reviewStatus: row.review_status,
        reviewKind: row.review_kind,
        reviewMatchedPointIds: (row.review_matched_point_ids ?? []).map(String),
      }));
    }

    let report: {
      rows: Array<Record<string, unknown>>;
      earned: number;
      possible: number;
    } | null = null;
    if (session.status === 'finished' && !projector) {
      const reportRows = await this.pool.query(
        `select leq.position,leq.marks,
           coalesce(leq.question_snapshot->>'sourceRef',leq.question_snapshot->'leaf'->>'displayRef','') display_ref,
           coalesce(a.answer_text,'') answer_text,a.final_score,a.score_source::text,lep.student_id,u.full_name student_name
         from live_exam_questions leq
         join live_exam_participants lep on lep.session_id=leq.session_id and lep.left_at is null
         join users u on u.id=lep.student_id
         left join live_exam_answers a on a.session_question_id=leq.id and a.participant_id=lep.id
         where leq.session_id=$1 and ($2::boolean or lep.student_id=$3)
         order by leq.position,u.full_name`,
        [sessionId, isStaff, actor.id],
      );
      const rows = reportRows.rows.map((row) => ({
        questionPosition: Number(row.position),
        displayRef: row.display_ref,
        marks: Number(row.marks),
        answerText: row.answer_text,
        score: row.final_score === null ? null : Number(row.final_score),
        scoreSource: row.score_source,
        ...(isStaff ? { studentId: row.student_id, studentName: row.student_name } : {}),
      }));
      report = {
        rows,
        earned: rows.reduce((sum, row) => sum + Number(row.score ?? 0), 0),
        possible: rows.reduce((sum, row) => sum + Number(row.marks), 0),
      };
    }

    const participants = detailedStaff ? participantRows.rows : [];
    const participantCount = detailedStaff
      ? participants.length
      : Number(participantRows.rows[0]?.participant_count ?? 0);
    const submittedCount = detailedStaff
      ? participants.filter((row) => row.submitted_at).length
      : Number(participantRows.rows[0]?.submitted_count ?? 0);
    const reviewCounts = currentRow ? await this.pool.query(
      `select count(*)::int total,count(*) filter(where status in('submitted','moderated'))::int completed
       from live_exam_reviews where session_question_id=$1`, [currentRow.id],
    ) : { rows: [{ total: 0, completed: 0 }] };
    const deadline = session.paused_at
      ? null
      : session.question_started_at && session.question_time_limit_s
      ? new Date(new Date(session.question_started_at).getTime() + Number(session.question_time_limit_s) * 1000)
      : null;

    return {
      session: {
        ...this.mapSession(session),
        className: session.class_name,
        hostName: session.host_name,
        currentQuestionIndex: Number(session.current_question_index),
        startedAt: session.started_at,
        finishedAt: session.finished_at,
        questionStartedAt: session.question_started_at,
        pausedAt: session.paused_at,
        pauseRemainingS: session.pause_remaining_s === null ? null : Number(session.pause_remaining_s),
        deadline,
        serverNow: new Date(),
        participantCount,
        submittedCount,
        reviewCount: Number(reviewCounts.rows[0].total),
        reviewedCount: Number(reviewCounts.rows[0].completed),
        questionCount: questionRows.rowCount ?? 0,
      },
      questions: detailedStaff ? questionRows.rows.map((row) => ({
        id: row.id,
        position: Number(row.position),
        marks: Number(row.marks),
        displayRef: row.display_ref,
      })) : [],
      participants: detailedStaff ? participants.map((row) => ({
        id: row.id,
        studentId: row.student_id,
        fullName: row.full_name,
        joinedAt: row.joined_at,
        lastSeenAt: row.last_seen_at,
        online: Date.now() - new Date(row.last_seen_at).getTime() < 30_000,
        submitted: Boolean(row.submitted_at),
        score: row.final_score === null ? null : Number(row.final_score),
        scoreSource: row.score_source,
      })) : [],
      question,
      markScheme: reveal && currentRow ? currentRow.mark_scheme_snapshot : null,
      ownAnswer,
      review,
      teacherAnswers,
      report,
    };
  }

  private async reviewFor(actor: Actor, sessionId: string, sessionQuestionId: string) {
    const result = await this.pool.query(
      `select r.id,r.answer_id,r.kind::text,r.status::text,r.awarded_marks,r.feedback_md,r.submitted_at,
         a.answer_text,
         coalesce((
           select jsonb_agg(point.value || jsonb_build_object('matched',coalesce(lrp.matched,false))
             order by point.ordinality)
           from jsonb_array_elements(coalesce(leq.mark_scheme_snapshot->'points','[]'::jsonb))
             with ordinality point(value,ordinality)
           left join live_exam_review_points lrp
             on lrp.review_id=r.id and lrp.mark_scheme_point_id=(point.value->>'id')::uuid
         ),'[]'::jsonb) points
       from live_exam_reviews r
       join live_exam_answers a on a.id=r.answer_id
       join live_exam_questions leq on leq.id=r.session_question_id
       where r.session_question_id=$1 and (
         ($2='student' and r.reviewer_id=$3)
         or ($2<>'student' and exists(
           select 1 from live_exam_sessions les join classes c on c.id=les.class_id
           where les.id=$4 and (($2='owner' and c.school_id=$5) or ($2='teacher' and(
             c.owner_id=$3 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3)
           )))
         ))
       )
       order by r.created_at
       limit 1`,
      [sessionQuestionId, actor.role, actor.id, sessionId, actor.schoolId],
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      answerId: row.answer_id,
      kind: row.kind,
      status: row.status,
      answerText: row.answer_text,
      awardedMarks: row.awarded_marks === null ? null : Number(row.awarded_marks),
      feedback: row.feedback_md,
      submittedAt: row.submitted_at,
      points: row.points,
    };
  }

  async start(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (session.status !== 'lobby') throw new DomainError('live_invalid_state', 409);
      const count = await client.query(
        `select count(*)::int count from live_exam_participants where session_id=$1 and left_at is null`,
        [sessionId],
      );
      if (Number(count.rows[0].count) < 1) throw new DomainError('live_no_participants', 409);
      const question = await client.query(
        `select id from live_exam_questions where session_id=$1 and position=0`, [sessionId]);
      if (!question.rowCount) throw new DomainError('live_no_questions', 409);
      await client.query(
        `insert into live_exam_answers(session_question_id,participant_id)
         select $2,lep.id from live_exam_participants lep
         where lep.session_id=$1 and lep.left_at is null on conflict do nothing`,
        [sessionId, question.rows[0].id],
      );
      await client.query(
        `update live_exam_sessions set status='question_open',current_question_index=0,
           started_at=coalesce(started_at,now()),question_started_at=now(),answers_locked_at=null,
           mark_scheme_revealed_at=null
         where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'question.opened', { position: 0 });
      await client.query('commit');
      return { sessionId, status: 'question_open' as const, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async saveAnswer(actor: Actor, sessionId: string, text: string) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      // SHARE permits classmates to autosave together, but makes reveal wait
      // until every in-flight save has committed. No answer can cross the
      // question_open -> marking boundary.
      const state = await client.query(
        `select status::text,paused_at from live_exam_sessions where id=$1 for share`, [sessionId]);
      if (state.rows[0]?.status !== 'question_open' || state.rows[0]?.paused_at) throw new DomainError('live_answer_locked', 409);
      const result = await client.query(
        `update live_exam_answers a set answer_text=$3,word_count=$4,updated_at=now()
         from live_exam_participants lep,live_exam_questions leq,live_exam_sessions les
         where les.id=$1 and les.status='question_open' and les.paused_at is null
           and leq.session_id=les.id and leq.position=les.current_question_index
           and lep.session_id=les.id and lep.student_id=$2 and lep.left_at is null
           and a.session_question_id=leq.id and a.participant_id=lep.id and a.submitted_at is null
             and (les.question_time_limit_s is null or now() <= les.question_started_at
             + les.question_time_limit_s * interval '1 second' + $5::int * interval '1 second')
         returning a.id,a.updated_at`,
           [sessionId, actor.id, text, words(text), QUESTION_DEADLINE_GRACE_S],
      );
      if (!result.rowCount) throw new DomainError('live_answer_locked', 409);
      await client.query('commit');
      return { savedAt: result.rows[0].updated_at };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async submitAnswer(actor: Actor, sessionId: string, text?: string) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const state = await client.query(
        `select * from live_exam_sessions where id=$1 for update`, [sessionId]);
      if (state.rows[0]?.status !== 'question_open' || state.rows[0]?.paused_at) throw new DomainError('live_answer_locked', 409);
      const result = await client.query(
        `update live_exam_answers a set
           answer_text=coalesce($3,a.answer_text),
           word_count=case when $3::text is null then a.word_count else $4 end,
           submitted_at=now(),updated_at=now()
         from live_exam_participants lep,live_exam_questions leq,live_exam_sessions les
         where les.id=$1 and les.status='question_open' and les.paused_at is null
           and leq.session_id=les.id and leq.position=les.current_question_index
           and lep.session_id=les.id and lep.student_id=$2 and lep.left_at is null
           and a.session_question_id=leq.id and a.participant_id=lep.id and a.submitted_at is null
           and (les.question_time_limit_s is null or now() <= les.question_started_at
             + les.question_time_limit_s * interval '1 second' + $5::int * interval '1 second')
         returning a.id,leq.id session_question_id`,
        [sessionId, actor.id, text ?? null, text === undefined ? 0 : words(text), QUESTION_DEADLINE_GRACE_S],
      );
      if (!result.rowCount) throw new DomainError('live_answer_locked', 409);
      let version = await this.bump(client, sessionId, actor.id, 'answer.submitted', { answerId: result.rows[0].id });
      let autoRevealed = false;
      const settings = this.settings(state.rows[0].settings);
      if (settings.autoCloseWhenAllSubmitted) {
        const pending = await client.query(
          `select count(*)::int count
           from live_exam_participants lep
           join live_exam_questions leq on leq.session_id=lep.session_id
             and leq.position=$2
           left join live_exam_answers a on a.session_question_id=leq.id and a.participant_id=lep.id
           where lep.session_id=$1 and lep.left_at is null and a.submitted_at is null`,
          [sessionId, state.rows[0].current_question_index],
        );
        if (Number(pending.rows[0].count) === 0) {
          const revealed = await this.revealWithinTransaction(client, state.rows[0], actor.id);
          version = revealed.version;
          autoRevealed = true;
        }
      }
      await client.query('commit');
      return { submittedAt: new Date(), version, autoRevealed };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  private async revealWithinTransaction(client: PoolClient, session: Record<string, unknown>, actorId: string | null) {
    const sessionId = String(session.id);
    const question = await client.query(
      `select id,mark_scheme_snapshot from live_exam_questions
       where session_id=$1 and position=$2`,
      [sessionId, session.current_question_index],
    );
    if (!question.rowCount) throw new DomainError('live_no_questions', 409);
    const sessionQuestionId = String(question.rows[0].id);
    await client.query(
      `insert into live_exam_answers(session_question_id,participant_id,submitted_at)
       select $2,lep.id,now() from live_exam_participants lep
       where lep.session_id=$1 and lep.left_at is null
       on conflict(session_question_id,participant_id) do update set
         submitted_at=coalesce(live_exam_answers.submitted_at,now()),updated_at=now()`,
      [sessionId, sessionQuestionId],
    );
    const answers = await client.query(
      `select a.id answer_id,lep.student_id
       from live_exam_answers a
       join live_exam_participants lep on lep.id=a.participant_id
       where a.session_question_id=$1 and lep.left_at is null order by lep.student_id`,
      [sessionQuestionId],
    );
    const mode = String(session.marking_mode) as LiveExamMarkingMode;
    const assignments = mode === 'teacher'
      ? answers.rows.map((row) => ({ answerId: String(row.answer_id), reviewerId: String(session.host_id), kind: 'teacher' as const }))
      : mode === 'self'
        ? answers.rows.map((row) => ({ answerId: String(row.answer_id), reviewerId: String(row.student_id), kind: 'self' as const }))
        : assignPeerReviewers(answers.rows.map((row) => ({
            answerId: String(row.answer_id), studentId: String(row.student_id),
          })), `${sessionId}:${sessionQuestionId}`);
    const scheme = question.rows[0].mark_scheme_snapshot as MarkSchemeSnapshot;
    for (const assignment of assignments) {
      const review = await client.query(
        `insert into live_exam_reviews(session_question_id,answer_id,reviewer_id,kind)
         values($1,$2,$3,$4)
         on conflict(session_question_id,answer_id,kind) do update set reviewer_id=excluded.reviewer_id
         returning id`,
        [sessionQuestionId, assignment.answerId, assignment.reviewerId, assignment.kind],
      );
      for (const point of scheme.points) {
        await client.query(
          `insert into live_exam_review_points(review_id,mark_scheme_point_id)
           values($1,$2) on conflict do nothing`,
          [review.rows[0].id, point.id],
        );
      }
    }
    await client.query(
      `update live_exam_sessions set status='marking',answers_locked_at=now(),mark_scheme_revealed_at=now()
       where id=$1`, [sessionId],
    );
    session.status = 'marking';
    const version = await this.bump(client, sessionId, actorId, 'mark_scheme.revealed', {
      markingMode: mode,
      reviewCount: assignments.length,
    });
    return { sessionId, status: 'marking' as const, version };
  }

  async revealMarkScheme(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (session.status !== 'question_open' || session.paused_at) throw new DomainError('live_invalid_state', 409);
      const result = await this.revealWithinTransaction(client, session, actor.id);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async submitReview(
    actor: Actor,
    sessionId: string,
    reviewId: string,
    input: { matchedPointIds: string[]; score?: number; levelNumber?: number; feedback?: string },
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const state = await client.query(
        `select status::text,paused_at from live_exam_sessions where id=$1 for update`, [sessionId]);
      if (state.rows[0]?.status !== 'marking' || state.rows[0]?.paused_at) throw new DomainError('live_invalid_state', 409);
      const target = await client.query(
        `select r.id,r.answer_id,r.reviewer_id,r.kind::text,r.status::text,leq.marks,leq.mark_scheme_snapshot,
           (select count(*) from live_exam_review_points where review_id=r.id)::int point_count
         from live_exam_reviews r
         join live_exam_questions leq on leq.id=r.session_question_id
         join live_exam_sessions les on les.id=leq.session_id
         join classes c on c.id=les.class_id
         where r.id=$1 and les.id=$2 and les.status='marking' and (
           ($3='student' and r.reviewer_id=$4)
           or ($3='owner' and c.school_id=$5)
           or ($3='teacher' and (c.owner_id=$4 or exists(
             select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
           )))
         )
         for update of r`,
        [reviewId, sessionId, actor.role, actor.id, actor.schoolId],
      );
      if (!target.rowCount) throw new DomainError('not_found', 404);
      const row = target.rows[0];
      if (actor.role !== 'student' && row.kind !== 'teacher') {
        throw new DomainError('live_review_not_assigned_to_staff', 403);
      }
      if (row.status !== 'assigned') throw new DomainError('live_review_submitted', 409);
      if (input.matchedPointIds.length) {
        const allowed = await client.query(
          `select mark_scheme_point_id from live_exam_review_points
           where review_id=$1 and mark_scheme_point_id=any($2::uuid[])`,
          [reviewId, input.matchedPointIds],
        );
        if (allowed.rowCount !== new Set(input.matchedPointIds).size) throw new DomainError('live_invalid_mark_points', 400);
      }
      const pointCount = Number(row.point_count);
      const snapshot = row.mark_scheme_snapshot as MarkSchemeSnapshot;
      const selectedLevel = input.levelNumber === undefined
        ? undefined
        : snapshot.levels.find((level) => level.levelNumber === input.levelNumber);
      if (snapshot.schemeType === 'levels_of_response' && !selectedLevel) {
        throw new DomainError('invalid_level', 400);
      }
      const selectedIds = new Set(input.matchedPointIds);
      const computed = computeScore({
        type: snapshot.schemeType as Scheme['type'],
        maxMarks: snapshot.maxMarks,
        points: snapshot.points.map((point) => ({
          code: point.code,
          marks: point.marks,
          groupId: point.groupId,
          requires: Array.isArray(point.requires) ? point.requires.map(String) : [],
        })),
        groups: snapshot.groups.map((group) => ({
          id: group.id,
          nRequired: group.nRequired,
          marksPerPoint: group.marksPerPoint,
          maxMarks: group.maxMarks,
          awardMode: group.awardMode,
        })),
        levels: [],
      }, snapshot.points.map((point) => ({
        code: point.code,
        matched: selectedIds.has(point.id),
        confidence: 1,
      })));
      await client.query(
        `update live_exam_review_points set matched=false,awarded_marks=0 where review_id=$1`, [reviewId]);
      for (const point of snapshot.points) {
        const matched = computed.effectiveMatched[point.code] === true;
        await client.query(
          `update live_exam_review_points set matched=$3,awarded_marks=$4
           where review_id=$1 and mark_scheme_point_id=$2`,
          [reviewId, point.id, matched, matched ? point.marks : 0],
        );
      }
      const score = pointCount > 0 && computed.score !== null ? computed.score : input.score;
      if (score === undefined || score < 0 || score > Number(row.marks)) throw new DomainError('invalid_score', 400);
      if (selectedLevel && (score < selectedLevel.minMarks || score > selectedLevel.maxMarks)) {
        throw new DomainError('score_outside_level', 400);
      }
      await client.query(
        `update live_exam_reviews set status='submitted',awarded_marks=$2,feedback_md=$3,
           reviewer_id=$4,submitted_at=now() where id=$1`,
        [reviewId, score, input.feedback ?? null, actor.id],
      );
      await client.query(
        `update live_exam_answers set final_score=$2,final_feedback_md=$3,score_source=$4
         where id=$1`,
        [row.answer_id, score, input.feedback ?? null, row.kind],
      );
      const version = await this.bump(client, sessionId, actor.id, 'review.submitted', {
        reviewId,
        kind: row.kind,
      });
      await client.query('commit');
      return { reviewId, score, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async moderateAnswer(
    actor: Actor,
    sessionId: string,
    answerId: string,
    input: { score: number; feedback?: string; levelNumber?: number },
    expectedVersion?: number,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (!['marking', 'review'].includes(String(session.status)) || session.paused_at) throw new DomainError('live_invalid_state', 409);
      const settings = this.settings(session.settings);
      if (session.marking_mode !== 'teacher' && !settings.teacherOverrideEnabled) {
        throw new DomainError('live_teacher_override_disabled', 409);
      }
      const result = await client.query(
        `update live_exam_answers a set final_score=$3,final_feedback_md=$4,score_source='teacher',
           moderated_by=$5,moderated_at=now()
         from live_exam_questions leq
         where a.id=$1 and leq.id=a.session_question_id and leq.session_id=$2
           and $3 between 0 and leq.marks
         returning a.id,leq.mark_scheme_snapshot`,
        [answerId, sessionId, input.score, input.feedback ?? null, actor.id],
      );
      if (!result.rowCount) throw new DomainError('invalid_score', 400);
      const scheme = result.rows[0].mark_scheme_snapshot as MarkSchemeSnapshot;
      if (scheme.schemeType === 'levels_of_response') {
        const selectedLevel = input.levelNumber === undefined
          ? undefined
          : scheme.levels.find((level) => level.levelNumber === input.levelNumber);
        if (!selectedLevel) throw new DomainError('invalid_level', 400);
        if (input.score < selectedLevel.minMarks || input.score > selectedLevel.maxMarks) {
          throw new DomainError('score_outside_level', 400);
        }
      }
      await client.query(
        `update live_exam_reviews set status='moderated',moderated_by=$2,moderated_at=now()
         where answer_id=$1`, [answerId, actor.id]);
      const version = await this.bump(client, sessionId, actor.id, 'answer.moderated', { answerId });
      await client.query('commit');
      return { answerId, score: input.score, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async completeMarking(actor: Actor, sessionId: string, force = false, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (session.status !== 'marking' || session.paused_at) throw new DomainError('live_invalid_state', 409);
      const pending = await client.query(
        `select count(*)::int count
         from live_exam_reviews r join live_exam_questions leq on leq.id=r.session_question_id
         where leq.session_id=$1 and leq.position=$2 and r.status='assigned'`,
        [sessionId, session.current_question_index],
      );
      if (Number(pending.rows[0].count) > 0 && !force) throw new DomainError('live_reviews_pending', 409);
      if (Number(pending.rows[0].count) > 0) {
        await client.query(
          `with forced_reviews as (
             update live_exam_reviews r set status='submitted',awarded_marks=0,
               feedback_md=coalesce(feedback_md,'O‘qituvchi tomonidan baholash yopildi.'),submitted_at=now()
             from live_exam_questions leq
             where leq.id=r.session_question_id and leq.session_id=$1 and leq.position=$2
               and r.status='assigned'
             returning r.answer_id,r.kind
           )
           update live_exam_answers a set final_score=0,
             final_feedback_md=coalesce(a.final_feedback_md,'O‘qituvchi tomonidan baholash yopildi.'),
             score_source=forced_reviews.kind
           from forced_reviews where a.id=forced_reviews.answer_id`,
          [sessionId, session.current_question_index],
        );
      }
      await client.query(`update live_exam_sessions set status='review' where id=$1`, [sessionId]);
      const version = await this.bump(client, sessionId, actor.id, 'marking.completed', {
        forced: force,
        pending: Number(pending.rows[0].count),
      });
      await client.query('commit');
      return { sessionId, status: 'review' as const, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async nextQuestion(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (session.status !== 'review' || session.paused_at) throw new DomainError('live_invalid_state', 409);
      const nextPosition = Number(session.current_question_index) + 1;
      const next = await client.query(
        `select id from live_exam_questions where session_id=$1 and position=$2`,
        [sessionId, nextPosition],
      );
      if (!next.rowCount) {
        await client.query(
          `update live_exam_sessions set status='finished',finished_at=now() where id=$1`, [sessionId]);
        const version = await this.bump(client, sessionId, actor.id, 'session.finished');
        await client.query('commit');
        return { sessionId, status: 'finished' as const, version };
      }
      await client.query(
        `insert into live_exam_answers(session_question_id,participant_id)
         select $2,lep.id from live_exam_participants lep
         where lep.session_id=$1 and lep.left_at is null on conflict do nothing`,
        [sessionId, next.rows[0].id],
      );
      await client.query(
        `update live_exam_sessions set status='question_open',current_question_index=$2,
           question_started_at=now(),answers_locked_at=null,mark_scheme_revealed_at=null
         where id=$1`,
        [sessionId, nextPosition],
      );
      const version = await this.bump(client, sessionId, actor.id, 'question.opened', { position: nextPosition });
      await client.query('commit');
      return { sessionId, status: 'question_open' as const, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async pause(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (!['question_open', 'marking', 'review'].includes(String(session.status)) || session.paused_at) {
        throw new DomainError('live_invalid_state', 409);
      }
      const paused = await client.query(
        `update live_exam_sessions set paused_at=now(),pause_remaining_s=case
           when status='question_open' and question_started_at is not null and question_time_limit_s is not null
             then greatest(0,ceil(extract(epoch from (
               question_started_at+question_time_limit_s*interval '1 second'-now()
             )))::int)
           else null
         end
         where id=$1 and (
           status<>'question_open' or question_started_at is null or question_time_limit_s is null
           or now()<question_started_at+question_time_limit_s*interval '1 second'
         )
         returning pause_remaining_s`,
        [sessionId],
      );
      if (!paused.rowCount) throw new DomainError('live_answer_locked', 409);
      const remaining = paused.rows[0].pause_remaining_s === null ? null : Number(paused.rows[0].pause_remaining_s);
      const version = await this.bump(client, sessionId, actor.id, 'session.paused', { remainingSeconds: remaining });
      await client.query('commit');
      return { sessionId, status: session.status as LiveExamStatus, paused: true, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async resume(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (!session.paused_at || !['question_open', 'marking', 'review'].includes(String(session.status))) {
        throw new DomainError('live_invalid_state', 409);
      }
      if (session.status === 'question_open' && session.question_time_limit_s !== null
        && session.pause_remaining_s !== null && Number(session.pause_remaining_s) <= 0) {
        await client.query(
          `update live_exam_sessions set paused_at=null,pause_remaining_s=null where id=$1`,
          [sessionId],
        );
        session.paused_at = null;
        session.pause_remaining_s = null;
        const result = await this.revealWithinTransaction(client, session, actor.id);
        await client.query('commit');
        return result;
      }
      await client.query(
        `update live_exam_sessions set
           question_started_at=case
             when status='question_open' and question_time_limit_s is not null and pause_remaining_s is not null
               then now()-(question_time_limit_s-pause_remaining_s)*interval '1 second'
             else question_started_at
           end,
           paused_at=null,pause_remaining_s=null
         where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'session.resumed');
      await client.query('commit');
      return { sessionId, status: session.status as LiveExamStatus, paused: false, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async removeParticipant(actor: Actor, sessionId: string, studentId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (session.status !== 'lobby') throw new DomainError('live_invalid_state', 409);
      const removed = await client.query(
        `update live_exam_participants set left_at=now(),last_seen_at=now()
         where session_id=$1 and student_id=$2 and left_at is null returning id`,
        [sessionId, studentId],
      );
      if (!removed.rowCount) throw new DomainError('not_found', 404);
      const version = await this.bump(client, sessionId, actor.id, 'participant.removed', { studentId });
      await client.query('commit');
      return { sessionId, studentId, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async leave(actor: Actor, sessionId: string) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await client.query(
        `select status::text from live_exam_sessions where id=$1 for update`,
        [sessionId],
      );
      if (!session.rowCount) throw new DomainError('not_found', 404);
      if (session.rows[0].status !== 'lobby') throw new DomainError('live_invalid_state', 409);
      const result = await client.query(
        `update live_exam_participants set left_at=now(),last_seen_at=now()
         where session_id=$1 and student_id=$2 and left_at is null returning id`,
        [sessionId, actor.id],
      );
      if (!result.rowCount) throw new DomainError('not_found', 404);
      const version = await this.bump(client, sessionId, actor.id, 'participant.left');
      await client.query('commit');
      return { sessionId, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async cancel(actor: Actor, sessionId: string, expectedVersion?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      this.assertExpectedVersion(session, expectedVersion);
      if (['finished', 'cancelled'].includes(String(session.status))) throw new DomainError('live_invalid_state', 409);
      await client.query(
        `update live_exam_sessions set status='cancelled',finished_at=now() where id=$1`, [sessionId]);
      const version = await this.bump(client, sessionId, actor.id, 'session.cancelled');
      await client.query('commit');
      return { sessionId, status: 'cancelled' as const, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  private settings(value: unknown) {
    const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
      allowLateJoin: raw.allowLateJoin === true,
      autoCloseWhenAllSubmitted: raw.autoCloseWhenAllSubmitted === true,
      teacherOverrideEnabled: raw.teacherOverrideEnabled !== false,
      leaderboardMode: raw.leaderboardMode === 'marks_speed_tiebreak'
        ? 'marks_speed_tiebreak' as const
        : 'marks' as const,
    };
  }

  private mapSession(row: Record<string, unknown>) {
    const settings = this.settings(row.settings);
    return {
      id: row.id,
      classId: row.class_id,
      title: row.title,
      joinCode: row.join_code,
      status: row.status as LiveExamStatus,
      markingMode: row.marking_mode as LiveExamMarkingMode,
      questionTimeLimitS: row.question_time_limit_s === null ? null : Number(row.question_time_limit_s),
      pausedAt: row.paused_at ?? null,
      pauseRemainingS: row.pause_remaining_s === null || row.pause_remaining_s === undefined
        ? null
        : Number(row.pause_remaining_s),
      settings,
      version: Number(row.version),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAnswer(row: Record<string, unknown>) {
    return {
      id: row.id,
      text: row.answer_text,
      wordCount: Number(row.word_count),
      submittedAt: row.submitted_at,
      score: row.final_score === null ? null : Number(row.final_score),
      feedback: row.final_feedback_md,
      scoreSource: row.score_source,
      moderatedAt: row.moderated_at,
      updatedAt: row.updated_at,
    };
  }
}
