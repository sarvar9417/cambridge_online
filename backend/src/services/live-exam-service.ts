import { createHash, randomInt, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { AssetUrlSigner } from '../jobs/asset-store.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import type { PortableQuestion } from './selection-review.js';
import { DomainError } from './assignments-service.js';
import { parseLiveExamSettings } from './live-exam-settings.js';
import { computeScore, type Scheme } from '../lib/marking.js';

export type LiveExamMarkingMode = 'teacher' | 'peer' | 'self';
export type LiveExamStatus = 'draft' | 'published' | 'lobby' | 'question_open' | 'answers_locked' | 'marking' | 'review' | 'paused' | 'finished' | 'cancelled';

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

type StoredQuestionSnapshot = PortableQuestion;

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

  private async bump(
    client: PoolClient,
    sessionId: string,
    actorId: string,
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

  private async chooseQuestionIds(actor: Actor, input: CreateLiveExamInput) {
    // Keep the random ordering seed as the first parameter. The class ID is
    // only needed when "exclude seen" is enabled; binding it unconditionally
    // leaves an unreferenced $1 parameter when that option is off, which
    // PostgreSQL correctly rejects because its type cannot be inferred.
    const values: unknown[] = [randomUUID()];
    const filters = [
      `q.status='approved'`,
      `q.marks>0`,
      `q.parent_id is not null`,
      `ms.status='approved'`,
      // A live room presents one independently answerable unit at a time. A
      // dependency bundle will be added separately; never strip a reference
      // from a question and pretend its meaning survived.
      `not exists(select 1 from question_dependencies qd where qd.question_id=q.id)`,
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
    if (input.excludeSeen) {
      values.push(input.classId);
      const classParameter = `$${values.length}`;
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
    if ((result.rowCount ?? 0) < input.questionCount) throw new DomainError('live_question_pool_small', 409);
    return result.rows.map((row) => String(row.id));
  }

  async create(actor: Actor, input: CreateLiveExamInput) {
    await this.requireClassControl(this.pool, actor, input.classId);
    if (!input.topicIds.length && !input.subtopicIds.length) throw new DomainError('live_topic_required', 400);

    const questionIds = await this.chooseQuestionIds(actor, input);
    const snapshots = await Promise.all(questionIds.map(async (questionId) => {
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
      await client.query('begin');
      await this.requireClassControl(client, actor, input.classId);
      const joinCode = String(randomInt(100000, 1000000));
      const session = await client.query(
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
          })],
      );
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
        [session.rows[0].id, actor.id, JSON.stringify({ questionCount: snapshots.length })],
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
         c.name class_name,
         (select count(*) from live_exam_questions leq where leq.session_id=les.id)::int question_count,
         (select count(*) from live_exam_participants lep where lep.session_id=les.id and lep.left_at is null)::int participant_count
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where (
         ($1='student' and exists(
           select 1 from live_exam_participants lep where lep.session_id=les.id and lep.student_id=$2
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
    const result = await this.pool.query(
      `insert into live_exam_participants(session_id,student_id,left_at,last_seen_at)
       select les.id,$2,null,now()
       from live_exam_sessions les
       join enrollments e on e.class_id=les.class_id and e.student_id=$2 and e.left_at is null
       where les.join_code=$1 and les.status='lobby'
       on conflict(session_id,student_id) do update set left_at=null,last_seen_at=now()
       returning id,session_id,joined_at`,
      [code, actor.id],
    );
    if (!result.rowCount) throw new DomainError('live_code_not_found', 404);
    const participant = result.rows[0];
    await this.pool.query(
      `with changed as (
         update live_exam_sessions set version=version+1,updated_at=now()
         where id=$1 returning version
       )
       insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
       select $1,$2,'participant.joined',version,$3::jsonb from changed`,
      [participant.session_id, actor.id, JSON.stringify({ participantId: participant.id })],
    );
    return { sessionId: participant.session_id, participantId: participant.id };
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
    return { serverNow: new Date() };
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

  async snapshot(actor: Actor, sessionId: string) {
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
    const session = access.rows[0];
    const isStaff = Boolean(session.is_staff);
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
      isStaff
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
    const question = currentRow ? {
      id: currentRow.id,
      sourceQuestionId: currentRow.question_id,
      position: Number(currentRow.position),
      marks: Number(currentRow.marks),
      portable: await this.hydratePortable(currentRow.question_snapshot as StoredQuestionSnapshot),
    } : null;

    let ownAnswer: Record<string, unknown> | null = null;
    let review: Record<string, unknown> | null = null;
    let teacherAnswers: Record<string, unknown>[] = [];
    if (currentRow && participantId) {
      const answerResult = await this.pool.query(
        `select id,answer_text,word_count,submitted_at,final_score,final_feedback_md,score_source,moderated_at
         from live_exam_answers where session_question_id=$1 and participant_id=$2`,
        [currentRow.id, participantId],
      );
      if (answerResult.rows[0]) ownAnswer = this.mapAnswer(answerResult.rows[0]);
      if (reveal) review = await this.reviewFor(actor, sessionId, String(currentRow.id));
    }
    if (currentRow && isStaff && reveal) {
      const answerResult = await this.pool.query(
        `select a.id,a.answer_text,a.word_count,a.submitted_at,a.final_score,a.final_feedback_md,
           a.score_source,a.moderated_at,u.full_name student_name,lep.student_id,
           r.id review_id,r.status::text review_status,r.kind::text review_kind
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
      }));
    }

    let report: {
      rows: Array<Record<string, unknown>>;
      earned: number;
      possible: number;
    } | null = null;
    if (session.status === 'finished') {
      const reportRows = await this.pool.query(
        `select leq.position,leq.marks,
           coalesce(leq.question_snapshot->>'sourceRef',leq.question_snapshot->'leaf'->>'displayRef','') display_ref,
           a.answer_text,a.final_score,a.score_source::text,lep.student_id,u.full_name student_name
         from live_exam_questions leq
         join live_exam_answers a on a.session_question_id=leq.id
         join live_exam_participants lep on lep.id=a.participant_id
         join users u on u.id=lep.student_id
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

    const participants = isStaff ? participantRows.rows : [];
    const participantCount = isStaff
      ? participants.length
      : Number(participantRows.rows[0]?.participant_count ?? 0);
    const submittedCount = isStaff
      ? participants.filter((row) => row.submitted_at).length
      : Number(participantRows.rows[0]?.submitted_count ?? 0);
    const reviewCounts = currentRow ? await this.pool.query(
      `select count(*)::int total,count(*) filter(where status in('submitted','moderated'))::int completed
       from live_exam_reviews where session_question_id=$1`, [currentRow.id],
    ) : { rows: [{ total: 0, completed: 0 }] };
    const deadline = session.question_started_at && session.question_time_limit_s
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
        deadline,
        serverNow: new Date(),
        participantCount,
        submittedCount,
        reviewCount: Number(reviewCounts.rows[0].total),
        reviewedCount: Number(reviewCounts.rows[0].completed),
        questionCount: questionRows.rowCount ?? 0,
      },
      questions: isStaff ? questionRows.rows.map((row) => ({
        id: row.id,
        position: Number(row.position),
        marks: Number(row.marks),
        displayRef: row.display_ref,
      })) : [],
      participants: isStaff ? participants.map((row) => ({
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

  async start(actor: Actor, sessionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
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
        `select status::text from live_exam_sessions where id=$1 for share`, [sessionId]);
      if (state.rows[0]?.status !== 'question_open') throw new DomainError('live_answer_locked', 409);
      const result = await client.query(
        `update live_exam_answers a set answer_text=$3,word_count=$4,updated_at=now()
         from live_exam_participants lep,live_exam_questions leq,live_exam_sessions les
         where les.id=$1 and les.status='question_open'
           and leq.session_id=les.id and leq.position=les.current_question_index
           and lep.session_id=les.id and lep.student_id=$2 and lep.left_at is null
           and a.session_question_id=leq.id and a.participant_id=lep.id and a.submitted_at is null
           and (les.question_time_limit_s is null or now() <= les.question_started_at
             + les.question_time_limit_s * interval '1 second' + interval '10 seconds')
         returning a.id,a.updated_at`,
        [sessionId, actor.id, text, words(text)],
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
        `select status::text,current_question_index,settings from live_exam_sessions where id=$1 for update`, [sessionId]);
      if (state.rows[0]?.status !== 'question_open') throw new DomainError('live_answer_locked', 409);
      const result = await client.query(
        `update live_exam_answers a set
           answer_text=coalesce($3,a.answer_text),
           word_count=case when $3::text is null then a.word_count else $4 end,
           submitted_at=now(),updated_at=now()
         from live_exam_participants lep,live_exam_questions leq,live_exam_sessions les
         where les.id=$1 and les.status='question_open'
           and leq.session_id=les.id and leq.position=les.current_question_index
           and lep.session_id=les.id and lep.student_id=$2 and lep.left_at is null
           and a.session_question_id=leq.id and a.participant_id=lep.id and a.submitted_at is null
           and (les.question_time_limit_s is null or now() <= les.question_started_at
             + les.question_time_limit_s * interval '1 second' + interval '10 seconds')
         returning a.id,leq.id session_question_id`,
        [sessionId, actor.id, text ?? null, text === undefined ? 0 : words(text)],
      );
      if (!result.rowCount) throw new DomainError('live_answer_locked', 409);
      let version = await this.bump(client, sessionId, actor.id, 'answer.submitted', { answerId: result.rows[0].id });
      let answersLocked=false;
      const settings=parseLiveExamSettings(state.rows[0]?.settings);
      if(settings.autoCloseWhenAllSubmitted){
        const counts=await client.query(
          `select
             count(*) filter(where lep.left_at is null)::int participant_count,
             count(*) filter(where lep.left_at is null and a.submitted_at is not null)::int submitted_count
           from live_exam_participants lep
           left join live_exam_answers a
             on a.participant_id=lep.id and a.session_question_id=$2
           where lep.session_id=$1`,
          [sessionId,result.rows[0].session_question_id],
        );
        const participantCount=Number(counts.rows[0]?.participant_count??0);
        const submittedCount=Number(counts.rows[0]?.submitted_count??0);
        if(participantCount>0&&submittedCount>=participantCount){
          await client.query(
            `update live_exam_sessions set status='answers_locked',answers_locked_at=coalesce(answers_locked_at,now()) where id=$1 and status='question_open'`,
            [sessionId],
          );
          version=await this.bump(client,sessionId,actor.id,'answers.auto_locked',{
            position:Number(state.rows[0]?.current_question_index??0),participantCount,submittedCount,
          });
          answersLocked=true;
        }
      }
      await client.query('commit');
      return { submittedAt: new Date(), version, answersLocked };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async revealMarkScheme(actor: Actor, sessionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      if (session.status !== 'question_open') throw new DomainError('live_invalid_state', 409);
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
         where a.session_question_id=$1 order by lep.student_id`,
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
      const version = await this.bump(client, sessionId, actor.id, 'mark_scheme.revealed', {
        markingMode: mode,
        reviewCount: assignments.length,
      });
      await client.query('commit');
      return { sessionId, status: 'marking' as const, version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  }

  async submitReview(
    actor: Actor,
    sessionId: string,
    reviewId: string,
    input: { matchedPointIds: string[]; score?: number; feedback?: string },
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const state = await client.query(
        `select status::text from live_exam_sessions where id=$1 for update`, [sessionId]);
      if (state.rows[0]?.status !== 'marking') throw new DomainError('live_invalid_state', 409);
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
      const selectedIds = new Set(input.matchedPointIds);
      await client.query(
        `update live_exam_review_points set matched=false,awarded_marks=0 where review_id=$1`, [reviewId]);
      for (const point of snapshot.points.filter((item) => selectedIds.has(item.id))) {
        await client.query(
          `update live_exam_review_points set matched=true,awarded_marks=$3
           where review_id=$1 and mark_scheme_point_id=$2`,
          [reviewId, point.id, point.marks],
        );
      }
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
      const score = pointCount > 0 && computed.score !== null ? computed.score : input.score;
      if (score === undefined || score < 0 || score > Number(row.marks)) throw new DomainError('invalid_score', 400);
      await client.query(
        `update live_exam_reviews set status='submitted',awarded_marks=$2,feedback_md=$3,
           submitted_at=now() where id=$1`,
        [reviewId, score, input.feedback ?? null],
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
    input: { score: number; feedback?: string },
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      if (!['marking', 'review'].includes(String(session.status))) throw new DomainError('live_invalid_state', 409);
      const result = await client.query(
        `update live_exam_answers a set final_score=$3,final_feedback_md=$4,score_source='teacher',
           moderated_by=$5,moderated_at=now()
         from live_exam_questions leq
         where a.id=$1 and leq.id=a.session_question_id and leq.session_id=$2
           and $3 between 0 and leq.marks
         returning a.id`,
        [answerId, sessionId, input.score, input.feedback ?? null, actor.id],
      );
      if (!result.rowCount) throw new DomainError('invalid_score', 400);
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

  async completeMarking(actor: Actor, sessionId: string, force = false) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      if (session.status !== 'marking') throw new DomainError('live_invalid_state', 409);
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

  async nextQuestion(actor: Actor, sessionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
      if (session.status !== 'review') throw new DomainError('live_invalid_state', 409);
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

  async cancel(actor: Actor, sessionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const session = await this.lockControlledSession(client, actor, sessionId);
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

  private mapSession(row: Record<string, unknown>) {
    return {
      id: row.id,
      classId: row.class_id,
      title: row.title,
      joinCode: row.join_code,
      status: row.status as LiveExamStatus,
      markingMode: row.marking_mode as LiveExamMarkingMode,
      questionTimeLimitS: row.question_time_limit_s === null ? null : Number(row.question_time_limit_s),
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
    };
  }
}
