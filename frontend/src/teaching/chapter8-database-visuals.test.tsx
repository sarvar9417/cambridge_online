import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_8_FINAL } from './lesson-content-chapter8-deep-final';
import {
  CHAPTER_8_DATABASE_VISUAL_IDS,
  hasChapter8DatabaseVisual,
} from './Chapter8DatabaseVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter8DatabaseVisuals.tsx');
const css=source('chapter8-database-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');

const beat=(slideId:string):LessonPresentationBeat=>({
  id:`${slideId}-concept-1`,
  slideId,
  kind:'concept',
  eyebrow:'TEST',
  title:'Test',
  sourcePages:[],
});

describe('Cambridge 9618 Chapter 8 database classroom visuals',()=>{
  it('targets only real source-backed slides in the final Chapter 8 route',()=>{
    const slideIds=new Set(CHAPTER_8_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_8_DATABASE_VISUAL_IDS.length).toBeGreaterThanOrEqual(12);
    for(const id of CHAPTER_8_DATABASE_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 8 targets without leaking into other chapters',()=>{
    expect(CHAPTER_8_DATABASE_VISUAL_IDS.every(id=>id.startsWith('h8-'))).toBe(true);
    expect(hasChapter8DatabaseVisual(beat('h8-815-normalisation-rules'))).toBe(true);
    expect(hasChapter8DatabaseVisual(beat('h7-71-foundations'))).toBe(false);
    expect(hasChapter8DatabaseVisual(beat('h9-overview'))).toBe(false);
  });

  it('covers the source-specific relational, normalisation, DBMS and SQL vocabulary',()=>{
    for(const term of [
      'REDUNDANCY','INCONSISTENCY','DEPENDENCY','CANDIDATE KEY','PRIMARY KEY','FOREIGN KEY',
      'REFERENTIAL INTEGRITY','CARDINALITY','1NF','2NF','3NF','DATA DICTIONARY','LOGICAL SCHEMA',
      'DDL INTERPRETER','DML COMPILER','QUERY EVALUATION ENGINE','CREATE DATABASE','CREATE TABLE',
      'ALTER TABLE','INNER JOIN','GROUP BY','INSERT INTO','DELETE FROM','UPDATE','SUM · AVG · COUNT',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 8 visuals diagram-only so source lesson detail remains beside them',()=>{
    expect(facade).toContain("import { Chapter8DatabaseVisual, hasChapter8DatabaseVisual } from './Chapter8DatabaseVisuals';");
    expect(facade).toContain('hasChapter8DatabaseVisual(beat)');
    expect(facade).toContain('return <Chapter8DatabaseVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter8DatabaseVisual');
  });

  it('has explicit projector fit and responsive rules without hiding source content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
