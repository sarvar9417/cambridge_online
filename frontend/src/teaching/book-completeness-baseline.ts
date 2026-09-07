export type BookAuditChapter = 1 | 7 | 13;

export type BookFeatureAnchor = {
  page: number;
  anchor: string;
};

export type BookCompletenessBaseline = {
  chapter: BookAuditChapter;
  pageCount: number;
  objectiveAnchors: BookFeatureAnchor[];
  priorKnowledgeAnchors: BookFeatureAnchor[];
  keyTerms: string[];
  examples: BookFeatureAnchor[];
  activities: BookFeatureAnchor[];
  extensionActivities: BookFeatureAnchor[];
  figures: BookFeatureAnchor[];
  tables: BookFeatureAnchor[];
  findOutMore: BookFeatureAnchor[];
  links: BookFeatureAnchor[];
  pseudocodePages: number[];
  chapterReviewAnchors: string[];
  semanticEmphasisAnchors: string[];
  examEnrichmentKeys: string[];
  expectedCheckpointCount: number;
};

const numbered = (prefix: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => `${prefix}${from + index}`);

const lettered = (prefix: string, letters: string) => [...letters].map((letter) => `${prefix}${letter}`);

const ch1Examples: BookFeatureAnchor[] = [
  { page: 4, anchor: 'Example 1.1' }, { page: 5, anchor: 'Example 1.2' },
  { page: 5, anchor: 'Example 1.3' }, { page: 6, anchor: 'Example 1.4' },
  { page: 8, anchor: 'Example 1.5' }, { page: 8, anchor: 'Example 1.6' },
  { page: 9, anchor: 'Example 1.7' }, { page: 9, anchor: 'Example 1.8' },
];

const ch7Examples: BookFeatureAnchor[] = [
  { page: 261, anchor: 'Example 1' },
  { page: 262, anchor: 'Example 2' },
  { page: 262, anchor: 'Example 3' },
  { page: 264, anchor: 'Example 4' },
  { page: 271, anchor: 'Example 1' },
  { page: 289, anchor: 'Example 1' },
  { page: 290, anchor: 'Example 2' },
];

const ch13Examples: BookFeatureAnchor[] = [
  { page: 314, anchor: 'Example 13.1' }, { page: 314, anchor: 'Example 13.2' },
  { page: 315, anchor: 'Example 13.3' }, { page: 316, anchor: 'Example 13.4' },
  { page: 317, anchor: 'Example 13.5' }, { page: 318, anchor: 'Example 13.6' },
  { page: 319, anchor: 'Example 13.7' }, { page: 322, anchor: 'Example 13.8' },
  { page: 322, anchor: 'Example 13.9' },
];

