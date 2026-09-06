import { describe, expect, it } from 'vitest';
import { sourceAtomsForChapter } from './lesson-source-atom-registry';
import { CHAPTER_7_SOURCE_ATOMS } from './chapter7-source-atoms';
import { CHAPTER_7_SOURCE_ACTIVITY_ATOMS } from './chapter7-source-activity-atoms';
import { CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS } from './chapter7-source-pdf-detail';
import {
  sourceTeachingAtomsForChapter,
  sourceTeachingAtomsForSlide,
  type SourceTeachingChapter,
} from './lesson-source-teaching-model';

const ids = (items: Array<{ id: string }>) => items.map(item=>item.id).sort();

describe('Lesson Studio visible textbook-source model',()=>{
  it('exposes every Chapter 1 and 13 registered source atom to the normal teaching canvas',()=>{
    for(const chapter of [1,13] as const){
      const registered=sourceAtomsForChapter(chapter);
      const teaching=sourceTeachingAtomsForChapter(chapter);
      expect(ids(teaching)).toEqual(ids(registered));
      expect(teaching.length).toBeGreaterThan(0);
      teaching.forEach(atom=>{
        expect(atom.lines.length,`${atom.id} has no teaching content`).toBeGreaterThan(0);
        expect(atom.sourceRef.length).toBeGreaterThan(0);
        expect(atom.pageLabel).toMatch(/Hodder p\.\d+/);
      });
    }
  });

  it('exposes every Chapter 7 source/detail/activity atom to the normal teaching canvas',()=>{
    const registered=[...CHAPTER_7_SOURCE_ATOMS,...CHAPTER_7_SOURCE_ACTIVITY_ATOMS,...CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS];
    const teaching=sourceTeachingAtomsForChapter(7);
    expect(ids(teaching)).toEqual(ids(registered));
    teaching.forEach(atom=>{
      expect(atom.lines.length,`${atom.id} has no teaching content`).toBeGreaterThan(0);
      expect(atom.page).toBeGreaterThanOrEqual(258);
      expect(atom.page).toBeLessThanOrEqual(298);
    });
  });

  it('keeps all source content addressable by the exact teaching slide it enriches',()=>{
    for(const chapter of [1,7,13] as SourceTeachingChapter[]){
      const all=sourceTeachingAtomsForChapter(chapter);
      const slideIds=[...new Set(all.map(atom=>atom.targetSlideId))];
      const recovered=slideIds.flatMap(slideId=>sourceTeachingAtomsForSlide(chapter,slideId));
      expect(ids(recovered)).toEqual(ids(all));
    }
  });

  it('uses printed Hodder page numbers for Chapter 13 instead of extract-relative page numbers',()=>{
    const pages=sourceTeachingAtomsForChapter(13).map(atom=>atom.page);
    expect(Math.min(...pages)).toBe(304);
    expect(Math.max(...pages)).toBe(327);
  });
});
