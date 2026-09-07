import { BOOK_COMPLETENESS_AUDITS } from './book-completeness-audit';
import { IGCSE_COURSE_SUPPORT, IGCSE_COURSE_SUPPORT_PAGES } from './igcse-course-support';

export type SourceRangeDisposition = 'lesson' | 'shared_support' | 'navigation' | 'reference' | 'excluded';

export type SourceEverythingRange = {
  pdfPageFrom: number;
  pdfPageTo: number;
  printedPageFrom?: number;
  printedPageTo?: number;
  disposition: SourceRangeDisposition;
  destinationKey?: string;
  label: string;
  reason?: string;
};

export type SourceEverythingFile = {
  id: '9618-ch1-upload' | '9618-ch13-upload' | '0478-full-book-upload';
  sourceFile: string;
  sha256: string;
  pageCount: number;
  featureFamilies: readonly string[];
  ranges: readonly SourceEverythingRange[];
};

export type SourceEverythingAudit = {
  id: SourceEverythingFile['id'];
  pagesExpected: number;
  pagesAccounted: number;
  pageAccountingComplete: boolean;
  requiredDeliveryPages: number;
  deliveredPages: number;
  missingDestinations: string[];
  complete: boolean;
};

const range = (
  pdfPageFrom: number,
  pdfPageTo: number,
  disposition: SourceRangeDisposition,
  label: string,
  destinationKey?: string,
  printedPageFrom?: number,
  printedPageTo?: number,
  reason?: string,
): SourceEverythingRange => ({
  pdfPageFrom,
  pdfPageTo,
  disposition,
  label,
  ...(destinationKey ? { destinationKey } : {}),
  ...(printedPageFrom !== undefined ? { printedPageFrom } : {}),
  ...(printedPageTo !== undefined ? { printedPageTo } : {}),
  ...(reason ? { reason } : {}),
});

/**
 * Exact current uploads supplied by the teacher on 2026-09-07.
 *
 * The contract is intentionally file-level, not merely chapter-level. Every PDF
 * page must be classified exactly once. Teaching pages additionally require a
 * real delivery destination before the file can claim `complete`.
 *
 * `excluded` is reserved for clearly non-instructional publishing/marketing
 * matter and always carries a reason. It must never be used to hide missing
 * teaching content.
 */
export const SOURCE_EVERYTHING_FILES: readonly SourceEverythingFile[] = [
  {
    id: '9618-ch1-upload',
    sourceFile: '9618 Coursebook Book (Hodder Education)-17-42(1).pdf',
    sha256: '2386025cb684bbbdc5a2a3a1b416b2497cb1d7139ac52830f6bee8e46511d386',
    pageCount: 26,
    featureFamilies: [
      'chapter_objectives', 'prior_knowledge', 'key_terms', 'concepts', 'worked_examples',
      'activities', 'extension_activities', 'figures', 'tables', 'calculations',
      'chapter_review', 'past_paper_enrichment',
    ],
    ranges: [
      range(1, 26, 'lesson', '9618 Chapter 1 - Information representation and multimedia', 'lesson:9618-ch1', 1, 26),
    ],
  },
  {
    id: '9618-ch13-upload',
    sourceFile: '9618 Coursebook Book (Hodder Education)-320-343(1).pdf',
    sha256: 'a6e0bb1bfeedcf27791742aeb7e7c551e1620bde4d9f52b247279459a73adbb9',
    pageCount: 24,
    featureFamilies: [
      'chapter_objectives', 'prior_knowledge', 'key_terms', 'concepts', 'worked_examples',
      'activities', 'extension_activities', 'figures', 'tables', 'pseudocode',
      'chapter_review', 'past_paper_enrichment',
    ],
    ranges: [
      range(1, 24, 'lesson', '9618 Chapter 13 - Data representation', 'lesson:9618-ch13', 304, 327),
    ],
  },
  {
    id: '0478-full-book-upload',
    sourceFile: 'Cambridge_IGCSE_and_O_Level_Computer_Science_by_David_Watson_Helen.pdf',
    sha256: '3dfc7b18c64b5a70d0733c759b8ceae19f0634a2063d1b4f332dafeedf8808f8',
    pageCount: 404,
    featureFamilies: [
      'course_aims', 'assessment', 'learning_outline', 'chapter_introduction', 'activities',
      'worked_examples', 'find_out_more', 'advice', 'links', 'extension', 'summary',
      'key_terms', 'exam_style_questions', 'pseudocode', 'programming_languages', 'command_words',
      'figures', 'tables', 'chapter_content',
    ],
    ranges: [
      range(1, 1, 'reference', 'Front cover'),
      range(2, 2, 'excluded', 'Series marketing page', undefined, undefined, undefined, 'Publisher product catalogue; no lesson content.'),
      range(3, 3, 'reference', 'Title page'),
      range(4, 4, 'excluded', 'Copyright and acknowledgements', undefined, undefined, undefined, 'Legal/publishing metadata; no lesson content.'),
      range(5, 6, 'navigation', 'Contents'),
      range(7, 12, 'shared_support', 'Course aims, assessment, book features, exam/pseudocode guidance and command words', 'shared:0478-course-guide'),
      range(13, 13, 'navigation', 'Section 1 divider'),
      range(14, 56, 'lesson', '0478 Chapter 1 - Data representation', 'lesson:0478-ch1', 2, 44),
      range(57, 86, 'lesson', '0478 Chapter 2 - Data transmission', 'lesson:0478-ch2', 45, 74),
      range(87, 158, 'lesson', '0478 Chapter 3 - Hardware', 'lesson:0478-ch3', 75, 146),
      range(159, 191, 'lesson', '0478 Chapter 4 - Software', 'lesson:0478-ch4', 147, 179),
      range(192, 228, 'lesson', '0478 Chapter 5 - The internet and its uses', 'lesson:0478-ch5', 180, 216),
      range(229, 268, 'lesson', '0478 Chapter 6 - Automated and emerging technologies', 'lesson:0478-ch6', 217, 256),
      range(269, 269, 'navigation', 'Section 2 divider', undefined, 257, 257),
      range(270, 310, 'lesson', '0478 Chapter 7 - Algorithm design and problem solving', 'lesson:0478-ch7', 258, 298),
      range(311, 350, 'lesson', '0478 Chapter 8 - Programming', 'lesson:0478-ch8', 299, 338),
      range(351, 367, 'lesson', '0478 Chapter 9 - Databases', 'lesson:0478-ch9', 339, 355),
      range(368, 398, 'lesson', '0478 Chapter 10 - Boolean logic', 'lesson:0478-ch10', 356, 386),
      range(399, 402, 'reference', 'Index', undefined, 387, 390),
      range(403, 404, 'excluded', 'Publisher back-matter marketing', undefined, undefined, undefined, 'Workbook/publisher promotion; no lesson content.'),
    ],
  },
] as const;

