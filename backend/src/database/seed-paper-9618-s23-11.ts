/**
 * Writes the real past paper 9618/11/M/J/23 into the database. The transcript
 * lives in `paper-9618-s23-11.ts` (pure data, unit tested); this script only
 * supplies the document metadata to the shared writer.
 *
 * Run with: npm run db:seed-paper-11 -w backend
 */

import { writePaper } from './seed-paper.js';
import { PAPER } from './paper-9618-s23-11.js';

await writePaper(PAPER, {
  qpPath: 'drive/9618_s23_qp_11.pdf',
  msPath: 'drive/9618_s23_ms_11.pdf',
  qpSeed: '9618-s23-qp-11',
  msSeed: '9618-s23-ms-11',
});
