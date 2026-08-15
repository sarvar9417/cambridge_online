import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export type PaperState = 'reviewed' | 'needs_review' | 'running' | 'failed' | 'queued' | 'not_started';

export interface CorpusPaper {
  id: string;
  year: number;
  series: string;
  component: number;
  variant: number;
  /** Cambridge paper code: component and variant run together, so 9618/11. */
  label: string;
  /** True when the mark scheme for this paper is registered too. */
  hasMarkScheme: boolean;
  questions: number;
  leaves: number;
  needsReview: number;
  state: PaperState;
  error: string | null;
}

export interface CorpusSummary {
  papers: CorpusPaper[];
  totals: Record<PaperState, number>;
  findings: Array<{ code: string; severity: string; open: number }>;
}

/**
 * The corpus as a map: every registered paper and where it got to.
 *
 * This is the building of the corpus, not the using of it. Choosing questions
 * for a class lives on the teaching surface; what belongs here is the operator's
 * question -- which papers are in, which stopped, and what is waiting to be
 * checked.
 *
 * `state` is derived rather than stored, because "where did this paper get to"
 * is spread across three tables: the questions it produced, the run that
 * produced them, and the job that failed.
 */
export class CorpusService {
  constructor(private readonly pool: Pool) {}

  async summary(actor: Actor): Promise<CorpusSummary> {
    if (actor.role !== 'owner') throw new DomainError('owners_only', 403);

    const [papers, findings] = await Promise.all([
      this.pool.query(`
        select sp.id, sp.year, sp.series::text series, c.number component, sp.variant,
               count(q.id)::int questions,
               count(q.id) filter (where q.marks is not null)::int leaves,
               count(q.id) filter (where q.status = 'needs_review')::int needs_review,
               exists (
                 select 1 from source_papers ms
                 where ms.kind = 'MS' and ms.year = sp.year and ms.series = sp.series
                   and ms.variant = sp.variant and ms.component_id = sp.component_id
               ) has_mark_scheme,
               ir.status::text run_status,
               j.error job_error
        from source_papers sp
        join components c on c.id = sp.component_id
        left join questions q on q.source_paper_id = sp.id
        left join lateral (
          select status, id from ingestion_runs
          where qp_paper_id = sp.id order by updated_at desc limit 1
        ) ir on true
        left join lateral (
          select error from jobs
          where ref_table = 'ingestion_runs' and ref_id = ir.id and status = 'failed'
          order by finished_at desc nulls last limit 1
        ) j on true
        where sp.kind = 'QP'
        group by sp.id, sp.year, sp.series, c.number, sp.variant, ir.status, j.error
        order by sp.year desc, sp.series, c.number, sp.variant`),

      // Which rules are firing, so the operator can see whether the queue is one
      // systematic problem or many unrelated ones.
      this.pool.query(`
        select vf.rule_code code, vf.severity::text severity, count(*)::int open
        from validation_findings vf
        join questions q on q.id = vf.ref_id and vf.ref_table = 'questions'
        where vf.resolved_at is null
        group by vf.rule_code, vf.severity
        order by count(*) desc, vf.rule_code
        limit 20`),
    ]);

    const totals: Record<PaperState, number> = {
      reviewed: 0, needs_review: 0, running: 0, failed: 0, queued: 0, not_started: 0,
    };

    const mapped = papers.rows.map((row): CorpusPaper => {
      const questions = Number(row.questions);
      const needsReview = Number(row.needs_review);
      const run = row.run_status as string | null;

      // Questions on the table outrank the run's status: a run left 'processing'
      // by a killed worker should not hide the fact that its questions landed.
      const state: PaperState = questions > 0
        ? (needsReview > 0 ? 'needs_review' : 'reviewed')
        : run === 'failed' ? 'failed'
          : run === 'processing' ? 'running'
            : run === 'queued' ? 'queued'
              : 'not_started';

      totals[state] += 1;

      return {
        id: String(row.id),
        year: Number(row.year),
        series: String(row.series),
        component: Number(row.component),
        variant: Number(row.variant),
        // Without the component, Paper 1 Variant 1 and Paper 2 Variant 1 both
        // read as "2025 MJ 1" and the table shows the same name four times.
        label: `${row.year} ${row.series} ${row.component}${row.variant}`,
        hasMarkScheme: Boolean(row.has_mark_scheme),
        questions,
        leaves: Number(row.leaves),
        needsReview,
        state,
        error: state === 'failed' && row.job_error ? String(row.job_error).slice(0, 240) : null,
      };
    });

    return {
      papers: mapped,
      totals,
      findings: findings.rows.map((row) => ({
        code: String(row.code),
        severity: String(row.severity),
        open: Number(row.open),
      })),
    };
  }
}
