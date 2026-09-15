import { describe, expect, it } from 'vitest';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { LESSON_CHAPTERS, lessonChapter } from './lesson-content-source-complete';
import { canBuildSourceGroundedHodderChapter } from './hodder-source-readiness';

const ALL_9618 = Array.from({ length: 20 }, (_, index) => index + 1);

describe('active Hodder lesson source readiness', () => {
  it('exposes all 20 9618 chapters and only chapters whose exact Hodder source is centrally locked', () => {
    expect(LESSON_CHAPTERS.map(chapter => chapter.number)).toEqual(ALL_9618);
    expect(new Set(LESSON_CHAPTERS.map(chapter => chapter.number)).size).toBe(20);
    LESSON_CHAPTERS.forEach(chapter => expect(canBuildSourceGroundedHodderChapter('9618', chapter.number)).toBe(true));
  });

  it('keeps the existing deep-fidelity Chapter 3 implementation when the full book is also available', () => {
    expect(CHAPTER_3_FINAL.number).toBe(3);
    expect(canBuildSourceGroundedHodderChapter('9618', 3)).toBe(true);
    expect(lessonChapter(3)).toBe(CHAPTER_3_FINAL);
  });

  it('uses the Cambridge 9618 Chapter 7 rather than the legacy 0478 Chapter 7 route', () => {
    expect(lessonChapter(7)?.title).toBe('Ethics and ownership');
    expect(lessonChapter(7)?.subtopics).toContain('7.3 Artificial intelligence (AI)');
  });

  it('still rejects the same chapter number from a different syllabus', () => {
    expect(canBuildSourceGroundedHodderChapter('0478', 3)).toBe(false);
  });
});