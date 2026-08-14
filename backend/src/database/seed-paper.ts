/**
 * Shared database writer for transcribed past papers. Each paper has a pure
 * data module (e.g. `paper-9618-s23-11.ts`) plus a thin seed script that calls
 * `writePaper` with the paper and its document metadata.
 *
 * The writer maps the transcript tree onto the question-bank schema: a
 * `source_papers` row for QP and MS, one `questions` row per node (context
 * nodes carry shared text, leaves carry stem + command + marks + mark scheme),
 * `question_subtopics` links and mark scheme points/groups. Everything runs in
 * one transaction and is idempotent: re-running updates the transcript in place.
 */

import { createHash } from 'node:crypto';
import { pool } from './client.js';
import { flattenPaper, type SeedNode, type SeedLeaf } from './paper-9618-s23-11.js';

if (!pool) throw new Error('DATABASE_URL is required');
const db = pool;

export interface PaperMeta {
  /** Storage path for the source question paper, e.g. "drive/9618_s23_qp_12.pdf". */
  qpPath: string;
  /** Storage path for the mark scheme, e.g. "drive/9618_s23_ms_12.pdf". */
  msPath: string;
  /** Component number (1..4). Paper 1 transcripts use 1. */
  component?: number;
  /** Cambridge variant suffix, e.g. 9618/12 → 2. Defaults to 1. */
  variant?: number;
  /** Exam year, default 2023. */
  year?: number;
  /** Exam series: 'MJ' (May/June) or 'ON' (Oct/Nov). Default 'MJ'. */
  series?: 'MJ' | 'ON';
  /** Unique seed for the source paper hashes (usually the Cambridge filename). */
  qpSeed: string;
  msSeed: string;
}

export interface WriteOptions {
  /**
   * When false the connection pool is left open so the caller can write several
   * papers in one process (see seed-papers-all.ts). Defaults to true.
   */
  closePool?: boolean;
}

