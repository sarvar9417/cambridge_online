import { describe, expect, it } from 'vitest';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { CHAPTER_7_SOURCE_PAGE_AUDIT } from './chapter7-source-page-audit';
import { chapter7PresentationStoryboard } from './chapter7-presentation-storyboard';
import { curateChapterPresentation } from './chapter-presentation-curation';
import type { LessonPresentationBeat } from './lesson-experience-model';

const TOPICS=['7.1','7.2','7.3','7.4','7.5','7.6','7.7','7.8','7.9'] as const;
const deck=(topicCode:(typeof TOPICS)[number])=>chapter7PresentationStoryboard(topicCode,CHAPTER_7.slides)??[];
const all=()=>TOPICS.flatMap(deck);

function sceneText(scene:LessonPresentationBeat) {
  const block=scene.richBlock;
  const blockText=block?.kind==='table'
    ? [...block.table.headers,...block.table.rows.flat()].join(' ')
    : block?.kind==='comparison'
      ? [block.leftTitle,block.rightTitle,...block.rows.flat()].join(' ')
      : block?.kind==='bullets'||block?.kind==='steps'||block?.kind==='sequence'||block?.kind==='bitfields'||block?.kind==='code'
        ? [...('title' in block&&block.title?[block.title]:[]),...('items' in block?block.items:[]),...('lines' in block?block.lines:[])].join(' ')
        : '';
  return [scene.eyebrow,scene.title,scene.lead,...(scene.bullets??[]),...(scene.keyTerms??[]).flatMap(item=>[item.term,item.definition]),...(scene.example?.lines??[]),scene.activity?.prompt,scene.activity?.reveal,blockText].filter(Boolean).join(' ');
}

describe('Chapter 7 authored presentation storyboard',()=>{
  it('uses explicit h7p scenes for every section and no generic c14r scenes',()=>{
    for(const topic of TOPICS){
      const scenes=deck(topic);
      expect(scenes.length,topic).toBeGreaterThan(4);
      for(const scene of scenes){
        expect(scene.id.startsWith('h7p-'),scene.id).toBe(true);
        expect(scene.id.startsWith('c14r-')).toBe(false);
        expect(scene.showSource).toBe(false);
      }
    }
  });

  it('does not leak source-audit or exact-transcript chrome into projector scenes',()=>{
    for(const scene of all()){
      const text=sceneText(scene);
      expect(text).not.toMatch(/COURSEBOOK p\.\d+|BOOK SOURCE|Exact extracted PDF|source atom|IMPORTANT COURSEBOOK DETAIL/i);
      expect(scene.slideId.startsWith('pdf-first-')).toBe(false);
    }
  });

  it('covers every semantic teaching target in the 41-page source audit',()=>{
    const covered=new Set(all().map(scene=>scene.slideId));
    for(const page of CHAPTER_7_SOURCE_PAGE_AUDIT){
      expect(page.targetSlideIds.some(id=>covered.has(id)),`coursebook p.${page.printedPage}`).toBe(true);
    }
  });

  it('keeps source-exact standard-method code and worked traces',()=>{
    const standard=deck('7.4');
    const bubble=standard.find(scene=>scene.id==='h7p-74-bubble-code');
    expect(bubble?.example?.lines).toContain('  Swap ← FALSE');
    expect(bubble?.example?.lines).toContain('UNTIL (NOT Swap) OR Last = 1');

    const trace=deck('7.7').find(scene=>scene.id==='h7p-77-worked-trace');
    expect(trace?.example?.lines).toContain('10: X=5');
    expect(trace?.example?.lines).toContain('OUTPUT: 15 then 2');
  });

  it('keeps validation and verification distinctions source-accurate',()=>{
    const validation=deck('7.5');
    expect(validation.find(scene=>scene.id==='h7p-75-difference')?.keyTerms?.map(item=>item.term)).toEqual(['Validation','Verification']);
    expect(validation.find(scene=>scene.id==='h7p-75-range-code')?.example?.lines?.join(' ')).toContain('0 to 100 inclusive');
    expect(validation.find(scene=>scene.id==='h7p-75-type-presence')?.example?.lines?.join(' ')).toContain('DIV(NumberOfBrothers, 1)');
    expect(validation.find(scene=>scene.id==='h7p-75-format-checkdigit')?.bullets?.join(' ')).toContain('data-entry');
    expect(validation.find(scene=>scene.id==='h7p-75-verification')?.keyTerms?.map(item=>item.term)).toEqual(['Double entry','Screen/visual check']);
  });

  it('preserves the diagnose → correct → retest arc in section 7.8',()=>{
    const ids=deck('7.8').map(scene=>scene.id);
    expect(ids).toEqual(expect.arrayContaining([
      'h7p-78-trace-errors','h7p-78-negative','h7p-78-fixed-limits','h7p-78-first-value','h7p-78-retest',
    ]));
    expect(deck('7.8').find(scene=>scene.id==='h7p-78-retest')?.activity?.reveal).toContain('12390');
    expect(deck('7.8').find(scene=>scene.id==='h7p-78-retest')?.activity?.reveal).toContain('-97');
  });

  it('keeps the full source pseudocode for both large section 7.9 worked examples',()=>{
    const scenes=deck('7.9');
    const ticket=scenes.find(scene=>scene.id==='h7p-79-ticket-code');
    const school=scenes.find(scene=>scene.id==='h7p-79-school-code');
    expect(ticket?.example?.lines).toContain('REPEAT');
    expect(ticket?.example?.lines).toContain('Cost ← NumberOfTickets * 20 * (1 - Discount)');
    expect(school?.example?.lines).toContain('FOR Test ← 1 TO 4');
    expect(school?.example?.lines).toContain('  FOR StudentNumber ← 1 TO 600');
    expect(school?.example?.lines).toContain('OverallAverage ← OverallTotal / 2400');
  });

  it('uses the full Chapter 14 semantic scene grammar across Chapter 7',()=>{
    const roles=new Set(all().map(scene=>scene.sceneRole));
    for(const role of ['hook','objective','concept','process','visual','compare','challenge','exam','recap']){
      expect(roles.has(role as NonNullable<LessonPresentationBeat['sceneRole']>),role).toBe(true);
    }
  });

  it('routes the presentation integration point to the authored Chapter 7 storyboard',()=>{
    const raw:LessonPresentationBeat[]=[{id:'ch7-book-71-five-stages-source',slideId:'ch7-book-71-five-stages',kind:'concept',eyebrow:'SOURCE',title:'raw',sourcePages:[258],lead:'raw'}];
    const curated=curateChapterPresentation(raw,'7.1');
    expect(curated[0]?.id).toBe('h7p-71-hook');
    expect(curated.every(scene=>scene.id.startsWith('h7p-'))).toBe(true);
  });
});
