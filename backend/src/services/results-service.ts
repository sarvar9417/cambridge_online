import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export class ResultsService {
  constructor(private readonly pool: Pool) {}

  async list(actor: Actor) {
    const result = await this.pool.query(
      `select s.id, a.title, c.name as class_name, u.full_name as student_name,
              s.total_score, s.total_max, s.percentage, s.grade, s.released_at
       from submissions s
       join assignments a on a.id = s.assignment_id
       join classes c on c.id = a.class_id
       join users u on u.id = s.student_id
       where s.released_at is not null and (
         ($1 = 'student' and s.student_id = $2) or
         ($1 = 'owner' and c.school_id = $3) or
         ($1 = 'teacher' and (c.owner_id = $2 or exists (
           select 1 from class_teachers ct where ct.class_id = c.id and ct.teacher_id = $2
         )))
       ) order by s.released_at desc`,
      [actor.role, actor.id, actor.schoolId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      className: row.class_name,
      studentName: row.student_name,
      totalScore: Number(row.total_score),
      totalMax: Number(row.total_max),
      percentage: Number(row.percentage),
      grade: row.grade,
      releasedAt: row.released_at,
    }));
  }

  async detail(actor: Actor, submissionId: string) {
    const result = await this.pool.query(
      `select g.id as grading_id, ga.status as appeal_status, q.display_ref, q.stem_md, q.marks, ans.text, g.final_score, g.teacher_feedback_md,
              coalesce(json_agg(json_build_object('code', msp.code, 'text', msp.text, 'matched', gp.final_matched,
                'marks', gp.awarded_marks) order by msp.sort_order) filter (where gp.id is not null), '[]') points
       from submissions s
       join assignments a on a.id = s.assignment_id join classes c on c.id = a.class_id
       join answers ans on ans.submission_id = s.id join questions q on q.id = ans.question_id
       join gradings g on g.answer_id = ans.id
       left join grading_appeals ga on ga.grading_id = g.id
       left join grading_points gp on gp.grading_id = g.id
       left join mark_scheme_points msp on msp.id = gp.mark_scheme_point_id
       where s.id = $1 and s.released_at is not null and (
         ($2 = 'student' and s.student_id = $3) or ($2 = 'owner' and c.school_id = $4) or
         ($2 = 'teacher' and (c.owner_id = $3 or exists (select 1 from class_teachers ct where ct.class_id = c.id and ct.teacher_id = $3)))
       ) group by q.id, ans.id, g.id, ga.status order by q.sort_order`,
      [submissionId, actor.role, actor.id, actor.schoolId],
    );
    // `12-api.md` section 2.3: a result that does not exist and one the actor may
    // not read must be indistinguishable, so both are a 404 rather than an empty
    // list that would confirm the submission exists.
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return result.rows.map((row) => ({
      gradingId: row.grading_id,
      appealStatus: row.appeal_status,
      displayRef: row.display_ref,
      stemMd: row.stem_md,
      marks: row.marks,
      answerText: row.text,
      finalScore: Number(row.final_score),
      feedback: row.teacher_feedback_md,
      points: row.points,
    }));
  }
}
