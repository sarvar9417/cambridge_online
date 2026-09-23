import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export interface LiveExamStanding {
  rank: number;
  studentId?: string;
  studentName: string;
  score: number;
  possible: number;
}

export interface LiveExamScoreBucket {
  score: number;
  count: number;
}

/**
 * Teacher-facing marks-first standings for a Live Exam.
 *
 * Cambridge marks always remain authoritative. A room may explicitly use
 * submission time only to break equal-mark ties; it never adds marks or
 * changes mastery evidence.
 */
export class LiveExamRoundSummaryService {
  constructor(private readonly pool: Pool) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  private async controlledSession(actor: Actor, sessionId: string) {
    this.assertStaff(actor);
    const result = await this.pool.query(
      `select les.id,les.status::text,les.current_question_index,les.settings
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where les.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (
           c.owner_id=$4 or exists(
             select 1 from class_teachers ct
             where ct.class_id=c.id and ct.teacher_id=$4
           )
         ))
       )`,
      [sessionId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return result.rows[0] as { id:string; status:string; current_question_index:number; settings:Record<string,unknown> };
  }

  async summary(actor: Actor, sessionId: string, projector = false) {
    const session = await this.controlledSession(actor, sessionId);
    if (!['review','finished'].includes(session.status)) {
      throw new DomainError('live_results_not_ready', 409);
    }

    const currentPosition = Number(session.current_question_index);
    const speedTieBreak = session.settings?.leaderboardMode === 'marks_speed_tiebreak';
    const [roundResult, overallResult, possibleResult] = await Promise.all([
      this.pool.query(
        `select lep.student_id,u.full_name,coalesce(a.final_score,0)::float8 score,leq.marks,
           rank() over(order by coalesce(a.final_score,0) desc,
             case when $3::boolean then a.submitted_at end asc nulls last)::int rank,
           row_number() over(order by lep.joined_at,lep.student_id)::int alias_no
         from live_exam_questions leq
         join live_exam_sessions les on les.id=leq.session_id
         join live_exam_participants lep on lep.session_id=les.id and lep.left_at is null
         join users u on u.id=lep.student_id
         left join live_exam_answers a
           on a.session_question_id=leq.id and a.participant_id=lep.id
         where leq.session_id=$1 and leq.position=$2
         order by score desc,u.full_name,lep.student_id`,
        [sessionId, currentPosition, speedTieBreak],
      ),
      this.pool.query(
        `select lep.student_id,u.full_name,
           coalesce(sum(coalesce(a.final_score,0)),0)::float8 score,
           rank() over(order by coalesce(sum(coalesce(a.final_score,0)),0) desc,
             case when $3::boolean then sum(extract(epoch from (a.submitted_at-les.started_at))) end asc nulls last)::int rank,
           row_number() over(order by lep.joined_at,lep.student_id)::int alias_no
         from live_exam_participants lep
         join live_exam_sessions les on les.id=lep.session_id
         join users u on u.id=lep.student_id
         join live_exam_questions leq
           on leq.session_id=lep.session_id and leq.position<=$2
         left join live_exam_answers a
           on a.session_question_id=leq.id and a.participant_id=lep.id
         where lep.session_id=$1 and lep.left_at is null
         group by lep.student_id,u.full_name,lep.joined_at
         order by score desc,u.full_name,lep.student_id`,
        [sessionId, currentPosition, speedTieBreak],
      ),
      this.pool.query(
        `select coalesce(sum(marks),0)::int possible
         from live_exam_questions
         where session_id=$1 and position<=$2`,
        [sessionId, currentPosition],
      ),
    ]);

    const roundPossible = Number(roundResult.rows[0]?.marks ?? 0);
    const overallPossible = Number(possibleResult.rows[0]?.possible ?? 0);
    const round: LiveExamStanding[] = roundResult.rows.map((row, index) => ({
      rank: Number(row.rank),
      ...(projector ? {} : { studentId: String(row.student_id) }),
      studentName: projector ? `Ishtirokchi ${Number(row.alias_no)}` : String(row.full_name),
      score: Number(row.score),
      possible: roundPossible,
    }));
    const overall: LiveExamStanding[] = overallResult.rows.map((row, index) => ({
      rank: Number(row.rank),
      ...(projector ? {} : { studentId: String(row.student_id) }),
      studentName: projector ? `Ishtirokchi ${Number(row.alias_no)}` : String(row.full_name),
      score: Number(row.score),
      possible: overallPossible,
    }));

    const buckets = new Map<number, number>();
    for (const item of round) buckets.set(item.score, (buckets.get(item.score) ?? 0) + 1);
    const distribution: LiveExamScoreBucket[] = [...buckets.entries()]
      .sort(([left],[right]) => right-left)
      .map(([score,count]) => ({ score,count }));
    const average = round.length
      ? round.reduce((total,item) => total+item.score,0)/round.length
      : 0;

    return {
      sessionId,
      questionPosition: currentPosition,
      marksFirst: true,
      leaderboardMode: speedTieBreak ? 'marks_speed_tiebreak' : 'marks',
      round: {
        possible: roundPossible,
        average,
        distribution,
        standings: round,
      },
      overall: {
        possible: overallPossible,
        standings: overall,
      },
    };
  }
}
