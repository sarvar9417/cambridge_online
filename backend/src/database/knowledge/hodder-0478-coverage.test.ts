import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type Section = {
  section_code: string;
  chapter_number: number;
  title: string;
  parent_code: string | null;
  page_start: number;
  page_end: number;
};
type Term = {
  term: string;
  subtopic_code: string;
  book_section: string;
  official: boolean;
  source_corrected?: string;
};
type Chapter = { chapterNo: number; sections: Section[]; terms: Term[] };
type Manifest = {
  courseCode: string;
  syllabusVersion: string;
  sourceTitle: string;
  dataStatus: string;
  chapters: Chapter[];
};
const dirnameHere = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(dirnameHere, 'hodder-0478-coverage-manifest.json'), 'utf8')) as Manifest;

describe('Hodder 0478 Interactive Games coverage manifest', () => {
  const chapters = manifest.chapters;
  const terms = chapters.flatMap((chapter) => chapter.terms.map((term) => ({ ...term, chapterNo: chapter.chapterNo })));
  const sections = chapters.flatMap((chapter) => chapter.sections);
  const sectionsByCode = new Map(sections.map((section) => [section.section_code, section]));

  it('uses the distinct 0478 syllabus and explicit review evidence', () => {
    expect(manifest.courseCode).toBe('0478');
    expect(manifest.syllabusVersion).toBe('2026-2028');
    expect(manifest.dataStatus).toBe('needs_review');
    expect(chapters.map((chapter) => chapter.chapterNo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('tracks 377 source-screened keywords and all 142 book sections', () => {
    expect(terms).toHaveLength(377);
    expect(terms.filter((term) => term.official)).toHaveLength(334);
    expect(sections).toHaveLength(142);
    expect(new Set(sections.map((section) => section.section_code)).size).toBe(142);
  });

  it('never duplicates a term inside a chapter and subtopic', () => {
    const keys = terms.map(({ chapterNo, subtopic_code, term }) => [
      chapterNo, subtopic_code, term.trim().toLowerCase(),
    ].join(':'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps every term attached to its real book section and a syllabus subtopic', () => {
    const topLevelCodes = new Set(terms.map((term) => term.subtopic_code));
    expect(topLevelCodes.size).toBe(24);
    for (const term of terms) {
      expect(term.term.trim()).not.toBe('');
      const section = sectionsByCode.get(term.book_section);
      expect(section, term.term + ' -> ' + term.book_section).toBeDefined();
      expect(section!.chapter_number).toBe(term.chapterNo);
      expect(term.subtopic_code === String(term.chapterNo)
        || term.book_section.startsWith(term.subtopic_code + '.')
        || term.book_section === term.subtopic_code).toBe(true);
    }
  });

  it('preserves a non-cyclic Hodder hierarchy with source-bounded pages', () => {
    for (const section of sections) {
      expect(section.title.trim()).not.toBe('');
      expect(section.page_start).toBeGreaterThanOrEqual(2);
      expect(section.page_end).toBeLessThanOrEqual(386);
      expect(section.page_end).toBeGreaterThanOrEqual(section.page_start);
      if (section.parent_code) {
        const parent = sectionsByCode.get(section.parent_code);
        expect(parent, section.section_code).toBeDefined();
        expect(parent!.chapter_number).toBe(section.chapter_number);
        expect(section.page_start).toBeGreaterThanOrEqual(parent!.page_start);
        expect(section.page_end).toBeLessThanOrEqual(parent!.page_end);
      }
    }
  });

  it('makes previously uncovered conceptual sections explicitly addressable', () => {
    expect(terms.some((term) => term.chapterNo === 4 && term.term === 'compiler' && term.book_section === '4.2.3')).toBe(true);
    expect(terms.some((term) => term.chapterNo === 7 && term.term === 'totalling' && term.book_section === '7.4.1')).toBe(true);
    expect(terms.some((term) => term.chapterNo === 10 && term.term === 'XOR gate' && term.book_section === '10.2.6')).toBe(true);
  });
});
