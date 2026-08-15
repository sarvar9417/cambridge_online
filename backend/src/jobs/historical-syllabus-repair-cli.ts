import { pool } from '../database/client.js';
import { loadHistoricalRepairPlan, remapHistoricalSyllabusSources, validateRepairPlan } from './historical-syllabus-repair.js';

if (!pool) throw new Error('DATABASE_URL is required');
const action = process.argv.find((arg) => arg.startsWith('--action='))?.slice('--action='.length) ?? 'plan';
const allowDropLo = process.argv.includes('--allow-drop-lo-links');

if (action === 'plan') {
  const plan = await loadHistoricalRepairPlan(pool);
  console.log(JSON.stringify({
    action,
    plan,
    // Preparing only restores the artificial current-version window. It does
    // not touch LO links, so their reclassification decision belongs to remap.
    prepareBlockers: validateRepairPlan(plan, { allowDropLearningObjectiveLinks: true }),
    remapBlockers: validateRepairPlan(plan, { requireHistorical: true, allowDropLearningObjectiveLinks: allowDropLo }),
  }, null, 2));
} else if (action === 'prepare') {
  if (process.env.CONFIRM_HISTORICAL_SYLLABUS_PREPARE !== 'YES') throw new Error('Set CONFIRM_HISTORICAL_SYLLABUS_PREPARE=YES to use --action=prepare');
  const plan = await loadHistoricalRepairPlan(pool);
  const blockers = validateRepairPlan(plan, { allowDropLearningObjectiveLinks: true });
  if (blockers.length) throw new Error(`historical_syllabus_prepare_blocked:${blockers.join(',')}`);
  const current = plan.current!;
  let changed = false;
  if (current.validFrom !== 2026) {
    if (current.validFrom !== 2021 || current.validTo !== 2028) throw new Error(`historical_syllabus_unexpected_current_window:${current.validFrom}-${current.validTo}`);
    const result = await pool.query(`update syllabi set valid_from=2026 where id=$1 and valid_from=2021 and valid_to=2028 returning id`, [current.id]);
    if (result.rowCount !== 1) throw new Error('historical_syllabus_prepare_concurrent_change');
    changed = true;
  }
  console.log(JSON.stringify({ action, result: { changed, syllabusId: current.id, validFrom: 2026 } }, null, 2));
} else if (action === 'remap') {
  if (process.env.CONFIRM_HISTORICAL_SYLLABUS_REMAP !== 'YES') throw new Error('Set CONFIRM_HISTORICAL_SYLLABUS_REMAP=YES to use --action=remap');
  if (allowDropLo && process.env.CONFIRM_DROP_HISTORICAL_LO_LINKS !== 'YES') throw new Error('Set CONFIRM_DROP_HISTORICAL_LO_LINKS=YES together with --allow-drop-lo-links');
  console.log(JSON.stringify({ action, result: await remapHistoricalSyllabusSources(pool, { allowDropLearningObjectiveLinks: allowDropLo }) }, null, 2));
} else {
  throw new Error('Usage: --action=plan|prepare|remap [--allow-drop-lo-links]');
}
await pool.end();
