import type { HodderLessonSlide } from './lesson-content-hodder-types';
import type { LessonPresentationBeat } from './lesson-experience-model';
import { authoredStaticScene, buildAuthoredStoryboard, type AuthoredSceneSpec } from './authored-presentation-storyboard';

const s=(spec:AuthoredSceneSpec)=>spec;

const OVERVIEW:AuthoredSceneSpec[]=[
  s({id:'h7p-overview-route',slideId:'ch7-book-00-route',role:'objective',eyebrow:'CHAPTER 7 · COMPLETE ROUTE',title:'Algorithm design and problem-solving: build the whole toolkit',lead:true,bullets:[0,9],sourcePages:[258,298]}),
];

const TOPIC_71:AuthoredSceneSpec[]=[
  s({id:'h7p-71-life-cycle',slideId:'ch7-book-71-five-stages',role:'process',eyebrow:'7.1 · PROGRAM DEVELOPMENT LIFE CYCLE',lead:true,bullets:[0,5],sourcePages:[258]}),
  s({id:'h7p-71-abstraction',slideId:'ch7-book-71-abstraction-maps',role:'compare',eyebrow:'7.1.1 · ABSTRACTION',lead:true,bullets:[0,3],activity:true,sourcePages:[258]}),
  s({id:'h7p-71-decomposition',slideId:'ch7-book-71-decompose-dressed',role:'challenge',eyebrow:'7.1.1 · DECOMPOSITION',lead:true,activity:true,sourcePages:[259]}),
  s({id:'h7p-71-design',slideId:'ch7-book-71-design',role:'process',eyebrow:'7.1.2 · DESIGN',lead:true,bullets:[0,5],sourcePages:[259]}),
  s({id:'h7p-71-coding',slideId:'ch7-book-71-coding',role:'process',eyebrow:'7.1.3 · CODING + ITERATIVE TESTING',lead:true,bullets:[0,5],sourcePages:[259]}),
  s({id:'h7p-71-testing',slideId:'ch7-book-71-testing',role:'compare',eyebrow:'7.1.4 · ITERATIVE VS FINAL TESTING',lead:true,activity:true,sourcePages:[259]}),
];

