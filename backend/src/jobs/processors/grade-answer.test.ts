import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { createGradeAnswerProcessor } from './grade-answer.js';
const job = {
  id: 'j',
  kind: 'grade-answer',
  payload: { gradingId: 'g' },
  attempts: 1,
  maxAttempts: 3,
};
describe('grade answer processor', () => {
  it('stops before provider when budget is exhausted', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            text: 'answer',
            stem_md: 'q',
            scheme_type: 'all_required',
            max_marks: 1,
            points: [],
            groups: [],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ spent: 50, budget: 50 }] });
    const grade = vi.fn();
    await expect(
      createGradeAnswerProcessor({ query } as unknown as Pool, { grade })(job),
    ).rejects.toThrow('ai_budget_exceeded');
    expect(grade).not.toHaveBeenCalled();
  });
  it('keeps AI result in shadow mode by default', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            text: 'unique id',
            stem_md: 'q',
            scheme_type: 'all_required',
            max_marks: 1,
            points: [{ code: 'MP1', text: 'unique', marks: 1, groupId: null, requires: [] }],
            groups: [],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ spent: 0, budget: 50 }] })
      .mockResolvedValueOnce({ rows: [{ enabled: false }] })
      .mockResolvedValue({ rows: [] });
    const grade = vi.fn().mockResolvedValue({
      points: [{ code: 'MP1', matched: true, evidence: 'unique id', confidence: 0.9 }],
      feedback_uz: 'To‘g‘ri.',
      model: 'test',
    });
    const result = await createGradeAnswerProcessor({ query } as unknown as Pool, { grade })(job);
    expect(result).toMatchObject({ score: 1, shadow: true });
    expect(query.mock.calls.some((c) => String(c[0]).includes("'needs_teacher'"))).toBe(true);
  });
});
