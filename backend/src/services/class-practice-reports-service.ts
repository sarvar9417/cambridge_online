import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

const MIN_AGGREGATE_LEARNERS = 5;

/**
 * Teacher-facing, aggregate-only formative signals. No learner names, IDs,
 * individual attempts, raw responses or official grades leave this service.
 * A minimum cohort protects the privacy of students' personal practice.
 */
export class ClassPracticeReportsService {
  constructor(private readonly pool: Pool) {}

  async report(actor: Actor, classId: string) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
    const visible = await this.pool.query(
      `select c.id, c.name, sy.code course_code,
              count(distinct e.student_id)::int student_count
         from classes c
         join syllabi sy on sy.id=c.syllabus_id
         left join enrollments e on e.class_id=c.id and e.left_at is null
        where c.id=$1 and c.archived_at is null
          and (($2::text='owner' and c.school_id=$3::uuid)
            or ($2::text='teacher' and (
              c.owner_id=$4::uuid
              or exists (select 1 from class_teachers ct
                          where ct.class_id=c.id and ct.teacher_id=$4::uuid))))
        group by c.id, sy.code`,
      [classId, actor.role, actor.schoolId, actor.id],
    );
    if (!visible.rowCount) throw new DomainError('not_found', 404);
    const klass = visible.rows[0]!;
    const courseCode = String(klass.course_code);
    const studentCount = Number(klass.student_count);

    const summary = await this.pool.query(
      `select count(distinct r.student_id)::int participating_students,
              count(*)::int total_rounds,
              count(*) filter (where r.game_kind in
                ('match-up','quiz','find-the-match','anagram'))::int scored_rounds,
              coalesce(sum(r.correct_first_attempts) filter (where r.game_kind in
                ('match-up','quiz','find-the-match','anagram')),0)::int reported_correct,
              coalesce(sum(r.incorrect_first_attempts) filter (where r.game_kind in
                ('match-up','quiz','find-the-match','anagram')),0)::int reported_incorrect
         from interactive_game_practice_runs r
         join enrollments e on e.student_id=r.student_id
           and e.class_id=$1 and e.left_at is null
        where r.course_code=$2 and r.created_at >= now()-interval '30 days'`,
      [classId, courseCode],
    );
    const totals = summary.rows[0]!;
    const participating = Number(totals.participating_students ?? 0);
    const base = {
      classId,
      className: String(klass.name),
      courseCode,
      studentCount,
      periodDays: 30 as const,
      minimumParticipants: MIN_AGGREGATE_LEARNERS,
      assessed: false as const,
      privacy: 'aggregate_only' as const,
    };

    // Never return a one-person or tiny-group performance summary, even when
    // the class has many enrolled students but only a few active learners.
    if (participating < MIN_AGGREGATE_LEARNERS) {
      return { ...base, status: 'insufficient_data' as const };
    }

    const modes = await this.pool.query(
      `select r.game_kind, count(*)::int rounds
         from interactive_game_practice_runs r
         join enrollments e on e.student_id=r.student_id
           and e.class_id=$1 and e.left_at is null
        where r.course_code=$2 and r.created_at >= now()-interval '30 days'
        group by r.game_kind order by rounds desc, r.game_kind`,
      [classId, courseCode],
    );
    const difficult = await this.pool.query(
      `select gt.term, t.number chapter_no,
              count(distinct r.student_id)::int learners,
              sum(case when attempt.value->>'firstCorrect'='true' then 1 else 0 end)::int correct,
              sum(case when attempt.value->>'firstCorrect'='false' then 1 else 0 end)::int incorrect
         from interactive_game_practice_runs r
         join enrollments e on e.student_id=r.student_id
           and e.class_id=$1 and e.left_at is null
         cross join lateral jsonb_array_elements(r.attempts) attempt(value)
         join glossary_terms gt on gt.id::text=attempt.value->>'termId'
         join subtopics st on st.id=gt.subtopic_id
         join topics t on t.id=st.topic_id
         join syllabi sy on sy.id=t.syllabus_id
        where r.course_code=$2 and sy.code=$2 and sy.is_active=true
          and gt.is_glossary_visible=true and r.created_at >= now()-interval '30 days'
          and r.game_kind in ('match-up','quiz','find-the-match','anagram')
          and attempt.value ? 'firstCorrect'
        group by gt.id, gt.term, t.number
       having count(distinct r.student_id) >= 5
        order by incorrect desc, learners desc, gt.term
        limit 8`,
      [classId, courseCode],
    );
    return {
      ...base,
      status: 'ready' as const,
      participatingStudents: participating,
      totalRounds: Number(totals.total_rounds),
      scoredRounds: Number(totals.scored_rounds),
      reportedCorrect: Number(totals.reported_correct),
      reportedIncorrect: Number(totals.reported_incorrect),
      modes: modes.rows.map((row) => ({ mode: String(row.game_kind), rounds: Number(row.rounds) })),
      difficultTerms: difficult.rows.map((row) => ({
        term: String(row.term), chapterNo: Number(row.chapter_no),
        learners: Number(row.learners), correct: Number(row.correct), incorrect: Number(row.incorrect),
      })),
    };
  }
}
