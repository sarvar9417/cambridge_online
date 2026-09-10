import { SOURCE_FILE_FIDELITY_MANIFESTS } from './source-file-fidelity-manifest';

export type HodderSourceReadiness = 'source-locked' | 'source-unresolved';

export type HodderChapterReadiness = {
  syllabus: '9618' | '0478';
  chapter: number;
  status: HodderSourceReadiness;
  sourceFile?: string;
  reason?: string;
};

const locked9618 = new Map(
  SOURCE_FILE_FIDELITY_MANIFESTS.map(manifest => [manifest.chapter, manifest.sourceFile] as const),
);

/**
 * A chapter may only be source-grounded when the exact Hodder extract has a
 * fidelity manifest. This deliberately keeps unsupported chapters unresolved
 * instead of allowing syllabus summaries or another syllabus' book to stand in
 * for the requested source of truth.
 */
export function hodderChapterReadiness(
  syllabus: '9618' | '0478',
  chapter: number,
): HodderChapterReadiness {
  if (syllabus === '9618') {
    const sourceFile = locked9618.get(chapter as 1 | 2 | 7 | 13 | 14);
    if (sourceFile) return { syllabus, chapter, status: 'source-locked', sourceFile };
  }

  return {
    syllabus,
    chapter,
    status: 'source-unresolved',
    reason: 'Exact Hodder chapter extract is not yet locked by a source-file fidelity manifest.',
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
