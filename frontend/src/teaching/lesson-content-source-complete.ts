import { SOURCE_FILE_FIDELITY_CHAPTER_1, SOURCE_FILE_FIDELITY_CHAPTER_13 } from './lesson-content-source-file-fidelity';
import { CHAPTER_14_COMPLETE } from './lesson-content-chapter14-fidelity';
import { buildPdfFirst9618Chapter } from './pdf-first-section-lessons';

export type { LessonVisual } from './lesson-content-full';
export type {
  HodderLessonChapter as LessonChapter,
  HodderLessonSlide as LessonSlide,
  LessonFigure,
  LessonRichBlock,
  LessonTable,
} from './lesson-content-hodder-types';

/**
 * Active 9618 lesson route.
 *
 * Chapters 1 and 13 retain the historical PDF-first source-hardening pipeline.
 * Chapter 14 is supplied as a complete source-grounded presentation chapter,
 * with board-readable reconstructions for Figures 14.1–14.10, source-detail
 * fidelity screens and full coverage of the uploaded Chapter 14 extract.
 */
export const LESSON_CHAPTERS = [
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_1),
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_13),
  CHAPTER_14_COMPLETE,
];

export const lessonChapter = (number: number) => LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
