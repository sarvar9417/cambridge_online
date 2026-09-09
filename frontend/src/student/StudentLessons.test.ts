import { describe, expect, it } from 'vitest';
import {
  STUDENT_STUDY_CHAPTERS,
  resolveStudentStudyLocation,
  studentStudyChapter,
  studentStudyPages,
  studentStudyTopics,
  studentStudyUrl,
} from './student-lesson-topic-model';

describe('student Study Mode source catalog',()=>{
  it('uses the same four source-backed chapter routes as Lesson Studio',()=>{
    expect(STUDENT_STUDY_CHAPTERS.map((chapter)=>chapter.number)).toEqual([1,7,13,14]);
    for(const chapter of STUDENT_STUDY_CHAPTERS){
      expect(chapter.slides.length).toBeGreaterThan(0);
      expect(chapter.coverage.length).toBeGreaterThan(0);
      expect(chapter.sourceNote.length).toBeGreaterThan(0);
      expect(studentStudyTopics(chapter).length).toBeGreaterThan(0);
      expect(studentStudyPages(chapter).length).toBeGreaterThan(0);
    }
  });

  it('routes every canonical slide exactly once through semantic topic/pages',()=>{
    for(const chapter of STUDENT_STUDY_CHAPTERS){
      const routed=studentStudyPages(chapter).flatMap(({page})=>page.slides.map(slide=>slide.id));
      expect(routed,`Chapter ${chapter.number} routed slides`).toHaveLength(chapter.slides.length);
      expect(new Set(routed),`Chapter ${chapter.number} canonical ids`).toEqual(new Set(chapter.slides.map(slide=>slide.id)));
    }
  });

  it('uses topic/page URLs and never emits the retired slide query model',()=>{
    const chapter=studentStudyChapter(1)!;
    const first=studentStudyPages(chapter)[0]!;
    const url=studentStudyUrl(chapter.number,first.topic.code,first.pageIndex);
    expect(url).toContain(`chapter=${chapter.number}`);
    expect(url).toContain(`topic=${encodeURIComponent(first.topic.code)}`);
    expect(url).toContain('page=1');
    expect(url).not.toContain('slide=');
  });

  it('maps old slide deep links into their canonical topic/page without losing the target',()=>{
    const chapter=studentStudyChapter(7)!;
    const target=chapter.slides[Math.min(3,chapter.slides.length-1)]!;
    const resolved=resolveStudentStudyLocation(chapter,null,null,target.id)!;
    expect(resolved.legacySlideMatched).toBe(true);
    expect(resolved.page.slides.some(slide=>slide.id===target.id)).toBe(true);
    expect(studentStudyUrl(chapter.number,resolved.topic.code,resolved.pageIndex)).not.toContain('slide=');
  });

  it('keeps Past Paper practice as the final semantic page of a topic',()=>{
    for(const chapter of STUDENT_STUDY_CHAPTERS){
      for(const topic of studentStudyTopics(chapter)){
        const hasCheckpoint=topic.pages.some(page=>page.slides.some(slide=>slide.examPractice));
        if(!hasCheckpoint)continue;
        expect(topic.pages.at(-1)?.kind,`${chapter.number} ${topic.code}`).toBe('practice');
      }
    }
  });

  it('does not invent unavailable chapters',()=>{
    expect(studentStudyChapter(99)).toBeNull();
  });
});
