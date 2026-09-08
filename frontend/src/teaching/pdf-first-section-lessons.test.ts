import { describe, expect, it } from 'vitest';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import {
  PDF_FIRST_SECTION_ORDER,
  pdfFirstBlocksForSection,
  pdfFirstSectionsForChapter,
} from './pdf-first-source-index';
import type { HodderLessonSlide } from './lesson-content-hodder-types';
import type { PdfFirstChapter } from './pdf-first-source-types';

const activeChapter = (chapter:PdfFirstChapter) => chapter===7
  ? CHAPTER_7
  : LESSON_CHAPTERS.find(item=>item.number===chapter)!;

const sectionSlides = (chapter:PdfFirstChapter, id:string) =>
  activeChapter(chapter).slides.filter(slide=>slide.subtopicCode===id) as HodderLessonSlide[];

const exactSourceSlides = (chapter:PdfFirstChapter, id:string) =>
  sectionSlides(chapter,id).filter(slide=>slide.id.startsWith(`pdf-first-${id.replace('.','')}-`));

const visibleExactText = (chapter:PdfFirstChapter, id:string) =>
  exactSourceSlides(chapter,id).flatMap(slide=>slide.bullets??[]).join(' ');
const expectedExactText = (id:string) => pdfFirstBlocksForSection(id as never).join(' ');
const normalise = (value:string) => value.replace(/\s+/g,' ').trim();

describe('PDF-first section lesson contract',()=>{
  it('puts every exact supplied-PDF sentence visibly in its own source section and preserves source order',()=>{
    for(const meta of PDF_FIRST_SECTION_ORDER){
      expect(normalise(visibleExactText(meta.chapter,meta.id)),`${meta.id} exact visible source sequence`)
        .toBe(normalise(pdfFirstBlocksForSection(meta.id).join(' ')));
    }
  });

  it('keeps source sections chapter-correct and leaves no exact source text unrouted',()=>{
    for(const chapter of [1,7,13] as const){
      const expected=pdfFirstSectionsForChapter(chapter).map(meta=>expectedExactText(meta.id)).join(' ');
      const actual=pdfFirstSectionsForChapter(chapter).map(meta=>visibleExactText(chapter,meta.id)).join(' ');
      expect(normalise(actual),`Chapter ${chapter} exact source route`).toBe(normalise(expected));
      expect(actual.length).toBeGreaterThan(0);
    }
  });

  it('enforces source → Exam Lens → live Past Papers at the end of every section',()=>{
    for(const meta of PDF_FIRST_SECTION_ORDER){
      const slides=sectionSlides(meta.chapter,meta.id);
      const sourceIndexes=slides
        .map((slide,index)=>slide.id.startsWith(`pdf-first-${meta.id.replace('.','')}-`)?index:-1)
        .filter(index=>index>=0);
      const lensIndex=slides.findIndex(slide=>slide.id===`pdf-first-lens-${meta.id.replace('.','')}`);
      const checkpointIndexes=slides
        .map((slide,index)=>slide.examPractice?index:-1)
        .filter(index=>index>=0);

      expect(sourceIndexes.length,`${meta.id} source screens`).toBeGreaterThan(0);
      expect(lensIndex,`${meta.id} Exam Lens`).toBeGreaterThan(Math.max(...sourceIndexes));
      expect(checkpointIndexes.length,`${meta.id} Past Paper checkpoints`).toBeGreaterThan(0);
      expect(Math.min(...checkpointIndexes),`${meta.id} first Past Paper after Exam Lens`).toBeGreaterThan(lensIndex);
      expect(Math.max(...checkpointIndexes),`${meta.id} section ends with Past Papers`).toBe(slides.length-1);
    }
  });

  it('removes glossary and page-by-page audit appendices from every active learner/teacher lesson route',()=>{
    for(const chapter of [LESSON_CHAPTERS[0],CHAPTER_7,LESSON_CHAPTERS[1]]){
      const activeText=JSON.stringify({subtopics:chapter.subtopics,slides:chapter.slides.map(slide=>({id:slide.id,section:slide.section}))}).toLowerCase();
      expect(activeText).not.toContain('coursebook glossary');
      expect(activeText).not.toContain('coursebook page-by-page');
      expect(activeText).not.toContain('coursebook reference library');
      expect(chapter.slides.some(slide=>slide.id.includes('coursebook-page-')||slide.id.startsWith('ch7-source-page-'))).toBe(false);
    }
  });

  it('has one explicit Exam Lens per supplied section',()=>{
    for(const meta of PDF_FIRST_SECTION_ORDER){
      const matches=sectionSlides(meta.chapter,meta.id).filter(slide=>slide.id===`pdf-first-lens-${meta.id.replace('.','')}`);
      expect(matches,`${meta.id} Exam Lens count`).toHaveLength(1);
      expect(matches[0]?.eyebrow).toContain('CAMBRIDGE EXAM LENS');
      expect(matches[0]?.bullets?.length??0).toBeGreaterThanOrEqual(3);
    }
  });
});