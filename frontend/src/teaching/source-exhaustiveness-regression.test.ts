import { describe, expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { CHAPTER_7_SOURCE_PAGE_AUDIT } from './chapter7-source-page-audit';
import { CHAPTER_7_SOURCE_EXHAUSTIVENESS_GUARDS } from './chapter7-source-exhaustive';

const text = (value: unknown) => JSON.stringify(value).replaceAll('\\"', '"');
const byId = <T extends { id: string }>(items: T[], id: string) => {
  const found = items.find((item) => item.id === id);
  expect(found, `Missing source-completeness target ${id}`).toBeTruthy();
  return found!;
};

describe('final PDF source exhaustiveness guards', () => {
  it('locks the remaining Chapter 1 Hodder details into the real lesson export', () => {
    const chapter = lessonChapter(1)!;
    const checks: Array<[string, string[]]> = [
      ['h1-111-number-systems', ['decimal-fraction representation', 'Chapter 13']],
      ['h1-112-signed', ['two’s complement', 'more straightforward']],
      ['h1-112-arithmetic', ['ninth bit', 'discarded']],
      ['h1-115-ascii', ['1963', '1986', '128–255']],
      ['h1-115-unicode', ['not fully standardised', 'up to four bytes', '16-bit or 32-bit']],
      ['h1-bitmap-resolution', ['eye can tolerate', 'resolution']],
      ['h1-bitmap-size', ['6.222 MB', '5.933 MiB']],
      ['h1-124-video', ['25 MB per second']],
      ['h1-131-mp3-jpeg', ['80 MB', '8 MB', '90%']],
      ['h1-rle-text', ['255', '32 original bytes', '15 encoded bytes', '53%']],
      ['h1-rle-images', ['192 uncompressed RGB values', '92 RLE values', '52%']],
    ];
    for (const [id, needles] of checks) {
      const slideText = text(byId(chapter.slides, id));
      for (const needle of needles) expect(slideText, `${id} missing ${needle}`).toContain(needle);
    }
    expect(chapter.coverage).toContain('final PDF-detail hardening applied');
  });

  it('locks the remaining Chapter 13 Hodder details into the real lesson export', () => {
    const chapter = lessonChapter(13)!;
    const checks: Array<[string, string[]]> = [
      ['h13-file-terms', ['File access', 'Hashing algorithm (file access)']],
      ['h13-hash-address', ['encryption', 'file-address calculation']],
      ['h13-sets-classes', ['Chapter 20', 'Class', 'Set']],
      ['h13-float-format', ['Binary floating-point number', '−128 to +127', '−16,384 to +16,383', 'M × 2^E']],
    ];
    for (const [id, needles] of checks) {
      const slideText = text(byId(chapter.slides, id));
      for (const needle of needles) expect(slideText, `${id} missing ${needle}`).toContain(needle);
    }
    expect(chapter.coverage).toContain('final PDF-detail hardening applied');
  });

  it('audits every printed Chapter 7 page 258–298 and points only to real final lesson slides', () => {
    expect(CHAPTER_7_SOURCE_PAGE_AUDIT).toHaveLength(41);
    expect(CHAPTER_7_SOURCE_PAGE_AUDIT.map((item) => item.printedPage)).toEqual(
      Array.from({ length: 41 }, (_, index) => 258 + index),
    );
    const ids = new Set(CHAPTER_7.slides.map((slide) => slide.id));
    for (const page of CHAPTER_7_SOURCE_PAGE_AUDIT) {
      expect(page.targetSlideIds.length, `Page ${page.printedPage} has no mapped lesson content`).toBeGreaterThan(0);
      page.targetSlideIds.forEach((id) => expect(ids.has(id), `Page ${page.printedPage} points to missing ${id}`).toBe(true));
    }
    expect(CHAPTER_7.coverage).toContain('41/41 source pages audited');
  });

  it('keeps every previously identified Chapter 7 omission fixed', () => {
    for (const guard of CHAPTER_7_SOURCE_EXHAUSTIVENESS_GUARDS) {
      const slideText = text(byId(CHAPTER_7.slides, guard.slideId));
      for (const needle of guard.required) {
        expect(slideText, `${guard.slideId} regressed: missing ${needle}`).toContain(needle);
      }
    }
  });

  it('preserves exact Chapter 7 source mechanics that were previously only summarised', () => {
    const checks: Array<[string, string[]]> = [
      ['ch7-book-74-bubble-code', ['Temperature[Index] > Temperature[Index + 1]', 'Temp ← Temperature[Index]', 'UNTIL (NOT Swap) OR Last = 1']],
      ['ch7-book-75-range', ['Please enter the student\'s mark', 'StudentMark < 0 OR StudentMark > 100', 'UNTIL StudentMark >= 0 AND StudentMark <= 100']],
      ['ch7-book-75-length', ['8-character password', '2 to 30 inclusive', 'LENGTH']],
      ['ch7-book-75-type-presence', ['EmailAddress = ""', '*=Required', 'EmailAddress <> ""']],
      ['ch7-book-75-format-checkdigit', ['CUB9999', '5327', '5037', '53107', 'thirteen', 'thirty']],
      ['ch7-book-77-trace-worked', ['Initial: A=0, B=0, C=100', 'OUTPUT: 15 then 2']],
      ['ch7-book-77-same-pseudo', ['Enter your ten values', 'without quotation marks', 'without reproducing the comma']],
      ['ch7-book-78-activity71314', ['maximum 900', 'minimum 100', '110 was the smallest input']],
      ['ch7-book-79-example1', ['NumberOfTickets > 0 AND NumberOfTickets < 26', 'Discount ← 0.1', 'PRINT "Your tickets cost "']],
      ['ch7-book-79-example2', ['OverallHighest ← 0', 'FOR StudentNumber ← 1 TO 600', 'UNTIL Mark < 101 AND Mark > -1', 'OverallAverage ← OverallTotal / 2400']],
      ['ch7-book-ext-operations', ['pop removes 79', 'push then adds 31', 'dequeue removes 27', 'enqueue then adds 31']],
    ];
    for (const [id, needles] of checks) {
      const slideText = text(byId(CHAPTER_7.slides, id));
      for (const needle of needles) expect(slideText, `${id} missing ${needle}`).toContain(needle);
    }
  });
});
