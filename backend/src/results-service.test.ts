import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from './lib/actor.js';
import { ResultsService } from './services/results-service.js';

const student: Actor = {
  id: 'student-a',
  role: 'student',
  schoolId: 'school-a',
  fullName: 'Student A',
};
const teacher: Actor = {
  id: 'teacher-b',
  role: 'teacher',
  schoolId: 'school-b',
  fullName: 'Teacher B',
};

describe('results detail authorization', () => {
  it('hides unreleased or inaccessible student results behind 404', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });

    await expect(
      new ResultsService({ query } as unknown as Pool).detail(student, 'submission-b'),
    ).rejects.toMatchObject({ code: 'not_found', status: 404 });

    expect(query.mock.calls[0]![0]).toContain('s.released_at is not null');
    expect(query.mock.calls[0]![1]).toEqual(['submission-b', 'student', 'student-a', 'school-a']);
  });

  it('does not reveal whether an out-of-scope result exists to a teacher', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });

    await expect(
      new ResultsService({ query } as unknown as Pool).detail(teacher, 'other-school-submission'),
    ).rejects.toMatchObject({ code: 'not_found', status: 404 });
  });

  it('maps a released visible result with numeric scores and mark points', async () => {
    const points = [{ code: 'M1', text: 'Method', matched: true, marks: 1 }];
    const query = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          grading_id: 'grading-1',
          appeal_status: null,
          display_ref: '1(a)',
          stem_md: 'Solve',
          marks: 2,
          text: 'x = 2',
          final_score: '1.5',
          teacher_feedback_md: 'Good method',
          points,
        },
      ],
    });

    await expect(
      new ResultsService({ query } as unknown as Pool).detail(student, 'submission-a'),
    ).resolves.toEqual([
      {
        gradingId: 'grading-1',
        appealStatus: null,
        displayRef: '1(a)',
        stemMd: 'Solve',
        marks: 2,
        answerText: 'x = 2',
        finalScore: 1.5,
        feedback: 'Good method',
        points,
      },
    ]);
  });
});
