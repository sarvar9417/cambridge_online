import { describe, expect, it } from 'vitest';
import { CHAPTER_10_FINAL } from './lesson-content-chapter10-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 26 }, (_, index) => 238 + index);

const REQUIRED_SLIDES = [
  'h10-1011-basic-types',
  'h10-1012-records',
  'h10-1021-1d-arrays',
  'h10-1022-2d-arrays',
  'h10-1023-linear-search-core',
  'h10-1023-linear-search-table',
  'h10-1024-bubble-algorithm',
  'h10-1024-bubble-passes-1-2',
  'h10-1024-bubble-passes-3-5',
  'h10-1024-bubble-finish',
  'h10-103-files',
  'h10-103-file-routine-and-adt-intro',
  'h10-104-pointers',
  'h10-1041-stack',
  'h10-1042-queue-circular',
  'h10-1042-queue-pseudocode',
  'h10-1043-linked-list-start',
  'h10-1043-add-first-two',
  'h10-1043-add-third-setup',
  'h10-1043-identifiers-activity',
  'h10-review-core',
  'h10-review-queue-linked-list',
  'h10-review-node-record',
  'h10-review-addname',
  'h10-review-removename',
] as const;

describe('Chapter 10 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 10 route', () => {
    expect(lessonChapter(10)).toBe(CHAPTER_10_FINAL);
    expect(CHAPTER_10_FINAL.title).toBe('Data types and structures');
    expect(CHAPTER_10_FINAL.sourceNote).toContain('pp.238–263');
    expect(CHAPTER_10_FINAL.coverage).toContain('26/26 printed chapter pages');
  });

  it('represents every printed source page from 238 through 263', () => {
    const pages = new Set(CHAPTER_10_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps all slide provenance inside the exact Chapter 10 range', () => {
    for (const slide of CHAPTER_10_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page, `${slide.id} lower bound`).toBeGreaterThanOrEqual(238);
        expect(page, `${slide.id} upper bound`).toBeLessThanOrEqual(263);
      }
    }
  });

  it('contains the complete data-structures teaching route', () => {
    const ids = new Set(CHAPTER_10_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_SLIDES) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_10_FINAL.subtopics).toEqual([
      '10.1 Data types and records',
      '10.2 Arrays',
      '10.3 Files',
      '10.4 Abstract data types (ADTs)',
    ]);
  });

  it('preserves the source terminology and examples needed for Cambridge teaching', () => {
    const text = JSON.stringify(CHAPTER_10_FINAL).toLowerCase();
    for (const token of [
      'boolean', 'char', 'date', 'integer', 'real', 'string',
      'tbookrecord', 'array[0:8]', 'array[0:8,0:2]',
      'linear search', 'bubble sort', 'found', 'swap', 'top',
      'open', 'readfile', 'writefile', 'append', 'eof', 'closefile',
      'lifo', 'fifo', 'basepointer', 'toppointer', 'frontpointer', 'rearpointer',
      'circular queue', 'startpointer', 'heapstartpointer', 'mylinkedlistpointers',
      'activity 10g', 'activity 10h', 'activity 10i', 'activity 10j', 'activity 10k', 'activity 10l',
    ]) expect(text).toContain(token);
  });

  it('keeps the older printed 9608 review task as coursebook review rather than live 9618 practice', () => {
    const reviewSlides = CHAPTER_10_FINAL.slides.filter(slide => slide.section === 'Chapter review');
    expect(reviewSlides.length).toBeGreaterThanOrEqual(5);
    expect(reviewSlides.every(slide => slide.examPractice !== true)).toBe(true);
    expect(JSON.stringify(reviewSlides)).toContain('9608');
  });
});
