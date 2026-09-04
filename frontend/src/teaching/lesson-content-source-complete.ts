import { SOURCE_EXHAUSTIVE_CHAPTER_1, SOURCE_EXHAUSTIVE_CHAPTER_13 } from './lesson-content-source-exhaustive';

export type { LessonVisual } from './lesson-content-full';
export type {
  HodderLessonChapter as LessonChapter,
  HodderLessonSlide as LessonSlide,
  LessonFigure,
  LessonRichBlock,
  LessonTable,
} from './lesson-content-hodder-types';

export const LESSON_CHAPTERS = [SOURCE_EXHAUSTIVE_CHAPTER_1, SOURCE_EXHAUSTIVE_CHAPTER_13];
export const lessonChapter = (number: number) => LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
