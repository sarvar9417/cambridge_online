import { CHAPTER_7_SOURCE_MAP } from './chapter7-book-coverage';
import { CHAPTER_7_SOURCE_PAGE_AUDIT } from './chapter7-source-page-audit';

export type Chapter7SourceAtomKind =
  | 'objective'
  | 'concept'
  | 'keyword'
  | 'example'
  | 'activity'
  | 'extension'
  | 'table'
  | 'figure'
  | 'review'
  | 'exam';

export type Chapter7SourceAtom = {
  id: string;
  printedPage: number;
  kind: Chapter7SourceAtomKind;
  sourceRef: string;
  targetSlideId: string;
  /** Short source-faithful terms, values, code fragments or relationships that must stay visible. */
  needles: string[];
};

const atom = (
  id: string,
  printedPage: number,
  kind: Chapter7SourceAtomKind,
  sourceRef: string,
  targetSlideId: string,
  needles: string[],
): Chapter7SourceAtom => ({ id, printedPage, kind, sourceRef, targetSlideId, needles });

/**
 * One or more semantic/source atoms for every printed page of the supplied
 * Cambridge IGCSE/O Level Computer Science Chapter 7 extract (pp. 258–298).
 *
 * These are intentionally short source facts rather than copied paragraphs.
 * Exact terminology, source values, pseudocode fragments and worked-example
 * constants are pinned so a future rewrite cannot silently replace the book.
 */
