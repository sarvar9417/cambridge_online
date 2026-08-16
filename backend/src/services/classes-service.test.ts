import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { ClassesService } from './classes-service.js';
import type { Actor } from '../lib/actor.js';

const SCHOOL = '245a0573-894c-4e65-9945-64542e2edbaf';
const CLASS = 'c607a379-00db-4dfe-9798-7d5e1b67cbfa';
const OTHER_CLASS = '93f768ac-098b-4bac-b53e-d8dde957c7e5';

const owner: Actor = { id: 'o1', role: 'owner', schoolId: SCHOOL, fullName: 'Sarvar' };
const teacher: Actor = { id: 't1', role: 'teacher', schoolId: SCHOOL, fullName: 'Teacher' };
const student: Actor = { id: 's1', role: 'student', schoolId: SCHOOL, fullName: 'Student' };

/**
 * Answers pool.query by matching the statement, and records every statement the
 * transaction client ran so a test can assert on order -- which is the whole
 * point for a move, where inserting before closing violates the unique index.
 */
function harness(answers: Array<[RegExp, Array<Record<string, unknown>>]> = []) {
  const statements: string[] = [];
  const params: unknown[][] = [];

  const answerFor = (sql: string) => {
    for (const [pattern, rows] of answers) if (pattern.test(sql)) return rows;
    return [];
  };

  const run = async (sql: string, values?: unknown[]) => {
    statements.push(sql.replace(/\s+/g, ' ').trim());
    if (values) params.push(values);
    const rows = answerFor(sql);
    return { rows, rowCount: rows.length };
  };

  const client = { query: vi.fn(run), release: vi.fn() } as unknown as PoolClient;
  const pool = { query: vi.fn(run), connect: async () => client } as unknown as Pool;
  return { pool, statements, params };
}

const CLASS_ROW = [{ id: CLASS, owner_id: 't1', school_id: SCHOOL, name: '10-A', grade: 10,
  level: 'AS', syllabus_id: 'syl', academic_year: '2026/2027', archived_at: null }];

describe('creating a class', () => {
  it('is refused for a student', async () => {
    const { pool } = harness();
    await expect(new ClassesService(pool).create(student, { name: '10-A', level: 'AS', academicYear: '2026/2027' }))
      .rejects.toMatchObject({ status: 403 });
  });

  it('lets a teacher create one and makes them a teacher of it', async () => {
    // Visibility runs through class_teachers, so a teacher who created a class
    // and was not added to it would lose it the moment they made it.
    const { pool, statements } = harness([[/from syllabi/, [{ id: 'syl' }]], [/insert into classes/, CLASS_ROW]]);
    await new ClassesService(pool).create(teacher, { name: '10-A', level: 'AS', academicYear: '2026/2027' });
    expect(statements.some((sql) => sql.startsWith('insert into class_teachers'))).toBe(true);
    expect(statements.at(-1)).toBe('commit');
  });

  it('refuses when there is no active syllabus to attach it to', async () => {
    const { pool } = harness();
    await expect(new ClassesService(pool).create(owner, { name: '10-A', level: 'AS', academicYear: '2026/2027' }))
      .rejects.toMatchObject({ code: 'no_active_syllabus' });
  });

  it('reports a duplicate name rather than a raw constraint error', async () => {
    const { pool } = harness([[/from syllabi/, [{ id: 'syl' }]]]);
    (pool.connect as unknown as () => Promise<PoolClient>);
    const client = await pool.connect();
    (client.query as ReturnType<typeof vi.fn>).mockImplementation(async (sql: string) => {
      if (sql.includes('insert into classes')) throw Object.assign(new Error('dup'), { code: '23505' });
      return { rows: [], rowCount: 0 };
    });
    await expect(new ClassesService(pool).create(owner, { name: '10-A', level: 'AS', academicYear: '2026/2027' }))
      .rejects.toMatchObject({ code: 'class_name_taken', status: 409 });
  });
});

