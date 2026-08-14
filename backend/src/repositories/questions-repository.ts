import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { serializeQuestion } from '../services/question-serializer.js';

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
    const result = await this.pool.query(
      `select q.id,q.display_ref,q.stem_md,q.context_md,q.command_word,q.marks,q.ao,q.answer_kind,
        json_build_object('id',p.id,'displayRef',p.display_ref,'contextMd',p.context_md) parent,
        case when $2<>'student' then true else exists(
          select 1 from submissions s join assignment_questions aq on aq.assignment_id=s.assignment_id
          where s.student_id=$3 and s.released_at is not null and aq.question_id=q.id
        ) end can_view_scheme,
        (select jsonb_build_object(
          'id',ms.id,'schemeType',ms.scheme_type,'maxMarks',ms.max_marks,'guidanceMd',ms.guidance_md,
          'points',coalesce((select jsonb_agg(jsonb_build_object(
            'id',msp.id,'code',msp.code,'text',msp.text,'marks',msp.marks,'accept',msp.accept,
            'reject',msp.reject,'requires',msp.requires,'isBod',msp.is_bod
          ) order by msp.sort_order) from mark_scheme_points msp where msp.mark_scheme_id=ms.id),'[]'::jsonb),
          'groups',coalesce((select jsonb_agg(jsonb_build_object(
            'id',msg.id,'label',msg.label,'nRequired',msg.n_required,
            'marksPerPoint',msg.marks_per_point,'maxMarks',msg.max_marks
          ) order by msg.id) from mark_scheme_groups msg where msg.mark_scheme_id=ms.id),'[]'::jsonb)
        ) from mark_schemes ms where ms.question_id=q.id and ms.status='approved' limit 1) mark_scheme
       from questions q left join questions p on p.id=q.parent_id
       where q.id=$1 and q.status='approved' and ($2<>'student' or exists(
         select 1 from assignment_questions aq join assignments a on a.id=aq.assignment_id
         join enrollments e on e.class_id=a.class_id
         where aq.question_id=q.id and e.student_id=$3 and e.left_at is null and a.published_at is not null
       ))`,
      [id, actor.role, actor.id],
    );
    return result.rows[0] ? serializeQuestion(result.rows[0]) : null;
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
