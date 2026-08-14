/**
 * Pure-data transcript of Cambridge International AS & A Level Computer
 * Science 9618/12 Paper 1 Theory Fundamentals, May/June 2023, transcribed from
 * the published question paper and mark scheme (© UCLES 2023, used for
 * internal teaching).
 *
 * Same LaTeX/KaTeX contract as `paper-9618-s23-11.ts` (see
 * `backend/src/lib/latex.ts`): `$...$` segments are maths, everything outside
 * them is plain text. Subtopics are linked by 2026 syllabus code.
 *
 * This file has no imports and no side effects so the transcript can be unit
 * tested without a database.
 */

import type {
  SeedNode,
  SeedLeaf,
  SeedScheme,
  Command,
  AnswerKind,
  Ao,
} from './paper-9618-s23-11.js';

const point = (
  code: string,
  text: string,
  extra: Partial<SeedScheme['points'][number]> = {},
): SeedScheme['points'][number] => ({
  code,
  text,
  textLatex: text,
  ...extra,
});

const any = (code: string, text: string): SeedScheme['points'][number] => ({
  code,
  text,
  textLatex: text,
  marks: 1,
  groupLabel: 'Points',
});

/** "1 mark each to max N" → any-n-from-m with a single point of entry. */
function maxFrom(texts: string[], cap: number): SeedScheme {
  return {
    type: 'any_n_from_m',
    maxMarks: cap,
    groups: [{ label: 'Points', nRequired: 1, marksPerPoint: 1, maxMarks: cap }],
    points: texts.map((text, index) => any(`MP${index + 1}`, text)),
  };
}

/** Exact required items, one point each, all needed. */
function allRequired(texts: string[], guidance?: string): SeedScheme {
  return {
    type: 'all_required',
    maxMarks: texts.length,
    guidance,
    points: texts.map((text, index) => point(`MP${index + 1}`, text)),
  };
}

