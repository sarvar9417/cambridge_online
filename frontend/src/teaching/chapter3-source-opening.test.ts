import { describe, expect, it } from 'vitest';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { LESSON_CHAPTERS, lessonChapter } from './lesson-content-source-complete';
import {
  CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST,
  CHAPTER_3_CONNECTED_HODDER_SOURCE_REJECTION,
  CONNECTED_HODDER_SOURCE_MANIFESTS,
} from './connected-hodder-source-manifest';
import { canBuildSourceGroundedHodderChapter, hodderChapterReadiness } from './hodder-source-readiness';

describe('Hodder Chapter 3 connected-source lock', () => {
  it('locks the exact 576-page full-book export and all 39 Chapter 3 page fingerprints', () => {
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST.sourceFileSha256).toBe('760c02dd059fa102b696a7424de2e298198535f06705c367d448e1391d799d95');
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST.sourceFilePageCount).toBe(576);
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST.physicalPageRange).toEqual([84, 122]);
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST.printedPageRange).toEqual([68, 106]);
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST.pages).toHaveLength(39);
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST.pages[0].printedPage).toBe(68);
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST.pages.at(-1)?.printedPage).toBe(106);
  });

  it('retains the old 97-page export only as rejected historical evidence', () => {
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_REJECTION.exportedSourceSha256).toBe('3994b727128cea398b0622ff1ae83a643edf9a3a654cbd3d548b1c5f65c06126');
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_REJECTION.exportedPageCount).toBe(97);
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_REJECTION.terminalPrintedPage).toBe(64);
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE_REJECTION.exportedSourceSha256).not.toBe(CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST.sourceFileSha256);
  });

  it('promotes only the verified byte identity into the central source gate', () => {
    expect(CONNECTED_HODDER_SOURCE_MANIFESTS).toContain(CHAPTER_3_CONNECTED_HODDER_SOURCE_MANIFEST);
    expect(hodderChapterReadiness('9618', 3)).toEqual({ syllabus: '9618', chapter: 3, status: 'source-locked', sourceFile: '9618 Coursebook Book (Hodder Education).pdf' });
    expect(canBuildSourceGroundedHodderChapter('9618', 3)).toBe(true);
    expect(lessonChapter(3)).toBe(CHAPTER_3_FINAL);
    expect(LESSON_CHAPTERS.some(chapter => chapter.number === 3)).toBe(true);
  });
});
