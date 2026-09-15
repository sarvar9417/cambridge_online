import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';

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

export const CHAPTER_5_OPENING_SLIDES: HodderLessonSlide[] = [
  {
    id: 'h5-overview', section: 'Chapter overview', eyebrow: 'CHAPTER 5 · SYSTEM SOFTWARE',
    title: 'System software: operating systems, utilities, libraries and translators',
    lead: 'Hodder opens Chapter 5 by linking operating-system management tasks to utility software, program libraries, language translators and integrated development environments (IDEs).',
    richBlocks: [{ kind: 'steps', title: 'What you should already know', items: [
      'Explain why household devices controlled by microprocessors do not necessarily need an operating system.',
      'Name common operating systems used by computers, mobile phones and tablets.',
      'Compare a graphical user interface (GUI) with a command line interface (CLI).',
      'Investigate how early computers were prepared for use before modern operating systems.',
      'Describe the role of buffers and interrupts when an inkjet printer receives a print job.',
    ] }], visual: 'types', accent: 'indigo', ...source(136, ['Chapter 5 learning objectives', 'What you should already know']),
  },
  {
    id: 'h5-51-key-terms', section: '5.1 Operating systems', eyebrow: '5.1 · KEY TERMS',
    title: 'Interface, memory and management vocabulary anchors the chapter',
    lead: 'Hodder defines an operating system as software that provides an environment in which applications can run and an interface between hardware and human operators.',
    richBlocks: [{ kind: 'table', table: { caption: 'Opening operating-system terminology', headers: ['Term', 'Source-grounded meaning'], rows: [
      ['HCI', 'human–computer interface'], ['GUI', 'graphical user interface'], ['CLI', 'command line interface'],
      ['WIMP', 'windows, icons, menu and pointing device'], ['Post-WIMP', 'interfaces beyond WIMP that use touch-screen technology rather than a pointing device'],
      ['Memory management', 'part of the operating system that controls main memory'],
      ['Security management', 'part of the operating system that ensures integrity, confidentiality and availability of data'],
      ['Memory protection', 'prevents two competing applications from using the same memory locations at the same time'],
    ] } }], visual: 'types', accent: 'cyan', ...source(137, ['Key terms', 'Operating system', 'HCI', 'GUI', 'CLI', 'WIMP', 'Post-WIMP', 'Memory management', 'Security management']),
  },
  {
    id: 'h5-511-os-need', section: '5.1 Operating systems', subtopicCode: '5.1.1', eyebrow: '5.1.1 · THE NEED FOR AN OPERATING SYSTEM · FIGURE 5.1',
    title: 'Start-up evolved from paper media to ROM, HDD, BIOS and flash memory',
    lead: 'Early computers had no operating system: control software had to be loaded each time the computer started, using paper tape or punched cards.',
    bullets: [
      'The Acorn BBC B stored part of its operating system in an internal ROM chip and used a cassette tape machine to load the remainder.',
      'As HDDs developed, operating systems were stored on hard disk and motherboard start-up was handled by the BIOS.',
      'BIOS was initially stored in ROM; in modern computers its contents are stored on a flash-memory chip.',
      'BIOS configuration is stored in CMOS memory and can therefore be altered or deleted.',
      'Only the required part of a modern operating system is copied into RAM because loading the whole OS at once would seriously affect performance.',
    ], visual: 'types', accent: 'amber', ...source(138, ['Figure 5.1 An Acorn BBC B and its cassette tape machine', 'BIOS', 'CMOS', 'ROM', 'flash memory']),
  },
  {
    id: 'h5-511-cli-gui', section: '5.1 Operating systems', subtopicCode: '5.1.1', eyebrow: 'CLI ↔ GUI · FIGURE 5.2',
    title: 'CLI gives direct command control; GUI replaces command sequences with visual interaction',
    lead: 'A CLI requires commands to be typed exactly and can take time, but gives direct communication with the computer without restricting the user to pre-determined options. A GUI uses pictures or symbols (icons).',
    example: { title: 'Command-line idea', lines: ['type an exact command', 'include the required parameters', 'execute the command', 'read the resulting output or error'] },
    bullets: [
      'WIMP uses windows, icons, menu and a pointing device; a mouse controls a cursor and icons open applications in windows.',
      'A windows manager handles interaction between windows, applications and the windowing system.',
      'Post-WIMP uses touch-screen actions such as pinching, rotating and tapping an icon with a finger or stylus.',
    ], visual: 'types', accent: 'emerald', ...source(139, ['Figure 5.2 An example of WIMP', 'CLI example', 'GUI', 'WIMP', 'post-WIMP']),
  },
  {
    id: 'h5-512-os-tasks', section: '5.1 Operating systems', subtopicCode: '5.1.2', eyebrow: '5.1.2 · OPERATING SYSTEM TASKS · FIGURE 5.3',
    title: 'Five management areas surround the operating system',
    lead: 'Figure 5.3 organises operating-system work into memory management, file management, security management, hardware management and process management.',
    richBlocks: [{ kind: 'steps', title: 'Figure 5.3 task map', items: ['memory management', 'file management', 'security management', 'hardware management', 'process management'] }],
    visual: 'types', accent: 'indigo', ...source(140, ['Figure 5.3 Operating system tasks']),
  },
  {
    id: 'h5-512-memory-management', section: '5.1 Operating systems', subtopicCode: '5.1.2', eyebrow: 'MEMORY MANAGEMENT · OPTIMISATION · ORGANISATION · PROTECTION',
    title: 'Memory management divides responsibility into optimisation, organisation and protection',
    lead: 'Memory optimisation tracks allocated and free memory and swaps data to and from HDD or SSD. Memory organisation determines how much memory an application receives and how it is arranged.',
    richBlocks: [{ kind: 'table', table: { caption: 'Memory organisation methods named by Hodder', headers: ['Method', 'Organisation'], rows: [
      ['single (contiguous) allocation', 'all memory is made available to one application; used by MS-DOS and embedded systems'],
      ['partitioned allocation', 'memory is split into contiguous partitions that can vary in size'],
      ['paged memory', 'like partitioned allocation, but every partition has a fixed size; used by virtual memory systems'],
      ['segmented memory', 'blocks are not contiguous; each segment is a logical grouping of data'],
    ] } }], bullets: ['Memory protection prevents competing applications from occupying the same memory locations at the same time.'],
    visual: 'types', accent: 'cyan', ...source(140, ['Memory management', 'Memory optimisation', 'Memory organisation', 'Memory protection']),
  },
  {
    id: 'h5-512-memory-fence', section: '5.1 Operating systems', subtopicCode: '5.1.2', eyebrow: 'MEMORY PROTECTION · FIGURE 5.4',
    title: 'A FENCE marks boundaries between protected memory regions',
    lead: 'Hodder Figure 5.4 shows the operating system and three applications separated by boundary addresses. The boundaries A + 1, B + 1 and C + 1 are referred to as a FENCE.',
    bullets: ['Addresses begin at 0 and extend to upper limit Z.', 'A FENCE defines a boundary between the operating system and applications.', 'An application cannot access a memory location lower than its FENCE address.'],
    visual: 'types', accent: 'rose', ...source(141, ['Figure 5.4 Memory protection', 'FENCE', 'A + 1', 'B + 1', 'C + 1']),
  },
  {
    id: 'h5-512-security-management', section: '5.1 Operating systems', subtopicCode: '5.1.2', eyebrow: 'SECURITY MANAGEMENT · EXTENSION ACTIVITY 5A',
    title: 'Security management protects integrity, confidentiality and availability',
    lead: 'Hodder links security management to OS updates, current antivirus/security software, firewall communication, user privileges, access rights, recovery/system restore and prevention of illegal intrusion.',
    bullets: ['User accounts, passwords and user IDs can prevent entry to private areas on multi-user systems.', 'Access rights are maintained for all users.', 'Recovery and system restore can recover data when it has been lost or corrupted.'],
    richBlocks: [{ kind: 'callout', tone: 'extension', title: 'Extension Activity 5A', text: 'While working through Chapters 5 and 6, identify methods that ensure security, privacy and integrity of data, link them to operating-system security management, and distinguish clearly between security, privacy and integrity.' }],
    visual: 'types', accent: 'amber', ...source(141, ['Security management', 'Extension Activity 5A']),
  },
];