export const BOOK_COMPLETENESS_BASELINES: Record<BookAuditChapter, BookCompletenessBaseline> = {
  1: {
    chapter: 1,
    pageCount: 26,
    objectiveAnchors: [{ page: 1, anchor: 'In this chapter, you will learn about' }],
    priorKnowledgeAnchors: [{ page: 1, anchor: 'What you should already know' }],
    keyTerms: [
      'Binary', 'Bit', 'One’s complement', 'Two’s complement', 'Sign and magnitude', 'Hexadecimal',
      'Memory dump', 'Binary-coded decimal (BCD)', 'ASCII code', 'Character set', 'Unicode',
      'Bit-map image', 'Pixel', 'Colour depth', 'Bit depth', 'Image resolution', 'Screen resolution',
      'Resolution', 'Pixel density', 'Vector graphics', 'Sampling resolution', 'Sampling rate', 'Frame rate',
      'Lossless file compression', 'Lossy file compression', 'JPEG', 'MP3/MP4 files', 'Audio compression',
      'Perceptual music shaping', 'Bit rate', 'Run length encoding (RLE)',
    ],
    examples: ch1Examples,
    activities: [
      { page: 3, anchor: 'Activity 1A' }, { page: 3, anchor: 'Activity 1B' },
      { page: 4, anchor: 'Activity 1C' }, { page: 6, anchor: 'Activity 1D' },
      { page: 9, anchor: 'Activity 1E' }, { page: 10, anchor: 'Activity 1F' },
      { page: 10, anchor: 'Activity 1G' }, { page: 12, anchor: 'Activity 1H' },
      { page: 25, anchor: 'Activity 1I' },
    ],
    extensionActivities: [
      { page: 4, anchor: 'Extension Activity 1A' }, { page: 16, anchor: 'Extension Activity 1B' },
      { page: 17, anchor: 'Extension Activity 1C' }, { page: 22, anchor: 'Extension Activity 1D' },
    ],
    figures: [
      { page: 16, anchor: 'Figure 1.1' }, { page: 16, anchor: 'Figure 1.2' },
      { page: 17, anchor: 'Figure 1.3' }, { page: 18, anchor: 'Figure 1.4' },
      { page: 19, anchor: 'Figure 1.5' }, { page: 19, anchor: 'Figure 1.6' },
      { page: 23, anchor: 'Figure 1.7' }, { page: 24, anchor: 'Figure 1.8' },
      { page: 24, anchor: 'Figure 1.9' },
    ],
    tables: numbered('Table 1.', 1, 9).map((anchor, index) => ({
      page: [7, 7, 8, 10, 13, 14, 15, 18, 20][index]!, anchor,
    })),
    findOutMore: [],
    links: [],
    pseudocodePages: [],
    chapterReviewAnchors: numbered('End-of-chapter Q', 1, 6),
    semanticEmphasisAnchors: [
      'Binary', 'Bit', 'One’s complement', 'Two’s complement', 'Sign and magnitude', 'Hexadecimal',
      'Memory dump', 'Binary-coded decimal (BCD)', 'ASCII code', 'Character set', 'Unicode',
      'Bit-map image', 'Pixel', 'Colour depth', 'Bit depth', 'Image resolution', 'Screen resolution',
      'Resolution', 'Pixel density', 'Vector graphics', 'Sampling resolution', 'Sampling rate', 'Frame rate',
      'Lossless file compression', 'Lossy file compression', 'JPEG', 'MP3/MP4 files', 'Audio compression',
      'Perceptual music shaping', 'Bit rate', 'Run length encoding (RLE)', 'MPEG-3 (MP3)', 'MPEG-4 (MP4)',
      'Vector graphic images', 'Bit-map images', 'Run-length encoding (RLE)',
    ],
    examEnrichmentKeys: [
      ...numbered('1.1-lo-0', 1, 5),
      ...numbered('1.2-lo-0', 1, 5),
      ...numbered('1.3-lo-0', 1, 4),
    ],
    expectedCheckpointCount: 17,
  },
  7: {
    chapter: 7,
    pageCount: 41,
    objectiveAnchors: [{ page: 258, anchor: 'Chapter objectives' }],
    priorKnowledgeAnchors: [],
    keyTerms: [
      'analysis', 'design', 'coding', 'testing', 'abstraction', 'decomposition', 'top-down design',
      'inputs', 'processes', 'output', 'storage', 'structure diagram', 'flowchart', 'algorithm', 'pseudocode',
      'linear search', 'bubble sort', 'validation', 'verification', 'set of test data', 'normal data',
      'abnormal data', 'extreme data', 'boundary data', 'range check', 'length check', 'type check',
      'presence check', 'format check', 'check digit',
    ],
    examples: ch7Examples,
    activities: Array.from({ length: 20 }, (_, index) => {
      const activity = index + 1;
      const pages = [261, 262, 266, 268, 268, 271, 280, 281, 281, 282, 282, 284, 285, 285, 286, 286, 288, 290, 292, 292];
      return { page: pages[index]!, anchor: `Activity 7.${activity}` };
    }),
    extensionActivities: [{ page: 293, anchor: 'Extension activity' }],
    figures: Array.from({ length: 22 }, (_, index) => {
      const figure = index + 1;
      const pages = [259, 261, 262, 262, 263, 263, 263, 263, 264, 264, 271, 279, 279, 280, 283, 286, 287, 288, 289, 292, 293, 293];
      return { page: pages[index]!, anchor: `Figure 7.${figure}` };
    }),
    tables: Array.from({ length: 6 }, (_, index) => ({
      page: [265, 267, 283, 284, 285, 285][index]!, anchor: `Table 7.${index + 1}`,
    })),
    findOutMore: [259, 260, 262, 268, 278, 279, 291].map((page) => ({ page, anchor: 'Find out more' })),
    links: [269, 278, 279, 280].map((page) => ({ page, anchor: 'Link' })),
    pseudocodePages: [258, 259, 260, 261, 265, 266, 268, 269, 270, 271, 272, 276, 277, 278, 279, 280, 281, 284, 285, 286, 288, 289, 290, 292, 293, 294, 297, 298],
    chapterReviewAnchors: numbered('Exam-style Question ', 1, 9),
    semanticEmphasisAnchors: [
      'analysis', 'design', 'coding', 'testing', 'abstraction', 'decomposition', 'structure charts',
      'flowcharts', 'pseudocode', 'Iterative testing', 'computer system', 'Top-down design', 'inputs',
      'processes', 'outputs', 'storage', 'Structure diagrams', 'flowchart', 'algorithm',
      'Terminator flowchart symbols', 'Process flowchart symbols', 'Input and output',
      'Decision flowchart symbols', 'Flowchart flow lines', 'The pseudocode for an assignment statement',
      'The pseudocode for conditional statements', 'IF … THEN … ELSE … ENDIF',
      'CASE OF … OTHERWISE … ENDCASE', 'The pseudocode for iteration', 'FOR … TO … NEXT',
      'REPEAT … UNTIL', 'WHILE … DO … ENDWHILE', 'The pseudocode for input and output statements',
      'INPUT', 'OUTPUT', 'linear search', 'bubble sort', 'Validation', 'range checks', 'length checks',
      'type checks', 'presence checks', 'format checks', 'check digits', 'Range check', 'Length check',
      'Type check', 'Presence check', 'Format check and check digit', 'format check', 'check digit',
      'Verification', 'double entry', 'screen/visual check', 'set of test data', 'normal data',
      'abnormal test data', 'erroneous test data', 'extreme data', 'boundary data', 'trace table',
      'dry run', 'ADT', 'stack', 'queue', 'Base Pointer', 'Front Pointer', 'End Pointer',
      'structure diagram', 'abnormal data',
    ],
    examEnrichmentKeys: numbered('7.', 1, 9),
    expectedCheckpointCount: 9,
  },
  13: {
    chapter: 13,
    pageCount: 24,
    objectiveAnchors: [{ page: 304, anchor: 'In this chapter, you will learn about' }],
    priorKnowledgeAnchors: [
      { page: 304, anchor: 'What you should already know' },
      { page: 308, anchor: 'What you should already know' },
      { page: 312, anchor: 'What you should already know' },
    ],
    keyTerms: [
      'User-defined data type', 'Non-composite data type', 'Enumerated data type', 'Pointer data type', 'Set',
      'Serial file organisation', 'Sequential file organisation', 'Random file organisation',
      'Hashing algorithm (file access)', 'File access', 'Sequential access', 'Direct access',
      'Mantissa', 'Exponent', 'Binary floating-point number', 'Normalisation (floating-point)', 'Overflow', 'Underflow',
    ],
    examples: ch13Examples,
    activities: lettered('Activity 13', 'ABCDEFGHI').map((anchor, index) => ({
      page: [305, 306, 307, 311, 311, 317, 320, 323, 325][index]!, anchor,
    })),
    extensionActivities: lettered('Extension Activity 13', 'ABCDEF').map((anchor, index) => ({
      page: [307, 311, 319, 321, 324, 325][index]!, anchor,
    })),
    figures: Array.from({ length: 16 }, (_, index) => ({
      page: [308, 309, 309, 309, 310, 313, 313, 321, 322, 323, 323, 323, 323, 324, 324, 324][index]!,
      anchor: `Figure 13.${index + 1}`,
    })),
    tables: [
      { page: 310, anchor: 'Table 13.1' },
      { page: 311, anchor: 'Table 13.2' },
    ],
    findOutMore: [],
    links: [],
    pseudocodePages: [304, 305, 306, 307, 308, 324, 326, 327],
    chapterReviewAnchors: numbered('End-of-chapter Q', 1, 5),
    semanticEmphasisAnchors: [
      'User-defined data type', 'Non-composite data type', 'Enumerated data type', 'Pointer data type',
      'Set', 'user-defined data types', 'non-composite data type', 'enumerated data type', 'sets',
      'serial file organisation', 'Sequential file organisation', 'Random file organisation',
      'Hashing algorithm (file access)', 'File access', 'Sequential access', 'Direct access',
      'hashing algorithm', 'mantissa', 'exponent', 'binary floating-point representation',
      'Binary floating-point number', 'Normalisation', 'Overflow', 'Underflow', 'positive number',
      'negative number', 'maximum positive number', 'smallest positive number',
      'smallest magnitude negative number', 'largest magnitude negative number',
    ],
    examEnrichmentKeys: [
      ...numbered('13.1-lo-0', 1, 4),
      ...numbered('13.2-lo-0', 1, 4),
      ...numbered('13.3-lo-0', 1, 5),
    ],
    expectedCheckpointCount: 16,
  },
};
