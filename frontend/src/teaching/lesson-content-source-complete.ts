import { SOURCE_FILE_FIDELITY_CHAPTER_1, SOURCE_FILE_FIDELITY_CHAPTER_13 } from './lesson-content-source-file-fidelity';
import { buildPdfFirst9618Chapter } from './pdf-first-section-lessons';
import { presentationizePdfFirstChapter } from './pdf-first-presentation-layout';

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
 * but the learner/teacher route is rebuilt by section. Each source section now
 * ends only after its exact supplied-PDF blocks have been taught, followed by
 * the Cambridge Exam Lens and then the live/current Past Paper checkpoint(s).
 * The old glossary/page-by-page appendix is intentionally not appended here.
 * Exact-PDF screens are then expanded to projector-sized presentation screens
 * without deleting or re-ordering any source block.
 */
export const LESSON_CHAPTERS = [
  presentationizePdfFirstChapter(buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_1)),
  presentationizePdfFirstChapter(buildPdfFirst9618Chapter(SOURCE_FILE_FIDELITY_CHAPTER_13)),
];

export const lessonChapter = (number: number) => LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;