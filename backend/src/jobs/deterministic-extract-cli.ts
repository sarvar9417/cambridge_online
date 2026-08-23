import { execFile } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { checkTotal, parsePaper } from '../lib/ingestion/deterministic-extract.js';

/**
 * Reads a question paper with no model and no API key.
 *
 *   npx tsx backend/src/jobs/deterministic-extract-cli.ts \
 *     --pdf=papers/2021_May-June/9618_s21_qp_11.pdf [--total=75] [--out=q.json]
 *
 * Prints what it read and what it could not, and writes the structured
 * questions when --out is given. It never touches the database: persisting is a
 * separate decision, and this is the step that has to be trusted first.
 */
const run = promisify(execFile);
const arg = (name: string) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);

const pdf = arg('pdf');
if (!pdf) throw new Error('Usage: --pdf=<file> [--total=75] [--out=<file>]');
const expectedTotal = arg('total') ? Number(arg('total')) : undefined;

const txt = join(tmpdir(), `campath-${randomUUID()}.txt`);
await run(process.env.PDFTOTEXT_PATH ?? 'pdftotext', ['-layout', pdf, txt]);
const parsed = parsePaper(await readFile(txt, 'utf8'));
await unlink(txt).catch(() => {});

const total = checkTotal(parsed, expectedTotal);
const leaves = parsed.questions.filter((question) => question.marks !== null);
const flagged = parsed.questions.filter((question) => question.issues.length > 0);

console.log(`\n${pdf}`);
console.log(`  nodes        : ${parsed.questions.length} (${leaves.length} marked leaves)`);
console.log(`  marks        : ${total.actual} / ${total.expected ?? '?'} ${total.matches ? 'OK' : 'MISMATCH'} (${total.source})`);
console.log(`  flagged      : ${flagged.length} (${Math.round((flagged.length / (parsed.questions.length || 1)) * 100)}%)`);
if (parsed.issues.length) console.log(`  paper issues : ${parsed.issues.join(', ')}`);

if (flagged.length) {
  console.log('\n  needs a human:');
  for (const question of flagged.slice(0, 15)) {
    console.log(`    ${question.path.padEnd(8)} ${question.issues.join(', ')}`);
  }
  if (flagged.length > 15) console.log(`    …and ${flagged.length - 15} more`);
}

const out = arg('out');
if (out) {
  await writeFile(out, JSON.stringify(parsed, null, 1));
  console.log(`\n  written to ${out}`);
}
// A total that does not match means a bracket was missed; the tree is not
// trustworthy and the exit code says so.
process.exitCode = total.matches ? 0 : 2;
