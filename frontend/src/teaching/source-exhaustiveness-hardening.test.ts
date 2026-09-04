import { describe, expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import {
  CHAPTER_7_SOURCE_EXHAUSTIVE_SLIDES,
  CHAPTER_7_SOURCE_EXHAUSTIVENESS_GUARDS,
} from './chapter7-source-exhaustive';
import { CHAPTER_7_SOURCE_MAP } from './chapter7-book-coverage';
import { CHAPTER_7_SOURCE_PAGE_AUDIT } from './chapter7-source-page-audit';

const json = (value: unknown) => JSON.stringify(value).toLowerCase();

const chapterSlide = (chapterNumber: 1 | 13, slideId: string) => {
  const chapter = lessonChapter(chapterNumber);
  expect(chapter, `Missing chapter ${chapterNumber}`).toBeTruthy();
  const slide = chapter!.slides.find((item) => item.id === slideId);
  expect(slide, `Missing ${slideId}`).toBeTruthy();
  return slide!;
};

describe('source-exhaustiveness hardening for Hodder Chapters 1 and 13', () => {
  it('keeps the source-atom complete route and adds the previously omitted Chapter 1 source details', () => {
    const chapter = lessonChapter(1)!;
    expect(chapter.coverage).toContain('26/26 atom-audited pages');
    expect(chapter.coverage).toContain('source-exhaustiveness hardening applied');

    const signed = json(chapterSlide(1, 'h1-112-signed'));
    expect(signed).toContain('remainder of the chapter');
    expect(signed).toContain('sign-and-magnitude');

    const arithmetic = json(chapterSlide(1, 'h1-112-arithmetic'));
    expect(arithmetic).toContain('ninth bit');
    expect(arithmetic).toContain('warning sign for overflow');

    const memory = json(chapterSlide(1, 'h1-memory-units'));
    expect(memory).toContain('printed byte wording');
    expect(memory).toContain('byte is 8 bits');

    const ascii = json(chapterSlide(1, 'h1-115-ascii'));
    expect(ascii).toContain('1963');
    expect(ascii).toContain('1986');
    expect(ascii).toContain('128–255');

    const unicode = json(chapterSlide(1, 'h1-115-unicode'));
    expect(unicode).toContain('1991');
    expect(unicode).toContain('private-use');
    expect(unicode).toContain('not fully standardised');

    const bitmap = json(chapterSlide(1, 'h1-bitmap-resolution'));
    expect(bitmap).toContain('human perception');
    expect(bitmap).toContain('reduction in resolution');
  });

  it('adds the Chapter 13 formal source terms and the hashing/encryption source connection', () => {
    const chapter = lessonChapter(13)!;
    expect(chapter.coverage).toContain('24/24 atom-audited pages');
    expect(chapter.coverage).toContain('source-exhaustiveness hardening applied');

    const terms = json(chapterSlide(13, 'h13-file-terms'));
    expect(terms).toContain('file access');
    expect(terms).toContain('hashing algorithm (file access)');

    const hashing = json(chapterSlide(13, 'h13-hash-address'));
    expect(hashing).toContain('data encryption');

    const floating = json(chapterSlide(13, 'h13-float-format'));
    expect(floating).toContain('binary floating-point number');
    expect(floating).toContain('m × 2^e');

    const composite = json(chapterSlide(13, 'h13-sets-classes'));
    expect(composite).toContain('unordered collection');
    expect(composite).toContain('objects are instances');
  });
});

describe('source-exhaustiveness hardening for IGCSE Chapter 7', () => {
  it('preserves every mapped source activity, figure, table and end-of-chapter question after enrichment', () => {
    const ids = new Set(CHAPTER_7_SOURCE_EXHAUSTIVE_SLIDES.map((slide) => slide.id));
    const mapped = [
      ...Object.values(CHAPTER_7_SOURCE_MAP.activities),
      ...Object.values(CHAPTER_7_SOURCE_MAP.figures),
      ...Object.values(CHAPTER_7_SOURCE_MAP.tables),
      ...Object.values(CHAPTER_7_SOURCE_MAP.examQuestions),
      ...Object.values(CHAPTER_7_SOURCE_MAP.bookExtras),
    ];
    mapped.forEach((id) => expect(ids.has(id), `Missing mapped Chapter 7 source slide ${id}`).toBe(true));
  });

  it('traces every printed Chapter 7 source page from 258 through 298 to real presenter slides', () => {
    const expectedPages = Array.from({ length: 41 }, (_, index) => 258 + index);
    expect(CHAPTER_7_SOURCE_PAGE_AUDIT.map((item) => item.printedPage)).toEqual(expectedPages);
    const ids = new Set(CHAPTER_7_SOURCE_EXHAUSTIVE_SLIDES.map((slide) => slide.id));
    for (const page of CHAPTER_7_SOURCE_PAGE_AUDIT) {
      expect(page.targetSlideIds.length, `Page ${page.printedPage} has no source target`).toBeGreaterThan(0);
      page.targetSlideIds.forEach((id) => expect(ids.has(id), `Page ${page.printedPage} points to missing slide ${id}`).toBe(true));
    }
    expect(CHAPTER_7.coverage).toContain('41/41 source pages audited');
  });

  it('pins every previously missing prose/detail guard to a real source-exhaustive lesson slide', () => {
    for (const guard of CHAPTER_7_SOURCE_EXHAUSTIVENESS_GUARDS) {
      const slide = CHAPTER_7_SOURCE_EXHAUSTIVE_SLIDES.find((item) => item.id === guard.slideId);
      expect(slide, `Missing Chapter 7 guard slide ${guard.slideId}`).toBeTruthy();
      const text = json(slide);
      for (const required of guard.required) {
        expect(text, `${guard.slideId} is missing source detail: ${required}`).toContain(required.toLowerCase());
      }
    }
  });

  it('uses the source-exhaustive slides in the actual Chapter 7 presenter route', () => {
    expect(CHAPTER_7.coverage).toContain('source-exhaustive book deep dive');
    for (const guard of CHAPTER_7_SOURCE_EXHAUSTIVENESS_GUARDS) {
      const slide = CHAPTER_7.slides.find((item) => item.id === guard.slideId);
      expect(slide, `Presenter route is missing ${guard.slideId}`).toBeTruthy();
      const text = json(slide);
      guard.required.forEach((required) => expect(text).toContain(required.toLowerCase()));
    }
  });
});
