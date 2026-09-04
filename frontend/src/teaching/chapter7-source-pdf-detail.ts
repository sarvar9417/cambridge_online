import type { Chapter7SourceAtom } from './chapter7-source-atoms';

/**
 * Additive details from the exact supplied Chapter 7 PDF that are easy to lose
 * when a page is represented only by its main concept/example atom. This keeps
 * chapter objectives, source sidebars/cross-links and the full exam-style task
 * wording/data attached to existing presenter slides without replacing them.
 */
export const CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS: Chapter7SourceAtom[] = [
  {
    id:'ch7-p258-full-objectives-maintenance',printedPage:258,kind:'objective',sourceRef:'Chapter objectives · full source scope',targetSlideId:'ch7-book-71-five-stages',needles:[
      'program development cycle: analysis · design · coding · testing',
      'computer systems and sub-systems',
      'problem decomposition into component parts',
      'methods used to design and construct solutions to problems',
      'purpose of an algorithm and the processes involved in it',
      'standard methods: linear search · bubble sort · totalling · counting · finding average, maximum, minimum',
      'validation checks when data is input',
      'verification checks when data is input',
      'different types of test data including documentation of a dry run using a trace table',
      'writing, amending, identifying and correcting errors in flowcharts, programs and pseudocode',
      'program development life cycle has five stages: analysis, design, coding, testing and maintenance',
      'this chapter and Chapter 8 discuss analysis, design, coding and testing',
    ],
  },
  {
    id:'ch7-p259-findout-dressed',printedPage:259,kind:'extension',sourceRef:'Find out more · decomposition',targetSlideId:'ch7-book-71-decompose-dressed',needles:[
      'Decompose getting dressed further; it can get quite complicated to show all the details required.',
      'getting dressed: Select items to wear · Remove any clothes being worn · Put selected items on in order',
    ],
  },
  {
    id:'ch7-p260-findout-systems',printedPage:260,kind:'extension',sourceRef:'Find out more · everyday systems',targetSlideId:'ch7-book-72-system',needles:[
      'Find at least five computer systems you frequently use in your daily life and decide the size of each system.',
      'computer systems can be very large, very small or any size in between',
      'alarm app is a very small computer system; checking a weather forecast involves a larger system',
    ],
  },
  {
    id:'ch7-p262-findout-teeth',printedPage:262,kind:'extension',sourceRef:'Find out more · structure diagram',targetSlideId:'ch7-book-72-teeth',needles:[
      'Draw a structure diagram for cleaning your teeth.',
      'Ask another student to try out the system to see if it works.',
    ],
  },
  {
    id:'ch7-p268-findout-program',printedPage:268,kind:'extension',sourceRef:'Find out more · nested IF program',targetSlideId:'ch7-book-72-nested-if',needles:[
      'Programming is covered in Chapter 8.',
      'When you have started programming, write and test a program for this nested-IF algorithm.',
    ],
  },
  {
    id:'ch7-p269-array-link',printedPage:269,kind:'extension',sourceRef:'Link · arrays',targetSlideId:'ch7-book-72-loop-examples',needles:[
      'For more on arrays see Chapter 8.',
      'FOR loops are useful for reading values into lists with a known length.',
    ],
  },
  {
    id:'ch7-p278-typecheck-links',printedPage:278,kind:'extension',sourceRef:'Link / Find out more · whole-number type check',targetSlideId:'ch7-book-75-type-presence',needles:[
      'DIV and related programming concepts are covered in Chapter 8.',
      'Find out how you could test for a whole number and write and test a program for this validation rule.',
    ],
  },
  {
    id:'ch7-p279-isbn-findout',printedPage:279,kind:'extension',sourceRef:'Link / Find out more · ISBN and checks',targetSlideId:'ch7-book-75-findout-isbn',needles:[
      'ISBN and modulo-11 check digit calculations are covered in Chapter 2.',
      'Find an ISBN and show that its check digit is correct.',
      'Working in pairs, copy one ISBN with a transposition error and another correctly; swap and identify the error.',
      'Look at a correct ISBN and identify an error this check-digit system will not detect, explaining why.',
      'Find out how limit checks and consistency checks are used.',
    ],
  },
  {
    id:'ch7-p280-parity-link',printedPage:280,kind:'extension',sourceRef:'Link · transmission checks',targetSlideId:'ch7-book-75-verification',needles:[
      'Parity checks and checksums are used when data is transferred within a computer system or across a network.',
      'Parity checks and checksums are discussed in Chapter 2.',
    ],
  },
  {
    id:'ch7-p291-findout-programs',printedPage:291,kind:'extension',sourceRef:'Find out more · Examples 1 and 2',targetSlideId:'ch7-book-79-example2',needles:[
      'Programming is covered in Chapter 8.',
      'When you have started programming, write and test programs for Examples 1 and 2.',
      'More practice on writing algorithms is given in Chapter 8.',
    ],
  },
  {
    id:'ch7-p295-exam-q1-q2',printedPage:295,kind:'exam',sourceRef:'Exam-style Questions 1–2 · exact task content',targetSlideId:'ch7-book-exam-1-2',needles:[
      'Q1 [8]: A solution to a problem is decomposed into its component parts. Name and describe the component parts.',
      'Q2 [6]: A computer system is to provide a modulo 11 check digit for numbers from 4 to 20 digits in length. Provide a structure diagram for this computer system.',
    ],
  },
  {
    id:'ch7-p295-exam-q3',printedPage:295,kind:'exam',sourceRef:'Exam-style Question 3 · exact task content',targetSlideId:'ch7-book-exam-3',needles:[
      'Phone app splits a restaurant bill for up to 12 diners and bills from $10 to $500.',
      'Q3a [2]: What validation checks should be used for the number of diners and the size of the bill?',
      'Q3b [4]: Provide two sets of normal data and their expected results.',
      'Q3c [1]: Provide some abnormal/erroneous data.',
      'Q3d [4]: Identify the boundary data required and the expected results.',
    ],
  },
  {
    id:'ch7-p295-exam-q4-q5',printedPage:295,kind:'exam',sourceRef:'Exam-style Questions 4–5 · exact task content',targetSlideId:'ch7-book-exam-4-5',needles:[
      'Q4 [4]: Explain what is meant by validation and verification.',
      'Q5 [8]: Online form data: Name · Date of birth · Password · Phone number.',
      'For each item state, with reasons, the validation and verification checks that should be used on the input data.',
    ],
  },
  {
    id:'ch7-p296-exam-q6-flow',printedPage:296,kind:'exam',sourceRef:'Exam-style Question 6 · flowchart logic',targetSlideId:'ch7-book-exam-6a',needles:[
      'Algorithm checks the size of a consignment of ten parcels; Length and Breadth are input in centimetres.',
      'initialise Counter ← 0 · Accept ← 0 · Reject ← 0',
      'reject path if Length > 30',
      'reject path if Breadth > 30',
      'Size ← Length * Breadth; reject if Size > 600',
      'otherwise Accept ← Accept + 1; rejected parcels use Reject ← Reject + 1',
      'Counter ← Counter + 1; repeat until Counter >= 10; OUTPUT Accept, Reject',
    ],
  },
  {
    id:'ch7-p297-exam-q6-data',printedPage:297,kind:'exam',sourceRef:'Exam-style Question 6 · trace data and tasks',targetSlideId:'ch7-book-exam-6a',needles:[
      'Trace data: 15, 10, 20, 17, 32, 10, 30, 35, 30, 15, 30, 28, 25, 25, 20, 15, 40, 20, 12, 10',
      'Trace columns: Counter · Length · Breadth · Volume · OUTPUT',
      'Q6a [5]: dry run the algorithm using the supplied data and trace table.',
      'Q6b [3]: State the processes included in this algorithm.',
      'Q6c [3]: Identify the rules required to accept a parcel.',
    ],
  },
  {
    id:'ch7-p297-exam-q7',printedPage:297,kind:'exam',sourceRef:'Exam-style Question 7 · faulty pseudocode',targetSlideId:'ch7-book-exam-7',needles:[
      'Faulty algorithm is intended to add 10 positive numbers and output the total.',
      'Counter ← 1; FOR Counter ← 1 TO 10; REPEAT; OUTPUT "Enter a positive whole number "; INPUT Number; UNTIL Number < 0; Total ← Total + Counter; Counter ← Counter + 1; OUTPUT Total; NEXT Number',
      'Q7a [5]: Identify all the errors in the algorithm.',
      'Q7b [4]: Rewrite the algorithm so that it is effective and error free.',
      'Q7c [4]: Set up a trace table and test data to dry run the rewritten algorithm.',
      'Q7d [3]: Identify which test data are normal, erroneous and extreme.',
    ],
  },
  {
    id:'ch7-p297-298-exam-q8',printedPage:298,kind:'exam',sourceRef:'Exam-style Question 8 · calculator trace and alternative conditional',targetSlideId:'ch7-book-exam-8',needles:[
      'Algorithm inputs two non-zero numbers and a sign, performs +, -, * or /, and a zero first number terminates the process.',
      'Input data: 5, 7, +, 6, 2, -, 4, 3, *, 7, 8, ?, 0, 0, /',
      'Trace columns: Number1 · Number2 · Sign · Answer · OUTPUT',
      'Q8a [3]: Complete the trace table for the input data.',
      'Q8b [3]: Improve the algorithm by writing an alternative type of conditional statement in pseudocode.',
      'Cambridge IGCSE Computer Science (0478) Paper 22 Q3, June 2018',
    ],
  },
  {
    id:'ch7-p298-exam-q9',printedPage:298,kind:'exam',sourceRef:'Exam-style Question 9 · verification/validation',targetSlideId:'ch7-book-exam-9',needles:[
      'Routine stores contributor Name, email address and password for a website discussion group.',
      'Q9a [4]: Explain why verification was chosen and describe how the programmer would verify this data.',
      'Q9b [2]: Describe validation checks that could be used for the email address and the password.',
      'Cambridge IGCSE Computer Science (0478) Paper 22 Q4, June 2018',
    ],
  },
];
