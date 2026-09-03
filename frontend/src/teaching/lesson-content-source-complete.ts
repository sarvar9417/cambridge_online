import { SOURCE_COMPLETE_CHAPTER_1, SOURCE_COMPLETE_CHAPTER_13 } from './lesson-content-source-fidelity';

export type { LessonVisual } from './lesson-content-full';
export type {
  HodderLessonChapter as LessonChapter,
  HodderLessonSlide as LessonSlide,
  LessonFigure,
  LessonRichBlock,
  LessonTable,
} from './lesson-content-hodder-types';

export const LESSON_CHAPTERS = [SOURCE_COMPLETE_CHAPTER_1, SOURCE_COMPLETE_CHAPTER_13];
export const lessonChapter = (number: number) => LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
