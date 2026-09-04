import type { LessonSlide } from './lesson-content-full';
import { CHAPTER_7_BOOK_SLIDES } from './chapter7-book-content';

type KeyTerm = NonNullable<LessonSlide['keyTerms']>[number];

type ExhaustivenessGuard = {
  slideId: string;
  required: string[];
};

const patch = (
  slides: LessonSlide[],
  id: string,
  mutate: (slide: LessonSlide) => LessonSlide,
) => slides.map((slide) => (slide.id === id ? mutate(slide) : slide));

const appendBullets = (slide: LessonSlide, bullets: string[]): LessonSlide => ({
  ...slide,
  bullets: [...(slide.bullets ?? []), ...bullets],
});

const appendKeyTerms = (slide: LessonSlide, terms: KeyTerm[]): LessonSlide => ({
  ...slide,
  keyTerms: [...(slide.keyTerms ?? []), ...terms],
});

let slides = [...CHAPTER_7_BOOK_SLIDES];

slides = patch(slides, 'ch7-book-00-route', (slide) => appendBullets(slide, [
  'The chapter also requires writing, amending, identifying and correcting errors in flowcharts, programs and pseudocode.',
  'Dry runs are documented with trace tables as part of the chapter’s testing/problem-solving toolkit.',
]));

slides = patch(slides, 'ch7-book-71-five-stages', (slide) => {
  const withTerm = appendKeyTerms(slide, [
    {
      term: 'Requirements specification',
      definition: 'A clear statement of what the program must do so everyone working on the solution understands what is required.',
    },
  ]);
  return appendBullets(withTerm, [
    'Analysis uses abstraction and decomposition to identify exactly what the program requires.',
    'Maintenance is the fifth life-cycle stage, although this chapter and Chapter 8 concentrate on analysis, design, coding and testing.',
  ]);
});

slides = patch(slides, 'ch7-book-71-abstraction-maps', (slide) => appendBullets(slide, [
  'Different purposes can require different abstractions of the same real-world area: a road map and a rail map keep different information because they solve different travel problems.',
]));

slides = patch(slides, 'ch7-book-72-top-down', (slide) => appendBullets(slide, [
  'Each final sub-system can be developed by a programmer as a sub-routine.',
  'How a sub-routine works can be documented using a flowchart or pseudocode.',
]));

slides = patch(slides, 'ch7-book-72-flow-symbols-a', (slide) => appendBullets(slide, [
  'If a process has already been defined elsewhere, a process box can contain the name of that process instead of all of its internal steps.',
]));

slides = patch(slides, 'ch7-book-72-pseudo-rules', (slide) => appendBullets(slide, [
  'Pseudocode describes an algorithm with programming-like English but is not bound by the strict syntax of one programming language.',
  'Give data items meaningful names, just as variables and constants are named in a high-level language.',
  'The coursebook conventions are chosen to match Cambridge IGCSE pseudocode and make algorithms easier to read consistently.',
]));

slides = patch(slides, 'ch7-book-72-if-case', (slide) => appendBullets(slide, [
  'An IF condition can directly test a Boolean variable such as Found as well as a comparison expression.',
  'ELSE is optional when no alternative action is needed.',
]));

slides = patch(slides, 'ch7-book-72-comparison', (slide) => appendBullets(slide, [
  'The coursebook explains comparisons as being read from left to right; compound conditions then combine comparisons with AND, OR and NOT.',
]));

slides = patch(slides, 'ch7-book-72-loops', (slide) => ({
  ...appendBullets(slide, [
    'In a FOR … TO … NEXT loop the control variable starts at the stated value and is incremented in steps of one until the end value is reached.',
    'The FOR control variable may be used inside the loop, but its value must not be changed by statements in the loop body.',
    'This makes FOR especially useful for reading data into a list/array whose length is already known.',
  ]),
  example: {
    title: 'Known-length list input from the source',
    lines: [
      'FOR Counter ← 1 TO 10',
      '  OUTPUT "Enter Name of Student "',
      '  INPUT StudentName[Counter]',
      'NEXT Counter',
    ],
    answer: 'StudentName[1] to StudentName[10] are filled while Counter is managed by the loop.',
  },
}));

slides = patch(slides, 'ch7-book-74-overview', (slide) => appendBullets(slide, [
  'The ability to reuse standard methods is important because, once an algorithm becomes a program, the same method may execute many thousands of times.',
  'The chapter presents these standard methods as pseudocode algorithms and links them to program-writing practice in Chapter 8.',
]));

slides = patch(slides, 'ch7-book-75-difference', (slide) => appendBullets(slide, [
  'If validation rejects input, the system should explain why it was rejected and give the user another opportunity to enter the data.',
  'More than one validation check can apply to the same field; an examination mark, for example, can need range, type and presence checks.',
]));

slides = patch(slides, 'ch7-book-75-type-presence', (slide) => ({
  ...slide,
  example: {
    title: 'Whole-number type check used in the coursebook',
    lines: [
      'INPUT NumberOfBrothers',
      'IF NumberOfBrothers <> DIV(NumberOfBrothers, 1)',
      '  THEN OUTPUT "This must be a whole number, please re-enter"',
      'ENDIF',
    ],
    answer: 'The source uses DIV(NumberOfBrothers, 1) to distinguish an integer from a non-whole numeric value.',
  },
}));

