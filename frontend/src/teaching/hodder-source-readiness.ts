import { SOURCE_FILE_FIDELITY_MANIFESTS } from './source-file-fidelity-manifest';
import { CONNECTED_HODDER_SOURCE_MANIFESTS } from './connected-hodder-source-manifest';

export type HodderSourceReadiness = 'source-locked' | 'source-unresolved';

export type HodderChapterReadiness = {
  syllabus: '9618' | '0478';
  chapter: number;
  status: HodderSourceReadiness;
  sourceFile?: string;
  reason?: string;
};

const locked9618 = new Map<number, string>([
  ...SOURCE_FILE_FIDELITY_MANIFESTS.map(manifest => [manifest.chapter, manifest.sourceFile] as const),
  ...CONNECTED_HODDER_SOURCE_MANIFESTS
    .filter(manifest => manifest.syllabus === '9618')
    .map(manifest => [manifest.chapter, manifest.sourceFile] as const),
]);

/**
 * A chapter may only be source-grounded when the exact Hodder source has a
 * fidelity manifest. A syllabus/workbook match or a different Hodder title is
 * not sufficient evidence for a 9618 coursebook chapter. Full connected books
 * are accepted only through an exact file hash plus chapter-page fingerprints.
 */
export function hodderChapterReadiness(
  syllabus: '9618' | '0478',
  chapter: number,
): HodderChapterReadiness {
  if (syllabus === '9618') {
    const sourceFile = locked9618.get(chapter);
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
