import { SOURCE_FILE_FIDELITY_CHAPTER_1, SOURCE_FILE_FIDELITY_CHAPTER_13 } from './lesson-content-source-file-fidelity';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_3 } from './lesson-content-chapter3';
import { CHAPTER_14_FINAL } from './lesson-content-chapter14-checkpoints';
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
 * Chapters 2 and 14 are complete source-grounded presentation chapters.
 * Chapter 3 is now sourced from the exact connected Hodder full coursebook;
 * only the implemented source range is exposed, with later pages left unresolved.
 */
export const LESSON_CHAPTERS = [
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_1),
  CHAPTER_2_FINAL,
  CHAPTER_3,
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_13),
  CHAPTER_14_FINAL,
];

export const lessonChapter = (number: number) => LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
