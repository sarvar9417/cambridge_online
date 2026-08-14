import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { sm2 } from '../lib/srs.js';
import { DomainError } from './assignments-service.js';
export class ContentService {
  constructor(private pool: Pool) {}
  async due(a: Actor) {
    if (a.role !== 'student') throw new DomainError('students_only', 403);
    const r = await this.pool.query(
      `select fr.flashcard_id,fc.front_md,fc.back_md,fc.hint_md,fr.ease_factor,fr.interval_days,fr.repetitions,fr.lapses,fr.due_at from flashcard_reviews fr join flashcards fc on fc.id=fr.flashcard_id where fr.user_id=$1 and fr.due_at<=now() order by fr.due_at limit 50`,
      [a.id],
    );
    return r.rows;
  }
  async review(a: Actor, cardId: string, grade: number) {
    if (a.role !== 'student') throw new DomainError('students_only', 403);
    const r = await this.pool.query(
      `select ease_factor,interval_days,repetitions,lapses from flashcard_reviews where user_id=$1 and flashcard_id=$2`,
      [a.id, cardId],
    );
    if (!r.rowCount) throw new DomainError('not_found', 404);
    const next = sm2(
      {
        easeFactor: Number(r.rows[0].ease_factor),
        intervalDays: r.rows[0].interval_days,
        repetitions: r.rows[0].repetitions,
        lapses: r.rows[0].lapses,
      },
      grade,
    );
    await this.pool.query(
      `update flashcard_reviews set ease_factor=$3,interval_days=$4,repetitions=$5,lapses=$6,due_at=$7,last_grade=$8,last_reviewed_at=now()where user_id=$1 and flashcard_id=$2`,
      [
        a.id,
        cardId,
        next.easeFactor,
        next.intervalDays,
        next.repetitions,
        next.lapses,
        next.dueAt,
        next.lastGrade,
      ],
    );
    return next;
  }
  // Approved content is visible to every signed-in user, so the actor is unused
  // here; it stays in the signature because every repository read takes one.
  async list(_actor: Actor) {
    const r = await this.pool.query(
      `select ci.id,ci.kind,ci.title,ci.body_md,st.code subtopic_code,st.title subtopic_title from content_items ci join subtopics st on st.id=ci.subtopic_id where ci.status='approved' order by st.code,ci.sort_order`,
    );
    return r.rows;
  }
}
