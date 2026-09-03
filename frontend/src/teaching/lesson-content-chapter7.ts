import type { LessonSlide } from './lesson-content-full';

export type Chapter7LessonChapter = {
  number: 7;
  level: 'IGCSE';
  title: string;
  subtitle: string;
  subtopics: string[];
  sourceNote: string;
  coverage: string;
  slides: LessonSlide[];
};

const slides: LessonSlide[] = [
  {
    id: 'ch7-01-challenge',
    section: 'The Challenge',
    eyebrow: '0478 · CHAPTER 07 · CLASSROOM CHALLENGE',
    title: 'Build an automatic school canteen ordering system',
    lead: 'Your job is to work out exactly what the system must do and create a solution that another person can follow.',
    bullets: [
      'Burger — 20,000 UZS',
      'Pizza — 25,000 UZS',
      'Sandwich — 15,000 UZS',
      'The system must accept a food choice, find its price, check the payment and calculate change when needed.',
    ],
    activity: {
      title: 'Read the challenge',
      prompt: 'Write one sentence that states the final job of the system. Do not write commands yet.',
      reveal: 'Example: The system takes a food choice and payment, then shows the correct change or a not-enough-money message.',
    },
    accent: 'indigo',
  },
  {
    id: 'ch7-02-understand',
    section: 'The Challenge',
    eyebrow: 'STEP 1 · DEFINE THE JOB',
    title: 'Complete the system requirements table',
    lead: 'Use the canteen scenario only. Write exactly what goes into the system, what the system must do, and what it must show.',
    bullets: [
      'INPUT: Write the two pieces of information the user must provide.',
      'PROCESS: Write the three actions the system must perform.',
      'OUTPUT: Write what the user must see at the end.',
    ],
    activity: {
      title: 'Fill all three columns',
      prompt: 'Write at least two items under INPUT, three under PROCESS and one under OUTPUT. Every item must come from the canteen scenario.',
      reveal: 'INPUT: food choice, amount paid. PROCESS: find price, compare payment with price, calculate change. OUTPUT: change or “Not enough money”.',
    },
    accent: 'cyan',
  },
  {
    id: 'ch7-03-small-jobs',
    section: 'The Challenge',
    eyebrow: 'STEP 2 · BREAK THE BIG JOB INTO SMALL JOBS',
    title: 'Create one action card for each small job',
    lead: 'Each card must contain one action only. Start every card with a verb.',
    bullets: [
      'Create six action cards.',
      'Do not put two actions on one card.',
      'Make sure the cards cover food choice, price, payment and final result.',
      'When finished, arrange related cards next to each other.',
    ],
    activity: {
      title: 'Six action cards',
      prompt: 'Write six cards, then place them into 2–4 sensible groups. Be ready to explain why each card belongs in its group.',
      reveal: 'One possible set: choose food · find price · receive payment · check payment · calculate change · show result.',
    },
    accent: 'emerald',
  },
  {
    id: 'ch7-04-filter',
    section: 'The Challenge',
    eyebrow: 'STEP 3 · KEEP ONLY USEFUL INFORMATION',
    title: 'Sort the 12 fact cards into KEEP and IGNORE',
    lead: 'Keep a fact only if it can change an input, a calculation, a choice between two paths, or the final output.',
    activity: {
      title: 'KEEP or IGNORE',
      prompt: 'Move every fact card into one of the two groups. For each ignored fact, state why the system can work correctly without it.',
      reveal: 'KEEP: menu prices, food choice, amount paid, payment check and change calculation. IGNORE: wall colour, table count, cook’s name, number of students and school opening year.',
    },
    accent: 'amber',
  },
  {
    id: 'ch7-05-hierarchy',
    section: 'Build the Solution',
    eyebrow: 'STEP 4 · ORGANISE THE PARTS',
    title: 'Arrange the cards in three levels',
    lead: 'Show the whole system at the top, its main parts in the middle, and the smaller actions underneath the correct main part.',
    bullets: [
      'Top level: one card for the whole canteen system.',
      'Middle level: three main parts — Food, Payment, Result.',
      'Bottom level: place each action card under the correct main part.',
      'Connect each lower card to the part it belongs to.',
    ],
    activity: {
      title: 'Build the hierarchy',
      prompt: 'Use all cards. No small action may be left unconnected, and each small action must belong to one main part.',
      reveal: 'Canteen system → Food: choose food, find price · Payment: receive payment, check payment, calculate change · Result: show result.',
    },
    accent: 'indigo',
  },
  {
    id: 'ch7-06-sequence',
    section: 'Build the Solution',
    eyebrow: 'STEP 5 · PUT THE ACTIONS IN ORDER',
    title: 'Show exactly what happens from start to finish',
    lead: 'Use arrows to show the order. When the system asks whether the payment is enough, split the path into YES and NO.',
    bullets: [
      'Start with the user choosing food.',
      'Find the correct price.',
      'Receive the payment.',
      'Ask: Is the payment enough?',
      'Complete both the YES path and the NO path.',
    ],
    activity: {
      title: 'Draw both paths',
      prompt: 'Add arrows between every step. The YES branch must calculate/show change. The NO branch must show “Not enough money”. Both branches must finish.',
      reveal: 'Start → choose food → find price → enter payment → Is payment enough? → YES: calculate/show change → End · NO: show “Not enough money” → End.',
    },
    accent: 'cyan',
  },
  {
    id: 'ch7-07-shapes',
    section: 'Build the Solution',
    eyebrow: 'STEP 6 · USE STANDARD SYMBOLS',
    title: 'Redraw the sequence using the correct shape for each type of step',
    lead: 'The shape must tell the reader what kind of step it is before they read the words inside it.',
    bullets: [
      'Oval — start or end.',
      'Rectangle — an action performed by the system.',
      'Parallelogram — information entering or leaving the system.',
      'Diamond — a question with two possible paths.',
      'Arrow — shows the next step.',
    ],
    activity: {
      title: 'Use every symbol correctly',
      prompt: 'Redraw the full canteen sequence. Label the two arrows leaving the diamond YES and NO.',
      reveal: 'The food/payment entries use parallelograms, calculations use rectangles, the payment question uses a diamond, and start/end use ovals.',
    },
    accent: 'emerald',
  },
  {
    id: 'ch7-08-structured-text',
    section: 'Precise Instructions',
    eyebrow: 'STEP 7 · WRITE THE SAME SOLUTION AS STRUCTURED TEXT',
    title: 'Write instructions that another person can follow without the diagram',
    lead: 'Use the keywords below. Keep the order and both branches exactly the same as your diagram.',
    bullets: ['START', 'INPUT', 'IF', 'THEN', 'ELSE', 'OUTPUT', 'END'],
    activity: {
      title: 'Write the complete instruction set',
      prompt: 'Use all seven keywords. Include food input, payment input, the payment check, the YES actions and the NO message.',
      reveal: 'START → INPUT food → find price → INPUT money → IF money >= price THEN calculate change and OUTPUT change ELSE OUTPUT “Not enough money” → END.',
    },
    accent: 'amber',
  },
  {
    id: 'ch7-09-command-cards',
    section: 'Precise Instructions',
    eyebrow: 'STEP 8 · PUT THE COMMAND CARDS IN THE ONLY ORDER THAT WORKS',
    title: 'Arrange the nine command cards',
    lead: 'The machine will follow the cards exactly as written. It will not guess missing steps or fix the order for you.',
    bullets: [
      'Use every card once.',
      'Number the cards 1–9.',
      'The price must be known before the payment is checked.',
      'The two possible results must stay inside the correct branches.',
    ],
    activity: {
      title: 'Order all nine cards',
      prompt: 'Arrange the cards from the first user input to END IF. Then read the sequence from top to bottom and check that every value is known before it is used.',
      reveal: 'ASK food → SET price TO ... → ASK money → IF money >= price → SET change TO money - price → SAY change → ELSE → SAY “Not enough money” → END IF.',
    },
    accent: 'rose',
  },
  {
    id: 'ch7-10-human-computer',
    section: 'Run the Solution',
    eyebrow: 'STEP 9 · YOU ARE THE COMPUTER',
    title: 'Follow the commands exactly — no guessing and no silent corrections',
    lead: 'Student A is the computer. Student B reads the command cards in order. Student A may do only what the next card says.',
    bullets: [
      'Case 1: Pizza + 30,000 UZS',
      'Case 2: Burger + 20,000 UZS',
      'Case 3: Sandwich + 10,000 UZS',
    ],
    activity: {
      title: 'Run all three cases',
      prompt: 'For each case, say the value of food, price, money and change as they are created. State the final output aloud.',
      reveal: 'Pizza → 5,000 UZS change. Burger → 0 UZS change. Sandwich → “Not enough money”.',
    },
    accent: 'indigo',
  },
  {
    id: 'ch7-11-predict-check',
    section: 'Run the Solution',
    eyebrow: 'STEP 10 · PREDICT FIRST, THEN CHECK',
    title: 'Complete every row of the results table',
    lead: 'Write the expected output before you run the commands. Then follow the commands and record the actual output.',
    bullets: [
      'Pizza — 30,000 UZS',
      'Burger — 20,000 UZS',
      'Sandwich — 10,000 UZS',
      'Pizza — 25,000 UZS',
      'Burger — 15,000 UZS',
    ],
    activity: {
      title: 'Expected vs actual',
      prompt: 'For all five rows: 1) write Expected, 2) follow the commands, 3) write Actual, 4) mark Match? YES or NO.',
      reveal: 'Expected outputs: 5,000 · 0 · Not enough money · 0 · Not enough money. A correct command sequence gives the same actual outputs.',
    },
    accent: 'cyan',
  },
  {
    id: 'ch7-12-bug',
    section: 'Run the Solution',
    eyebrow: 'STEP 11 · ONE SYMBOL CHANGES THE RESULT',
    title: 'Find and fix the error for an exact payment',
    lead: 'The command says IF money > price. A Burger costs 20,000 UZS and the customer pays exactly 20,000 UZS.',
    bullets: [
      'Write the expected output.',
      'Follow the current condition and write the actual output.',
      'Circle the symbol that causes the wrong path.',
      'Change one symbol only.',
      'Run three cases again: payment equal to, greater than and less than the price.',
    ],
    activity: {
      title: 'Correct one symbol',
      prompt: 'Change the condition so an exact payment is accepted. Then confirm that all three payment cases still behave correctly.',
      reveal: 'Change > to >=. Then re-run equal, greater and smaller payments.',
    },
    accent: 'rose',
  },
  {
    id: 'ch7-13-recap',
    section: 'What You Did',
    eyebrow: 'STEP 12 · REVIEW YOUR WORK',
    title: 'Tick every action you completed today',
    lead: 'Use this checklist to reconstruct the whole journey before the official Cambridge names are shown.',
    bullets: [
      'Defined what the system must receive, do and show.',
      'Split one large job into smaller jobs.',
      'Removed information that could not affect the result.',
      'Organised the whole system, main parts and small actions in levels.',
      'Showed the exact order and the two possible paths.',
      'Redrew the sequence with standard symbols.',
      'Expressed the same solution as structured text.',
      'Arranged machine-readable command cards.',
      'Ran several input cases and compared expected with actual results.',
      'Found an error, corrected it and re-ran different cases.',
    ],
    activity: {
      title: 'One-sentence summary',
      prompt: 'Write one sentence that explains what all twelve steps helped you achieve.',
      reveal: 'Example: We turned a real problem into a precise solution, checked how it behaved, corrected an error and confirmed the corrected result.',
    },
    accent: 'amber',
  },
  {
    id: 'ch7-14-reveal',
    section: 'Cambridge Terms',
    eyebrow: 'REVEAL · NOW NAME WHAT YOU HAVE ALREADY DONE',
    title: 'You have just worked through the Program Development Life Cycle',
    lead: 'Each classroom action now connects to the formal Cambridge Computer Science term.',
    keyTerms: [
      { term: 'Analysis', definition: 'Identify the problem, requirements, inputs, processing and outputs.' },
      { term: 'Decomposition', definition: 'Break a large problem into smaller, manageable parts.' },
      { term: 'Abstraction', definition: 'Keep relevant information and remove unnecessary detail.' },
      { term: 'Design', definition: 'Plan the solution before implementation.' },
      { term: 'Structure diagram', definition: 'Show the hierarchy of a system and the relationships between its parts.' },
      { term: 'Flowchart', definition: 'Show the sequence of an algorithm using standard symbols and arrows.' },
      { term: 'Pseudocode', definition: 'Express an algorithm as structured instructions that are not tied to one programming language.' },
      { term: 'Coding', definition: 'Implement the planned solution in a programming language.' },
      { term: 'Testing', definition: 'Use test data to compare expected and actual results and check that the program behaves correctly.' },
    ],
    accent: 'emerald',
  },
  {
    id: 'ch7-15-cambridge-check',
    section: 'Cambridge Terms',
    eyebrow: '0478 CHECKPOINT · CHAPTER 07',
    title: 'Match each action to the correct Cambridge term',
    lead: 'Write one term and one short reason for each item.',
    bullets: [
      'Remove “The canteen wall is yellow” because it cannot affect the result.',
      'Split the canteen system into Food, Payment and Result.',
      'Show “Is the payment enough?” as a diamond with YES and NO paths.',
      'Compare expected output with actual output for several input values.',
      'Turn the planned instructions into statements in a real programming language.',
    ],
    activity: {
      title: 'Five answers',
      prompt: 'For each statement, write: TERM — because ... . Use a different reason that refers to the action shown.',
      reveal: 'Abstraction · Decomposition · Flowchart · Testing · Coding.',
    },
    accent: 'indigo',
  },
];

export const CHAPTER_7: Chapter7LessonChapter = {
  number: 7,
  level: 'IGCSE',
  title: 'Algorithm design and problem-solving',
  subtitle: 'Program development life cycle — discover the process through a practical classroom challenge before learning the formal Cambridge terms.',
  subtopics: ['Analysis', 'Decomposition & abstraction', 'Structure diagrams', 'Flowcharts & pseudocode', 'Coding & testing'],
  sourceNote: 'Cambridge 0478 Chapter 7 classroom lesson. Content route grounded in the supplied 0478 syllabus/coursebook collection and adapted for board-first teaching.',
  coverage: 'Chapter 7 · guided discovery lesson',
  slides,
};

export const CHAPTER_7_REVEAL_ID = 'ch7-14-reveal';
