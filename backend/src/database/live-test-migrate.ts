import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const here = dirname(fileURLToPath(import.meta.url));
const migrationDir = join(here, 'migrations');
const files = [
  '0166_live_exam_sessions.sql',
  '0167_live_exam_fk_indexes.sql',
  '0168_live_exam_peer_integrity.sql',
  '0169_live_exam_override_audit.sql',
  '0170_live_exam_learning_evidence.sql',
  '0172_unified_live_challenge_controls.sql',
  '0173_live_challenge_database_hardening.sql',
  '0190_live_challenge_subtopic_evidence_fallback.sql',
  '0191_live_challenge_integrity_and_deadline_hardening.sql',
  '0192_live_challenge_join_code_lifecycle.sql',
  '0193_durable_rate_limits.sql',
  '0204_live_peer_teacher_fallback.sql',
  '0205_live_session_history_archive.sql',
  '0206_live_question_exposure_read_model.sql',
  '0208_structured_response_payloads.sql',
];

const pool = new Pool({ connectionString });
const client = await pool.connect();
try {
  const foundation = await readFile(join(here, 'live-test-foundation.sql'), 'utf8');
  await client.query(foundation);
  for (const file of files) {
    if(file==='0208_structured_response_payloads.sql'){
      // The compact Live acceptance foundation omits the assignment domain.
      // Provide the minimum historical table shape so the real additive
      // migration is still exercised for both response targets.
      await client.query(`create table if not exists public.answers(id uuid primary key default gen_random_uuid())`);
    }
    const sql = await readFile(join(migrationDir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`Applied live acceptance migration ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed live acceptance migration ${file}`, { cause: error });
    }
  }
} finally {
  client.release();
  await pool.end();
}
