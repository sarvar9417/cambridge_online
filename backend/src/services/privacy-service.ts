import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export class PrivacyService {
  constructor(private readonly pool: Pool) {}

  async exportOwnData(actor: Actor) {
    const [profile, enrollments, submissions, mastery, flashcards, appeals] = await Promise.all([
      this.pool.query(
        `select id,role,full_name,email,username,locale,is_active,created_at,last_login_at
         from users where id=$1`,
        [actor.id],
      ),
      this.pool.query(
        `select c.id class_id,c.name class_name,c.level,e.joined_at,e.left_at
         from enrollments e join classes c on c.id=e.class_id where e.student_id=$1 order by e.joined_at`,
        [actor.id],
      ),
      this.pool.query(
        `select s.id submission_id,a.title assignment_title,s.status,s.started_at,s.submitted_at,
                s.time_spent_s,s.total_score,s.total_max,s.percentage,s.grade,s.released_at,
                coalesce(json_agg(json_build_object(
                  'questionId',ans.question_id,'answerText',ans.text,'code',ans.code,
                  'wordCount',ans.word_count,'updatedAt',ans.updated_at,
                  'finalScore',g.final_score,'maxMarks',g.max_marks,'releasedAt',g.released_at
                ) order by ans.updated_at) filter(where ans.id is not null),'[]') answers
         from submissions s join assignments a on a.id=s.assignment_id
         left join answers ans on ans.submission_id=s.id left join gradings g on g.answer_id=ans.id
         where s.student_id=$1 group by s.id,a.id order by s.created_at`,
        [actor.id],
      ),
      this.pool.query(
        `select t.number topic_number,t.title topic_title,st.code subtopic_code,st.title,m.score,m.attempts,
                m.marks_earned,m.marks_possible,m.last_activity_at
         from mastery m join subtopics st on st.id=m.subtopic_id join topics t on t.id=st.topic_id
         where m.student_id=$1 order by t.number,st.code`,
        [actor.id],
      ),
      this.pool.query(
        `select fr.flashcard_id,fr.ease_factor,fr.interval_days,fr.repetitions,fr.lapses,
                fr.due_at,fr.last_grade,fr.last_reviewed_at
         from flashcard_reviews fr where fr.user_id=$1 order by fr.last_reviewed_at`,
        [actor.id],
      ),
      this.pool.query(
        `select ga.id,ga.grading_id,ga.reason,ga.status,ga.resolution,ga.created_at,ga.resolved_at
         from grading_appeals ga where ga.student_id=$1 order by ga.created_at`,
        [actor.id],
      ),
    ]);
    if (!profile.rowCount) throw new DomainError('not_found', 404);
    return {
      exportedAt: new Date().toISOString(),
      profile: profile.rows[0],
      enrollments: enrollments.rows,
      submissions: submissions.rows,
      mastery: mastery.rows,
      flashcardReviews: flashcards.rows,
      appeals: appeals.rows,
    };
  }

  async anonymizeStudent(actor: Actor, studentId: string) {
    if (actor.role !== 'owner') throw new DomainError('owner_only', 403);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const target = await client.query(
        `select id from users where id=$1 and school_id=$2 and role='student' and is_active=true for update`,
        [studentId, actor.schoolId],
      );
      if (!target.rowCount) throw new DomainError('not_found', 404);
      await client.query(
        `update answers set text=null,code=null,ocr_text=null,image_paths='{}',word_count=null,updated_at=now()
         where submission_id in(select id from submissions where student_id=$1)`,
        [studentId],
      );
      await client.query(
        `update gradings set ai_raw=null where answer_id in(
           select a.id from answers a join submissions s on s.id=a.submission_id where s.student_id=$1
         )`,
        [studentId],
      );
      await client.query(
        `update grading_points set ai_evidence=null where grading_id in(
           select g.id from gradings g join answers a on a.id=g.answer_id
           join submissions s on s.id=a.submission_id where s.student_id=$1
         )`,
        [studentId],
      );
      await client.query(`update grading_appeals set reason='[anonimlashtirildi]',resolution=null where student_id=$1`, [studentId]);
      await client.query(`update refresh_tokens set revoked_at=coalesce(revoked_at,now()) where user_id=$1`, [studentId]);
      await client.query(
        `update users set full_name='O''chirilgan foydalanuvchi',email=null,
                username='deleted-'||id::text,avatar_url=null,is_active=false,
                token_version=token_version+1,last_login_at=null,updated_at=now()
         where id=$1`,
        [studentId],
      );
      await client.query(
        `insert into audit_log(actor_id,action,ref_table,ref_id,after)
         values($1,'student.anonymized','users',$2,jsonb_build_object('schoolId',$3,'anonymized',true))`,
        [actor.id, studentId, actor.schoolId],
      );
      await client.query('commit');
      return { id: studentId, anonymized: true };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
