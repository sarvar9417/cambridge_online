import { describe, expect, it } from 'vitest';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { LESSON_CHAPTERS, lessonChapter } from './lesson-content-source-complete';
import { canBuildSourceGroundedHodderChapter } from './hodder-source-readiness';

describe('active Hodder lesson source readiness', () => {
  it('exposes only 9618 chapters whose exact Hodder source is centrally locked', () => {
    expect(LESSON_CHAPTERS.map(chapter => chapter.number)).toEqual([1, 2, 3, 4, 13, 14]);
    LESSON_CHAPTERS.forEach(chapter => expect(canBuildSourceGroundedHodderChapter('9618', chapter.number)).toBe(true));
  });

  it('activates Chapter 3 only after the exact full-book source is byte-locked', () => {
    expect(CHAPTER_3_FINAL.number).toBe(3);
    expect(canBuildSourceGroundedHodderChapter('9618', 3)).toBe(true);
    expect(lessonChapter(3)).toBe(CHAPTER_3_FINAL);
  });

  it('still rejects the same chapter number from a different syllabus', () => {
    expect(canBuildSourceGroundedHodderChapter('0478', 3)).toBe(false);
  });
});
