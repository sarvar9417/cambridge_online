import { SOURCE_FILE_FIDELITY_MANIFESTS } from './source-file-fidelity-manifest';
import { CONNECTED_HODDER_SOURCE_MANIFESTS } from './connected-hodder-source-manifest';

export type HodderSyllabus = '9618' | '0478';
export type HodderSourceReadiness = 'source-locked' | 'source-unresolved';

export type HodderChapterReadiness = {
  syllabus: HodderSyllabus;
  chapter: number;
  status: HodderSourceReadiness;
  sourceFile?: string;
  reason?: string;
};

export const HODDER_9618_CHAPTERS = Array.from({ length: 20 }, (_, index) => index + 1) as readonly number[];
// Keep the 0478 chapter universe explicit here so the second phase cannot start
// accidentally while a 9618 chapter is still unresolved.
export const HODDER_0478_CHAPTERS = Array.from({ length: 10 }, (_, index) => index + 1) as readonly number[];

const locked9618 = new Map<number, string>([
  ...SOURCE_FILE_FIDELITY_MANIFESTS.map(manifest => [manifest.chapter, manifest.sourceFile] as const),
  ...CONNECTED_HODDER_SOURCE_MANIFESTS
    .filter(manifest => manifest.syllabus === '9618')
    .map(manifest => [manifest.chapter, manifest.sourceFile] as const),
]);

const locked0478 = new Map<number, string>(
  CONNECTED_HODDER_SOURCE_MANIFESTS
    .filter(manifest => manifest.syllabus === '0478')
    .map(manifest => [manifest.chapter, manifest.sourceFile] as const),
);

/**
 * A chapter may only be source-grounded when the exact Hodder source has a
 * fidelity manifest. A syllabus/workbook match or a different Hodder title is
 * not sufficient evidence for a coursebook chapter. Full connected books are
 * accepted only through an exact file hash plus chapter-page fingerprints.
 */
export function hodderChapterReadiness(
  syllabus: HodderSyllabus,
  chapter: number,
): HodderChapterReadiness {
  const sourceFile = syllabus === '9618' ? locked9618.get(chapter) : locked0478.get(chapter);
  if (sourceFile) return { syllabus, chapter, status: 'source-locked', sourceFile };

  return {
    syllabus,
    chapter,
    status: 'source-unresolved',
    reason: 'Exact Hodder chapter source is not yet locked by a source-file fidelity manifest.',
  };
}

export function canBuildSourceGroundedHodderChapter(
  syllabus: HodderSyllabus,
  chapter: number,
): boolean {
  return hodderChapterReadiness(syllabus, chapter).status === 'source-locked';
}

const chapterUniverse = (syllabus: HodderSyllabus): readonly number[] =>
  syllabus === '9618' ? HODDER_9618_CHAPTERS : HODDER_0478_CHAPTERS;

export const unresolvedHodderChapters = (syllabus: HodderSyllabus): number[] =>
  chapterUniverse(syllabus).filter(chapter => !canBuildSourceGroundedHodderChapter(syllabus, chapter));

export const sourceLockedHodderChapters = (syllabus: HodderSyllabus): number[] =>
  chapterUniverse(syllabus).filter(chapter => canBuildSourceGroundedHodderChapter(syllabus, chapter));

export const unresolved9618HodderChapters = (): number[] => unresolvedHodderChapters('9618');
export const sourceLocked9618HodderChapters = (): number[] => sourceLockedHodderChapters('9618');
export const unresolved0478HodderChapters = (): number[] => unresolvedHodderChapters('0478');
export const sourceLocked0478HodderChapters = (): number[] => sourceLockedHodderChapters('0478');

/**
 * Global implementation queue: every unresolved 9618 chapter must be exhausted
 * before any 0478 chapter can become the next build target.
 */
export const NEXT_HODDER_BUILD_TARGET = (() => {
  const next9618 = unresolved9618HodderChapters()[0];
  if (next9618 !== undefined) return { syllabus: '9618' as const, chapter: next9618 };

  const next0478 = unresolved0478HodderChapters()[0];
  if (next0478 !== undefined) return { syllabus: '0478' as const, chapter: next0478 };

  return null;
})();

export const NEXT_HODDER_BUILD_TARGET_READINESS = NEXT_HODDER_BUILD_TARGET === null
  ? null
  : hodderChapterReadiness(NEXT_HODDER_BUILD_TARGET.syllabus, NEXT_HODDER_BUILD_TARGET.chapter);

// Compatibility exports for existing 9618 callers.
export const NEXT_9618_HODDER_CHAPTER = unresolved9618HodderChapters()[0] ?? null;
export const NEXT_9618_HODDER_CHAPTER_READINESS = NEXT_9618_HODDER_CHAPTER === null
  ? null
  : hodderChapterReadiness('9618', NEXT_9618_HODDER_CHAPTER);
