import { describe, expect, it } from 'vitest';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { LESSON_CHAPTERS, lessonChapter } from './lesson-content-source-complete';
import { canBuildSourceGroundedHodderChapter } from './hodder-source-readiness';

describe('active Hodder lesson source readiness', () => {
  it('exposes only 9618 chapters whose exact Hodder source is centrally locked', () => {
    expect(LESSON_CHAPTERS.map(chapter => chapter.number)).toEqual([1, 2, 13, 14]);

    LESSON_CHAPTERS.forEach(chapter => {
      expect(canBuildSourceGroundedHodderChapter('9618', chapter.number)).toBe(true);
    });
  });

  it('keeps the Chapter 3 draft quarantined from the source-backed route', () => {
    expect(CHAPTER_3_FINAL.number).toBe(3);
    expect(canBuildSourceGroundedHodderChapter('9618', CHAPTER_3_FINAL.number)).toBe(false);
    expect(lessonChapter(3)).toBeNull();
  });

  it('cannot expose an unresolved candidate merely because lesson content exists', () => {
    const activeNumbers = new Set(LESSON_CHAPTERS.map(chapter => chapter.number));
    expect(activeNumbers.has(CHAPTER_3_FINAL.number)).toBe(false);
  });
});
