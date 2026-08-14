import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';

export interface QuestionFilters { q?: string; commandWord?: string; marksMin?: number; marksMax?: number; }

export class PgQuestionsRepository {
  constructor(private readonly pool: Pool) {}

  async findVisible(actor: Actor, filters: QuestionFilters) {
    const values: unknown[] = [];
    const conditions = [`q.marks is not null`, `q.status = 'approved'`];
    if (filters.q) { values.push(filters.q); conditions.push(`to_tsvector('english', coalesce(q.stem_md,'')) @@ plainto_tsquery('english', $${values.length})`); }
    if (filters.commandWord) { values.push(filters.commandWord); conditions.push(`q.command_word::text = $${values.length}`); }
    if (filters.marksMin !== undefined) { values.push(filters.marksMin); conditions.push(`q.marks >= $${values.length}`); }
    if (filters.marksMax !== undefined) { values.push(filters.marksMax); conditions.push(`q.marks <= $${values.length}`); }
    if (actor.role === 'student') {
      values.push(actor.id);
      conditions.push(`exists (
        select 1 from assignment_questions aq join assignments a on a.id=aq.assignment_id
        join enrollments e on e.class_id=a.class_id
        where aq.question_id=q.id and e.student_id=$${values.length} and e.left_at is null and a.published_at is not null
      )`);
    }
    const result = await this.pool.query(
      `select q.id, q.display_ref, q.stem_md, q.context_md, q.command_word, q.marks, q.ao, q.answer_kind,
        json_build_object('id', p.id, 'displayRef', p.display_ref, 'contextMd', p.context_md) as parent
       from questions q left join questions p on p.id=q.parent_id
       where ${conditions.join(' and ')} order by q.sort_order limit 50`, values,
    );
    return result.rows.map((row) => ({
      id: row.id, displayRef: row.display_ref, stemMd: row.stem_md, contextMd: row.context_md,
      commandWord: row.command_word, marks: row.marks, ao: row.ao, answerKind: row.answer_kind, parent: row.parent,
    }));
  }

  async findOne(actor: Actor, id: string) {
    const rows = await this.findVisible(actor, {});
    return rows.find((question) => question.id === id) ?? null;
  }

  async approve(actor: Actor, id: string) {
    if (actor.role !== 'owner') return null;
    const result = await this.pool.query(
      `update questions set status='approved',reviewed_by=$2,reviewed_at=now(),updated_at=now()
       where id=$1 returning id,status`, [id, actor.id],
    );
    return result.rows[0] ?? null;
  }
}