export const sourceEverythingFile = (id: SourceEverythingFile['id']) =>
  SOURCE_EVERYTHING_FILES.find((item) => item.id === id)!;

const pagesInRange = (item: SourceEverythingRange) => item.pdfPageTo - item.pdfPageFrom + 1;

function destinationCovered(destinationKey: string) {
  switch (destinationKey) {
    case 'lesson:9618-ch1': return BOOK_COMPLETENESS_AUDITS[1].complete;
    case 'lesson:9618-ch13': return BOOK_COMPLETENESS_AUDITS[13].complete;
    case 'lesson:0478-ch7': return BOOK_COMPLETENESS_AUDITS[7].complete;
    case 'shared:0478-course-guide':
      return IGCSE_COURSE_SUPPORT_PAGES.length === 6
        && IGCSE_COURSE_SUPPORT_PAGES.every((page) => page >= 7 && page <= 12)
        && IGCSE_COURSE_SUPPORT.length >= 15;
    default: return false;
  }
}

function auditSourceFile(file: SourceEverythingFile): SourceEverythingAudit {
  const seen = new Map<number, number>();
  for (const item of file.ranges) {
    for (let page = item.pdfPageFrom; page <= item.pdfPageTo; page += 1) {
      seen.set(page, (seen.get(page) ?? 0) + 1);
    }
  }
  const pagesAccounted = Array.from({ length: file.pageCount }, (_, index) => index + 1)
    .filter((page) => seen.get(page) === 1).length;
  const pageAccountingComplete = pagesAccounted === file.pageCount
    && [...seen.keys()].every((page) => page >= 1 && page <= file.pageCount)
    && [...seen.values()].every((count) => count === 1);

  const requiredRanges = file.ranges.filter((item) => item.disposition === 'lesson' || item.disposition === 'shared_support');
  const requiredDeliveryPages = requiredRanges.reduce((total, item) => total + pagesInRange(item), 0);
  const deliveredPages = requiredRanges
    .filter((item) => item.destinationKey && destinationCovered(item.destinationKey))
    .reduce((total, item) => total + pagesInRange(item), 0);
  const missingDestinations = requiredRanges
    .filter((item) => !item.destinationKey || !destinationCovered(item.destinationKey))
    .map((item) => `${item.label} (PDF pp.${item.pdfPageFrom}-${item.pdfPageTo})`);

  return {
    id: file.id,
    pagesExpected: file.pageCount,
    pagesAccounted,
    pageAccountingComplete,
    requiredDeliveryPages,
    deliveredPages,
    missingDestinations,
    complete: pageAccountingComplete && missingDestinations.length === 0 && deliveredPages === requiredDeliveryPages,
  };
}

export const SOURCE_EVERYTHING_AUDITS = Object.fromEntries(
  SOURCE_EVERYTHING_FILES.map((file) => [file.id, auditSourceFile(file)]),
) as Record<SourceEverythingFile['id'], SourceEverythingAudit>;

export const sourceEverythingAudit = (id: SourceEverythingFile['id']) => SOURCE_EVERYTHING_AUDITS[id];

export const SOURCE_EVERYTHING_TOTALS = SOURCE_EVERYTHING_FILES.reduce((totals, file) => {
  const audit = SOURCE_EVERYTHING_AUDITS[file.id];
  return {
    files: totals.files + 1,
    pages: totals.pages + file.pageCount,
    requiredDeliveryPages: totals.requiredDeliveryPages + audit.requiredDeliveryPages,
    deliveredPages: totals.deliveredPages + audit.deliveredPages,
  };
}, { files: 0, pages: 0, requiredDeliveryPages: 0, deliveredPages: 0 });
