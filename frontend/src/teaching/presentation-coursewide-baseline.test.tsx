import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LessonPresentationScreen } from './LessonContent';
import { buildTopicPlan } from './lesson-topic-plan';
import { LESSON_COURSE_CATALOG, presentationBeatsForCatalogTopic } from './lesson-course-catalog';
import type { LessonPresentationBeat } from './lesson-experience-model';
import {
  presentationBeatMetrics,
  presentationClassroomWarnings,
  presentationDensityForBeat,
} from './presentation-classroom-audit';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src',file),'utf8');
const css=source('teaching/presentation-coursewide-baseline.css');
const main=source('main.tsx');

const beat=(overrides:Partial<LessonPresentationBeat>={}):LessonPresentationBeat=>({
  id:'audit-demo-concept-1',
  slideId:'audit-demo',
  kind:'concept',
  eyebrow:'DEMO · COURSEBOOK',
  title:'A classroom concept',
  sourcePages:[1],
  lead:'A short explanation that is readable from the back of a classroom.',
  visual:'recap',
  ...overrides,
});

describe('course-wide classroom presentation baseline',()=>{
  it('classifies light, standard and dense teaching beats deterministically',()=>{
    expect(presentationDensityForBeat(beat())).toBe('light');
    expect(presentationDensityForBeat(beat({
      bullets:[
        'First explanation contains enough detail to make the scene more substantial.',
        'Second explanation adds a different relationship that the class needs to compare.',
        'Third explanation connects the source idea to a concrete classroom example.',
        'Fourth explanation completes the standard teaching sequence without overcrowding it.',
      ],
    }))).toBe('standard');
    expect(presentationDensityForBeat(beat({
      bullets:Array.from({length:8},(_,index)=>`Dense source-backed point ${index+1} with supporting detail for the class.`),
    }))).toBe('dense');
  });

  it('counts structural load without treating a visual as missing teaching content',()=>{
    const metrics=presentationBeatMetrics(beat({
      bullets:['One concise point.','Another concise point.'],
      keyTerms:[{term:'Protocol',definition:'A defined set of rules.'}],
    }));
    expect(metrics.wordCount).toBeGreaterThan(10);
    expect(metrics.structuralItems).toBe(3);
    expect(metrics.revealItems).toBe(2);
    expect(metrics.hasVisual).toBe(true);
  });

  it('marks generic projector scenes with stable audit hooks and density classes',()=>{
    const html=renderToStaticMarkup(<LessonPresentationScreen beat={beat({
      bullets:Array.from({length:8},(_,index)=>`Point ${index+1}`),
      showSource:false,
    })} reveal={1}/>);
    expect(html).toContain('lx-present-screen--generic');
    expect(html).toContain('lx-present-screen--density-dense');
    expect(html).toContain('data-slide-id="audit-demo"');
    expect(html).toContain('data-beat-id="audit-demo-concept-1"');
    expect(html).toContain('data-density="dense"');
    expect(html).toContain('data-visual-kind="recap"');
  });

  it('builds a readable overview presentation for every active 9618 chapter and restored 0478 Chapter 7',()=>{
    expect(LESSON_COURSE_CATALOG.length).toBeGreaterThanOrEqual(21);
    for(const chapter of LESSON_COURSE_CATALOG){
      const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
      const overview=topics.find(topic=>topic.code==='overview');
      expect(overview,`Chapter ${chapter.number} overview`).toBeTruthy();
      if(!overview)continue;
      const beats=presentationBeatsForCatalogTopic(chapter,overview);
      expect(beats.length,`Chapter ${chapter.number} presentation beats`).toBeGreaterThan(0);
      const ownIds=new Set(chapter.slides.map(slide=>slide.id));
      for(const item of beats){
        expect(ownIds.has(item.slideId),`${chapter.number} ${item.id} stays in chapter`).toBe(true);
        expect(['light','standard','dense']).toContain(presentationDensityForBeat(item));
        const warnings=presentationClassroomWarnings(item);
        expect(warnings,`${chapter.number} ${item.id}`).not.toContain('missing-title');
        expect(warnings,`${chapter.number} ${item.id}`).not.toContain('missing-eyebrow');
      }
    }
  });

  it('keeps the generic projector baseline readable and source-complete at common classroom sizes',()=>{
    expect(css).toContain('.lx-present-screen--generic');
    expect(css).toContain('.lx-present-screen--density-dense');
    expect(css).toContain('@media (max-width:1366px)');
    expect(css).toContain('@media (max-height:768px) and (min-width:960px)');
    expect(css).toContain('--lx-projector-body:clamp(18px,1.32vw,22px)');
    expect(css).toContain('overflow-wrap:break-word');
    expect(css).not.toContain('display:none');
  });

  it('loads the baseline before specialist Chapter 14 and Chapter 1 finishing layers',()=>{
    const baseline=main.indexOf("import './teaching/presentation-coursewide-baseline.css';");
    const chapter14=main.indexOf("import './teaching/chapter14-presentation-professional.css';");
    const chapter1=main.indexOf("import './teaching/chapter1-presentation-media.css';");
    expect(baseline).toBeGreaterThan(0);
    expect(chapter14).toBeGreaterThan(baseline);
    expect(chapter1).toBeGreaterThan(baseline);
  });
});
