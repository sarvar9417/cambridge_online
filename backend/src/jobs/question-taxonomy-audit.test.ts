import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { runQuestionTaxonomyAudit } from './question-taxonomy-audit.js';

describe('question taxonomy audit', () => {
  it('returns a clean audit when no structural taxonomy issues exist', async () => {
    const query = vi.fn(async () => ({ rowCount: 0, rows: [] }));
    const result = await runQuestionTaxonomyAudit({ query } as unknown as Pool);
    expect(result.ok).toBe(true);
    expect(result.totalIssues).toBe(0);
    expect(Object.values(result.counts).every((value) => value === 0)).toBe(true);
    const sql = String(query.mock.calls[0]?.[0] ?? '');
    expect(sql).toContain('cross_version_subtopic');
    expect(sql).toContain('component_topics');
    expect(sql).toContain('component_learning_objectives');
    expect(sql).toContain('lo_without_selected_subtopic');
    expect(sql).toContain('sp0.source_url is not null');
  });

  it('groups returned issue rows by invariant', async () => {
    const query = vi.fn(async () => ({
      rowCount: 2,
      rows: [
        { issue: 'cross_version_subtopic', question_id: 'q1', display_ref: 'Q1', detail: 'subtopic=3.2' },
        { issue: 'out_of_component_subtopic', question_id: 'q2', display_ref: 'Q2', detail: 'subtopic=18.1' },
      ],
    }));
    const result = await runQuestionTaxonomyAudit({ query } as unknown as Pool);
    expect(result.ok).toBe(false);
    expect(result.totalIssues).toBe(2);
    expect(result.counts.cross_version_subtopic).toBe(1);
    expect(result.counts.out_of_component_subtopic).toBe(1);
  });
});
