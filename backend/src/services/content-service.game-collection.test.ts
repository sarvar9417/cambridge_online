import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { ContentService } from './content-service.js';

const teacher: Actor = { id: 'teacher', role: 'teacher', schoolId: 'school', fullName: 'Teacher' };
const student: Actor = { id: 'student', role: 'student', schoolId: 'school', fullName: 'Student' };

interface MockGlossaryRow {
  id: string; term: string; definition: string; status: string;
  source_ref?: string;
  chapter_no?: number; chapter_title?: string;
  syllabus_topic_code?: string; syllabus_topic_title?: string;
  hodder_section_codes?: string[];
  is_official_key_term?: boolean;
  official_key_term_page?: number;
  official_key_term_section?: string;
  definition_evidence_status?: string;
}
function fixture(terms: MockGlossaryRow[] = []) {
  const query = vi.fn()
    .mockResolvedValueOnce({ rows: [
      { chapter_no: 1, title: 'Information representation', term_count: 137, approved_count: 0 },
      { chapter_no: 2, title: 'Communication', term_count: 258, approved_count: 0 },
      { chapter_no: 3, title: 'Hardware', term_count: 273, approved_count: 0 },
    ] })
    .mockResolvedValueOnce({ rows: [
      { chapter_no: 1, section_code: '1.1', title: 'Data representation', parent_code: '1', term_count: 14 },
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
  it('unions chapters and topics without silently deleting distinct glossary entries', async () => {
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
    expect(bank.pairs.map((pair) => pair.term)).toEqual(['Binary', 'Router', 'BINARY', 'Gateway']);
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

  it('retains the same term in different chapters and publishes verifiable curriculum context only', async () => {
    const { service, query } = fixture([
      { id: 'assembly-ch4', term: 'Assembly language',
        definition: 'Low-level code using mnemonics.',
        status: 'approved', chapter_no: 4, chapter_title: 'Processor Fundamentals',
        syllabus_topic_code: '4.1', syllabus_topic_title: 'Processor architecture',
        hodder_section_codes: ['4.2', '4.2.1'], is_official_key_term: true,
        official_key_term_page: 127, official_key_term_section: '4.2',
        definition_evidence_status: 'official_textbook_definition', source_ref: 'Drive: PRIVATE' },
      { id: 'assembly-ch20', term: 'Assembly language',
        definition: 'Program code translated into machine instructions by an assembler.',
        status: 'needs_review', chapter_no: 20, chapter_title: 'Further Programming',
        syllabus_topic_code: '20.3', hodder_section_codes: ['20.2'],
        is_official_key_term: false, definition_evidence_status: 'supplementary_manual_review_required',
        source_ref: 'Drive: PRIVATE-2' },
      { id: 'assembly-ch4', term: 'Assembly language',
        definition: 'Low-level code using mnemonics.',
        status: 'approved', chapter_no: 4 },
    ]);
    // The mocked chapter list validates input separately; two valid selected
    // chapters exercise the provenance-preserving mapping.
    const bank = await service.interactiveGameCollection(teacher, {
      courseCode: '9618', scopes: [
        { chapterNo: 1, kind: 'chapter' }, { chapterNo: 2, kind: 'chapter' },
      ],
    });
    expect(bank.pairs).toHaveLength(2);
    expect(bank.pairs.map((item) => item.id)).toEqual(['assembly-ch4', 'assembly-ch20']);
    expect(bank.pairs[0]).toMatchObject({
      chapterNo: 4, chapterTitle: 'Processor Fundamentals',
      syllabusTopicCode: '4.1', hodderSectionCodes: ['4.2', '4.2.1'],
      officialKeyTermPage: 127, officialKeyTermSection: '4.2',
      isOfficialKeyTerm: true,
    });
    expect(bank.pairs[1]).toMatchObject({ chapterNo: 20, hodderSectionCodes: ['20.2'] });
    expect('officialKeyTermPage' in bank.pairs[1]!).toBe(false);
    expect(bank.pairs.every((pair) => pair.source === null)).toBe(true);
    expect(JSON.stringify(bank)).not.toContain('PRIVATE');
    expect(bank.contentStatus).toBe('needs_review');
    const sql = String(query.mock.calls[3]?.[0]);
    expect(sql).toContain('t.number chapter_no');
    expect(sql).toContain('st.code syllabus_topic_code');
    expect(sql).toContain('hodder_glossary_section_links');
    expect(sql).not.toMatch(/limit\\s+500/i);
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

  it('canonicalizes overlapping Hodder parent and child scopes without combining unrelated syllabus scopes', async () => {
    const { service, query } = fixture([
      { id: 'a', term: 'Binary', definition: 'Base two system', status: 'approved' },
    ]);
    const bank = await service.interactiveGameCollection(teacher, {
      courseCode: '9618', scopes: [
        { chapterNo: 1, kind: 'section', code: '1.1.1' },
        { chapterNo: 1, kind: 'section', code: '1.1' },
        { chapterNo: 1, kind: 'topic', code: '1.1' },
      ],
    });
    expect(bank.scopes).toEqual([
      { chapterNo: 1, kind: 'section', code: '1.1' },
      { chapterNo: 1, kind: 'topic', code: '1.1' },
    ]);
    expect(bank.pairs.map((pair) => pair.term)).toEqual(['Binary']);
    expect(JSON.parse(String(query.mock.calls[3]?.[1]?.[1]))).toEqual([
      { chapter_no: 1, kind: 'section', code: '1.1' },
      { chapter_no: 1, kind: 'topic', code: '1.1' },
    ]);
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
