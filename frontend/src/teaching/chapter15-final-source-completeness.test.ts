import { describe, expect, it } from 'vitest';
import { CHAPTER_15_FINAL } from './lesson-content-chapter15-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 26 }, (_, index) => 346 + index);

const REQUIRED_SLIDES = [
  'h15-1511-risc-cisc',
  'h15-1511-comparison-pipeline',
  'h15-1511-pipeline-interrupt',
  'h15-1512-sisd-simd',
  'h15-1512-misd-mimd',
  'h15-1512-cluster-massive',
  'h15-151-activity',
  'h15-1521-boolean-intro',
  'h15-1521-laws',
  'h15-1521-half-adder',
  'h15-1522-full-adder-build',
  'h15-1522-full-adder-truth',
  'h15-1523-sr',
  'h15-1523-jk-intro',
  'h15-1523-jk-uses',
  'h15-1524-circuit-expression',
  'h15-1525-kmap-intro',
  'h15-1525-kmap-rules',
  'h15-1525-kmap-3var',
  'h15-1525-kmap-4var',
  'h15-1525-kmap-wrap',
  'h15-activity-15e',
  'h15-review-boolean-sr',
  'h15-review-parallel-jk',
  'h15-review-circuit-kmap',
] as const;

describe('Chapter 15 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 15 route', () => {
    expect(lessonChapter(15)).toBe(CHAPTER_15_FINAL);
    expect(CHAPTER_15_FINAL.title).toBe('Hardware');
    expect(CHAPTER_15_FINAL.sourceNote).toContain('pp.346–371');
    expect(CHAPTER_15_FINAL.coverage).toContain('26/26 printed chapter pages');
  });

  it('represents every printed source page from 346 through 371', () => {
    const pages = new Set(CHAPTER_15_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps all slide provenance inside the exact Chapter 15 range', () => {
    for (const slide of CHAPTER_15_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page, `${slide.id} lower bound`).toBeGreaterThanOrEqual(346);
        expect(page, `${slide.id} upper bound`).toBeLessThanOrEqual(371);
      }
    }
  });

  it('contains the complete processor and digital-logic teaching route', () => {
    const ids = new Set(CHAPTER_15_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_SLIDES) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_15_FINAL.subtopics).toEqual([
      '15.1 Processors and parallel processing',
      '15.2 Boolean algebra and logic circuits',
    ]);
  });

  it('preserves the source terminology and worked teaching sequence', () => {
    const text = JSON.stringify(CHAPTER_15_FINAL).toLowerCase();
    for (const token of [
      'risc', 'cisc', 'pipelining', 'instruction fetch', 'writeback',
      'sisd', 'simd', 'misd', 'mimd', 'cluster', 'massively parallel', 'von neumann bottleneck',
      'boolean algebra', 'de morgan', 'half adder', 'full adder',
      'sr flip-flop', 'jk', 'shift registers', 'binary counters',
      'sum of products', 'gray code', 'karnaugh', 'wrap-around',
      'activity 15a', 'activity 15b', 'activity 15c', 'activity 15d', 'activity 15e',
    ]) expect(text).toContain(token);
  });

  it('keeps older printed 9608 questions as coursebook review rather than live 9618 practice', () => {
    const reviewSlides = CHAPTER_15_FINAL.slides.filter(slide => slide.section === 'Chapter review');
    expect(reviewSlides.length).toBeGreaterThanOrEqual(4);
    expect(reviewSlides.every(slide => slide.examPractice !== true)).toBe(true);
    expect(JSON.stringify(reviewSlides)).toContain('9608');
  });
});
