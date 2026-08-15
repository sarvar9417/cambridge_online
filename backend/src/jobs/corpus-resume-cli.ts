import { pool } from '../database/client.js';
import { planFailedCorpusResume, resumeFailedCorpusRun } from './corpus-resume.js';

if (!pool) throw new Error('DATABASE_URL is required');
const args=process.argv.slice(2);
const runId=args.find(value=>value.startsWith('--run='))?.slice('--run='.length);
const apply=args.includes('--apply');
if(!runId)throw new Error('Usage: corpus:resume -- --run=<ingestion-run-uuid> [--apply]');
if(apply&&process.env.CONFIRM_CORPUS_RESUME!=='YES')throw new Error('Set CONFIRM_CORPUS_RESUME=YES to use --apply');
try{
  const result=apply?await resumeFailedCorpusRun(pool,runId):await planFailedCorpusResume(pool,runId);
  console.log(JSON.stringify({mode:apply?'apply':'dry-run',...result},null,2));
  if(!apply)console.log('\nDry run only. Set CONFIRM_CORPUS_RESUME=YES and pass --apply to enqueue this durable-stage resume.');
}finally{await pool.end()}
