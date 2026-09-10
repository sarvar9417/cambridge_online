import { SOURCE_FILE_FIDELITY_CHAPTER_1, SOURCE_FILE_FIDELITY_CHAPTER_13 } from './lesson-content-source-file-fidelity';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { CHAPTER_14_FINAL } from './lesson-content-chapter14-checkpoints';
import { canBuildSourceGroundedHodderChapter } from './hodder-source-readiness';
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
 * Candidate 9618 lesson chapters.
 *
 * A chapter draft may exist before its exact Hodder source is locked. Keeping
 * candidates separate from the active route lets implementation continue
 * without presenting an unresolved draft as source-backed content.
 */
const CANDIDATE_9618_LESSON_CHAPTERS = [
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_1),
  CHAPTER_2_FINAL,
  CHAPTER_3_FINAL,
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_13),
  CHAPTER_14_FINAL,
];

/**
 * Active 9618 lesson route.
 *
 * The same source-readiness gate used by implementation planning now controls
 * runtime exposure. This prevents a chapter backed only by a syllabus,
 * workbook, different Hodder title, or an unregistered draft manifest from
 * being advertised in Lesson Studio as a source-backed chapter.
 */
export const LESSON_CHAPTERS = CANDIDATE_9618_LESSON_CHAPTERS.filter(chapter =>
  canBuildSourceGroundedHodderChapter('9618', chapter.number),
);

export const lessonChapter = (number: number) => LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
