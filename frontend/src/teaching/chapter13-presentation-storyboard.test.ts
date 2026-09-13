import { describe, expect, it } from 'vitest';
import { SOURCE_FILE_FIDELITY_CHAPTER_13 } from './lesson-content-source-file-fidelity';
import { chapter13PresentationStoryboard } from './chapter13-presentation-storyboard';
import { curateChapterPresentation } from './chapter-presentation-curation';
import type { LessonPresentationBeat } from './lesson-experience-model';

const deck=(topicCode:'13.1'|'13.2'|'13.3')=>chapter13PresentationStoryboard(topicCode,SOURCE_FILE_FIDELITY_CHAPTER_13.slides)??[];

describe('Chapter 13 authored presentation storyboard',()=>{
  it('uses explicit h13p scenes instead of the former generic rebuild engine',()=>{
    expect(deck('13.1').length).toBeGreaterThan(12);
    expect(deck('13.2').length).toBeGreaterThan(18);
    expect(deck('13.3').length).toBeGreaterThan(25);
    for(const scene of [...deck('13.1'),...deck('13.2'),...deck('13.3')]){
      expect(scene.id.startsWith('h13p-'),scene.id).toBe(true);
      expect(scene.id.startsWith('c14r-')).toBe(false);
      expect(scene.showSource).toBe(false);
    }
  });

  it('keeps printed-source/editorial distinctions explicit instead of silently correcting them',()=>{
    const scenes=deck('13.1');
    const record=scenes.find(scene=>scene.id==='h13p-131-record-source-note');
    const set=scenes.find(scene=>scene.id==='h13p-131-set-source-note');
    expect(record?.lead).toContain('printed example uses STRING');
    expect(record?.richBlock?.kind).toBe('comparison');
    if(record?.richBlock?.kind==='comparison'){
      expect(record.richBlock.rows).toContainEqual(['noPages : STRING','noPages : INTEGER']);
      expect(record.richBlock.rows).toContainEqual(['fiction : STRING','fiction : BOOLEAN']);
    }
    expect(set?.lead).toContain('printed source declares TYPE Sletter');
    expect(set?.richBlock?.kind).toBe('comparison');
  });

  it('projects source file-organisation diagrams and separates organisation from access',()=>{
    const scenes=deck('13.2');
    for(const id of ['h13p-132-serial','h13p-132-sequential-figure','h13p-132-random','h13p-132-seq-access-figure']){
      expect(scenes.find(scene=>scene.id===id)?.richBlock?.kind,id).toBe('figure');
    }
    expect(scenes.find(scene=>scene.id==='h13p-132-terms-a')?.keyTerms?.map(item=>item.term)).toEqual([
      'Serial organisation','Sequential organisation','Random organisation',
    ]);
    expect(scenes.find(scene=>scene.id==='h13p-132-terms-b')?.keyTerms?.map(item=>item.term)).toEqual([
      'Sequential access','Direct access',
    ]);
  });

  it('preserves hashing arithmetic, collision rules and delayed-answer transfer',()=>{
    const scenes=deck('13.2');
    expect(scenes.find(scene=>scene.id==='h13p-132-hash-formula')?.formula).toContain('key MOD capacity');
    const collision=scenes.find(scene=>scene.id==='h13p-132-hash-collision')?.richBlock;
    expect(collision?.kind).toBe('comparison');
    if(collision?.kind==='comparison'){
      expect(collision.leftTitle).toContain('Open hash');
      expect(collision.rightTitle).toContain('Closed hash');
    }
    const exam=scenes.find(scene=>scene.id==='h13p-132-exam');
    expect(exam?.activity?.reveal).toContain('2270');
    expect(exam?.activity?.reveal).toContain('2275');
  });

  it('stages floating-point conversion and normalisation instead of collapsing the worked reasoning',()=>{
    const scenes=deck('13.3');
    for(const id of ['h13p-133-float-denary-method1','h13p-133-float-denary-method2','h13p-133-denary-float-route','h13p-133-normalise-positive','h13p-133-normalise-negative']){
      expect(scenes.find(scene=>scene.id===id)?.sceneRole,id).toBe('process');
    }
    const positive=scenes.find(scene=>scene.id==='h13p-133-float-denary-results-a')?.richBlock;
    const negative=scenes.find(scene=>scene.id==='h13p-133-float-denary-results-b')?.richBlock;
    expect(positive?.kind).toBe('table');
    expect(negative?.kind).toBe('table');
    if(positive?.kind==='table'&&negative?.kind==='table'){
      expect(positive.table.rows).toHaveLength(2);
      expect(negative.table.rows).toHaveLength(2);
      expect(positive.table.rows[0]?.[2]).toBe('11.25');
      expect(negative.table.rows[1]?.[2]).toBe('−0.025390625');
    }
  });

  it('keeps the precision/range and finite-representation consequences explicit',()=>{
    const scenes=deck('13.3');
    const tradeoff=scenes.find(scene=>scene.id==='h13p-133-precision-range')?.richBlock;
    expect(tradeoff?.kind).toBe('table');
    if(tradeoff?.kind==='table'){
      expect(tradeoff.table.rows).toEqual([
        ['12 bits','4 bits','High precision, small range'],
        ['8 bits','8 bits','Balanced precision/range'],
        ['4 bits','12 bits','Low precision, extremely large range'],
      ]);
    }
    expect(scenes.find(scene=>scene.id==='h13p-133-rounding-reason')?.richBlock?.kind).toBe('bullets');
    expect(scenes.find(scene=>scene.id==='h13p-133-over-under')?.richBlock?.kind).toBe('comparison');
    expect(scenes.find(scene=>scene.id==='h13p-133-zero')?.richBlock?.kind).toBe('callout');
  });

  it('uses the complete Chapter 14 semantic scene grammar across Chapter 13',()=>{
    const roles=new Set([...deck('13.1'),...deck('13.2'),...deck('13.3')].map(scene=>scene.sceneRole));
    for(const role of ['hook','objective','concept','process','visual','compare','challenge','exam','recap']){
      expect(roles.has(role as NonNullable<LessonPresentationBeat['sceneRole']>),role).toBe(true);
    }
  });

  it('covers every core source slide from the three Chapter 13 sections and both Hodder reviews',()=>{
    const covered=new Set([...deck('13.1'),...deck('13.2'),...deck('13.3')].map(scene=>scene.slideId));
    const required=SOURCE_FILE_FIDELITY_CHAPTER_13.slides.filter(slide=>
      !slide.examPractice && !slide.id.startsWith('h13-current-') && slide.id!=='h13-overview',
    );
    for(const slide of required)expect(covered.has(slide.id),slide.id).toBe(true);
  });

  it('routes the integration point to the authored Chapter 13 storyboard',()=>{
    const raw:LessonPresentationBeat[]=[{id:'h13-udt-why-source',slideId:'h13-udt-why',kind:'concept',eyebrow:'SOURCE',title:'raw',sourcePages:[2],lead:'raw'}];
    const curated=curateChapterPresentation(raw,'13.1');
    expect(curated[0]?.id).toBe('h13p-131-objectives');
    expect(curated.every(scene=>scene.id.startsWith('h13p-'))).toBe(true);
  });
});
