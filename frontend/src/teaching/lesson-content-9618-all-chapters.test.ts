import { describe, expect, it } from 'vitest';
import {
  HODDER_9618_FULL_BOOK_CHAPTER_RANGES,
  HODDER_9618_FULL_BOOK_SOURCE,
  hodder9618FullBookChapterRange,
} from './hodder-9618-full-book-manifest';
import { LESSON_CHAPTERS, lessonChapter } from './lesson-content-source-complete';

const ALL_9618 = Array.from({ length: 20 }, (_, index) => index + 1);
const GENERATED = [6,7,8,9,10,11,12,15,16,17,18,19,20] as const;

const EXPECTED_TITLES: Readonly<Record<number,string>> = {
  6:'Security, privacy and data integrity',
  7:'Ethics and ownership',
  8:'Databases',
  9:'Algorithm design and problem solving',
  10:'Data types and structures',
  11:'Programming',
  12:'Software development',
  15:'Hardware',
  16:'System software and virtual machines',
  17:'Security',
  18:'Artificial intelligence (AI)',
  19:'Computational thinking and problem solving',
  20:'Further programming',
};

describe('complete Cambridge 9618 Hodder lesson catalog',()=>{
  it('locks one continuous exact chapter range across printed pages 1–540',()=>{
    expect(HODDER_9618_FULL_BOOK_SOURCE.sourceFilePageCount).toBe(576);
    expect(HODDER_9618_FULL_BOOK_SOURCE.sourceFileSha256).toHaveLength(64);
    expect(HODDER_9618_FULL_BOOK_CHAPTER_RANGES.map(item=>item.chapter)).toEqual(ALL_9618);

    let expectedPrintedStart=1;
    for(const range of HODDER_9618_FULL_BOOK_CHAPTER_RANGES){
      expect(range.printedPageRange[0],`Chapter ${range.chapter} printed start`).toBe(expectedPrintedStart);
      expect(range.physicalPageRange[0]).toBe(range.printedPageRange[0]+16);
      expect(range.physicalPageRange[1]).toBe(range.printedPageRange[1]+16);
      expectedPrintedStart=range.printedPageRange[1]+1;
    }
    expect(expectedPrintedStart).toBe(541);
  });

  it('exposes every chapter exactly once',()=>{
    expect(LESSON_CHAPTERS.map(chapter=>chapter.number)).toEqual(ALL_9618);
    expect(new Set(LESSON_CHAPTERS.map(chapter=>chapter.number)).size).toBe(20);
    for(const chapterNo of ALL_9618)expect(lessonChapter(chapterNo)).not.toBeNull();
  });

  it('keeps every generated teaching point inside its exact full-book chapter range',()=>{
    for(const chapterNo of GENERATED){
      const chapter=lessonChapter(chapterNo)!;
      const range=hodder9618FullBookChapterRange(chapterNo)!;
      const [start,end]=range.printedPageRange;
      expect(chapter.title).toBe(EXPECTED_TITLES[chapterNo]);
      expect(chapter.sourceNote).toContain('exact connected 576-page Hodder 9618 Coursebook');
      expect(chapter.coverage).toContain(`${end-start+1}/${end-start+1} chapter pages`);
      expect(chapter.subtopics.length).toBeGreaterThan(0);

      const ids=new Set<string>();
      for(const slide of chapter.slides){
        expect(ids.has(slide.id),`Chapter ${chapterNo} duplicate slide ${slide.id}`).toBe(false);
        ids.add(slide.id);
        expect(slide.sourcePages?.length??0,`Chapter ${chapterNo} ${slide.id} provenance`).toBeGreaterThan(0);
        for(const page of slide.sourcePages??[]){
          expect(page,`Chapter ${chapterNo} ${slide.id} source page`).toBeGreaterThanOrEqual(start);
          expect(page,`Chapter ${chapterNo} ${slide.id} source page`).toBeLessThanOrEqual(end);
        }
      }
    }
  });

  it('does not reintroduce the legacy 0478 algorithms chapter as 9618 Chapter 7',()=>{
    const chapter=lessonChapter(7)!;
    expect(chapter.title).toBe('Ethics and ownership');
    expect(chapter.subtopics).toEqual([
      '7.1 Legal, moral, ethical and cultural issues',
      '7.2 Copyright issues',
      '7.3 Artificial intelligence (AI)',
    ]);
    expect(chapter.slides.every(slide=>!slide.id.startsWith('ch7-'))).toBe(true);
  });
});
