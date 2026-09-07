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

/** All supplied-PDF source atoms assigned to one real Chapter 7 lesson screen. */
export const chapter7SourceAtomsForSlide = (slideId: string) => atomsBySlide.get(slideId) ?? [];

const sourceKindLabel = (kind: (typeof CHAPTER_7_ALL_SOURCE_ATOMS)[number]['kind']) => {
  if (kind === 'objective') return 'LEARNING OUTLINE';
  if (kind === 'keyword') return 'KEY TERM / IMPORTANT TERM';
  if (kind === 'example') return 'WORKED EXAMPLE';
  if (kind === 'activity') return 'ACTIVITY';
  if (kind === 'extension') return 'EXTENSION';
  if (kind === 'table') return 'TABLE';
  if (kind === 'figure') return 'FIGURE / DIAGRAM';
  if (kind === 'review') return 'SUMMARY / REVIEW';
  if (kind === 'exam') return 'EXAM-STYLE PRACTICE';
  return 'COURSEBOOK DETAIL';
};

/**
 * Earlier builds put all Chapter 7 source atoms into one BOOK SOURCE activity
 * paragraph. HTML collapsed the line breaks and the result was difficult to
 * inspect in class. Keep the exact same source model, but project every source
 * atom into the normal visible bullet stream. This makes every concept, value,
 * pseudocode fragment, example, activity, figure/table relationship and exam
 * item reachable on the actual lesson screen without losing source fidelity.
 */
const sourceBlock = (slide: LessonSlide): LessonSlide => {
  const atoms = chapter7SourceAtomsForSlide(slide.id);
  if (!atoms.length) return slide;

  const sourceBullets = atoms.flatMap((atom) => [
    `${sourceKindLabel(atom.kind)} · ${atom.sourceRef} · Coursebook p.${atom.printedPage}`,
    ...atom.needles,
  ]);

  return {
    ...slide,
    bullets: [...(slide.bullets ?? []), ...sourceBullets],
  };
};

/**
 * Chapter 7 source-atom-complete presenter layer.
 *
 * The formal 30-term glossary is rendered as key-term cards. All remaining
 * source atoms are rendered as visible lesson material rather than hidden audit
 * evidence or a collapsed source dump.
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
