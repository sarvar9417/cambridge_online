import { describe, expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { sourceTeachingAtomsForChapter, type SourceTeachingChapter } from './lesson-source-teaching-model';

const expectedPages: Record<SourceTeachingChapter, number[]> = {
  1: Array.from({length:26},(_,index)=>index+1),
  7: Array.from({length:41},(_,index)=>258+index),
  13: Array.from({length:24},(_,index)=>304+index),
};

function slideIds(chapter: SourceTeachingChapter){
  if(chapter===7)return new Set(CHAPTER_7.slides.map(slide=>slide.id));
  return new Set((lessonChapter(chapter)?.slides??[]).map(slide=>slide.id));
}

describe('91-page supplied textbook → visible lesson audit',()=>{
  it('has teacher-visible source material for every supplied PDF page',()=>{
    let total=0;
    for(const chapter of [1,7,13] as SourceTeachingChapter[]){
      const atoms=sourceTeachingAtomsForChapter(chapter);
      const pages=[...new Set(atoms.map(atom=>atom.page))].sort((a,b)=>a-b);
      expect(pages).toEqual(expectedPages[chapter]);
      total+=pages.length;
    }
    expect(total).toBe(91);
  });

  it('maps every visible source atom to a real teaching slide',()=>{
    for(const chapter of [1,7,13] as SourceTeachingChapter[]){
      const ids=slideIds(chapter);
      for(const atom of sourceTeachingAtomsForChapter(chapter)){
        expect(ids.has(atom.targetSlideId),`${atom.id} → ${atom.targetSlideId}`).toBe(true);
      }
    }
  });

  it('does not count empty provenance placeholders as teaching content',()=>{
    for(const chapter of [1,7,13] as SourceTeachingChapter[]){
      for(const atom of sourceTeachingAtomsForChapter(chapter)){
        expect(atom.sourceRef.trim().length,`${atom.id} sourceRef`).toBeGreaterThan(0);
        expect(atom.lines.length,`${atom.id} lines`).toBeGreaterThan(0);
        atom.lines.forEach((line,index)=>expect(line.trim().length,`${atom.id} line ${index+1}`).toBeGreaterThan(0));
      }
    }
  });
});
