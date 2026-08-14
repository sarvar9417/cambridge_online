import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import type { Actor } from '../lib/actor.js';
import { assertLatex, checkSvg, LatexError } from '../lib/latex.js';
import { DomainError } from './assignments-service.js';

const uuid = z.string().uuid();

export const markSchemePointSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^MP\d{1,2}$/, 'Mark point kodi MP1 ko‘rinishida bo‘lishi kerak'),
  text: z.string().trim().min(1).max(2000),
  textLatex: z.string().max(8000).nullable().optional(),
  marks: z.number().int().min(0).max(20).default(1),
  accept: z.array(z.string().trim().max(500)).max(20).default([]),
  reject: z.array(z.string().trim().max(500)).max(20).default([]),
  requires: z.array(z.string().trim().max(10)).max(10).default([]),
  isBod: z.boolean().default(false),
  groupLabel: z.string().trim().max(120).nullable().optional(),
});

export const markSchemeGroupSchema = z.object({
  label: z.string().trim().min(1).max(120),
  nRequired: z.number().int().min(1).max(20),
  marksPerPoint: z.number().int().min(1).max(10).default(1),
  maxMarks: z.number().int().min(1).max(50),
});

export const markSchemeSchema = z.object({
  schemeType: z.enum([
    'all_required',
    'any_n_from_m',
    'levels_of_response',
    'exact_match',
    'code_output',
    'manual_only',
  ]),
  maxMarks: z.number().int().min(1).max(50),
  guidanceMd: z.string().max(4000).nullable().optional(),
  guidanceLatex: z.string().max(8000).nullable().optional(),
  groups: z.array(markSchemeGroupSchema).max(10).default([]),
  points: z.array(markSchemePointSchema).max(40).default([]),
});

export const questionAssetSchema = z.object({
  kind: z.enum(['image', 'table', 'diagram', 'code']),
  altText: z.string().trim().min(1).max(300),
  contentMd: z.string().max(8000).nullable().optional(),
  latexSource: z.string().max(20000).nullable().optional(),
  svgMarkup: z.string().max(200000).nullable().optional(),
});

export const questionInputSchema = z.object({
  sourcePaperId: uuid,
  componentId: uuid,
  parentId: uuid.nullable().optional(),
  label: z.string().trim().min(1).max(20),
  path: z
    .string()
    .trim()
    .regex(/^[0-9a-z]+(\.[0-9a-z]+)*$/, 'path 3.b.ii ko‘rinishida bo‘lishi kerak'),
  displayRef: z.string().trim().min(1).max(120),
  stemMd: z.string().max(8000).nullable().optional(),
  stemLatex: z.string().max(8000).nullable().optional(),
  contextMd: z.string().max(8000).nullable().optional(),
  contextLatex: z.string().max(8000).nullable().optional(),
  bodyFormat: z.enum(['markdown', 'latex']).default('latex'),
  commandWord: z
    .enum([
      'State',
      'Give',
      'Name',
      'Identify',
      'Define',
      'Describe',
      'Explain',
      'Compare',
      'Calculate',
      'Complete',
      'Draw',
      'Write',
      'Evaluate',
      'Justify',
      'Suggest',
      'Show',
      'Other',
    ])
    .nullable()
    .optional(),
  marks: z.number().int().min(0).max(30).nullable().optional(),
  ao: z.enum(['AO1', 'AO2', 'AO3']).nullable().optional(),
  answerKind: z.enum(['text', 'pseudocode', 'code', 'image', 'table', 'diagram']).default('text'),
  answerLines: z.number().int().min(0).max(60).nullable().optional(),
  subtopicIds: z.array(uuid).min(1, 'Kamida bitta subtopic tanlang').max(3),
  primarySubtopicId: uuid.optional(),
  assets: z.array(questionAssetSchema).max(10).default([]),
  markScheme: markSchemeSchema.nullable().optional(),
});

export type QuestionInput = z.infer<typeof questionInputSchema>;

/**
 * Authoring of question-bank entries. Questions are written in LaTeX; every
 * fragment is validated against the KaTeX contract before it is stored so a
 * broken macro can never reach a student mid-exam.
 *
 * Everything a single question owns — stem, subtopics, assets, mark scheme —
 * is written in one transaction. A question that exists without its mark scheme
 * would trip validation rule V03 on the very next run.
 */
export class QuestionAuthoringService {
  constructor(private readonly pool: Pool) {}

  private assertOwner(actor: Actor) {
    if (actor.role !== 'owner') throw new DomainError('owner_only', 403);
  }

