import { describe, expect, it } from 'vitest';
import { CHAPTER_5_DRAFT, CHAPTER_5_OPENING_SLIDES } from './lesson-content-chapter5';
import { CHAPTER_5_OPERATING_SYSTEM_VISUAL_IDS } from './Chapter5OperatingSystemVisuals';
import { lessonChapter } from './lesson-content-source-complete';
import { canBuildSourceGroundedHodderChapter, NEXT_9618_HODDER_CHAPTER } from './hodder-source-readiness';

const flatten = () => JSON.stringify(CHAPTER_5_OPENING_SLIDES);

describe('9618 Hodder Chapter 5 opening source completeness', () => {
  it('keeps the opening batch in Hodder printed-page order', () => {
    expect(CHAPTER_5_OPENING_SLIDES.map(slide => slide.sourcePages?.[0])).toEqual([136, 137, 138, 139, 140, 140, 141, 141]);
    expect(CHAPTER_5_DRAFT.title).toBe('System software');
    expect(CHAPTER_5_DRAFT.subtopics).toEqual(['5.1 Operating systems', '5.2 Language translators']);
    expect(CHAPTER_5_DRAFT.coverage).toContain('Source-complete through p.141');
    expect(CHAPTER_5_DRAFT.sourceNote).toContain('pp.142–158 remain explicitly unresolved');
  });

  it('locks source terminology and the first four figures', () => {
    const text = flatten();
    for (const token of [
      'Figure 5.1 An Acorn BBC B and its cassette tape machine',
      'Figure 5.2 An example of WIMP',
      'Figure 5.3 Operating system tasks',
      'Figure 5.4 Memory protection',
      'BIOS', 'CMOS', 'GUI', 'CLI', 'WIMP', 'Post-WIMP', 'FENCE',
      'Memory optimisation', 'Memory organisation', 'Memory protection', 'Extension Activity 5A',
    ]) expect(text).toContain(token);
  });

  it('preserves the five Figure 5.3 management areas', () => {
    const text = flatten();
    for (const task of ['memory management', 'file management', 'security management', 'hardware management', 'process management']) {
      expect(text).toContain(task);
    }
  });

  it('preserves all four memory-organisation methods from p.140', () => {
    const text = flatten();
    for (const method of ['single (contiguous) allocation', 'partitioned allocation', 'paged memory', 'segmented memory']) {
      expect(text).toContain(method);
    }
  });

  it('registers source-specific progressive projector visuals', () => {
    expect(CHAPTER_5_OPERATING_SYSTEM_VISUAL_IDS).toEqual([
      'h5-511-os-need', 'h5-511-cli-gui', 'h5-512-os-tasks', 'h5-512-memory-management', 'h5-512-memory-fence', 'h5-512-security-management',
    ]);
  });

  it('keeps the partial Chapter 5 candidate quarantined and queue target unchanged', () => {
    expect(canBuildSourceGroundedHodderChapter('9618', 5)).toBe(false);
    expect(lessonChapter(5)).toBeNull();
    expect(NEXT_9618_HODDER_CHAPTER).toBe(5);
  });
});