export const CHAPTER_7_PAGE_SOURCE_ATOMS: Chapter7SourceAtom[] = [
  atom('ch7-p258-objectives',258,'objective','Chapter objectives','ch7-book-71-five-stages',[
    'analysis · design · coding · testing','computer systems and sub-systems','linear search · bubble sort · totalling · counting','trace table · dry run','correcting errors in flowcharts, programs and pseudocode',
  ]),
  atom('ch7-p258-requirements',258,'keyword','7.1.1 Analysis','ch7-book-71-abstraction-maps',[
    'requirements specification','abstraction keeps key elements and discards unnecessary detail','decomposition',
  ]),
  atom('ch7-p259-lifecycle-detail',259,'concept','7.1.1–7.1.4','ch7-book-71-design',[
    'getting dressed: select items · remove clothes already worn · put selected items on in order','structure charts · flowcharts · pseudocode','iterative testing: test module · amend code · repeat','final testing uses different sets of test data',
  ]),
  atom('ch7-p260-systems',260,'concept','7.2.1–7.2.2','ch7-book-72-top-down',[
    'software · data · hardware · communications · people','each final sub-system performs a single action','sub-system can be developed as a sub-routine','sub-routine can be shown with flowcharts or pseudocode','stepwise refinement','inputs · processes · outputs · storage',
  ]),
  atom('ch7-p261-alarm-ipos',261,'example','Example 1 · Alarm app','ch7-book-72-alarm-ipos',[
    'input: set/remove alarm · switch off · snooze','process: compare current time · store/remove alarm · manage snooze','output: continuous sound/tune','storage: alarm time(s)','Activity 7.1',
  ]),
  atom('ch7-p261-structure',261,'figure','Figure 7.2','ch7-book-72-structure-basic',[
    'structure diagram is hierarchical','System → Sub-system 1 / 2 / 3','Sub-system 1 → Sub-system 1.1 / 1.2',
  ]),
  atom('ch7-p262-alarm-tree-flow',262,'example','Example 2–3 · Figures 7.3–7.4','ch7-book-72-alarm-tree',[
    'Alarm app → Set alarm · Check time · Sound alarm','Set time · Turn alarm on/off · Play sound for two minutes · Check off/snooze · Reset/clear alarm','Get Time → Time = Alarm Time? → Sound Alarm / Wait 30 seconds','Activity 7.2',
  ]),
  atom('ch7-p263-flow-symbols',263,'figure','Figures 7.5–7.8','ch7-book-72-flow-symbols-a',[
    'Terminator: START / STOP','Process: A ← 0 · B ← 0 · Sort list','Input/Output: INPUT X · OUTPUT "Error"','Decision has exactly two labelled outputs','X > B? · YES → B ← X',
  ]),
  atom('ch7-p264-ticket-flow',264,'example','Example 4 · Figures 7.9–7.10','ch7-book-72-ticket-flow',[
    '$20 per ticket','10 tickets → 10% discount','20 tickets → 20% discount','maximum 25 tickets per transaction','N >= 1 AND N < 26','Cost ← N * (1 - D)',
  ]),
  atom('ch7-p265-pseudocode',265,'concept','Pseudocode conventions · Table 7.1','ch7-book-72-pseudo-rules',[
    'non-proportional font','keywords in capital letters','data-item and subroutine names start with a capital letter','selected/repeated statements indented by two spaces','← assignment','+ · − · * · / · ^ · ( )',
  ]),
  atom('ch7-p265-assignment-example',265,'example','Assignment examples','ch7-book-72-operators',[
    'Cost ← 10','Price ← Cost * 2','Tax ← Price * 0.12','SellingPrice ← Price + Tax','SellingPrice = 22.4','Gender ← "M"','Chosen ← False',
  ]),
  atom('ch7-p266-activity73-conditions',266,'activity','Activity 7.3 · conditional statements','ch7-book-72-activity73',[
    'Amount ← 100','TotalPrice ← Amount * 3.5','Discount ← 0.2','FinalPrice ← TotalPrice - TotalPrice * Discount','Name ← "Nikki"','Message ← "Hello " + Name','IF … THEN … ELSE … ENDIF','CASE OF … OTHERWISE … ENDCASE',
  ]),
  atom('ch7-p267-comparisons',267,'table','Table 7.2','ch7-book-72-comparison',[
    '> · < · = · >= · <= · <>','AND · OR · NOT','comparisons are made from left to right','((Height > 1) OR (Weight > 20)) AND (Age < 70) AND (Age > 5)',
  ]),
  atom('ch7-p268-nested-case',268,'activity','Activities 7.4–7.5','ch7-book-72-nested-if',[
    'PercentageMark < 0 OR PercentageMark > 100','PercentageMark > 49 → Pass','Activity 7.4: mark 0–20 · pass mark 10','CASE OF Choice: 1 add · 2 subtract · 3 multiply · 4 divide','Activity 7.5: DAY 1–7',
  ]),
  atom('ch7-p269-loops',269,'example','Iteration · FOR/REPEAT/WHILE','ch7-book-72-loop-examples',[
    'FOR … TO … NEXT','REPEAT … UNTIL','WHILE … DO … ENDWHILE','display ten stars','FOR counter increments automatically in steps of one','FOR control variable may be used inside loop but its value must not be changed','INPUT StudentName[Counter]','StudentName[1] to StudentName[10]',
  ]),
  atom('ch7-p270-loop-io',270,'concept','Post-condition / pre-condition loops · I/O','ch7-book-72-repeat-detail',[
    'REPEAT loop always executes at least once','REPEAT is a post-condition loop','WHILE may execute zero times','WHILE is a pre-condition loop','Mark = -1 sentinel','READ usually for files','PRINT for hard copy','OUTPUT Name1, "Ali", Name3',
  ]),
  atom('ch7-p271-purpose',271,'example','7.3 · Example 1 · Activity 7.6 · Figure 7.11','ch7-book-73-purpose',[
    'algorithm sets out steps to complete a given task','purpose and processes','Wait (10)','Get (Time)','UNTIL Time = Alarm_Time','Activity 7.6 inputs 7 and 18 → 18 is largest',
  ]),
  atom('ch7-p272-standard',272,'example','7.4.1–7.4.2','ch7-book-74-total-count',[
    'standard methods may be repeated many thousands of times','Totalling · Counting · Maximum/Minimum/Average · Linear search · Bubble sort','Total ← 0','Total ← Total + StudentMark[Counter]','PassCount ← 0','StudentMark > 50','PassCount ← PassCount + 1',
  ]),
  atom('ch7-p273-count-maxmin',273,'example','7.4.2–7.4.3','ch7-book-74-max-min',[
    'NumberInStock ← NumberInStock - 1','NumberInStock < 20 → CALL Reorder()','MaximumMark ← 0','MinimumMark ← 100','replace maximum with a higher mark','replace minimum with a lower mark',
  ]),
  atom('ch7-p274-first-average-search',274,'example','7.4.3–7.4.4','ch7-book-74-linear-search',[
    'MaximumMark ← StudentMark[1]','MinimumMark ← StudentMark[1]','FOR Counter ← 2 TO ClassSize','Average ← Total / ClassSize','Found ← FALSE','Counter ← 1','Name = StudentName[Counter]',
  ]),
  atom('ch7-p275-search-sort',275,'concept','Linear search · Bubble sort','ch7-book-74-count-matches',[
    'UNTIL Found OR Counter > ClassSize','ChoiceCount ← 0','"ice cream" = Dessert[Counter]','bubble sort compares adjacent elements and swaps wrong-order pairs','last element is correct after a full pass',
  ]),
  atom('ch7-p276-bubble-validation',276,'example','Bubble sort source algorithm · 7.5','ch7-book-74-bubble-code',[
    'First ← 1','Last ← 10','Swap ← FALSE','Temperature[Index] > Temperature[Index + 1]','Last ← Last - 1','UNTIL (NOT Swap) OR Last = 1','validation checks reasonableness before acceptance',
  ]),
  atom('ch7-p277-range-length',277,'example','Range and length checks','ch7-book-75-range',[
    'StudentMark range 0 to 100 inclusive','rejected input gets an explanatory error and re-entry','password exactly 8 characters','family name 2 to 30 characters inclusive','LENGTH returns number of characters','more than one validation check can apply to one item',
  ]),
  atom('ch7-p278-type-presence',278,'example','Type and presence checks','ch7-book-75-type-presence',[
    'NumberOfBrothers <> DIV(NumberOfBrothers, 1)','whole-number check','EmailAddress = ""','OUTPUT "*=Required"','presence check requires a data item to be entered',
  ]),
  atom('ch7-p279-format-checkdigit',279,'example','Format check · check digit · Figure 7.13','ch7-book-75-format-checkdigit',[
    'CUB9999','check digit is the final digit calculated from the other digits','barcodes · product codes · ISBN · VIN','5327 vs 5307','5037 vs 5307','537 / 53107 vs 5307','13 / thirteen vs 30 / thirty','check digit is a data-entry check, not a data-transmission check',
  ]),
  atom('ch7-p280-activity77-verification',280,'activity','Activity 7.7 · Figure 7.14','ch7-book-75-activity77',[
    'telephone number · pupil name · XXX999','age > 7 and < 12','height > 110 and < 150 cm','password 8–12 characters inclusive','Double entry','sometimes by different operators','screen/visual check against paper source or own knowledge',
  ]),
  atom('ch7-p281-verification-testdata',281,'concept','7.6 Test data · Activity 7.8','ch7-book-76-testdata',[
    'set of test data = all data required to work through a solution','normal data is accepted','validation is checked before verification when both are used','test individual sub-systems before the complete system','dry run is manual; implemented program is executed',
  ]),
  atom('ch7-p282-boundaries',282,'concept','Normal / abnormal / extreme / boundary data','ch7-book-76-extreme-boundary',[
    'normal data accepted','abnormal data rejected','extreme data = largest/smallest accepted value','boundary data includes accepted boundary and corresponding just-outside rejected value','Activity 7.11',
  ]),
  atom('ch7-p283-trace',283,'table','Figure 7.15 · Table 7.3','ch7-book-77-trace-intro',[
    'trace table records a variable every time its value changes','every output is recorded in OUTPUT column','dry run = manual step-by-step execution','test data: 9, 7, 3, 12, 6, 4, 15, 2, 8, 5','A B C X OUTPUT','initial A=0 · B=0 · C=100',
  ]),
  atom('ch7-p284-trace-complete',284,'table','Table 7.4 · Activity 7.12','ch7-book-77-trace-worked',[
    'final outputs 15 and 2','prompt "Enter your ten values" must be first output','quotation marks are not written in OUTPUT column','test data: 400, 800, 190, 170, 300, 110, 600, 150, 130, 900','same trace table can be used for equivalent pseudocode',
  ]),
  atom('ch7-p285-error-traces',285,'activity','Activities 7.13–7.14 · Tables 7.5–7.6','ch7-book-78-activity71314',[
    'Activity 7.13 test data: 4, 8, 19, 17, 3, 11, 6, 1, 13, 9','Activity 7.14 test data: 35, 31, 32, 36, 39, 37, 42, 38','completed faulty trace ends 900 / 100','110 is the real smallest input but was not identified',
  ]),
  atom('ch7-p286-negative',286,'activity','Activities 7.15–7.16 · Figure 7.16','ch7-book-78-negative',[
    'negative test data exposes the 0–100 assumption','B ← -1000000','C ← 1000000','algorithm still does not work for every possible set','Activity 7.16 asks for two values where it still fails',
  ]),
  atom('ch7-p287-first-value',287,'figure','Figure 7.17','ch7-book-78-first-value',[
    'set provisional maximum and minimum from the first input value','B ← X','C ← X','counter then tests A < 9','first value is input before the remaining nine values',
  ]),
  atom('ch7-p288-write-algorithm',288,'activity','Activity 7.17 · Figure 7.18 · 7.9 stages','ch7-book-79-eight-stages',[
    'Activity 7.17 test data: -97, 12390, 0, 77, 359, -2, -89, 5000, 21, 67','Set up processes · Input · Processing of data · Permanent storage of data (if required) · Output of results','structure diagram','flowchart or pseudocode','meaningful data-store names','Counter >= 10','Normal · Abnormal · Boundary test data','correct errors and repeat',
  ]),
  atom('ch7-p289-example1',289,'example','Figure 7.19 · Example 1','ch7-book-79-example1',[
    'more readable Max/Min flowchart','tickets cost $20 each','10 tickets → 10%','20 tickets → 20%','no more than 25 tickets','write the algorithm in pseudocode',
  ]),
  atom('ch7-p290-ticket-school',290,'example','Example 1 answer · Activity 7.18 · Example 2','ch7-book-79-example2',[
    '0 and 26 → rejected','1 and 25 → 20 and 400','9 and 10 → 180 and 180','19 and 20 → 342 and 320','Activity 7.18 classifies and extends test data','600 students','four tests: Maths · Science · English · IT','each test out of 100',
  ]),
  atom('ch7-p291-school-detail',291,'example','Example 2 continued','ch7-book-79-example2',[
    'FOR Test ← 1 TO 4','FOR StudentNumber ← 1 TO 600','Mark < 101 AND Mark > -1','SubjectAverage ← SubjectTotal / 600','OverallAverage ← OverallTotal / 2400','highest · lowest · average per subject and overall','manual test reduction: 5 students and 2 subjects',
  ]),
  atom('ch7-p292-activities-adt',292,'activity','Activities 7.19–7.20 · Figure 7.20','ch7-book-79-activity720',[
    'Activity 7.19: reduce Example 2 to 5 students and 2 subjects','Activity 7.20: total and average of ten positive numbers','Activity 7.20: any number of positive numbers, -1 to finish','explain chosen loop structure','Abstract Data Type (ADT) = data plus operations','stack = LIFO · push · pop','queue = FIFO · enqueue · dequeue','Figure 7.20 values 27 · 34 · 82 · 79',
  ]),
  atom('ch7-p293-stack-queue-review',293,'extension','Figures 7.21–7.22 · Chapter review','ch7-book-ext-operations',[
    'stack pop removes 79','stack push adds 31','Base Pointer remains the same','queue dequeue removes 27','queue enqueue adds 31','Front Pointer and End Pointer change','chapter review covers life cycle · decomposition · design methods · algorithm purpose · standard methods · validation/verification · test data · trace tables · error correction',
  ]),

  atom('ch7-p294-keyterms-a',294,'keyword','Key terms · part 1','ch7-book-keyterms-a',[
    'analysis','design','coding','testing','abstraction','decomposition','top-down design','inputs','processes','output','storage',
  ]),
  atom('ch7-p294-keyterms-b',294,'keyword','Key terms · part 2','ch7-book-keyterms-b',[
    'structure diagram','flowchart','algorithm','pseudocode','linear search','bubble sort','validation','verification','set of test data','normal data','abnormal data',
  ]),
  atom('ch7-p294-keyterms-c',294,'keyword','Key terms · part 3','ch7-book-keyterms-c',[
    'extreme data','boundary data','range check','length check','type check','presence check','format check','check digit','check digit is a data entry check and not a data transmission check',
  ]),

  atom('ch7-p295-exam',295,'exam','Exam-style Questions 1–5','ch7-book-exam-1-2',[
    'Exam-style Question 1','Exam-style Question 2','Exam-style Question 3','Exam-style Question 4','Exam-style Question 5',
  ]),
  atom('ch7-p296-exam6',296,'exam','Exam-style Question 6','ch7-book-exam-6a',[
    'Exam-style Question 6','dry run','processes included in the algorithm','rules required to accept a parcel',
  ]),
  atom('ch7-p297-exam7',297,'exam','Exam-style Question 7','ch7-book-exam-7',[
    'adds up 10 positive numbers','identify all errors','rewrite the algorithm','trace table and test data','normal · erroneous · extreme',
  ]),
  atom('ch7-p298-exam89',298,'exam','Exam-style Questions 8–9','ch7-book-exam-8',[
    'Exam-style Question 8','two non-zero numbers and a sign','zero for the first number terminates the process','Exam-style Question 9',
  ]),
];

