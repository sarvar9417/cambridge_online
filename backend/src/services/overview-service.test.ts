import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { OverviewService } from './overview-service.js';
import type { Actor } from '../lib/actor.js';

const owner: Actor = { id: 'o1', role: 'owner', schoolId: 's1', fullName: 'Sarvar' };
const teacher: Actor = { ...owner, id: 't1', role: 'teacher' };
const student: Actor = { ...owner, id: 'u1', role: 'student' };

/**
 * The service fires seven queries in parallel and assembles one shape. The
 * double answers them in the order they are issued, which is also the order the
 * code reads them back -- a mismatch there would silently swap, say, the mark
 * point count into the spend figure.
 */
function poolReturning(rows: Array<Array<Record<string, unknown>>>) {
  let call = 0;
  const query = vi.fn(async () => ({ rows: rows[call++] ?? [], rowCount: (rows[call - 1] ?? []).length }));
  return { pool: { query } as unknown as Pool, query };
}

// Typed loosely on purpose: TypeScript would otherwise infer the exact row
// shapes and refuse a test that swaps one row for a different one.
const HEALTHY: Array<Array<Record<string, unknown>>> = [
  [{ pending_users: '2', review_queue: '0', open_appeals: '0' }],
  [{ ingested_papers: '4', total_papers: '119', questions: '159', mark_schemes: '104', mark_points: '395' }],
  [{ year: 2023, series: 'MJ', component: 1, variant: 1, questions: 42, marks: 75, needs_review: 0 }],
  [{ topics: '20', subtopics: '44', objectives: '203' }],
  [{ band: '1–4', percent: 89, subtopics: 9 }, { band: '9–12', percent: 0, subtopics: 12 }],
  [{ month_usd: '1.0585', calls: 36, unpriced: 0 }],
  [],
];

describe('overview', () => {
  it('is owner only', async () => {
    const { pool, query } = poolReturning(HEALTHY);
    const service = new OverviewService(pool);
    await expect(service.load(teacher)).rejects.toMatchObject({ status: 403 });
    await expect(service.load(student)).rejects.toMatchObject({ status: 403 });
    // The refusal must come before any query runs, not after.
    expect(query).not.toHaveBeenCalled();
  });

  it('assembles the figures the dashboard shows', async () => {
    const { pool } = poolReturning(HEALTHY);
    const result = await new OverviewService(pool).load(owner);

    expect(result.waiting).toEqual({ pendingUsers: 2, reviewQueue: 0, openAppeals: 0 });
    expect(result.corpus).toMatchObject({
      ingestedPapers: 4, totalPapers: 119, questions: 159, markSchemes: 104, markPoints: 395,
    });
    expect(result.syllabus).toMatchObject({ topics: 20, subtopics: 44, objectives: 203 });
    expect(result.spend).toEqual({ monthUsd: 1.0585, calls: 36, unpriced: 0 });
  });

  it('returns counts as numbers, since Postgres sends them as strings', async () => {
    // count(*) arrives as a string over the wire. Left alone, the dashboard
    // would compute "4" / "119" and render NaN%.
    const { pool } = poolReturning(HEALTHY);
    const result = await new OverviewService(pool).load(owner);
    for (const value of [result.corpus.ingestedPapers, result.corpus.totalPapers, result.waiting.pendingUsers]) {
      expect(typeof value).toBe('number');
    }
    expect(Number.isNaN(result.spend.monthUsd)).toBe(false);
  });

  it('names the stalled run as a blocker, with the stage it died at', async () => {
    const rows = [...HEALTHY];
    rows[6] = [{ year: 2021, series: 'MJ', variant: 1, stage: 'ingest-classify', error: 'Anthropic API 400: credit balance is too low' }];
    const result = await new OverviewService(poolReturning(rows).pool).load(owner);

    expect(result.blockers[0]).toMatchObject({ code: 'ingestion_stalled' });
    expect(result.blockers[0]!.detail).toContain('2021 MJ 1');
    // The stage is what tells the operator whether the extraction has to be
    // paid for again.
    expect(result.blockers[0]!.detail).toContain('classify');
    expect(result.blockers[0]!.detail).toContain('credit balance');
  });

  it('flags unpriced AI calls, which would otherwise report the spend as zero', async () => {
    const rows = [...HEALTHY];
    rows[5] = [{ month_usd: '0', calls: 19, unpriced: 19 }];
    const result = await new OverviewService(poolReturning(rows).pool).load(owner);
    expect(result.blockers.some((blocker) => blocker.code === 'unpriced_model')).toBe(true);
  });

  it('reports no blockers when nothing is stopped', async () => {
    const result = await new OverviewService(poolReturning(HEALTHY).pool).load(owner);
    expect(result.blockers).toEqual([]);
  });

  it('marks a paper with open findings as needing review', async () => {
    const rows = [...HEALTHY];
    rows[2] = [{ year: 2021, series: 'MJ', component: 1, variant: 1, questions: 40, marks: 75, needs_review: 6 }];
    const result = await new OverviewService(poolReturning(rows).pool).load(owner);
    expect(result.corpus.recent[0]).toEqual({
      label: '2021 MJ 11', questions: 40, marks: 75, status: 'needs_review',
    });
  });

  it('names a paper by its Cambridge code, component and variant together', async () => {
    // Four components share every variant number, so "2025 MJ 1" appears four
    // times over and identifies nothing. 9618/21 is Paper 2 Variant 1.
    const rows = [...HEALTHY];
    rows[2] = [
      { year: 2025, series: 'MJ', component: 1, variant: 1, questions: 40, marks: 75, needs_review: 0 },
      { year: 2025, series: 'MJ', component: 2, variant: 1, questions: 12, marks: 75, needs_review: 0 },
      { year: 2025, series: 'ON', component: 4, variant: 3, questions: 8, marks: 75, needs_review: 0 },
    ];
    const result = await new OverviewService(poolReturning(rows).pool).load(owner);
    expect(result.corpus.recent.map((paper) => paper.label))
      .toEqual(['2025 MJ 11', '2025 MJ 21', '2025 ON 43']);
  });

  it('carries the subtopic count, so a bare 0% is not ambiguous', async () => {
    // "0%" alone hides whether it is 0 of 2 or 0 of 12, and the second is the
    // one that decides which paper to ingest next.
    const result = await new OverviewService(poolReturning(HEALTHY).pool).load(owner);
    expect(result.syllabus.coverage).toEqual([
      { band: '1–4', percent: 89, subtopics: 9 },
      { band: '9–12', percent: 0, subtopics: 12 },
    ]);
  });

  it('survives an empty database rather than dividing by zero', async () => {
    const empty = [
      [{ pending_users: '0', review_queue: '0', open_appeals: '0' }],
      [{ ingested_papers: '0', total_papers: '0', questions: '0', mark_schemes: '0', mark_points: '0' }],
      [],
      [{ topics: '0', subtopics: '0', objectives: '0' }],
      [],
      [{ month_usd: '0', calls: 0, unpriced: 0 }],
      [],
    ];
    const result = await new OverviewService(poolReturning(empty).pool).load(owner);
    expect(result.corpus.recent).toEqual([]);
    expect(result.syllabus.coverage).toEqual([]);
    expect(result.blockers).toEqual([]);
  });
});