const TOPIC_72:AuthoredSceneSpec[]=[
  s({id:'h7p-72-system',slideId:'ch7-book-72-system',role:'concept',eyebrow:'7.2 · SYSTEMS AND SUB-SYSTEMS',lead:true,bullets:[0,3],sourcePages:[260]}),
  s({id:'h7p-72-top-down',slideId:'ch7-book-72-top-down',role:'process',eyebrow:'7.2.1 · TOP-DOWN DESIGN',lead:true,keyTerms:[0,2],bullets:[0,2],activity:true,sourcePages:[260]}),
  s({id:'h7p-72-ipos',slideId:'ch7-book-72-ipos',role:'compare',eyebrow:'7.2.2 · INPUT / PROCESS / OUTPUT / STORAGE',lead:true,keyTerms:[0,4],sourcePages:[260]}),
  s({id:'h7p-72-alarm-ipos',slideId:'ch7-book-72-alarm-ipos',role:'visual',eyebrow:'EXAMPLE 1 · ALARM APP',lead:true,bullets:[0,4],activity:true,sourcePages:[261]}),
  s({id:'h7p-72-structure',slideId:'ch7-book-72-structure-basic',role:'visual',eyebrow:'FIGURE 7.2 · STRUCTURE DIAGRAM',lead:true,bullets:[0,4],sourcePages:[261]}),
  s({id:'h7p-72-alarm-tree',slideId:'ch7-book-72-alarm-tree',role:'challenge',eyebrow:'EXAMPLE 2 · FIGURE 7.3',lead:true,activity:true,sourcePages:[262]}),
  s({id:'h7p-72-teeth',slideId:'ch7-book-72-teeth',role:'challenge',eyebrow:'STRUCTURE-DIAGRAM PRACTICE',lead:true,activity:true,sourcePages:[262]}),
  s({id:'h7p-72-flow-purpose',slideId:'ch7-book-72-flow-purpose',role:'process',eyebrow:'FIGURE 7.4 · FLOWCHART',lead:true,activity:true,sourcePages:[262]}),
  s({id:'h7p-72-flow-symbols-a',slideId:'ch7-book-72-flow-symbols-a',role:'visual',eyebrow:'FIGURES 7.5–7.7 · FLOWCHART SYMBOLS',lead:true,keyTerms:[0,3],activity:true,sourcePages:[263]}),
  s({id:'h7p-72-flow-symbols-b',slideId:'ch7-book-72-flow-symbols-b',role:'visual',eyebrow:'FIGURES 7.8–7.9 · DECISIONS',lead:true,bullets:[0,4],activity:true,sourcePages:[263]}),
  s({id:'h7p-72-ticket-flow',slideId:'ch7-book-72-ticket-flow',role:'process',eyebrow:'EXAMPLE 4 · CONCERT TICKETS',lead:true,bullets:[0,4],activity:true,sourcePages:[264]}),
  s({id:'h7p-72-pseudo-rules',slideId:'ch7-book-72-pseudo-rules',role:'concept',eyebrow:'7.2 · PSEUDOCODE CONVENTIONS',lead:true,bullets:[0,4],sourcePages:[265]}),
  s({id:'h7p-72-operators',slideId:'ch7-book-72-operators',role:'concept',eyebrow:'TABLE 7.1 · ASSIGNMENT + ARITHMETIC',lead:true,bullets:[0,6],example:true,sourcePages:[265]}),
  s({id:'h7p-72-activity73-code',slideId:'ch7-book-72-activity73',role:'visual',eyebrow:'ACTIVITY 7.3 · ASSIGNMENT TRACE',lead:true,example:true,sourcePages:[266]}),
  s({id:'h7p-72-activity73-check',slideId:'ch7-book-72-activity73',role:'challenge',eyebrow:'ACTIVITY 7.3 · PREDICT VALUES',title:'Execute each assignment in order',activity:true,sourcePages:[266]}),
  s({id:'h7p-72-if-case',slideId:'ch7-book-72-if-case',role:'compare',eyebrow:'7.2 · IF VS CASE',lead:true,keyTerms:[0,2],example:true,sourcePages:[266]}),
  s({id:'h7p-72-comparison',slideId:'ch7-book-72-comparison',role:'concept',eyebrow:'TABLE 7.2 · CONDITIONS',lead:true,bullets:[0,9],activity:true,sourcePages:[267]}),
  s({id:'h7p-72-nested-if',slideId:'ch7-book-72-nested-if',role:'challenge',eyebrow:'ACTIVITY 7.4 · NESTED IF',lead:true,activity:true,sourcePages:[268]}),
  s({id:'h7p-72-case-day',slideId:'ch7-book-72-case-day',role:'challenge',eyebrow:'ACTIVITY 7.5 · CASE',lead:true,activity:true,sourcePages:[268]}),
  s({id:'h7p-72-loops',slideId:'ch7-book-72-loops',role:'compare',eyebrow:'7.2 · FOR / REPEAT / WHILE',lead:true,keyTerms:[0,3],activity:true,sourcePages:[269]}),
  s({id:'h7p-72-loop-examples',slideId:'ch7-book-72-loop-examples',role:'visual',eyebrow:'7.2 · THREE LOOP FORMS',lead:true,example:true,bullets:[0,3],sourcePages:[269]}),
  s({id:'h7p-72-repeat',slideId:'ch7-book-72-repeat-detail',role:'process',eyebrow:'7.2 · REPEAT … UNTIL',lead:true,example:true,sourcePages:[270]}),
  s({id:'h7p-72-while',slideId:'ch7-book-72-while-detail',role:'process',eyebrow:'7.2 · WHILE … DO',lead:true,example:true,sourcePages:[270]}),
  s({id:'h7p-72-io',slideId:'ch7-book-72-input-output',role:'visual',eyebrow:'7.2 · INPUT / OUTPUT',lead:true,example:true,bullets:[0,2],sourcePages:[270]}),
];

