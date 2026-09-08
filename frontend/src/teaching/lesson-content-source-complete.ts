import { SOURCE_FILE_FIDELITY_CHAPTER_1, SOURCE_FILE_FIDELITY_CHAPTER_13 } from './lesson-content-source-file-fidelity';
import { applyCurrent9618CheckpointTargets } from './lesson-current-target-checkpoints';
import { withCoursebookReferenceSlides9618 } from './coursebook-page-slides';

export type { LessonVisual } from './lesson-content-full';
export type {
  HodderLessonChapter as LessonChapter,
  HodderLessonSlide as LessonSlide,
  LessonFigure,
  LessonRichBlock,
  LessonTable,
} from './lesson-content-hodder-types';

export const LESSON_CHAPTERS = [
  withCoursebookReferenceSlides9618(applyCurrent9618CheckpointTargets(SOURCE_FILE_FIDELITY_CHAPTER_1)),
  withCoursebookReferenceSlides9618(applyCurrent9618CheckpointTargets(SOURCE_FILE_FIDELITY_CHAPTER_13)),
];
export const lessonChapter = (number: number) => LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
