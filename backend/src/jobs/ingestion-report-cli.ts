import { pool } from '../database/client.js';

/**
 * What one ingested paper actually produced.
 *
 * The pipeline is meant to flag 10–20% of leaves for review. Below that it is
 * probably accepting bad extractions silently; well above it, the reviewer is
 * doing the work the pipeline was supposed to save. Neither is visible from a
 * job that merely says "succeeded", which is why this reads the rows.
 *
 *   npx tsx backend/src/jobs/ingestion-report-cli.ts [--year=2021] [--series=MJ] [--variant=11]
 */
const arg = (name: string) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);

if (!pool) throw new Error('DATABASE_URL is required');

const where: string[] = [];
const params: unknown[] = [];
for (const [name, column] of [['year', 'sp.year'], ['series', 'sp.series'], ['variant', 'sp.variant']] as const) {
  const value = arg(name);
  if (value === undefined) continue;
  params.push(name === 'series' ? value : Number(value));
  where.push(`${column} = $${params.length}${name === 'series' ? '::paper_series' : ''}`);
}
const filter = where.length ? `where ${where.join(' and ')}` : '';

const q = async <T>(sql: string, values: unknown[] = params) => (await pool!.query(sql, values)).rows as T[];

const papers = await q<{
  year: number; series: string; variant: number; kind: string;
  questions: string; leaves: string; needs_review: string; assets: string; schemes: string; points: string;
}>(`
  select sp.year, sp.series::text series, sp.variant, sp.kind::text kind,
         count(distinct q.id) questions,
         count(distinct q.id) filter (where q.marks is not null) leaves,
         count(distinct q.id) filter (where q.status = 'needs_review') needs_review,
         count(distinct qa.id) assets,
         count(distinct ms.id) schemes,
         count(distinct mp.id) points
  from source_papers sp
  left join questions q on q.source_paper_id = sp.id
  left join question_assets qa on qa.question_id = q.id
  left join mark_schemes ms on ms.question_id = q.id
  left join mark_scheme_points mp on mp.mark_scheme_id = ms.id
  ${filter}
  group by sp.year, sp.series, sp.variant, sp.kind
  having count(q.id) > 0
  order by sp.year, sp.series, sp.variant`);

console.log('=== papers ===');
for (const p of papers) {
  const leaves = Number(p.leaves);
  const flagged = Number(p.needs_review);
  const rate = leaves ? ((flagged / leaves) * 100).toFixed(1) : '—';
  console.log(
    `${p.year} ${p.series} ${p.variant} ${p.kind}: ${p.questions} questions, ${leaves} leaves, ` +
      `${flagged} needs_review (${rate}%), ${p.assets} assets, ${p.schemes} schemes / ${p.points} MPs`,
  );
}

// Findings point at whatever row they are about via (ref_table, ref_id), so the
// question-scoped ones are reached through that pair rather than a foreign key.
const findings = await q<{ rule: string; severity: string; n: string; open: string }>(`
  select vf.rule_code rule, vf.severity::text severity, count(*) n,
         count(*) filter (where vf.resolved_at is null) open
  from validation_findings vf
  join questions q on q.id = vf.ref_id and vf.ref_table = 'questions'
  join source_papers sp on sp.id = q.source_paper_id
  ${filter}
  group by vf.rule_code, vf.severity order by count(*) desc, vf.rule_code`);
console.log('\n=== validation findings ===');
if (!findings.length) console.log('none');
for (const f of findings)
  console.log(`  ${f.rule.padEnd(5)} ${f.severity.padEnd(8)} ${String(f.n).padStart(4)} (${f.open} open)`);

const classification = await q<{ with_subtopic: string; total: string; avg_conf: string }>(`
  select count(distinct qs.question_id) with_subtopic, count(distinct q.id) total,
         round(avg(qs.confidence)::numeric, 3) avg_conf
  from questions q
  join source_papers sp on sp.id = q.source_paper_id
  left join question_subtopics qs on qs.question_id = q.id
  ${filter} ${filter ? 'and' : 'where'} q.marks is not null`);
const c = classification[0];
if (c) console.log(`\n=== classification ===\n  ${c.with_subtopic}/${c.total} leaves have a subtopic, mean confidence ${c.avg_conf ?? '—'}`);

const spend = await q<{ purpose: string; n: string; usd: string; unpriced: string }>(
  `select purpose, count(*) n, round(sum(coalesce(cost_usd,0))::numeric,4) usd,
          count(*) filter (where cost_usd is null) unpriced
   from ai_calls group by purpose order by sum(coalesce(cost_usd,0)) desc`, []);
console.log('\n=== AI spend (all runs to date) ===');
let total = 0;
for (const s of spend) {
  total += Number(s.usd);
  const unpriced = Number(s.unpriced) ? `, ${s.unpriced} unpriced` : '';
  console.log(`  ${s.purpose.padEnd(12)} ${String(s.n).padStart(4)} calls  $${s.usd}${unpriced}`);
}
console.log(`  ${'total'.padEnd(12)} ${' '.repeat(4)}        $${total.toFixed(4)}`);

await pool.end();
