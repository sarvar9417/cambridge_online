import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_4_INSTRUCTIONS_BITMANIPULATION_SLIDES } from './lesson-content-chapter4-instructions-bitmanipulation';
import { CHAPTER_4_CURRENT_DRAFT, CHAPTER_4_CURRENT_SLIDES } from './lesson-content-chapter4-current';
import { CHAPTER_4_INSTRUCTIONS_BIT_VISUAL_IDS } from './Chapter4InstructionsBitVisuals';
import { CHAPTER_4_CONNECTED_HODDER_SOURCE_MANIFEST } from './connected-hodder-chapter4-manifest';
import { canBuildSourceGroundedHodderChapter, NEXT_9618_HODDER_CHAPTER } from './hodder-source-readiness';
import { lessonChapter } from './lesson-content-source-complete';

const fixture = (name: string) => readFileSync(resolve(process.cwd(), 'src', 'teaching', name), 'utf8');
const batchText = JSON.stringify(CHAPTER_4_INSTRUCTIONS_BITMANIPULATION_SLIDES);

describe('Hodder 9618 Chapter 4 final source completeness', () => {
  it('locks the exact 576-page connected source and all printed pp107-135 fingerprints', () => {
    expect(CHAPTER_4_CONNECTED_HODDER_SOURCE_MANIFEST.sourceFileSha256).toBe('760c02dd059fa102b696a7424de2e298198535f06705c367d448e1391d799d95');
    expect(CHAPTER_4_CONNECTED_HODDER_SOURCE_MANIFEST.sourceFilePageCount).toBe(576);
    expect(CHAPTER_4_CONNECTED_HODDER_SOURCE_MANIFEST.physicalPageRange).toEqual([123, 151]);
    expect(CHAPTER_4_CONNECTED_HODDER_SOURCE_MANIFEST.printedPageRange).toEqual([107, 135]);
    expect(CHAPTER_4_CONNECTED_HODDER_SOURCE_MANIFEST.pages).toHaveLength(29);
    expect(CHAPTER_4_CONNECTED_HODDER_SOURCE_MANIFEST.pages[0]).toEqual({ printedPage: 107, sha256: '33ab0d6d64c504b57fefc3a5859c1ecef415c02c8fc8d8a714d00533b03bb2bb' });
    expect(CHAPTER_4_CONNECTED_HODDER_SOURCE_MANIFEST.pages.at(-1)).toEqual({ printedPage: 135, sha256: '0f0137997a4fcaffcc13fc02359fd7ecc8f3c2d1211d66123f2ed75929af03d6' });
  });

  it('completes pp124-135 in source order and closes the chapter', () => {
    expect(CHAPTER_4_INSTRUCTIONS_BITMANIPULATION_SLIDES.map(slide => slide.sourcePages)).toEqual([
      [124,125],[125,126],[126,127],[127,128],[129],[130],[131],[131,132],[132],[132,133],[133,134,135],
    ]);
    expect(CHAPTER_4_CURRENT_SLIDES).toHaveLength(28);
    expect(CHAPTER_4_CURRENT_SLIDES.slice(-11)).toEqual(CHAPTER_4_INSTRUCTIONS_BITMANIPULATION_SLIDES);
    expect(CHAPTER_4_CURRENT_DRAFT.coverage).toContain('Source-complete through p.135');
    expect(CHAPTER_4_CURRENT_DRAFT.sourceNote).toContain('chapter closes on p.135');
  });

  it('preserves Tables 4.4-4.11 and every addressing mode named by Hodder', () => {
    for (const token of ['Table 4.4 Data movement instructions','Table 4.5 Input and output of data instructions','Table 4.6 Arithmetic operation instructions','Table 4.7 Unconditional and conditional instructions','Table 4.8 Compare instructions','Table 4.9 Labels','Table 4.10 Logical shifts in assembly language programming','Table 4.11 Instructions used to check, set and clear a single bit or group of bits','absolute addressing','direct addressing','indirect addressing','indexed addressing','immediate addressing','relative addressing','symbolic addressing']) expect(batchText).toContain(token);
  });

  it('preserves both worked assembly examples, Activities 4B/4C and exact shift examples', () => {
    for (const token of ['total = first + second + third','start: LDD first','"first","106"','"total","109"','index register (IX)','LDX number','JPN loop','number: #5 · #7 · #3','Activity 4B','Activity 4C','10101111 → 01111000','10101111 → 11110101','10101111 → 01111101','AND #B100','XOR #B100']) expect(batchText).toContain(token);
  });

  it('retains the end-of-chapter question sequence and source attribution', () => {
    for (const token of ['Question 1','Question 2','Question 3','Question 4','Question 5 intruder detection system','2.5 GHz to 3.2 GHz','1000-page printer document','B00001010','JGT ALARM','Cambridge International AS & A Level Computer Science 9608 Paper 32 Q6 June 2016']) expect(batchText).toContain(token);
  });

  it('provides one progressive V6 projector visual per final scene with short-projector/mobile hardening', () => {
    expect(CHAPTER_4_INSTRUCTIONS_BIT_VISUAL_IDS).toEqual(CHAPTER_4_INSTRUCTIONS_BITMANIPULATION_SLIDES.map(slide => slide.id));
    const visuals = fixture('Chapter4InstructionsBitVisuals.tsx');
    expect(visuals).toContain('Hodder Tables 4.4 to 4.8');
    expect(visuals).toContain('Hodder 4.2.4 addressing modes');
    expect(visuals).toContain('Hodder indexed register loop worked trace');
    expect(visuals).toContain('Hodder 4.3.1 exact binary shift examples');
    expect(visuals).toContain('Hodder Table 4.11 sensor 3 masking');
    expect(visuals).toContain('Hodder Chapter 4 Question 5 intruder sensor dry run');
    const css = fixture('chapter4-instructions-bit-visuals.css');
    expect(css).toContain('@media(max-height:760px)');
    expect(css).toContain('@media(max-width:760px)');
    const facade = fixture('Chapter14PresentationVisualsV4.tsx');
    expect(facade).toContain('hasChapter4InstructionsBitVisual');
    expect(facade).toContain('<Chapter4InstructionsBitVisual beat={beat} reveal={reveal}/>');
  });

  it('activates completed Chapter 4 and advances the 9618 queue to Chapter 5', () => {
    expect(canBuildSourceGroundedHodderChapter('9618', 4)).toBe(true);
    expect(lessonChapter(4)?.number).toBe(4);
    expect(NEXT_9618_HODDER_CHAPTER).toBe(5);
  });
});
