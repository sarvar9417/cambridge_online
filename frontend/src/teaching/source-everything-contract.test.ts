import { describe, expect, it } from 'vitest';
import { IGCSE_COURSE_SUPPORT, IGCSE_COURSE_SUPPORT_PAGES } from './igcse-course-support';
import {
  SOURCE_EVERYTHING_AUDITS,
  SOURCE_EVERYTHING_FILES,
  SOURCE_EVERYTHING_TOTALS,
  sourceEverythingFile,
} from './source-everything-contract';

const expected = {
  '9618-ch1-upload': {
    pages: 26,
    sha256: '2386025cb684bbbdc5a2a3a1b416b2497cb1d7139ac52830f6bee8e46511d386',
  },
  '9618-ch13-upload': {
    pages: 24,
    sha256: 'a6e0bb1bfeedcf27791742aeb7e7c551e1620bde4d9f52b247279459a73adbb9',
  },
  '0478-full-book-upload': {
    pages: 404,
    sha256: '3dfc7b18c64b5a70d0733c759b8ceae19f0634a2063d1b4f332dafeedf8808f8',
  },
} as const;

describe('uploaded-source everything contract', () => {
  it('locks the contract to the exact three current teacher uploads', () => {
    expect(SOURCE_EVERYTHING_FILES).toHaveLength(3);
    for (const file of SOURCE_EVERYTHING_FILES) {
      expect(file.pageCount).toBe(expected[file.id].pages);
      expect(file.sha256).toBe(expected[file.id].sha256);
      expect(file.featureFamilies.length).toBeGreaterThan(0);
    }
    expect(SOURCE_EVERYTHING_TOTALS.files).toBe(3);
    expect(SOURCE_EVERYTHING_TOTALS.pages).toBe(454);
  });

  it('accounts for every PDF page exactly once instead of silently dropping pages', () => {
    for (const file of SOURCE_EVERYTHING_FILES) {
      const audit = SOURCE_EVERYTHING_AUDITS[file.id];
      expect(audit.pagesAccounted, file.id).toBe(file.pageCount);
      expect(audit.pageAccountingComplete, file.id).toBe(true);
    }
  });

  it('requires an explicit reason whenever source pages are intentionally excluded from teaching', () => {
    const excluded = SOURCE_EVERYTHING_FILES.flatMap((file) =>
      file.ranges.filter((item) => item.disposition === 'excluded').map((item) => ({ file: file.id, item })),
    );
    expect(excluded.length).toBeGreaterThan(0);
    excluded.forEach(({ file, item }) => {
      expect(item.reason?.trim(), `${file} PDF pp.${item.pdfPageFrom}-${item.pdfPageTo}`).toBeTruthy();
    });
  });

  it('preserves all teaching-relevant IGCSE front-matter feature families as shared lesson support', () => {
    expect(IGCSE_COURSE_SUPPORT_PAGES).toEqual([7, 8, 9, 10, 11, 12]);
    const kinds = new Set<string>(IGCSE_COURSE_SUPPORT.map((item) => item.kind));
    [
      'aims', 'assessment', 'book_feature', 'find_out_more', 'advice', 'link', 'extension',
      'summary', 'key_terms', 'exam_style', 'pseudocode_languages', 'command_words',
    ].forEach((kind) => expect(kinds.has(kind), kind).toBe(true));
  });

  it('keeps the two supplied 9618 chapter extracts fully delivered through the existing formal book audits', () => {
    const ch1 = SOURCE_EVERYTHING_AUDITS['9618-ch1-upload'];
    const ch13 = SOURCE_EVERYTHING_AUDITS['9618-ch13-upload'];
    expect(ch1.complete, ch1.missingDestinations.join(' | ')).toBe(true);
    expect(ch13.complete, ch13.missingDestinations.join(' | ')).toBe(true);
    expect(ch1.deliveredPages).toBe(26);
    expect(ch13.deliveredPages).toBe(24);
  });

  it('fails closed for the full 0478 book until Chapters 1-6 and 8-10 are genuinely lesson-backed', () => {
    const audit = SOURCE_EVERYTHING_AUDITS['0478-full-book-upload'];
    expect(audit.pagesExpected).toBe(404);
    expect(audit.pageAccountingComplete).toBe(true);
    expect(audit.requiredDeliveryPages).toBe(390);
    expect(audit.deliveredPages).toBe(47);
    expect(audit.complete).toBe(false);
    expect(audit.missingDestinations).toHaveLength(9);
    expect(audit.missingDestinations.join(' | ')).toContain('0478 Chapter 1 - Data representation');
    expect(audit.missingDestinations.join(' | ')).toContain('0478 Chapter 10 - Boolean logic');
    expect(audit.missingDestinations.join(' | ')).not.toContain('0478 Chapter 7 - Algorithm design and problem solving');
  });

  it('accounts the exact full-book chapter and support ranges without a hidden gap', () => {
    const book = sourceEverythingFile('0478-full-book-upload');
    expect(book.ranges[0]?.pdfPageFrom).toBe(1);
    expect(book.ranges.at(-1)?.pdfPageTo).toBe(404);
    expect(book.ranges.find((item) => item.destinationKey === 'lesson:0478-ch7')).toMatchObject({
      pdfPageFrom: 270,
      pdfPageTo: 310,
      printedPageFrom: 258,
      printedPageTo: 298,
    });
  });
});
