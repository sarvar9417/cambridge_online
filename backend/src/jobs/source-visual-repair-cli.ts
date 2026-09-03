import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pool } from '../database/client.js';
import { repairSourceVisuals } from './source-visual-repair.js';

if (!pool) throw new Error('DATABASE_URL is required');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const paperLimitRaw = valueOf('--limit-papers');
const paperId = valueOf('--paper-id');
const reportPath = valueOf('--report');
const paperLimit = paperLimitRaw === null ? null : Number(paperLimitRaw);
if (paperLimit !== null && (!Number.isInteger(paperLimit) || paperLimit < 1 || paperLimit > 100)) {
  throw new Error('--limit-papers must be an integer from 1 to 100');
}
if (paperId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paperId)) {
  throw new Error('--paper-id must be a UUID');
}

try {
  const report = await repairSourceVisuals(pool, { apply, paperLimit, paperId });
  const json = JSON.stringify(report, null, 2);
  console.log(json);
  if (reportPath) {
    const path = resolve(reportPath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${json}\n`, 'utf8');
  }
  if (apply) {
    const missing = report.papers.flatMap((paper) => paper.missingVisualRefs);
    if (missing.length) {
      console.error(`Source visual repair incomplete for ${missing.length} leaf/leaves: ${missing.join(', ')}`);
      process.exitCode = 2;
    }
  }
} finally {
  await pool.end();
}

function valueOf(name: string) {
  const exact = args.find((arg) => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1).trim() || null;
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1]?.trim() || null : null;
}