const TOPIC_73:AuthoredSceneSpec[]=[
  s({id:'h7p-73-purpose',slideId:'ch7-book-73-purpose',role:'concept',eyebrow:'7.3 · ALGORITHM PURPOSE',lead:true,example:true,sourcePages:[271]}),
  s({id:'h7p-73-activity76',slideId:'ch7-book-73-activity76',role:'challenge',eyebrow:'ACTIVITY 7.6 · FIGURE 7.11',lead:true,activity:true,sourcePages:[271]}),
];

const TOPIC_74:AuthoredSceneSpec[]=[
  s({id:'h7p-74-overview',slideId:'ch7-book-74-overview',role:'objective',eyebrow:'7.4 · STANDARD METHODS',lead:true,bullets:[0,5],sourcePages:[272]}),
  s({id:'h7p-74-total-count',slideId:'ch7-book-74-total-count',role:'compare',eyebrow:'7.4.1–7.4.2 · TOTAL VS COUNT',lead:true,example:true,activity:true,sourcePages:[272]}),
  s({id:'h7p-74-countdown',slideId:'ch7-book-74-countdown',role:'process',eyebrow:'7.4.2 · COUNT DOWN',lead:true,example:true,sourcePages:[273]}),
  s({id:'h7p-74-max-min',slideId:'ch7-book-74-max-min',role:'process',eyebrow:'7.4.3 · MAXIMUM / MINIMUM',lead:true,example:true,sourcePages:[273,274]}),
  s({id:'h7p-74-average',slideId:'ch7-book-74-average',role:'process',eyebrow:'7.4.3 · AVERAGE',lead:true,example:true,activity:true,sourcePages:[274]}),
  s({id:'h7p-74-linear-search',slideId:'ch7-book-74-linear-search',role:'process',eyebrow:'7.4.4 · LINEAR SEARCH',lead:true,bullets:[0,5],activity:true,sourcePages:[274,275]}),
  s({id:'h7p-74-count-matches',slideId:'ch7-book-74-count-matches',role:'process',eyebrow:'7.4.4 · COUNT ALL MATCHES',lead:true,example:true,sourcePages:[275]}),
  s({id:'h7p-74-bubble-concept',slideId:'ch7-book-74-bubble',role:'process',eyebrow:'7.4.5 · BUBBLE SORT',lead:true,bullets:[0,4],sourcePages:[276]}),
  s({id:'h7p-74-bubble-pass',slideId:'ch7-book-74-bubble',role:'challenge',eyebrow:'7.4.5 · ONE PASS',title:'Move the largest unsorted value toward the end',activity:true,sourcePages:[276]}),
  s({id:'h7p-74-bubble-code',slideId:'ch7-book-74-bubble-code',role:'visual',eyebrow:'7.4.5 · SOURCE PSEUDOCODE',lead:true,example:true,sourcePages:[276]}),
];

