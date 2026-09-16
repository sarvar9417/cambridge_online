import { describe, expect, it } from 'vitest';
import { buildTopicPlan } from './lesson-topic-plan';
import { HODDER_9618_FULL_BOOK_CHAPTER_RANGES } from './hodder-9618-full-book-manifest';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import {
  CHAPTER_1_SOURCE_FILE_MANIFEST,
  CHAPTER_13_SOURCE_FILE_MANIFEST,
} from './source-file-fidelity-manifest';
import {
  lessonCatalogChapter,
  presentationBeatsForCatalogTopic,
} from './lesson-course-catalog';

const rangeFor=(chapter:number)=>HODDER_9618_FULL_BOOK_CHAPTER_RANGES.find(item=>item.chapter===chapter)!;
const extractManifestFor=(chapter:number)=>chapter===1
  ? CHAPTER_1_SOURCE_FILE_MANIFEST
  : chapter===13
    ? CHAPTER_13_SOURCE_FILE_MANIFEST
    : null;
const isExplicitNonHodderSource=(sourceLabel:string|undefined)=>{
  const label=(sourceLabel??'').toLowerCase();
  return label.includes('cambridge')&&!label.includes('hodder');
};

describe('course-wide lesson static integrity',()=>{
  it('keeps every active 9618 slide id globally unique and every chapter structurally usable',()=>{
    const seen=new Map<string,number>();

    for(const chapter of LESSON_CHAPTERS){
      expect(chapter.title.trim().length,`Chapter ${chapter.number} title`).toBeGreaterThan(0);
      expect(chapter.subtopics.length,`Chapter ${chapter.number} subtopics`).toBeGreaterThan(0);
      expect(chapter.slides.length,`Chapter ${chapter.number} slides`).toBeGreaterThan(0);

      for(const slide of chapter.slides){
        expect(slide.id.trim().length,`Chapter ${chapter.number} slide id`).toBeGreaterThan(0);
        expect(slide.title.trim().length,slide.id).toBeGreaterThan(0);
        expect(seen.has(slide.id),`${slide.id} already belongs to Chapter ${seen.get(slide.id)}`).toBe(false);
        seen.set(slide.id,chapter.number);
      }
    }
  });

  it('keeps declared source pages valid and Hodder provenance inside the exact chapter boundary',()=>{
    for(const chapter of LESSON_CHAPTERS){
      const range=rangeFor(chapter.number);
      const extractManifest=extractManifestFor(chapter.number);
      const chapterPages=new Set<number>();
      const printedPages=extractManifest
        ? new Set(extractManifest.pages.map(page=>page.printedPage))
        : null;

      if(extractManifest){
        const [printedStart,printedEnd]=range.printedPageRange;
        expect(extractManifest.pageCount,`Chapter ${chapter.number} extract page count`).toBe(printedEnd-printedStart+1);
        expect(extractManifest.pages[0]?.printedPage,`Chapter ${chapter.number} extract printed start`).toBe(printedStart);
        expect(extractManifest.pages.at(-1)?.printedPage,`Chapter ${chapter.number} extract printed end`).toBe(printedEnd);
      }

      for(const slide of chapter.slides){
        for(const page of slide.sourcePages??[]){
          chapterPages.add(page);
          expect(Number.isInteger(page),`${slide.id} source page must be an integer`).toBe(true);
          expect(page,`${slide.id} source page must be positive`).toBeGreaterThan(0);

          // Some enrichment slides intentionally cite a different authoritative
          // source (for example the current Cambridge Pseudocode Guide). Those
          // page numbers belong to that named document, not to the Hodder chapter.
          if(isExplicitNonHodderSource(slide.sourceLabel))continue;

          if(extractManifest&&printedPages){
            // PDF-first source-fidelity chapters can contain both the legacy
            // chapter-extract page number (1..N) and exact transcript slides
            // labelled with the corresponding printed coursebook page. Both
            // forms resolve inside the same byte-locked extract manifest.
            const isLocalExtractPage=page>=1&&page<=extractManifest.pageCount;
            const isMappedPrintedPage=printedPages.has(page);
            expect(isLocalExtractPage||isMappedPrintedPage,`${slide.id} Hodder source page ${page} is not represented by the Chapter ${chapter.number} extract`).toBe(true);
          }else{
            const [start,end]=range.printedPageRange;
            expect(page,`${slide.id} lower printed bound`).toBeGreaterThanOrEqual(start);
            expect(page,`${slide.id} upper printed bound`).toBeLessThanOrEqual(end);
          }
        }
      }

      expect(chapterPages.size,`Chapter ${chapter.number} source provenance`).toBeGreaterThan(0);
    }
  });

  it('builds each 9618 chapter presentation only from that chapter and without duplicate beats',()=>{
    for(const chapter of LESSON_CHAPTERS){
      const catalogChapter=lessonCatalogChapter('9618',chapter.number);
      expect(catalogChapter).toBe(chapter);

      const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
      const overview=topics.find(topic=>topic.code==='overview');
      expect(overview,`Chapter ${chapter.number} overview topic`).toBeTruthy();

      const beats=presentationBeatsForCatalogTopic(chapter,overview!);
      const ownSlideIds=new Set(chapter.slides.map(slide=>slide.id));
      const beatIds=new Set<string>();

      expect(beats.length,`Chapter ${chapter.number} presentation beats`).toBeGreaterThan(0);
      for(const beat of beats){
        expect(ownSlideIds.has(beat.slideId),`Chapter ${chapter.number} leaked beat ${beat.id} -> ${beat.slideId}`).toBe(true);
        expect(beatIds.has(beat.id),`Chapter ${chapter.number} duplicate beat ${beat.id}`).toBe(false);
        beatIds.add(beat.id);
      }
    }
  },60000);

  it('keeps the overlapping Chapter 7 presentations syllabus-isolated',()=>{
    const chapter9618=lessonCatalogChapter('9618',7)!;
    const chapter0478=lessonCatalogChapter('0478',7)!;
    const ids9618=new Set(chapter9618.slides.map(slide=>slide.id));
    const ids0478=new Set(chapter0478.slides.map(slide=>slide.id));

    expect([...ids9618].some(id=>ids0478.has(id))).toBe(false);
    expect([...ids9618].every(id=>!id.startsWith('ch7-'))).toBe(true);
    expect([...ids0478].some(id=>id.startsWith('ch7-'))).toBe(true);
  });
});
