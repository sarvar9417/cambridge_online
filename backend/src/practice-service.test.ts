import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from './lib/actor.js';
import { PracticeService } from './services/practice-service.js';

const student: Actor = {
  id: 'student-id',
  role: 'student',
  schoolId: 'school-id',
  fullName: 'Student',
};

const owner: Actor = {
  id: 'owner-id',
  role: 'owner',
  schoolId: 'school-id',
  fullName: 'Owner',
};

describe('version-safe personalized practice', () => {
  it('rejects staff before opening a transaction', async () => {
    const connect = vi.fn();
    await expect(
      new PracticeService({ connect } as unknown as Pool).create(owner, { subtopicId: 'subtopic-id' }),
    ).rejects.toMatchObject({ code: 'students_only', status: 403 });
    expect(connect).not.toHaveBeenCalled();
  });

  it('selects five standalone questions only through curated LO compatibility', async () => {
    const questions = Array.from({ length: 5 }, (_, index) => ({ id: `q${index + 1}`, marks: 2 }));
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ class_id: 'class-id', code: '8.2', title: 'Normalisation' }] })
      .mockResolvedValueOnce({ rowCount: 5, rows: questions })
      .mockResolvedValueOnce({ rows: [{ id: 'practice-id', title: 'Mashq · 8.2 Normalisation', total_marks: 10 }] })
      .mockResolvedValue({ rowCount: 1, rows: [] });
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as Pool;

    await expect(
      new PracticeService(pool).create(student, { subtopicId: 'subtopic-id', commandWord: 'Explain' }),
    ).resolves.toMatchObject({ id: 'practice-id', totalMarks: 10, questionCount: 5 });

    const selectionSql = String(query.mock.calls[2]![0]);
    expect(selectionSql).toContain('question_learning_objectives');
    expect(selectionSql).toContain('learning_objective_compatibility');
    expect(selectionSql).toContain("compat.relation in('equivalent','subtopic_compatible')");
    expect(selectionSql).toContain('target_lo.subtopic_id=$1');
    expect(selectionSql).toContain('target_component.number=source_component.number');
    expect(selectionSql).toContain('not exists (\n             select 1 from question_dependencies');
    expect(selectionSql).toContain('with recursive context_chain');
    expect(selectionSql).toContain('question_assets');
    expect(selectionSql).not.toContain('qs.subtopic_id=$1');
    expect(query.mock.calls[10]![0]).toBe('commit');
  });

  it('fails closed when fewer than five safely compatible questions exist', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ class_id: 'class-id', code: '17.1', title: 'Encryption' }] })
      .mockResolvedValueOnce({ rowCount: 4, rows: Array.from({ length: 4 }, (_, index) => ({ id: `q${index}`, marks: 1 })) })
      .mockResolvedValueOnce({});
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as Pool;

    await expect(
      new PracticeService(pool).create(student, { subtopicId: 'subtopic-id' }),
    ).rejects.toMatchObject({ code: 'practice_pool_empty', status: 409 });
    expect(query.mock.calls[3]![0]).toBe('rollback');
    expect(release).toHaveBeenCalled();
  });

  it('does not allow practice outside the student enrolled syllabus', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({});
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as Pool;

    await expect(
      new PracticeService(pool).create(student, { subtopicId: 'other-subtopic' }),
    ).rejects.toMatchObject({ code: 'not_found', status: 404 });
    expect(String(query.mock.calls[1]![0])).toContain('e.student_id=$1');
    expect(query.mock.calls[2]![0]).toBe('rollback');
  });
});