const TOPIC_75:AuthoredSceneSpec[]=[
  s({id:'h7p-75-difference',slideId:'ch7-book-75-difference',role:'compare',eyebrow:'7.5 · VALIDATION VS VERIFICATION',lead:true,keyTerms:[0,2],activity:true,sourcePages:[276]}),
  s({id:'h7p-75-checks',slideId:'ch7-book-75-validation-list',role:'concept',eyebrow:'7.5.1 · SIX VALIDATION CHECKS',lead:true,bullets:[0,6],sourcePages:[277]}),
  s({id:'h7p-75-range-code',slideId:'ch7-book-75-range',role:'process',eyebrow:'7.5.1 · RANGE CHECK',lead:true,example:true,sourcePages:[277]}),
  s({id:'h7p-75-range-check',slideId:'ch7-book-75-range',role:'challenge',eyebrow:'7.5.1 · RANGE CHECK',title:'Classify boundary and out-of-range values',activity:true,sourcePages:[277]}),
  s({id:'h7p-75-length',slideId:'ch7-book-75-length',role:'compare',eyebrow:'7.5.1 · LENGTH CHECK',lead:true,bullets:[0,2],activity:true,sourcePages:[277]}),
  s({id:'h7p-75-type-presence',slideId:'ch7-book-75-type-presence',role:'compare',eyebrow:'7.5.1 · TYPE VS PRESENCE',lead:true,example:true,activity:true,sourcePages:[278]}),
  s({id:'h7p-75-format-checkdigit',slideId:'ch7-book-75-format-checkdigit',role:'compare',eyebrow:'7.5.1 · FORMAT VS CHECK DIGIT',lead:true,bullets:[0,3],activity:true,sourcePages:[279]}),
  s({id:'h7p-75-isbn',slideId:'ch7-book-75-findout-isbn',role:'challenge',eyebrow:'7.5.1 · ISBN INVESTIGATION',lead:true,bullets:[0,2],activity:true,sourcePages:[279]}),
  s({id:'h7p-75-activity77',slideId:'ch7-book-75-activity77',role:'challenge',eyebrow:'ACTIVITY 7.7 · VALIDATION ALGORITHMS',lead:true,activity:true,sourcePages:[280]}),
  s({id:'h7p-75-verification',slideId:'ch7-book-75-verification',role:'compare',eyebrow:'7.5.2 · VERIFICATION METHODS',lead:true,keyTerms:[0,2],bullets:[0,1],sourcePages:[280]}),
];

const TOPIC_76:AuthoredSceneSpec[]=[
  s({id:'h7p-76-bridge',slideId:'ch7-book-76-activity78',role:'hook',eyebrow:'7.6 · STARTER',title:'Valid-looking data can still be copied incorrectly',lead:true,activity:true,sourcePages:[281]}),
  s({id:'h7p-76-testdata',slideId:'ch7-book-76-testdata',role:'process',eyebrow:'7.6.1 · TEST-DATA METHOD',lead:true,bullets:[0,4],sourcePages:[281]}),
  s({id:'h7p-76-normal',slideId:'ch7-book-76-normal',role:'concept',eyebrow:'7.6 · NORMAL DATA',lead:true,example:true,activity:true,sourcePages:[281]}),
  s({id:'h7p-76-abnormal',slideId:'ch7-book-76-abnormal',role:'compare',eyebrow:'7.6 · ABNORMAL / ERRONEOUS DATA',lead:true,example:true,activity:true,sourcePages:[282]}),
  s({id:'h7p-76-boundary',slideId:'ch7-book-76-extreme-boundary',role:'compare',eyebrow:'7.6 · EXTREME VS BOUNDARY',lead:true,bullets:[0,3],activity:true,sourcePages:[282]}),
];

const TOPIC_77:AuthoredSceneSpec[]=[
  s({id:'h7p-77-trace-rules',slideId:'ch7-book-77-trace-intro',role:'process',eyebrow:'7.7 · TRACE TABLES + DRY RUNS',lead:true,bullets:[0,4],sourcePages:[283]}),
  s({id:'h7p-77-worked-trace',slideId:'ch7-book-77-trace-worked',role:'visual',eyebrow:'TABLE 7.4 · COMPLETED TRACE',lead:true,example:true,sourcePages:[284]}),
  s({id:'h7p-77-worked-challenge',slideId:'ch7-book-77-trace-worked',role:'challenge',eyebrow:'7.7 · REBUILD THE TRACE',title:'Record every change before revealing the result',activity:true,sourcePages:[284]}),
  s({id:'h7p-77-activity712',slideId:'ch7-book-77-activity712',role:'challenge',eyebrow:'ACTIVITY 7.12 · NEW DATA SET',lead:true,activity:true,sourcePages:[284]}),
  s({id:'h7p-77-pseudocode',slideId:'ch7-book-77-same-pseudo',role:'visual',eyebrow:'FLOWCHART ↔ PSEUDOCODE',lead:true,example:true,bullets:[0,2],sourcePages:[284]}),
];