export const CHAPTER_5_DEEP_SLIDES: HodderLessonSlide[] = [
  {
    id: 'h5-512-process-hardware-file', section: '5.1 Operating systems', subtopicCode: '5.1.2', eyebrow: '5.1.2 · PROCESS · HARDWARE · FILE MANAGEMENT',
    title: 'The OS coordinates running processes, peripherals and files',
    lead: 'Hodder completes the operating-system management model by showing how processes share resources, how device drivers mediate access to peripherals and how files are named, stored and protected.',
    richBlocks: [
      { kind: 'comparison', leftTitle: 'Process management', rightTitle: 'Hardware management', rows: [
        ['Allocates resources and synchronises running processes.', 'Communicates with input/output devices using device drivers.'],
        ['Uses scheduling, queues and conflict resolution.', 'Translates file data into a form a device can use.'],
        ['Permits sharing and exchange of data between processes.', 'Assigns priorities and manages release of hardware resources.'],
      ] },
      { kind: 'bullets', items: [
        'File management defines naming conventions and supports create, open, close, delete, rename, copy and move operations.',
        'It maintains directory structures and file access controls, including edit permissions, locks and password protection.',
        'It also works with the logical storage format and loads required file data from secondary storage into memory.',
      ] },
    ],
    teacherPrompt: 'Ask learners to classify six actions as process, hardware or file management and justify each choice.',
    visual: 'files', accent: 'indigo', ...source(142, ['Process management', 'Hardware management', 'File management', 'Extension Activity 5B']),
  },
  {
    id: 'h5-512-printer-management', section: '5.1 Operating systems', subtopicCode: '5.1.2', eyebrow: 'PRINTER MANAGEMENT · QUEUES · BUFFERS · INTERRUPTS',
    title: 'A printer job demonstrates hardware management in action',
    lead: 'The printer manager must bridge the speed difference between processor and printer while also responding to busy devices, priorities and hardware errors.',
    richBlocks: [{ kind: 'steps', title: 'Hodder printer-management sequence', items: [
      'Locate and load the printer driver into memory.',
      'Send data to a printer buffer ready for output.',
      'If required, place the job in a printer queue until it can be serviced.',
      'Send control commands to the printer throughout the job.',
      'Receive and handle printer interrupts and error messages such as paper or ink problems.',
    ] }],
    activity: { title: 'Trace a print job', prompt: 'Explain what happens when the printer is busy, then runs out of paper while a low-priority document is waiting.' },
    visual: 'recap', accent: 'cyan', ...source(142, ['printer management', 'device driver', 'buffer', 'queue', 'interrupt']),
  },
  {
    id: 'h5-513-formatter', section: '5.1 Operating systems', subtopicCode: '5.1.3', eyebrow: '5.1.3 · UTILITY SOFTWARE · DISK FORMATTER',
    title: 'Formatting creates the structures the operating system needs to store and locate files',
    lead: 'A disk formatter prepares a drive by organising storage into partitions and creating the file-system structures used to track files and free space.',
    bullets: [
      'Partitions are contiguous blocks of storage that are formatted with directory and table-of-contents information.',
      'A full NTFS format fills sectors with zeros and reads them back, which tests sectors but destroys existing data.',
      'Checking tools can identify bad sectors, mark them unusable and redirect future storage to good sectors.',
      'Hard bad sectors are associated with physical damage or manufacturing faults; soft bad sectors can result from data corruption such as power failure or static effects.',
    ],
    keyTerms: [
      { term: 'Disk formatter', definition: 'Utility that prepares a disk so files can be stored and retrieved.' },
      { term: 'Bad sector', definition: 'A faulty HDD sector that may be caused by physical damage or data corruption.' },
    ],
    visual: 'files', accent: 'amber', ...source(143, ['Hard disk formatter', 'NTFS', 'bad sector', 'Table 5.1']),
  },
  {
    id: 'h5-513-antivirus', section: '5.1 Operating systems', subtopicCode: '5.1.3', eyebrow: 'VIRUS CHECKERS · HEURISTICS · QUARANTINE',
    title: 'Antivirus combines signatures, behaviour checks and quarantine',
    lead: 'Hodder presents virus checking as a continuously updated defensive utility that checks programs before use and isolates suspicious files.',
    richBlocks: [{ kind: 'steps', title: 'Typical antivirus workflow', items: [
      'Check software or files before they are loaded or executed.',
      'Compare suspicious code with a database of known malware signatures.',
      'Use heuristic checking to identify behaviour that may indicate a previously unknown virus.',
      'Move suspected files into quarantine so they can be removed or reviewed safely.',
      'Keep definitions current and run periodic full-system scans because some malware can remain dormant.',
    ] }],
    keyTerms: [
      { term: 'Heuristic checking', definition: 'Looking for suspicious behaviour that may indicate malware even when a known signature is not available.' },
      { term: 'Quarantine', definition: 'Isolation of a suspected infected file before deletion or release.' },
      { term: 'False positive', definition: 'A legitimate file incorrectly identified as infected.' },
    ],
    visual: 'recap', accent: 'rose', ...source(144, ['Virus checkers', 'heuristic checking', 'quarantine', 'false positive']),
  },
  {
    id: 'h5-513-defragmentation', section: '5.1 Operating systems', subtopicCode: '5.1.3', eyebrow: 'DEFRAGMENTATION · FIGURES 5.5–5.8',
    title: 'Defragmentation reduces HDD head movement by making file blocks contiguous',
    lead: 'As files are deleted, extended and rewritten, their blocks can become scattered across tracks and sectors. A disk defragmenter rearranges those blocks so each file is stored contiguously where possible.',
    bullets: [
      'Fragmentation increases access time on HDDs because the read-write head must move repeatedly to retrieve one file.',
      'The Hodder sequence in Figures 5.5–5.8 shows files becoming increasingly scattered before being reorganised.',
      'Defragmentation is less significant for SSDs because SSDs do not use a moving read-write head.',
      'If the disk is almost full, there may be too little free space to rearrange blocks effectively.',
    ],
    activity: { title: 'Explain the gain', prompt: 'Why does placing File 1 in adjacent sectors improve an HDD more than an SSD?' },
    visual: 'files', accent: 'emerald', ...sourceRange(144, 145, ['Figures 5.5–5.8', 'Disk defragmenter']),
  },
  {
    id: 'h5-513-analysis-compression', section: '5.1 Operating systems', subtopicCode: '5.1.3', eyebrow: 'DISK ANALYSIS · FILE COMPRESSION · DISK COMPRESSION',
    title: 'Storage utilities can reclaim space or reduce the amount of data stored',
    lead: 'Disk analysis identifies where storage is being used; file compression reduces individual file sizes; disk compression compresses data transparently as it is written to and read from a disk.',
    richBlocks: [{ kind: 'comparison', leftTitle: 'Disk content analysis', rightTitle: 'Compression', rows: [
      ['Reviews files and folders to identify empty space and storage use.', 'File compression saves space and can reduce upload/download time.'],
      ['Can help remove unwanted downloads, temporary data and other unneeded files.', 'Disk compression operates automatically around disk reads/writes and must remain available for previously compressed data.'],
    ] }],
    visual: 'files', accent: 'cyan', ...source(145, ['Disk content analysis/repair software', 'Disk compression', 'file compression']),
  },
  {
    id: 'h5-513-backup', section: '5.1 Operating systems', subtopicCode: '5.1.3', eyebrow: 'BACK-UP SOFTWARE · 3-COPY MODEL',
    title: 'Back-up utilities automate recoverable versions of important data',
    lead: 'The coursebook recommends both local and remote backup copies, with schedules and version history so data can be restored after deletion, corruption or other failure.',
    richBlocks: [
      { kind: 'steps', title: 'Three versions for stronger protection', items: [
        'Current working version on internal storage.',
        'Local backup on a separate device such as a portable SSD or HDD.',
        'Remote backup kept well away from the computer, for example in cloud storage.',
      ] },
      { kind: 'bullets', items: [
        'A backup utility can schedule backups and copy only files that have changed.',
        'Restore points and version histories make it possible to recover an earlier state of a file or system.',
        'Windows File History and macOS Time Machine are examples used in the chapter to illustrate automated versioned backup.',
      ] },
    ],
    activity: { title: 'Recovery scenario', prompt: 'A student overwrites a report, then notices the mistake three days later. Explain which backup features would be most useful.' },
    visual: 'files', accent: 'indigo', ...source(146, ['Back-up software', 'File History', 'Time Machine', 'restore point']),
  },
  {
    id: 'h5-514-library-model', section: '5.1 Operating systems', subtopicCode: '5.1.4', eyebrow: '5.1.4 · PROGRAM LIBRARIES · FIGURES 5.10–5.11',
    title: 'Libraries turn tested routines into reusable building blocks',
    lead: 'A developer can reuse pre-written routines rather than recreating animation, music, sorting, graphics or other common behaviour in every program.',
    bullets: [
      'Reusing library routines reduces development time and cost.',
      'Modular development allows several programmers to work on different parts of the same product.',
      'Reusing common routines can help maintain consistency across a software suite or company product line.',
      'Previously tested routines reduce the amount of fresh testing required for each new application.',
    ],
    keyTerms: [
      { term: 'Program library', definition: 'A collection where programs and routines are stored for reuse by software developers.' },
      { term: 'Library routine', definition: 'A tested routine that can be incorporated into another program.' },
    ],
    visual: 'files', accent: 'emerald', ...source(147, ['Program libraries', 'Figures 5.10–5.11', 'library program', 'library routine']),
  },
  {
    id: 'h5-514-static-dynamic', section: '5.1 Operating systems', subtopicCode: '5.1.4', eyebrow: 'STATIC LIBRARY ↔ DYNAMIC LINK LIBRARY',
    title: 'Static linking embeds a routine; dynamic linking connects to it at run time',
    lead: 'Hodder contrasts static libraries, where executable library code is linked into the program at compilation, with DLL files that remain separate and are loaded when required.',
    richBlocks: [
      { kind: 'comparison', leftTitle: 'Static library', rightTitle: 'Dynamic Link Library (DLL)', rows: [
        ['Routine is linked into the executable at compilation.', 'Routine remains a separate file until run time.'],
        ['The program contains its own copy of the linked code.', 'Several applications can use the same routine.'],
        ['Executable is more self-contained.', 'Main executable can be smaller and only loads the routine when required.'],
      ] },
      { kind: 'table', table: { caption: 'DLL trade-offs from Table 5.2', headers: ['Benefits', 'Risks / drawbacks'], rows: [
        ['Smaller main executable and reduced memory use.', 'Required DLL must be present at run time.'],
        ['DLL can be updated without recompiling the main program.', 'A changed or corrupted DLL can cause unexpected results or crashes.'],
        ['One DLL can serve several applications.', 'Malicious modification of a DLL can introduce a security risk.'],
      ] } },
    ],
    visual: 'files', accent: 'amber', ...source(148, ['Static libraries', 'dynamic libraries', 'Dynamic Link Library', 'Table 5.2']),
  },
  {
    id: 'h5-52-key-terms', section: '5.2 Language translators', eyebrow: '5.2 · TRANSLATOR & DEBUGGING TERMS',
    title: 'Translation and debugging use a precise set of terms',
    lead: 'The chapter distinguishes the translator that produces machine code from the development tools used to find syntax and logic faults.',
    keyTerms: [
      { term: 'Assembler', definition: 'Translates assembly language into machine code.' },
      { term: 'Compiler', definition: 'Translates a high-level source program into object code before execution.' },
      { term: 'Interpreter', definition: 'Translates and executes high-level source statements under interpreter control.' },
      { term: 'Syntax error', definition: 'An error in the grammar of the source program.' },
      { term: 'Logic error', definition: 'An error in the program logic that can produce an incorrect result even when syntax is valid.' },
      { term: 'Breakpoint', definition: 'A deliberate pause in execution so program state can be inspected during debugging.' },
      { term: 'Report window', definition: 'A run-time window showing the contents of variables or evaluated expressions.' },
    ],
    visual: 'types', accent: 'indigo', ...source(150, ['Translator key terms', 'IDE', 'syntax error', 'logic error', 'debugging', 'single stepping', 'breakpoint', 'report window']),
  },
  {
    id: 'h5-521-assembler', section: '5.2 Language translators', subtopicCode: '5.2.1', eyebrow: '5.2.1 · ASSEMBLER',
    title: 'An assembler translates chip-specific assembly language into machine code',
    lead: 'Assembly language is machine dependent, so both the source language and the generated machine code are tied to a particular processor family.',
    bullets: [
      'The translated program can be placed directly in memory or stored for later execution.',
      'If object code is stored, a loader is used to place it into main memory before execution.',
      'Stored object code can be executed repeatedly without retranslating the assembly source.',
      'Assembly language is often chosen for time-critical or hardware-near tasks such as parts of an operating system, control systems or robotics.',
    ],
    activity: { title: 'Machine dependence', prompt: 'Explain why an assembly-language program written for one processor family may not run on a different processor family.' },
    visual: 'types', accent: 'cyan', ...source(150, ['5.2.1 Translation and execution of programs', 'Assemblers', 'loader', 'machine dependent']),
  },
  {
    id: 'h5-521-compiler-interpreter', section: '5.2 Language translators', subtopicCode: '5.2.1', eyebrow: 'COMPILER ↔ INTERPRETER · TABLE 5.3',
    title: 'Compiler and interpreter both handle high-level languages but execute differently',
    lead: 'A compiler generates a stored object program that can be run later; an interpreter translates and executes statements each time the source program runs.',
    richBlocks: [{ kind: 'table', table: { caption: 'Translator comparison from Table 5.3', headers: ['Feature', 'Assembler', 'Compiler', 'Interpreter'], rows: [
      ['Source language', 'assembly language', 'high-level language', 'high-level language'],
      ['Machine dependent', 'yes', 'source language itself is portable if a suitable compiler exists', 'source language itself is portable if a suitable interpreter exists'],
      ['Object program generated', 'yes', 'yes', 'no stored translated program'],
      ['Translation relationship', 'one assembly instruction maps to one machine instruction', 'one high-level statement can expand into many machine instructions', 'high-level statement is translated/executed under interpreter control'],
    ] } }],
    teacherPrompt: 'Ask why a compiled program can run repeatedly without the compiler but an interpreted program still needs its interpreter.',
    visual: 'types', accent: 'emerald', ...source(151, ['Compilers and interpreters', 'Table 5.3']),
  },
  {
    id: 'h5-522-compiler-interpreter-tradeoffs', section: '5.2 Language translators', subtopicCode: '5.2.2', eyebrow: '5.2.2 · COMPILATION ↔ INTERPRETATION · TABLE 5.4',
    title: 'Development convenience and execution speed pull in different directions',
    lead: 'Hodder uses Table 5.4 to contrast the faster repeated execution and source-code protection of compiled software with the line-by-line feedback and easier debugging of interpreted development.',
    richBlocks: [{ kind: 'comparison', leftTitle: 'Compiler strengths', rightTitle: 'Interpreter strengths', rows: [
      ['Translation is completed before execution, so repeated runs are faster.', 'Errors can be found and corrected statement by statement during development.'],
      ['End user can run executable object code without receiving source code.', 'Intermediate or partial results are easier to inspect while testing.'],
      ['Generated code may be optimised by the compiler.', 'The programmer can restart quickly after correcting a fault.'],
      ['Source code remains under developer control.', 'Useful in early development when frequent edits are being made.'],
    ] }],
    bullets: [
      'A compiler may report several dependent errors caused by one earlier mistake.',
      'An interpreted program normally executes more slowly because translation is repeated as statements are run.',
      'Interpreted distribution can expose source code and relies on the interpreter/run-time environment being available.',
    ],
    visual: 'recap', accent: 'rose', ...sourceRange(151, 152, ['Table 5.4 Pros and cons of compilers and interpreters']),
  },
  {
    id: 'h5-523-bytecode', section: '5.2 Language translators', subtopicCode: '5.2.3', eyebrow: '5.2.3 · PARTIAL COMPILATION + INTERPRETATION',
    title: 'Intermediate code combines a compilation stage with a portable run-time stage',
    lead: 'The chapter describes high-level source being compiled into machine-independent intermediate code, p-code or bytecode, which is then executed by a virtual-machine run time.',
    richBlocks: [{ kind: 'steps', title: 'Combined translation model', items: [
      'Write high-level source code.',
      'Compile the source into intermediate code / bytecode.',
      'Move the intermediate code to a target system with a suitable virtual machine or run time.',
      'Interpret or further compile the intermediate code during execution.',
    ] }],
    bullets: [
      'The approach aims to reduce repeated high-level translation while retaining portability across systems with suitable run-time support.',
      'Java and Python are used in the chapter as examples of languages that can produce bytecode for execution by a virtual machine or interpreter.',
    ],
    activity: { title: 'Trace the pipeline', prompt: 'Explain why bytecode is not the same as native machine code, then state what extra software is needed to execute it.' },
    visual: 'types', accent: 'amber', ...sourceRange(152, 153, ['Intermediate code', 'p-code', 'bytecode', 'virtual machine', 'Java', 'Python', 'Extension Activity 5E']),
  },
  {
    id: 'h5-524-ide-overview', section: '5.2 Language translators', subtopicCode: '5.2.4', eyebrow: '5.2.4 · INTEGRATED DEVELOPMENT ENVIRONMENT',
    title: 'An IDE brings editing, translation, execution, debugging and documentation into one environment',
    lead: 'Hodder identifies four core facilities: a source-code editor; a compiler, interpreter or both; a run-time environment with a debugger; and an auto-documenter.',
    richBlocks: [{ kind: 'steps', title: 'Core IDE facilities', items: [
      'Source-code editor for writing and editing programs.',
      'Compiler and/or interpreter for translating and running code.',
      'Run-time environment with debugger for tracing program behaviour.',
      'Auto-documenter for quick explanations of code and library features.',
    ] }],
    richBlocks: undefined,
    bullets: ['Examples named by the chapter include NetBeans, PyCharm, Visual Studio and SharpDevelop; the exact set of supported languages differs by IDE.'],
    visual: 'recap', accent: 'indigo', ...sourceRange(153, 154, ['5.2.4 Integrated development environment', 'source code editor', 'compiler', 'interpreter', 'debugger', 'auto-documenter']),
  },
  {
    id: 'h5-524-editor', section: '5.2 Language translators', subtopicCode: '5.2.4', eyebrow: 'SOURCE-CODE EDITOR · FIGURES 5.12–5.13',
    title: 'Editor features reduce typing effort and expose syntax mistakes early',
    lead: 'The source-code editor can format code for readability and provide context-aware assistance while the programmer is writing.',
    bullets: [
      'Syntax colouring and pretty printing make code structure easier to read.',
      'Context-sensitive prompts and text completion can suggest variable names and reserved words.',
      'Dynamic syntax checking identifies possible syntax errors as code is typed, before the program runs.',
      'Large code blocks can be collapsed so the programmer can focus on the section being developed.',
      'Logic errors are different: they normally become visible only when the program is executed and its behaviour is checked.',
    ],
    visual: 'recap', accent: 'cyan', ...sourceRange(154, 155, ['Figure 5.12', 'Figure 5.13', 'prettyprinting', 'context-sensitive prompts', 'dynamic syntax checking', 'collapse code blocks']),
  },
  {
    id: 'h5-524-debugger', section: '5.2 Language translators', subtopicCode: '5.2.4', eyebrow: 'DEBUGGER · SINGLE STEP · BREAKPOINT · REPORT WINDOW',
    title: 'A debugger makes program state visible at controlled points during execution',
    lead: 'The IDE run-time environment can execute the program under debugger control so the programmer can inspect how values change and locate logic errors.',
    richBlocks: [{ kind: 'steps', title: 'Debugging workflow', items: [
      'Run one statement at a time using single stepping.',
      'Set a breakpoint where execution should pause.',
      'Inspect variables and evaluated expressions in a report window.',
      'Compare the observed state with the expected state to locate a logic error.',
      'Continue, modify the program and repeat the test until behaviour is correct.',
    ] }],
    visual: 'recap', accent: 'emerald', ...source(155, ['Figure 5.14', 'debugger', 'single stepping', 'breakpoint', 'report window']),
  },
  {
    id: 'h5-524-documentation-review', section: '5.2 Language translators', subtopicCode: '5.2.4', eyebrow: 'AUTO-DOCUMENTER · ACTIVITY 5B · END-OF-CHAPTER REVIEW',
    title: 'The final section links IDE features back to translators, libraries and OS management',
    lead: 'The auto-documenter supplies quick code documentation, while the closing activity and exam-style questions require students to compare translators, explain IDE features and apply operating-system and library concepts.',
    bullets: [
      'Auto-documentation explains the function and purpose of programming code or library features.',
      'Activity 5B revisits assembler-versus-compiler, compiler-versus-interpreter and IDE feature explanations.',
      'The end-of-chapter questions also revisit DLL benefits/drawbacks, OS management tasks, backup/defragmentation, language translators and IDE facilities.',
    ],
    activity: { title: 'Chapter synthesis', prompt: 'Choose one OS task, one utility, one library feature, one translator and one IDE tool. Explain how the five fit into a single software-development or execution scenario.' },
    visual: 'recap', accent: 'rose', ...sourceRange(157, 158, ['Auto-documenter', 'Figure 5.17', 'Activity 5B', 'End of chapter questions']),
  },
];

