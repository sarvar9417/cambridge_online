import { CHAPTER_7_SOURCE_TRANSCRIPT_258_268 } from './chapter7-source-transcript-258-268';
import { CHAPTER_7_SOURCE_TRANSCRIPT_269_279 } from './chapter7-source-transcript-269-279';
import { CHAPTER_7_SOURCE_TRANSCRIPT_280_289 } from './chapter7-source-transcript-280-289';
import { CHAPTER_7_SOURCE_TRANSCRIPT_290_298 } from './chapter7-source-transcript-290-298';

export type Chapter7SourcePageTranscript = {
  printedPage: number;
  text: string;
  sha256: string;
};

/**
 * Text-layer transcript of the user-supplied Chapter 7 PDF, printed pp. 258-298.
 *
 * Extraction rule:
 * - preserve source words and order;
 * - remove only PDF production footer/page-number boilerplate;
 * - trim line-edge whitespace and collapse repeated blank lines.
 *
 * Existing curated lesson slides are not replaced. This is a loss-prevention
 * reference layer that keeps the source wording, worked examples, activity
 * prompts, table/figure labels and exam text available from the presenter
 * without crowding the normal lesson view.
 */
const importedTranscript: Chapter7SourcePageTranscript[] = [
  ...CHAPTER_7_SOURCE_TRANSCRIPT_258_268,
  ...CHAPTER_7_SOURCE_TRANSCRIPT_269_279,
  ...CHAPTER_7_SOURCE_TRANSCRIPT_280_289,
  ...CHAPTER_7_SOURCE_TRANSCRIPT_290_298,
];

// Import repair only: one accidental capitalisation was introduced while moving
// the extracted p.277 text into the repository. The supplied PDF/source extract
// has lowercase “the number of”; restore that exact source wording before use.
export const CHAPTER_7_SOURCE_TRANSCRIPT: Chapter7SourcePageTranscript[] = importedTranscript.map((page) =>
  page.printedPage === 277
    ? { ...page, text: page.text.replace('\nTHE number of', '\nthe number of') }
    : page,
);

export const CHAPTER_7_SOURCE_TRANSCRIPT_BY_PAGE = new Map(
  CHAPTER_7_SOURCE_TRANSCRIPT.map((page) => [page.printedPage, page] as const),
);

export const getChapter7SourceTranscript = (printedPage: number) =>
  CHAPTER_7_SOURCE_TRANSCRIPT_BY_PAGE.get(printedPage);
