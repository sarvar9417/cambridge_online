import pg from 'pg';
import { flaggedRate, validateExtraction, type ValidationContext } from '@campath/shared';
import { isTransactionPooler } from '../client.js';

/**
 * Runs the 23 validation rules over the question bank already in the database.
 *
 * The pipeline validates what it just extracted; this validates what is stored,
 * which is the check that matters after the fact. It is how a bank built by an
 * earlier tool, or edited by hand, gets held to the same standard — and it is
 * read-only, so it is safe against a live database.
 *
 * Run with: pnpm --filter @campath/db exec tsx src/cli/validate-bank.ts
 */
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL is required');

const pool = new pg.Pool({
  connectionString,
  ssl: /@(localhost|127\.0\.0\.1)/.test(connectionString)
    ? undefined
    : { rejectUnauthorized: false },
  max: isTransactionPooler(connectionString) ? 3 : 5,
});

interface PaperRow {
  id: string;
  year: number;
  series: string;
  variant: number;
  component_total: number;
  label: string;
}

try {
  const papers = await pool.query<PaperRow>(
    `select sp.id, sp.year, sp.series, sp.variant, c.total_marks as component_total,
            concat('9618/', c.number, sp.variant, '/', sp.series, '/', sp.year) as label
     from source_papers sp
     join components c on c.id = sp.component_id
     where sp.kind = 'QP'
     order by sp.year, sp.variant`,
  );

  let totalLeaves = 0;
  let totalFlagged = 0;

  for (const paper of papers.rows) {
    const questions = await pool.query(
      // Most of the bank was authored under the KaTeX contract and holds its
      // text in stem_latex; the hand-entered questions use stem_md. Read
      // whichever carries the text rather than reporting an empty stem.
      `select q.path, q.display_ref, q.marks, q.command_word,
              coalesce(nullif(q.stem_latex, ''), q.stem_md) as stem_md,
              coalesce(nullif(q.context_latex, ''), q.context_md) as context_md,
              q.answer_kind, q.answer_lines, q.extract_confidence,
              parent.path as parent_path,
              coalesce((
                select json_agg(json_build_object(
                  'code', s.code, 'confidence', coalesce(qs.confidence, 1),
                  'weight', qs.weight, 'isPrimary', qs.is_primary))
                from question_subtopics qs join subtopics s on s.id = qs.subtopic_id
                where qs.question_id = q.id
              ), '[]'::json) as subtopics
       from questions q
       left join questions parent on parent.id = q.parent_id
       where q.source_paper_id = $1
       order by q.sort_order`,
      [paper.id],
    );

    if (questions.rowCount === 0) continue;

    const schemes = await pool.query(
      `select q.path as question_path, ms.scheme_type, ms.max_marks,
              coalesce(ms.extract_confidence, 1) as confidence,
              coalesce((
                select json_agg(json_build_object('code', p.code, 'marks', p.marks,
                  'groupLabel', g.label))
                from mark_scheme_points p
                left join mark_scheme_groups g on g.id = p.group_id
                where p.mark_scheme_id = ms.id
              ), '[]'::json) as points,
              coalesce((
                select json_agg(json_build_object('label', g.label, 'nRequired', g.n_required,
                  'marksPerPoint', g.marks_per_point, 'maxMarks', g.max_marks))
                from mark_scheme_groups g where g.mark_scheme_id = ms.id
              ), '[]'::json) as groups,
              (select count(*)::int from mark_scheme_levels l where l.mark_scheme_id = ms.id) as level_count
       from mark_schemes ms
       join questions q on q.id = ms.question_id
       where q.source_paper_id = $1`,
      [paper.id],
    );

    const assets = await pool.query(
      `select a.id, q.path as question_path, a.kind, a.storage_path, a.alt_text,
              a.size_bytes, a.content_hash
       from question_assets a join questions q on q.id = a.question_id
       where q.source_paper_id = $1`,
      [paper.id],
    );

    const dependencies = await pool.query(
      `select fq.path as from_path, tq.path as to_path, d.kind, d.strength
       from question_dependencies d
       join questions fq on fq.id = d.question_id
       join questions tq on tq.id = d.depends_on_id
       where fq.source_paper_id = $1`,
      [paper.id],
    );

    // Stems from every other year, so V19 can report a repeat.
    const known = await pool.query(
      `select q.display_ref, q.stem_md, sp.year
       from questions q join source_papers sp on sp.id = q.source_paper_id
       where q.marks is not null and q.stem_md is not null and sp.year <> $1
       limit 5000`,
      [paper.year],
    );

    const context: ValidationContext = {
      componentTotalMarks: paper.component_total,
      year: paper.year,
      questions: questions.rows.map((row) => ({
        path: row.path,
        parentPath: row.parent_path,
        displayRef: row.display_ref,
        marks: row.marks,
        stemMd: row.stem_md,
        contextMd: row.context_md,
        commandWord: row.command_word,
        answerKind: row.answer_kind,
        answerLines: row.answer_lines,
        extractConfidence: Number(row.extract_confidence ?? 1),
        subtopics: (row.subtopics as Array<Record<string, unknown>>).map((s) => ({
          code: String(s.code),
          confidence: Number(s.confidence),
          weight: Number(s.weight),
          isPrimary: Boolean(s.isPrimary),
        })),
      })),
      schemes: schemes.rows.map((row) => ({
        questionPath: row.question_path,
        type: row.scheme_type,
        maxMarks: row.max_marks,
        points: row.points,
        groups: row.groups,
        levelCount: row.level_count,
        confidence: Number(row.confidence),
      })),
      assets: assets.rows.map((row) => ({
        id: row.id,
        questionPath: row.question_path,
        kind: row.kind,
        storagePath: row.storage_path,
        sizeBytes: row.size_bytes,
        altText: row.alt_text,
        contentHash: row.content_hash,
      })),
      dependencies: dependencies.rows.map((row) => ({
        fromPath: row.from_path,
        toPath: row.to_path,
        kind: row.kind,
        strength: row.strength,
      })),
      knownStems: known.rows.map((row) => ({
        displayRef: row.display_ref,
        stem: row.stem_md ?? '',
        year: row.year,
      })),
    };

    const report = validateExtraction(context);
    const leaves = context.questions.filter(
      (question) => !context.questions.some((other) => other.parentPath === question.path),
    );
    const flagged = leaves.filter((leaf) => report.flaggedPaths.includes(leaf.path));
    const marks = leaves.reduce((sum, leaf) => sum + (leaf.marks ?? 0), 0);

    totalLeaves += leaves.length;
    totalFlagged += flagged.length;

    const byCode = new Map<string, number>();
    for (const item of report.findings) byCode.set(item.code, (byCode.get(item.code) ?? 0) + 1);

    console.log(`\n${paper.label}`);
    console.log(
      `  nodes ${context.questions.length}  leaves ${leaves.length}  marks ${marks}/${paper.component_total}`,
    );
    console.log(`  errors ${report.errorCount}  warnings ${report.warningCount}`);
    console.log(
      `  flagged ${flagged.length}/${leaves.length} = ${((flagged.length / Math.max(leaves.length, 1)) * 100).toFixed(1)}%`,
    );
    if (byCode.size) {
      console.log(
        `  by rule: ${[...byCode.entries()]
          .sort()
          .map(([c, n]) => `${c}x${n}`)
          .join('  ')}`,
      );
      for (const item of report.findings.slice(0, 8)) {
        console.log(`    ${item.code} ${item.path ?? '-'}: ${item.message}`);
      }
      if (report.findings.length > 8) console.log(`    ... ${report.findings.length - 8} more`);
    }
  }

  const rate = flaggedRate(totalLeaves, totalFlagged);
  console.log(
    `\nTOTAL  leaves ${rate.leafCount}  flagged ${rate.flaggedCount} = ${rate.percentage.toFixed(1)}%`,
  );
  console.log(`verdict: ${rate.verdict}`);
} finally {
  await pool.end();
}
