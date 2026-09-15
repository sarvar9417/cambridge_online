import { SOURCE_FILE_FIDELITY_CHAPTER_1, SOURCE_FILE_FIDELITY_CHAPTER_13 } from './lesson-content-source-file-fidelity';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { CHAPTER_4_CURRENT_DRAFT } from './lesson-content-chapter4-current';
import { CHAPTER_5_FINAL } from './lesson-content-chapter5-final';
import {
  CHAPTER_6_COMPLETE_9618,
  CHAPTER_7_COMPLETE_9618,
  CHAPTER_8_COMPLETE_9618,
} from './lesson-content-9618-chapters-5-8';
import {
  CHAPTER_9_COMPLETE_9618,
  CHAPTER_10_COMPLETE_9618,
  CHAPTER_11_COMPLETE_9618,
  CHAPTER_12_COMPLETE_9618,
} from './lesson-content-9618-chapters-9-12';
import { CHAPTER_14_FINAL } from './lesson-content-chapter14-checkpoints';
import {
  CHAPTER_15_COMPLETE_9618,
  CHAPTER_16_COMPLETE_9618,
  CHAPTER_17_COMPLETE_9618,
  CHAPTER_18_COMPLETE_9618,
  CHAPTER_19_COMPLETE_9618,
  CHAPTER_20_COMPLETE_9618,
} from './lesson-content-9618-chapters-15-20';
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
 * Every chapter is tied either to an existing deep-fidelity route or to the
 * exact byte-locked full Hodder 9618 coursebook chapter range. Chapter 5 now
 * uses its full deep source-backed pp.136–158 route instead of the generic
 * chapter-summary builder. The runtime source gate remains in place so an
 * accidental source-registry regression cannot expose unresolved content.
 */
const CANDIDATE_9618_LESSON_CHAPTERS = [
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_1),
  CHAPTER_2_FINAL,
  CHAPTER_3_FINAL,
  CHAPTER_4_CURRENT_DRAFT,
  CHAPTER_5_FINAL,
  CHAPTER_6_COMPLETE_9618,
  CHAPTER_7_COMPLETE_9618,
  CHAPTER_8_COMPLETE_9618,
  CHAPTER_9_COMPLETE_9618,
  CHAPTER_10_COMPLETE_9618,
  CHAPTER_11_COMPLETE_9618,
  CHAPTER_12_COMPLETE_9618,
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_13),
  CHAPTER_14_FINAL,
  CHAPTER_15_COMPLETE_9618,
  CHAPTER_16_COMPLETE_9618,
  CHAPTER_17_COMPLETE_9618,
  CHAPTER_18_COMPLETE_9618,
  CHAPTER_19_COMPLETE_9618,
  CHAPTER_20_COMPLETE_9618,
];

/** Active 9618 lesson route, always filtered through the exact-source gate. */
export const LESSON_CHAPTERS = CANDIDATE_9618_LESSON_CHAPTERS.filter(chapter =>
  canBuildSourceGroundedHodderChapter('9618', chapter.number),
);

export const lessonChapter = (number: number) => LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
