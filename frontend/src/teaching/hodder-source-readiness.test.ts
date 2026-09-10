import { describe, expect, it } from 'vitest';
import {
  canBuildSourceGroundedHodderChapter,
  HODDER_9618_CHAPTERS,
  hodderChapterReadiness,
  NEXT_9618_HODDER_CHAPTER,
  NEXT_9618_HODDER_CHAPTER_READINESS,
  sourceLocked9618HodderChapters,
  unresolved9618HodderChapters,
} from './hodder-source-readiness';

describe('Hodder source readiness gate', () => {
  it('allows only chapters backed by an exact source-file fidelity manifest', () => {
    [1, 2, 7, 13, 14].forEach(chapter => {
      const readiness = hodderChapterReadiness('9618', chapter);
      expect(readiness.status).toBe('source-locked');
      expect(readiness.sourceFile).toMatch(/\.pdf$/i);
      expect(canBuildSourceGroundedHodderChapter('9618', chapter)).toBe(true);
    });
  });

  it('derives the 9618 implementation queue from source readiness', () => {
    expect(HODDER_9618_CHAPTERS).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(sourceLocked9618HodderChapters()).toEqual([1, 2, 7, 13, 14]);
    expect(unresolved9618HodderChapters()).toEqual([
      3, 4, 5, 6, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 20,
    ]);
  });

  it('keeps Chapter 3 first until an exact 9618 Hodder Chapter 3 source is verified', () => {
    expect(NEXT_9618_HODDER_CHAPTER).toBe(3);
    expect(NEXT_9618_HODDER_CHAPTER_READINESS).toEqual({
      syllabus: '9618',
      chapter: 3,
      status: 'source-unresolved',
      reason: 'Exact Hodder chapter source is not yet locked by a source-file fidelity manifest.',
    });
    expect(canBuildSourceGroundedHodderChapter('9618', 3)).toBe(false);
  });

  it('does not treat a different syllabus or an unmanifested chapter as interchangeable source truth', () => {
    expect(canBuildSourceGroundedHodderChapter('0478', 3)).toBe(false);
    expect(canBuildSourceGroundedHodderChapter('9618', 4)).toBe(false);
  });
});
