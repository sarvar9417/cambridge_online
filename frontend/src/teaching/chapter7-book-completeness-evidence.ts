import type { Chapter7SourceAtom } from './chapter7-source-atoms';

/**
 * Narrow source-evidence additions discovered by the formal Book Completeness
 * audit. The underlying lesson route already teaches these pages; these atoms
 * preserve the explicit pseudocode references/code that the compact page atoms
 * had omitted, so source completeness remains fail-closed rather than inferred.
 */
export const CHAPTER_7_BOOK_COMPLETENESS_EVIDENCE: Chapter7SourceAtom[] = [
  {
    id: 'ch7-p279-pseudocode-reference',
    printedPage: 279,
    kind: 'concept',
    sourceRef: 'Format check · pseudocode cross-reference',
    targetSlideId: 'ch7-book-75-format-checkdigit',
    needles: [
      'pseudocode for the CUB9999 format-check example is given in the Chapter 9 string-handling section',
    ],
  },
  {
    id: 'ch7-p280-pseudocode-activities',
    printedPage: 280,
    kind: 'activity',
    sourceRef: 'Activity 7.7 · pseudocode tasks',
    targetSlideId: 'ch7-book-75-activity77',
    needles: [
      'write an algorithm using pseudocode to validate the fairground age and height limits',
      'write an algorithm using pseudocode to validate a password length of 8 to 12 characters inclusive',
    ],
  },
  {
    id: 'ch7-p290-pseudocode-examples',
    printedPage: 290,
    kind: 'example',
    sourceRef: 'Example 1 answer · Example 2 pseudocode',
    targetSlideId: 'ch7-book-79-example2',
    needles: [
      'REPEAT · INPUT NumberOfTickets · UNTIL NumberOfTickets > 0 AND NumberOfTickets < 26',
      'FOR Test ← 1 TO 4',
      'OverallHighest ← 0 · OverallLowest ← 100 · OverallTotal ← 0',
    ],
  },
  {
    id: 'ch7-p293-pseudocode-review',
    printedPage: 293,
    kind: 'review',
    sourceRef: 'Chapter review · algorithm representations',
    targetSlideId: 'ch7-book-review',
    needles: [
      'design and construction of algorithms using structure diagrams, flowcharts and pseudocode',
    ],
  },
];
