import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';

const source = (page: number, elements: string[] = []) => ({
  sourcePages: [page],
  sourceLabel: `Hodder Chapter 5 · p.${page}`,
  sourceElements: [`Hodder p.${page}`, ...elements],
});

export const CHAPTER_5_OPENING_SLIDES: HodderLessonSlide[] = [
  {
    id: 'h5-overview',
    section: 'Chapter overview',
    eyebrow: 'CHAPTER 5 · SYSTEM SOFTWARE',
    title: 'System software: operating systems, utilities, libraries and translators',
    lead: 'Hodder opens Chapter 5 by linking operating-system management tasks to utility software, program libraries, language translators and integrated development environments (IDEs).',
    richBlocks: [{
      kind: 'steps',
      title: 'What you should already know',
      items: [
        'Explain why household devices controlled by microprocessors do not necessarily need an operating system.',
        'Name common operating systems used by computers, mobile phones and tablets.',
        'Compare a graphical user interface (GUI) with a command line interface (CLI).',
        'Investigate how early computers were prepared for use before modern operating systems.',
        'Describe the role of buffers and interrupts when an inkjet printer receives a print job.',
      ],
    }],
    visual: 'types',
    accent: 'indigo',
    ...source(136, ['Chapter 5 learning objectives', 'What you should already know']),
  },
  {
    id: 'h5-51-key-terms',
    section: '5.1 Operating systems',
    eyebrow: '5.1 · KEY TERMS',
    title: 'The chapter vocabulary separates interface, memory and management responsibilities',
    lead: 'Hodder defines an operating system as software that provides an environment in which applications can run and an interface between hardware and human operators.',
    richBlocks: [{
      kind: 'table',
      table: {
        caption: 'Opening operating-system terminology',
        headers: ['Term', 'Source-grounded meaning'],
        rows: [
          ['HCI', 'human–computer interface'],
          ['GUI', 'graphical user interface'],
          ['CLI', 'command line interface'],
          ['WIMP', 'windows, icons, menu and pointing device'],
          ['Post-WIMP', 'interfaces beyond WIMP that use touch-screen technology rather than a pointing device'],
          ['Memory management', 'part of the operating system that controls main memory'],
          ['Security management', 'part of the operating system that ensures integrity, confidentiality and availability of data'],
          ['Memory protection', 'prevents two competing applications from using the same memory locations at the same time'],
        ],
      },
    }],
    visual: 'types',
    accent: 'cyan',
    ...source(137, ['Key terms', 'Operating system', 'HCI', 'GUI', 'CLI', 'WIMP', 'Post-WIMP', 'Memory management', 'Security management']),
  },
  {
    id: 'h5-511-os-need',
    section: '5.1 Operating systems',
    subtopicCode: '5.1.1',
    eyebrow: '5.1.1 · THE NEED FOR AN OPERATING SYSTEM · FIGURE 5.1',
    title: 'Start-up evolved from paper media to ROM, HDD, BIOS and flash memory',
    lead: 'Early computers had no operating system: control software had to be loaded each time the computer started, using paper tape or punched cards. Hodder then traces the move to stored start-up software.',
    bullets: [
      'The Acorn BBC B stored part of its operating system in an internal ROM chip and used a cassette tape machine to load the remainder.',
      'As HDDs developed, operating systems were stored on hard disk and motherboard start-up was handled by the BIOS.',
      'BIOS was initially stored in ROM; in modern computers its contents are stored on a flash-memory chip.',
      'BIOS configuration is stored in CMOS memory and can therefore be altered or deleted.',
      'Only the required part of a modern operating system is copied into RAM because loading the whole OS at once would seriously affect performance.',
    ],
    visual: 'types',
    accent: 'amber',
    ...source(138, ['Figure 5.1 An Acorn BBC B and its cassette tape machine', 'BIOS', 'CMOS', 'ROM', 'flash memory']),
  },
  {
    id: 'h5-511-cli-gui',
    section: '5.1 Operating systems',
    subtopicCode: '5.1.1',
    eyebrow: 'CLI ↔ GUI · FIGURE 5.2',
    title: 'CLI gives direct command control; GUI replaces command sequences with visual interaction',
    lead: 'A CLI requires commands to be typed exactly and can take time, but gives direct communication with the computer without restricting the user to pre-determined options. A GUI uses pictures or symbols (icons) to trigger operations.',
    example: {
      title: 'Hodder CLI illustration',
      lines: [
        'SQLPrepare(hStmt,',
        '(SQLCHAR *) "INSERT INTO tableB SELECT * FROM tableA",',
        'SQL_NTS);',
        'SQLExecute(hStmt);',
      ],
    },
    bullets: [
      'WIMP uses windows, icons, menu and a pointing device; a mouse controls a cursor and icons open applications in windows.',
      'A windows manager handles interaction between windows, applications and the windowing system.',
      'Post-WIMP interaction uses touch-screen actions such as pinching, rotating and tapping an icon with a finger or stylus.',
    ],
    visual: 'types',
    accent: 'emerald',
    ...source(139, ['Figure 5.2 An example of WIMP', 'CLI example', 'GUI', 'WIMP', 'post-WIMP']),
  },
  {
    id: 'h5-512-os-tasks',
    section: '5.1 Operating systems',
    subtopicCode: '5.1.2',
    eyebrow: '5.1.2 · OPERATING SYSTEM TASKS · FIGURE 5.3',
    title: 'Five management areas surround the operating system',
    lead: 'Figure 5.3 organises operating-system work into memory management, file management, security management, hardware management and process management.',
    richBlocks: [{
      kind: 'steps',
      title: 'Figure 5.3 task map',
      items: ['memory management', 'file management', 'security management', 'hardware management', 'process management'],
    }],
    visual: 'types',
    accent: 'indigo',
    ...source(140, ['Figure 5.3 Operating system tasks']),
  },
  {
    id: 'h5-512-memory-management',
    section: '5.1 Operating systems',
    subtopicCode: '5.1.2',
    eyebrow: 'MEMORY MANAGEMENT · OPTIMISATION · ORGANISATION · PROTECTION',
    title: 'Memory management divides responsibility into optimisation, organisation and protection',
    lead: 'Memory optimisation tracks allocated and free memory and swaps data to and from HDD or SSD. Memory organisation determines how much memory an application receives and how that memory is arranged.',
    richBlocks: [{
      kind: 'table',
      table: {
        caption: 'Memory organisation methods named by Hodder',
        headers: ['Method', 'Organisation'],
        rows: [
          ['single (contiguous) allocation', 'all memory is made available to one application; used by MS-DOS and embedded systems'],
          ['partitioned allocation', 'memory is split into contiguous partitions that can vary in size'],
          ['paged memory', 'like partitioned allocation, but every partition has a fixed size; used by virtual memory systems'],
          ['segmented memory', 'blocks are not contiguous; each segment is a logical grouping of data'],
        ],
      },
    }],
    bullets: ['Memory protection prevents competing applications from occupying the same memory locations at the same time.'],
    visual: 'types',
    accent: 'cyan',
    ...source(140, ['Memory management', 'Memory optimisation', 'Memory organisation', 'Memory protection']),
  },
  {
    id: 'h5-512-memory-fence',
    section: '5.1 Operating systems',
    subtopicCode: '5.1.2',
    eyebrow: 'MEMORY PROTECTION · FIGURE 5.4',
    title: 'A FENCE marks boundaries between protected memory regions',
    lead: 'Hodder Figure 5.4 shows the operating system and three applications separated by boundary addresses. The boundaries A + 1, B + 1 and C + 1 are referred to as a FENCE.',
    bullets: [
      'Addresses begin at 0 and extend to upper limit Z in the source diagram.',
      'A FENCE defines a boundary between the operating system and applications.',
      'An application cannot access a memory location lower than its FENCE address.',
    ],
    visual: 'types',
    accent: 'rose',
    ...source(141, ['Figure 5.4 Memory protection', 'FENCE', 'A + 1', 'B + 1', 'C + 1']),
  },
  {
    id: 'h5-512-security-management',
    section: '5.1 Operating systems',
    subtopicCode: '5.1.2',
    eyebrow: 'SECURITY MANAGEMENT · EXTENSION ACTIVITY 5A',
    title: 'Security management protects integrity, confidentiality and availability',
    lead: 'Hodder links security management to operating-system updates, current antivirus/security software, firewall communication, user privileges, access rights, recovery and system restore, and prevention of illegal intrusion.',
    bullets: [
      'User accounts, passwords and user IDs can prevent users entering private areas on multi-user systems.',
      'Access rights are maintained for all users.',
      'Recovery and system restore can recover data when it has been lost or corrupted.',
    ],
    richBlocks: [{
      kind: 'callout',
      tone: 'extension',
      title: 'Extension Activity 5A',
      text: 'While working through Chapters 5 and 6, identify methods that ensure security, privacy and integrity of data, link them to operating-system security management, and distinguish clearly between security, privacy and integrity.',
    }],
    visual: 'types',
    accent: 'amber',
    ...source(141, ['Security management', 'Extension Activity 5A']),
  },
];

/**
 * Source-grounded Chapter 5 opening draft. The exact connected Hodder chapter
 * runs from printed p.136 to p.158; only pp.136–141 are implemented here, so
 * the runtime source-readiness gate must keep Chapter 5 inactive.
 */
export const CHAPTER_5_DRAFT: Omit<HodderLessonChapter, 'number'> & { number: 5 } = {
  number: 5,
  level: 'AS Level',
  title: 'System software',
  subtitle: 'Operating systems · utilities · program libraries · language translators · IDEs',
  subtopics: ['5.1 Operating systems', '5.2 Utility software', '5.3 Program libraries', '5.4 Language translators', '5.5 Integrated development environments'],
  sourceNote: 'Source-grounded from the exact connected Hodder 9618 Coursebook. This draft covers printed pp.136–141 only; pp.142–158 remain explicitly unresolved in this implementation.',
  coverage: 'Source-complete through p.141: Chapter 5 objectives and prior knowledge, key operating-system vocabulary, Figure 5.1 and OS start-up history, CLI/GUI and Figure 5.2 WIMP, Figure 5.3 operating-system tasks, memory management and Figure 5.4 memory protection, security management and Extension Activity 5A.',
  slides: CHAPTER_5_OPENING_SLIDES,
};
