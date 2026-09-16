import { describe, expect, it } from 'vitest';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';

describe('historical printed review practice guard',()=>{
  it('never promotes printed Cambridge 9608 chapter-review material into live 9618 exam practice',()=>{
    const historicalReviewSlides=LESSON_CHAPTERS.flatMap(chapter=>chapter.slides
      .filter(slide=>slide.section==='Chapter review'&&JSON.stringify(slide).includes('9608'))
      .map(slide=>({chapter:chapter.number,slide})));

    expect(historicalReviewSlides.length).toBeGreaterThan(0);
    for(const {chapter,slide} of historicalReviewSlides){
      expect(slide.examPractice===true,`Chapter ${chapter} ${slide.id} must remain coursebook study material`).toBe(false);
    }
  });

  it('keeps live exam-practice flags separate from legacy 9608 review provenance',()=>{
    const livePractice=LESSON_CHAPTERS.flatMap(chapter=>chapter.slides
      .filter(slide=>slide.examPractice===true)
      .map(slide=>({chapter:chapter.number,slide})));

    for(const {chapter,slide} of livePractice){
      const text=JSON.stringify(slide);
      const isLegacyPrintedReview=slide.section==='Chapter review'&&text.includes('9608');
      expect(isLegacyPrintedReview,`Chapter ${chapter} ${slide.id} mixes a live practice flag with legacy 9608 review content`).toBe(false);
    }
  });
});
