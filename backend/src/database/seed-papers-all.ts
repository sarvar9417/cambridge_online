/**
 * Seeds every transcribed past paper into the database in one run.
 *
 * Adding a paper is two steps: write the transcript module
 * (`paper-<session>.ts`) and register it below. Each paper is written in its
 * own transaction (the shared writer commits per paper), but the connection
 * pool is kept open for the whole run — much faster than one process per paper.
 *
 * Run with: npm run db:seed-papers -w backend
 */

import { writePaper } from './seed-paper.js';
import { pool } from './client.js';
import { PAPER as PAPER_S23_11 } from './paper-9618-s23-11.js';
import { PAPER as PAPER_S23_12 } from './paper-9618-s23-12.js';
import { PAPER as PAPER_S23_13 } from './paper-9618-s23-13.js';

if (!pool) throw new Error('DATABASE_URL is required');

const PAPERS = [
  {
    paper: PAPER_S23_11,
    meta: {
      qpPath: 'drive/9618_s23_qp_11.pdf',
      msPath: 'drive/9618_s23_ms_11.pdf',
      variant: 1,
      qpSeed: '9618-s23-qp-11',
      msSeed: '9618-s23-ms-11',
    },
  },
  {
    paper: PAPER_S23_12,
    meta: {
      qpPath: 'drive/9618_s23_qp_12.pdf',
      msPath: 'drive/9618_s23_ms_12.pdf',
      variant: 2,
      qpSeed: '9618-s23-qp-12',
      msSeed: '9618-s23-ms-12',
    },
  },
  {
    paper: PAPER_S23_13,
    meta: {
      qpPath: 'drive/9618_s23_qp_13.pdf',
      msPath: 'drive/9618_s23_ms_13.pdf',
      variant: 3,
      qpSeed: '9618-s23-qp-13',
      msSeed: '9618-s23-ms-13',
    },
  },
];

let failed = 0;
for (const { paper, meta } of PAPERS) {
  try {
    await writePaper(paper, meta, { closePool: false });
  } catch (error) {
    failed += 1;
    console.error(`!! ${meta.qpPath} failed:`, error instanceof Error ? error.message : error);
  }
}

// `writePaper` with closePool: false keeps the pool open; close it here.
// (process.exit guards against pg keeping the event loop alive on some hosts.)
if (failed > 0) {
  console.error(`\n${failed} of ${PAPERS.length} papers failed to seed`);
  await pool.end().catch(() => {});
  process.exit(1);
}
console.log(`\nAll ${PAPERS.length} papers seeded successfully`);
await pool.end().catch(() => {});
process.exit(0);
