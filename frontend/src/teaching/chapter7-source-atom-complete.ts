import type { LessonSlide } from './lesson-content-full';
import { CHAPTER_7_FINAL_SOURCE_SLIDES } from './chapter7-source-final-hardening';
import { CHAPTER_7_SOURCE_ATOMS } from './chapter7-source-atoms';
import { CHAPTER_7_SOURCE_ACTIVITY_ATOMS } from './chapter7-source-activity-atoms';
import { CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS } from './chapter7-source-pdf-detail';
import { CHAPTER_7_SOURCE_MAP } from './chapter7-book-coverage';
import { CHAPTER_7_SOURCE_PAGE_AUDIT } from './chapter7-source-page-audit';
import { CHAPTER_7_SOURCE_KEY_TERMS, withChapter7SourceKeyTerms } from './chapter7-source-keyterms';
import { CHAPTER_7_SOURCE_FILE_MANIFEST } from './source-file-fidelity-manifest';

export const CHAPTER_7_ALL_SOURCE_ATOMS = [
  ...CHAPTER_7_SOURCE_ATOMS,
  ...CHAPTER_7_SOURCE_ACTIVITY_ATOMS,
  ...CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS,
];

/**
 * Chapter 7 keeps its authored discovery/book slides clean. Exact source atoms
 * are no longer concatenated into `activity.prompt` as a fake BOOK SOURCE task;
 * the dedicated Lesson Studio source-teaching layer renders every atom on the
 * normal teacher canvas with its page/reference and semantic kind.
 */
export const CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES: LessonSlide[] =
  withChapter7SourceKeyTerms(CHAPTER_7_FINAL_SOURCE_SLIDES);

export const CHAPTER_7_SOURCE_ATOM_COVERAGE = {
  atoms: CHAPTER_7_ALL_SOURCE_ATOMS.length,
  pages: CHAPTER_7_SOURCE_PAGE_AUDIT.length,
  sourceFilePages: CHAPTER_7_SOURCE_FILE_MANIFEST.pageCount,
  sourceFileSha256: CHAPTER_7_SOURCE_FILE_MANIFEST.sourceFileSha256,
  sourcePdfDetailAtoms: CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS.length,
  keyTerms: CHAPTER_7_SOURCE_KEY_TERMS.length,
  activities: Object.keys(CHAPTER_7_SOURCE_MAP.activities).length,
  figures: Object.keys(CHAPTER_7_SOURCE_MAP.figures).length,
  tables: Object.keys(CHAPTER_7_SOURCE_MAP.tables).length,
  examQuestions: Object.keys(CHAPTER_7_SOURCE_MAP.examQuestions).length,
  bookExtras: Object.keys(CHAPTER_7_SOURCE_MAP.bookExtras).length,
} as const;
