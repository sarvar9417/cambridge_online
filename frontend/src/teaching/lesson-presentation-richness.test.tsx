import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LessonPresentationScreen, revealCountForBeat } from './LessonContent';
import type { LessonPresentationBeat } from './lesson-experience-model';

const makeBeat=(overrides:Partial<LessonPresentationBeat>={}):LessonPresentationBeat=>({
  id:'demo-concept-1',
  slideId:'demo',
  kind:'concept',
  eyebrow:'DEMO',
  title:'Demo concept',
  sourcePages:[1],
  showSource:false,
  ...overrides,
});

const occurrences=(value:string,needle:string)=>value.split(needle).length-1;

describe('Chapter 14 presentation richness contract',()=>{
  it('keeps the complete unrevealed structure visible as upcoming content',()=>{
    const html=renderToStaticMarkup(<LessonPresentationScreen beat={makeBeat({
      bullets:['First projected point','Second projected point','Third projected point'],
    })} reveal={0}/>);

    expect(html).toContain('First projected point');
    expect(html).toContain('Second projected point');
    expect(html).toContain('Third projected point');
    expect(occurrences(html,'is-upcoming')).toBeGreaterThanOrEqual(3);
  });

  it('uses progressive emphasis for source-grounded process steps',()=>{
    const html=renderToStaticMarkup(<LessonPresentationScreen beat={makeBeat({
      kind:'visual',
      sceneRole:'process',
      richBlock:{kind:'steps',title:'Three-stage process',items:['Stage one','Stage two','Stage three']},
    })} reveal={1}/>);

    expect(html).toContain('Stage one');
    expect(html).toContain('Stage two');
    expect(html).toContain('Stage three');
    expect(occurrences(html,'is-visible')).toBeGreaterThanOrEqual(1);
    expect(occurrences(html,'is-upcoming')).toBeGreaterThanOrEqual(2);
  });

  it('keeps worked-example answers genuinely hidden until the answer reveal',()=>{
    const beat=makeBeat({
      kind:'example',
      sceneRole:'challenge',
      example:{title:'Worked conversion',lines:['Write the weights','Add the active weights'],answer:'FINAL-ANSWER-238'},
    });
    const before=renderToStaticMarkup(<LessonPresentationScreen beat={beat} reveal={2}/>);
    const after=renderToStaticMarkup(<LessonPresentationScreen beat={beat} reveal={3}/>);

    expect(before).not.toContain('FINAL-ANSWER-238');
    expect(after).toContain('FINAL-ANSWER-238');
  });

  it('keeps activity/model answers hidden until the activity reveal',()=>{
    const beat=makeBeat({
      kind:'activity',
      sceneRole:'exam',
      activity:{title:'Retrieval',prompt:'Explain the process.',reveal:'MODEL-GUIDANCE'},
    });
    const before=renderToStaticMarkup(<LessonPresentationScreen beat={beat} reveal={0}/>);
    const after=renderToStaticMarkup(<LessonPresentationScreen beat={beat} reveal={1}/>);

    expect(before).toContain('Explain the process.');
    expect(before).not.toContain('MODEL-GUIDANCE');
    expect(after).toContain('MODEL-GUIDANCE');
  });

  it('uses the largest structured payload as the reveal count',()=>{
    const beat=makeBeat({
      bullets:['A'],
      keyTerms:[
        {term:'T1',definition:'D1'},
        {term:'T2',definition:'D2'},
      ],
      richBlock:{kind:'steps',items:['S1','S2','S3']},
    });
    expect(revealCountForBeat(beat)).toBe(3);
  });
});
