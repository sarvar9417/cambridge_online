import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { ContentService } from './content-service.js';

const teacher: Actor = { id: 'teacher', role: 'teacher', schoolId: 'school', fullName: 'Teacher' };
const student: Actor = { id: 'student', role: 'student', schoolId: 'school', fullName: 'Student' };

function fixture(terms: Array<{id:string;term:string;definition:string;status:string}> = []) {
  const query = vi.fn()
    .mockResolvedValueOnce({ rows: [
      { chapter_no: 1, title: 'Information representation', term_count: 137, approved_count: 0 },
      { chapter_no: 2, title: 'Communication', term_count: 258, approved_count: 0 },
      { chapter_no: 3, title: 'Hardware', term_count: 273, approved_count: 0 },
    ] })
    .mockResolvedValueOnce({ rows: [
      { chapter_no: 1, section_code: '1.1.1', title: 'Number systems', parent_code: '1.1', term_count: 5 },
      { chapter_no: 2, section_code: '2.1.1', title: 'Network architecture', parent_code: '2.1', term_count: 6 },
    ] })
    .mockResolvedValueOnce({ rows: [
      { chapter_no: 1, code: '1.1', title: 'Data Representation', term_count: 51 },
      { chapter_no: 2, code: '2.1', title: 'Networking', term_count: 258 },
    ] })
    .mockResolvedValueOnce({ rows: terms });
  return { query, service: new ContentService({ query } as unknown as Pool) };
}

describe('Source-backed multi-selection queries for Interactive Games', () => {
  it('unions two chapters plus a syllabus topic with parameterized SQL and unique definitions', async () => {
    const { service, query } = fixture([
      { id: 'a', term: 'Binary', definition: 'Base two numeral system', status: 'needs_review' },
      { id: 'b', term: 'Router', definition: 'Forwards packets', status: 'needs_review' },
      { id: 'c', term: 'BINARY', definition: 'Duplicate title', status: 'needs_review' },
      { id: 'd', term: 'Gateway', definition: 'Forwards packets', status: 'approved' },
    ]);
    const bank = await service.interactiveGameCollection(teacher, {
      courseCode: '9618', scopes: [
        { chapterNo: 1, kind: 'chapter' },
        { chapterNo: 2, kind: 'topic', code: '2.1' },
        { chapterNo: 2, kind: 'section', code: '2.1.1' },
      ],
    });
    expect(bank.pairs.map((pair) => pair.term)).toEqual(['Binary', 'Router']);
    expect(bank.contentStatus).toBe('needs_review');
    expect(bank.assessed).toBe(false);
    expect(bank.pairs.every((pair) => pair.source === null)).toBe(true);
    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[3]?.[0]).toContain('jsonb_to_recordset($2::jsonb)');
    expect(query.mock.calls[3]?.[0]).toContain("selection.kind='topic'");
    expect(query.mock.calls[3]?.[0]).toContain("selection.kind='section'");
    expect(JSON.parse(String(query.mock.calls[3]?.[1]?.[1]))).toEqual([
      { chapter_no: 1, kind: 'chapter', code: null },
      { chapter_no: 2, kind: 'topic', code: '2.1' },
      { chapter_no: 2, kind: 'section', code: '2.1.1' },
    ]);
  });

  it('a whole chapter replaces overlapping subtopic and section choices', async () => {
    const { service, query } = fixture([{ id: 'a', term: 'Hexadecimal', definition: 'Base 16', status: 'approved' }]);
    const bank = await service.interactiveGameCollection(teacher, {
      courseCode: '9618', scopes: [
        { chapterNo: 1, kind: 'topic', code: '1.1' },
        { chapterNo: 1, kind: 'chapter' },
        { chapterNo: 1, kind: 'section', code: '1.1.1' },
      ],
    });
    expect(bank.scopes).toEqual([{ chapterNo: 1, kind: 'chapter' }]);
    expect(bank.pairs).toHaveLength(1);
    expect(bank.contentStatus).toBe('approved');
    expect(JSON.parse(String(query.mock.calls[3]?.[1]?.[1]))).toEqual([{ chapter_no: 1, kind: 'chapter', code: null }]);
  });

  it('rejects a fabricated topic, a fabricated book section, and chapters with no vocabulary', async () => {
    for (const scopes of [
      [{ chapterNo: 1, kind: 'topic' as const, code: '1.99' }],
      [{ chapterNo: 2, kind: 'section' as const, code: '2.9.99' }],
      [{ chapterNo: 19, kind: 'chapter' as const }],
    ]) {
      const { service, query } = fixture();
      await expect(service.interactiveGameCollection(teacher, { courseCode: '9618', scopes }))
        .rejects.toMatchObject({ status: 400 });
      expect(query).toHaveBeenCalledTimes(3);
    }
  });

  it('refuses an unenrolled student before exposing a glossary or chapter catalogue', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const service = new ContentService({ query } as unknown as Pool);
    await expect(service.interactiveGameCollection(student, {
      courseCode: '9618', scopes: [{ chapterNo: 1, kind: 'chapter' }],
    })).rejects.toMatchObject({ status: 403 });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
