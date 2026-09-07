import type { LessonSlide } from './lesson-content-full';
import { CHAPTER_7_FINAL_SOURCE_SLIDES } from './chapter7-source-final-hardening';
import { CHAPTER_7_SOURCE_ATOMS } from './chapter7-source-atoms';
import { CHAPTER_7_SOURCE_ACTIVITY_ATOMS } from './chapter7-source-activity-atoms';
import { CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS } from './chapter7-source-pdf-detail';
import { CHAPTER_7_BOOK_COMPLETENESS_EVIDENCE } from './chapter7-book-completeness-evidence';
import { CHAPTER_7_SOURCE_MAP } from './chapter7-book-coverage';
import { CHAPTER_7_SOURCE_PAGE_AUDIT } from './chapter7-source-page-audit';
import { CHAPTER_7_SOURCE_KEY_TERMS, withChapter7SourceKeyTerms } from './chapter7-source-keyterms';
import { CHAPTER_7_SOURCE_FILE_MANIFEST } from './source-file-fidelity-manifest';

export const CHAPTER_7_ALL_SOURCE_ATOMS = [
  ...CHAPTER_7_SOURCE_ATOMS,
  ...CHAPTER_7_SOURCE_ACTIVITY_ATOMS,
  ...CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS,
  ...CHAPTER_7_BOOK_COMPLETENESS_EVIDENCE,
];

const atomsBySlide = new Map<string, typeof CHAPTER_7_ALL_SOURCE_ATOMS>();
for (const atom of CHAPTER_7_ALL_SOURCE_ATOMS) {
  const current = atomsBySlide.get(atom.targetSlideId) ?? [];
  atomsBySlide.set(atom.targetSlideId, [...current, atom]);
}

/** All source atoms assigned to one real Chapter 7 lesson screen. */
export const chapter7SourceAtomsForSlide = (slideId: string) => atomsBySlide.get(slideId) ?? [];

/**
 * Keep the source material in route data as well as rendering it as structured
 * lesson content. Existing audit code depends on the source strings being
 * recoverable from the chapter object; the classroom renderer now reads the
 * same atoms directly and presents them as labelled blocks instead of one
 * enormous BOOK SOURCE paragraph.
 */
const sourceBlock = (slide: LessonSlide): LessonSlide => {
  const atoms = chapter7SourceAtomsForSlide(slide.id);
  if (!atoms.length) return slide;

  const sourceLines = atoms.map((atom) =>
    `[${atom.sourceRef} · p.${atom.printedPage}] ${atom.needles.join(' · ')}`,
  );
  const existing = slide.activity;

  return {
    ...slide,
    activity: {
      title: existing ? `${existing.title} · BOOK SOURCE` : 'BOOK SOURCE',
      prompt: [
        ...(existing ? [existing.prompt] : []),
        ...sourceLines,
      ].join('\n'),
      ...(existing?.reveal ? { reveal: existing.reveal } : {}),
    },
  };
};

/**
 * Chapter 7 source-atom-complete presenter layer.
 *
 * Every page-level concept, formal key term, named example, exact source value,
 * pseudocode fragment, activity, figure/table relationship, review item and
 * exam-style task remains in the source model and is now also projected by the
 * Chapter7SlideBody renderer as readable learner-visible content.
 */
export const CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES: LessonSlide[] =
  withChapter7SourceKeyTerms(CHAPTER_7_FINAL_SOURCE_SLIDES).map(sourceBlock);

export const CHAPTER_7_SOURCE_ATOM_COVERAGE = {
  atoms: CHAPTER_7_ALL_SOURCE_ATOMS.length,
  pages: CHAPTER_7_SOURCE_PAGE_AUDIT.length,
  sourceFilePages: CHAPTER_7_SOURCE_FILE_MANIFEST.pageCount,
  sourceFileSha256: CHAPTER_7_SOURCE_FILE_MANIFEST.sourceFileSha256,
  sourcePdfDetailAtoms: CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS.length,
  bookCompletenessEvidenceAtoms: CHAPTER_7_BOOK_COMPLETENESS_EVIDENCE.length,
  keyTerms: CHAPTER_7_SOURCE_KEY_TERMS.length,
  activities: Object.keys(CHAPTER_7_SOURCE_MAP.activities).length,
  figures: Object.keys(CHAPTER_7_SOURCE_MAP.figures).length,
  tables: Object.keys(CHAPTER_7_SOURCE_MAP.tables).length,
  examQuestions: Object.keys(CHAPTER_7_SOURCE_MAP.examQuestions).length,
  bookExtras: Object.keys(CHAPTER_7_SOURCE_MAP.bookExtras).length,
} as const;
