import { describe, expect, it } from 'vitest';
import { CHAPTER_2_END_OF_CHAPTER_PRACTICE, CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';

describe('Chapter 2 Hodder end-of-chapter practice fidelity', () => {
  it('keeps all five Hodder end-of-chapter question groups in the active route', () => {
    expect(CHAPTER_2_END_OF_CHAPTER_PRACTICE).toHaveLength(5);
    const active = new Set(CHAPTER_2_FINAL.slides.map(slide => slide.id));
    for (const slide of CHAPTER_2_END_OF_CHAPTER_PRACTICE) expect(active.has(slide.id)).toBe(true);
  });

  it('preserves the source-specific numbers and named concepts from pp.65–67', () => {
    const text = JSON.stringify(CHAPTER_2_END_OF_CHAPTER_PRACTICE);
    for (const marker of [
      'star and mesh',
      'client-server',
      'peer-to-peer',
      'GEO, MEO and LEO',
      'spread-spectrum frequency hopping',
      'on-demand bit streaming',
      'real-time bit streaming',
      '2 MiB',
      '200 KiB',
      '1.8 MiB',
      '1.5 Mbps',
      '600 kbps',
      '1,048,576 bits',
      'CSMA/CD',
      'gateway, switch, hub, router and bridge',
    ]) expect(text).toContain(marker);
  });

  it('keeps book practice distinct from live Cambridge checkpoint slides', () => {
    for (const slide of CHAPTER_2_END_OF_CHAPTER_PRACTICE) {
      expect(slide.eyebrow).toContain('HODDER BOOK PRACTICE');
      expect(slide.sourceLabel).toContain('End of chapter questions');
      expect(slide.examPractice).not.toBe(true);
      expect(slide.activity?.prompt.length).toBeGreaterThan(80);
    }
  });
});