  private validateContent(input: QuestionInput) {
    assertLatex('stemLatex', input.stemLatex);
    assertLatex('contextLatex', input.contextLatex);

    if (input.bodyFormat === 'latex' && !input.stemLatex && !input.contextLatex) {
      throw new DomainError('latex_body_required', 422);
    }
    if (input.primarySubtopicId && !input.subtopicIds.includes(input.primarySubtopicId)) {
      throw new DomainError('primary_subtopic_not_selected', 422);
    }

    for (const [index, asset] of input.assets.entries()) {
      assertLatex(`assets.${index}.latexSource`, asset.latexSource);
      if (asset.svgMarkup) {
        const result = checkSvg(asset.svgMarkup);
        if (!result.ok) throw new LatexError(`assets.${index}.svgMarkup`, result.findings);
      }
      if (asset.kind === 'diagram' && !asset.svgMarkup) {
        // V10: a diagram question without a rendered diagram is unusable.
        throw new DomainError('diagram_asset_requires_svg', 422);
      }
    }

    const markScheme = input.markScheme;
    if (!markScheme) return;

    assertLatex('markScheme.guidanceLatex', markScheme.guidanceLatex);
    for (const [index, point] of markScheme.points.entries()) {
      assertLatex(`markScheme.points.${index}.textLatex`, point.textLatex);
    }

    const codes = markScheme.points.map((point) => point.code);
    if (new Set(codes).size !== codes.length) {
      throw new DomainError('duplicate_mark_point_code', 422);
    }
    for (const point of markScheme.points) {
      for (const required of point.requires) {
        if (!codes.includes(required)) throw new DomainError('requires_unknown_mark_point', 422);
      }
    }
    const groupLabels = new Set(markScheme.groups.map((group) => group.label));
    for (const point of markScheme.points) {
      if (point.groupLabel && !groupLabels.has(point.groupLabel)) {
        throw new DomainError('unknown_group_label', 422);
      }
    }
    // V01: an all_required scheme must add up to exactly its maximum.
    const total = markScheme.points.reduce((sum, point) => sum + point.marks, 0);
    if (markScheme.schemeType === 'all_required' && total !== markScheme.maxMarks) {
      throw new DomainError('mark_point_total_mismatch', 422);
    }
    if (markScheme.schemeType === 'any_n_from_m') {
      for (const group of markScheme.groups) {
        if (group.maxMarks > markScheme.maxMarks) throw new DomainError('group_exceeds_max', 422);
        const inGroup = markScheme.points.filter((point) => point.groupLabel === group.label);
        // V05: "any 3 from 5" needs more options than it awards.
        if (inGroup.length <= group.nRequired)
          throw new DomainError('group_needs_more_points', 422);
      }
    }
    if (input.marks !== null && input.marks !== undefined && markScheme.maxMarks !== input.marks) {
      throw new DomainError('mark_scheme_marks_mismatch', 422);
    }
  }

  /**
   * Hand-written questions still need a `source_papers` row to hang off, but the
   * author should never have to think about it. One house paper per component is
   * created on demand and reused; the sha256 is derived from the component id so
   * the unique index makes this idempotent.
   */
  async authoringContext(actor: Actor) {
    this.assertOwner(actor);
    const components = await this.pool.query(
      `select c.id, c.number, c.name, c.level, c.syllabus_id
       from components c join syllabi s on s.id = c.syllabus_id
       where s.is_active = true order by c.number`,
    );

    const context = [];
    for (const component of components.rows) {
      const sha256 = createHash('sha256').update(`campath:authoring:${component.id}`).digest('hex');
      const paper = await this.pool.query(
        `insert into source_papers (syllabus_id, component_id, year, series, variant, kind,
           storage_path, sha256, uploaded_by)
         values ($1, $2, $3, 'MJ', 9, 'QP', $4, $5, $6)
         on conflict (sha256) do update set sha256 = excluded.sha256
         returning id`,
        [
          component.syllabus_id,
          component.id,
          new Date().getUTCFullYear(),
          `authoring/component-${component.number}`,
          sha256,
          actor.id,
        ],
      );
      context.push({
        componentId: String(component.id),
        number: Number(component.number),
        name: String(component.name),
        level: String(component.level),
        sourcePaperId: String(paper.rows[0].id),
      });
    }
    return context;
  }

