import { describe, expect, it } from 'vitest';
import { CHAPTER_9_FINAL } from './lesson-content-chapter9-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 21 }, (_, index) => 217 + index);

const REQUIRED_SLIDES = [
  'h9-911-abstraction',
  'h9-912-decomposition',
  'h9-921-three-representations',
  'h9-921-average-flowchart',
  'h9-922-identifiers-io-assignment',
  'h9-922-selection',
  'h9-922-selection-languages',
  'h9-922-iteration',
  'h9-922-loop-languages-logic',
  'h9-922-validation-average',
  'h9-922-average-language-implementations',
  'h9-923-password-and-structured-english',
  'h9-923-marathon-identifiers',
  'h9-923-marathon-process',
  'h9-924-flowchart-symbols',
  'h9-924-nested-selection-refinement',
  'h9-925-repeat-grade-activity',
  'h9-925-detailed-refinement',
  'h9-review-concepts',
  'h9-review-menu',
] as const;

describe('Chapter 9 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 9 route', () => {
    expect(lessonChapter(9)).toBe(CHAPTER_9_FINAL);
    expect(CHAPTER_9_FINAL.title).toBe('Algorithm design and problem solving');
    expect(CHAPTER_9_FINAL.sourceNote).toContain('pp.217–237');
    expect(CHAPTER_9_FINAL.coverage).toContain('21/21 printed chapter pages');
  });

  it('represents every printed source page from 217 through 237', () => {
    const pages = new Set(CHAPTER_9_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps all slide provenance inside the exact Chapter 9 range', () => {
    for (const slide of CHAPTER_9_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page, `${slide.id} lower bound`).toBeGreaterThanOrEqual(217);
        expect(page, `${slide.id} upper bound`).toBeLessThanOrEqual(237);
      }
    }
  });

  it('contains the complete computational-thinking, pseudocode and refinement teaching route', () => {
    const ids = new Set(CHAPTER_9_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_SLIDES) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_9_FINAL.subtopics).toEqual([
      '9.1 Computational thinking skills',
      '9.2 Algorithms',
    ]);
  });

  it('preserves the source terminology, activities and pseudocode constructs', () => {
    const text = JSON.stringify(CHAPTER_9_FINAL).toLowerCase();
    for (const token of [
      'abstraction', 'decomposition', 'pattern recognition',
      'structured english', 'flowchart', 'pseudocode', 'stepwise refinement',
      'activity 9a', 'activity 9b', 'activity 9c', 'activity 9d', 'activity 9e',
      'activity 9f', 'activity 9g', 'activity 9h', 'activity 9i',
      'input', 'output', 'assignment', 'case', 'otherwise',
      'for', 'repeat–until', 'while', 'and', 'or', 'not', 'int(x)',
      'marathonhours', 'totalmarathontimeseconds', 'figure 9.4',
    ]) expect(text).toContain(token.toLowerCase());
  });

  it('keeps older printed 9608 review material as study rather than live 9618 practice', () => {
    const reviewSlides = CHAPTER_9_FINAL.slides.filter(slide => slide.section === 'Chapter review');
    expect(reviewSlides.length).toBe(2);
    expect(reviewSlides.every(slide => slide.examPractice !== true)).toBe(true);
    expect(JSON.stringify(reviewSlides)).toContain('9608');
  });
});
