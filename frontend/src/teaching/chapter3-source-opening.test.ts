import { describe, expect, it } from 'vitest';
import { CHAPTER_3 } from './lesson-content-chapter3';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { CHAPTER_3_VISUAL_IDS } from './Chapter3PresentationVisuals';
import { LESSON_CHAPTERS, lessonChapter } from './lesson-content-source-complete';
import { SOURCE_FILE_FIDELITY_MANIFESTS } from './source-file-fidelity-manifest';
import { canBuildSourceGroundedHodderChapter, hodderChapterReadiness } from './hodder-source-readiness';

describe('Hodder Chapter 3 draft quarantine', () => {
  it('does not claim an exact Chapter 3 source lock without a central fidelity manifest', () => {
    expect(SOURCE_FILE_FIDELITY_MANIFESTS.some(manifest => manifest.chapter === (3 as never))).toBe(false);
    expect(hodderChapterReadiness('9618', 3)).toEqual({
      syllabus: '9618',
      chapter: 3,
      status: 'source-unresolved',
      reason: 'Exact Hodder chapter source is not yet locked by a source-file fidelity manifest.',
    });
    expect(canBuildSourceGroundedHodderChapter('9618', 3)).toBe(false);
  });

  it('keeps existing Chapter 3 implementation work as an inert draft rather than deleting it', () => {
    expect(CHAPTER_3.number).toBe(3);
    expect(CHAPTER_3_FINAL.number).toBe(3);
    expect(CHAPTER_3.slides.length).toBeGreaterThan(0);
    expect(CHAPTER_3_VISUAL_IDS.length).toBeGreaterThan(0);
  });

  it('does not expose the unresolved draft through the source-backed Lesson Studio route', () => {
    expect(lessonChapter(3)).toBeNull();
    expect(LESSON_CHAPTERS.some(chapter => chapter.number === 3)).toBe(false);
    LESSON_CHAPTERS.forEach(chapter => {
      expect(canBuildSourceGroundedHodderChapter('9618', chapter.number)).toBe(true);
    });
  });

  it('cannot use a different Hodder syllabus as substitute evidence for Chapter 3', () => {
    expect(canBuildSourceGroundedHodderChapter('0478', 3)).toBe(false);
  });
});
