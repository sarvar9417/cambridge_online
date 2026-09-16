import { describe, expect, it } from 'vitest';
import { HODDER_9618_FULL_BOOK_CHAPTER_RANGES } from './hodder-9618-full-book-manifest';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import {
  CHAPTER_1_SOURCE_FILE_MANIFEST,
  CHAPTER_13_SOURCE_FILE_MANIFEST,
} from './source-file-fidelity-manifest';

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

describe('course-wide Hodder page coverage',()=>{
  it('represents every printed Hodder page in every active 9618 chapter',()=>{
    for(const chapter of LESSON_CHAPTERS){
      const range=rangeFor(chapter.number);
      const [printedStart,printedEnd]=range.printedPageRange;
      const expected=Array.from({length:printedEnd-printedStart+1},(_,index)=>printedStart+index);
      const covered=new Set<number>();
      const extractManifest=extractManifestFor(chapter.number);
      const extractPrintedPages=extractManifest
        ? new Set(extractManifest.pages.map(page=>page.printedPage))
        : null;

      for(const slide of chapter.slides){
        if(isExplicitNonHodderSource(slide.sourceLabel))continue;
        for(const page of slide.sourcePages??[]){
          if(extractManifest&&extractPrintedPages){
            if(extractPrintedPages.has(page)){
              covered.add(page);
              continue;
            }
            if(page>=1&&page<=extractManifest.pageCount){
              covered.add(printedStart+page-1);
            }
            continue;
          }
          if(page>=printedStart&&page<=printedEnd)covered.add(page);
        }
      }

      const missing=expected.filter(page=>!covered.has(page));
      expect(missing,`Chapter ${chapter.number} is missing Hodder printed pages: ${missing.join(', ')}`).toEqual([]);
    }
  });
});
