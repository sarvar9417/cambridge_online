import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { PDF_FIRST_PRESENTATION_LIMITS } from './pdf-first-presentation-layout';
import { PDF_FIRST_SECTION_ORDER, pdfFirstBlocksForSection } from './pdf-first-source-index';
import type { HodderLessonSlide } from './lesson-content-hodder-types';

const activeChapter=(chapter:number)=>chapter===7?CHAPTER_7:LESSON_CHAPTERS.find(item=>item.number===chapter)!;
const sourceSlides=(chapter:number,id:string)=>(activeChapter(chapter).slides as HodderLessonSlide[])
  .filter(slide=>slide.subtopicCode===id && slide.id.startsWith(`pdf-first-${id.replace('.','')}-`) && !slide.id.startsWith('pdf-first-lens-'));

describe('presentation-first PDF lesson layout',()=>{
  it('keeps every exact source block visible and in source order after presentation splitting',()=>{
    for(const meta of PDF_FIRST_SECTION_ORDER){
      const visible=sourceSlides(meta.chapter,meta.id).flatMap(slide=>slide.bullets??[]);
      expect(visible,`${meta.id} source order`).toEqual(pdfFirstBlocksForSection(meta.id));
    }
  });

  it('limits generated exact-PDF screens to projector-sized block groups and density',()=>{
    for(const meta of PDF_FIRST_SECTION_ORDER){
      for(const slide of sourceSlides(meta.chapter,meta.id)){
        const bullets=slide.bullets??[];
        expect(bullets.length,`${slide.id} block count`).toBeGreaterThan(0);
        expect(bullets.length,`${slide.id} block count`).toBeLessThanOrEqual(PDF_FIRST_PRESENTATION_LIMITS.maxBlocksPerScreen);
        expect(bullets.reduce((total,item)=>total+item.trim().length,0),`${slide.id} character density`)
          .toBeLessThanOrEqual(PDF_FIRST_PRESENTATION_LIMITS.maxCharsPerScreen);
      }
    }
  });

  it('shows explicit section progress on every generated coursebook presentation screen',()=>{
    for(const meta of PDF_FIRST_SECTION_ORDER){
      const slides=sourceSlides(meta.chapter,meta.id);
      slides.forEach((slide,index)=>{
        expect(slide.eyebrow).toContain('COURSEBOOK PRESENTATION');
        expect(slide.eyebrow).toContain(`${index+1}/${slides.length}`);
      });
    }
  });

  it('locks the fullscreen board to a 16:9 projector canvas with large readable typography',()=>{
    const css=readFileSync(resolve(process.cwd(),'src/teaching/lesson-studio-presentation.css'),'utf8');
    expect(css).toContain('aspect-ratio: 16 / 9');
    expect(css).toContain('overflow: hidden !important');
    expect(css).toContain('font-size: clamp(21px, 1.75vw, 29px) !important');
    expect(css).toContain('scroll-snap-type: x mandatory');
    expect(css).toContain('.lesson-teacher-evidence');
  });

  it('loads the presentation layer into the existing presenter stylesheet',()=>{
    const css=readFileSync(resolve(process.cwd(),'src/teaching/lesson-studio-presenter-fix.css'),'utf8');
    expect(css.startsWith("@import './lesson-studio-presentation.css';")).toBe(true);
  });
});