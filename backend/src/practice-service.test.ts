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

const questionRows = Array.from({ length: 5 }, (_, index) => ({ id: `q${index + 1}`, marks: 2 }));

function portableRows(id: string, asset?: { storagePath: string | null; contentMd: string | null }) {
  return [
    {
      id: `root-${id}`, parent_id: null, label: '3', path: '3', display_ref: '9618/22/M/J/25 Q3',
      depth: 0, marks: null, command_word: null, answer_kind: 'text', answer_lines: null,
      stem: '', context: 'Complete the structure shown below.',
      assets: asset ? [{ id: `asset-${id}`, kind: 'table', storagePath: asset.storagePath, url: null, contentMd: asset.contentMd, altText: 'ADT table', sortOrder: 1, sourcePage: 5 }] : [],
    },
    {
      id, parent_id: `root-${id}`, label: 'b', path: '3.b', display_ref: `9618/22/M/J/25 Q3(b)`,
      depth: 1, marks: 2, command_word: 'Explain', answer_kind: 'text', answer_lines: 3,
      stem: 'Explain the operation.', context: null, assets: [],
    },
  ];
}

describe('version-safe personalized practice', () => {
  it('rejects staff before opening a transaction', async () => {
    const connect = vi.fn();
    await expect(
      new PracticeService({ connect } as unknown as Pool).create(owner, { subtopicId: 'subtopic-id' }),
    ).rejects.toMatchObject({ code: 'students_only', status: 403 });
    expect(connect).not.toHaveBeenCalled();
  });

  it('freezes Markdown/table assets into five standalone curated questions', async () => {
    const query = vi.fn(async (sqlValue: unknown, values?: unknown[]) => {
      const sql = String(sqlValue);
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return {};
      if (sql.includes('from enrollments e')) {
        return { rowCount: 1, rows: [{ class_id: 'class-id', code: '10.4', title: 'Introduction to Abstract Data Types (ADT)' }] };
      }
      if (sql.includes('select distinct q.id,q.marks')) return { rowCount: 5, rows: questionRows };
      if (sql.includes('with recursive chain as (') && sql.includes('jsonb_agg')) {
        const id = String(values?.[0]);
        const asset = id === 'q1' ? { storagePath: null, contentMd: '| Front | Rear |\n|---|---|\n| 0 | 4 |' } : undefined;
        const rows = portableRows(id, asset);
        return { rowCount: rows.length, rows };
      }
      if (sql.includes('insert into assignments(')) {
        return { rowCount: 1, rows: [{ id: 'practice-id', title: 'Mashq · 10.4 Introduction to Abstract Data Types (ADT)', total_marks: 10 }] };
      }
      if (sql.includes('insert into assignment_questions(') || sql.includes('insert into submissions(')) {
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`unexpected query: ${sql}`);
    });
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as Pool;

    await expect(
      new PracticeService(pool).create(student, { subtopicId: 'subtopic-id', commandWord: 'Explain' }),
    ).resolves.toMatchObject({ id: 'practice-id', totalMarks: 10, questionCount: 5 });

    const selectionCall = query.mock.calls.find(([sql]) => String(sql).includes('select distinct q.id,q.marks'))!;
    const selectionSql = String(selectionCall[0]);
    expect(selectionSql).toContain('question_learning_objectives');
    expect(selectionSql).toContain("compat.relation in('equivalent','subtopic_compatible')");
    expect(selectionSql).toContain('target_component.number=source_component.number');
    expect(selectionSql).toContain('question_dependencies');
    expect(selectionSql).toContain("where nullif(btrim(coalesce(asset.content_md,'')),'') is null");
    expect(selectionSql).not.toContain('asset.storage_path is not null');
    expect(selectionSql).not.toContain('qs.subtopic_id=$1');

    const itemInserts = query.mock.calls.filter(([sql]) => String(sql).includes('insert into assignment_questions('));
    expect(itemInserts).toHaveLength(5);
    const firstValues = itemInserts[0]![1] as unknown[];
    expect(firstValues[3]).toBe('9618/22/M/J/25 Q3(b)');
    expect(firstValues[4]).toBe('Q1');
    const snapshot = JSON.parse(String(firstValues[5]));
    expect(snapshot.contextBlocks[0].context).toBe('Complete the structure shown below.');
    expect(snapshot.contextBlocks[0].assets[0].contentMd).toContain('| Front | Rear |');
    expect(snapshot.dependencies).toEqual([]);
    expect(query.mock.calls.some(([sql]) => String(sql) === 'commit')).toBe(true);
    expect(release).toHaveBeenCalled();
  });

  it('fails closed if an asset loses portable content after selection', async () => {
    const query = vi.fn(async (sqlValue: unknown, values?: unknown[]) => {
      const sql = String(sqlValue);
      if (sql === 'begin' || sql === 'rollback') return {};
      if (sql.includes('from enrollments e')) return { rowCount: 1, rows: [{ class_id: 'class-id', code: '10.4', title: 'ADT' }] };
      if (sql.includes('select distinct q.id,q.marks')) return { rowCount: 5, rows: questionRows };
      if (sql.includes('with recursive chain as (') && sql.includes('jsonb_agg')) {
        const id = String(values?.[0]);
        const rows = portableRows(id, { storagePath: 'private/questions/table.png', contentMd: null });
        return { rowCount: rows.length, rows };
      }
      throw new Error(`unexpected query: ${sql}`);
    });
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as Pool;

    await expect(new PracticeService(pool).create(student, { subtopicId: 'subtopic-id' }))
      .rejects.toMatchObject({ code: 'online_asset_rendering_unavailable', status: 409 });
    expect(query.mock.calls.some(([sql]) => String(sql) === 'rollback')).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('insert into assignments('))).toBe(false);
    expect(release).toHaveBeenCalled();
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
