import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const rawUrl=process.env.DATABASE_URL;
if(!rawUrl)throw new Error('DATABASE_URL is required');
const url=new URL(rawUrl);
if(!['127.0.0.1','localhost','::1'].includes(url.hostname)){
  throw new Error('Refusing to run Live E2E migrations outside localhost');
}

const selected=[
  '0001_initial.sql',
  '0002_refresh_tokens.sql',
  '0003_syllabus_and_classes.sql',
  '0004_questions_and_markschemes.sql',
  '0005_platform_domains.sql',
  '0006_exports.sql',
  '0008_appeals.sql',
  '0011_idempotency.sql',
  '0012_submission_late_grants.sql',
  '0015_export_file_data.sql',
  '0016_question_dependencies_and_selections.sql',
  '0018_question_asset_source_bbox.sql',
  '0020_question_asset_storage_metadata.sql',
  '0021_user_approval_and_password_reset.sql',
  '0024_component_topic_coverage.sql',
  '0025_component_learning_objective_coverage.sql',
  '0028_source_paper_remote_url.sql',
  '0029_email_verification.sql',
  '0032_mark_scheme_group_award_mode.sql',
  '0078_selection_export_payload.sql',
  '0092_learning_objective_practice_compatibility.sql',
  '0108_refresh_token_session_default.sql',
  '0109_9618_ms_source_audit.sql',
  '0113_structured_question_content.sql',
  '0165_canonical_mark_scheme_selection.sql',
  '0166_live_exam_sessions.sql',
  '0167_live_exam_fk_indexes.sql',
  '0168_live_exam_peer_integrity.sql',
  '0169_live_exam_override_audit.sql',
  '0170_live_exam_learning_evidence.sql',
  '0171_9618_structured_content_host_contamination_guard.sql',
  '0172_unified_live_challenge_controls.sql',
  '0173_live_challenge_database_hardening.sql',
  '0190_live_challenge_subtopic_evidence_fallback.sql',
  '0191_live_challenge_integrity_and_deadline_hardening.sql',
  '0192_live_challenge_join_code_lifecycle.sql',
  '0193_durable_rate_limits.sql',
  '0195_canonical_mark_scheme_view_security.sql',
] as const;

const migrationsDir=join(dirname(fileURLToPath(import.meta.url)),'migrations');
const available=new Set((await readdir(migrationsDir)).filter((name)=>name.endsWith('.sql')));
for(const name of selected)if(!available.has(name))throw new Error(`Missing Live E2E migration: ${name}`);

const client=new pg.Client({connectionString:rawUrl,ssl:false});
await client.connect();
try{
  await client.query('create table if not exists schema_migrations(name text primary key,applied_at timestamptz not null default now())');
  for(const name of selected){
    const exists=await client.query('select 1 from schema_migrations where name=$1',[name]);
    if(exists.rowCount)continue;
    const sql=await readFile(join(migrationsDir,name),'utf8');
    await client.query('begin');
    try{
      await client.query(sql);
      await client.query('insert into schema_migrations(name) values($1)',[name]);
      await client.query('commit');
      console.log(`Applied Live E2E structural migration ${name}`);
    }catch(error){
      await client.query('rollback');
      throw new Error(`Live E2E migration failed: ${name}`,{cause:error});
    }
  }

  // These columns predate the canonical migration ledger in the production
  // database. Live runtime SQL reads them, so the local test schema mirrors the
  // production shape without pretending they are production migrations.
  await client.query(`
    alter table public.questions
      add column if not exists stem_latex text,
      add column if not exists context_latex text,
      add column if not exists body_format text not null default 'markdown';
    alter table public.question_assets
      add column if not exists svg_markup text;
  `);
  console.log('Prepared Live E2E runtime compatibility columns');
}finally{
  await client.end();
}
