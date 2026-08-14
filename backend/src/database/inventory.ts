import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pool } from './client.js';

/**
 * Read-only inventory of the live CamPath academic database.
 *
 * This script never writes to application tables. It opens a READ ONLY
 * transaction and reports corpus counts plus per-paper coverage. The output is
 * intentionally compatible with scripts/reconcile-inventory.py.
 *
 * Usage:
 *   npm run db:inventory -w backend
 *   npm run db:inventory -w backend -- --json-out /tmp/db-inventory.json
 */

if (!pool) throw new Error('DATABASE_URL is required');

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

const jsonOut = getArg('--json-out');
const client = await pool.connect();

try {
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout = '30s'");

  const migrationsResult = await client.query(
    'SELECT name, applied_at FROM schema_migrations ORDER BY name',
  );

  const dependenciesTableResult = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'question_dependencies'
    ) AS present
  `);

  const countsResult = await client.query(`
    SELECT
      (SELECT count(*) FROM source_papers) AS source_papers,
      (SELECT count(*) FROM questions) AS questions,
      (SELECT count(*) FROM questions q WHERE NOT EXISTS (
        SELECT 1 FROM questions child WHERE child.parent_id = q.id
      )) AS leaf_questions,
      (SELECT count(*) FROM questions WHERE status = 'approved') AS approved_questions,
      (SELECT count(*) FROM mark_schemes) AS mark_schemes,
      (SELECT count(*) FROM mark_schemes WHERE status = 'approved') AS approved_mark_schemes,
      (SELECT count(*) FROM mark_scheme_points) AS mark_scheme_points,
      (SELECT count(*) FROM question_subtopics) AS question_subtopic_links,
      (SELECT count(*) FROM questions q
        WHERE NOT EXISTS (SELECT 1 FROM questions child WHERE child.parent_id = q.id)
          AND NOT EXISTS (SELECT 1 FROM question_subtopics qs WHERE qs.question_id = q.id)
      ) AS untagged_leaf_questions,
      (SELECT count(*) FROM questions q
        WHERE NOT EXISTS (SELECT 1 FROM questions child WHERE child.parent_id = q.id)
          AND q.marks IS NOT NULL
          AND q.marks > 0
          AND NOT EXISTS (SELECT 1 FROM mark_schemes ms WHERE ms.question_id = q.id)
      ) AS leaves_without_mark_scheme
  `);

  const paperResult = await client.query(`
    WITH question_shape AS (
      SELECT
        q.*,
        NOT EXISTS (
          SELECT 1 FROM questions child WHERE child.parent_id = q.id
        ) AS is_leaf
      FROM questions q
    ),
    question_metrics AS (
      SELECT
        q.source_paper_id,
        count(*) AS question_nodes,
        count(*) FILTER (WHERE q.is_leaf) AS leaf_questions,
        coalesce(sum(q.marks) FILTER (WHERE q.is_leaf), 0) AS actual_leaf_marks,
        count(*) FILTER (WHERE q.is_leaf AND q.status = 'approved') AS approved_leaf_questions,
        count(*) FILTER (
          WHERE q.is_leaf AND EXISTS (
            SELECT 1 FROM question_subtopics qs WHERE qs.question_id = q.id
          )
        ) AS tagged_leaf_questions,
        count(*) FILTER (
          WHERE q.is_leaf AND EXISTS (
            SELECT 1 FROM mark_schemes ms WHERE ms.question_id = q.id
          )
        ) AS leaves_with_mark_scheme,
        count(*) FILTER (
          WHERE q.is_leaf AND EXISTS (
            SELECT 1 FROM mark_schemes ms
            WHERE ms.question_id = q.id AND ms.status = 'approved'
          )
        ) AS leaves_with_approved_mark_scheme
      FROM question_shape q
      GROUP BY q.source_paper_id
    ),
    paper_keys AS (
      SELECT
        s.code AS syllabus,
        sp.syllabus_id,
        sp.component_id,
        sp.year,
        sp.series::text AS series,
        c.number AS component,
        sp.variant,
        c.total_marks AS expected_marks,
        array_agg(DISTINCT sp.kind::text ORDER BY sp.kind::text) AS kinds,
        bool_or(sp.kind = 'QP') AS qp_present,
        bool_or(sp.kind = 'MS') AS ms_present,
        (array_agg(sp.id ORDER BY sp.created_at) FILTER (WHERE sp.kind = 'QP'))[1] AS qp_id
      FROM source_papers sp
      JOIN syllabi s ON s.id = sp.syllabus_id
      JOIN components c ON c.id = sp.component_id
      GROUP BY
        s.code, sp.syllabus_id, sp.component_id, sp.year, sp.series,
        c.number, sp.variant, c.total_marks
    )
    SELECT
      p.syllabus,
      p.year,
      p.series,
      p.component,
      p.variant,
      p.expected_marks,
      p.kinds,
      p.qp_present,
      p.ms_present,
      coalesce(qm.question_nodes, 0) AS question_nodes,
      coalesce(qm.leaf_questions, 0) AS leaf_questions,
      coalesce(qm.actual_leaf_marks, 0) AS actual_leaf_marks,
      coalesce(qm.approved_leaf_questions, 0) AS approved_leaf_questions,
      coalesce(qm.tagged_leaf_questions, 0) AS tagged_leaf_questions,
      coalesce(qm.leaves_with_mark_scheme, 0) AS leaves_with_mark_scheme,
      coalesce(qm.leaves_with_approved_mark_scheme, 0) AS leaves_with_approved_mark_scheme
    FROM paper_keys p
    LEFT JOIN question_metrics qm ON qm.source_paper_id = p.qp_id
    ORDER BY p.syllabus, p.year, p.series, p.component, p.variant
  `);

  const countRow = countsResult.rows[0] ?? {};
  const counts = Object.fromEntries(
    Object.entries(countRow).map(([key, value]) => [key, toNumber(value)]),
  );

  const papers = paperResult.rows.map((row) => {
    const leafQuestions = toNumber(row.leaf_questions);
    const actualLeafMarks = toNumber(row.actual_leaf_marks);
    const expectedMarks = toNumber(row.expected_marks);
    const taggedLeafQuestions = toNumber(row.tagged_leaf_questions);
    const leavesWithMarkScheme = toNumber(row.leaves_with_mark_scheme);
    const approvedLeafQuestions = toNumber(row.approved_leaf_questions);
    const leavesWithApprovedMarkScheme = toNumber(row.leaves_with_approved_mark_scheme);
    const qpPresent = Boolean(row.qp_present);
    const msPresent = Boolean(row.ms_present);

    const extractionComplete =
      qpPresent &&
      msPresent &&
      leafQuestions > 0 &&
      actualLeafMarks === expectedMarks &&
      taggedLeafQuestions === leafQuestions &&
      leavesWithMarkScheme === leafQuestions;

    const reviewComplete =
      extractionComplete &&
      approvedLeafQuestions === leafQuestions &&
      leavesWithApprovedMarkScheme === leafQuestions;

    return {
      paper_key: `${row.syllabus}:${row.year}:${row.series}:P${row.component}:V${row.variant}`,
      syllabus: row.syllabus,
      year: toNumber(row.year),
      series: row.series,
      component: toNumber(row.component),
      variant: toNumber(row.variant),
      kinds: row.kinds ?? [],
      qp_present: qpPresent,
      ms_present: msPresent,
      question_nodes: toNumber(row.question_nodes),
      leaf_questions: leafQuestions,
      expected_marks: expectedMarks,
      actual_leaf_marks: actualLeafMarks,
      approved_leaf_questions: approvedLeafQuestions,
      tagged_leaf_questions: taggedLeafQuestions,
      leaves_with_mark_scheme: leavesWithMarkScheme,
      leaves_with_approved_mark_scheme: leavesWithApprovedMarkScheme,
      extraction_complete: extractionComplete,
      review_complete: reviewComplete,
    };
  });

  const report = {
    generated_at: new Date().toISOString(),
    read_only: true,
    schema_migrations: migrationsResult.rows,
    counts,
    papers,
    gaps: {
      sf_paper_kind_present: false,
      sf_note: 'SF (Paper 4 source files) is not represented by the current paper_kind enum and is therefore not counted here.',
      question_dependencies_table_present: Boolean(dependenciesTableResult.rows[0]?.present),
    },
  };

  const completePapers = papers.filter((paper) => paper.review_complete).length;
  const extractionCompletePapers = papers.filter((paper) => paper.extraction_complete).length;

  console.log(
    `source_papers=${counts.source_papers} questions=${counts.questions} ` +
      `leaf_questions=${counts.leaf_questions} mark_schemes=${counts.mark_schemes} ` +
      `mark_scheme_points=${counts.mark_scheme_points}`,
  );
  console.log(
    `paper_keys=${papers.length} extraction_complete=${extractionCompletePapers} ` +
      `review_complete=${completePapers}`,
  );

  for (const paper of papers) {
    const state = paper.review_complete
      ? 'COMPLETE'
      : paper.extraction_complete
        ? 'NEEDS_REVIEW'
        : 'INCOMPLETE';
    console.log(
      `${state.padEnd(12)} ${paper.paper_key} ` +
        `marks=${paper.actual_leaf_marks}/${paper.expected_marks} ` +
        `leaf=${paper.leaf_questions} ms=${paper.leaves_with_mark_scheme} ` +
        `tags=${paper.tagged_leaf_questions}`,
    );
  }

  if (jsonOut) {
    const destination = resolve(jsonOut);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`JSON report written to ${destination}`);
  }

  await client.query('ROLLBACK');
} catch (error) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Preserve the original error.
  }
  throw error;
} finally {
  client.release();
  await pool.end();
}