/** Historical independently audited opening extract retained for regression tests. */
export const CHAPTER_5_DRAFT: Omit<HodderLessonChapter, 'number'> & { number: 5 } = {
  number: 5,
  level: 'AS Level',
  title: 'System software',
  subtitle: 'Operating systems · utility software · program libraries · language translators · IDEs',
  subtopics: ['5.1 Operating systems', '5.2 Language translators'],
  sourceNote: 'Source-grounded from the exact connected Hodder 9618 Coursebook. This historical opening extract covers printed pp.136–141.',
  coverage: 'Source-complete through p.141: Chapter 5 objectives and prior knowledge, key operating-system vocabulary, Figure 5.1 and OS start-up history, CLI/GUI and Figure 5.2 WIMP, Figure 5.3 operating-system tasks, memory management and Figure 5.4 memory protection, security management and Extension Activity 5A.',
  slides: CHAPTER_5_OPENING_SLIDES,
};

/** Full deep-fidelity Chapter 5 lesson covering the exact printed chapter range. */
export const CHAPTER_5_FINAL: HodderLessonChapter = {
  number: 5,
  level: 'AS Level',
  title: 'System software',
  subtitle: 'Operating systems · utility software · program libraries · language translators · IDEs',
  subtopics: ['5.1 Operating systems', '5.2 Language translators'],
  sourceNote: 'Deep source-backed teaching route from the exact connected Hodder 9618 Chapter 5, printed pp.136–158. The independently audited pp.136–141 opening is retained and extended through the remainder of the chapter.',
  coverage: 'Full printed-page coverage pp.136–158: chapter objectives and prior knowledge; OS need and HCI; memory, security, process, hardware and file management; printer queues/buffers; utility software; program libraries and DLL trade-offs; assemblers, compilers and interpreters; partial compilation and bytecode; IDE editor, translator, debugger and auto-documentation features; activities and end-of-chapter synthesis.',
  slides: [...CHAPTER_5_OPENING_SLIDES, ...CHAPTER_5_DEEP_SLIDES],
};
