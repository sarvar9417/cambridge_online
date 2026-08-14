import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PgQuestionsRepository } from './repositories/questions-repository.js';

const baseRow = {
  id: 'q1',
  display_ref: 'Q1',
  stem_md: 'Question',
  context_md: null,
  command_word: 'Explain',
  marks: 2,
  ao: 'AO2',
  answer_kind: 'text',
  parent: null,
  mark_scheme: { id: 'ms1', points: [] },
};
const student = {
  id: 'student',
  role: 'student' as const,
  schoolId: 'school',
  fullName: 'Student',
};
const teacher = {
  id: 'teacher',
  role: 'teacher' as const,
  schoolId: 'school',
  fullName: 'Teacher',
};

describe('question detail authorization', () => {
  it('uses assignment visibility for student question detail', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [baseRow] });
    await new PgQuestionsRepository({ query } as unknown as Pool).findOne(student, 'q1');
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('e.student_id = $1');
    expect(values).toEqual(['student', 'q1']);
  });

  it('requires a released own submission before returning a scheme to a student', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    await expect(
      new PgQuestionsRepository({ query } as unknown as Pool).findMarkScheme(student, 'q1'),
    ).resolves.toBeNull();
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('sub.student_id = $3');
    expect(sql).toContain('sub.released_at is not null');
    expect(values).toEqual(['q1', 'student', 'student']);
  });

  it('returns a mark scheme to staff', async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: 'ms1',
          scheme_type: 'all_required',
          max_marks: 2,
          guidance_md: null,
          guidance_latex: null,
          status: 'approved',
          points: [],
          groups: [],
        },
      ],
    });
    await expect(
      new PgQuestionsRepository({ query } as unknown as Pool).findMarkScheme(teacher, 'q1'),
    ).resolves.toMatchObject({ id: 'ms1', maxMarks: 2 });
  });
});

describe('question bank year filter', () => {
  it('scopes the search to a source-paper year range', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    await new PgQuestionsRepository({ query } as unknown as Pool).findVisible(teacher, {
      yearFrom: 2021,
      yearTo: 2025,
    });
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('sp.year >= $1');
    expect(sql).toContain('sp.year <= $2');
    expect(values).toEqual([2021, 2025, 51]); // limit + 1 for keyset nextCursor
  });

  it('supports an open-ended year range', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    await new PgQuestionsRepository({ query } as unknown as Pool).findVisible(teacher, {
      yearFrom: 2021,
    });
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('sp.year >= $1');
    expect(sql).not.toContain('sp.year <=');
    expect(values).toEqual([2021, 51]);
  });

  it('leaves the query unscoped when no year is given', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    await new PgQuestionsRepository({ query } as unknown as Pool).findVisible(teacher, {});
    const [sql] = query.mock.calls[0]!;
    expect(sql).not.toContain('source_papers');
  });

  it('excludes questions already used in a class', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const classId = 'c1c2c3c4-0000-4000-8000-000000000000';
    await new PgQuestionsRepository({ query } as unknown as Pool).findVisible(teacher, {
      unusedInClassId: classId,
    });
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('not exists');
    expect(sql).toContain('aq.question_id = q.id and a.class_id = $1');
    expect(sql).toContain("a.archived_at is null");
    expect(values).toEqual([classId, 51]);
  });
});
