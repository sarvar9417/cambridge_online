import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export class AnalyticsService {
  constructor(private readonly pool: Pool) {}

  private assertStaff(actor: Actor) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
  }

  private async assertClassVisible(actor: Actor, classId: string) {
    this.assertStaff(actor);
    const result = await this.pool.query(
      `select 1 from classes c where c.id=$1 and (($2='owner' and c.school_id=$3) or
       ($2='teacher' and (c.owner_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4))))`,
      [classId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
  }

  async mastery(actor: Actor, studentId = actor.id) {
    if (actor.role === 'student' && studentId !== actor.id) throw new DomainError('not_found', 404);
    if (actor.role !== 'student') {
      const visible = await this.pool.query(
        `select 1 from enrollments e join classes c on c.id=e.class_id where e.student_id=$1 and e.left_at is null and
         (($2='owner' and c.school_id=$3) or ($2='teacher' and (c.owner_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4)))) limit 1`,
        [studentId, actor.role, actor.schoolId, actor.id],
      );
      if (!visible.rowCount) throw new DomainError('not_found', 404);
    }
    const result = await this.pool.query(
      `select m.subtopic_id,st.code,st.title,m.score,m.attempts,m.marks_earned,m.marks_possible,m.updated_at
       from mastery m join subtopics st on st.id=m.subtopic_id where m.student_id=$1 order by m.score,st.code`,
      [studentId],
    );
    return result.rows.map((row) => ({ ...row, score: Number(row.score), attempts: Number(row.attempts), marksEarned: Number(row.marks_earned), marksPossible: Number(row.marks_possible), confidence: Math.min(1, Number(row.marks_possible) / 15) }));
  }

  async overview(actor: Actor) {
    if (actor.role === 'student') return this.mastery(actor);
    const result = await this.pool.query(
      `select c.id,c.name,count(distinct s.id)filter(where s.released_at is not null)::int submissions,
       round(avg(s.percentage)filter(where s.released_at is not null),1)average
       from classes c left join assignments asg on asg.class_id=c.id left join submissions s on s.assignment_id=asg.id
       where ($1='owner' and c.school_id=$2)or($1='teacher'and(c.owner_id=$3 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$3)))
       group by c.id order by c.name`,
      [actor.role, actor.schoolId, actor.id],
    );
    return result.rows;
  }

  async heatmap(actor: Actor, classId: string) {
    await this.assertClassVisible(actor, classId);
    const result = await this.pool.query(
      `select u.id student_id,u.full_name,t.number topic,
       case when sum(m.marks_possible)>0 then sum(m.marks_earned)/sum(m.marks_possible) else null end mastery,
       coalesce(sum(m.marks_possible),0) evidence
       from enrollments e join users u on u.id=e.student_id cross join topics t
       left join subtopics st on st.topic_id=t.id left join mastery m on m.subtopic_id=st.id and m.student_id=u.id
       where e.class_id=$1 and e.left_at is null group by u.id,t.id order by u.full_name,t.number`,
      [classId],
    );
    return result.rows.map((row) => ({ studentId: row.student_id, studentName: row.full_name, topic: row.topic, mastery: row.mastery === null ? null : Number(row.mastery), evidence: Number(row.evidence) }));
  }

  async markPoints(actor: Actor, classId: string) {
    await this.assertClassVisible(actor, classId);
    const result = await this.pool.query(
      `select msp.id,msp.code,msp.text,q.display_ref,q.command_word,
       count(*) filter(where gp.final_matched=false)::int missed,count(*)::int total,
       round(100.0*count(*) filter(where gp.final_matched=false)/nullif(count(*),0),1) miss_pct
       from grading_points gp join mark_scheme_points msp on msp.id=gp.mark_scheme_point_id
       join mark_schemes ms on ms.id=msp.mark_scheme_id join questions q on q.id=ms.question_id
       join gradings g on g.id=gp.grading_id join answers ans on ans.id=g.answer_id
       join submissions s on s.id=ans.submission_id join assignments a on a.id=s.assignment_id
       where a.class_id=$1 and g.released_at>now()-interval '60 days'
       group by msp.id,q.id having count(*)>=8 order by miss_pct desc limit 15`,
      [classId],
    );
    return result.rows.map((row) => ({ id: row.id, code: row.code, text: row.text, displayRef: row.display_ref, commandWord: row.command_word, missed: row.missed, total: row.total, missPct: Number(row.miss_pct) }));
  }

  async commandWords(actor: Actor, classId: string) {
    await this.assertClassVisible(actor, classId);
    const result = await this.pool.query(
      `select q.command_word,round(sum(g.final_score)/nullif(sum(g.max_marks),0)*100,1) pct,count(*)::int n
       from gradings g join answers ans on ans.id=g.answer_id join questions q on q.id=ans.question_id
       join submissions s on s.id=ans.submission_id join assignments a on a.id=s.assignment_id
       where a.class_id=$1 and g.released_at is not null and q.command_word is not null
       group by q.command_word having count(*)>=10 order by pct`,
      [classId],
    );
    return result.rows.map((row) => ({ commandWord: row.command_word, percentage: Number(row.pct), sampleSize: row.n }));
  }

  async studentCommandWords(actor: Actor) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
    const result = await this.pool.query(
      `select q.command_word,round(sum(g.final_score)/nullif(sum(g.max_marks),0)*100,1) pct,count(*)::int n
       from gradings g join answers ans on ans.id=g.answer_id join questions q on q.id=ans.question_id
       join submissions s on s.id=ans.submission_id
       where s.student_id=$1 and g.released_at is not null and q.command_word is not null
       group by q.command_word order by pct,q.command_word`,
      [actor.id],
    );
    return result.rows.map((row) => ({ commandWord: row.command_word, percentage: Number(row.pct), sampleSize: row.n }));
  }

  async aiQuality(actor: Actor) {
    if (actor.role !== 'owner') throw new DomainError('owners_only', 403);
    const result = await this.pool.query(
      `select coalesce(g.prompt_version,'unknown') prompt_version,count(*)::int sample_size,
       round(100.0*count(*) filter(where gp.teacher_matched is not distinct from gp.ai_matched)/nullif(count(*),0),1) point_agreement,
       round(100.0*count(*) filter(where gp.ai_matched=true and gp.teacher_matched=false)/nullif(count(*),0),1) false_positive,
       round(100.0*count(*) filter(where gp.ai_matched=false and gp.teacher_matched=true)/nullif(count(*),0),1) false_negative
       from grading_points gp join gradings g on g.id=gp.grading_id join answers ans on ans.id=g.answer_id
       join submissions s on s.id=ans.submission_id join assignments a on a.id=s.assignment_id join classes c on c.id=a.class_id
       where gp.teacher_matched is not null and gp.ai_matched is not null and c.school_id=$1 and g.graded_at>now()-interval '90 days'
       group by g.prompt_version order by max(g.graded_at) desc`,
      [actor.schoolId],
    );
    return result.rows.map((row) => ({ promptVersion: row.prompt_version, sampleSize: row.sample_size, pointAgreement: Number(row.point_agreement), falsePositive: Number(row.false_positive), falseNegative: Number(row.false_negative) }));
  }
}
