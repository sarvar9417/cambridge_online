import { describe, expect, it } from 'vitest';
import { CHAPTER_16_FINAL } from './lesson-content-chapter16-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 38 }, (_, index) => 372 + index);

const REQUIRED_IDS = [
  'h16-1611-resource-management',
  'h16-1611-dma-kernel',
  'h16-1612-multitasking',
  'h16-1612-low-level-scheduling',
  'h16-1613-process-states',
  'h16-1613-context-fcfs',
  'h16-1613-sjf-srtf',
  'h16-1613-round-robin',
  'h16-1613-interrupt-kernel',
  'h16-1614-paging',
  'h16-1614-segmentation',
  'h16-1614-paging-vs-segmentation',
  'h16-1615-virtual-memory',
  'h16-1615-thrashing-translation',
  'h16-1616-page-replacement',
  'h16-1617-management-review',
  'h16-1621-vm-features',
  'h16-1622-vm-benefits-limitations',
  'h16-1631-interpreter-compiler',
  'h16-1632-lexical-analysis',
  'h16-1632-syntax-codegen',
  'h16-1632-optimisation',
  'h16-1633-syntax-diagrams',
  'h16-1633-bnf',
  'h16-1634-rpn-stack',
  'h16-review',
] as const;

describe('Chapter 16 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 16 route', () => {
    expect(lessonChapter(16)).toBe(CHAPTER_16_FINAL);
    expect(CHAPTER_16_FINAL.title).toBe('System software and virtual machines');
    expect(CHAPTER_16_FINAL.sourceNote).toContain('pp.372–409');
    expect(CHAPTER_16_FINAL.coverage).toContain('38/38 printed chapter pages');
  });

  it('represents every printed source page from 372 through 409', () => {
    const pages = new Set(CHAPTER_16_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps all provenance inside the exact source range', () => {
    for (const slide of CHAPTER_16_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page).toBeGreaterThanOrEqual(372);
        expect(page).toBeLessThanOrEqual(409);
      }
    }
  });

  it('contains the complete OS, VM, compiler, grammar and RPN route', () => {
    const ids = new Set(CHAPTER_16_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_IDS) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_16_FINAL.subtopics).toEqual([
      '16.1 Purposes of an operating system (OS)',
      '16.2 Virtual machines (VMs)',
      '16.3 Translation software',
    ]);
  });

  it('preserves source terminology and named algorithms', () => {
    const text = JSON.stringify(CHAPTER_16_FINAL).toLowerCase();
    for (const token of [
      'bootstrap', 'dma', 'kernel', 'process control block', 'context switching',
      'fcfs', 'sjf', 'srtf', 'round robin', 'interrupt dispatch table',
      'paging', 'segmentation', 'tlb', 'virtual memory', 'disk thrashing',
      'fifo', 'belady', 'lru', 'clock/second-chance', 'host os', 'guest os',
      'hypervisor', 'lexical analysis', 'syntax analysis', 'code generation',
      'optimisation', 'tokenisation', 'symbol table', 'backus', 'rpn', 'stack',
    ]) expect(text).toContain(token);
  });

  it('keeps older printed 9608 review questions as study content', () => {
    const review = CHAPTER_16_FINAL.slides.find(slide => slide.id === 'h16-review')!;
    expect(review.examPractice === true).toBe(false);
    expect(JSON.stringify(review)).toContain('9608');
  });
});
