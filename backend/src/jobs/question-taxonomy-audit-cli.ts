import { pool } from '../database/client.js';
import { runQuestionTaxonomyAudit } from './question-taxonomy-audit.js';

if (!pool) {
  console.error('DATABASE_URL is required');
  process.exitCode = 2;
} else {
  try {
    const audit = await runQuestionTaxonomyAudit(pool);
    console.log(JSON.stringify(audit, null, 2));
    if (!audit.ok) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
