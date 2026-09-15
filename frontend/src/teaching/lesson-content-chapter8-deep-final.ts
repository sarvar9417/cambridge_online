import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';
import { CHAPTER_8_FINAL as CHAPTER_8_SOURCE_ROUTE } from './lesson-content-chapter8-final';

function keepCoursebookReviewAsStudy(slide: HodderLessonSlide): HodderLessonSlide {
  if (slide.id !== 'h8-review-dbms-sql') return slide;

  // The source review on p.216 is adapted from an older 9608 paper. Keep it as
  // source-backed coursebook review rather than presenting it as a live/current
  // 9618 Past Paper checkpoint in Study Mode.
  const { examPractice: _examPractice, ...reviewSlide } = slide;
  return reviewSlide;
}

export const CHAPTER_8_FINAL: HodderLessonChapter = {
  ...CHAPTER_8_SOURCE_ROUTE,
  slides: CHAPTER_8_SOURCE_ROUTE.slides.map(keepCoursebookReviewAsStudy),
};
