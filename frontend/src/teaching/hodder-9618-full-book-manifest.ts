export type Hodder9618ChapterNumber =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export type Hodder9618FullBookChapterRange = {
  chapter: Hodder9618ChapterNumber;
  sourceFile: string;
  sourceFileSha256: string;
  sourceFilePageCount: number;
  physicalPageRange: readonly [number, number];
  printedPageRange: readonly [number, number];
};

/**
 * Exact connected Hodder 9618 coursebook currently supplied through Drive.
 * The SHA-256 locks the complete 576-page PDF; the chapter ranges below then
 * identify the exact physical and printed pages belonging to each chapter.
 *
 * Because the whole-file hash fixes every byte in the source, a separate page
 * hash table is not required here merely to prove chapter identity. The older
 * page-fingerprint manifests remain in place for chapters that already have a
 * deeper page-by-page fidelity audit.
 */
export const HODDER_9618_FULL_BOOK_SOURCE = {
  sourceFile: '9618 Coursebook Book (Hodder Education).pdf',
  sourceFileSha256: '760c02dd059fa102b696a7424de2e298198535f06705c367d448e1391d799d95',
  sourceFilePageCount: 576,
} as const;

const range = (
  chapter: Hodder9618ChapterNumber,
  printedStart: number,
  printedEnd: number,
): Hodder9618FullBookChapterRange => ({
  chapter,
  ...HODDER_9618_FULL_BOOK_SOURCE,
  physicalPageRange: [printedStart + 16, printedEnd + 16],
  printedPageRange: [printedStart, printedEnd],
});

export const HODDER_9618_FULL_BOOK_CHAPTER_RANGES: readonly Hodder9618FullBookChapterRange[] = [
  range(1, 1, 26),
  range(2, 27, 67),
  range(3, 68, 106),
  range(4, 107, 135),
  range(5, 136, 158),
  range(6, 159, 177),
  range(7, 178, 195),
  range(8, 196, 216),
  range(9, 217, 237),
  range(10, 238, 263),
  range(11, 264, 282),
  range(12, 283, 303),
  range(13, 304, 327),
  range(14, 328, 345),
  range(15, 346, 371),
  range(16, 372, 409),
  range(17, 410, 424),
  range(18, 425, 449),
  range(19, 450, 497),
  range(20, 498, 540),
];

export const hodder9618FullBookChapterRange = (chapter: number) =>
  HODDER_9618_FULL_BOOK_CHAPTER_RANGES.find(item => item.chapter === chapter) ?? null;
