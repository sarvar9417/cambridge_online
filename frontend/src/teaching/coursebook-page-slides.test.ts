import { describe, expect, it } from 'vitest';
import { lessonChapter, type LessonSlide } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { sourceAtomsForChapter } from './lesson-source-atom-registry';
import { CHAPTER_7_ALL_SOURCE_ATOMS } from './chapter7-source-atom-complete';
import { CHAPTER_7_SOURCE_KEY_TERMS } from './chapter7-source-keyterms';
import {
  CHAPTER_7_COURSEBOOK_GLOSSARY_SLIDES,
  CHAPTER_7_COURSEBOOK_PAGE_SLIDES,
  coursebookGlossarySlides9618,
  coursebookPageSlides9618,
  formal9618Terms,
} from './coursebook-page-slides';

const normalize=(value:string)=>value
  .toLowerCase()
  .replace(/[’‘]/g,"'")
  .replace(/[–—]/g,'-')
  .replace(/\\"/g,'"')
  .replace(/\\\\/g,'\\')
  .replace(/\s+/g,' ')
  .trim();

const visible=(slide:LessonSlide)=>normalize(JSON.stringify({
  title:slide.title,
  lead:slide.lead,
  bullets:slide.bullets,
  keyTerms:slide.keyTerms,
  formula:slide.formula,
  example:slide.example,
  activity:slide.activity,
  richBlocks:slide.richBlocks,
}));

const activeHasLegacyAppendix=(slides:LessonSlide[])=>slides.some(slide=>
  slide.section==='Coursebook page-by-page'
  || slide.section==='Coursebook glossary'
  || slide.id.startsWith('ch7-source-page-')
  || /coursebook-page-|coursebook-glossary-/.test(slide.id),
);

describe('coursebook page/glossary source audit projection',()=>{
  for(const chapterNumber of [1,13] as const){
    it(`keeps a complete background page audit for supplied Chapter ${chapterNumber}`,()=>{
      const expected=chapterNumber===1?26:24;
      const pages=coursebookPageSlides9618(chapterNumber);
      expect(pages).toHaveLength(expected);
      expect(pages.map(slide=>slide.sourcePages?.[0])).toEqual(Array.from({length:expected},(_,index)=>index+1));
      for(const atom of sourceAtomsForChapter(chapterNumber)){
        const page=pages.find(slide=>slide.id===`h${chapterNumber}-coursebook-page-${String(atom.page).padStart(2,'0')}`);
        expect(page,`Missing background audit page for ${atom.id}`).toBeTruthy();
        const text=visible(page!);
        expect(text).toContain(normalize(atom.sourceRef));
        atom.needles.forEach(line=>expect(text).toContain(normalize(line)));
      }
    });

    it(`keeps the full Chapter ${chapterNumber} formal glossary as background audit data`,()=>{
      const expectedTerms=formal9618Terms(chapterNumber);
      expect(expectedTerms).toHaveLength(chapterNumber===1?31:18);
      const rendered=coursebookGlossarySlides9618(chapterNumber).flatMap(slide=>slide.keyTerms??[]);
      const byName=new Map(rendered.map(item=>[normalize(item.term),item]));
      expectedTerms.forEach(expected=>{
        const actual=byName.get(normalize(expected.term));
        expect(actual,`Missing glossary term ${expected.term}`).toBeTruthy();
        expect(normalize(actual!.definition)).toBe(normalize(expected.definition));
      });
    });

    it(`does not append Chapter ${chapterNumber} page/glossary audit screens to the active lesson route`,()=>{
      expect(activeHasLegacyAppendix(lessonChapter(chapterNumber)!.slides)).toBe(false);
    });
  }

  it('keeps all 41 Chapter 7 pages as a background source audit projection',()=>{
    expect(CHAPTER_7_COURSEBOOK_PAGE_SLIDES).toHaveLength(41);
    const byId=new Map(CHAPTER_7_COURSEBOOK_PAGE_SLIDES.map(slide=>[slide.id,slide]));
    for(const atom of CHAPTER_7_ALL_SOURCE_ATOMS){
      const page=byId.get(`ch7-source-page-${atom.printedPage}`);
      expect(page,`Missing Chapter 7 audit page ${atom.printedPage}`).toBeTruthy();
      const text=visible(page! as LessonSlide);
      expect(text).toContain(normalize(atom.sourceRef));
      atom.needles.forEach(line=>expect(text).toContain(normalize(line)));
    }
  });

  it('keeps the exact 30-term Chapter 7 glossary as background audit data',()=>{
    const rendered=CHAPTER_7_COURSEBOOK_GLOSSARY_SLIDES.flatMap(slide=>slide.keyTerms??[]);
    expect(rendered).toHaveLength(30);
    const byName=new Map(rendered.map(item=>[normalize(item.term),item]));
    CHAPTER_7_SOURCE_KEY_TERMS.forEach(expected=>{
      const actual=byName.get(normalize(expected.term));
      expect(actual,`Missing Chapter 7 glossary term ${expected.term}`).toBeTruthy();
      expect(normalize(actual!.definition)).toBe(normalize(expected.definition));
    });
  });

  it('does not append Chapter 7 page/glossary audit screens to the active presenter route',()=>{
    expect(activeHasLegacyAppendix(CHAPTER_7.slides as LessonSlide[])).toBe(false);
  });
});
