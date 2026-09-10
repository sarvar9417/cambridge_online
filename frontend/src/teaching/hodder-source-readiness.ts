import { SOURCE_FILE_FIDELITY_MANIFESTS } from './source-file-fidelity-manifest';
import { CHAPTER_3_SOURCE_FILE_MANIFEST } from './chapter3-source-file-fidelity';

export type HodderSourceReadiness = 'source-locked' | 'source-unresolved';

export type HodderChapterReadiness = {
  syllabus: '9618' | '0478';
  chapter: number;
  status: HodderSourceReadiness;
  sourceFile?: string;
  reason?: string;
};

const locked9618 = new Map(
  [...SOURCE_FILE_FIDELITY_MANIFESTS, CHAPTER_3_SOURCE_FILE_MANIFEST].map(
    manifest => [manifest.chapter, manifest.sourceFile] as const,
  ),
);

/**
 * A chapter may only be source-grounded when the exact Hodder source has a
 * fidelity manifest. Full-book source ranges are allowed when the connected
 * source is the exact Hodder coursebook and the chapter page range is locked.
 */
export function hodderChapterReadiness(
  syllabus: '9618' | '0478',
  chapter: number,
): HodderChapterReadiness {
  if (syllabus === '9618') {
    const sourceFile = locked9618.get(chapter as never);
    if (sourceFile) return { syllabus, chapter, status: 'source-locked', sourceFile };
  }

  return {
    syllabus,
    chapter,
    status: 'source-unresolved',
    reason: 'Exact Hodder chapter source is not yet locked by a source-file fidelity manifest.',
  };
}

export function canBuildSourceGroundedHodderChapter(
  syllabus: '9618' | '0478',
  chapter: number,
): boolean {
  return hodderChapterReadiness(syllabus, chapter).status === 'source-locked';
}

export const NEXT_9618_HODDER_CHAPTER = 3 as const;
export const NEXT_9618_HODDER_CHAPTER_READINESS = hodderChapterReadiness('9618', NEXT_9618_HODDER_CHAPTER);
