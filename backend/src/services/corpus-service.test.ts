import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { CorpusService } from './corpus-service.js';
import type { Actor } from '../lib/actor.js';

const owner: Actor = { id: 'o1', role: 'owner', schoolId: 's1', fullName: 'Sarvar' };
const teacher: Actor = { ...owner, role: 'teacher' };

function poolReturning(papers: Array<Record<string, unknown>>, findings: Array<Record<string, unknown>> = []) {
  let call = 0;
  const query = vi.fn(async () => {
    const rows = call++ === 0 ? papers : findings;
    return { rows, rowCount: rows.length };
  });
  return { query } as unknown as Pool;
}

const paper = (over: Record<string, unknown> = {}) => ({
  id: 'p1', year: 2025, series: 'MJ', component: 1, variant: 1,
  questions: 0, leaves: 0, needs_review: 0, has_mark_scheme: true,
  run_status: null, job_error: null, ...over,
});

describe('corpus summary', () => {
  it('is owner only', async () => {
    await expect(new CorpusService(poolReturning([])).summary(teacher)).rejects.toMatchObject({ status: 403 });
  });

  it('names a paper by its Cambridge code', async () => {
    // Component and variant run together: 9618/21 is Paper 2 Variant 1. Without
    // the component every variant-1 paper reads as "2025 MJ 1".
    const service = new CorpusService(poolReturning([
      paper({ id: 'a', component: 1, variant: 1 }),
      paper({ id: 'b', component: 2, variant: 1 }),
      paper({ id: 'c', component: 4, variant: 3, series: 'ON' }),
    ]));
    const result = await service.summary(owner);
    expect(result.papers.map((p) => p.label)).toEqual(['2025 MJ 11', '2025 MJ 21', '2025 ON 43']);
  });

  describe('state', () => {
    const stateOf = async (row: Record<string, unknown>) =>
      (await new CorpusService(poolReturning([paper(row)])).summary(owner)).papers[0]!.state;

    it('is reviewed once questions exist with nothing flagged', async () => {
      expect(await stateOf({ questions: 40, needs_review: 0 })).toBe('reviewed');
    });

    it('is needs_review while anything is flagged', async () => {
      expect(await stateOf({ questions: 40, needs_review: 3 })).toBe('needs_review');
    });

    it('lets landed questions outrank a run left mid-flight', async () => {
      // A worker killed halfway leaves the run 'processing' forever. The
      // questions are on the table; saying "ishlanmoqda" would be a lie that
      // never resolves itself.
      expect(await stateOf({ questions: 40, needs_review: 0, run_status: 'processing' })).toBe('reviewed');
    });

    it('reports a failed run only when it produced nothing', async () => {
      expect(await stateOf({ questions: 0, run_status: 'failed' })).toBe('failed');
    });

    it('distinguishes queued from never started', async () => {
      expect(await stateOf({ questions: 0, run_status: 'queued' })).toBe('queued');
      expect(await stateOf({ questions: 0, run_status: null })).toBe('not_started');
    });
  });

  it('carries the failure message only for a paper that actually failed', async () => {
    const service = new CorpusService(poolReturning([
      paper({ id: 'a', questions: 0, run_status: 'failed', job_error: 'Anthropic API 400: credit balance is too low' }),
      // A stale error on a paper that later succeeded would read as a live fault.
      paper({ id: 'b', questions: 40, run_status: 'failed', job_error: 'old failure' }),
    ]));
    const result = await service.summary(owner);
    expect(result.papers[0]!.error).toContain('credit balance');
    expect(result.papers[1]!.error).toBeNull();
  });

  it('counts every paper into exactly one state', async () => {
    const service = new CorpusService(poolReturning([
      paper({ id: 'a', questions: 40 }),
      paper({ id: 'b', questions: 40, needs_review: 2 }),
      paper({ id: 'c', questions: 0, run_status: 'failed' }),
      paper({ id: 'd', questions: 0 }),
    ]));
    const result = await service.summary(owner);
    const total = Object.values(result.totals).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(result.papers.length);
    expect(result.totals).toMatchObject({ reviewed: 1, needs_review: 1, failed: 1, not_started: 1 });
  });

  it('returns the open findings so one systematic fault is visible as one', async () => {
    const service = new CorpusService(poolReturning([], [
      { code: 'V17', severity: 'error', open: 81 },
      { code: 'V03', severity: 'warning', open: 4 },
    ]));
    const result = await service.summary(owner);
    expect(result.findings).toEqual([
      { code: 'V17', severity: 'error', open: 81 },
      { code: 'V03', severity: 'warning', open: 4 },
    ]);
  });

  it('handles a corpus with no papers registered yet', async () => {
    const result = await new CorpusService(poolReturning([])).summary(owner);
    expect(result.papers).toEqual([]);
    expect(Object.values(result.totals).every((n) => n === 0)).toBe(true);
  });
});
