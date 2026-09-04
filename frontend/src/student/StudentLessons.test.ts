import { describe, expect, it } from 'vitest';
import { STUDENT_STUDY_CHAPTERS, resolveStudySlideIndex, studentStudyChapter } from './StudentLessons';

describe('student Study Mode source catalog',()=>{
  it('uses the same three source-backed chapter routes as Lesson Studio',()=>{
    expect(STUDENT_STUDY_CHAPTERS.map((chapter)=>chapter.number)).toEqual([1,7,13]);
    for(const chapter of STUDENT_STUDY_CHAPTERS){
      expect(chapter.slides.length).toBeGreaterThan(0);
      expect(chapter.coverage.length).toBeGreaterThan(0);
      expect(chapter.sourceNote.length).toBeGreaterThan(0);
    }
  });

  it('resolves only real slide ids and safely falls back to the first slide',()=>{
    const chapter=studentStudyChapter(1)!;
    const target=Math.min(2,chapter.slides.length-1);
    expect(resolveStudySlideIndex(chapter,chapter.slides[target]!.id)).toBe(target);
    expect(resolveStudySlideIndex(chapter,'missing-slide')).toBe(0);
    expect(resolveStudySlideIndex(chapter,null)).toBe(0);
  });

  it('does not invent unavailable chapters',()=>{
    expect(studentStudyChapter(99)).toBeNull();
  });
});