  async create(actor: Actor, input: QuestionInput) {
    this.assertOwner(actor);
    this.validateContent(input);

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const question = await client.query(
        `insert into questions (
           source_paper_id, component_id, parent_id, label, path, display_ref, depth, sort_order,
           stem_md, stem_latex, context_md, context_latex, body_format, command_word, marks, ao,
           answer_kind, answer_lines, status
         ) values (
           $1, $2, $3, $4, $5, $6, $7,
           coalesce((select max(sort_order) + 1 from questions where source_paper_id = $1), 1),
           $8, $9, $10, $11, $12::content_format, $13::command_word, $14, $15::ao_type,
           $16::answer_kind, $17, 'needs_review'
         ) returning id`,
        [
          input.sourcePaperId,
          input.componentId,
          input.parentId ?? null,
          input.label,
          input.path,
          input.displayRef,
          input.path.split('.').length - 1,
          input.stemMd ?? null,
          input.stemLatex ?? null,
          input.contextMd ?? null,
          input.contextLatex ?? null,
          input.bodyFormat,
          input.commandWord ?? null,
          input.marks ?? null,
          input.ao ?? null,
          input.answerKind,
          input.answerLines ?? null,
        ],
      );
      const questionId = String(question.rows[0].id);

      await this.writeRelations(client, questionId, input);
      await client.query('commit');
      return { id: questionId, status: 'needs_review' };
    } catch (error) {
      await client.query('rollback');
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        throw new DomainError('question_path_taken', 409);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async update(actor: Actor, questionId: string, input: QuestionInput) {
    this.assertOwner(actor);
    this.validateContent(input);

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const updated = await client.query(
        `update questions set
           label = $2, path = $3, display_ref = $4,
           stem_md = $5, stem_latex = $6, context_md = $7, context_latex = $8,
           body_format = $9::content_format, command_word = $10::command_word, marks = $11,
           ao = $12::ao_type, answer_kind = $13::answer_kind, answer_lines = $14,
           status = 'needs_review', updated_at = now()
         where id = $1 returning id`,
        [
          questionId,
          input.label,
          input.path,
          input.displayRef,
          input.stemMd ?? null,
          input.stemLatex ?? null,
          input.contextMd ?? null,
          input.contextLatex ?? null,
          input.bodyFormat,
          input.commandWord ?? null,
          input.marks ?? null,
          input.ao ?? null,
          input.answerKind,
          input.answerLines ?? null,
        ],
      );
      if (!updated.rowCount) throw new DomainError('not_found', 404);

      await client.query('delete from question_subtopics where question_id = $1', [questionId]);
      await client.query('delete from question_assets where question_id = $1', [questionId]);
      await client.query('delete from mark_schemes where question_id = $1', [questionId]);
      await this.writeRelations(client, questionId, input);

      await client.query(
        `insert into audit_log (actor_id, action, ref_table, ref_id)
         values ($1, 'question.update', 'questions', $2)`,
        [actor.id, questionId],
      );
      await client.query('commit');
      return { id: questionId, status: 'needs_review' };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async writeRelations(client: PoolClient, questionId: string, input: QuestionInput) {
    const primary = input.primarySubtopicId ?? input.subtopicIds[0]!;
    for (const subtopicId of input.subtopicIds) {
      await client.query(
        `insert into question_subtopics (question_id, subtopic_id, is_primary, set_by)
         values ($1, $2, $3, 'teacher')
         on conflict (question_id, subtopic_id) do update set is_primary = excluded.is_primary`,
        [questionId, subtopicId, subtopicId === primary],
      );
    }

    for (const [index, asset] of input.assets.entries()) {
      await client.query(
        `insert into question_assets (question_id, kind, content_md, latex_source, svg_markup, alt_text, sort_order)
         values ($1, $2::answer_kind, $3, $4, $5, $6, $7)`,
        [
          questionId,
          asset.kind,
          asset.contentMd ?? null,
          asset.latexSource ?? null,
          asset.svgMarkup ?? null,
          asset.altText,
          index,
        ],
      );
    }

    const markScheme = input.markScheme;
    if (!markScheme) return;

    const scheme = await client.query(
      `insert into mark_schemes (question_id, source_paper_id, scheme_type, max_marks,
         guidance_md, guidance_latex, body_format, status)
       values ($1, $2, $3::scheme_type, $4, $5, $6, $7::content_format, 'needs_review')
       returning id`,
      [
        questionId,
        input.sourcePaperId,
        markScheme.schemeType,
        markScheme.maxMarks,
        markScheme.guidanceMd ?? null,
        markScheme.guidanceLatex ?? null,
        input.bodyFormat,
      ],
    );
    const schemeId = String(scheme.rows[0].id);

    const groupIds = new Map<string, string>();
    for (const [index, group] of markScheme.groups.entries()) {
      const inserted = await client.query(
        `insert into mark_scheme_groups (mark_scheme_id, label, n_required, marks_per_point, max_marks, sort_order)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [schemeId, group.label, group.nRequired, group.marksPerPoint, group.maxMarks, index],
      );
      groupIds.set(group.label, String(inserted.rows[0].id));
    }

    for (const [index, point] of markScheme.points.entries()) {
      await client.query(
        `insert into mark_scheme_points (mark_scheme_id, group_id, code, text, text_latex, marks,
           accept, reject, requires, is_bod, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11)`,
        [
          schemeId,
          point.groupLabel ? (groupIds.get(point.groupLabel) ?? null) : null,
          point.code,
          point.text,
          point.textLatex ?? null,
          point.marks,
          JSON.stringify(point.accept),
          JSON.stringify(point.reject),
          JSON.stringify(point.requires),
          point.isBod,
          index,
        ],
      );
    }
  }
}
