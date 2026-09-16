import { describe, expect, it } from 'vitest';
import {
  HODDER_9618_FULL_BOOK_CHAPTER_RANGES,
  HODDER_9618_FULL_BOOK_SOURCE,
} from './hodder-9618-full-book-manifest';
import { LESSON_CHAPTERS, lessonChapter } from './lesson-content-source-complete';

const ALL_9618 = Array.from({ length: 20 }, (_, index) => index + 1);

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

  it('does not reintroduce the legacy 0478 algorithms chapter as 9618 Chapter 7',()=>{
    const chapter=lessonChapter(7)!;
    expect(chapter.title).toBe('Ethics and ownership');
    expect(chapter.subtopics).toEqual([
      '7.1 Legal, moral, ethical and cultural implications',
      '7.2 Copyright issues',
      '7.3 Artificial intelligence (AI)',
    ]);
    expect(chapter.slides.every(slide=>!slide.id.startsWith('ch7-'))).toBe(true);
  });
});
