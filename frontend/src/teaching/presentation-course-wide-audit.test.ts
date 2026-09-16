import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LESSON_EXPERIENCE_CHAPTERS,
  courseCode,
} from './lesson-experience-model';
import {
  CAMBRIDGE_0478_CHAPTERS,
  LESSON_COURSE_CATALOG,
  lessonCatalogChapter,
} from './lesson-course-catalog';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const facade=source('Chapter14PresentationVisualsV4.tsx');

const REPRESENTATIVE_VISUAL_PREDICATES = [
  'hasChapter1PresentationVisual',
  'hasChapter2PresentationVisual',
  'hasChapter3PresentationVisual',
  'hasChapter4ProcessorVisual',
  'hasChapter5SystemSoftwareVisual',
  'hasChapter6SecurityVisual',
  'hasChapter7EthicsVisual',
  'hasChapter8DatabaseVisual',
  'hasChapter9AlgorithmVisual',
  'hasChapter10DataStructureVisual',
  'hasChapter11ProgrammingVisual',
  'hasChapter12SoftwareDevelopmentVisual',
  'hasChapter13PresentationVisual',
  'hasChapter14PresentationRuntime',
  'hasChapter15HardwareVisual',
  'hasChapter16SystemSoftwareVisual',
  'hasChapter17SecurityVisual',
  'hasChapter18AIVisual',
  'hasChapter19AlgorithmVisual',
  'hasChapter20FurtherProgrammingVisual',
] as const;

const DIAGRAM_ONLY_PREDICATES = [
  'hasChapter2PresentationVisual',
  'hasChapter3PresentationVisual',
  'hasChapter4ProcessorVisual',
  'hasChapter5SystemSoftwareVisual',
  'hasChapter6SecurityVisual',
  'hasChapter7EthicsVisual',
  'hasChapter8DatabaseVisual',
  'hasChapter9AlgorithmVisual',
  'hasChapter10DataStructureVisual',
  'hasChapter11ProgrammingVisual',
  'hasChapter12SoftwareDevelopmentVisual',
  'hasChapter15HardwareVisual',
  'hasChapter16SystemSoftwareVisual',
  'hasChapter17SecurityVisual',
  'hasChapter18AIVisual',
  'hasChapter19AlgorithmVisual',
  'hasChapter20FurtherProgrammingVisual',
] as const;

describe('course-wide presentation quality guardrails',()=>{
  it('keeps the canonical Cambridge 9618 catalog complete from Chapter 1 through Chapter 20',()=>{
    expect(LESSON_EXPERIENCE_CHAPTERS).toHaveLength(20);
    expect(LESSON_EXPERIENCE_CHAPTERS.map(chapter=>chapter.number)).toEqual(Array.from({length:20},(_,i)=>i+1));
    expect(LESSON_EXPERIENCE_CHAPTERS.every(chapter=>courseCode(chapter)==='9618')).toBe(true);
    expect(lessonCatalogChapter('9618',7)?.title).toBe('Ethics and ownership');
  });

  it('keeps Cambridge 0478 Chapter 7 as a separate course-aware lesson with no slide-id collision',()=>{
    expect(CAMBRIDGE_0478_CHAPTERS).toHaveLength(1);
    const chapter0478=lessonCatalogChapter('0478',7);
    const chapter9618=lessonCatalogChapter('9618',7);
    expect(chapter0478).toBeTruthy();
    expect(chapter9618).toBeTruthy();
    expect(courseCode(chapter0478!)).toBe('0478');
    expect(courseCode(chapter9618!)).toBe('9618');
    expect(chapter0478).not.toBe(chapter9618);
    const ids0478=new Set(chapter0478!.slides.map(slide=>slide.id));
    const ids9618=new Set(chapter9618!.slides.map(slide=>slide.id));
    expect([...ids0478].some(id=>ids9618.has(id))).toBe(false);
    expect(LESSON_COURSE_CATALOG.filter(chapter=>chapter.number===7)).toHaveLength(2);
  });

  it('keeps a presentation visual route reachable for every Cambridge 9618 chapter',()=>{
    for(const predicate of REPRESENTATIVE_VISUAL_PREDICATES){
      expect(facade,predicate).toContain(predicate);
    }
    expect(facade).toContain('Chapter14PresentationHero');
    expect(facade).toContain('Chapter20FurtherProgrammingVisual');
  });

  it('keeps diagram-only chapter visuals additive instead of suppressing source-backed teaching text',()=>{
    const ownsStart=facade.indexOf('export function presentationVisualOwnsBeatContent');
    const rendererStart=facade.indexOf('export function Chapter14PresentationVisualV4');
    const ownsBody=facade.slice(ownsStart,rendererStart);
    expect(ownsBody).toContain('hasChapter14PresentationRuntime');
    expect(ownsBody).toContain('hasChapter1PresentationVisual');
    expect(ownsBody).toContain('hasChapter13PresentationVisual');
    for(const predicate of DIAGRAM_ONLY_PREDICATES){
      expect(ownsBody,predicate).not.toContain(predicate);
    }
  });
});
