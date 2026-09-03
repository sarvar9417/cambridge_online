import { HODDER_CHAPTER_1 } from './lesson-content-hodder-ch1';
import { HODDER_CHAPTER_13 } from './lesson-content-hodder-ch13';

export type { LessonVisual } from './lesson-content-full';
export type {
  HodderLessonChapter as LessonChapter,
  HodderLessonSlide as LessonSlide,
  LessonRichBlock,
  LessonTable,
} from './lesson-content-hodder-types';

export const LESSON_CHAPTERS = [HODDER_CHAPTER_1, HODDER_CHAPTER_13];

export const lessonChapter = (number: number) =>
  LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
