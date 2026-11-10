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
        { chapter_no: 1, section_code: '1', title: 'Information representation', parent_code: null, term_count: 137 },
        { chapter_no: 1, section_code: '1.10', title: 'Tenth section', parent_code: '1', term_count: 3 },
        { chapter_no: 1, section_code: '1.2', title: 'Second section', parent_code: '1', term_count: 4 },
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
    expect(before.chapters[0]?.sections.map((section) => section.code)).toEqual(['1.1.1', '1.2', '1.10']);
    expect(before.chapters[0]?.sections.some((section) => section.code === '1')).toBe(false);
    expect(before.chapters[0]?.topics[0]?.code).toBe('1.1');
    const after = await service.interactiveGameCatalog(teacher);
    expect(after.chapters.map((chapter) => chapter.chapterNo)).toEqual([1, 2, 3, 4]);
    expect(after.chapters[3]?.termCount).toBe(145);
    expect(query).toHaveBeenCalledTimes(6);
    expect(query.mock.calls[0]?.[0]).toContain('from topics t');
    expect(query.mock.calls[0]?.[0]).toContain('gt.is_glossary_visible=true');
    expect(query.mock.calls[0]?.[0]).toContain('supplementary_manual_review_required');
    expect(query.mock.calls[1]?.[0]).toContain('hodder_glossary_section_links');
    expect(query.mock.calls[1]?.[0]).toContain('g.is_glossary_visible=true');
    expect(query.mock.calls[1]?.[0]).toContain('bs.section_code <> bs.chapter_number::text');
    expect(query.mock.calls[2]?.[0]).toContain('subtopics st');
    expect(query.mock.calls[2]?.[0]).toContain('gt.is_glossary_visible=true');
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
    expect(query.mock.calls[0]?.[0]).toContain('gt.is_glossary_visible=true');
    expect(query.mock.calls[0]?.[0]).toContain('gt.definition_evidence_status');
    expect(query.mock.calls[0]?.[0]).toContain("sy.code='9618'");
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

  it('loads the reviewed 0478 catalogue even while global 0478 activation is off', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 1, title: 'Data representation', term_count: 34, approved_count: 34 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 1, section_code: '1.1.2', title: 'Number systems', parent_code: '1.1', term_count: 12 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 1, code: '1.1', title: 'Number systems', term_count: 13 },
      ] });
    const catalogue = await new ContentService({ query } as unknown as Pool)
      .interactiveGameCatalog(teacher, '0478');
    expect(catalogue.courseCode).toBe('0478');
    expect(catalogue.chapters[0]).toMatchObject({
      chapterNo: 1, termCount: 34, approvedCount: 34,
    });
    expect(catalogue.chapters[0]?.topics[0]?.code).toBe('1.1');
    expect(catalogue.chapters[0]?.sections[0]?.code).toBe('1.1.2');
    expect(query).toHaveBeenCalledTimes(3);
    for (const [sql, parameters] of query.mock.calls) {
      expect(sql).toContain("sy.code='0478' and sy.version_label='2026-2028'");
      expect(sql).toContain("sy.code='9618' and sy.is_active=true");
      expect(parameters).toEqual(['0478']);
    }
  });

  it('gives 0478 students exactly the same enrollment gate as 9618 without activating other 0478 versions', async () => {
    const denied = vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(new ContentService({ query: denied } as unknown as Pool)
      .interactiveGameCatalog(student, '0478')).rejects.toMatchObject({ status: 403 });
    expect(denied).toHaveBeenCalledTimes(1);

    const allowed = vi.fn()
      .mockResolvedValueOnce({ rows: [{ approved: true }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const catalog = await new ContentService({ query: allowed } as unknown as Pool)
      .interactiveGameCatalog(student, '0478');
    expect(catalog).toEqual({ courseCode: '0478', chapters: [] });
    expect(allowed.mock.calls[0]?.[1]).toEqual(['student', '0478']);
    expect(allowed.mock.calls[0]?.[0]).toContain('e.left_at is null');
    expect(allowed.mock.calls[0]?.[0]).toContain("sy.code='0478' and sy.version_label='2026-2028'");
    expect(allowed).toHaveBeenCalledTimes(4);
  });

  it('serves the reviewed 0478 Hodder section to both legacy pack and multi-scope games', async () => {
    const legacyQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'section-id' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [
        { id: 'term-a', term: 'Binary', definition: 'A base-2 number system', status: 'approved', is_official_key_term: true, definition_evidence_status: 'official_textbook_definition' },
      ] });
    const pack = await new ContentService({ query: legacyQuery } as unknown as Pool)
      .interactiveGamePack(teacher, { courseCode: '0478', chapterNo: 1, sectionCode: '1.1.2' });
    expect(pack.courseCode).toBe('0478');
    expect(pack.contentStatus).toBe('approved');
    expect(pack.pairs[0]).toMatchObject({ term: 'Binary', isOfficialKeyTerm: true });
    expect(legacyQuery.mock.calls[0]?.[0]).toContain("sy.version_label='2026-2028'");
    expect(legacyQuery.mock.calls[1]?.[0]).toContain("sy.version_label='2026-2028'");
    expect(legacyQuery.mock.calls[1]?.[1]).toEqual(['0478', 1, '1.1.2']);

    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 1, title: 'Data representation', term_count: 12, approved_count: 12 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 1, section_code: '1.1.2', title: 'Number systems', parent_code: '1.1', term_count: 12 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { chapter_no: 1, code: '1.1', title: 'Number systems', term_count: 12 },
      ] })
      .mockResolvedValueOnce({ rows: [
        { id: 'term-a', term: 'Binary', definition: 'Base 2', status: 'approved', is_official_key_term: true, definition_evidence_status: 'official_textbook_definition' },
        { id: 'term-b', term: 'Hexadecimal', definition: 'Base 16', status: 'approved', is_official_key_term: true, definition_evidence_status: 'official_textbook_definition' },
      ] });
    const result = await new ContentService({ query } as unknown as Pool)
      .interactiveGameCollection(teacher, { courseCode: '0478', scopes: [
        { chapterNo: 1, kind: 'section', code: '1.1.2' },
      ] });
    expect(result.contentStatus).toBe('approved');
    expect(result.courseCode).toBe('0478');
    expect(result.pairs.map((pair) => pair.term)).toEqual(['Binary', 'Hexadecimal']);
    expect(result.scopes).toEqual([{ chapterNo: 1, kind: 'section', code: '1.1.2' }]);
    expect(query.mock.calls[3]?.[0]).toContain("sy.code='0478' and sy.version_label='2026-2028'");
    expect(query.mock.calls[3]?.[0]).toContain('hodder_glossary_section_links');
    expect(query.mock.calls[3]?.[1]?.[0]).toBe('0478');
  });

});
