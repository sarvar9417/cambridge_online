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

const ALL_9618 = Array.from({ length: 20 }, (_, index) => index + 1);

describe('Hodder source readiness gate', () => {
  it('allows every 9618 chapter only because the exact Hodder source is byte-locked', () => {
    ALL_9618.forEach(chapter => {
      const readiness = hodderChapterReadiness('9618', chapter);
      expect(readiness.status).toBe('source-locked');
      expect(readiness.sourceFile).toMatch(/\.pdf$/i);
      expect(canBuildSourceGroundedHodderChapter('9618', chapter)).toBe(true);
    });
  });

  it('derives a complete 9618 source catalog from source readiness', () => {
    expect(HODDER_9618_CHAPTERS).toEqual(ALL_9618);
    expect(sourceLocked9618HodderChapters()).toEqual(ALL_9618);
    expect(unresolved9618HodderChapters()).toEqual([]);
    expect(NEXT_9618_HODDER_CHAPTER).toBeNull();
    expect(NEXT_9618_HODDER_CHAPTER_READINESS).toBeNull();
  });

  it('moves the cross-syllabus queue to 0478 only after all 9618 chapters are source-locked', () => {
    expect(HODDER_0478_CHAPTERS).toEqual(Array.from({ length: 10 }, (_, index) => index + 1));
    expect(sourceLocked0478HodderChapters()).toEqual([]);
    expect(unresolved0478HodderChapters()).toEqual(Array.from({ length: 10 }, (_, index) => index + 1));
    expect(NEXT_HODDER_BUILD_TARGET).toEqual({ syllabus: '0478', chapter: 1 });
    expect(NEXT_HODDER_BUILD_TARGET_READINESS?.status).toBe('source-unresolved');
  });

  it('does not treat a different syllabus as interchangeable source truth', () => {
    expect(canBuildSourceGroundedHodderChapter('0478', 3)).toBe(false);
  });
});