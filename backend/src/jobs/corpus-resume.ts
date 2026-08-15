import type { Pool, PoolClient } from 'pg';
import { enqueueJob } from './job-queue.js';
import { buildSourceRunKey } from './corpus-enqueue.js';

const RESUMABLE_STAGES = ['classify', 'depends', 'validate', 'crosscheck', 'persist'] as const;
type ResumableStage = (typeof RESUMABLE_STAGES)[number];

export interface CorpusResumePlan {
  runId: string;
  failedJobId: string;
  failedKind: `ingest-${ResumableStage}`;
  stage: ResumableStage;
  predecessorJobId: string;
  predecessorKind: string;
  predecessorResultBytes: number;
  previousAttemptNo: number;
  nextAttemptNo: number;
  previousRunKey: string;
  nextRunKey: string;
  safe: true;
}

export interface CorpusResumeResult extends CorpusResumePlan {
  jobId: string;
  jobStatus: string;
}

export async function planFailedCorpusResume(
  pool: Pool,
  runId: string,
  input: { pipelineVersion?: string } = {},
): Promise<CorpusResumePlan> {
  const client = await pool.connect();
  try {
    await client.query('begin read only');
    const plan = await buildResumePlan(client, runId, input.pipelineVersion ?? 'real-paper-v2', false);
    await client.query('commit');
    return plan;
  } catch (error) {
    await safeRollback(client);
    throw error;
  } finally {
    client.release();
  }
}

export async function resumeFailedCorpusRun(
  pool: Pool,
  runId: string,
  input: { pipelineVersion?: string } = {},
): Promise<CorpusResumeResult> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const plan = await buildResumePlan(client, runId, input.pipelineVersion ?? 'real-paper-v2', true);
    const job = await enqueueJob(client, {
      kind: plan.failedKind,
      payload: {
        refId: runId,
        refTable: 'ingestion_runs',
        previousJobId: plan.predecessorJobId,
        runKey: plan.nextRunKey,
      },
      idempotencyKey: `ingest-run:${runId}:${plan.nextRunKey}:${plan.stage}`,
      priority: 50,
      refTable: 'ingestion_runs',
      refId: runId,
    });
    await client.query(
      `update ingestion_runs
       set status='queued', attempt_no=$2, run_key=$3, updated_at=now()
       where id=$1`,
      [runId, plan.nextAttemptNo, plan.nextRunKey],
    );
    await client.query('commit');
    return { ...plan, jobId: String(job.id), jobStatus: String(job.status) };
  } catch (error) {
    await safeRollback(client);
    throw error;
  } finally {
    client.release();
  }
}

async function buildResumePlan(
  client: PoolClient,
  runId: string,
  pipelineVersion: string,
  lock: boolean,
): Promise<CorpusResumePlan> {
  const run = await client.query(
    `select ir.id,ir.status::text status,ir.attempt_no,ir.run_key,
            qp.sha256 qp_sha,ms.sha256 ms_sha
     from ingestion_runs ir
     join source_papers qp on qp.id=ir.qp_paper_id
     join source_papers ms on ms.id=ir.ms_paper_id
     where ir.id=$1${lock ? ' for update of ir' : ''}`,
    [runId],
  );
  if (!run.rowCount) throw new Error('corpus_resume_run_not_found');
  const row = run.rows[0];
  if (String(row.status) !== 'failed') throw new Error(`corpus_resume_run_not_failed:${row.status}`);

  const previousAttemptNo = Number(row.attempt_no);
  if (!Number.isInteger(previousAttemptNo) || previousAttemptNo < 1) throw new Error('corpus_resume_attempt_invalid');
  const previousRunKey = String(row.run_key ?? '');
  const expectedBase = buildSourceRunKey(pipelineVersion, String(row.qp_sha), String(row.ms_sha));
  const recordedBase = previousRunKey.replace(/:attempt-\d+$/, '');
  if (recordedBase !== expectedBase) throw new Error('corpus_resume_source_or_pipeline_changed');

  const failed = await client.query(
    `select id,kind,payload,error
     from jobs
     where ref_table='ingestion_runs' and ref_id=$1 and status='failed'
     order by finished_at desc nulls last,created_at desc
     limit 1${lock ? ' for update' : ''}`,
    [runId],
  );
  if (!failed.rowCount) throw new Error('corpus_resume_failed_job_missing');
  const failedRow = failed.rows[0] as { id: string; kind: string; payload: unknown };
  const stage = resumableStage(failedRow.kind);
  if (!stage) throw new Error(`corpus_resume_stage_not_durable:${failedRow.kind}`);
  const payload = asRecord(failedRow.payload);
  const predecessorJobId = typeof payload.previousJobId === 'string' ? payload.previousJobId : '';
  if (!predecessorJobId) throw new Error('corpus_resume_predecessor_missing');

  const predecessor = await client.query(
    `select id,kind,status::text status,octet_length(coalesce(result::text,'')) result_bytes
     from jobs where id=$1 and ref_table='ingestion_runs' and ref_id=$2`,
    [predecessorJobId, runId],
  );
  if (!predecessor.rowCount) throw new Error('corpus_resume_predecessor_not_found');
  const predecessorRow = predecessor.rows[0];
  if (String(predecessorRow.status) !== 'succeeded') throw new Error('corpus_resume_predecessor_not_succeeded');
  const predecessorResultBytes = Number(predecessorRow.result_bytes ?? 0);
  if (!Number.isFinite(predecessorResultBytes) || predecessorResultBytes <= 2) throw new Error('corpus_resume_predecessor_artifact_empty');

  const nextAttemptNo = previousAttemptNo + 1;
  const nextRunKey = `${expectedBase}:attempt-${nextAttemptNo}`;
  const duplicate = await client.query(
    `select id,status::text status from jobs where idempotency_key=$1 limit 1`,
    [`ingest-run:${runId}:${nextRunKey}:${stage}`],
  );
  if (duplicate.rowCount) throw new Error(`corpus_resume_attempt_already_exists:${duplicate.rows[0].status}`);

  return {
    runId,
    failedJobId: String(failedRow.id),
    failedKind: `ingest-${stage}`,
    stage,
    predecessorJobId: String(predecessorRow.id),
    predecessorKind: String(predecessorRow.kind),
    predecessorResultBytes,
    previousAttemptNo,
    nextAttemptNo,
    previousRunKey,
    nextRunKey,
    safe: true,
  };
}

function resumableStage(kind: string): ResumableStage | null {
  if (!kind.startsWith('ingest-')) return null;
  const stage = kind.slice('ingest-'.length);
  return (RESUMABLE_STAGES as readonly string[]).includes(stage) ? stage as ResumableStage : null;
}
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
async function safeRollback(client: PoolClient) { try { await client.query('rollback'); } catch {} }