const TOPIC_78:AuthoredSceneSpec[]=[
  s({id:'h7p-78-trace-errors',slideId:'ch7-book-78-activity71314',role:'challenge',eyebrow:'ACTIVITIES 7.13–7.14 · EXPOSE THE BUG',lead:true,bullets:[0,2],activity:true,sourcePages:[285]}),
  s({id:'h7p-78-negative',slideId:'ch7-book-78-negative',role:'challenge',eyebrow:'ACTIVITY 7.15 · RANGE ASSUMPTION',lead:true,bullets:[0,2],activity:true,sourcePages:[286]}),
  s({id:'h7p-78-fixed-limits',slideId:'ch7-book-78-activity716',role:'challenge',eyebrow:'ACTIVITY 7.16 · FIXED LIMITS STILL FAIL',lead:true,activity:true,sourcePages:[286]}),
  s({id:'h7p-78-first-value',slideId:'ch7-book-78-first-value',role:'process',eyebrow:'FIGURE 7.17 · ROBUST INITIALISATION',lead:true,bullets:[0,5],sourcePages:[287]}),
  s({id:'h7p-78-retest',slideId:'ch7-book-78-activity717',role:'challenge',eyebrow:'ACTIVITY 7.17 · FIX + RETEST',lead:true,activity:true,sourcePages:[287]}),
];

