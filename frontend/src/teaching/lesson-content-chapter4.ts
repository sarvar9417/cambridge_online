import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';

const source = (page: number, elements: string[] = []) => ({
  sourcePages: [page],
  sourceLabel: `Hodder Chapter 4 · p.${page}`,
  sourceElements: [`Hodder p.${page}`, ...elements],
});

export const CHAPTER_4_PROCESSOR_SLIDES: HodderLessonSlide[] = [
  {
    id: 'h4-overview',
    section: 'Chapter overview',
    eyebrow: 'CHAPTER 4 · PROCESSOR FUNDAMENTALS',
    title: 'Processor fundamentals: architecture, buses, performance and ports',
    lead: 'Hodder opens Chapter 4 with the Von Neumann model, processor registers and components, system buses, performance factors, peripheral ports, the fetch-execute cycle, interrupts, assembly language, addressing modes, shifts and bit manipulation.',
    richBlocks: [{
      kind: 'steps',
      title: 'What you should already know',
      items: [
        'Name the main components of a typical computer system.',
        'Compare desktop/laptop operation with tablet or phone operation.',
        'Identify input and output ports on computers, laptops and phones.',
        'Consider how the microprocessor has developed over the last ten years.',
      ],
    }],
    visual: 'types',
    accent: 'indigo',
    ...source(107, ['Chapter 4 learning objectives', 'What you should already know']),
  },
  {
    id: 'h4-411-von-neumann',
    section: '4.1 Central processing unit (CPU) architecture',
    subtopicCode: '4.1.1',
    eyebrow: '4.1.1 · VON NEUMANN MODEL · FIGURE 4.1',
    title: 'The stored-program model links CPU registers, memory and three buses',
    lead: 'John Von Neumann developed the stored-program computer concept in the mid-1940s: the processor can access memory directly, memory can hold programs as well as data, and stored instructions can execute in sequential order.',
    bullets: [
      'The architecture includes a central processing unit (CPU or processor).',
      'The processor can access memory directly.',
      'Computer memory can store programs as well as data.',
      'Stored programs contain instructions that can be executed in sequential order.',
    ],
    visual: 'types',
    accent: 'cyan',
    ...source(109, ['Figure 4.1 Representation of Von Neumann architecture', 'stored program computer']),
  },
  {
    id: 'h4-412-cpu-components',
    section: '4.1 Central processing unit (CPU) architecture',
    subtopicCode: '4.1.2',
    eyebrow: '4.1.2 · COMPONENTS OF THE PROCESSOR',
    title: 'ALU, CU, system clock and IAS coordinate processing',
    lead: 'Hodder identifies four main processor components: arithmetic logic unit (ALU), control unit (CU), system clock and immediate access store (IAS).',
    richBlocks: [{
      kind: 'comparison',
      leftTitle: 'Component',
      rightTitle: 'Source role',
      rows: [
        ['ALU', 'Carries out the required arithmetic or logic operations while a program is running.'],
        ['CU', 'Reads and interprets instructions, then sends control signals to synchronise data flow and program instructions.'],
        ['System clock', 'Produces timing signals on the control bus so operations remain synchronised.'],
        ['IAS', 'Temporarily holds data and programs the CPU needs; Hodder identifies IAS as primary (RAM) memory.'],
      ],
    }],
    example: {
      title: 'Hodder shift example',
      lines: [
        '00110111 shifted two places left → 11011100',
        'The source uses this to illustrate multiplication by a factor of 4.',
        'The accumulator (ACC) is a temporary register used during ALU calculations.',
      ],
    },
    visual: 'types',
    accent: 'emerald',
    ...source(109, ['4.1.2 Components of the processor (CPU)', 'Arithmetic logic unit (ALU)']),
  },
  {
    id: 'h4-413-registers',
    section: '4.1 Central processing unit (CPU) architecture',
    subtopicCode: '4.1.3',
    eyebrow: 'TABLE 4.1 · COMMON REGISTERS',
    title: 'Special-purpose registers hold the program state',
    lead: 'Registers may be general purpose or special purpose. Table 4.1 gives the special registers used throughout the chapter and links them to later fetch-execute and assembly-code work.',
    richBlocks: [{
      kind: 'table',
      table: {
        caption: 'Table 4.1 · Common registers',
        headers: ['Register', 'Abbreviation', 'Function / purpose'],
        rows: [
          ['current instruction register', 'CIR', 'stores the current instruction being decoded and executed'],
          ['index register', 'IX', 'used when carrying out index addressing operations (assembly code)'],
          ['memory address register', 'MAR', 'stores the address of the memory location currently being read from or written to'],
          ['memory data/buffer register', 'MDR/MBR', 'stores data just read from memory or data about to be written to memory'],
          ['program counter', 'PC', 'stores the address where the next instruction to be read can be found'],
          ['status register', 'SR', 'contains bits which can be set or cleared depending on the operation'],
        ],
      },
    }],
    visual: 'types',
    accent: 'indigo',
    ...source(110, ['Table 4.1 Common registers', 'CIR', 'IX', 'MAR', 'MDR/MBR', 'PC', 'SR']),
  },
  {
    id: 'h4-413-status-flags',
    section: '4.1 Central processing unit (CPU) architecture',
    subtopicCode: '4.1.3',
    eyebrow: 'STATUS REGISTER · FLAGS · EXTENSION ACTIVITY 4A',
    title: 'Status flags record outcomes of arithmetic and logic processing',
    lead: 'Each bit in the status register is a flag. Hodder highlights Carry, Negative, Overflow and Zero, then demonstrates how the NVCZ pattern changes after binary addition.',
    richBlocks: [
      {
        kind: 'table',
        table: {
          caption: 'Four source flags',
          headers: ['Flag', 'Set to 1 when…'],
          rows: [
            ['Carry (C)', 'there is a CARRY following an addition operation'],
            ['Negative (N)', 'the result of a calculation is NEGATIVE'],
            ['Overflow (V)', 'an arithmetic operation produces OVERFLOW'],
            ['Zero (Z)', 'an arithmetic or logic operation produces ZERO'],
          ],
        },
      },
      {
        kind: 'callout',
        tone: 'extension',
        title: 'Extension Activity 4A',
        text: 'Find the conditions that could set parity (P), interrupt (I), zero (Z) and half-carry (H) flags to 1.',
      },
    ],
    example: {
      title: 'Source flag examples',
      lines: [
        '01110111 + 00111000 = 10101111 → NVCZ = 1100',
        '10001000 + 11000111 = 101001111 → NVCZ = 0110',
      ],
    },
    visual: 'types',
    accent: 'rose',
    ...source(111, ['Carry flag', 'Negative flag', 'Overflow flag', 'Zero flag', 'Extension Activity 4A']),
  },
  {
    id: 'h4-414-system-buses',
    section: '4.1 Central processing unit (CPU) architecture',
    subtopicCode: '4.1.4',
    eyebrow: '4.1.4 · SYSTEM BUSES · FIGURE 4.2',
    title: 'Address, data and control buses connect CPU, memory and I/O',
    lead: 'Hodder presents buses as parallel transmission components in which each wire carries one bit. The Von Neumann architecture uses address, data and control buses.',
    richBlocks: [{
      kind: 'table',
      table: {
        caption: 'Figure 4.2 · System bus roles',
        headers: ['Bus', 'Direction / role', 'Width consequence'],
        rows: [
          ['Address bus', 'CPU → memory is unidirectional; carries addresses', 'Wider bus directly addresses more memory locations'],
          ['Data bus', 'bidirectional; carries data between CPU, memory and I/O', 'Wider bus carries a larger word length'],
          ['Control bus', 'bidirectional; carries control signals from the CU', 'Usually 8 bits wide in the source'],
        ],
      },
    }],
    example: {
      title: 'Address-space examples from Hodder',
      lines: ['16-bit address bus → 2^16 = 65 536 memory locations', '32-bit address bus → 4 294 967 296 memory locations'],
    },
    visual: 'types',
    accent: 'cyan',
    ...source(112, ['Figure 4.2 System buses', 'address bus', 'data bus', 'control bus']),
  },
  {
    id: 'h4-414-performance',
    section: '4.1 Central processing unit (CPU) architecture',
    subtopicCode: '4.1.4',
    eyebrow: 'CLOCK · CACHE · CORES · FIGURE 4.3',
    title: 'Performance depends on more than clock speed',
    lead: 'The clock cycle synchronises computer operations. Hodder gives 3.5 GHz as an example of 3.5 billion clock cycles a second, but warns that overall performance cannot be judged from clock speed alone.',
    bullets: [
      'Address-bus and data-bus width can affect performance.',
      'Overclocking can cause unsynchronised operation, crashes, instability and serious CPU overheating.',
      'Cache uses SRAM and stores frequently used instructions and data for faster access than main-memory DRAM.',
      'Multiple cores can improve performance, but doubling cores does not necessarily double performance because communication between the CPU and cores has overhead.',
    ],
    richBlocks: [{
      kind: 'comparison',
      leftTitle: 'Dual core',
      rightTitle: 'Quad core',
      rows: [['two cores', 'four cores'], ['one channel', 'six channels'], ['CPU communicates with both cores', 'CPU communicates with all four cores']],
    }],
    visual: 'types',
    accent: 'amber',
    ...source(113, ['Figure 4.3 Two cores, one channel and four cores, six channels', '3.5 GHz', 'overclocking', 'cache memory']),
  },
  {
    id: 'h4-415-ports-usb',
    section: '4.1 Central processing unit (CPU) architecture',
    subtopicCode: '4.1.5',
    eyebrow: '4.1.5 · COMPUTER PORTS · FIGURE 4.4',
    title: 'Ports connect peripheral devices; USB uses asynchronous serial transmission',
    lead: 'Hodder introduces USB, HDMI and VGA as common ports, then begins with USB: a four-wire shielded cable with two wires for power/earth and two for data transmission.',
    bullets: [
      'When a USB device is plugged in, the computer detects its presence from a small voltage-level change on the data signal wires.',
      'The device is automatically recognised and the appropriate device driver is loaded so the computer and device can communicate.',
      'For a new device, the computer searches for a matching device driver; if unavailable, the user is prompted to download the software.',
    ],
    visual: 'types',
    accent: 'emerald',
    ...source(114, ['Figure 4.4 USB cable, HDMI cable, VGA cable', 'USB ports', 'asynchronous serial data transmission']),
  },
];

/**
 * Source-grounded Chapter 4 draft. It is deliberately not source-ready yet:
 * printed pp.115–135 remain unimplemented and therefore the active lesson gate
 * must continue to hide Chapter 4 until the full chapter has been completed.
 */
export const CHAPTER_4_DRAFT: Omit<HodderLessonChapter, 'number'> & { number: 4 } = {
  number: 4,
  level: 'AS Level',
  title: 'Processor fundamentals',
  subtitle: 'CPU architecture · buses · performance · ports · fetch-execute · assembly language',
  subtopics: ['4.1 Central processing unit (CPU) architecture', '4.2 Assembly language'],
  sourceNote: 'Source-grounded from the connected Hodder 9618 Coursebook. This draft covers printed pp.107–114 only; pp.115–135 remain explicitly unresolved in this implementation.',
  coverage: 'Source-complete through p.114: chapter objectives and prior knowledge, key CPU architecture, Figure 4.1, processor components, Table 4.1 registers, status flags and Extension Activity 4A, Figure 4.2 buses, performance factors and Figure 4.3, and the opening USB content with Figure 4.4.',
  slides: CHAPTER_4_PROCESSOR_SLIDES,
};
