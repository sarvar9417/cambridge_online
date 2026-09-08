import { describe, expect, it } from 'vitest';
import { lessonChapter, type LessonSlide } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { sourceAtomsForChapter } from './lesson-source-atom-registry';
import { CHAPTER_7_ALL_SOURCE_ATOMS } from './chapter7-source-atom-complete';
import { CHAPTER_7_SOURCE_KEY_TERMS } from './chapter7-source-keyterms';
import {
  CHAPTER_7_COURSEBOOK_GLOSSARY_SLIDES,
  CHAPTER_7_COURSEBOOK_PAGE_SLIDES,
  formal9618Terms,
} from './coursebook-page-slides';

const normalize=(value:string)=>value
  .toLowerCase()
  .replace(/[’‘]/g,"'")
  .replace(/[–—]/g,'-')
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

describe('coursebook page-by-page learner-visible source route',()=>{
  for(const chapterNumber of [1,13] as const){
    it(`adds one explicit source screen for every supplied Chapter ${chapterNumber} PDF page`,()=>{
      const chapter=lessonChapter(chapterNumber)!;
      const expected=chapterNumber===1?26:24;
      const pages=chapter.slides.filter((slide)=>slide.section==='Coursebook page-by-page');
      expect(pages).toHaveLength(expected);
      expect(pages.map((slide)=>slide.sourcePages?.[0])).toEqual(Array.from({length:expected},(_,index)=>index+1));
    });

    it(`repeats every inventoried Chapter ${chapterNumber} teaching atom on its page screen`,()=>{
      const chapter=lessonChapter(chapterNumber)!;
      for(const atom of sourceAtomsForChapter(chapterNumber)){
        const id=`h${chapterNumber}-coursebook-page-${String(atom.page).padStart(2,'0')}`;
        const slide=chapter.slides.find((candidate)=>candidate.id===id) as LessonSlide|undefined;
        expect(slide,`Missing explicit page screen for ${atom.id}`).toBeTruthy();
        const text=visible(slide!);
        expect(text,`${atom.id} page screen is missing source label ${atom.sourceRef}`).toContain(normalize(atom.sourceRef));
        for(const line of atom.needles){
          expect(text,`${atom.id} page screen is missing: ${line}`).toContain(normalize(line));
        }
      }
    });

    it(`collects the complete Chapter ${chapterNumber} formal glossary in visible glossary screens`,()=>{
      const chapter=lessonChapter(chapterNumber)!;
      const expectedTerms=formal9618Terms(chapterNumber);
      expect(expectedTerms).toHaveLength(chapterNumber===1?31:18);
      const glossary=chapter.slides.filter((slide)=>slide.section==='Coursebook glossary');
      const rendered=glossary.flatMap((slide)=>slide.keyTerms??[]);
      const byName=new Map(rendered.map((item)=>[normalize(item.term),item]));
      for(const expected of expectedTerms){
        const actual=byName.get(normalize(expected.term));
        expect(actual,`Missing glossary term ${expected.term}`).toBeTruthy();
        expect(normalize(actual!.definition)).toBe(normalize(expected.definition));
      }
    });
  }

  it('adds all 41 Chapter 7 coursebook pages as explicit learner-visible screens',()=>{
    expect(CHAPTER_7_COURSEBOOK_PAGE_SLIDES).toHaveLength(41);
    const pages=CHAPTER_7.slides.filter((slide)=>slide.section==='Coursebook page-by-page');
    expect(pages).toHaveLength(41);
    expect(pages.map((slide)=>Number(slide.id.replace('ch7-source-page-','')))).toEqual(Array.from({length:41},(_,index)=>258+index));
  });

  it('repeats every Chapter 7 source atom on its exact printed-page screen',()=>{
    const byId=new Map(CHAPTER_7_COURSEBOOK_PAGE_SLIDES.map((slide)=>[slide.id,slide]));
    for(const atom of CHAPTER_7_ALL_SOURCE_ATOMS){
      const slide=byId.get(`ch7-source-page-${atom.printedPage}`);
      expect(slide,`Missing Chapter 7 page ${atom.printedPage}`).toBeTruthy();
      const text=visible(slide!);
      expect(text).toContain(normalize(atom.sourceRef));
      for(const line of atom.needles){
        expect(text,`${atom.id} is missing from page ${atom.printedPage}: ${line}`).toContain(normalize(line));
      }
    }
  });

  it('adds the exact 30-term Chapter 7 glossary as dedicated visible screens',()=>{
    const rendered=CHAPTER_7_COURSEBOOK_GLOSSARY_SLIDES.flatMap((slide)=>slide.keyTerms??[]);
    expect(rendered).toHaveLength(30);
    const byName=new Map(rendered.map((item)=>[normalize(item.term),item]));
    for(const expected of CHAPTER_7_SOURCE_KEY_TERMS){
      const actual=byName.get(normalize(expected.term));
      expect(actual,`Missing Chapter 7 glossary term ${expected.term}`).toBeTruthy();
      expect(normalize(actual!.definition)).toBe(normalize(expected.definition));
    }
  });
});
