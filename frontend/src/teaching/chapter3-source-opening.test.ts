import { describe, expect, it } from 'vitest';
import { CHAPTER_3 } from './lesson-content-chapter3';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { LESSON_CHAPTERS, lessonChapter } from './lesson-content-source-complete';
import {
  CHAPTER_3_CONNECTED_HODDER_SOURCE_REJECTION,
  CONNECTED_HODDER_SOURCE_MANIFESTS,
} from './connected-hodder-source-manifest';
import { canBuildSourceGroundedHodderChapter, hodderChapterReadiness } from './hodder-source-readiness';

describe('Hodder Chapter 3 connected-source quarantine', () => {
  it('records the exact rejected export rather than trusting its full-book title', () => {
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_REJECTION).toEqual({
      syllabus: '9618',
      requestedChapter: 3,
      sourceFile: '9618 Coursebook Book (Hodder Education).pdf',
      exportedSourceSha256: '3994b727128cea398b0622ff1ae83a643edf9a3a654cbd3d548b1c5f65c06126',
      exportedPageCount: 97,
      terminalPrintedPage: 64,
      reason: 'Connected export ends in Chapter 2 and does not contain the requested Chapter 3 source pages.',
    });
  });

  it('does not promote rejected connected evidence into a source fidelity manifest', () => {
    expect(CONNECTED_HODDER_SOURCE_MANIFESTS).toEqual([]);
    expect(CONNECTED_HODDER_SOURCE_MANIFESTS.some(manifest => manifest.chapter === 3)).toBe(false);
  });

  it('keeps Chapter 3 unresolved and out of the active source-backed route', () => {
    expect(hodderChapterReadiness('9618', 3)).toEqual({
      syllabus: '9618',
      chapter: 3,
      status: 'source-unresolved',
      reason: 'Exact Hodder chapter source is not yet locked by a source-file fidelity manifest.',
    });
    expect(canBuildSourceGroundedHodderChapter('9618', 3)).toBe(false);
    expect(canBuildSourceGroundedHodderChapter('0478', 3)).toBe(false);
    expect(lessonChapter(3)).toBeNull();
    expect(LESSON_CHAPTERS.some(chapter => chapter.number === 3)).toBe(false);
  });

  it('preserves the Chapter 3 draft as non-authoritative work until exact source arrives', () => {
    expect(CHAPTER_3.number).toBe(3);
    expect(CHAPTER_3_FINAL.number).toBe(3);
    expect(CHAPTER_3_FINAL.sourceNote).toContain('pp.68–106');
  });
});
