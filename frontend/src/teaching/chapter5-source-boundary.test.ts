import { describe, expect, it } from 'vitest';
import {
  CHAPTER_5_LEGACY_OPENING_EXTRACT_RANGE,
  CHAPTER_5_SOURCE_BOUNDARY,
  CHAPTER_5_UNRESOLVED_HODDER_RANGE,
  CHAPTER_5_VERIFIED_HODDER_RANGE,
} from './chapter5-source-boundary';
import { CHAPTER_5_DRAFT } from './lesson-content-chapter5';
import { canBuildSourceGroundedHodderChapter, NEXT_9618_HODDER_CHAPTER } from './hodder-source-readiness';
import { lessonChapter } from './lesson-content-source-complete';

describe('9618 Hodder Chapter 5 exact-source boundary', () => {
  it('locks the full printed chapter while preserving the independently audited opening extract', () => {
    expect(CHAPTER_5_LEGACY_OPENING_EXTRACT_RANGE).toEqual([136, 141]);
    expect(CHAPTER_5_VERIFIED_HODDER_RANGE).toEqual([136, 158]);
    expect(CHAPTER_5_UNRESOLVED_HODDER_RANGE).toEqual([]);
    expect(CHAPTER_5_SOURCE_BOUNDARY.nextRequiredPrintedPage).toBeNull();
    expect(CHAPTER_5_SOURCE_BOUNDARY.fullBookSource.printedPageRange).toEqual([136, 158]);
    expect(CHAPTER_5_SOURCE_BOUNDARY.fullBookSource.physicalPageRange).toEqual([152, 174]);
    expect(CHAPTER_5_DRAFT.coverage).toContain('Source-complete through p.141');
  });

  it('records the byte-locked connected-source completion without treating adjacent sources as Hodder evidence', () => {
    expect(CHAPTER_5_SOURCE_BOUNDARY.connectedSourceAudit.status).toBe('connected-source-complete');
    expect(CHAPTER_5_SOURCE_BOUNDARY.connectedSourceAudit.requiredPrintedPages).toEqual([]);
    expect(CHAPTER_5_SOURCE_BOUNDARY.fullBookSource.sourceFile).toBe('9618 Coursebook Book (Hodder Education).pdf');
    expect(CHAPTER_5_SOURCE_BOUNDARY.fullBookSource.sourceFileSha256).toBe('760c02dd059fa102b696a7424de2e298198535f06705c367d448e1391d799d95');
    expect(CHAPTER_5_SOURCE_BOUNDARY.connectedSourceAudit.rule).toContain('exact byte-locked Hodder coursebook');
  });

  it('allows the syllabus only as a scope cross-check, never as Hodder page content', () => {
    expect(CHAPTER_5_SOURCE_BOUNDARY.fallbackPolicy).toBe('scope-only-never-coursebook-content');
    expect(CHAPTER_5_SOURCE_BOUNDARY.syllabusScopeCrossCheck.operatingSystemManagement).toEqual([
      'memory management',
      'file management',
      'security management',
      'hardware management (input/output/peripherals)',
      'process management',
    ]);
    expect(CHAPTER_5_SOURCE_BOUNDARY.syllabusScopeCrossCheck.utilities).toContain('disk formatter');
    expect(CHAPTER_5_SOURCE_BOUNDARY.syllabusScopeCrossCheck.libraries).toContain('Dynamic Link Library (DLL) files');
    expect(CHAPTER_5_SOURCE_BOUNDARY.syllabusScopeCrossCheck.translators).toEqual([
      'assembler', 'compiler', 'interpreter', 'partially compiled and partially interpreted',
    ]);
  });

  it('activates Chapter 5 only after the complete full-book source range is locked', () => {
    expect(CHAPTER_5_SOURCE_BOUNDARY.coursebookStatus).toBe('source-locked-full-book');
    expect(canBuildSourceGroundedHodderChapter('9618', 5)).toBe(true);
    expect(lessonChapter(5)?.title).toBe('System software');
    expect(NEXT_9618_HODDER_CHAPTER).toBeNull();
  });
});