const TOPIC_79:AuthoredSceneSpec[]=[
  s({id:'h7p-79-workflow-a',slideId:'ch7-book-79-eight-stages',role:'process',eyebrow:'7.9 · EIGHT-STAGE WORKFLOW',title:'Specify, decompose, plan data and structure',lead:true,bullets:[0,4],sourcePages:[288]}),
  s({id:'h7p-79-workflow-b',slideId:'ch7-book-79-eight-stages',role:'process',eyebrow:'7.9 · EIGHT-STAGE WORKFLOW',title:'Represent, construct, test, correct',bullets:[4,8],sourcePages:[288]}),
  s({id:'h7p-79-structure-flow',slideId:'ch7-book-79-fig1819',role:'compare',eyebrow:'FIGURES 7.18–7.19 · TWO VIEWS',lead:true,activity:true,sourcePages:[288]}),
  s({id:'h7p-79-ticket-code',slideId:'ch7-book-79-example1',role:'visual',eyebrow:'EXAMPLE 1 · CONCERT TICKETS',lead:true,example:true,sourcePages:[289]}),
  s({id:'h7p-79-ticket-tests',slideId:'ch7-book-79-example1',role:'challenge',eyebrow:'ACTIVITY 7.18 · TARGET THE BOUNDARIES',title:'Choose data for validity and discount thresholds',activity:true,sourcePages:[289]}),
  s({id:'h7p-79-school-overview',slideId:'ch7-book-79-example2',role:'process',eyebrow:'EXAMPLE 2 · SCHOOL RESULTS',lead:true,bullets:[0,6],sourcePages:[290,291]}),
  s({id:'h7p-79-school-code',slideId:'ch7-book-79-example2',role:'visual',eyebrow:'EXAMPLE 2 · FULL SOURCE LOGIC',title:'Nested loops + CASE + validation + totals + extremes',example:true,sourcePages:[290,291]}),
  s({id:'h7p-79-readability',slideId:'ch7-book-79-comments',role:'concept',eyebrow:'7.9 · READABILITY',lead:true,bullets:[0,4],sourcePages:[290]}),
  s({id:'h7p-79-activity719',slideId:'ch7-book-79-activity719',role:'challenge',eyebrow:'ACTIVITY 7.19 · MANUAL DRY RUN',lead:true,activity:true,sourcePages:[291]}),
  s({id:'h7p-79-activity720',slideId:'ch7-book-79-activity720',role:'challenge',eyebrow:'ACTIVITY 7.20 · CHOOSE THE LOOP',lead:true,activity:true,sourcePages:[292]}),
  s({id:'h7p-79-ch8-link',slideId:'ch7-book-79-ch8-link',role:'concept',eyebrow:'COURSEBOOK LINK · CHAPTER 8',lead:true,bullets:[0,3],sourcePages:[292]}),
  s({id:'h7p-79-adt',slideId:'ch7-book-ext-stackqueue',role:'compare',eyebrow:'EXTENSION · STACK VS QUEUE',lead:true,keyTerms:[0,3],bullets:[0,3],sourcePages:[292]}),
  s({id:'h7p-79-adt-operations',slideId:'ch7-book-ext-operations',role:'process',eyebrow:'FIGURES 7.21–7.22 · ADT OPERATIONS',lead:true,bullets:[0,6],activity:true,sourcePages:[293]}),
  s({id:'h7p-79-review',slideId:'ch7-book-review',role:'recap',eyebrow:'CHAPTER 7 · COMPLETE REVIEW',lead:true,bullets:[0,9],activity:true,sourcePages:[293]}),
  s({id:'h7p-79-keyterms-a',slideId:'ch7-book-keyterms-a',role:'concept',eyebrow:'KEY TERMS · DEVELOPMENT + DECOMPOSITION',lead:true,keyTerms:[0,7],sourcePages:[294]}),
  s({id:'h7p-79-keyterms-b',slideId:'ch7-book-keyterms-b',role:'concept',eyebrow:'KEY TERMS · SYSTEMS + ALGORITHMS',lead:true,keyTerms:[0,8],sourcePages:[294]}),
  s({id:'h7p-79-keyterms-c',slideId:'ch7-book-keyterms-c',role:'concept',eyebrow:'KEY TERMS · TESTING + VALIDATION',lead:true,keyTerms:[0,11],sourcePages:[294]}),
  s({id:'h7p-79-exam12',slideId:'ch7-book-exam-1-2',role:'exam',eyebrow:'EXAM-STYLE · QUESTIONS 1–2',lead:true,bullets:[0,1],activity:true,sourcePages:[295]}),
  s({id:'h7p-79-exam3',slideId:'ch7-book-exam-3',role:'exam',eyebrow:'EXAM-STYLE · QUESTION 3',lead:true,bullets:[0,4],sourcePages:[295]}),
  s({id:'h7p-79-exam45',slideId:'ch7-book-exam-4-5',role:'exam',eyebrow:'EXAM-STYLE · QUESTIONS 4–5',lead:true,bullets:[0,2],sourcePages:[295]}),
  s({id:'h7p-79-exam6a',slideId:'ch7-book-exam-6a',role:'exam',eyebrow:'EXAM-STYLE · QUESTION 6A',lead:true,activity:true,sourcePages:[296]}),
  s({id:'h7p-79-exam6bc',slideId:'ch7-book-exam-6bc',role:'exam',eyebrow:'EXAM-STYLE · QUESTION 6B–C',lead:true,bullets:[0,2],activity:true,sourcePages:[296]}),
  s({id:'h7p-79-exam7',slideId:'ch7-book-exam-7',role:'exam',eyebrow:'EXAM-STYLE · QUESTION 7',lead:true,example:true,bullets:[0,4],sourcePages:[297]}),
  s({id:'h7p-79-exam8',slideId:'ch7-book-exam-8',role:'exam',eyebrow:'EXAM-STYLE · QUESTION 8',lead:true,bullets:[0,1],activity:true,sourcePages:[298]}),
  s({id:'h7p-79-exam9',slideId:'ch7-book-exam-9',role:'exam',eyebrow:'EXAM-STYLE · QUESTION 9',lead:true,bullets:[0,2],activity:true,sourcePages:[298]}),
];

