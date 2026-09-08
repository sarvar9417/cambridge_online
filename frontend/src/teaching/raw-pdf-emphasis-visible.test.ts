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

describe('raw supplied-PDF bold/emphasis visibility',()=>{
  it('pins a substantial typography-derived baseline independent of the source-atom registry',()=>{
    expect(RAW_PDF_EMPHASIS_BASELINE[1]).toHaveLength(42);
    expect(RAW_PDF_EMPHASIS_BASELINE[13]).toHaveLength(51);
    expect(RAW_PDF_EMPHASIS_BASELINE[7]).toHaveLength(77);
  });

  for(const chapterNumber of [1,13] as const){
    it(`shows every curated raw-PDF emphasis anchor on the exact Chapter ${chapterNumber} source-page lesson screen`,()=>{
      const chapter=lessonChapter(chapterNumber)!;
      for(const anchor of rawPdfEmphasisForChapter(chapterNumber)){
        const id=`h${chapterNumber}-coursebook-page-${String(anchor.page).padStart(2,'0')}`;
        const slide=chapter.slides.find((candidate)=>candidate.id===id) as LessonSlide|undefined;
        expect(slide,`Missing page screen ${id} for source p.${anchor.printedPage}`).toBeTruthy();
        expect(visible(slide!),`Chapter ${chapterNumber} source p.${anchor.printedPage} is missing bold/emphasised text: ${anchor.text}`)
          .toContain(normalize(anchor.text));
      }
      expect(chapter.coverage).toContain(`${rawPdfEmphasisForChapter(chapterNumber).length}/${rawPdfEmphasisForChapter(chapterNumber).length} raw-PDF emphasis anchors visible`);
    });
  }

  it('shows every curated Chapter 7 emphasis anchor on the exact printed-page lesson screen',()=>{
    for(const anchor of rawPdfEmphasisForChapter(7)){
      const id=`ch7-source-page-${anchor.printedPage}`;
      const slide=CHAPTER_7.slides.find((candidate)=>candidate.id===id) as LessonSlide|undefined;
      expect(slide,`Missing Chapter 7 source page ${anchor.printedPage}`).toBeTruthy();
      expect(visible(slide!),`Chapter 7 p.${anchor.printedPage} is missing bold/emphasised text: ${anchor.text}`)
        .toContain(normalize(anchor.text));
    }
  });
});
