import { describe, expect, it } from 'vitest';
import { CHAPTER_12_FINAL } from './lesson-content-chapter12-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 21 }, (_, index) => 283 + index);

const REQUIRED_SLIDES = [
  'h12-121-purpose-stages',
  'h12-121-waterfall',
  'h12-121-iterative-rad-intro',
  'h12-121-rad',
  'h12-1221-structure-chart',
  'h12-1221-repetition-sphere',
  'h12-1221-sphere-modules',
  'h12-1221-whole-sphere',
  'h12-1222-fsm-table',
  'h12-1222-door-tv',
  'h12-123-faults-testing-keyterms',
  'h12-1232-syntax-logic',
  'h12-1232-runtime-test-strategy',
  'h12-1233-dry-run',
  'h12-1233-walkthrough-testdata',
  'h12-1233-testing-levels-maintenance',
  'h12-review-start',
  'h12-review-structure-errors',
  'h12-review-array-sort',
  'h12-review-trace',
] as const;

describe('Chapter 12 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 12 route', () => {
    expect(lessonChapter(12)).toBe(CHAPTER_12_FINAL);
    expect(CHAPTER_12_FINAL.title).toBe('Software development');
    expect(CHAPTER_12_FINAL.sourceNote).toContain('pp.283–303');
    expect(CHAPTER_12_FINAL.coverage).toContain('21/21 printed chapter pages');
  });

  it('represents every printed source page from 283 through 303', () => {
    const pages = new Set(CHAPTER_12_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps all slide provenance inside the exact Chapter 12 range', () => {
    for (const slide of CHAPTER_12_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page, `${slide.id} lower bound`).toBeGreaterThanOrEqual(283);
        expect(page, `${slide.id} upper bound`).toBeLessThanOrEqual(303);
      }
    }
  });

  it('contains the complete lifecycle, design, testing and maintenance route', () => {
    const ids = new Set(CHAPTER_12_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_SLIDES) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_12_FINAL.subtopics).toEqual([
      '12.1 Program development lifecycle',
      '12.2 Program design',
      '12.3 Program testing and maintenance',
    ]);
  });

  it('preserves the source terminology and teaching examples', () => {
    const text = JSON.stringify(CHAPTER_12_FINAL).toLowerCase();
    for (const token of [
      'program development lifecycle', 'waterfall', 'iterative', 'rapid application development',
      'structure chart', 'state-transition', 'finite-state',
      'syntax error', 'logic error', 'run-time error',
      'trace table', 'dry run', 'walkthrough', 'test strategy', 'test plan',
      'normal', 'abnormal', 'extreme', 'boundary',
      'white-box', 'black-box', 'integration', 'stub', 'alpha', 'beta', 'acceptance',
      'corrective', 'perfective', 'adaptive', 'activity 12e', 'activity 12j',
    ]) expect(text).toContain(token);
  });

  it('keeps older printed 9608 questions as coursebook review rather than live 9618 practice', () => {
    const reviewSlides = CHAPTER_12_FINAL.slides.filter(slide => slide.section === 'Chapter review');
    expect(reviewSlides.length).toBeGreaterThanOrEqual(4);
    expect(reviewSlides.every(slide => slide.examPractice !== true)).toBe(true);
    expect(JSON.stringify(reviewSlides)).toContain('9608');
  });
});