const pageForSlide = new Map<string, number>();
for (const page of CHAPTER_7_SOURCE_PAGE_AUDIT) {
  for (const id of page.targetSlideIds) if (!pageForSlide.has(id)) pageForSlide.set(id, page.printedPage);
}

const inventoryAtoms = (
  group: 'activities' | 'figures' | 'tables' | 'examQuestions' | 'bookExtras',
  kind: Chapter7SourceAtomKind,
): Chapter7SourceAtom[] => Object.entries(CHAPTER_7_SOURCE_MAP[group]).map(([sourceRef, targetSlideId]) => {
  const prefix = group === 'activities' ? 'Activity '
    : group === 'figures' ? 'Figure '
      : group === 'tables' ? 'Table '
        : group === 'examQuestions' ? 'Exam-style Question '
          : '';
  const ref = `${prefix}${sourceRef}`;
  return atom(
    `ch7-inventory-${group}-${sourceRef.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    pageForSlide.get(targetSlideId) ?? 258,
    kind,
    ref,
    targetSlideId,
    [ref],
  );
});

/**
 * Structural source inventory: this guarantees the same explicit element-level
 * reconciliation used by Chapters 1 and 13. The page atoms above carry the
 * source-faithful terms/values; these atoms guarantee that every named book
 * activity, figure, table, end question and extra is pinned to a presenter slide.
 */
export const CHAPTER_7_SOURCE_INVENTORY_ATOMS: Chapter7SourceAtom[] = [
  ...inventoryAtoms('activities','activity'),
  ...inventoryAtoms('figures','figure'),
  ...inventoryAtoms('tables','table'),
  ...inventoryAtoms('examQuestions','exam'),
  ...inventoryAtoms('bookExtras','extension'),
];

export const CHAPTER_7_SOURCE_ATOMS: Chapter7SourceAtom[] = [
  ...CHAPTER_7_PAGE_SOURCE_ATOMS,
  ...CHAPTER_7_SOURCE_INVENTORY_ATOMS,
];

export const CHAPTER_7_REQUIRED_KEY_TERMS = [
  'analysis','design','coding','testing','abstraction','decomposition','top-down design','inputs','processes','output','storage',
  'structure diagram','flowchart','algorithm','pseudocode','linear search','bubble sort','validation','verification','set of test data',
  'normal data','abnormal data','extreme data','boundary data','range check','length check','type check','presence check','format check','check digit',
] as const;
