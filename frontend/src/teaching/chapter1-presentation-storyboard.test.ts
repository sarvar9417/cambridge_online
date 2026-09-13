import { describe, expect, it } from 'vitest';
import { HODDER_CHAPTER_1 } from './lesson-content-hodder-ch1';
import { chapter1PresentationStoryboard } from './chapter1-presentation-storyboard';
import { curateChapterPresentation } from './chapter-presentation-curation';
import type { LessonPresentationBeat } from './lesson-experience-model';

function sourceSlides(topicCode:string) {
  return HODDER_CHAPTER_1.slides.filter(slide=>slide.subtopicCode===topicCode);
}

function deck(topicCode:'1.1'|'1.2'|'1.3') {
  return chapter1PresentationStoryboard(topicCode,sourceSlides(topicCode)) ?? [];
}

describe('Chapter 1 authored presentation storyboard',()=>{
  it('uses explicit Chapter 1 scenes rather than the temporary generic rebuild engine',()=>{
    for(const topicCode of ['1.1','1.2','1.3'] as const){
      const scenes=deck(topicCode);
      expect(scenes.length).toBeGreaterThan(10);
      expect(scenes.every(scene=>scene.id.startsWith('h1p-'))).toBe(true);
      expect(scenes.some(scene=>scene.id.startsWith('c14r-'))).toBe(false);
      expect(scenes.every(scene=>scene.showSource===false)).toBe(true);
    }
  });

  it('covers every non-checkpoint source slide in each Chapter 1 subtopic',()=>{
    for(const topicCode of ['1.1','1.2','1.3'] as const){
      const source=sourceSlides(topicCode).filter(slide=>!slide.examPractice);
      const covered=new Set(deck(topicCode).map(scene=>scene.slideId));
      for(const slide of source)expect(covered.has(slide.id),`${topicCode}: ${slide.id}`).toBe(true);
    }
  });

  it('splits dense hexadecimal and BCD source tables into projector-readable semantic scenes',()=>{
    const scenes=deck('1.1');
    const hexA=scenes.find(scene=>scene.id==='h1p-113-hex-map-a');
    const hexB=scenes.find(scene=>scene.id==='h1p-113-hex-map-b');
    const bcdA=scenes.find(scene=>scene.id==='h1p-114-bcd-map-a');
    const bcdB=scenes.find(scene=>scene.id==='h1p-114-bcd-map-b');

    expect(hexA?.richBlock?.kind).toBe('table');
    expect(hexB?.richBlock?.kind).toBe('table');
    expect(bcdA?.richBlock?.kind).toBe('table');
    expect(bcdB?.richBlock?.kind).toBe('table');
    if(hexA?.richBlock?.kind==='table'&&hexB?.richBlock?.kind==='table'){
      expect(hexA.richBlock.table.rows).toHaveLength(8);
      expect(hexB.richBlock.table.rows).toHaveLength(8);
      expect(hexA.richBlock.table.rows[0]).toEqual(['0','0','0000']);
      expect(hexB.richBlock.table.rows.at(-1)).toEqual(['F','15','1111']);
    }
    if(bcdA?.richBlock?.kind==='table'&&bcdB?.richBlock?.kind==='table'){
      expect(bcdA.richBlock.table.rows).toHaveLength(5);
      expect(bcdB.richBlock.table.rows).toHaveLength(5);
    }
  });

  it('preserves source reasoning chains, comparisons and activities instead of thin summaries',()=>{
    const data=deck('1.1');
    const multimedia=deck('1.2');
    const compression=deck('1.3');

    expect(data.find(scene=>scene.id==='h1p-112-convert-example')?.example?.answer).toBe('238₁₀');
    expect(data.find(scene=>scene.id==='h1p-112-arithmetic-models')?.richBlock?.kind).toBe('table');
    expect(multimedia.find(scene=>scene.id==='h1p-bitmap-size-formula')?.formula).toContain('width × height × bits per pixel');
    expect(multimedia.find(scene=>scene.id==='h1p-bitmap-vector-table')?.richBlock?.kind).toBe('table');
    expect(compression.find(scene=>scene.id==='h1p-rle-text-example')?.richBlock?.kind).toBe('code');
    expect(compression.find(scene=>scene.id==='h1p-13-recap')?.activity?.reveal).toContain('RLE replaces an adjacent repeated run');
  });

  it('uses the full Chapter 14 scene grammar across the authored chapter route',()=>{
    const scenes=[...deck('1.1'),...deck('1.2'),...deck('1.3')];
    const roles=new Set(scenes.map(scene=>scene.sceneRole));
    for(const role of ['hook','objective','concept','process','visual','compare','challenge','exam','recap']){
      expect(roles.has(role as NonNullable<LessonPresentationBeat['sceneRole']>),role).toBe(true);
    }
  });

  it('routes the presentation integration point to authored Chapter 1 scenes',()=>{
    const raw:LessonPresentationBeat[]=[{
      id:'h1-111-number-systems-concept-1',
      slideId:'h1-111-number-systems',
      kind:'concept',
      eyebrow:'SOURCE-FAITHFUL',
      title:'placeholder raw beat',
      sourcePages:[2],
      lead:'temporary raw beat',
    }];
    const curated=curateChapterPresentation(raw,'1.1');
    expect(curated[0]?.id).toBe('h1p-11-hook');
    expect(curated.every(scene=>scene.id.startsWith('h1p-'))).toBe(true);
  });
});
