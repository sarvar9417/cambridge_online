import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { PDF_FIRST_SECTION_ORDER, pdfFirstBlocksForSection } from './pdf-first-source-index';
import type { HodderLessonSlide } from './lesson-content-hodder-types';

const activeChapter=(chapter:number)=>chapter===7?CHAPTER_7:LESSON_CHAPTERS.find(item=>item.number===chapter)!;
const sourceSlides=(chapter:number,id:string)=>(activeChapter(chapter).slides as HodderLessonSlide[])
  .filter(slide=>slide.subtopicCode===id && slide.id.startsWith(`pdf-first-${id.replace('.','')}-`) && !slide.id.startsWith('pdf-first-lens-'));
const normalise=(value:string)=>value.replace(/\s+/g,' ').trim();

describe('scroll-page PDF lesson route',()=>{
  it('keeps every supplied-PDF word and punctuation mark visible in source order',()=>{
    for(const meta of PDF_FIRST_SECTION_ORDER){
      const visible=sourceSlides(meta.chapter,meta.id).flatMap(slide=>slide.bullets??[]).join(' ');
      const expected=pdfFirstBlocksForSection(meta.id).join(' ');
      expect(normalise(visible),`${meta.id} reconstructed visible source text`).toBe(normalise(expected));
    }
  });

  it('does not explode the active route into projector presentation fragments',()=>{
    for(const meta of PDF_FIRST_SECTION_ORDER){
      const slides=sourceSlides(meta.chapter,meta.id);
      expect(slides.length,`${meta.id} source slides`).toBeGreaterThan(0);
      slides.forEach(slide=>{
        expect(slide.eyebrow).not.toContain('COURSEBOOK PRESENTATION');
        expect(slide.id).not.toMatch(/-part-\d+$/);
      });
    }
  });

  it('keeps the old presentation renderer available without using it as the learner data model',()=>{
    const source=readFileSync(resolve(process.cwd(),'src/teaching/pdf-first-presentation-layout.ts'),'utf8');
    const active9618=readFileSync(resolve(process.cwd(),'src/teaching/lesson-content-source-complete.ts'),'utf8');
    const active7=readFileSync(resolve(process.cwd(),'src/teaching/lesson-content-chapter7-complete.ts'),'utf8');
    expect(source).toContain('export function presentationizePdfFirstChapter');
    expect(active9618).not.toContain('presentationizePdfFirstChapter(');
    expect(active7).not.toContain('presentationizePdfFirstChapter(');
  });

  it('lets the fullscreen board scroll the same topic page instead of clipping it',()=>{
    const css=readFileSync(resolve(process.cwd(),'src/teaching/lesson-topic-pages.css'),'utf8');
    expect(css).toContain('.lesson-topic-studio:fullscreen .lesson-topic-page');
    expect(css).toContain('overflow-y: auto !important;');
    expect(css).toContain('touch-action: pan-y !important;');
  });

  it('still loads the established presentation stylesheet for Board mode styling',()=>{
    const css=readFileSync(resolve(process.cwd(),'src/teaching/lesson-studio-presenter-fix.css'),'utf8');
    expect(css.startsWith("@import './lesson-studio-presentation.css';")).toBe(true);
  });
});
