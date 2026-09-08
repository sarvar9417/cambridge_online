import { describe, expect, it } from 'vitest';
import { lessonChapter, type LessonSlide } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { RAW_PDF_EMPHASIS_BASELINE, rawPdfEmphasisForChapter } from './raw-pdf-emphasis-baseline';

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

const exactPageText=(slides:LessonSlide[],printedPage:number)=>normalize(
  slides
    .filter(slide=>slide.id.startsWith('pdf-first-')&&!slide.id.startsWith('pdf-first-lens-')&&slide.sourcePages?.includes(printedPage))
    .map(visible)
    .join(' '),
);

describe('raw supplied-PDF bold/emphasis visibility',()=>{
  it('pins a substantial typography-derived baseline independent of the source-atom registry',()=>{
    expect(RAW_PDF_EMPHASIS_BASELINE[1]).toHaveLength(42);
    expect(RAW_PDF_EMPHASIS_BASELINE[13]).toHaveLength(51);
    expect(RAW_PDF_EMPHASIS_BASELINE[7]).toHaveLength(77);
  });

  for(const chapterNumber of [1,13] as const){
    it(`shows every curated raw-PDF emphasis anchor inside the active Chapter ${chapterNumber} section-first lessons`,()=>{
      const chapter=lessonChapter(chapterNumber)!;
      for(const anchor of rawPdfEmphasisForChapter(chapterNumber)){
        const pageText=exactPageText(chapter.slides as LessonSlide[],anchor.printedPage);
        expect(pageText,`Chapter ${chapterNumber} source p.${anchor.printedPage} is missing bold/emphasised text: ${anchor.text}`)
          .toContain(normalize(anchor.text));
      }
    });
  }

  it('shows every curated Chapter 7 emphasis anchor inside the correct active section-first source lessons',()=>{
    for(const anchor of rawPdfEmphasisForChapter(7)){
      const pageText=exactPageText(CHAPTER_7.slides as LessonSlide[],anchor.printedPage);
      expect(pageText,`Chapter 7 p.${anchor.printedPage} is missing bold/emphasised text: ${anchor.text}`)
        .toContain(normalize(anchor.text));
    }
  });
});