export async function writePaper(paper: SeedNode[], meta: PaperMeta, options?: WriteOptions): Promise<void> {
  const component = meta.component ?? 1;
  const year = meta.year ?? 2023;
  const series = meta.series ?? 'MJ';
  const seriesLabel = series === 'ON' ? 'O/N' : 'M/J';
  const client = await db.connect();

  try {
    await client.query('begin');
    const row = (
      await client.query<{ syllabus_id: string; component_id: string; owner_id: string }>(
        `select s.id as syllabus_id, c.id as component_id, u.id as owner_id
         from syllabi s
         join components c on c.syllabus_id = s.id and c.number = $1
         join users u on u.role = 'owner'
         where s.code = '9618' order by u.created_at limit 1`,
        [component],
      )
    ).rows[0];
    if (!row) throw new Error('Run the base seed before the paper seed');

    const variant = meta.variant ?? 1;
    // Real document hashes keep source_papers unique and the paper traceable.
    const qpSha = createHash('sha256').update(meta.qpSeed).digest('hex');
    const msSha = createHash('sha256').update(meta.msSeed).digest('hex');
    const qp = await client.query<{ id: string }>(
      `insert into source_papers (syllabus_id, component_id, year, series, variant, kind, storage_path, sha256, uploaded_by)
       values ($1, $2, $3, $4::exam_series, $5, 'QP', $6, $7, $8)
       on conflict (sha256) do update set storage_path = excluded.storage_path returning id`,
      [row.syllabus_id, row.component_id, year, series, variant, meta.qpPath, qpSha, row.owner_id],
    );
    const ms = await client.query<{ id: string }>(
      `insert into source_papers (syllabus_id, component_id, year, series, variant, kind, storage_path, sha256, uploaded_by)
       values ($1, $2, $3, $4::exam_series, $5, 'MS', $6, $7, $8)
       on conflict (sha256) do update set storage_path = excluded.storage_path returning id`,
      [row.syllabus_id, row.component_id, year, series, variant, meta.msPath, msSha, row.owner_id],
    );

    // Subtopic lookup by syllabus code (e.g. "1.2" — subtopics.code already
    // carries the full dotted code, so no concat needed).
    const subtopics = await client.query<{ id: string; code: string }>(
      `select st.id, st.code
       from subtopics st join topics t on t.id = st.topic_id
       join syllabi s on s.id = t.syllabus_id where s.code = '9618'`,
    );
    const subtopicIds = new Map(subtopics.rows.map((s) => [s.code, s.id]));

    const insertQuestion = async (
      paperId: string,
      item: SeedNode | SeedLeaf,
      parentId: string | null,
      path: string,
      sortOrder: number,
    ) => {
      const depth = path.split('.').length - 1;
      const isLeaf = !('children' in item);
      const displayRef =
        'displayRef' in item ? item.displayRef : `9618/${component}${variant}/${seriesLabel}/${String(year).slice(-2)} Q${path.replace(/\./g, '')}`;
      const subtopicCodes = isLeaf ? (item as SeedLeaf).subtopics : (item as SeedNode).subtopics ?? [];
      const subtopicIdsList = subtopicCodes.map((code) => {
        const id = subtopicIds.get(code);
        if (!id) throw new Error(`Unknown subtopic code ${code}`);
        return id;
      });

      // The 0010 check requires a body in latex format; a context node without
      // any shared text (e.g. Q6, which starts straight at 6(a)) stays markdown.
      const bodyFormat = isLeaf || item.contextLatex ? 'latex' : 'markdown';
      const q = await client.query<{ id: string }>(
        `insert into questions (
           source_paper_id, component_id, parent_id, label, path, display_ref, depth, sort_order,
           stem_latex, context_latex, body_format, command_word, marks, ao, answer_kind, answer_lines,
           status
         ) values (
           $1, $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11::content_format, $12::command_word, $13, $14::ao_type, $15::answer_kind, $16, 'approved'
         )
         on conflict (source_paper_id, path) do update set
           stem_latex = excluded.stem_latex, context_latex = excluded.context_latex,
           marks = excluded.marks, command_word = excluded.command_word
         returning id`,
        [
          paperId,
          row.component_id,
          parentId,
          item.label,
          path,
          displayRef,
          depth,
          sortOrder,
          isLeaf ? (item as SeedLeaf).stemLatex ?? null : null,
          item.contextLatex ?? null,
          bodyFormat,
          isLeaf ? (item as SeedLeaf).command : null,
          isLeaf ? (item as SeedLeaf).marks : null,
          isLeaf ? ((item as SeedLeaf).ao ?? null) : null,
          isLeaf ? ((item as SeedLeaf).answerKind ?? 'text') : 'text',
          isLeaf ? ((item as SeedLeaf).answerLines ?? null) : null,
        ],
      );
      const questionId = String(q.rows[0]!.id);

      await client.query('delete from question_subtopics where question_id = $1', [questionId]);
      for (const [index, subtopicId] of subtopicIdsList.entries()) {
        await client.query(
          `insert into question_subtopics (question_id, subtopic_id, is_primary, set_by, weight)
           values ($1, $2, $3, 'teacher', 1.0)`,
          [questionId, subtopicId, index === 0],
        );
      }

      if (isLeaf) {
        const leaf = item as SeedLeaf;
        await client.query('delete from mark_schemes where question_id = $1', [questionId]);
        const scheme = await client.query<{ id: string }>(
          `insert into mark_schemes (question_id, source_paper_id, scheme_type, max_marks, guidance_latex, body_format, status)
           values ($1, $2, $3::scheme_type, $4, $5, 'latex', 'approved') returning id`,
          [questionId, ms.rows[0]!.id, leaf.scheme.type, leaf.scheme.maxMarks, leaf.scheme.guidance ?? null],
        );
        const schemeId = String(scheme.rows[0]!.id);
        await client.query('delete from mark_scheme_groups where mark_scheme_id = $1', [schemeId]);
        await client.query('delete from mark_scheme_points where mark_scheme_id = $1', [schemeId]);

        const groupIds = new Map<string, string>();
        for (const [index, group] of (leaf.scheme.groups ?? []).entries()) {
          const inserted = await client.query<{ id: string }>(
            `insert into mark_scheme_groups (mark_scheme_id, label, n_required, marks_per_point, max_marks, sort_order)
             values ($1, $2, $3, $4, $5, $6) returning id`,
            [schemeId, group.label, group.nRequired, group.marksPerPoint, group.maxMarks, index],
          );
          groupIds.set(group.label, String(inserted.rows[0]!.id));
        }
        for (const [index, point] of leaf.scheme.points.entries()) {
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
              point.marks ?? 1,
              JSON.stringify(point.accept ?? []),
              JSON.stringify(point.reject ?? []),
              JSON.stringify(point.requires ?? []),
              point.isBod ?? false,
              index,
            ],
          );
        }
      }

      if ('children' in item) {
        for (const [index, child] of item.children.entries()) {
          await insertQuestion(paperId, child, questionId, child.path, index + 1);
        }
      }
    };

    for (const [index, node] of paper.entries()) {
      await insertQuestion(qp.rows[0]!.id, node, null, node.path, index + 1);
    }

    await client.query('commit');
    const counts = await client.query(
      `select count(*)::int as questions,
              (select count(*)::int from mark_schemes where source_paper_id = $1) as schemes
       from questions where source_paper_id = $2`,
      [ms.rows[0]!.id, qp.rows[0]!.id],
    );
    const totalMarks = flattenPaper(paper)
      .filter((item) => !('children' in item))
      .reduce((sum, item) => sum + (item as SeedLeaf).marks, 0);
    console.log(
      `Seeded ${meta.qpPath}: ${counts.rows[0]!.questions} question nodes, ` +
        `${counts.rows[0]!.schemes} mark schemes, ${totalMarks} marks`,
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    if (options?.closePool !== false) await db.end();
  }
}
