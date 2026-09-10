import { describe, expect, it } from 'vitest';
import {
  canBuildSourceGroundedHodderChapter,
  HODDER_0478_CHAPTERS,
  HODDER_9618_CHAPTERS,
  hodderChapterReadiness,
  NEXT_HODDER_BUILD_TARGET,
  NEXT_HODDER_BUILD_TARGET_READINESS,
  NEXT_9618_HODDER_CHAPTER,
  NEXT_9618_HODDER_CHAPTER_READINESS,
  sourceLocked0478HodderChapters,
  sourceLocked9618HodderChapters,
  unresolved0478HodderChapters,
  unresolved9618HodderChapters,
} from './hodder-source-readiness';

describe('Hodder source readiness gate', () => {
  it('allows only chapters backed by an exact source-file fidelity manifest', () => {
    [1, 2, 3, 4, 7, 13, 14].forEach(chapter => {
      const readiness = hodderChapterReadiness('9618', chapter);
      expect(readiness.status).toBe('source-locked');
      expect(readiness.sourceFile).toMatch(/\.pdf$/i);
      expect(canBuildSourceGroundedHodderChapter('9618', chapter)).toBe(true);
    });
  });

  it('derives the 9618 implementation queue from source readiness', () => {
    expect(HODDER_9618_CHAPTERS).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(sourceLocked9618HodderChapters()).toEqual([1, 2, 3, 4, 7, 13, 14]);
    expect(unresolved9618HodderChapters()).toEqual([5, 6, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 20]);
  });

  it('keeps every 0478 chapter behind unresolved 9618 work', () => {
    expect(HODDER_0478_CHAPTERS).toEqual(Array.from({ length: 10 }, (_, index) => index + 1));
    expect(sourceLocked0478HodderChapters()).toEqual([]);
    expect(unresolved0478HodderChapters()).toEqual(Array.from({ length: 10 }, (_, index) => index + 1));
    expect(NEXT_HODDER_BUILD_TARGET).toEqual({ syllabus: '9618', chapter: 5 });
    expect(NEXT_HODDER_BUILD_TARGET_READINESS?.status).toBe('source-unresolved');
  });

  it('advances the compatibility queue to Chapter 5 after Chapter 4 is source-locked', () => {
    expect(NEXT_9618_HODDER_CHAPTER).toBe(5);
    expect(NEXT_9618_HODDER_CHAPTER_READINESS?.chapter).toBe(5);
    expect(NEXT_9618_HODDER_CHAPTER_READINESS?.status).toBe('source-unresolved');
    expect(canBuildSourceGroundedHodderChapter('9618', 4)).toBe(true);
    expect(canBuildSourceGroundedHodderChapter('9618', 5)).toBe(false);
  });

  it('does not treat a different syllabus as interchangeable source truth', () => {
    expect(canBuildSourceGroundedHodderChapter('0478', 3)).toBe(false);
  });
});
