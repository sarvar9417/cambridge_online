import { describe, expect, it } from 'vitest';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { chapter3PresentationStoryboard } from './chapter3-presentation-storyboard';
import { curateChapterPresentation } from './chapter-presentation-curation';
import type { LessonPresentationBeat } from './lesson-experience-model';

function deck(topicCode:'3.1'|'3.2') {
  return chapter3PresentationStoryboard(topicCode,CHAPTER_3_FINAL.slides) ?? [];
}

describe('Chapter 3 authored presentation storyboard',()=>{
  it('uses explicit Chapter 3 scenes and hides source/audit chrome',()=>{
    const hardware=deck('3.1');
    const logic=deck('3.2');
    expect(hardware.length).toBeGreaterThan(35);
    expect(logic.length).toBeGreaterThan(30);
    for(const scene of [...hardware,...logic]){
      expect(scene.id.startsWith('h3p-')).toBe(true);
      expect(scene.id.startsWith('c14r-')).toBe(false);
      expect(scene.showSource).toBe(false);
    }
  });

  it('splits dense source tables for projector use without dropping rows',()=>{
    const scenes=deck('3.1');
    const rows=(id:string)=>{
      const block=scenes.find(scene=>scene.id===id)?.richBlock;
      return block?.kind==='table'?block.table.rows:block?.kind==='comparison'?block.rows:[];
    };
    expect(rows('h3p-311-dram-sram-a')).toHaveLength(3);
    expect(rows('h3p-311-dram-sram-b')).toHaveLength(2);
    expect(rows('h3p-311-embedded-a')).toHaveLength(3);
    expect(rows('h3p-311-embedded-b')).toHaveLength(2);
    expect(rows('h3p-312-touch-a')).toHaveLength(2);
    expect(rows('h3p-312-touch-b')).toHaveLength(2);
    expect(rows('h3p-312-sensors-a')).toHaveLength(3);
    expect(rows('h3p-312-sensors-b')).toHaveLength(3);
    expect(rows('h3p-312-sensors-c')).toHaveLength(3);
  });

  it('preserves the Chapter 3 hardware process chains',()=>{
    const scenes=deck('3.1');
    expect(scenes.find(scene=>scene.id==='h3p-312-laser-printer')?.richBlock?.kind).toBe('steps');
    expect(scenes.find(scene=>scene.id==='h3p-312-inkjet-sequence')?.richBlock?.kind).toBe('steps');
    expect(scenes.find(scene=>scene.id==='h3p-312-abs')?.richBlock?.kind).toBe('steps');
    expect(scenes.find(scene=>scene.id==='h3p-31-memory-check')?.activity?.reveal).toContain('DRAM uses capacitors');
  });

  it('turns worked logic examples into explicit staged reasoning scenes',()=>{
    const scenes=deck('3.2');
    const ids=new Set(scenes.map(scene=>scene.id));
    for(const id of [
      'h3p-324-example31-pq-a','h3p-324-example31-pq-b','h3p-324-example31-r-a','h3p-324-example31-r-b',
      'h3p-324-example31-final-a','h3p-324-example31-final-b','h3p-324-example32-translate',
      'h3p-324-example32-truth-a','h3p-324-example32-truth-b','h3p-324-example33-stage1',
      'h3p-324-example33-truth-a','h3p-324-example33-truth-b',
    ])expect(ids.has(id),id).toBe(true);

    const finalA=scenes.find(scene=>scene.id==='h3p-324-example31-final-a')?.richBlock;
    const finalB=scenes.find(scene=>scene.id==='h3p-324-example31-final-b')?.richBlock;
    expect(finalA?.kind).toBe('table');
    expect(finalB?.kind).toBe('table');
    if(finalA?.kind==='table'&&finalB?.kind==='table'){
      expect(finalA.table.rows).toHaveLength(4);
      expect(finalB.table.rows).toHaveLength(4);
    }
  });

  it('uses the full Chapter 14 scene grammar across Chapter 3',()=>{
    const roles=new Set([...deck('3.1'),...deck('3.2')].map(scene=>scene.sceneRole));
    for(const role of ['hook','objective','concept','process','visual','compare','challenge','exam','recap']){
      expect(roles.has(role as NonNullable<LessonPresentationBeat['sceneRole']>),role).toBe(true);
    }
  });

  it('covers every core source slide in the two source sections',()=>{
    const covered=new Set([...deck('3.1'),...deck('3.2')].map(scene=>scene.slideId));
    const core=CHAPTER_3_FINAL.slides.filter(slide=>
      !slide.examPractice && slide.id!=='h3-overview' && (slide.section.startsWith('3.1')||slide.section.startsWith('3.2')||slide.section==='End of chapter questions'),
    );
    for(const slide of core)expect(covered.has(slide.id),slide.id).toBe(true);
  });

  it('routes the presentation integration point to authored Chapter 3 scenes',()=>{
    const raw:LessonPresentationBeat[]=[{
      id:'h3-311-memory-storage-concept-1',slideId:'h3-311-memory-storage',kind:'concept',eyebrow:'SOURCE',title:'raw',sourcePages:[69],lead:'raw',
    }];
    const curated=curateChapterPresentation(raw,'3.1');
    expect(curated[0]?.id).toBe('h3p-31-hook');
    expect(curated.every(scene=>scene.id.startsWith('h3p-'))).toBe(true);
  });
});
