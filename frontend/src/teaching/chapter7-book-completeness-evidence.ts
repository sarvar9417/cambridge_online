import type { Chapter7SourceAtom } from './chapter7-source-atoms';

/**
 * Narrow source-evidence additions discovered by the formal Book Completeness
 * audit. The underlying lesson route already teaches these pages; these atoms
 * preserve explicit source terminology, pseudocode references and code that the
 * compact page atoms had omitted, so completeness stays fail-closed rather than
 * being inferred from a broad topic match.
 */
export const CHAPTER_7_BOOK_COMPLETENESS_EVIDENCE: Chapter7SourceAtom[] = [
  {
    id: 'ch7-p263-flowchart-symbol-emphasis',
    printedPage: 263,
    kind: 'figure',
    sourceRef: 'Flowchart symbol source terminology · Figures 7.5–7.8',
    targetSlideId: 'ch7-book-72-flow-symbols-a',
    needles: [
      'Terminator flowchart symbols',
      'Process flowchart symbols',
      'Input and output',
      'Decision flowchart symbols',
    ],
  },
  {
    id: 'ch7-p264-flow-lines-emphasis',
    printedPage: 264,
    kind: 'figure',
    sourceRef: 'Figure 7.9 · Flow lines',
    targetSlideId: 'ch7-book-72-ticket-flow',
    needles: [
      'Flowchart flow lines use arrows to show the direction of flow',
    ],
  },
  {
    id: 'ch7-p265-assignment-pseudocode-heading',
    printedPage: 265,
    kind: 'concept',
    sourceRef: 'Assignment statement source heading',
    targetSlideId: 'ch7-book-72-operators',
    needles: [
      'The pseudocode for an assignment statement',
    ],
  },
  {
    id: 'ch7-p266-conditional-pseudocode-heading',
    printedPage: 266,
    kind: 'concept',
    sourceRef: 'Conditional statement source heading',
    targetSlideId: 'ch7-book-72-if-case',
    needles: [
      'The pseudocode for conditional statements',
    ],
  },
  {
    id: 'ch7-p268-iteration-pseudocode-heading',
    printedPage: 268,
    kind: 'concept',
    sourceRef: 'Iteration source heading',
    targetSlideId: 'ch7-book-72-loops',
    needles: [
      'The pseudocode for iteration',
    ],
  },
  {
    id: 'ch7-p270-input-output-pseudocode-heading',
    printedPage: 270,
    kind: 'concept',
    sourceRef: 'Input/output statement source heading',
    targetSlideId: 'ch7-book-72-input-output',
    needles: [
      'The pseudocode for input and output statements',
    ],
  },
  {
    id: 'ch7-p277-range-check-terminology',
    printedPage: 277,
    kind: 'concept',
    sourceRef: 'Validation terminology · Range check',
    targetSlideId: 'ch7-book-75-range',
    needles: [
      'range checks',
      'range check',
    ],
  },
  {
    id: 'ch7-p278-type-check-terminology',
    printedPage: 278,
    kind: 'concept',
    sourceRef: 'Validation terminology · Type check',
    targetSlideId: 'ch7-book-75-type-presence',
    needles: [
      'type checks',
      'type check',
    ],
  },
  {
    id: 'ch7-p279-format-checkdigit-terminology',
    printedPage: 279,
    kind: 'concept',
    sourceRef: 'Format check and check digit · source terminology',
    targetSlideId: 'ch7-book-75-format-checkdigit',
    needles: [
      'Format check and check digit',
      'format checks',
      'check digits',
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
    id: 'ch7-p281-abnormal-erroneous-terminology',
    printedPage: 281,
    kind: 'concept',
    sourceRef: '7.6 Test data · abnormal/erroneous terminology',
    targetSlideId: 'ch7-book-76-abnormal',
    needles: [
      'abnormal test data',
      'erroneous test data',
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
