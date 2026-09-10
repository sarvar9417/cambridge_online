import { describe, expect, it } from 'vitest';
import { CHAPTER_3_LOGIC_SLIDES } from './lesson-content-chapter3-logic';
import { CHAPTER_3_LOGIC_VISUAL_IDS } from './Chapter3LogicVisuals';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';

describe('Hodder Chapter 3 logic source completeness', () => {
  it('covers every printed page from 90 through 106 in source order', () => {
    expect(CHAPTER_3_LOGIC_SLIDES.map(slide => slide.sourcePages?.[0])).toEqual(Array.from({ length: 17 }, (_, i) => 90 + i));
    expect(CHAPTER_3_FINAL.sourceNote).toContain('pp.68–106');
    expect(CHAPTER_3_FINAL.sourceNote).toContain('complete chapter range');
  });

  it('preserves the gate figures, tables and worked-example sequence', () => {
    const source = CHAPTER_3_LOGIC_SLIDES.flatMap(slide => slide.sourceElements ?? []).join(' | ');
    ['Table 3.9','Figure 3.23 NOT gate','Figure 3.24 AND gate','Figure 3.25 OR gate','Figure 3.26 NAND gate','Figure 3.27 NOR gate','Figure 3.28 XOR gate','Table 3.15','Example 3.1','Example 3.2','Example 3.3','Activity 3B','Activity 3C','Activity 3D'].forEach(term => expect(source).toContain(term));
  });

  it('locks Examples 3.1–3.3 source-specific logic', () => {
    const source = CHAPTER_3_LOGIC_SLIDES.flatMap(slide => slide.sourceElements ?? []).join(' | ');
    ['P = AND(A,B)','Q = NOR(B,C)','R = OR(P,Q)','X = XOR(R,C)','(A.B̅) + (B.C̅)','S = NOT 1 AND T = 1','S = 1 AND W = 1','T = NOT 1 AND W = 1','intermediate ④'].forEach(term => expect(source).toContain(term));
    const example32 = JSON.stringify(CHAPTER_3_LOGIC_SLIDES.find(slide => slide.id === 'h3-324-example32-truth-activity3c'));
    expect(example32).toContain('["1","0","1","1","0","1"]');
    const example33 = JSON.stringify(CHAPTER_3_LOGIC_SLIDES.find(slide => slide.id === 'h3-324-example33-truth-activity3d'));
    expect(example33).toContain('["1","1","1","0","1","0","1","1"]');
  });

  it('preserves the real-world, NAND and multi-input extension material', () => {
    const source = CHAPTER_3_LOGIC_SLIDES.flatMap(slide => slide.sourceElements ?? []).join(' | ');
    ['off-the-shelf logic units','Figure 3.29 AND gate made from NAND gates','Figure 3.30 OR gate made from NAND gates','Figure 3.31 NOT gate made from NAND gates','Activity 3E','Extension Activity 3H','Figure 3.32 Multi-input AND gate','Table 3.16','Figure 3.33 4-input AND gate','Table 3.17','Figure 3.34 Multi-input OR gate','Table 3.18','Figure 3.35 4-input OR gate','Table 3.19','Activity 3F'].forEach(term => expect(source).toContain(term));
  });

  it('preserves all end-of-chapter question groups and source attributions', () => {
    const source = CHAPTER_3_LOGIC_SLIDES.flatMap(slide => slide.sourceElements ?? []).join(' | ');
    ['End of chapter questions','Question 1 OLED','Question 2 games console','Question 3 air conditioning','Question 4','nine stages','Question 5','DVD-RAM','flash memory','Question 6','three digital sensors A B C','9608 Paper 13 Q4 June 2015','9608 Paper 13 Q6 June 2015'].forEach(term => expect(source).toContain(term));
    expect(CHAPTER_3_FINAL.coverage).toContain('end-of-chapter Questions 1–6');
  });

  it('keeps one source-specific projector visual per logic/review scene', () => {
    expect(CHAPTER_3_LOGIC_VISUAL_IDS).toEqual(CHAPTER_3_LOGIC_SLIDES.map(slide => slide.id));
    CHAPTER_3_LOGIC_VISUAL_IDS.forEach(id => expect(CHAPTER_3_FINAL.slides.some(slide => slide.id === id)).toBe(true));
  });
});
