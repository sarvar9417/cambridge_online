import { pool } from '../database/client.js';
import { loadHistoricalRepairPlan, prepareHistoricalSyllabusWindow, remapHistoricalSyllabusSources, validateRepairPlan } from './historical-syllabus-repair.js';

if (!pool) throw new Error('DATABASE_URL is required');
const action = process.argv.find((arg) => arg.startsWith('--action='))?.slice('--action='.length) ?? 'plan';
const allowDropLo = process.argv.includes('--allow-drop-lo-links');

if (action === 'plan') {
  const plan = await loadHistoricalRepairPlan(pool);
  console.log(JSON.stringify({ action, plan, prepareBlockers: validateRepairPlan(plan), remapBlockers: validateRepairPlan(plan, { requireHistorical: true, allowDropLearningObjectiveLinks: allowDropLo }) }, null, 2));
} else if (action === 'prepare') {
  if (process.env.CONFIRM_HISTORICAL_SYLLABUS_PREPARE !== 'YES') throw new Error('Set CONFIRM_HISTORICAL_SYLLABUS_PREPARE=YES to use --action=prepare');
  console.log(JSON.stringify({ action, result: await prepareHistoricalSyllabusWindow(pool) }, null, 2));
} else if (action === 'remap') {
  if (process.env.CONFIRM_HISTORICAL_SYLLABUS_REMAP !== 'YES') throw new Error('Set CONFIRM_HISTORICAL_SYLLABUS_REMAP=YES to use --action=remap');
  if (allowDropLo && process.env.CONFIRM_DROP_HISTORICAL_LO_LINKS !== 'YES') throw new Error('Set CONFIRM_DROP_HISTORICAL_LO_LINKS=YES together with --allow-drop-lo-links');
  console.log(JSON.stringify({ action, result: await remapHistoricalSyllabusSources(pool, { allowDropLearningObjectiveLinks: allowDropLo }) }, null, 2));
} else {
  throw new Error('Usage: --action=plan|prepare|remap [--allow-drop-lo-links]');
}
await pool.end();