describe('access', () => {
  it('refuses a class the teacher neither owns nor teaches', async () => {
    const { pool } = harness();   // the control query returns nothing
    await expect(new ClassesService(pool).update(teacher, CLASS, { name: 'x' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('checks membership before touching anything', async () => {
    const { pool, statements } = harness([[/from classes c/, CLASS_ROW]]);
    await new ClassesService(pool).update(teacher, CLASS, { name: '10-B' });
    expect(statements[0]).toContain('from classes c');
  });
});

describe('moving a student', () => {
  it('closes the old enrolment before opening the new one', async () => {
    // The unique index allows one open enrolment. Inserting first would violate
    // it, so the order here is the behaviour, not an implementation detail.
    const { pool, statements } = harness([
      [/from classes c/, CLASS_ROW],
      [/from users\s+where id = \$1 and role = 'student'/, [{ id: 'stu', school_id: SCHOOL }]],
      [/update enrollments set left_at/, [{ class_id: OTHER_CLASS }]],
    ]);
    const result = await new ClassesService(pool).placeStudent(owner, CLASS, 'stu');

    const closed = statements.findIndex((sql) => sql.startsWith('update enrollments set left_at'));
    const opened = statements.findIndex((sql) => sql.startsWith('insert into enrollments'));
    expect(closed).toBeGreaterThan(-1);
    expect(opened).toBeGreaterThan(closed);
    expect(result.movedFrom).toBe(OTHER_CLASS);
  });

  it('gives a school to a student approved without one', async () => {
    const { pool, statements } = harness([
      [/from classes c/, CLASS_ROW],
      [/from users\s+where id = \$1 and role = 'student'/, [{ id: 'stu', school_id: null }]],
    ]);
    await new ClassesService(pool).placeStudent(owner, CLASS, 'stu');
    expect(statements.some((sql) => sql.startsWith('update users set school_id'))).toBe(true);
  });

  it('refuses a student from another school', async () => {
    const { pool } = harness([
      [/from classes c/, CLASS_ROW],
      [/from users\s+where id = \$1 and role = 'student'/, [{ id: 'stu', school_id: 'other-school' }]],
    ]);
    await expect(new ClassesService(pool).placeStudent(owner, CLASS, 'stu'))
      .rejects.toMatchObject({ code: 'cross_school_enrollment' });
  });

  it('rolls back rather than leaving a student in no class', async () => {
    const { pool, statements } = harness([[/from classes c/, CLASS_ROW]]);
    const client = await pool.connect();
    (client.query as ReturnType<typeof vi.fn>).mockImplementation(async (sql: string) => {
      if (sql.includes("role = 'student'")) return { rows: [{ id: 'stu', school_id: SCHOOL }], rowCount: 1 };
      if (sql.startsWith('insert into enrollments')) throw new Error('index violated');
      return { rows: [], rowCount: 0 };
    });
    await expect(new ClassesService(pool).placeStudent(owner, CLASS, 'stu')).rejects.toThrow('index violated');
    expect((client.query as ReturnType<typeof vi.fn>).mock.calls.some(([sql]) => sql === 'rollback')).toBe(true);
  });
});

describe('leaving a class', () => {
  it('closes the enrolment instead of deleting it', async () => {
    // Past work stays attached to the class it was done in.
    const { pool, statements } = harness([
      [/from classes c/, CLASS_ROW],
      [/update enrollments set left_at/, [{ student_id: 'stu' }]],
    ]);
    await new ClassesService(pool).removeStudent(owner, CLASS, 'stu');
    expect(statements.some((sql) => sql.startsWith('delete from enrollments'))).toBe(false);
    expect(statements.some((sql) => sql.startsWith('update enrollments set left_at'))).toBe(true);
  });

  it('reports a student who was not in the class', async () => {
    const { pool } = harness([[/from classes c/, CLASS_ROW]]);
    await expect(new ClassesService(pool).removeStudent(owner, CLASS, 'stu'))
      .rejects.toMatchObject({ code: 'not_enrolled', status: 404 });
  });
});

describe('teachers', () => {
  it('refuses to remove the class owner', async () => {
    // Whoever owns the class is the one account that must keep access to it.
    const { pool } = harness([[/from classes c/, CLASS_ROW]]);
    await expect(new ClassesService(pool).removeTeacher(owner, CLASS, 't1'))
      .rejects.toMatchObject({ code: 'cannot_remove_class_owner' });
  });

  it('refuses a teacher from another school', async () => {
    const { pool } = harness([[/from classes c/, CLASS_ROW]]);
    await expect(new ClassesService(pool).addTeacher(owner, CLASS, 'outsider'))
      .rejects.toMatchObject({ code: 'teacher_not_found' });
  });
});

describe('archiving and rollover', () => {
  it('archives rather than deletes', async () => {
    const { pool, statements } = harness([[/from classes c/, CLASS_ROW], [/update classes set archived_at/, CLASS_ROW]]);
    await new ClassesService(pool).setArchived(owner, CLASS, true);
    expect(statements.some((sql) => sql.startsWith('delete from classes'))).toBe(false);
  });

  it('creates next year, carries the students and teachers across, and archives the old one', async () => {
    const { pool, statements } = harness([
      [/from classes c/, CLASS_ROW],
      [/select name, grade, level/, CLASS_ROW],
      [/insert into classes/, [{ ...CLASS_ROW[0], id: 'next-year' }]],
      [/update enrollments set left_at/, [{ student_id: 'a' }, { student_id: 'b' }]],
    ]);
    const result = await new ClassesService(pool).rollover(owner, CLASS, { academicYear: '2027/2028' });

    expect(result.movedStudents).toBe(2);
    expect(statements.some((sql) => sql.startsWith('insert into class_teachers'))).toBe(true);
    // Last year's marks stay in last year's class.
    expect(statements.some((sql) => sql.startsWith('update classes set archived_at'))).toBe(true);
    expect(statements.at(-1)).toBe('commit');
  });
});