const TOPIC_SOURCE_PAGES:Readonly<Record<string,number[]>>={
  '7.1':[258,259], '7.2':[260,261,262,263,264,265,266,267,268,269,270], '7.3':[271],
  '7.4':[272,273,274,275,276], '7.5':[276,277,278,279,280], '7.6':[281,282],
  '7.7':[283,284], '7.8':[285,286,287], '7.9':[288,289,290,291,292,293,294,295,296,297,298],
};

function opening(topicCode:string):LessonPresentationBeat[] {
  const pages=TOPIC_SOURCE_PAGES[topicCode]??[];
  const first=pages[0]??258;
  const last=pages.at(-1)??first;
  const anchor:Record<string,string>={
    '7.1':'ch7-book-71-five-stages','7.2':'ch7-book-72-system','7.3':'ch7-book-73-purpose','7.4':'ch7-book-74-overview',
    '7.5':'ch7-book-75-difference','7.6':'ch7-book-76-testdata','7.7':'ch7-book-77-trace-intro','7.8':'ch7-book-78-activity71314','7.9':'ch7-book-79-eight-stages',
  };
  const goals:Record<string,string[]>={
    '7.1':['Explain the five development-life-cycle stages and the purpose of each.','Use abstraction and decomposition during analysis.','Distinguish design, coding/iterative testing and final testing.'],
    '7.2':['Decompose a computer system with top-down design and IPOS.','Use structure diagrams and standard flowchart symbols appropriately.','Write readable pseudocode using assignment, selection, iteration, comparison and I/O conventions.'],
    '7.3':['State what an algorithm achieves before describing individual lines.','Separate overall purpose from the processes used to achieve it.'],
    '7.4':['Recognise and reuse totalling, counting, max/min/average, linear-search and bubble-sort patterns.','Initialise each standard method correctly and trace its state changes.'],
    '7.5':['Distinguish validation from verification.','Select and apply range, length, type, presence, format and check-digit validation.','Explain double-entry and visual/screen verification.'],
    '7.6':['Choose normal, abnormal, extreme and boundary test data.','State expected results before running a test and compare them with actual results.'],
    '7.7':['Dry-run an algorithm step by step.','Record every variable change and output in a trace table and infer algorithm purpose from behaviour.'],
    '7.8':['Use test data and traces to locate faulty assumptions.','Correct the algorithm and retest with data that exposes the original bug.'],
    '7.9':['Apply the eight-stage workflow to design readable algorithms.','Combine validation, loops, CASE, totals, extremes and testing in complete solutions.','Answer integrated exam-style questions using the chapter methods.'],
  };
  return [
    authoredStaticScene(`h7p-${topicCode.replace('.','')}-hook`,anchor[topicCode]??'ch7-book-00-route','hook',`${topicCode} · STARTER`,
      `Which decisions and state changes must be made visible to prove the ${topicCode} method works?`,[first,last],{
        lead:'Start from the source problem or process, then make every required step, condition and state change explicit.',
      }),
    authoredStaticScene(`h7p-${topicCode.replace('.','')}-objectives`,anchor[topicCode]??'ch7-book-00-route','objective',`${topicCode} · LESSON GOALS`,
      `By the end of ${topicCode} you should be able to…`,[first,last],{bullets:goals[topicCode]??[]}),
  ];
}

function recap(topicCode:string,slideId:string,bullets:string[]):LessonPresentationBeat {
  const pages=TOPIC_SOURCE_PAGES[topicCode]??[];
  return authoredStaticScene(`h7p-${topicCode.replace('.','')}-recap`,slideId,'recap',`${topicCode} · RETRIEVAL`,
    'Reconstruct the method without the book',pages.length?[pages[0]!,pages.at(-1)!]:[],{bullets});
}

