import { describe, expect, it } from 'vitest';
import type { LessonProgress } from '../lib/api';
import { completedForChapter } from './StudentLessonProgress';

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
});
