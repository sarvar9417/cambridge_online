import { describe, expect, it } from 'vitest';
import { CHAPTER_3_LOGIC_SLIDES } from './lesson-content-chapter3-logic';
import { CHAPTER_3_LOGIC_VISUAL_IDS } from './Chapter3LogicVisuals';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';

describe('Hodder Chapter 3 logic source completeness', () => {
  it('covers every printed page from 90 through 94 in source order', () => {
    expect(CHAPTER_3_LOGIC_SLIDES.map(slide => slide.sourcePages?.[0])).toEqual([90, 91, 92, 93, 94]);
    expect(CHAPTER_3_FINAL.sourceNote).toContain('pp.68–94');
  });

  it('preserves Table 3.9 and Figures/Tables 3.23–3.28 / 3.10–3.15', () => {
    const source = CHAPTER_3_LOGIC_SLIDES.flatMap(slide => slide.sourceElements ?? []).join(' | ');
    ['Table 3.9','2¹ = 2','2² = 4','2³ = 8','2⁴ = 16','Figure 3.23 NOT gate','Table 3.10','Figure 3.24 AND gate','Table 3.11','Figure 3.25 OR gate','Table 3.12','Figure 3.26 NAND gate','Table 3.13','Figure 3.27 NOR gate','Table 3.14','Figure 3.28 XOR gate','Table 3.15'].forEach(term => expect(source).toContain(term));
  });

  it('preserves Example 3.1 gate topology and Activity 3B', () => {
    const source = CHAPTER_3_LOGIC_SLIDES.flatMap(slide => slide.sourceElements ?? []).join(' | ');
    ['Example 3.1','P = AND(A,B)','Q = NOR(B,C)','R = OR(P,Q)','X = XOR(R,C)','Activity 3B','five logic circuits'].forEach(term => expect(source).toContain(term));
  });

  it('locks the worked example final output rows', () => {
    const final = CHAPTER_3_LOGIC_SLIDES.find(slide => slide.id === 'h3-324-example31-part3-activity3b');
    const text = JSON.stringify(final);
    expect(text).toContain('["0","0","0","0","1","1","1"]');
    expect(text).toContain('["0","1","0","0","0","0","0"]');
    expect(text).toContain('["1","1","1","1","0","1","0"]');
  });

  it('keeps one source-specific projector visual per logic scene', () => {
    expect(CHAPTER_3_LOGIC_VISUAL_IDS).toEqual(CHAPTER_3_LOGIC_SLIDES.map(slide => slide.id));
    CHAPTER_3_LOGIC_VISUAL_IDS.forEach(id => expect(CHAPTER_3_FINAL.slides.some(slide => slide.id === id)).toBe(true));
  });
});
