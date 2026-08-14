import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export interface GradingQueueItem {
  id: string;
  text: string;
  displayRef: string;
  stemMd: string;
  marks: number;
  answerKind: string;
  studentName: string;
  points: Array<{ id: string; code: string; text: string; matched: boolean | null; marks: number }>;
}

export interface AppealQueueItem {
  id: string;
  gradingId: string;
  reason: string;
  createdAt: string;
  studentName: string;
  displayRef: string;
  stemMd: string;
  answerText: string;
  finalScore: number;
  marks: number;
}

export class GradingService {
  constructor(private readonly pool: Pool) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  private async assertVisible(actor: Actor, gradingId: string) {
    this.assertStaff(actor);
    const result = await this.pool.query(
      `select g.id
       from gradings g
       join answers ans on ans.id = g.answer_id
       join submissions s on s.id = ans.submission_id
       join assignments a on a.id = s.assignment_id
       join classes c on c.id = a.class_id
       where g.id = $1 and (
         ($2 = 'owner' and c.school_id = $3) or
         ($2 = 'teacher' and (c.owner_id = $4 or exists (
           select 1 from class_teachers ct where ct.class_id = c.id and ct.teacher_id = $4
         )))
       )`,
      [gradingId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
  }

  async queue(actor: Actor): Promise<GradingQueueItem[]> {
    this.assertStaff(actor);
    const result = await this.pool.query(
      `select g.id, ans.text, q.display_ref, q.stem_md, q.marks, q.answer_kind,
              u.full_name as student_name,
              coalesce(json_agg(json_build_object(
                'id', gp.id, 'code', msp.code, 'text', msp.text,
                'matched', gp.teacher_matched, 'marks', msp.marks
              ) order by msp.sort_order) filter (where gp.id is not null), '[]') as points
       from gradings g
       join answers ans on ans.id = g.answer_id
       join questions q on q.id = ans.question_id
       join submissions s on s.id = ans.submission_id
       join users u on u.id = s.student_id
       join assignments a on a.id = s.assignment_id
       join classes c on c.id = a.class_id
       left join grading_points gp on gp.grading_id = g.id
       left join mark_scheme_points msp on msp.id = gp.mark_scheme_point_id
       where g.status = 'needs_teacher' and (
         ($1 = 'owner' and c.school_id = $2) or
         ($1 = 'teacher' and (c.owner_id = $3 or exists (
           select 1 from class_teachers ct where ct.class_id = c.id and ct.teacher_id = $3
         )))
       )
       group by g.id, ans.id, q.id, u.id, s.submitted_at
       order by s.submitted_at`,
      [actor.role, actor.schoolId, actor.id],
    );
    return result.rows;
  }

  async togglePoint(actor: Actor, pointId: string, matched: boolean) {
    this.assertStaff(actor);
    const visible = await this.pool.query(
      `select gp.grading_id
       from grading_points gp
       join gradings g on g.id = gp.grading_id
       join answers ans on ans.id = g.answer_id
       join submissions s on s.id = ans.submission_id
       join assignments a on a.id = s.assignment_id
       join classes c on c.id = a.class_id
       where gp.id = $1 and (($2 = 'owner' and c.school_id = $3) or
         ($2 = 'teacher' and (c.owner_id = $4 or exists (
           select 1 from class_teachers ct where ct.class_id = c.id and ct.teacher_id = $4
         ))))`,
      [pointId, actor.role, actor.schoolId, actor.id],
    );
    if (!visible.rowCount) throw new DomainError('not_found', 404);

    const result = await this.pool.query(
      `update grading_points gp
       set teacher_matched = $2, final_matched = $2,
           awarded_marks = case when $2 then msp.marks else 0 end
       from mark_scheme_points msp
       where gp.id = $1 and msp.id = gp.mark_scheme_point_id
       returning gp.grading_id`,
      [pointId, matched],
    );
    const gradingId = result.rows[0].grading_id;
    const score = await this.pool.query(
      `update gradings
       set teacher_score = x.score, final_score = x.score, graded_by = $2, graded_at = now()
       from (select coalesce(sum(awarded_marks), 0) as score from grading_points where grading_id = $1) x
       where id = $1 returning final_score`,
      [gradingId, actor.id],
    );
    return { finalScore: Number(score.rows[0].final_score) };
  }

  async setScore(actor: Actor, gradingId: string, score: number) {
    await this.assertVisible(actor, gradingId);
    const result = await this.pool.query(
      `update gradings g set teacher_score = $2, final_score = $2, graded_by = $3, graded_at = now()
       from answers ans join questions q on q.id = ans.question_id
       where g.id = $1 and ans.id = g.answer_id and $2 between 0 and q.marks
       returning g.final_score`,
      [gradingId, score, actor.id],
    );
    if (!result.rowCount) throw new DomainError('invalid_score', 400);
    return { finalScore: Number(result.rows[0].final_score) };
  }

  async confirm(actor:Actor,gradingId:string){await this.assertVisible(actor,gradingId);const r=await this.pool.query(`update gradings set status='teacher_done',final_score=coalesce(teacher_score,ai_score),graded_by=$2,graded_at=now()where id=$1 and coalesce(teacher_score,ai_score) is not null returning id,final_score`,[gradingId,actor.id]);if(!r.rowCount)throw new DomainError('score_required',409);return r.rows[0]}
  async appeal(actor:Actor,gradingId:string,reason:string){if(actor.role!=='student')throw new DomainError('students_only',403);const r=await this.pool.query(`insert into grading_appeals(grading_id,student_id,reason)select g.id,s.student_id,$3 from gradings g join answers ans on ans.id=g.answer_id join submissions s on s.id=ans.submission_id where g.id=$1 and s.student_id=$2 and g.released_at is not null on conflict(grading_id)do nothing returning id,status`,[gradingId,actor.id,reason]);if(!r.rowCount)throw new DomainError('not_found',404);await this.pool.query(`update gradings set status='needs_teacher' where id=$1`,[gradingId]);return r.rows[0]}

  async appealQueue(actor: Actor): Promise<AppealQueueItem[]> {
    this.assertStaff(actor);
    const result = await this.pool.query(
      `select ga.id, ga.grading_id, ga.reason, ga.created_at, u.full_name student_name,
              q.display_ref, q.stem_md, ans.text answer_text, g.final_score, q.marks
       from grading_appeals ga
       join gradings g on g.id=ga.grading_id join answers ans on ans.id=g.answer_id
       join questions q on q.id=ans.question_id join submissions s on s.id=ans.submission_id
       join users u on u.id=s.student_id join assignments a on a.id=s.assignment_id
       join classes c on c.id=a.class_id
       where ga.status='open' and (($1='owner' and c.school_id=$2) or
         ($1='teacher' and (c.owner_id=$3 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3))))
       order by ga.created_at`,
      [actor.role, actor.schoolId, actor.id],
    );
    return result.rows.map((row) => ({
      id: row.id, gradingId: row.grading_id, reason: row.reason, createdAt: row.created_at,
      studentName: row.student_name, displayRef: row.display_ref, stemMd: row.stem_md,
      answerText: row.answer_text, finalScore: Number(row.final_score), marks: row.marks,
    }));
  }

  async resolveAppeal(actor: Actor, appealId: string, decision: 'accepted'|'rejected', resolution: string) {
    this.assertStaff(actor);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const visible = await client.query(
        `select ga.grading_id from grading_appeals ga join gradings g on g.id=ga.grading_id
         join answers ans on ans.id=g.answer_id join submissions s on s.id=ans.submission_id
         join assignments a on a.id=s.assignment_id join classes c on c.id=a.class_id
         where ga.id=$1 and ga.status='open' and (($2='owner' and c.school_id=$3) or
           ($2='teacher' and (c.owner_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4))))
         for update of ga`,
        [appealId, actor.role, actor.schoolId, actor.id],
      );
      if (!visible.rowCount) throw new DomainError('not_found', 404);
      await client.query(`update grading_appeals set status=$2,resolution=$3,resolved_by=$4,resolved_at=now() where id=$1`, [appealId, decision, resolution, actor.id]);
      await client.query(`update gradings set status=$2 where id=$1`, [visible.rows[0].grading_id, decision === 'accepted' ? 'needs_teacher' : 'released']);
      await client.query('commit');
      return { id: appealId, status: decision };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async release(actor: Actor, gradingId: string) {
    await this.assertVisible(actor, gradingId);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        `update gradings set status = 'released', released_at = now()
         where id = $1 and final_score is not null returning id, answer_id`,
        [gradingId],
      );
      if (!result.rowCount) throw new DomainError('score_required', 409);
      const submission = await client.query(
        `select ans.submission_id
         from answers ans where ans.id = $1`,
        [result.rows[0].answer_id],
      );
      const submissionId = submission.rows[0].submission_id;
      const pending = await client.query(
        `select count(*)::int as count
         from gradings g join answers ans on ans.id = g.answer_id
         where ans.submission_id = $1 and g.status <> 'released'`,
        [submissionId],
      );
      if (pending.rows[0].count === 0) {
        await client.query(
          `update submissions s set status = 'released', released_at = now(),
             total_score = totals.score, total_max = totals.max_marks,
             percentage = case when totals.max_marks > 0 then round(totals.score * 100 / totals.max_marks, 2) else 0 end
           from (
             select coalesce(sum(g.final_score), 0) score, coalesce(sum(g.max_marks), 0) max_marks
             from gradings g join answers ans on ans.id = g.answer_id where ans.submission_id = $1
           ) totals where s.id = $1`,
          [submissionId],
        );
        await client.query(
          `insert into mastery(student_id,subtopic_id,score,attempts,marks_earned,marks_possible,last_activity_at)
           select s.student_id,qs.subtopic_id,
             case when sum(g.max_marks)>0 then sum(g.final_score)/sum(g.max_marks) else 0 end,
             count(distinct g.id),sum(g.final_score),sum(g.max_marks),now()
           from submissions s join answers ans on ans.submission_id=s.id join gradings g on g.answer_id=ans.id
           join question_subtopics qs on qs.question_id=ans.question_id where s.id=$1
           group by s.student_id,qs.subtopic_id
           on conflict(student_id,subtopic_id) do update set
             marks_earned=mastery.marks_earned+excluded.marks_earned,
             marks_possible=mastery.marks_possible+excluded.marks_possible,
             attempts=mastery.attempts+excluded.attempts,
             score=(mastery.marks_earned+excluded.marks_earned)/nullif(mastery.marks_possible+excluded.marks_possible,0),
             last_activity_at=now(),updated_at=now()`, [submissionId],
        );
        await client.query(
          `insert into error_patterns(student_id,mark_scheme_point_id,miss_count,hit_count,last_seen_at)
           select s.student_id,gp.mark_scheme_point_id,
             count(*) filter(where not coalesce(gp.final_matched,false)),count(*) filter(where coalesce(gp.final_matched,false)),now()
           from submissions s join answers ans on ans.submission_id=s.id join gradings g on g.answer_id=ans.id
           join grading_points gp on gp.grading_id=g.id where s.id=$1 group by s.student_id,gp.mark_scheme_point_id
           on conflict(student_id,mark_scheme_point_id)do update set
             miss_count=error_patterns.miss_count+excluded.miss_count,hit_count=error_patterns.hit_count+excluded.hit_count,last_seen_at=now()`, [submissionId],
        );
      } else {
        await client.query(`update submissions set status = 'grading' where id = $1`, [submissionId]);
      }
      await client.query('commit');
      return { id: gradingId, submissionReleased: pending.rows[0].count === 0 };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
