import { SOURCE_FILE_FIDELITY_CHAPTER_1, SOURCE_FILE_FIDELITY_CHAPTER_13 } from './lesson-content-source-file-fidelity';
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
 * The historical source-hardening chapters remain the curated teaching base,
 * and the learner/teacher route is rebuilt by source topic. Every topic keeps
 * the exact supplied-PDF material, Cambridge Exam Lens and live/current Past
 * Paper checkpoints, but the content is no longer fragmented into projector-
 * sized presentation screens. Lesson Studio now groups the source into
 * book-like, vertically scrollable topic pages.
 */
export const LESSON_CHAPTERS = [
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_1),
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_13),
];

export const lessonChapter = (number: number) => LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
