import { SOURCE_FILE_FIDELITY_CHAPTER_1, SOURCE_FILE_FIDELITY_CHAPTER_13 } from './lesson-content-source-file-fidelity';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { CHAPTER_4_CURRENT_DRAFT } from './lesson-content-chapter4-current';
import { CHAPTER_5_FINAL } from './lesson-content-chapter5-deep-final';
import { CHAPTER_6_FINAL } from './lesson-content-chapter6-final';
import { CHAPTER_7_FINAL } from './lesson-content-chapter7-final';
import { CHAPTER_8_FINAL } from './lesson-content-chapter8-deep-final';
import { CHAPTER_9_FINAL } from './lesson-content-chapter9-final';
import { CHAPTER_10_FINAL } from './lesson-content-chapter10-final';
import { CHAPTER_11_FINAL } from './lesson-content-chapter11-final';
import { CHAPTER_12_FINAL } from './lesson-content-chapter12-final';
import { CHAPTER_14_FINAL } from './lesson-content-chapter14-checkpoints';
import { CHAPTER_15_FINAL } from './lesson-content-chapter15-final';
import {
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
 * exact byte-locked full Hodder 9618 coursebook chapter range. Chapters 5–12
 * and 15 now use full deep source-backed routes instead of generic chapter-
 * summary builders. The runtime source gate remains in place so an accidental
 * source-registry regression cannot expose unresolved content.
 */
const CANDIDATE_9618_LESSON_CHAPTERS = [
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_1),
  CHAPTER_2_FINAL,
  CHAPTER_3_FINAL,
  CHAPTER_4_CURRENT_DRAFT,
  CHAPTER_5_FINAL,
  CHAPTER_6_FINAL,
  CHAPTER_7_FINAL,
  CHAPTER_8_FINAL,
  CHAPTER_9_FINAL,
  CHAPTER_10_FINAL,
  CHAPTER_11_FINAL,
  CHAPTER_12_FINAL,
  buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_13),
  CHAPTER_14_FINAL,
  CHAPTER_15_FINAL,
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
