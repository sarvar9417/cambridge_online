import { describe, expect, it } from 'vitest';
import {
  canBuildSourceGroundedHodderChapter,
  hodderChapterReadiness,
  NEXT_9618_HODDER_CHAPTER,
  NEXT_9618_HODDER_CHAPTER_READINESS,
} from './hodder-source-readiness';

describe('Hodder source readiness gate', () => {
  it('allows only chapters backed by an exact source-file fidelity manifest', () => {
    [1, 2, 3, 7, 13, 14].forEach(chapter => {
      const readiness = hodderChapterReadiness('9618', chapter);
      expect(readiness.status).toBe('source-locked');
      expect(readiness.sourceFile).toMatch(/\.pdf$/i);
      expect(canBuildSourceGroundedHodderChapter('9618', chapter)).toBe(true);
    });
  });

  it('recognises Chapter 3 after locking the exact connected Hodder coursebook range', () => {
    expect(NEXT_9618_HODDER_CHAPTER).toBe(3);
    expect(NEXT_9618_HODDER_CHAPTER_READINESS).toEqual({
      syllabus: '9618',
      chapter: 3,
      status: 'source-locked',
      sourceFile: '9618 Coursebook Book (Hodder Education).pdf',
    });
  });

  it('does not treat a different syllabus or an unmanifested chapter as interchangeable source truth', () => {
    expect(canBuildSourceGroundedHodderChapter('0478', 3)).toBe(false);
    expect(canBuildSourceGroundedHodderChapter('9618', 4)).toBe(false);
  });
});
