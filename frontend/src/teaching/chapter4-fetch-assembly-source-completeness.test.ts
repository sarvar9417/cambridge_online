import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_4_FETCH_ASSEMBLY_SLIDES } from './lesson-content-chapter4-fetch-assembly';
import { CHAPTER_4_CURRENT_DRAFT, CHAPTER_4_CURRENT_SLIDES } from './lesson-content-chapter4-current';
import { CHAPTER_4_FETCH_ASSEMBLY_VISUAL_IDS } from './Chapter4FetchAssemblyVisuals';
import { canBuildSourceGroundedHodderChapter } from './hodder-source-readiness';
import { lessonChapter } from './lesson-content-source-complete';

const fixture = (name: string) => readFileSync(resolve(process.cwd(), 'src', 'teaching', name), 'utf8');
const batchText = JSON.stringify(CHAPTER_4_FETCH_ASSEMBLY_SLIDES);

describe('Hodder 9618 Chapter 4 pp115-123 source completeness', () => {
  it('extends the working draft without rewriting the verified pp107-114 batch', () => {
    expect(CHAPTER_4_FETCH_ASSEMBLY_SLIDES.map(slide => slide.sourcePages)).toEqual([
      [115, 116],
      [116, 117],
      [117, 118],
      [118],
      [119],
      [119, 120],
      [121],
      [121, 122],
      [122, 123],
    ]);
    expect(CHAPTER_4_CURRENT_SLIDES).toHaveLength(17);
    expect(CHAPTER_4_CURRENT_SLIDES.slice(-9)).toEqual(CHAPTER_4_FETCH_ASSEMBLY_SLIDES);
    expect(CHAPTER_4_CURRENT_DRAFT.coverage).toContain('Source-complete through p.123');
    expect(CHAPTER_4_CURRENT_DRAFT.sourceNote).toContain('pp.124–135 remain explicitly unresolved');
  });

  it('preserves the ports comparison, fetch-execute figures, RTN, interrupts and Activity 4A', () => {
    for (const token of [
      'Table 4.2 Pros and cons of the USB system',
      'Table 4.3 Pros and cons of HDMI and VGA',
      'less than 500 megabits per second',
      'about five metres',
      '1920 × 1080',
      '120 Hz',
      'around 10 gigabits per second',
      '640 × 480',
      '200 × 320',
      'Figure 4.5 How the fetch-execute cycle is carried out in the Von Neumann computer model',
      'Register Transfer Notation (RTN)',
      'MAR ← [PC]',
      'PC ← [PC] + 1',
      'MDR ← [[MAR]]',
      'CIR ← [MDR]',
      'Figure 4.6 The interrupt process during the fetch-execute cycle',
      '0000 0000',
      '0000 1000',
      'interrupt service routine (ISR)',
      'Activity 4A',
    ]) expect(batchText).toContain(token);
  });

  it('keeps source-specific Activity 4A wording instead of silently correcting the book', () => {
    expect(batchText).toContain('maximum refresh rate of 60 GHz');
    expect(batchText).toContain('up to 120 GHz');
    expect(batchText).toContain('preserved as printed rather than silently corrected');
  });

  it('preserves assembly-language organization, exact worked rows and the forward-reference example', () => {
    for (const token of [
      '4.2 Assembly language',
      'What you should already know',
      'Key terms',
      '4.2.1 Assembly language and machine code',
      'Opcode',
      'Operand',
      'LDD Total', '0140', '00000000110000000',
      'ADD 20', '0214', '00000001000011000',
      'STO Total', '0340', '00000001110000000',
      '4.2.2 Stages of assembly',
      'Pass 1', 'Pass 2', 'symbol table', 'forward reference',
      'Notfound: LDD 200 · CMP #0 · JPN Found · JPE Notfound',
      'Found: OUT',
      'Notfound → 100; Found → 104',
    ]) expect(batchText).toContain(token);
  });

  it('provides one progressive source-specific projector visual for every new scene', () => {
    expect(CHAPTER_4_FETCH_ASSEMBLY_VISUAL_IDS).toEqual(CHAPTER_4_FETCH_ASSEMBLY_SLIDES.map(slide => slide.id));
    const visuals = fixture('Chapter4FetchAssemblyVisuals.tsx');
    expect(visuals).toContain('revealStyle');
    expect(visuals).toContain('Hodder Tables 4.2 and 4.3');
    expect(visuals).toContain('Hodder Figure 4.5');
    expect(visuals).toContain('Hodder Register Transfer Notation');
    expect(visuals).toContain('Hodder Figure 4.6');
    expect(visuals).toContain('Hodder Activity 4A');
    expect(visuals).toContain('Hodder assembly mnemonic machine code examples');
    expect(visuals).toContain('Hodder two pass assembler forward reference example');
    const css = fixture('chapter4-fetch-assembly-visuals.css');
    expect(css).toContain('@media(max-height:760px)');
    expect(css).toContain('@media(max-width:760px)');
  });

  it('is wired into the shared V6 facade while the active lesson gate stays closed', () => {
    const facade = fixture('Chapter14PresentationVisualsV4.tsx');
    expect(facade).toContain('hasChapter4FetchAssemblyVisual');
    expect(facade).toContain('<Chapter4FetchAssemblyVisual beat={beat} reveal={reveal}/>');
    expect(canBuildSourceGroundedHodderChapter('9618', 4)).toBe(false);
    expect(lessonChapter(4)).toBeNull();
  });
});
