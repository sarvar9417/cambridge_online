import { HODDER_9618_FULL_BOOK_SOURCE, hodder9618FullBookChapterRange } from './hodder-9618-full-book-manifest';

export const CHAPTER_5_LEGACY_OPENING_EXTRACT_RANGE = [136, 141] as const;
export const CHAPTER_5_VERIFIED_HODDER_RANGE = [136, 158] as const;
export const CHAPTER_5_UNRESOLVED_HODDER_RANGE = [] as const;

const fullBookRange = hodder9618FullBookChapterRange(5);
if (!fullBookRange) throw new Error('Missing full-book source range for 9618 Chapter 5');

/**
 * Chapter 5 is now locked by the exact connected 576-page Hodder coursebook.
 * The independently audited pp.136–141 extract remains preserved as deeper
 * evidence, while the full-book byte lock resolves the complete pp.136–158
 * chapter range. Syllabus material is retained only as a scope cross-check.
 */
export const CHAPTER_5_SOURCE_BOUNDARY = {
  syllabus: '9618',
  chapter: 5,
  title: 'System software',
  verifiedPrintedPages: CHAPTER_5_VERIFIED_HODDER_RANGE,
  unresolvedPrintedPages: CHAPTER_5_UNRESOLVED_HODDER_RANGE,
  nextRequiredPrintedPage: null,
  coursebookStatus: 'source-locked-full-book' as const,
  fallbackPolicy: 'scope-only-never-coursebook-content' as const,
  fullBookSource: {
    sourceFile: HODDER_9618_FULL_BOOK_SOURCE.sourceFile,
    sourceFileSha256: HODDER_9618_FULL_BOOK_SOURCE.sourceFileSha256,
    sourceFilePageCount: HODDER_9618_FULL_BOOK_SOURCE.sourceFilePageCount,
    printedPageRange: fullBookRange.printedPageRange,
    physicalPageRange: fullBookRange.physicalPageRange,
  },
  legacyOpeningExtract: {
    printedPageRange: CHAPTER_5_LEGACY_OPENING_EXTRACT_RANGE,
    note: 'The independently audited pp.136–141 opening extract remains preserved as deeper evidence; the full-book byte lock resolves the complete Chapter 5 range.',
  },
  connectedSourceAudit: {
    status: 'connected-source-complete' as const,
    requiredPrintedPages: CHAPTER_5_UNRESOLVED_HODDER_RANGE,
    searchedLocations: ['Google Drive full Hodder coursebook'] as const,
    rule: 'Use only the exact byte-locked Hodder coursebook as chapter evidence; do not promote syllabus/work-plan/0478 material to 9618 Hodder coursebook content.' as const,
  },
  syllabusScopeCrossCheck: {
    operatingSystemManagement: [
      'memory management',
      'file management',
      'security management',
      'hardware management (input/output/peripherals)',
      'process management',
    ],
    utilities: [
      'disk formatter',
      'virus checker',
      'defragmentation software',
      'disk contents analysis/disk repair software',
      'file compression',
      'back-up software',
    ],
    libraries: ['program libraries', 'Dynamic Link Library (DLL) files'],
    translators: ['assembler', 'compiler', 'interpreter', 'partially compiled and partially interpreted'],
    ide: ['context-sensitive prompts', 'dynamic syntax checks', 'prettyprint', 'expand and collapse code blocks', 'single stepping', 'breakpoints', 'variables', 'expressions', 'report window'],
  },
} as const;