export const PAPER_12: SeedNode[] = [
  {
    path: '1',
    label: '1',
    displayRef: '9618/12/M/J/23 Q1',
    contextLatex: 'A company has a LAN (local area network).',
    children: [
      {
        path: '1.a',
        label: 'a',
        stemLatex: 'Give two benefits of connecting computers to a LAN.',
        command: 'Give',
        marks: 2,
        ao: 'AO1',
        answerLines: 4,
        subtopics: ['2.1'],
        scheme: maxFrom(
          [
            'Allows the sharing of files/data // allows communication between the devices',
            'Allows the sharing of resources e.g. hardware / software (applications)',
            'Allows central management // by example, backup, security, etc.',
          ],
          2,
        ),
      },
      {
        path: '1.b',
        label: 'b',
        stemLatex: 'Give two characteristics of a LAN.',
        command: 'Give',
        marks: 2,
        ao: 'AO1',
        answerLines: 4,
        subtopics: ['2.1'],
        scheme: maxFrom(
          [
            'Covers a small geographical area',
            'The infrastructure is privately owned // not controlled by external organisations',
          ],
          2,
        ),
      },
      {
        path: '1.c',
        label: 'c',
        stemLatex:
          'One of the company’s offices has one server and four computers connected in a star topology. Draw a diagram to show the layout of the office’s star topology.',
        command: 'Draw',
        marks: 2,
        ao: 'AO2',
        answerKind: 'diagram',
        answerLines: 8,
        subtopics: ['2.1'],
        scheme: maxFrom(
          [
            'Each computer directly connected only to the server',
            '… all components correctly labelled',
          ],
          2,
        ),
      },
      {
        path: '1.d',
        label: 'd',
        stemLatex: 'Computers can be connected using Ethernet. Describe what is meant by Ethernet.',
        command: 'Describe',
        marks: 3,
        ao: 'AO1',
        answerLines: 6,
        subtopics: ['2.1'],
        scheme: maxFrom(
          [
            'A protocol (suite)',
            'For data transmission over standard / universal wired / cabled network connections',
            'Uses Carrier Sense Multiple Access / Collision Detection (CSMA/CD)',
            'Data is transmitted in frames',
            '… each frame has a source and destination (IP/MAC) address',
            '… and error checking data (so damaged frames can be resent)',
          ],
          3,
        ),
      },
      {
        path: '1.e',
        label: 'e',
        stemLatex:
          'The network runs as a thick‑client model. Describe what is meant by a thick‑client model.',
        command: 'Describe',
        marks: 2,
        ao: 'AO1',
        answerLines: 4,
        subtopics: ['2.1'],
        scheme: maxFrom(
          [
            'The server performs minimal / some processing for the client',
            'The clients also do most of their own processing/work independently // most of the resources are installed locally',
          ],
          2,
        ),
      },
    ],
  },
  {
    path: '2',
    label: '2',
    displayRef: '9618/12/M/J/23 Q2',
    contextLatex:
      'A horse riding school uses a database, Lessons, to store data about lesson bookings. This database is created and managed using a Database Management System (DBMS).',
    children: [
      {
        path: '2.a',
        label: 'a',
        stemLatex:
          'The table contains names and descriptions of DBMS features and tools. Complete the table by writing down the missing names and descriptions.\n\n$\\begin{array}{|l|l|} \\hline \\text{Name} & \\text{Description} \\\\ \\hline \\text{Data dictionary} & \\\\[0.6em] \\hline \\text{Query processor} & \\\\[0.6em] \\hline & \\text{A model of a database that is not specific to one DBMS.} \\\\[0.6em] \\hline & \\text{A software tool that allows the user to create items such as tables, forms and reports.} \\\\[0.6em] \\hline \\end{array}$',
        command: 'Complete',
        marks: 4,
        ao: 'AO1',
        answerKind: 'table',
        answerLines: 12,
        subtopics: ['8.2'],
        scheme: allRequired(
          [
            'Data dictionary: data about the data in the database // data about the structure of the database // metadata for a database',
            'Query processor: software that allows the user to enter criteria, then finds and returns the appropriate result // software that processes and executes queries written in SQL',
            'Logical schema: a model of a database that is not specific to one DBMS',
            'Developer interface: a software tool that allows the user to create items such as tables, forms and reports',
          ],
          '1 mark for each correct feature or description',
        ),
      },
      {
        path: '2.b',
        label: 'b',
        stemLatex: 'Explain the reasons why referential integrity is important in a database.',
        command: 'Explain',
        marks: 3,
        ao: 'AO1',
        answerLines: 6,
        subtopics: ['8.1'],
        scheme: maxFrom(
          [
            'Referential integrity makes sure data is consistent',
            'Referential integrity makes sure all data is up-to-date',
            'Referential integrity ensures that every foreign key has a corresponding primary key',
            'Referential integrity prevents records from being added / deleted / modified incorrectly',
            'Referential integrity makes sure that if data is changed in one place the change is reflected in all related records',
            'Referential integrity makes sure any queries return accurate and complete results',
          ],
          3,
        ),
      },
      {
        path: '2.c',
        label: 'c',
        displayRef: '9618/12/M/J/23 Q2(c)',
        contextLatex:
          'The database Lessons has the following tables:\n\n$\\texttt{HORSE(HorseID, Name, Height, Age, HorseLevel)}$\n\n$\\texttt{STUDENT(StudentID, FirstName, LastName, RiderLevel, PreferredHorseID)}$\n\n$\\texttt{LESSON(LessonID, Date, Time, StudentID, HorseID, LessonContent)}$\n\nDates in this database are stored in the format #DD/MM/YYYY#. The fields RiderLevel and HorseLevel can only have the values: Beginner, Intermediate or Advanced.',
        children: [
          {
            path: '2.c.i',
            label: 'i',
            stemLatex: 'Describe two methods of validating the field RiderLevel.',
            command: 'Describe',
            marks: 2,
            ao: 'AO1',
            answerLines: 6,
            subtopics: ['6.2'],
            scheme: maxFrom(
              [
                'Presence check to make sure that the (rider level) is entered',
                'Look-up / existence check to make sure the rider level is only Beginner, Intermediate or Advanced',
                'Length check to make sure the rider level entered is either 8 or 12 characters',
                'Type check to make sure the rider level is alphanumeric',
              ],
              2,
            ),
          },
          {
            path: '2.c.ii',
            label: 'ii',
            stemLatex:
              'Write a Structured Query Language (SQL) script to return the names of all the horses that have the horse level intermediate or beginner.',
            command: 'Write',
            marks: 4,
            ao: 'AO2',
            answerKind: 'code',
            answerLines: 8,
            subtopics: ['8.3'],
            scheme: allRequired(
              [
                'SELECT field Name',
                'FROM table HORSE',
                'WHERE with Intermediate / Beginner',
                'OR with Beginner / Intermediate',
              ],
              '1 mark each. Example: SELECT Name FROM HORSE WHERE HorseLevel = "Intermediate" OR HorseLevel = "Beginner";',
            ),
          },
          {
            path: '2.c.iii',
            label: 'iii',
            stemLatex:
              'The following SQL script should return the number of riders that have the rider level beginner and have a lesson booked on 09/09/2023.\n\n$\\texttt{SELECT SUM(STUDENT.RiderLevel) AS NumberOfRiders}$\n\n$\\texttt{FROM STUDENT, LESSON}$\n\n$\\texttt{WHERE StudentID = StudentID}$\n\n$\\texttt{OR Date = #09/09/2023#}$\n\n$\\texttt{AND STUDENT.RiderLevel = Beginner;}$\n\nThere are four errors in the script. Identify and correct each error.',
            command: 'Identify',
            marks: 4,
            ao: 'AO2',
            answerKind: 'code',
            answerLines: 8,
            subtopics: ['8.3'],
            scheme: allRequired(
              [
                'SUM should be COUNT // SELECT COUNT(STUDENT.RiderLevel)',
                'The WHERE statement needs the table names before each field name // WHERE STUDENT.StudentID = LESSON.StudentID',
                'The OR should be AND // AND Date = #09/09/2023#',
                'Beginner is missing the speech marks // STUDENT.RiderLevel = "Beginner"',
              ],
              '1 mark each',
            ),
          },
        ],
      },
    ],
  },
  {
    path: '3',
    label: '3',
    displayRef: '9618/12/M/J/23 Q3',
    contextLatex: 'A program is written in assembly language.',
    children: [
      {
        path: '3.a',
        label: 'a',
        stemLatex:
          'The program is converted into machine code by a two‑pass assembler. Draw one or more lines to identify the pass or passes in which each action takes place.\n\n$\\begin{array}{|l|l|l|} \\hline \\text{Action} & \\text{first} & \\text{second} \\\\ \\hline \\text{reads the source code one line at a time} & & \\\\ \\hline \\text{generates object code} & & \\\\ \\hline \\text{removes white space} & & \\\\ \\hline \\text{adds labels to the symbol table} & & \\\\ \\hline \\end{array}$',
        command: 'Complete',
        marks: 3,
        ao: 'AO1',
        answerKind: 'table',
        subtopics: ['4.2'],
        scheme: allRequired(
          [
            'generates object code → second pass',
            'reads the source code one line at a time → first (and second) pass',
            'removes white space → first pass; adds labels to the symbol table → first pass',
          ],
          '1 mark for generates object code to second pass; 1 mark for reads source code one line at a time to both boxes; 1 mark for removes white space and adds labels to first pass',
        ),
      },
      {
        path: '3.b',
        label: 'b',
        stemLatex:
          'Assembly language statements can use different modes of addressing. Complete the following description of addressing modes.\n\n$\\ldots\\ldots\\ldots\\ldots\\ldots\\ldots$ addressing is when the operand holds the memory address of the data.\n\n$\\ldots\\ldots\\ldots\\ldots\\ldots\\ldots$ addressing is when the operand holds a memory address that stores the memory address of the data.\n\n$\\ldots\\ldots\\ldots\\ldots\\ldots\\ldots$ addressing is when the operand is the data.',
        command: 'Complete',
        marks: 3,
        ao: 'AO1',
        answerLines: 3,
        subtopics: ['4.2'],
        scheme: allRequired(
          [
            'Direct addressing is when the operand holds the memory address of the data',
            'Indirect addressing is when the operand holds a memory address that stores the memory address of the data',
            'Immediate addressing is when the operand is the data',
          ],
          '1 mark for each correct term',
        ),
      },
    ],
  },
  {
    path: '4',
    label: '4',
    displayRef: '9618/12/M/J/23 Q4',
    contextLatex: 'Data in a computer is stored in binary form.',
    children: [
      {
        path: '4.a',
        label: 'a',
        stemLatex: 'State the number of unique binary values that can be represented in 16 bits.',
        command: 'State',
        marks: 1,
        ao: 'AO1',
        answerLines: 2,
        subtopics: ['1.1'],
        scheme: allRequired(['$2^{16}$ // 65536']),
      },
      {
        path: '4.b',
        label: 'b',
        stemLatex:
          'Give the 8‑bit one’s complement representation of the denary number −120. Show your working.',
        command: 'Calculate',
        marks: 2,
        ao: 'AO2',
        answerLines: 4,
        subtopics: ['1.1'],
        scheme: allRequired(
          ['Working: +120 = 0111 1000', 'Answer: 1000 0111'],
          '1 mark for working; 1 mark for answer',
        ),
      },
      {
        path: '4.c',
        label: 'c',
        stemLatex: 'Convert the hexadecimal number A04 into denary. Show your working.',
        command: 'Calculate',
        marks: 2,
        ao: 'AO2',
        answerLines: 4,
        subtopics: ['1.1'],
        scheme: allRequired(
          [
            'Working: A04 = (10 * 16^2) + 4 // A04 = (10 * 256) + 4 // A04 = 1010 0000 0100',
            'Answer: 2564',
          ],
          '1 mark for working; 1 mark for answer',
        ),
      },
      {
        path: '4.d',
        label: 'd',
        stemLatex:
          'Show the result of a 2‑place left logical shift on the binary number:\n\n$\\texttt{01001111}$',
        command: 'Show',
        marks: 1,
        ao: 'AO2',
        answerLines: 2,
        subtopics: ['1.1'],
        scheme: allRequired(['0011 1100']),
      },
    ],
  },
  {
    path: '5',
    label: '5',
    displayRef: '9618/12/M/J/23 Q5',
    contextLatex: 'A student has purchased a new laptop.',
    children: [
      {
        path: '5.a',
        label: 'a',
        stemLatex:
          'The laptop is designed using the Von Neumann model for a computer system. Identify two types of signal that a control bus can transfer.',
        command: 'Identify',
        marks: 2,
        ao: 'AO1',
        answerLines: 2,
        subtopics: ['4.1'],
        scheme: maxFrom(['Interrupt', 'Timing', 'Read', 'Write'], 2),
      },
      {
        path: '5.b',
        label: 'b',
        stemLatex:
          'Describe two ways the hardware of a laptop can be upgraded to improve the performance and explain how each upgrade improves the performance.',
        command: 'Describe',
        marks: 4,
        ao: 'AO1',
        answerLines: 12,
        subtopics: ['3.1'],
        scheme: {
          type: 'any_n_from_m',
          maxMarks: 4,
          groups: [{ label: 'Points', nRequired: 1, marksPerPoint: 2, maxMarks: 4 }],
          points: [
            any('MP1', 'Increase number of cores'),
            any(
              'MP2',
              '… each core can independently carry out a process at the same time // more instructions are performed in parallel',
            ),
            any('MP3', 'Increase RAM capacity'),
            any(
              'MP4',
              '… allowing more applications to reside in memory at the same time, saving disk access times',
            ),
            any('MP5', 'Increase cache memory'),
            any(
              'MP6',
              '… more data can be stored in fast access so less time is spent accessing from RAM',
            ),
            any('MP7', 'Increase clock speed'),
            any(
              'MP8',
              '… more Fetch‑Decode‑Execute (FDE) cycles can run each second / per unit time',
            ),
          ],
        },
      },
      {
        path: '5.c',
        label: 'c',
        displayRef: '9618/12/M/J/23 Q5(c)',
        contextLatex: 'Peripherals are connected to the laptop using ports.',
        children: [
          {
            path: '5.c.i',
            label: 'i',
            stemLatex:
              'A printer is connected to a Universal Serial Bus (USB) port. Describe how data is transmitted through a USB port.',
            command: 'Describe',
            marks: 1,
            ao: 'AO1',
            answerLines: 3,
            subtopics: ['3.1'],
            scheme: maxFrom(
              [
                '1 bit is transferred at a time',
                'Can be synchronous or asynchronous',
                'USB‑3 is full duplex and earlier versions are half‑duplex',
              ],
              1,
            ),
          },
          {
            path: '5.c.ii',
            label: 'ii',
            stemLatex:
              'A monitor is connected to the laptop using a different type of port. Identify one other type of port that can be used to connect the monitor.',
            command: 'Identify',
            marks: 1,
            ao: 'AO1',
            answerLines: 2,
            subtopics: ['3.1'],
            scheme: maxFrom(['HDMI', 'DisplayPort'], 1),
          },
        ],
      },
      {
        path: '5.d',
        label: 'd',
        displayRef: '9618/12/M/J/23 Q5(d)',
        contextLatex: 'The laptop has systems software.',
        children: [
          {
            path: '5.d.i',
            label: 'i',
            stemLatex: 'Describe how the Operating System (OS) manages processes in the computer.',
            command: 'Describe',
            marks: 5,
            ao: 'AO1',
            answerLines: 10,
            subtopics: ['5.1'],
            scheme: maxFrom(
              [
                'Manages the scheduling of processes // decides which order to run processes',
                'Manages which resources the processes require',
                '… such as allocating memory',
                'Enables processes to share data',
                'Prevents interference between processes // resolution of conflicts',
                'Handles the process queue',
                'It allows multi-tasking / multi-processing',
                '… by ensuring fair access, handling priorities and handling interrupts',
              ],
              5,
            ),
          },
          {
            path: '5.d.ii',
            label: 'ii',
            stemLatex: 'Describe the purpose of utility software in a computer.',
            command: 'Describe',
            marks: 2,
            ao: 'AO1',
            answerLines: 4,
            subtopics: ['5.1'],
            scheme: maxFrom(
              [
                'To help users to set-up / configure / analyse / optimise / maintain the computer',
                '… by for example, making memory allocation more efficient',
                '… by for example, checking the system for faults',
              ],
              2,
            ),
          },
        ],
      },
    ],
  },
  {
    path: '6',
    label: '6',
    displayRef: '9618/12/M/J/23 Q6',
    children: [
      {
        path: '6.a',
        label: 'a',
        stemLatex:
          'Draw the logic circuit for this logic expression:\n\n$Z = (R \\oplus S) \\land (\\overline{T} \\,\\text{NOR}\\, P)$\n\nInputs: $R$, $S$, $T$, $P$. Output: $Z$.',
        command: 'Draw',
        marks: 2,
        ao: 'AO2',
        answerKind: 'diagram',
        answerLines: 8,
        subtopics: ['3.2'],
        scheme: allRequired(
          [
            '1 mark for correct XOR and AND gates, with correct inputs',
            '1 mark for correct NOT and NOR gates with correct inputs',
          ],
          'Circuit: XOR, AND, NOT, NOR — 4 gates in total.',
        ),
      },
      {
        path: '6.b',
        label: 'b',
        stemLatex:
          'Complete the truth table for this logic expression:\n\n$Z = (\\overline{P} \\lor Q) \\oplus (R \\,\\text{NOR}\\, Q)$\n\n$\\begin{array}{|c|c|c|c|} \\hline P & Q & R & Z \\\\ \\hline 0 & 0 & 0 & \\\\ 0 & 0 & 1 & \\\\ 0 & 1 & 0 & \\\\ 0 & 1 & 1 & \\\\ 1 & 0 & 0 & \\\\ 1 & 0 & 1 & \\\\ 1 & 1 & 0 & \\\\ 1 & 1 & 1 & \\\\ \\hline \\end{array}$',
        command: 'Complete',
        marks: 2,
        ao: 'AO2',
        answerKind: 'table',
        subtopics: ['3.2'],
        scheme: allRequired(
          ['First 4 rows correct: 0, 1, 1, 1', 'Last 4 rows correct: 1, 0, 1, 1'],
          '1 mark for first 4 rows; 1 mark for last 4 rows',
        ),
      },
    ],
  },
  {
    path: '7',
    label: '7',
    displayRef: '9618/12/M/J/23 Q7',
    contextLatex: 'A software developer is working in a team writing a program for a client.',
    children: [
      {
        path: '7.a',
        label: 'a',
        displayRef: '9618/12/M/J/23 Q7(a)',
        contextLatex:
          'The developer is writing a new program library to be used by the other team members.',
        children: [
          {
            path: '7.a.i',
            label: 'i',
            stemLatex: 'Define the term program library.',
            command: 'Define',
            marks: 2,
            ao: 'AO1',
            answerLines: 3,
            subtopics: ['5.2'],
            scheme: maxFrom(
              [
                'Set of pre-written / pre-compiled / pre-tested subroutines',
                '… which can be called in other programs',
                '… by installing/importing the library',
              ],
              2,
            ),
          },
          {
            path: '7.a.ii',
            label: 'ii',
            stemLatex:
              'Explain two benefits to the developer of choosing to create a Dynamic Link Library (DLL).',
            command: 'Explain',
            marks: 4,
            ao: 'AO1',
            answerLines: 8,
            subtopics: ['5.2'],
            scheme: {
              type: 'any_n_from_m',
              maxMarks: 4,
              groups: [{ label: 'Points', nRequired: 1, marksPerPoint: 2, maxMarks: 4 }],
              points: [
                any('MP1', '(main) memory requirements for program is reduced'),
                any('MP2', '… as dynamic link library is loaded only once / when required'),
                any('MP3', 'The executable file size of the program using the DLL will be smaller'),
                any('MP4', '… because the executable does not contain (all) the library routines'),
                any('MP5', 'Maintenance not needed to be done by the programmer'),
                any('MP6', '… because the DLL is separate from program'),
                any('MP7', 'No need to recompile the main program when changes are made to DLL'),
                any(
                  'MP8',
                  '… because changes / improvements / error correction to the DLL file code are done independently of the main program',
                ),
                any(
                  'MP9',
                  'A single DLL file can be made available to several application programs',
                ),
                any('MP10', '… saving space in memory / easing the pressure on memory'),
              ],
            },
          },
        ],
      },
      {
        path: '7.b',
        label: 'b',
        stemLatex:
          'The development team needs to use a translator whilst writing the program for the client. Identify whether an interpreter or a compiler would be more appropriate at this stage of the program development. Justify your choice.',
        command: 'Justify',
        marks: 3,
        ao: 'AO1',
        answerLines: 5,
        subtopics: ['5.2'],
        scheme: maxFrom(
          [
            'Interpreter: allows the developer to make real-time changes',
            '… so the program can be debugged at each stage // the effect of any changes made by the developer can be seen immediately',
            'Interpreter: the developer can test when incomplete',
            '… so small parts can be tested without having to test the rest of the program // if one section does not work others can still be tested // to avoid dependent errors',
            'Compiler: the developer can debug multiple errors simultaneously',
            'Compiler: produces an executable file',
            '… so that the developer can test the program multiple times without recompiling',
          ],
          3,
        ),
      },
      {
        path: '7.c',
        label: 'c',
        stemLatex:
          'The development team uses an Integrated Development Environment (IDE). Complete the table by describing the typical features found in an IDE.\n\n$\\begin{array}{|l|l|} \\hline \\text{Feature} & \\text{Description} \\\\ \\hline \\text{Breakpoints} & \\\\[0.6em] \\hline \\text{Dynamic syntax checks} & \\\\[0.6em] \\hline \\text{Context‑sensitive prompts} & \\\\[0.6em] \\hline \\text{Single stepping} & \\\\[0.6em] \\hline \\end{array}$',
        command: 'Complete',
        marks: 4,
        ao: 'AO1',
        answerKind: 'table',
        answerLines: 12,
        subtopics: ['5.2'],
        scheme: allRequired(
          [
            'Breakpoints: stop the code at a specific line to check the current progress / values',
            'Dynamic syntax checks: highlight / underline / colour syntax errors as the code is entered',
            'Context-sensitive prompts: suggest the code to add // automatically complete statements',
            'Single stepping: run the code one line at a time so the values can be checked',
          ],
          '1 mark each',
        ),
      },
      {
        path: '7.d',
        label: 'd',
        stemLatex:
          'One section of the program being developed will convert user’s speech into commands. Explain how Artificial Intelligence (AI) can be used in this program.',
        command: 'Explain',
        marks: 3,
        ao: 'AO1',
        answerLines: 6,
        subtopics: ['18.1'],
        scheme: maxFrom(
          [
            'Uses speech recognition',
            '… which identifies key phrases / words spoken',
            '… and matches these to a database',
            '… and generates the most likely sentence / command / word',
          ],
          3,
        ),
      },
    ],
  },
];

/** Convenience export matching the shared writer's expectations. */
export const PAPER: SeedNode[] = PAPER_12;
export type { SeedNode, SeedLeaf };
export type { Command, AnswerKind, Ao };
