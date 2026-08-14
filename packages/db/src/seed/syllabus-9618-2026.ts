/**
 * Official Cambridge International AS & A Level Computer Science 9618 structure,
 * transcribed from the syllabus for examination from 2026 (Cambridge document
 * 697372-2026-syllabus.pdf, section 3 "Subject content").
 *
 * Titles are the exact Cambridge wording and are not translated: the exam, the
 * mark schemes and the question bank all key off them. Learning objectives are
 * deliberately not included here — the syllabus prints them in a two-column
 * layout that does not survive text extraction, so they are imported separately
 * and checked by hand (03-ingestion.md section 7).
 */

export type SyllabusLevel = 'AS' | 'A2';

export interface SyllabusComponent {
  number: 1 | 2 | 3 | 4;
  name: string;
  level: SyllabusLevel;
  durationMin: number;
  totalMarks: number;
  /** Percentage of the full A Level. */
  weightPct: number;
}

export interface SyllabusSubtopic {
  code: string;
  title: string;
}

export interface SyllabusTopic {
  number: number;
  title: string;
  level: SyllabusLevel;
  component: 1 | 2 | 3 | 4;
  subtopics: SyllabusSubtopic[];
}

export const SYLLABUS_CODE = '9618';
export const SYLLABUS_SUBJECT = 'Computer Science';
export const SYLLABUS_VERSION_LABEL = '2026-2028';
export const SYLLABUS_VALID_FROM = 2026;
export const SYLLABUS_VALID_TO = 2028;

export const COMPONENTS: SyllabusComponent[] = [
  {
    number: 1,
    name: 'Theory Fundamentals',
    level: 'AS',
    durationMin: 90,
    totalMarks: 75,
    weightPct: 25,
  },
  {
    number: 2,
    name: 'Fundamental Problem-solving and Programming Skills',
    level: 'AS',
    durationMin: 120,
    totalMarks: 75,
    weightPct: 25,
  },
  {
    number: 3,
    name: 'Advanced Theory',
    level: 'A2',
    durationMin: 90,
    totalMarks: 75,
    weightPct: 25,
  },
  { number: 4, name: 'Practical', level: 'A2', durationMin: 150, totalMarks: 75, weightPct: 25 },
];

