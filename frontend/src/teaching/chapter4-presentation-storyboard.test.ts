import { describe, expect, it } from 'vitest';
import { CHAPTER_4_CURRENT_DRAFT } from './lesson-content-chapter4-current';
import { chapter4PresentationStoryboard } from './chapter4-presentation-storyboard';
import { curateChapterPresentation } from './chapter-presentation-curation';
import type { LessonPresentationBeat } from './lesson-experience-model';

function deck(topicCode:'4.1'|'4.2'|'4.3') {
  return chapter4PresentationStoryboard(topicCode,CHAPTER_4_CURRENT_DRAFT.slides) ?? [];
}

describe('Chapter 4 authored presentation storyboard',()=>{
  it('uses explicit Chapter 4 scenes rather than the temporary generic rebuild engine',()=>{
    expect(deck('4.1').length).toBeGreaterThan(20);
    expect(deck('4.2').length).toBeGreaterThan(18);
    expect(deck('4.3').length).toBeGreaterThan(10);
    for(const scene of [...deck('4.1'),...deck('4.2'),...deck('4.3')]){
      expect(scene.id.startsWith('h4p-')).toBe(true);
      expect(scene.id.startsWith('c14r-')).toBe(false);
      expect(scene.showSource).toBe(false);
    }
  });

  it('splits register, instruction-set and addressing tables without losing source rows',()=>{
    const rowCount=(topic:'4.1'|'4.2',id:string)=>{
      const block=deck(topic).find(scene=>scene.id===id)?.richBlock;
      return block?.kind==='table'?block.table.rows.length:block?.kind==='comparison'?block.rows.length:0;
    };
    expect(rowCount('4.1','h4p-413-registers-a')).toBe(3);
    expect(rowCount('4.1','h4p-413-registers-b')).toBe(3);
    expect(rowCount('4.2','h4p-423-data-movement-a')).toBe(5);
    expect(rowCount('4.2','h4p-423-data-movement-b')).toBe(3);
    expect(rowCount('4.2','h4p-424-addressing-a')).toBe(3);
    expect(rowCount('4.2','h4p-424-addressing-b')).toBe(3);
  });

  it('preserves the complete fetch-execute, interrupt and assembler reasoning chains',()=>{
    const cpu=deck('4.1');
    const assembly=deck('4.2');
    expect(cpu.find(scene=>scene.id==='h4p-416-fetch-cycle')?.richBlock?.kind).toBe('steps');
    expect(cpu.find(scene=>scene.id==='h4p-416-rtn')?.richBlock?.kind).toBe('table');
    expect(cpu.find(scene=>scene.id==='h4p-417-isr-route')?.bullets?.join(' ')).toContain('ISR');
    expect(assembly.find(scene=>scene.id==='h4p-422-two-pass')?.richBlock?.kind).toBe('comparison');
    expect(assembly.find(scene=>scene.id==='h4p-422-forward-reference')?.example?.lines.join(' ')).toContain('forward reference');
  });

  it('keeps both worked assembly programs as code → symbol table → trace table sequences',()=>{
    const scenes=deck('4.2');
    for(const id of ['h4p-425-program1-code','h4p-425-program2-code'])expect(scenes.find(scene=>scene.id===id)?.richBlock?.kind).toBe('code');
    for(const id of ['h4p-425-program1-symbols','h4p-425-program1-trace','h4p-425-program2-symbols','h4p-425-program2-trace'])expect(scenes.find(scene=>scene.id===id)?.richBlock?.kind).toBe('table');
  });

  it('preserves delayed-answer exam transfer and bit-mask code',()=>{
    const assembly=deck('4.2');
    const bits=deck('4.3');
    expect(assembly.find(scene=>scene.id==='h4p-42-exam')?.activity?.reveal).toContain('LDM #200');
    expect(bits.find(scene=>scene.id==='h4p-432-mask-code')?.richBlock?.kind).toBe('code');
    expect(bits.find(scene=>scene.id==='h4p-eoc-q5-code')?.richBlock?.kind).toBe('code');
    expect(bits.find(scene=>scene.id==='h4p-eoc-q5-tasks')?.sceneRole).toBe('challenge');
  });

  it('covers every source-complete Chapter 4 slide',()=>{
    const covered=new Set([
      ...(chapter4PresentationStoryboard('overview',CHAPTER_4_CURRENT_DRAFT.slides)??[]),
      ...deck('4.1'),...deck('4.2'),...deck('4.3'),
    ].map(scene=>scene.slideId));
    for(const slide of CHAPTER_4_CURRENT_DRAFT.slides)expect(covered.has(slide.id),slide.id).toBe(true);
  });

  it('uses the full Chapter 14 scene grammar across Chapter 4',()=>{
    const roles=new Set([...deck('4.1'),...deck('4.2'),...deck('4.3')].map(scene=>scene.sceneRole));
    for(const role of ['hook','objective','concept','process','visual','compare','challenge','exam','recap']){
      expect(roles.has(role as NonNullable<LessonPresentationBeat['sceneRole']>),role).toBe(true);
    }
  });

  it('routes the integration point to authored Chapter 4 scenes',()=>{
    const raw:LessonPresentationBeat[]=[{id:'h4-411-source',slideId:'h4-411-von-neumann',kind:'concept',eyebrow:'SOURCE',title:'raw',sourcePages:[109],lead:'raw'}];
    const curated=curateChapterPresentation(raw,'4.1');
    expect(curated[0]?.id).toBe('h4p-41-hook');
    expect(curated.every(scene=>scene.id.startsWith('h4p-'))).toBe(true);
  });
});
