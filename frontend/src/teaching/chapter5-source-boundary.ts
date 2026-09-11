export const CHAPTER_5_VERIFIED_HODDER_RANGE = [136, 141] as const;
export const CHAPTER_5_UNRESOLVED_HODDER_RANGE = [142, 158] as const;

/**
 * Chapter 5 remains a source-grounded draft until the exact connected Hodder
 * pages 142–158 are available to the implementation runtime. The syllabus may
 * be used only as a scope cross-check; it must never be promoted to a
 * coursebook page source or used to invent Hodder figures, tables, activities,
 * worked examples, wording, or end-of-chapter questions.
 */
export const CHAPTER_5_SOURCE_BOUNDARY = {
  syllabus: '9618',
  chapter: 5,
  title: 'System software',
  verifiedPrintedPages: CHAPTER_5_VERIFIED_HODDER_RANGE,
  unresolvedPrintedPages: CHAPTER_5_UNRESOLVED_HODDER_RANGE,
  nextRequiredPrintedPage: 142,
  coursebookStatus: 'partial-exact-source' as const,
  fallbackPolicy: 'scope-only-never-coursebook-content' as const,
  connectedSourceAudit: {
    status: 'exact-pages-not-resolved' as const,
    requiredPrintedPages: CHAPTER_5_UNRESOLVED_HODDER_RANGE,
    searchedLocations: ['ChatGPT Library', 'Google Drive mount'] as const,
    rule: 'Do not promote syllabus/work-plan/0478 material to 9618 Hodder coursebook evidence.' as const,
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
