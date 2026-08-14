import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';

export interface QuestionFilters {
  q?: string;
  commandWord?: string;
  marksMin?: number;
  marksMax?: number;
  subtopicIds?: string[];
  topicNumbers?: number[];
  componentNumber?: number;
  /** Inclusive source-paper year range; `12-api.md` section 3. */
  yearFrom?: number;
  yearTo?: number;
  /** Only questions never used in this class's assignments (`12-api.md` section 3). */
  unusedInClassId?: string;
  status?: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived';
  limit?: number;
  /** Opaque cursor from a previous page. */
  cursor?: string;
}

export interface QuestionRow {
  id: string;
  displayRef: string;
  stemMd: string | null;
  stemLatex: string | null;
  contextMd: string | null;
  contextLatex: string | null;
  bodyFormat: 'markdown' | 'latex';
  commandWord: string | null;
  marks: number | null;
  ao: string | null;
  answerKind: string;
  status: string;
  subtopics: Array<{ id: string; code: string; title: string; isPrimary: boolean }>;
  assets: Array<{ id: string; kind: string; altText: string; svgMarkup: string | null }>;
  parent: {
    id: string;
    displayRef: string;
    contextMd: string | null;
    contextLatex: string | null;
  } | null;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Cursor is `sortOrder|id` base64url encoded. Keyset paging keeps deep pages
 * cheap; `12-api.md` section 2.2 rules out offset paging for the question bank.
 */
const encodeCursor = (sortOrder: number, id: string) =>
  Buffer.from(`${sortOrder}|${id}`).toString('base64url');

const decodeCursor = (cursor: string): { sortOrder: number; id: string } | null => {
  const [sortOrder, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (!id || sortOrder === undefined || Number.isNaN(Number(sortOrder))) return null;
  return { sortOrder: Number(sortOrder), id };
};

const mapQuestion = (row: Record<string, any>): QuestionRow => ({
  id: String(row.id),
  displayRef: String(row.display_ref),
  stemMd: row.stem_md ?? null,
  stemLatex: row.stem_latex ?? null,
  contextMd: row.context_md ?? null,
  contextLatex: row.context_latex ?? null,
  bodyFormat: row.body_format ?? 'markdown',
  commandWord: row.command_word ?? null,
  marks: row.marks === null || row.marks === undefined ? null : Number(row.marks),
  ao: row.ao ?? null,
  answerKind: String(row.answer_kind),
  status: String(row.status),
  subtopics: row.subtopics ?? [],
  assets: row.assets ?? [],
  parent: row.parent?.id ? row.parent : null,
});

const SELECT_QUESTION = `
  select q.id, q.display_ref, q.stem_md, q.stem_latex, q.context_md, q.context_latex,
         q.body_format, q.command_word, q.marks, q.ao, q.answer_kind, q.status, q.sort_order,
         case when p.id is null then null else
           json_build_object('id', p.id, 'displayRef', p.display_ref,
                             'contextMd', p.context_md, 'contextLatex', p.context_latex)
         end as parent,
         coalesce((
           select json_agg(json_build_object('id', s.id, 'code', s.code, 'title', s.title,
                                             'isPrimary', qs.is_primary) order by qs.is_primary desc, s.code)
           from question_subtopics qs join subtopics s on s.id = qs.subtopic_id
           where qs.question_id = q.id
         ), '[]'::json) as subtopics,
         coalesce((
           select json_agg(json_build_object('id', a.id, 'kind', a.kind, 'altText', a.alt_text,
                                             'svgMarkup', a.svg_markup) order by a.sort_order)
           from question_assets a where a.question_id = q.id
         ), '[]'::json) as assets
  from questions q
  left join questions p on p.id = q.parent_id
`;

export class PgQuestionsRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Builds the WHERE clause shared by list and detail reads. Student scoping
   * lives here rather than in the route so no caller can forget it.
   */
  private scope(actor: Actor, filters: QuestionFilters, values: unknown[]) {
    const conditions: string[] = ['q.marks is not null'];

    if (actor.role === 'student') {
      // Students only ever see questions from a published assignment of a class
      // they are currently enrolled in.
      values.push(actor.id);
      conditions.push(`q.status = 'approved'`);
      conditions.push(`exists (
        select 1 from assignment_questions aq
        join assignments a on a.id = aq.assignment_id
        join enrollments e on e.class_id = a.class_id
        where aq.question_id = q.id and e.student_id = $${values.length}
          and e.left_at is null and a.published_at is not null
      )`);
    } else if (filters.status) {
      values.push(filters.status);
      conditions.push(`q.status = $${values.length}::review_status`);
    }

    if (filters.q) {
      values.push(filters.q);
      conditions.push(
        `to_tsvector('english', coalesce(q.stem_md, '') || ' ' || coalesce(q.stem_latex, ''))
         @@ plainto_tsquery('english', $${values.length})`,
      );
    }
    if (filters.commandWord) {
      values.push(filters.commandWord);
      conditions.push(`q.command_word::text = $${values.length}`);
    }
    if (filters.marksMin !== undefined) {
      values.push(filters.marksMin);
      conditions.push(`q.marks >= $${values.length}`);
    }
    if (filters.marksMax !== undefined) {
      values.push(filters.marksMax);
      conditions.push(`q.marks <= $${values.length}`);
    }
    if (filters.subtopicIds?.length) {
      values.push(filters.subtopicIds);
      conditions.push(`exists (
        select 1 from question_subtopics qs
        where qs.question_id = q.id and qs.subtopic_id = any($${values.length}::uuid[])
      )`);
    }
    if (filters.topicNumbers?.length) {
      values.push(filters.topicNumbers);
      conditions.push(`exists (
        select 1 from question_subtopics qs
        join subtopics s on s.id = qs.subtopic_id
        join topics t on t.id = s.topic_id
        where qs.question_id = q.id and t.number = any($${values.length}::int[])
      )`);
    }
    if (filters.componentNumber !== undefined) {
      values.push(filters.componentNumber);
      conditions.push(`exists (
        select 1 from components c where c.id = q.component_id and c.number = $${values.length}
      )`);
    }
    if (filters.yearFrom !== undefined) {
      values.push(filters.yearFrom);
      conditions.push(`exists (
        select 1 from source_papers sp
        where sp.id = q.source_paper_id and sp.year >= $${values.length}
      )`);
    }
    if (filters.yearTo !== undefined) {
      values.push(filters.yearTo);
      conditions.push(`exists (
        select 1 from source_papers sp
        where sp.id = q.source_paper_id and sp.year <= $${values.length}
      )`);
    }
    if (filters.unusedInClassId) {
      values.push(filters.unusedInClassId);
      conditions.push(`not exists (
        select 1 from assignment_questions aq
        join assignments a on a.id = aq.assignment_id
        where aq.question_id = q.id and a.class_id = $${values.length}
          and a.archived_at is null
      )`);
    }

    return conditions;
  }

  async findVisible(actor: Actor, filters: QuestionFilters) {
    const values: unknown[] = [];
    const conditions = this.scope(actor, filters, values);

    if (filters.cursor) {
      const cursor = decodeCursor(filters.cursor);
      if (cursor) {
        values.push(cursor.sortOrder, cursor.id);
        conditions.push(
          `(q.sort_order, q.id) > ($${values.length - 1}::int, $${values.length}::uuid)`,
        );
      }
    }

    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    values.push(limit + 1);

    const result = await this.pool.query(
      `${SELECT_QUESTION}
       where ${conditions.join(' and ')}
       order by q.sort_order, q.id
       limit $${values.length}`,
      values,
    );

    const rows = result.rows.slice(0, limit);
    const last = rows.at(-1);
    return {
      data: rows.map(mapQuestion),
      nextCursor:
        result.rows.length > limit && last ? encodeCursor(Number(last.sort_order), last.id) : null,
    };
  }

  /** Looks the question up directly — never by scanning a page of results. */
  async findOne(actor: Actor, id: string) {
    const values: unknown[] = [];
    const conditions = this.scope(actor, {}, values);
    values.push(id);
    conditions.push(`q.id = $${values.length}::uuid`);

    const result = await this.pool.query(
      `${SELECT_QUESTION} where ${conditions.join(' and ')} limit 1`,
      values,
    );
    return result.rows[0] ? mapQuestion(result.rows[0]) : null;
  }

  /**
   * Mark schemes are staff-only. `02-data-model.md` section 12.5 makes this a
   * serializer-level rule: students must never receive the field at all, so the
   * read lives in a separate method that route handlers gate on role.
   */
  async findMarkScheme(actor: Actor, questionId: string) {
    // `02-data-model.md` section 12.4: staff read mark schemes freely, a student
    // only after their own grade for that question has been released. The rule is
    // enforced inside the SQL — "the frontend does not show it" is not enough,
    // and a caller must not be able to skip the check by forgetting a guard.
    const result = await this.pool.query(
      `select ms.id, ms.scheme_type, ms.max_marks, ms.guidance_md, ms.guidance_latex, ms.status,
              coalesce((
                select json_agg(json_build_object(
                  'id', p.id, 'code', p.code, 'text', p.text, 'textLatex', p.text_latex,
                  'marks', p.marks, 'accept', p.accept, 'reject', p.reject,
                  'requires', p.requires, 'isBod', p.is_bod, 'groupId', p.group_id
                ) order by p.sort_order, p.code)
                from mark_scheme_points p where p.mark_scheme_id = ms.id
              ), '[]'::json) as points,
              coalesce((
                select json_agg(json_build_object('id', g.id, 'label', g.label,
                  'nRequired', g.n_required, 'marksPerPoint', g.marks_per_point, 'maxMarks', g.max_marks)
                  order by g.sort_order)
                from mark_scheme_groups g where g.mark_scheme_id = ms.id
              ), '[]'::json) as groups
       from mark_schemes ms
       where ms.question_id = $1 and ($2 <> 'student' or exists(
         select 1 from submissions sub
         join assignment_questions aq on aq.assignment_id = sub.assignment_id
         where sub.student_id = $3 and sub.released_at is not null
           and aq.question_id = ms.question_id
       ))`,
      [questionId, actor.role, actor.id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      schemeType: String(row.scheme_type),
      maxMarks: Number(row.max_marks),
      guidanceMd: row.guidance_md ?? null,
      guidanceLatex: row.guidance_latex ?? null,
      status: String(row.status),
      points: row.points,
      groups: row.groups,
    };
  }

  async approve(actor: Actor, id: string) {
    if (actor.role !== 'owner') return null;
    const result = await this.pool.query(
      `update questions set status = 'approved', reviewed_by = $2, reviewed_at = now(), updated_at = now()
       where id = $1 returning id, status`,
      [id, actor.id],
    );
    return result.rows[0] ?? null;
  }
}
