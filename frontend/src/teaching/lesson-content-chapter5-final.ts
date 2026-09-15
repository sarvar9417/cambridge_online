import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';
import { CHAPTER_5_OPENING_SLIDES } from './lesson-content-chapter5';

const source = (page: number, elements: string[] = []) => ({
  sourcePages: [page],
  sourceLabel: `Hodder Chapter 5 · p.${page}`,
  sourceElements: [`Hodder p.${page}`, ...elements],
});

const sourceRange = (from: number, to: number, elements: string[] = []) => ({
  sourcePages: Array.from({ length: to - from + 1 }, (_, index) => from + index),
  sourceLabel: `Hodder Chapter 5 · pp.${from}–${to}`,
  sourceElements: [`Hodder pp.${from}–${to}`, ...elements],
});

export const CHAPTER_5_DEEP_SLIDES: HodderLessonSlide[] = [
  {
    id: 'h5-512-process-hardware-file', section: '5.1 Operating systems', subtopicCode: '5.1.2', eyebrow: '5.1.2 · PROCESS · HARDWARE · FILE MANAGEMENT',
    title: 'The OS coordinates running processes, peripherals and files',
    lead: 'The operating system coordinates resource sharing between processes, controls peripherals through device drivers and manages the naming, storage and protection of files.',
    richBlocks: [
      { kind: 'comparison', leftTitle: 'Process management', rightTitle: 'Hardware management', rows: [
        ['Allocates resources and synchronises running processes.', 'Communicates with input/output devices using device drivers.'],
        ['Uses scheduling, queues and conflict resolution.', 'Translates data into a form the target device can use.'],
        ['Permits sharing and exchange of data between processes.', 'Assigns priorities and manages release of hardware resources.'],
      ] },
      { kind: 'bullets', items: [
        'File management supports create, open, close, delete, rename, copy and move operations.',
        'It maintains directory structures and file access controls, including permissions and protection.',
        'It works with the storage format and loads required file data from secondary storage into memory.',
      ] },
    ],
    teacherPrompt: 'Classify several user actions as process, hardware or file management and justify each choice.',
    visual: 'files', accent: 'indigo', ...source(142, ['Process management', 'Hardware management', 'File management']),
  },
  {
    id: 'h5-512-printer-management', section: '5.1 Operating systems', subtopicCode: '5.1.2', eyebrow: 'PRINTER MANAGEMENT · QUEUES · BUFFERS · INTERRUPTS',
    title: 'A print job demonstrates hardware management in action',
    lead: 'Printer management bridges the speed difference between processor and printer while also responding to busy devices, job priorities and hardware errors.',
    richBlocks: [{ kind: 'steps', title: 'Printer-management sequence', items: [
      'Locate and load the printer driver.',
      'Send output data to a printer buffer.',
      'Place jobs in a printer queue when the device is busy.',
      'Send control commands while the job is being processed.',
      'Handle printer interrupts and error messages, such as paper or ink problems.',
    ] }],
    activity: { title: 'Trace a print job', prompt: 'Explain what happens when a printer is busy and then reports an error while another document is waiting.' },
    visual: 'recap', accent: 'cyan', ...source(142, ['Printer management', 'Device driver', 'Buffer', 'Queue', 'Interrupt']),
  },
  {
    id: 'h5-513-formatter', section: '5.1 Operating systems', subtopicCode: '5.1.3', eyebrow: '5.1.3 · UTILITY SOFTWARE · DISK FORMATTER',
    title: 'Formatting prepares storage so files can be stored and retrieved',
    lead: 'A disk formatter prepares a drive by organising storage and creating the structures used by the operating system to locate files and free space.',
    bullets: [
      'Partitions are contiguous blocks of storage that can be formatted independently.',
      'A full format can write and read sectors to test them, which also destroys existing data.',
      'Checking tools can identify bad sectors, mark them unusable and direct future storage elsewhere.',
      'Hard bad sectors are associated with physical faults; soft bad sectors are associated with corrupted data.',
    ],
    keyTerms: [
      { term: 'Disk formatter', definition: 'Utility that prepares a disk so files can be stored and retrieved.' },
      { term: 'Bad sector', definition: 'A faulty HDD sector that may result from physical damage or data corruption.' },
    ],
    visual: 'files', accent: 'amber', ...source(143, ['Disk formatter', 'Bad sector']),
  },
  {
    id: 'h5-513-antivirus', section: '5.1 Operating systems', subtopicCode: '5.1.3', eyebrow: 'VIRUS CHECKERS · HEURISTICS · QUARANTINE',
    title: 'Antivirus combines known signatures, behaviour checks and quarantine',
    lead: 'Antivirus software checks programs before use, compares possible threats with known malware and can isolate suspicious files for later action.',
    richBlocks: [{ kind: 'steps', title: 'Typical antivirus workflow', items: [
      'Check files or software before they are loaded or executed.',
      'Compare suspicious code with a database of known viruses.',
      'Use heuristic checking to identify suspicious behaviour that may indicate a new virus.',
      'Move suspected files into quarantine before deletion or review.',
      'Keep the software up to date and run periodic full-system scans.',
    ] }],
    keyTerms: [
      { term: 'Heuristic checking', definition: 'Checking software behaviour for signs that may indicate a virus.' },
      { term: 'Quarantine', definition: 'Isolation of a suspected infected file before it is deleted or released.' },
      { term: 'False positive', definition: 'A legitimate file incorrectly identified as infected.' },
    ],
    visual: 'recap', accent: 'rose', ...source(144, ['Virus checker', 'Heuristic checking', 'Quarantine', 'False positive']),
  },
  {
    id: 'h5-513-defragmentation', section: '5.1 Operating systems', subtopicCode: '5.1.3', eyebrow: 'DEFRAGMENTATION · FIGURES 5.5–5.8',
    title: 'Defragmentation reduces HDD head movement by making file blocks contiguous',
    lead: 'As files are deleted, extended and rewritten, their blocks can become scattered. Defragmentation reorganises those blocks so a file can be stored in adjacent sectors where possible.',
    bullets: [
      'Fragmentation increases HDD access time because the read/write head must move repeatedly to retrieve one file.',
      'The coursebook sequence shows files becoming scattered and then reorganised.',
      'Defragmentation is less important for SSDs because SSDs have no moving read/write head.',
      'Very low free space can make rearrangement difficult.',
    ],
    activity: { title: 'Explain the gain', prompt: 'Why does making a file contiguous improve HDD access more than SSD access?' },
    visual: 'files', accent: 'emerald', ...sourceRange(144, 145, ['Figures 5.5–5.8', 'Disk defragmenter']),
  },
  {
    id: 'h5-513-analysis-compression', section: '5.1 Operating systems', subtopicCode: '5.1.3', eyebrow: 'DISK ANALYSIS · FILE COMPRESSION · DISK COMPRESSION',
    title: 'Storage utilities can identify waste or reduce the amount of data stored',
    lead: 'Disk analysis identifies how storage is being used, while compression reduces storage requirements or transfer size.',
    richBlocks: [{ kind: 'comparison', leftTitle: 'Disk content analysis', rightTitle: 'Compression', rows: [
      ['Reviews files and folders to identify storage use and empty space.', 'File compression reduces the size of selected files.'],
      ['Helps locate unneeded files that can be removed.', 'Disk compression works transparently as data is stored and retrieved.'],
      ['Supports storage maintenance decisions.', 'Previously compressed data still requires compatible decompression support.'],
    ] }],
    visual: 'files', accent: 'cyan', ...source(145, ['Disk content analysis', 'File compression', 'Disk compression']),
  },
  {
    id: 'h5-513-backup', section: '5.1 Operating systems', subtopicCode: '5.1.3', eyebrow: 'BACK-UP SOFTWARE · MULTIPLE COPIES',
    title: 'Back-up utilities create recoverable versions of important data',
    lead: 'The chapter recommends automated backup routines and copies stored away from the working data so files can be restored after deletion, corruption or hardware failure.',
    richBlocks: [
      { kind: 'steps', title: 'Stronger backup model', items: [
        'Keep the current working version on internal storage.',
        'Keep a local backup on a separate device.',
        'Keep a remote backup in a different location, for example cloud storage.',
      ] },
      { kind: 'bullets', items: [
        'A backup utility can run on a schedule and copy only files that have changed.',
        'Version history can recover an earlier copy of a file.',
        'Restore points can help return a system or data set to an earlier state.',
      ] },
    ],
    activity: { title: 'Recovery scenario', prompt: 'A learner overwrites an important document and notices three days later. Which backup features would help most, and why?' },
    visual: 'files', accent: 'indigo', ...source(146, ['Back-up utility', 'Restore point', 'File History', 'Time Machine']),
  },
  {
    id: 'h5-514-library-model', section: '5.1 Operating systems', subtopicCode: '5.1.4', eyebrow: '5.1.4 · PROGRAM LIBRARIES · FIGURES 5.10–5.11',
    title: 'Libraries turn tested routines into reusable building blocks',
    lead: 'A developer can reuse pre-written routines rather than recreating common functionality in every program.',
    bullets: [
      'Reusing library routines reduces development time and cost.',
      'Modular programming allows several programmers to work on different parts of one product.',
      'Common routines can help maintain consistency across a software suite.',
      'Previously tested routines reduce the amount of new testing required.',
    ],
    keyTerms: [
      { term: 'Program library', definition: 'A collection of programs and routines stored for future reuse.' },
      { term: 'Library routine', definition: 'A reusable subroutine that can be incorporated into another program.' },
    ],
    visual: 'files', accent: 'emerald', ...source(147, ['Program library', 'Library routine', 'Figures 5.10–5.11']),
  },
  {
    id: 'h5-514-static-dynamic', section: '5.1 Operating systems', subtopicCode: '5.1.4', eyebrow: 'STATIC LIBRARY ↔ DYNAMIC LINK LIBRARY',
    title: 'Static linking embeds a routine; dynamic linking connects to it at run time',
    lead: 'Static libraries are linked into the executable at compilation, while DLL files remain separate and are accessed at run time.',
    richBlocks: [
      { kind: 'comparison', leftTitle: 'Static library', rightTitle: 'Dynamic Link Library (DLL)', rows: [
        ['Library code is linked into the executable at compilation.', 'Library routine remains a separate file until run time.'],
        ['The program contains its own linked copy.', 'Several applications can use the same routine.'],
        ['Executable is more self-contained.', 'Main executable can be smaller because the routine is loaded only when needed.'],
      ] },
      { kind: 'table', table: { caption: 'DLL trade-offs', headers: ['Benefits', 'Risks / drawbacks'], rows: [
        ['Smaller main executable and reduced memory use.', 'Required DLL files must be available at run time.'],
        ['DLL can be changed without recompiling the main program.', 'A changed or corrupted DLL can produce unexpected results or crashes.'],
        ['A single DLL can serve several applications.', 'Malicious changes to a DLL create a security risk.'],
      ] } },
    ],
    visual: 'files', accent: 'amber', ...source(148, ['Static library', 'Dynamic library', 'DLL', 'Table 5.2']),
  },
  {
    id: 'h5-52-key-terms', section: '5.2 Language translators', eyebrow: '5.2 · TRANSLATOR & DEBUGGING TERMS',
    title: 'Translation and debugging use a precise vocabulary',
    lead: 'The chapter distinguishes translator types from the IDE tools used to expose syntax and logic faults.',
    keyTerms: [
      { term: 'Assembler', definition: 'Translates assembly language into machine code.' },
      { term: 'Compiler', definition: 'Translates a high-level source program into object code before execution.' },
      { term: 'Interpreter', definition: 'Translates and executes high-level source statements under interpreter control.' },
      { term: 'Syntax error', definition: 'An error in the grammar of the source program.' },
      { term: 'Logic error', definition: 'An error in program logic that can produce an incorrect result.' },
      { term: 'Breakpoint', definition: 'A deliberate pause in execution so program state can be inspected.' },
      { term: 'Report window', definition: 'A run-time window showing variable values or evaluated expressions.' },
    ],
    visual: 'types', accent: 'indigo', ...source(150, ['Translator key terms', 'IDE', 'Debugging', 'Single stepping', 'Breakpoint', 'Report window']),
  },
  {
    id: 'h5-521-assembler', section: '5.2 Language translators', subtopicCode: '5.2.1', eyebrow: '5.2.1 · ASSEMBLER',
    title: 'An assembler translates chip-specific assembly language into machine code',
    lead: 'Assembly language is machine dependent, so it is tied closely to the instruction set of a particular processor family.',
    bullets: [
      'Translated machine code can be placed directly in main memory or stored for later use.',
      'When object code is stored, a loader places it into main memory before execution.',
      'Stored object code can be executed repeatedly without retranslating the source.',
      'Assembly language is often used for time-critical or hardware-near tasks.',
    ],
    activity: { title: 'Machine dependence', prompt: 'Explain why an assembly-language program for one processor family may not work on another processor family.' },
    visual: 'types', accent: 'cyan', ...source(150, ['5.2.1 Translation and execution', 'Assembler', 'Loader', 'Machine dependent']),
  },
  {
    id: 'h5-521-compiler-interpreter', section: '5.2 Language translators', subtopicCode: '5.2.1', eyebrow: 'COMPILER ↔ INTERPRETER · TABLE 5.3',
    title: 'Compiler and interpreter both handle high-level languages but execute differently',
    lead: 'A compiler generates object code that can be stored and executed later; an interpreter translates and executes source statements each time the program runs.',
    richBlocks: [{ kind: 'table', table: { caption: 'Translator comparison', headers: ['Feature', 'Assembler', 'Compiler', 'Interpreter'], rows: [
      ['Source language', 'assembly language', 'high-level language', 'high-level language'],
      ['Object program', 'generated', 'generated', 'not stored as a translated program'],
      ['Translation relationship', 'one assembly instruction maps closely to one machine instruction', 'one high-level statement may expand into many machine instructions', 'statements are translated and executed under interpreter control'],
      ['Repeated execution', 'stored object code can be run again', 'stored object code can be run again', 'source must again be handled by the interpreter'],
    ] } }],
    teacherPrompt: 'Why can a compiled program run repeatedly without the compiler, while an interpreted program still needs its interpreter?',
    visual: 'types', accent: 'emerald', ...source(151, ['Compiler', 'Interpreter', 'Table 5.3']),
  },
  {
    id: 'h5-522-compiler-interpreter-tradeoffs', section: '5.2 Language translators', subtopicCode: '5.2.2', eyebrow: '5.2.2 · COMPILATION ↔ INTERPRETATION · TABLE 5.4',
    title: 'Development convenience and execution speed pull in different directions',
    lead: 'The compiler/interpreter comparison contrasts repeated execution speed and source-code protection with line-by-line feedback and easier debugging.',
    richBlocks: [{ kind: 'comparison', leftTitle: 'Compiler strengths', rightTitle: 'Interpreter strengths', rows: [
      ['Translation is completed before execution, so repeated runs are faster.', 'Errors can be corrected statement by statement during development.'],
      ['Executable object code can be distributed without source code.', 'Intermediate results are easier to inspect during testing.'],
      ['Generated code may be optimised.', 'Development can continue quickly after correcting a fault.'],
      ['Source code remains under developer control.', 'Useful while code is changing frequently.'],
    ] }],
    bullets: [
      'A compiler can report several dependent errors that arise from one earlier mistake.',
      'An interpreted program usually executes more slowly because translation is repeated during execution.',
      'Interpreted software depends on an interpreter or run-time environment being available.',
    ],
    visual: 'recap', accent: 'rose', ...sourceRange(151, 152, ['Table 5.4', 'Compiler and interpreter trade-offs']),
  },
  {
    id: 'h5-523-bytecode', section: '5.2 Language translators', subtopicCode: '5.2.3', eyebrow: '5.2.3 · PARTIAL COMPILATION + INTERPRETATION',
    title: 'Intermediate code combines compilation with a portable run-time stage',
    lead: 'A high-level program can first be compiled into machine-independent intermediate code, p-code or bytecode and then executed by a suitable virtual-machine run time.',
    richBlocks: [{ kind: 'steps', title: 'Combined translation model', items: [
      'Write high-level source code.',
      'Compile the source into intermediate code or bytecode.',
      'Move that code to a system with a suitable virtual machine or run time.',
      'Interpret or further compile the intermediate code during execution.',
    ] }],
    bullets: [
      'This approach aims to reduce repeated high-level translation while retaining portability.',
      'The chapter uses Java and Python as examples of languages that can use bytecode.',
    ],
    activity: { title: 'Trace the pipeline', prompt: 'Why is bytecode not the same as native machine code, and what extra software is required to run it?' },
    visual: 'types', accent: 'amber', ...sourceRange(152, 153, ['Intermediate code', 'p-code', 'bytecode', 'virtual machine', 'Java', 'Python']),
  },
  {
    id: 'h5-524-ide-overview', section: '5.2 Language translators', subtopicCode: '5.2.4', eyebrow: '5.2.4 · INTEGRATED DEVELOPMENT ENVIRONMENT',
    title: 'An IDE integrates editing, translation, execution, debugging and documentation',
    lead: 'The coursebook identifies a source-code editor, a compiler and/or interpreter, a run-time environment with debugger and an auto-documenter as typical IDE facilities.',
    richBlocks: [{ kind: 'steps', title: 'Core IDE facilities', items: [
      'Source-code editor for writing and editing programs.',
      'Compiler and/or interpreter for translating and running code.',
      'Run-time environment with debugger for tracing program behaviour.',
      'Auto-documenter for quick explanations of code and library facilities.',
    ] }],
    bullets: ['Examples in the chapter include NetBeans, PyCharm, Visual Studio and SharpDevelop; supported languages differ between IDEs.'],
    visual: 'recap', accent: 'indigo', ...sourceRange(153, 154, ['5.2.4 IDE', 'source-code editor', 'compiler', 'interpreter', 'debugger', 'auto-documenter']),
  },
  {
    id: 'h5-524-editor', section: '5.2 Language translators', subtopicCode: '5.2.4', eyebrow: 'SOURCE-CODE EDITOR · FIGURES 5.12–5.13',
    title: 'Editor features reduce typing effort and expose syntax mistakes early',
    lead: 'The IDE editor can format code for readability and provide context-aware assistance while the programmer is writing.',
    bullets: [
      'Syntax colouring and pretty printing make program structure easier to read.',
      'Context-sensitive prompts and text completion can suggest identifiers and reserved words.',
      'Dynamic syntax checking identifies possible syntax errors as code is typed.',
      'Large code blocks can be collapsed so the programmer can focus on the current section.',
      'Logic errors normally become visible when the program is executed and its behaviour is tested.',
    ],
    visual: 'recap', accent: 'cyan', ...sourceRange(154, 155, ['Figures 5.12–5.13', 'Pretty printing', 'Context-sensitive prompts', 'Dynamic syntax checking', 'Collapse code blocks']),
  },
  {
    id: 'h5-524-debugger', section: '5.2 Language translators', subtopicCode: '5.2.4', eyebrow: 'DEBUGGER · SINGLE STEP · BREAKPOINT · REPORT WINDOW',
    title: 'A debugger makes program state visible at controlled points during execution',
    lead: 'The run-time environment can execute a program under debugger control so the programmer can inspect how values change and locate logic errors.',
    richBlocks: [{ kind: 'steps', title: 'Debugging workflow', items: [
      'Run one statement at a time using single stepping.',
      'Set a breakpoint where execution should pause.',
      'Inspect variables and expressions in a report window.',
      'Compare the observed state with the expected state to locate a logic error.',
      'Modify the program and repeat the test until behaviour is correct.',
    ] }],
    visual: 'recap', accent: 'emerald', ...source(155, ['Debugger', 'Single stepping', 'Breakpoint', 'Report window']),
  },
  {
    id: 'h5-524-documentation-review', section: '5.2 Language translators', subtopicCode: '5.2.4', eyebrow: 'AUTO-DOCUMENTER · ACTIVITY 5B · END-OF-CHAPTER REVIEW',
    title: 'The final section links IDE features back to translators, libraries and OS management',
    lead: 'The auto-documenter provides quick code documentation, while the closing activity and exam-style questions revisit translators, IDE features, DLLs, utilities and operating-system management.',
    bullets: [
      'Auto-documentation explains the function and purpose of programming code or library features.',
      'Activity 5B revisits assembler versus compiler, compiler versus interpreter and IDE feature explanations.',
      'The end-of-chapter questions revisit DLL trade-offs, OS management tasks, backup and defragmentation, translators and IDE facilities.',
    ],
    activity: { title: 'Chapter synthesis', prompt: 'Choose one OS task, one utility, one library feature, one translator and one IDE tool. Explain how the five fit into a single software-development or execution scenario.' },
    visual: 'recap', accent: 'rose', ...sourceRange(157, 158, ['Auto-documenter', 'Activity 5B', 'End-of-chapter questions']),
  },
];

export const CHAPTER_5_FINAL: HodderLessonChapter = {
  number: 5,
  level: 'AS Level',
  title: 'System software',
  subtitle: 'Operating systems · utility software · program libraries · language translators · IDEs',
  subtopics: ['5.1 Operating systems', '5.2 Language translators'],
  sourceNote: 'Deep source-backed teaching route from the exact Hodder 9618 Chapter 5, printed pp.136–158. The independently audited opening pp.136–141 is retained and extended through the remainder of the chapter.',
  coverage: 'Full printed-page coverage pp.136–158: chapter objectives; operating-system need and interfaces; memory, security, process, hardware and file management; printer queues and buffers; utility software; program libraries and DLL trade-offs; assemblers, compilers and interpreters; partial compilation and bytecode; IDE editor, translator, debugger and auto-documentation features; chapter review.',
  slides: [...CHAPTER_5_OPENING_SLIDES, ...CHAPTER_5_DEEP_SLIDES],
};
