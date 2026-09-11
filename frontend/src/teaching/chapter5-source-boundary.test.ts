import { describe, expect, it } from 'vitest';
import {
  CHAPTER_5_SOURCE_BOUNDARY,
  CHAPTER_5_UNRESOLVED_HODDER_RANGE,
  CHAPTER_5_VERIFIED_HODDER_RANGE,
} from './chapter5-source-boundary';
import { CHAPTER_5_DRAFT } from './lesson-content-chapter5';
import { canBuildSourceGroundedHodderChapter, NEXT_9618_HODDER_CHAPTER } from './hodder-source-readiness';
import { lessonChapter } from './lesson-content-source-complete';

describe('9618 Hodder Chapter 5 exact-source boundary', () => {
  it('locks the verified and unresolved printed-page ranges', () => {
    expect(CHAPTER_5_VERIFIED_HODDER_RANGE).toEqual([136, 141]);
    expect(CHAPTER_5_UNRESOLVED_HODDER_RANGE).toEqual([142, 158]);
    expect(CHAPTER_5_SOURCE_BOUNDARY.nextRequiredPrintedPage).toBe(142);
    expect(CHAPTER_5_DRAFT.coverage).toContain('Source-complete through p.141');
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

  it('keeps Chapter 5 quarantined until exact Hodder pp.142–158 are implemented', () => {
    expect(CHAPTER_5_SOURCE_BOUNDARY.coursebookStatus).toBe('partial-exact-source');
    expect(canBuildSourceGroundedHodderChapter('9618', 5)).toBe(false);
    expect(lessonChapter(5)).toBeNull();
    expect(NEXT_9618_HODDER_CHAPTER).toBe(5);
  });
});
