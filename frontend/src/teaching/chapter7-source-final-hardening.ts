import type { LessonSlide } from './lesson-content-full';
import { CHAPTER_7_SOURCE_EXHAUSTIVE_SLIDES } from './chapter7-source-exhaustive';

const patch = (
  slides: LessonSlide[],
  id: string,
  mutate: (slide: LessonSlide) => LessonSlide,
) => slides.map((slide) => (slide.id === id ? mutate(slide) : slide));

const appendBullets = (slide: LessonSlide, bullets: string[]): LessonSlide => ({
  ...slide,
  bullets: [...(slide.bullets ?? []), ...bullets],
});

let slides = [...CHAPTER_7_SOURCE_EXHAUSTIVE_SLIDES];

slides = patch(slides, 'ch7-book-74-bubble-code', (slide) => ({
  ...slide,
  example: {
    title: 'Bubble sort · full source control structure',
    lines: [
      'First ← 1',
      'Last ← 10',
      'REPEAT',
      '  Swap ← FALSE',
      '  FOR Index ← First TO Last - 1',
      '    IF Temperature[Index] > Temperature[Index + 1]',
      '      THEN',
      '        Temp ← Temperature[Index]',
      '        Temperature[Index] ← Temperature[Index + 1]',
      '        Temperature[Index + 1] ← Temp',
      '        Swap ← TRUE',
      '    ENDIF',
      '  NEXT Index',
      '  Last ← Last - 1',
      'UNTIL (NOT Swap) OR Last = 1',
    ],
    answer: 'Adjacent values are swapped into ascending order; the unchecked upper limit shrinks after every pass.',
  },
}));

slides = patch(slides, 'ch7-book-75-range', (slide) => ({
  ...slide,
  example: {
    title: 'Percentage-mark range check · source pseudocode',
    lines: [
      'OUTPUT "Please enter the student\'s mark "',
      'REPEAT',
      '  INPUT StudentMark',
      '  IF StudentMark < 0 OR StudentMark > 100',
      '    THEN OUTPUT "The student\'s mark should be in the range 0 to 100, please re-enter the mark"',
      '  ENDIF',
      'UNTIL StudentMark >= 0 AND StudentMark <= 100',
    ],
    answer: 'The loop rejects values outside the inclusive range and gives the user another opportunity to enter the mark.',
  },
}));

slides = patch(slides, 'ch7-book-75-length', (slide) => appendBullets(slide, [
  'The exact-length source example repeatedly asks for an 8-character password until LENGTH(Password) = 8; seven-or-fewer and nine-or-more characters are rejected.',
  'The interval-length source example accepts a family name only when LENGTH(FamilyName) is from 2 to 30 inclusive; one character and 31-or-more characters are rejected.',
  'In both examples LENGTH returns the whole-number count of characters in the string.',
]));

slides = patch(slides, 'ch7-book-75-type-presence', (slide) => appendBullets(slide, [
  'Presence-check source pattern: repeatedly INPUT EmailAddress; if EmailAddress = "" output "*=Required"; continue until EmailAddress <> "".',
  'The source links commands such as DIV to Chapter 8 and asks learners, after programming begins, to investigate another way of testing for a whole number and implement the validation rule.',
]));

slides = patch(slides, 'ch7-book-75-format-checkdigit', (slide) => appendBullets(slide, [
  'The source format-check example uses the pattern CUB9999 and links its string-handling pseudocode forward to Chapter 9.',
  'Incorrect-digit example: 5327 entered instead of 5307.',
  'Transposition example: 5037 entered instead of 5307.',
  'Omitted/extra-digit examples: 537 or 53107 instead of 5307.',
  'Phonetic-number example: 13 / thirteen confused with 30 / thirty.',
]));

slides = patch(slides, 'ch7-book-77-trace-worked', (slide) => ({
  ...slide,
  example: {
    title: 'Table 7.4 · completed source trace',
    lines: [
      'Initial: A=0, B=0, C=100',
      '1: X=9  → B=9, C=9',
      '2: X=7  → C=7',
      '3: X=3  → C=3',
      '4: X=12 → B=12',
      '5: X=6',
      '6: X=4',
      '7: X=15 → B=15',
      '8: X=2  → C=2',
      '9: X=8',
      '10: X=5',
      'OUTPUT: 15 then 2',
    ],
    answer: 'The algorithm selects the largest and smallest values from the ten positive inputs.',
  },
}));