slides = patch(slides, 'ch7-book-75-format-checkdigit', (slide) => appendBullets(slide, [
  'A check digit can usually detect an incorrect digit, transposed digits, omitted/extra digits and some phonetic number errors such as thirteen versus thirty.',
  'The chapter key-term definition explicitly classifies a check digit as a data-entry check, not a data-transmission check.',
]));

slides = patch(slides, 'ch7-book-75-verification', (slide) => appendBullets(slide, [
  'For double entry, the same data is entered twice, sometimes by different operators; if the entries differ the system outputs an error and requests re-entry.',
  'For a screen/visual check, the user compares displayed data with a paper source or confirms it from their own knowledge before continuing.',
]));

slides = patch(slides, 'ch7-book-76-testdata', (slide) => appendBullets(slide, [
  'A set of test data contains all values needed to work through the solution.',
  'Algorithms can be tested manually with a dry run; implemented programs can be executed on a computer.',
  'Sub-systems should be tested before the complete solution, and thorough final testing uses several data sets with known expected results.',
]));

slides = patch(slides, 'ch7-book-77-trace-intro', (slide) => appendBullets(slide, [
  'A trace table can be used not only to find errors but also to work out the purpose of an unfamiliar algorithm by recording and studying each state change.',
  'During a dry run, enter a new value every time a variable changes and record every produced value in the OUTPUT column.',
]));

slides = patch(slides, 'ch7-book-77-trace-worked', (slide) => appendBullets(slide, [
  'The completed source table finally outputs the two values as separate output entries: 15 and 2 (the source annotation notes them without a comma).',
]));

slides = patch(slides, 'ch7-book-79-eight-stages', (slide) => appendBullets(slide, [
  'When decomposing a problem, the source suggests the common sub-problem families: set-up processes, input, processing of data, permanent storage (if required) and output of results.',
  'The chapter states that earlier sample algorithms were deliberately not designed for readability because learners were expected to infer the problem being solved; new algorithms should instead be precise, clear and easy for another person to understand.',
]));

slides = patch(slides, 'ch7-book-79-example2', (slide) => ({
  ...slide,
  example: {
    title: 'School test-results algorithm · source structure',
    lines: [
      'Initialise overall counters/totals before processing subjects.',
      'FOR Test ← 1 TO 4; use CASE OF Test to choose Maths, Science, English or IT.',
      'For each subject initialise SubjectHighest, SubjectLowest and SubjectTotal.',
      'FOR StudentNumber ← 1 TO 600; repeatedly input Mark until 0–100 inclusive.',
      'Update subject total/highest/lowest and the corresponding overall totals/extremes.',
      'After 600 students, calculate and output the subject average/statistics.',
      'After all four subjects, calculate and output the overall average/statistics.',
    ],
    answer: 'The nested-loop design combines validation, CASE selection, totals, extremes and averages in one complete algorithm.',
  },
}));

slides = patch(slides, 'ch7-book-ext-stackqueue', (slide) => appendKeyTerms(slide, [
  {
    term: 'Abstract Data Type (ADT)',
    definition: 'A collection of data together with a defined set of operations on that data.',
  },
]));

slides = patch(slides, 'ch7-book-keyterms-c', (slide) => ({
  ...slide,
  keyTerms: (slide.keyTerms ?? []).map((item) => item.term === 'Check digit'
    ? {
        ...item,
        definition: 'An additional calculated digit appended to a number to detect likely data-entry errors; the source explicitly states that it is a data-entry check rather than a data-transmission check.',
      }
    : item),
}));

export const CHAPTER_7_SOURCE_EXHAUSTIVENESS_GUARDS: ExhaustivenessGuard[] = [
  { slideId: 'ch7-book-71-five-stages', required: ['Requirements specification', 'abstraction and decomposition', 'Maintenance'] },
  { slideId: 'ch7-book-72-top-down', required: ['sub-routine', 'flowchart or pseudocode'] },
  { slideId: 'ch7-book-72-loops', required: ['must not be changed', 'StudentName[Counter]', 'known'] },
  { slideId: 'ch7-book-74-overview', required: ['many thousands of times', 'Chapter 8'] },
  { slideId: 'ch7-book-75-difference', required: ['another opportunity', 'range, type and presence'] },
  { slideId: 'ch7-book-75-type-presence', required: ['DIV(NumberOfBrothers, 1)'] },
  { slideId: 'ch7-book-75-format-checkdigit', required: ['phonetic', 'data-entry check', 'data-transmission check'] },
  { slideId: 'ch7-book-75-verification', required: ['different operators', 'paper source', 'own knowledge'] },
  { slideId: 'ch7-book-77-trace-intro', required: ['every time a variable changes', 'OUTPUT column'] },
  { slideId: 'ch7-book-79-eight-stages', required: ['set-up processes', 'permanent storage', 'readability'] },
  { slideId: 'ch7-book-ext-stackqueue', required: ['Abstract Data Type (ADT)'] },
];

export const CHAPTER_7_SOURCE_EXHAUSTIVE_SLIDES = slides;
