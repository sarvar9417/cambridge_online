import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { curateChapterPresentation } from './chapter-presentation-curation';
import { LessonPresentationScreen, revealCountForBeat } from './LessonContent';
import type { LessonPresentationBeat } from './lesson-experience-model';

const makeBeat=(overrides:Partial<LessonPresentationBeat>={}):LessonPresentationBeat=>({
  id:'demo-concept-1',
  slideId:'demo',
  kind:'concept',
  eyebrow:'DEMO',
  title:'Demo concept',
  sourcePages:[1],
  ...overrides,
});

const occurrences=(value:string,needle:string)=>value.split(needle).length-1;

describe('Chapter 14 presentation richness contract',()=>{
  it('combines compact foundation fragments into one richer source-faithful scene',()=>{
    const beats=curateChapterPresentation([
      makeBeat({id:'demo-concept-1',lead:'The source introduces the idea and its purpose.'}),
      makeBeat({id:'demo-ideas-1',kind:'key-idea',bullets:['First source point','Second source point']}),
      makeBeat({id:'demo-terms-1',kind:'definition',keyTerms:[{term:'Exact term',definition:'Exact source definition.'}]}),
    ],'1.1');

    expect(beats).toHaveLength(1);
    expect(beats[0]?.lead).toContain('introduces the idea');
    expect(beats[0]?.bullets).toEqual(['First source point','Second source point']);
    expect(beats[0]?.keyTerms).toEqual([{term:'Exact term',definition:'Exact source definition.'}]);
    expect(beats[0]?.showSource).toBe(false);
  });

  it('removes only exact duplicates and keeps longer source explanations on screen',()=>{
    const beats=curateChapterPresentation([
      makeBeat({id:'demo-ideas-1',kind:'key-idea',bullets:['TCP uses acknowledgements.']}),
      makeBeat({
        id:'demo-source-tcp-1',
        kind:'source',
        lead:'Connect this source detail to the main concept.',
        richBlock:{kind:'bullets',items:[
          'TCP uses acknowledgements.',
          'TCP uses acknowledgements and retransmits a packet when a positive acknowledgement is not received.',
        ]},
      }),
    ],'14.1');

    const source=beats.find(beat=>beat.id.includes('-source-'));
    expect(source?.lead).toContain('Connect this source detail');
    expect(source?.richBlock?.kind).toBe('bullets');
    if(source?.richBlock?.kind==='bullets'){
      expect(source.richBlock.items).toEqual([
        'TCP uses acknowledgements and retransmits a packet when a positive acknowledgement is not received.',
      ]);
    }
  });

  it('keeps the complete unrevealed structure visible as upcoming content',()=>{
    const html=renderToStaticMarkup(<LessonPresentationScreen beat={makeBeat({
      bullets:['First projected point','Second projected point','Third projected point'],
      showSource:false,
    })} reveal={0}/>);

    expect(html).toContain('First projected point');
    expect(html).toContain('Second projected point');
    expect(html).toContain('Third projected point');
    expect(occurrences(html,'is-upcoming')).toBeGreaterThanOrEqual(3);
  });

  it('shows Chapter 2/3/4 diagram visuals beside their structured source detail',()=>{
    const beat=makeBeat({
      id:'h2-213-topologies-source-table-1',
      slideId:'h2-213-topologies',
      kind:'visual',
      sceneRole:'compare',
      richBlock:{kind:'bullets',items:['Bus: one central cable.','Star: central hub or switch.']},
      showSource:false,
    });
    const html=renderToStaticMarkup(<LessonPresentationScreen beat={beat} reveal={0}/>);

    expect(html).toContain('h2pv-topologies');
    expect(html).toContain('Bus: one central cable.');
    expect(html).toContain('Star: central hub or switch.');
    expect(html).toContain('lx-present-screen--split-rich');
  });

  it('lets Chapter 1 content-owning visuals render structured payload exactly once',()=>{
    const beat=makeBeat({
      id:'h1-111-number-systems-ideas-1',
      slideId:'h1-111-number-systems',
      kind:'key-idea',
      bullets:['UNIQUE-RICHNESS-PAYLOAD'],
      showSource:false,
    });
    const html=renderToStaticMarkup(<LessonPresentationScreen beat={beat} reveal={1}/>);
    expect(occurrences(html,'UNIQUE-RICHNESS-PAYLOAD')).toBe(1);
  });

  it('uses the largest merged payload as the reveal count',()=>{
    const beat=makeBeat({
      bullets:['A'],
      keyTerms:[
        {term:'T1',definition:'D1'},
        {term:'T2',definition:'D2'},
      ],
    });
    expect(revealCountForBeat(beat)).toBe(2);
  });
});
