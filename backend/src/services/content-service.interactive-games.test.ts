import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { ContentService } from './content-service.js';

const teacher: Actor = { id: 'teacher', role: 'teacher', schoolId: 'school', fullName: 'Teacher' };
const student: Actor = { id: 'student', role: 'student', schoolId: 'school', fullName: 'Student' };

describe('Interactive Games PostgreSQL chapter and section integration', () => {
  it('discovers chapters from the DB rather than a hard-coded list and includes future imports', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 1, title: 'Information representation', term_count: 137, approved_count: 0 },
        { chapter_no: 2, title: 'Communication', term_count: 258, approved_count: 0 },
        { chapter_no: 3, title: 'Hardware', term_count: 273, approved_count: 0 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 1, section_code: '1.1.1', title: 'Number systems', parent_code: '1.1', term_count: 5 },
        { chapter_no: 2, section_code: '2.1.1', title: 'Networking devices', parent_code: '2.1', term_count: 23 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 1, code: '1.1', title: 'Data Representation', term_count: 51 },
        { chapter_no: 2, code: '2.1', title: 'Networks', term_count: 258 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 1, title: 'Information representation', term_count: 137, approved_count: 0 },
        { chapter_no: 2, title: 'Communication', term_count: 258, approved_count: 0 },
        { chapter_no: 3, title: 'Hardware', term_count: 273, approved_count: 0 },
        { chapter_no: 4, title: 'Processor fundamentals', term_count: 145, approved_count: 0 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 4, section_code: '4.1.1', title: 'Von Neumann model', parent_code: '4.1', term_count: 9 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 4, code: '4.1', title: 'Processor Fundamentals', term_count: 145 },
      ] });
    const service = new ContentService({ query } as unknown as Pool);
    const before = await service.interactiveGameCatalog(teacher);
    expect(before.chapters.map((chapter) => chapter.chapterNo)).toEqual([1, 2, 3]);
    expect(before.chapters[0]?.sections[0]?.code).toBe('1.1.1');
    expect(before.chapters[0]?.topics[0]?.code).toBe('1.1');
    const after = await service.interactiveGameCatalog(teacher);
    expect(after.chapters.map((chapter) => chapter.chapterNo)).toEqual([1, 2, 3, 4]);
    expect(after.chapters[3]?.termCount).toBe(145);
    expect(query).toHaveBeenCalledTimes(6);
    expect(query.mock.calls[0]?.[0]).toContain('from topics t');
    expect(query.mock.calls[1]?.[0]).toContain('hodder_glossary_section_links');
    expect(query.mock.calls[2]?.[0]).toContain('subtopics st');
  });

  it('loads unapproved glossary only for provisional practice and deduplicates terms', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [
      { id: 'a', term: 'Binary', definition: 'Base 2 number system', status: 'needs_review', source: 'Hodder', subtopic_code: '1.1' },
      { id: 'b', term: 'BINARY', definition: 'Duplicate', status: 'needs_review', source: 'Hodder', subtopic_code: '1.1' },
      { id: 'c', term: 'Denary', definition: 'Base 10 number system', status: 'approved', source: 'Hodder', subtopic_code: '1.1' },
    ] });
    const result = await new ContentService({ query } as unknown as Pool)
      .interactiveGamePack(teacher, { courseCode: '9618', chapterNo: 1 });
    expect(result.pairs.map((pair) => pair.term)).toEqual(['Binary', 'Denary']);
    expect(result.contentStatus).toBe('needs_review');
    expect(result.assessed).toBe(false);
    expect(query.mock.calls[0]?.[0]).toContain("gt.status in ('approved','needs_review')");
    expect(query.mock.calls[0]?.[1]).toEqual(['9618', 1, null]);
  });

  it('filters sections by Hodder source links, not conflicting syllabus taxonomy', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'section' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [
        { id: 'term', term: 'Router', definition: 'Forwards packets', status: 'needs_review', source: 'Hodder' },
      ] });
    const result = await new ContentService({ query } as unknown as Pool)
      .interactiveGamePack(teacher, { courseCode: '9618', chapterNo: 2, sectionCode: '2.1.1' });
    expect(result.pairs).toHaveLength(1);
    expect(result.sectionCode).toBe('2.1.1');
    expect(query.mock.calls[1]?.[0]).toContain('hodder_glossary_section_links');
    expect(query.mock.calls[1]?.[1]).toEqual(['9618', 2, '2.1.1']);
  });

  it('refuses student access to a syllabus without an active enrollment', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(new ContentService({ query } as unknown as Pool).interactiveGameCatalog(student))
      .rejects.toMatchObject({ status: 403 });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain('e.left_at is null');
  });

  it('allows an enrolled learner to retrieve the latest approved or review-pending terms', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [
        { id: 't1', term: 'Cache', definition: 'Small high speed memory', status: 'needs_review', source: 'Hodder' },
      ] });
    const pack = await new ContentService({ query } as unknown as Pool)
      .interactiveGamePack(student, { courseCode: '9618', chapterNo: 3 });
    expect(pack.pairs[0]?.term).toBe('Cache');
    expect(pack.contentStatus).toBe('needs_review');
    expect(query.mock.calls[1]?.[1]).toEqual(['9618', 3, null]);
  });
  it('uses the active syllabus and does not truncate future imports at 500 terms', async () => {
    const rows = Array.from({ length: 520 }, (_, i) => ({
      id: 'id-' + i,
      term: 'Unique term ' + i,
      definition: 'Unique definition ' + i,
      status: 'needs_review',
      source: 'Drive: private-source-id-' + i,
    }));
    const query = vi.fn().mockResolvedValue({ rows });
    const result = await new ContentService({ query } as unknown as Pool)
      .interactiveGamePack(teacher, { courseCode: '9618', chapterNo: 4 });
    expect(result.pairs).toHaveLength(520);
    expect(query.mock.calls[0]?.[0]).not.toMatch(/limit\s+500/i);
    expect(query.mock.calls[0]?.[0]).toContain('sy.is_active=true');
    expect(result.pairs.every((pair) => pair.source === null)).toBe(true);
  });

  it('rejects an unknown book section and never runs a glossary query for it', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(new ContentService({ query } as unknown as Pool).interactiveGamePack(teacher, {
      courseCode: '9618', chapterNo: 2, sectionCode: '2.9.8',
    })).rejects.toMatchObject({ status: 404 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('removes ambiguous duplicate answers but never changes stored glossary rows', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [
      { id: '1', term: 'BIT', definition: 'Binary digit', status: 'approved' },
      { id: '2', term: 'Bit', definition: 'Another definition', status: 'needs_review' },
      { id: '3', term: 'Different', definition: 'Binary digit', status: 'needs_review' },
      { id: '4', term: 'Byte', definition: 'Group of eight bits', status: 'approved' },
    ] });
    const result = await new ContentService({ query } as unknown as Pool)
      .interactiveGamePack(teacher, { courseCode: '9618', chapterNo: 1 });
    expect(result.pairs.map((pair) => pair.term)).toEqual(['BIT', 'Byte']);
    expect(result.contentStatus).toBe('approved');
    expect(query).toHaveBeenCalledTimes(1);
  });

});
