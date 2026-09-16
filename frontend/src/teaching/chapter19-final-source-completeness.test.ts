import { describe, expect, it } from 'vitest';
import { CHAPTER_19_FINAL } from './lesson-content-chapter19-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 48 }, (_, index) => 450 + index);

const REQUIRED_IDS = [
  'h19-1911-linear-search',
  'h19-1911-binary-search',
  'h19-1912-bubble-sort',
  'h19-1912-insertion-sort',
  'h19-1913-stack',
  'h19-1913-queue',
  'h19-1913-linked-list-find',
  'h19-1913-linked-list-insert',
  'h19-1913-linked-list-delete',
  'h19-1913-binary-tree-model',
  'h19-1913-binary-tree-find',
  'h19-1913-binary-tree-insert',
  'h19-1913-graphs',
  'h19-1914-adt-from-adt',
  'h19-1914-dictionary',
  'h19-1915-big-o-time',
  'h19-1915-big-o-space',
  'h19-1921-recursion-basics',
  'h19-1921-factorial-trace',
  'h19-1921-recursive-examples',
  'h19-1922-compiler-stack',
  'h19-review',
] as const;

describe('Chapter 19 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 19 route', () => {
    expect(lessonChapter(19)).toBe(CHAPTER_19_FINAL);
    expect(CHAPTER_19_FINAL.title).toBe('Computational thinking and problem solving');
    expect(CHAPTER_19_FINAL.sourceNote).toContain('pp.450–497');
    expect(CHAPTER_19_FINAL.coverage).toContain('48/48 printed chapter pages');
  });

  it('represents every printed source page from 450 through 497', () => {
    const pages = new Set(CHAPTER_19_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps all provenance inside the exact Chapter 19 range', () => {
    for (const slide of CHAPTER_19_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page).toBeGreaterThanOrEqual(450);
        expect(page).toBeLessThanOrEqual(497);
      }
    }
  });

  it('contains the complete algorithms, ADT, complexity and recursion route', () => {
    const ids = new Set(CHAPTER_19_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_IDS) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_19_FINAL.subtopics).toEqual(['19.1 Algorithms', '19.2 Recursion']);
  });

  it('preserves source terminology and named operations', () => {
    const text = JSON.stringify(CHAPTER_19_FINAL).toLowerCase();
    for (const token of [
      'linear search', 'binary search', 'bubble sort', 'insertion sort',
      'stack', 'push', 'pop', 'circular queue', 'enqueue', 'dequeue',
      'linked list', 'startpointer', 'heapstartpointer', 'nullpointer',
      'binary tree', 'root', 'leaf', 'graph', 'edge', 'path', 'cycle',
      'dictionary', 'key', 'value', 'big o', 'o(1)', 'o(n)', 'o(n²)', 'o(log n)',
      'recursion', 'base case', 'general case', 'winding', 'unwinding',
      'factorial', 'fibonacci', 'stack overflow', 'return addresses',
    ]) expect(text).toContain(token);
  });

  it('keeps older printed 9608 review material as study content', () => {
    const review = CHAPTER_19_FINAL.slides.find(slide => slide.id === 'h19-review')!;
    expect(review.examPractice === true).toBe(false);
    expect(JSON.stringify(review)).toContain('9608');
  });
});