const SPECS:Readonly<Record<string,AuthoredSceneSpec[]>>={
  '7.1':TOPIC_71,'7.2':TOPIC_72,'7.3':TOPIC_73,'7.4':TOPIC_74,'7.5':TOPIC_75,'7.6':TOPIC_76,'7.7':TOPIC_77,'7.8':TOPIC_78,'7.9':TOPIC_79,
};

const RECAP_BULLETS:Readonly<Record<string,string[]>>={
  '7.1':['Analysis establishes requirements using abstraction and decomposition.','Design defines how the solution will work.','Coding implements modules with iterative testing; final testing checks the completed program.','Maintenance follows after deployment as the fifth life-cycle stage.'],
  '7.2':['Hierarchy: system → sub-systems → single-action components.','Representation: structure diagram for hierarchy; flowchart/pseudocode for ordered behaviour.','Selection: IF/CASE; iteration: FOR/REPEAT/WHILE.','Conditions and I/O must follow the coursebook pseudocode conventions precisely.'],
  '7.3':['Purpose describes the overall task and result.','Processes describe the important actions that make the result happen.','Use actual inputs, conditions and outputs as evidence.'],
  '7.4':['Total accumulates values; count records occurrences.','Max/min requires safe initialisation; average = total ÷ count.','Linear search checks sequentially; counting matches may require the full list.','Bubble sort compares adjacent values, swaps when needed and shrinks the unchecked end.'],
  '7.5':['Validation asks whether input is reasonable; verification asks whether it was copied accurately.','Range, length, type, presence, format and check digit solve different validation rules.','Rejected input needs a re-entry route.','Check digit is a data-entry check here; transferred-data parity/checksum belongs to the Chapter 2 context.'],
  '7.6':['Normal should be accepted; abnormal should be rejected.','Extreme values are the valid limits.','Boundary testing pairs an accepted limit with the adjacent rejected value.','Always state expected results before comparing with actual behaviour.'],
  '7.7':['Record initial state, every variable change and every output.','Follow the exact input order and loop/condition order.','A trace table is evidence of the dry run, not only a shortcut to the final answer.','The worked source trace ends with maximum 15 and minimum 2.'],
  '7.8':['A trace exposes where actual state diverges from expected behaviour.','Fixed “large” provisional limits are still assumptions unless the specification guarantees a range.','Initialising max and min from the first input removes that hidden range assumption.','Retest the corrected algorithm with the data that exposed the original fault.'],
  '7.9':['Specify → decompose → plan data → structure → represent → construct → test → correct.','Use meaningful identifiers, comments and precise conditions.','Choose loops from the repetition rule and test using normal, abnormal and boundary data.','Dry-run integrated solutions and justify every validation, verification and control-flow choice.'],
};

const RECAP_SLIDE:Readonly<Record<string,string>>={
  '7.1':'ch7-book-71-testing','7.2':'ch7-book-72-input-output','7.3':'ch7-book-73-activity76','7.4':'ch7-book-74-bubble-code',
  '7.5':'ch7-book-75-verification','7.6':'ch7-book-76-extreme-boundary','7.7':'ch7-book-77-same-pseudo','7.8':'ch7-book-78-activity717','7.9':'ch7-book-review',
};

export function chapter7PresentationStoryboard(topicCode:string,slides:readonly HodderLessonSlide[]):LessonPresentationBeat[]|null {
  if(topicCode==='overview')return buildAuthoredStoryboard(slides,OVERVIEW);
  const specs=SPECS[topicCode];
  if(!specs)return null;
  const result=[...opening(topicCode),...buildAuthoredStoryboard(slides,specs)];
  if(topicCode!=='7.9')result.push(recap(topicCode,RECAP_SLIDE[topicCode]!,RECAP_BULLETS[topicCode]!));
  return result;
}
