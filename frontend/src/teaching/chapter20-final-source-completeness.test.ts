import { describe, expect, it } from 'vitest';
import { CHAPTER_20_FINAL } from './lesson-content-chapter20-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 43 }, (_, index) => 498 + index);

const REQUIRED_SLIDES = [
  'h20-2011-low-level',
  'h20-2012-imperative',
  'h20-2013-oop-foundations',
  'h20-2013-class-implementations',
  'h20-2013-data-hiding',
  'h20-2013-inheritance',
  'h20-2013-polymorphism-overloading',
  'h20-2013-containment',
  'h20-2013-accessors-lifecycle',
  'h20-2013-binary-tree-oop',
  'h20-2014-declarative',
  'h20-2014-prolog-facts-queries',
  'h20-2014-prolog-rules',
  'h20-2021-record-files',
  'h20-2021-put-get-record',
  'h20-2021-sequential-update',
  'h20-2021-random-write',
  'h20-2021-random-read',
  'h20-2022-exception-concept',
  'h20-2022-language-handlers',
  'h20-2022-file-exceptions',
  'h20-review',
] as const;

describe('Chapter 20 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 20 route', () => {
    expect(lessonChapter(20)).toBe(CHAPTER_20_FINAL);
    expect(CHAPTER_20_FINAL.title).toBe('Further programming');
    expect(CHAPTER_20_FINAL.sourceNote).toContain('pp.498–540');
    expect(CHAPTER_20_FINAL.coverage).toContain('43/43 printed chapter pages');
  });

  it('represents every printed source page from 498 through 540', () => {
    const pages = new Set(CHAPTER_20_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps every slide source-bounded and presentation-safe', () => {
    const ids = new Set<string>();
    for (const slide of CHAPTER_20_FINAL.slides) {
      expect(ids.has(slide.id), `duplicate ${slide.id}`).toBe(false);
      ids.add(slide.id);
      expect(slide.lead.trim().length, `${slide.id} lead`).toBeGreaterThan(0);
      expect(slide.sourcePages?.length ?? 0, `${slide.id} provenance`).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page, `${slide.id} lower bound`).toBeGreaterThanOrEqual(498);
        expect(page, `${slide.id} upper bound`).toBeLessThanOrEqual(540);
      }
    }
  });

  it('contains the complete paradigms, OOP, declarative, file and exception route', () => {
    const ids = new Set(CHAPTER_20_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_SLIDES) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_20_FINAL.subtopics).toEqual([
      '20.1 Programming paradigms',
      '20.2 File processing and exception handling',
    ]);
  });

  it('preserves the source terminology and practical operations', () => {
    const text = JSON.stringify(CHAPTER_20_FINAL).toLowerCase();
    for (const token of [
      'low-level programming', 'imperative programming', 'object-oriented programming', 'declarative programming',
      'class', 'object', 'encapsulation', 'data hiding', 'inheritance', 'polymorphism', 'overloading', 'containment',
      'getter', 'setter', 'constructor', 'destructor', 'prolog', 'knowledge base',
      'serial', 'sequential', 'random', 'putrecord', 'getrecord', 'hash', 'seek',
      'exception handling', 'activity 20a', 'activity 20b', 'activity 20c', 'activity 20d',
      'activity 20h', 'activity 20i', 'activity 20j', 'activity 20l', 'activity 20m', 'activity 20n', 'activity 20o',
    ]) expect(text).toContain(token);
  });

  it('keeps printed older-syllabus review material as study rather than a live checkpoint', () => {
    const reviewSlides = CHAPTER_20_FINAL.slides.filter(slide => slide.section === 'Chapter review');
    expect(reviewSlides.length).toBe(1);
    expect(reviewSlides.every(slide => slide.examPractice !== true)).toBe(true);
    expect(JSON.stringify(reviewSlides)).toContain('9608');
  });
});
