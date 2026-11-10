import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { ClassPracticeReportsService } from './class-practice-reports-service.js';

const classId = '302745c8-0397-4ec2-ac0a-a0b65cef1fb1';
const teacher: Actor = {
  id: 'fe4f481b-6a35-4d5e-b802-4f4d9ed36103',
  role: 'teacher', schoolId: '94fe437b-f43f-4ad7-a4f5-9fefbcb04ab5', fullName: 'Teacher',
};
const visible = { rowCount: 1, rows: [{
  id: classId, name: '10-A CS', course_code: '9618', student_count: 24,
}] };

describe('aggregate-only class practice reports', () => {
  it('denies students before querying and hides inaccessible classes from teachers', async () => {
    const noQuery = vi.fn();
    const service = new ClassPracticeReportsService({ query: noQuery } as unknown as Pool);
    await expect(service.report({ ...teacher, role: 'student' }, classId))
      .rejects.toMatchObject({ status: 403 });
    expect(noQuery).not.toHaveBeenCalled();

    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    await expect(new ClassPracticeReportsService({ query } as unknown as Pool)
      .report(teacher, classId)).rejects.toMatchObject({ status: 404 });
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0]?.[0])).toContain('class_teachers');
    expect(query.mock.calls[0]?.[1]).toEqual([classId, 'teacher', teacher.schoolId, teacher.id]);
  });

  it('does not expose performance data when fewer than five learners participated', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce(visible)
      .mockResolvedValueOnce({ rows: [{
        participating_students: 2, total_rounds: 11, reported_correct: 40, reported_incorrect: 7,
      }] });
    const result = await new ClassPracticeReportsService({ query } as unknown as Pool)
      .report(teacher, classId);
    expect(result).toEqual({
      classId, className: '10-A CS', courseCode: '9618', studentCount: 24,
      periodDays: 30, minimumParticipants: 5, assessed: false,
      privacy: 'aggregate_only', status: 'insufficient_data',
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(result)).not.toContain('reported_correct');
  });

  it('reports only aggregate scored-game outcomes and source-linked difficult terms', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce(visible)
      .mockResolvedValueOnce({ rows: [{
        participating_students: 7, total_rounds: 28, scored_rounds: 17,
        reported_correct: 42, reported_incorrect: 13,
      }] })
      .mockResolvedValueOnce({ rows: [{ game_kind: 'quiz', rounds: 15 }] })
      .mockResolvedValueOnce({ rows: [{
        term: 'Encryption', chapter_no: 17, learners: 5, correct: 4, incorrect: 9,
      }] });
    const result = await new ClassPracticeReportsService({ query } as unknown as Pool)
      .report(teacher, classId);
    expect(result).toMatchObject({
      status: 'ready', assessed: false, privacy: 'aggregate_only',
      participatingStudents: 7, totalRounds: 28,
      scoredRounds: 17, reportedCorrect: 42, reportedIncorrect: 13,
      modes: [{ mode: 'quiz', rounds: 15 }],
      difficultTerms: [{ term: 'Encryption', chapterNo: 17, learners: 5, incorrect: 9 }],
    });
    expect(query).toHaveBeenCalledTimes(4);
    expect(String(query.mock.calls[1]?.[0])).toContain("e.left_at is null");
    expect(String(query.mock.calls[1]?.[0])).toContain("r.course_code=$2");
    expect(String(query.mock.calls[3]?.[0])).toContain('having count(distinct r.student_id) >= 5');
    expect(JSON.stringify(result)).not.toContain(teacher.id);
  });
});
