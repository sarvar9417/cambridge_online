import type { Pool, PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
import { assignPeerReviewers, type LiveExamMarkingMode } from './live-exam-service.js';
import { assertExpectedLiveExamVersion } from './live-exam-transition-guard.js';

type SessionRow = Record<string, unknown>;

type MarkSchemeSnapshot = {
  points: Array<{ id:string }>;
};

const PAUSABLE = new Set(['lobby', 'question_open', 'answers_locked', 'marking', 'review']);

/**
 * Phase 3/4 state-machine owner for Cambridge Live Challenge.
 *
 * This service deliberately operates on the existing live_exam_* tables. It is
 * mounted before the legacy LiveExamService routes so version-aware clients can
 * opt into locked/CAS transitions while old clients remain functional during
 * the frontend migration window.
 */
export class LiveExamControlService {
  constructor(private readonly pool: Pool) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
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
    return result.rows[0] as SessionRow;
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
    const version = Number(changed.rows[0]?.version);
    if (!Number.isSafeInteger(version) || version < 1) throw new DomainError('live_state_conflict', 409);
    await client.query(
      `insert into live_exam_events(session_id,actor_id,event_type,session_version,payload)
       values($1,$2,$3,$4,$5::jsonb)`,
      [sessionId, actorId, eventType, version, JSON.stringify(payload)],
    );
    return version;
  }

  private async transaction<T>(work: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async openRoom(actor: Actor, sessionId: string, expectedVersion: number) {
    return this.transaction(async (client) => {
      const session = await this.lockControlledSession(client, actor, sessionId);
      assertExpectedLiveExamVersion(session, expectedVersion);
      if (session.status !== 'published') throw new DomainError('live_invalid_state', 409);
      if (typeof session.join_code !== 'string' || !/^\d{6}$/.test(session.join_code)) {
        throw new DomainError('live_join_code_conflict', 409);
      }
      await client.query(
        `update live_exam_sessions
         set status='lobby',paused_at=null,paused_from_status=null
         where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'room.opened');
      return { sessionId, status:'lobby' as const, version, joinCode:session.join_code };
    });
  }

  async start(actor: Actor, sessionId: string, expectedVersion: number) {
    return this.transaction(async (client) => {
      const session = await this.lockControlledSession(client, actor, sessionId);
      assertExpectedLiveExamVersion(session, expectedVersion);
      if (session.status !== 'lobby') throw new DomainError('live_invalid_state', 409);

      const count = await client.query(
        `select count(*)::int count
         from live_exam_participants
         where session_id=$1 and left_at is null`,
        [sessionId],
      );
      if (Number(count.rows[0]?.count ?? 0) < 1) throw new DomainError('live_no_participants', 409);

      const question = await client.query(
        `select id from live_exam_questions where session_id=$1 and position=0`,
        [sessionId],
      );
      if (!question.rowCount) throw new DomainError('live_no_questions', 409);

      await client.query(
        `insert into live_exam_answers(session_question_id,participant_id)
         select $2,lep.id from live_exam_participants lep
         where lep.session_id=$1 and lep.left_at is null
         on conflict do nothing`,
        [sessionId, question.rows[0].id],
      );
      await client.query(
        `update live_exam_sessions
         set status='question_open',current_question_index=0,
           started_at=coalesce(started_at,now()),question_started_at=now(),
           answers_locked_at=null,mark_scheme_revealed_at=null
         where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'question.opened', { position:0 });
      return { sessionId, status:'question_open' as const, version };
    });
  }

  async lockAnswers(actor: Actor, sessionId: string, expectedVersion: number) {
    return this.transaction(async (client) => {
      const session = await this.lockControlledSession(client, actor, sessionId);
      assertExpectedLiveExamVersion(session, expectedVersion);
      if (session.status !== 'question_open') throw new DomainError('live_invalid_state', 409);

      const question = await client.query(
        `select id from live_exam_questions where session_id=$1 and position=$2`,
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
      await client.query(
        `update live_exam_sessions
         set status='answers_locked',answers_locked_at=coalesce(answers_locked_at,now())
         where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'answers.locked', {
        position:Number(session.current_question_index),
      });
      return { sessionId, status:'answers_locked' as const, version };
    });
  }

  async revealMarkScheme(actor: Actor, sessionId: string, expectedVersion: number) {
    return this.transaction(async (client) => {
      const session = await this.lockControlledSession(client, actor, sessionId);
      assertExpectedLiveExamVersion(session, expectedVersion);
      if (session.status !== 'answers_locked') throw new DomainError('live_invalid_state', 409);

      const question = await client.query(
        `select id,mark_scheme_snapshot
         from live_exam_questions
         where session_id=$1 and position=$2`,
        [sessionId, session.current_question_index],
      );
      if (!question.rowCount) throw new DomainError('live_no_questions', 409);
      const sessionQuestionId = String(question.rows[0].id);
      const scheme = question.rows[0].mark_scheme_snapshot as MarkSchemeSnapshot;
      if (!scheme || !Array.isArray(scheme.points)) throw new DomainError('live_question_not_ready', 409);

      const answers = await client.query(
        `select a.id answer_id,lep.student_id
         from live_exam_answers a
         join live_exam_participants lep on lep.id=a.participant_id
         where a.session_question_id=$1 and lep.left_at is null
         order by lep.student_id`,
        [sessionQuestionId],
      );
      const mode = String(session.marking_mode) as LiveExamMarkingMode;
      if (mode === 'peer' && (answers.rowCount ?? 0) < 2) {
        throw new DomainError('live_peer_assignment_impossible', 409);
      }

      const assignments = mode === 'teacher'
        ? answers.rows.map((row) => ({
            answerId:String(row.answer_id),reviewerId:String(session.host_id),kind:'teacher' as const,
          }))
        : mode === 'self'
          ? answers.rows.map((row) => ({
              answerId:String(row.answer_id),reviewerId:String(row.student_id),kind:'self' as const,
            }))
          : assignPeerReviewers(answers.rows.map((row) => ({
              answerId:String(row.answer_id),studentId:String(row.student_id),
            })), `${sessionId}:${sessionQuestionId}`).map((assignment) => ({
              answerId:assignment.answerId,
              reviewerId:assignment.reviewerId,
              kind:'peer' as const,
            }));

      for (const assignment of assignments) {
        const review = await client.query(
          `insert into live_exam_reviews(session_question_id,answer_id,reviewer_id,kind)
           values($1,$2,$3,$4)
           on conflict(session_question_id,answer_id,kind)
           do update set reviewer_id=excluded.reviewer_id
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
        `update live_exam_sessions
         set status='marking',mark_scheme_revealed_at=now()
         where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'mark_scheme.revealed', {
        markingMode:mode,
        reviewCount:assignments.length,
      });
      return { sessionId, status:'marking' as const, version };
    });
  }

  /**
   * Explicit recovery for a locked peer/self round that cannot safely proceed.
   * This never silently changes marking policy: the teacher supplies a reason,
   * the row is CAS-locked, and the policy change is written to live_exam_events
   * before Mark Scheme reveal can create teacher review assignments.
   */
  async switchMarkingToTeacher(
    actor: Actor,
    sessionId: string,
    expectedVersion: number,
    reason: string,
  ) {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3 || normalizedReason.length > 500) {
      throw new DomainError('live_marking_fallback_reason_required', 400);
    }
    return this.transaction(async (client) => {
      const session = await this.lockControlledSession(client, actor, sessionId);
      assertExpectedLiveExamVersion(session, expectedVersion);
      if (session.status !== 'answers_locked') throw new DomainError('live_invalid_state', 409);
      const fromMode = String(session.marking_mode) as LiveExamMarkingMode;
      if (fromMode === 'teacher') throw new DomainError('live_invalid_state', 409);

      await client.query(
        `update live_exam_sessions set marking_mode='teacher' where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'marking.mode_changed', {
        fromMode,
        toMode:'teacher',
        reason:normalizedReason,
      });
      return {
        sessionId,
        status:'answers_locked' as const,
        markingMode:'teacher' as const,
        previousMarkingMode:fromMode,
        reason:normalizedReason,
        version,
      };
    });
  }

  async completeMarking(actor: Actor, sessionId: string, expectedVersion: number, force = false) {
    return this.transaction(async (client) => {
      const session = await this.lockControlledSession(client, actor, sessionId);
      assertExpectedLiveExamVersion(session, expectedVersion);
      if (session.status !== 'marking') throw new DomainError('live_invalid_state', 409);

      const pending = await client.query(
        `select count(*)::int count
         from live_exam_reviews r
         join live_exam_questions leq on leq.id=r.session_question_id
         where leq.session_id=$1 and leq.position=$2 and r.status='assigned'`,
        [sessionId, session.current_question_index],
      );
      const pendingCount = Number(pending.rows[0]?.count ?? 0);
      if (pendingCount > 0 && !force) throw new DomainError('live_reviews_pending', 409);

      if (pendingCount > 0) {
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
        forced:force,pending:pendingCount,
      });
      return { sessionId, status:'review' as const, version };
    });
  }

  async nextQuestion(actor: Actor, sessionId: string, expectedVersion: number) {
    return this.transaction(async (client) => {
      const session = await this.lockControlledSession(client, actor, sessionId);
      assertExpectedLiveExamVersion(session, expectedVersion);
      if (session.status !== 'review') throw new DomainError('live_invalid_state', 409);

      const nextPosition = Number(session.current_question_index) + 1;
      const next = await client.query(
        `select id from live_exam_questions where session_id=$1 and position=$2`,
        [sessionId, nextPosition],
      );
      if (!next.rowCount) {
        await client.query(
          `update live_exam_sessions set status='finished',finished_at=now() where id=$1`,
          [sessionId],
        );
        const version = await this.bump(client, sessionId, actor.id, 'session.finished');
        return { sessionId, status:'finished' as const, version };
      }

      await client.query(
        `insert into live_exam_answers(session_question_id,participant_id)
         select $2,lep.id from live_exam_participants lep
         where lep.session_id=$1 and lep.left_at is null
         on conflict do nothing`,
        [sessionId, next.rows[0].id],
      );
      await client.query(
        `update live_exam_sessions
         set status='question_open',current_question_index=$2,question_started_at=now(),
           answers_locked_at=null,mark_scheme_revealed_at=null
         where id=$1`,
        [sessionId, nextPosition],
      );
      const version = await this.bump(client, sessionId, actor.id, 'question.opened', { position:nextPosition });
      return { sessionId, status:'question_open' as const, version };
    });
  }

  async pause(actor: Actor, sessionId: string, expectedVersion: number) {
    return this.transaction(async (client) => {
      const session = await this.lockControlledSession(client, actor, sessionId);
      assertExpectedLiveExamVersion(session, expectedVersion);
      const fromStatus = String(session.status);
      if (!PAUSABLE.has(fromStatus)) throw new DomainError('live_invalid_state', 409);
      await client.query(
        `update live_exam_sessions
         set paused_from_status=status,status='paused',paused_at=now()
         where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'session.paused', { fromStatus });
      return { sessionId, status:'paused' as const, pausedFromStatus:fromStatus, version };
    });
  }

  async resume(actor: Actor, sessionId: string, expectedVersion: number) {
    return this.transaction(async (client) => {
      const session = await this.lockControlledSession(client, actor, sessionId);
      assertExpectedLiveExamVersion(session, expectedVersion);
      const resumeStatus = typeof session.paused_from_status === 'string'
        ? session.paused_from_status
        : String(session.paused_from_status ?? '');
      if (session.status !== 'paused' || !PAUSABLE.has(resumeStatus)) {
        throw new DomainError('live_invalid_state', 409);
      }
      await client.query(
        `update live_exam_sessions
         set status=paused_from_status,
           question_started_at=case
             when paused_from_status='question_open' and question_started_at is not null and paused_at is not null
             then question_started_at + (now()-paused_at)
             else question_started_at
           end,
           paused_at=null,paused_from_status=null
         where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'session.resumed', { toStatus:resumeStatus });
      return { sessionId, status:resumeStatus, version };
    });
  }

  async cancel(actor: Actor, sessionId: string, expectedVersion: number) {
    return this.transaction(async (client) => {
      const session = await this.lockControlledSession(client, actor, sessionId);
      assertExpectedLiveExamVersion(session, expectedVersion);
      if (['finished', 'cancelled'].includes(String(session.status))) {
        throw new DomainError('live_invalid_state', 409);
      }
      await client.query(
        `update live_exam_sessions
         set status='cancelled',finished_at=now(),paused_at=null,paused_from_status=null
         where id=$1`,
        [sessionId],
      );
      const version = await this.bump(client, sessionId, actor.id, 'session.cancelled');
      return { sessionId, status:'cancelled' as const, version };
    });
  }
}
