import { describe, expect, it } from 'vitest';
import type { LessonProgress } from '../lib/api';
import { pageSlideIds, studentStudyChapter, studentStudyPages } from './student-lesson-topic-model';
import { completedForChapter, completedPagesForChapter } from './StudentLessonProgress';

const progress:LessonProgress[]=[
  {chapterNo:1,slideId:'c1-a',visitedAt:'2026-09-04T10:00:00Z',completedAt:'2026-09-04T10:02:00Z'},
  {chapterNo:1,slideId:'c1-b',visitedAt:'2026-09-04T10:03:00Z',completedAt:null},
  {chapterNo:1,slideId:'forged-slide',visitedAt:'2026-09-04T10:04:00Z',completedAt:'2026-09-04T10:04:30Z'},
  {chapterNo:7,slideId:'c7-a',visitedAt:'2026-09-04T10:05:00Z',completedAt:'2026-09-04T10:06:00Z'},
];

describe('student lesson progress',()=>{
  it('counts only completed slides in the selected chapter',()=>{
    expect([...completedForChapter(progress,1)]).toEqual(['c1-a','forged-slide']);
    expect([...completedForChapter(progress,7)]).toEqual(['c7-a']);
  });

  it('can pin completion totals to the canonical chapter slide inventory',()=>{
    expect([...completedForChapter(progress,1,new Set(['c1-a','c1-b']))]).toEqual(['c1-a']);
  });

  it('marks a semantic page complete only when every source slide on that page is complete',()=>{
    const chapter=studentStudyChapter(1)!;
    const first=studentStudyPages(chapter)[0]!;
    const ids=pageSlideIds(first.page);
    expect(ids.length).toBeGreaterThan(0);
    const complete:LessonProgress[]=ids.map((slideId,index)=>({
      chapterNo:chapter.number,
      slideId,
      visitedAt:`2026-09-04T10:${String(index).padStart(2,'0')}:00Z`,
      completedAt:`2026-09-04T10:${String(index).padStart(2,'0')}:30Z`,
    }));
    expect(completedPagesForChapter(complete,chapter).has(first.page.id)).toBe(true);
    expect(completedPagesForChapter(complete.slice(0,-1),chapter).has(first.page.id)).toBe(false);
  });

  it('ignores forged progress rows when deriving semantic page completion',()=>{
    const chapter=studentStudyChapter(13)!;
    const forged:LessonProgress[]=[{chapterNo:13,slideId:'not-a-real-slide',visitedAt:'2026-09-04T11:00:00Z',completedAt:'2026-09-04T11:01:00Z'}];
    expect(completedPagesForChapter(forged,chapter).size).toBe(0);
  });
});
