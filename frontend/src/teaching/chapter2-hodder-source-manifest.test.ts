import { describe, expect, it } from 'vitest';
import { CHAPTER_2_FINAL, CHAPTER_2_END_OF_CHAPTER_PRACTICE } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_2_ACTIVITY_VISUAL_IDS } from './Chapter2ActivityVisuals';
import { CHAPTER_2_HODDER_SOURCE_COUNTS, CHAPTER_2_HODDER_SOURCE_MANIFEST } from './chapter2-hodder-source-manifest';

const byKind = (kind: (typeof CHAPTER_2_HODDER_SOURCE_MANIFEST)[number]['kind']) =>
  CHAPTER_2_HODDER_SOURCE_MANIFEST.filter(item => item.kind === kind);

describe('Chapter 2 Hodder source-completeness inventory', () => {
  it('locks the connected source inventory instead of silently shrinking it', () => {
    expect(CHAPTER_2_HODDER_SOURCE_MANIFEST).toHaveLength(CHAPTER_2_HODDER_SOURCE_COUNTS.total);
    expect(new Set(CHAPTER_2_HODDER_SOURCE_MANIFEST.map(item => item.id)).size).toBe(CHAPTER_2_HODDER_SOURCE_COUNTS.total);
    expect(byKind('figure').map(item => item.label)).toEqual(Array.from({ length: 25 }, (_, i) => `Figure 2.${i + 1}`));
    expect(byKind('table').map(item => item.label)).toEqual(Array.from({ length: 10 }, (_, i) => `Table 2.${i + 1}`));
  });

  it('locks all Hodder activities and extension activities to projector scene ids', () => {
    expect(byKind('activity').map(item => item.label)).toEqual(['ACTIVITY 2A', 'ACTIVITY 2B', 'ACTIVITY 2C']);
    expect(byKind('extension-activity').map(item => item.label)).toEqual([
      'EXTENSION ACTIVITY 2A', 'EXTENSION ACTIVITY 2B', 'EXTENSION ACTIVITY 2C',
      'EXTENSION ACTIVITY 2D', 'EXTENSION ACTIVITY 2E', 'EXTENSION ACTIVITY 2F',
    ]);
    expect(CHAPTER_2_ACTIVITY_VISUAL_IDS).toHaveLength(9);
  });

  it('keeps all five Hodder end-of-chapter question groups in the final route', () => {
    expect(byKind('end-question')).toHaveLength(5);
    expect(CHAPTER_2_END_OF_CHAPTER_PRACTICE.map(slide => slide.id)).toEqual([
      'h2-book-eoc-q1', 'h2-book-eoc-q2', 'h2-book-eoc-q3', 'h2-book-eoc-q4', 'h2-book-eoc-q5',
    ]);
    const finalIds = new Set(CHAPTER_2_FINAL.slides.map(slide => slide.id));
    for (const slide of CHAPTER_2_END_OF_CHAPTER_PRACTICE) expect(finalIds.has(slide.id), slide.id).toBe(true);
  });
});
