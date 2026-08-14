/**
 * Writes the real past paper 9618/13/M/J/23 into the database. The transcript
 * lives in `paper-9618-s23-13.ts` (pure data, unit tested); this script only
 * supplies the document metadata to the shared writer.
 *
 * Run with: npm run db:seed-paper-13 -w backend
 */

import { writePaper } from './seed-paper.js';
import { PAPER } from './paper-9618-s23-13.js';

await writePaper(PAPER, {
  qpPath: 'drive/9618_s23_qp_13.pdf',
  msPath: 'drive/9618_s23_ms_13.pdf',
  variant: 3,
  qpSeed: '9618-s23-qp-13',
  msSeed: '9618-s23-ms-13',
});