slides = patch(slides, 'ch7-book-77-same-pseudo', (slide) => ({
  ...appendBullets(slide, [
    'When this source algorithm is traced, the prompt Enter your ten values must appear as the first output.',
    'The trace-table OUTPUT column records displayed text without quotation marks.',
    'The final values are recorded as two output values, 15 and 2, without reproducing the comma from OUTPUT B, C.',
    'The source warns that exam questions often use single-letter variables and may ask learners to infer the algorithm\'s purpose.',
  ]),
  example: {
    title: 'Equivalent source pseudocode for the trace table',
    lines: [
      'A ← 0',
      'B ← 0',
      'C ← 100',
      'OUTPUT "Enter your ten values"',
      'REPEAT',
      '  INPUT X',
      '  IF X > B',
      '    THEN B ← X',
      '  ENDIF',
      '  IF X < C',
      '    THEN C ← X',
      '  ENDIF',
      '  A ← A + 1',
      'UNTIL A = 10',
      'OUTPUT B, C',
    ],
    answer: 'The same state changes can be documented whether the algorithm is shown as a flowchart or pseudocode.',
  },
}));

slides = patch(slides, 'ch7-book-78-activity71314', (slide) => appendBullets(slide, [
  'The completed source error-demonstration trace ends with maximum 900 and minimum 100; this exposes the fault because 110 was the smallest input but the initial value C=100 prevented it from replacing the minimum.',
]));

slides = patch(slides, 'ch7-book-79-example1', (slide) => ({
  ...slide,
  example: {
    title: 'Concert-ticket algorithm · source pseudocode',
    lines: [
      'REPEAT',
      '  OUTPUT "How many tickets would you like to buy? "',
      '  INPUT NumberOfTickets',
      'UNTIL NumberOfTickets > 0 AND NumberOfTickets < 26',
      'IF NumberOfTickets < 10',
      '  THEN Discount ← 0',
      '  ELSE',
      '    IF NumberOfTickets < 20',
      '      THEN Discount ← 0.1',
      '      ELSE Discount ← 0.2',
      '    ENDIF',
      'ENDIF',
      'Cost ← NumberOfTickets * 20 * (1 - Discount)',
      'PRINT "Your tickets cost ", Cost',
    ],
    answer: 'Source test set: 0/26 rejected; 1/25 → 20/400; 9/10 → 180/180; 19/20 → 342/320.',
  },
}));

slides = patch(slides, 'ch7-book-79-example2', (slide) => ({
  ...slide,
  example: {
    title: 'School test-results algorithm · full source logic',
    lines: [
      '// initialisation of overall counters',
      'OverallHighest ← 0',
      'OverallLowest ← 100',
      'OverallTotal ← 0',
      'FOR Test ← 1 TO 4',
      '  // initialisation of subject counters',
      '  SubjectHighest ← 0',
      '  SubjectLowest ← 100',
      '  SubjectTotal ← 0',
      '  CASE OF Test',
      '    1 : SubjectName ← "Maths"',
      '    2 : SubjectName ← "Science"',
      '    3 : SubjectName ← "English"',
      '    4 : SubjectName ← "IT"',
      '  ENDCASE',
      '  FOR StudentNumber ← 1 TO 600',
      '    REPEAT',
      '      OUTPUT "Enter Student", StudentNumber, "\'s mark for ", SubjectName',
      '      INPUT Mark',
      '    UNTIL Mark < 101 AND Mark > -1',
      '    IF Mark < OverallLowest THEN OverallLowest ← Mark',
      '    IF Mark < SubjectLowest THEN SubjectLowest ← Mark',
      '    IF Mark > OverallHighest THEN OverallHighest ← Mark',
      '    IF Mark > SubjectHighest THEN SubjectHighest ← Mark',
      '    OverallTotal ← OverallTotal + Mark',
      '    SubjectTotal ← SubjectTotal + Mark',
      '  NEXT StudentNumber',
      '  SubjectAverage ← SubjectTotal / 600',
      '  OUTPUT SubjectName',
      '  OUTPUT "Average mark is ", SubjectAverage',
      '  OUTPUT "Highest Mark is ", SubjectHighest',
      '  OUTPUT "Lowest Mark is ", SubjectLowest',
      'NEXT Test',
      'OverallAverage ← OverallTotal / 2400',
      'OUTPUT "Overall Average is ", OverallAverage',
      'OUTPUT "Overall Highest Mark is ", OverallHighest',
      'OUTPUT "Overall Lowest Mark is ", OverallLowest',
    ],
    answer: 'For a manual dry run the source recommends reducing the problem to 5 students and 2 subjects.',
  },
}));

slides = patch(slides, 'ch7-book-ext-operations', (slide) => appendBullets(slide, [
  'Figure 7.21 source data: pop removes 79 from the stack; push then adds 31 as the new top item, while the Base Pointer remains fixed.',
  'Figure 7.22 source data: dequeue removes 27 from the queue; enqueue then adds 31 at the end, and both Front Pointer and End Pointer can change.',
]));

export const CHAPTER_7_FINAL_SOURCE_SLIDES = slides;
