import { describe, expect, it } from 'vitest';
import { CHAPTER_3_LOGIC_SLIDES } from './lesson-content-chapter3-logic';
import { CHAPTER_3_LOGIC_VISUAL_IDS } from './Chapter3LogicVisuals';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';

describe('Hodder Chapter 3 logic source completeness', () => {
  it('covers printed pp.90–94 in source order', () => {
    expect(CHAPTER_3_LOGIC_SLIDES.map(slide => slide.sourcePages?.[0])).toEqual([90, 91, 93, 94]);
    expect(CHAPTER_3_FINAL.sourceNote).toContain('pp.68–94');
  });

  it('preserves Table 3.9 input-count logic and Figures 3.23–3.28', () => {
    const source = CHAPTER_3_LOGIC_SLIDES.flatMap(slide => slide.sourceElements ?? []).join(' | ');
    ['Table 3.9','2¹ = 2','2² = 4','2³ = 8','2⁴ = 16','Figure 3.23 NOT gate','Figure 3.24 AND gate','Figure 3.25 OR gate','Figure 3.26 NAND gate','Figure 3.27 NOR gate','Figure 3.28 XOR gate'].forEach(term => expect(source).toContain(term));
  });

  it('keeps all six gate names and projector-specific visuals', () => {
    const text = JSON.stringify(CHAPTER_3_LOGIC_SLIDES);
    ['NOT','AND','OR','NAND','NOR','XOR'].forEach(gate => expect(text).toContain(gate));
    expect(CHAPTER_3_LOGIC_VISUAL_IDS).toEqual(CHAPTER_3_LOGIC_SLIDES.map(slide => slide.id));
    CHAPTER_3_LOGIC_VISUAL_IDS.forEach(id => expect(CHAPTER_3_FINAL.slides.some(slide => slide.id === id)).toBe(true));
  });

  it('locks source truth-table outputs for two-input gates', () => {
    const comparison = CHAPTER_3_LOGIC_SLIDES.find(slide => slide.id === 'h3-323-six-gate-truth-tables');
    const text = JSON.stringify(comparison);
    expect(text).toContain('["0","0","0","0","1","1","0"]');
    expect(text).toContain('["1","1","1","1","0","0","0"]');
  });
});
