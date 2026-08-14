/**
 * Writes the real past paper 9618/12/M/J/23 into the database. The transcript
 * lives in `paper-9618-s23-12.ts` (pure data, unit tested); this script only
 * supplies the document metadata to the shared writer.
 *
 * Run with: npm run db:seed-paper-12 -w backend
 */

import { writePaper } from './seed-paper.js';
import { PAPER } from './paper-9618-s23-12.js';

await writePaper(PAPER, {
  qpPath: 'drive/9618_s23_qp_12.pdf',
  msPath: 'drive/9618_s23_ms_12.pdf',
  variant: 2,
  qpSeed: '9618-s23-qp-12',
  msSeed: '9618-s23-ms-12',
});