export const TOPICS: SyllabusTopic[] = [
  {
    number: 1,
    title: 'Information representation',
    level: 'AS',
    component: 1,
    subtopics: [
      { code: '1.1', title: 'Data Representation' },
      { code: '1.2', title: 'Multimedia – Graphics, Sound' },
      { code: '1.3', title: 'Compression' },
    ],
  },
  {
    number: 2,
    title: 'Communication',
    level: 'AS',
    component: 1,
    subtopics: [{ code: '2.1', title: 'Networks including the internet' }],
  },
  {
    number: 3,
    title: 'Hardware',
    level: 'AS',
    component: 1,
    subtopics: [
      { code: '3.1', title: 'Computers and their components' },
      { code: '3.2', title: 'Logic Gates and Logic Circuits' },
    ],
  },
  {
    number: 4,
    title: 'Processor Fundamentals',
    level: 'AS',
    component: 1,
    subtopics: [
      { code: '4.1', title: 'Central Processing Unit (CPU) Architecture' },
      { code: '4.2', title: 'Assembly Language' },
      { code: '4.3', title: 'Bit manipulation' },
    ],
  },
  {
    number: 5,
    title: 'System Software',
    level: 'AS',
    component: 1,
    subtopics: [
      { code: '5.1', title: 'Operating Systems' },
      { code: '5.2', title: 'Language Translators' },
    ],
  },
  {
    number: 6,
    title: 'Security, privacy and data integrity',
    level: 'AS',
    component: 1,
    subtopics: [
      { code: '6.1', title: 'Data Security' },
      { code: '6.2', title: 'Data Integrity' },
    ],
  },
  {
    number: 7,
    title: 'Ethics and Ownership',
    level: 'AS',
    component: 1,
    subtopics: [{ code: '7.1', title: 'Ethics and Ownership' }],
  },
  {
    number: 8,
    title: 'Databases',
    level: 'AS',
    component: 1,
    subtopics: [
      { code: '8.1', title: 'Database Concepts' },
      { code: '8.2', title: 'Database Management Systems (DBMS)' },
      {
        code: '8.3',
        title: 'Data Definition Language (DDL) and Data Manipulation Language (DML)',
      },
    ],
  },
  {
    number: 9,
    title: 'Algorithm Design and Problem-solving',
    level: 'AS',
    component: 2,
    subtopics: [
      { code: '9.1', title: 'Computational Thinking Skills' },
      { code: '9.2', title: 'Algorithms' },
    ],
  },
  {
    number: 10,
    title: 'Data Types and Structures',
    level: 'AS',
    component: 2,
    subtopics: [
      { code: '10.1', title: 'Data Types and Records' },
      { code: '10.2', title: 'Arrays' },
      { code: '10.3', title: 'Files' },
      { code: '10.4', title: 'Introduction to Abstract Data Types (ADT)' },
    ],
  },
  {
    number: 11,
    title: 'Programming',
    level: 'AS',
    component: 2,
    subtopics: [
      { code: '11.1', title: 'Programming Basics' },
      { code: '11.2', title: 'Constructs' },
      { code: '11.3', title: 'Structured Programming' },
    ],
  },
  {
    number: 12,
    title: 'Software Development',
    level: 'AS',
    component: 2,
    subtopics: [
      { code: '12.1', title: 'Program Development Life cycle' },
      { code: '12.2', title: 'Program Design' },
      { code: '12.3', title: 'Program Testing and Maintenance' },
    ],
  },
  {
    number: 13,
    title: 'Data Representation',
    level: 'A2',
    component: 3,
    subtopics: [
      { code: '13.1', title: 'User-defined data types' },
      { code: '13.2', title: 'File organisation and access' },
      { code: '13.3', title: 'Floating-point numbers, representation and manipulation' },
    ],
  },
  {
    number: 14,
    title: 'Communication and internet technologies',
    level: 'A2',
    component: 3,
    subtopics: [
      { code: '14.1', title: 'Protocols' },
      { code: '14.2', title: 'Circuit switching, packet switching' },
    ],
  },
  {
    number: 15,
    title: 'Hardware and Virtual Machines',
    level: 'A2',
    component: 3,
    subtopics: [
      { code: '15.1', title: 'Processors, Parallel Processing and Virtual Machines' },
      { code: '15.2', title: 'Boolean Algebra and Logic Circuits' },
    ],
  },
  {
    number: 16,
    title: 'System Software',
    level: 'A2',
    component: 3,
    subtopics: [
      { code: '16.1', title: 'Purposes of an Operating System (OS)' },
      { code: '16.2', title: 'Translation Software' },
    ],
  },
  {
    number: 17,
    title: 'Security',
    level: 'A2',
    component: 3,
    subtopics: [
      { code: '17.1', title: 'Encryption, Encryption Protocols and Digital certificates' },
    ],
  },
  {
    number: 18,
    title: 'Artificial Intelligence (AI)',
    level: 'A2',
    component: 3,
    subtopics: [{ code: '18.1', title: 'Artificial Intelligence' }],
  },
  {
    number: 19,
    title: 'Computational thinking and Problem-solving',
    level: 'A2',
    component: 4,
    subtopics: [
      { code: '19.1', title: 'Algorithms' },
      { code: '19.2', title: 'Recursion' },
    ],
  },
  {
    number: 20,
    title: 'Further Programming',
    level: 'A2',
    component: 4,
    subtopics: [
      { code: '20.1', title: 'Programming Paradigms' },
      { code: '20.2', title: 'File Processing and Exception Handling' },
    ],
  },
];

export const SUBTOPIC_COUNT = TOPICS.reduce((total, topic) => total + topic.subtopics.length, 0);
