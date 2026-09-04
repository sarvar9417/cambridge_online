import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { sm2 } from '../lib/srs.js';
import { DomainError } from './assignments-service.js';

export class ContentService {
  constructor(private pool: Pool) {}

  private student(actor: Actor) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
  }

  async lessonProgress(actor: Actor) {
    this.student(actor);
    const result = await this.pool.query(
      `select chapter_no,slide_id,visited_at,completed_at
       from student_lesson_progress
       where student_id=$1
       order by chapter_no,visited_at`,
      [actor.id],
    );
    return result.rows.map((row) => ({
      chapterNo: Number(row.chapter_no),
      slideId: row.slide_id,
      visitedAt: row.visited_at,
      completedAt: row.completed_at,
    }));
  }

  async touchLesson(actor: Actor, input: { chapterNo: number; slideId: string; completed: boolean }) {
    this.student(actor);
    const result = await this.pool.query(
      `insert into student_lesson_progress(student_id,chapter_no,slide_id,visited_at,completed_at)
       values($1,$2,$3,now(),case when $4 then now() else null end)
       on conflict(student_id,chapter_no,slide_id) do update set
         visited_at=now(),
         completed_at=case when $4 then coalesce(student_lesson_progress.completed_at,now()) else student_lesson_progress.completed_at end
       returning chapter_no,slide_id,visited_at,completed_at`,
      [actor.id, input.chapterNo, input.slideId, input.completed],
    );
    const row = result.rows[0];
    return {
      chapterNo: Number(row.chapter_no),
      slideId: row.slide_id,
      visitedAt: row.visited_at,
      completedAt: row.completed_at,
    };
  }

  async due(actor: Actor) {
    this.student(actor);
    const result = await this.pool.query(
      `select fr.flashcard_id,fc.front_md,fc.back_md,fc.hint_md,fr.ease_factor,fr.interval_days,
              fr.repetitions,fr.lapses,fr.due_at
       from flashcard_reviews fr join flashcards fc on fc.id=fr.flashcard_id
       where fr.user_id=$1 and fr.due_at<=now()
       order by fr.due_at limit 50`,
      [actor.id],
    );
    return result.rows;
  }

  async review(actor: Actor, cardId: string, grade: number) {
    this.student(actor);
    const result = await this.pool.query(
      `select ease_factor,interval_days,repetitions,lapses
       from flashcard_reviews where user_id=$1 and flashcard_id=$2`,
      [actor.id, cardId],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    const next = sm2({
      easeFactor: Number(result.rows[0].ease_factor),
      intervalDays: result.rows[0].interval_days,
      repetitions: result.rows[0].repetitions,
      lapses: result.rows[0].lapses,
    }, grade);
    await this.pool.query(
      `update flashcard_reviews
       set ease_factor=$3,interval_days=$4,repetitions=$5,lapses=$6,due_at=$7,last_grade=$8,last_reviewed_at=now()
       where user_id=$1 and flashcard_id=$2`,
      [actor.id, cardId, next.easeFactor, next.intervalDays, next.repetitions, next.lapses, next.dueAt, next.lastGrade],
    );
    return next;
  }

  async games(actor: Actor) {
    this.student(actor);
    const glossary = await this.pool.query(
      `select distinct gt.id,gt.term,gt.definition_en definition
       from glossary_terms gt join subtopics st on st.id=gt.subtopic_id join topics t on t.id=st.topic_id
       join classes c on c.syllabus_id=t.syllabus_id join enrollments e on e.class_id=c.id and e.left_at is null
       where e.student_id=$1 and gt.status='approved' order by gt.term limit 8`,
      [actor.id],
    );
    const objectives = await this.pool.query(
      `select distinct lo.id,lo.code,lo.text,lo.sort_order
       from learning_objectives lo join subtopics st on st.id=lo.subtopic_id join topics t on t.id=st.topic_id
       join classes c on c.syllabus_id=t.syllabus_id join enrollments e on e.class_id=c.id and e.left_at is null
       where e.student_id=$1 order by lo.sort_order,lo.code limit 6`,
      [actor.id],
    );
    const terms = glossary.rows.map((row) => ({ id: row.id, term: row.term, definition: row.definition }));
    return {
      termMatch: terms,
      sequence: objectives.rows.map((row) => ({ id: row.id, code: row.code, text: row.text })),
      spotTheGap: terms.map((row) => ({ id: row.id, prompt: `_____ — ${row.definition}`, answer: row.term })),
    };
  }

  async list(_actor: Actor) {
    const result = await this.pool.query(
      `select ci.id,ci.kind,ci.title,ci.body_md,st.code subtopic_code,st.title subtopic_title
       from content_items ci join subtopics st on st.id=ci.subtopic_id
       where ci.status='approved' order by st.code,ci.sort_order`,
    );
    return result.rows;
  }
}
