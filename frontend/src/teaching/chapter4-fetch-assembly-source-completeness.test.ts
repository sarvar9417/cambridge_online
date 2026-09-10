import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_4_FETCH_ASSEMBLY_SLIDES } from './lesson-content-chapter4-fetch-assembly';
import { CHAPTER_4_CURRENT_SLIDES } from './lesson-content-chapter4-current';
import { CHAPTER_4_FETCH_ASSEMBLY_VISUAL_IDS } from './Chapter4FetchAssemblyVisuals';
import { canBuildSourceGroundedHodderChapter } from './hodder-source-readiness';
import { lessonChapter } from './lesson-content-source-complete';

const fixture = (name: string) => readFileSync(resolve(process.cwd(), 'src', 'teaching', name), 'utf8');
const batchText = JSON.stringify(CHAPTER_4_FETCH_ASSEMBLY_SLIDES);

describe('Hodder 9618 Chapter 4 pp115-123 source completeness', () => {
  it('retains the verified pp115-123 batch inside the completed chapter', () => {
    expect(CHAPTER_4_FETCH_ASSEMBLY_SLIDES.map(slide => slide.sourcePages)).toEqual([[115,116],[116,117],[117,118],[118],[119],[119,120],[121],[121,122],[122,123]]);
    expect(CHAPTER_4_CURRENT_SLIDES).toEqual(expect.arrayContaining(CHAPTER_4_FETCH_ASSEMBLY_SLIDES));
  });

  it('preserves source-specific ports, fetch cycle, RTN, interrupts and Activity 4A', () => {
    for (const token of ['Table 4.2 Pros and cons of the USB system','Table 4.3 Pros and cons of HDMI and VGA','Figure 4.5 How the fetch-execute cycle is carried out in the Von Neumann computer model','MAR ← [PC]','MDR ← [[MAR]]','Figure 4.6 The interrupt process during the fetch-execute cycle','interrupt service routine (ISR)','Activity 4A','maximum refresh rate of 60 GHz','up to 120 GHz']) expect(batchText).toContain(token);
  });

  it('preserves assembly organization and the forward-reference example', () => {
    for (const token of ['4.2.1 Assembly language and machine code','LDD Total','0140','ADD 20','0214','STO Total','0340','4.2.2 Stages of assembly','Pass 1','Pass 2','symbol table','forward reference','Notfound → 100; Found → 104']) expect(batchText).toContain(token);
  });

  it('keeps one progressive projector visual for every scene in this batch', () => {
    expect(CHAPTER_4_FETCH_ASSEMBLY_VISUAL_IDS).toEqual(CHAPTER_4_FETCH_ASSEMBLY_SLIDES.map(slide => slide.id));
    const visuals = fixture('Chapter4FetchAssemblyVisuals.tsx');
    expect(visuals).toContain('revealStyle');
    expect(fixture('chapter4-fetch-assembly-visuals.css')).toContain('@media(max-height:760px)');
  });

  it('is still wired into V6 and now participates in the active completed Chapter 4', () => {
    const facade = fixture('Chapter14PresentationVisualsV4.tsx');
    expect(facade).toContain('hasChapter4FetchAssemblyVisual');
    expect(facade).toContain('<Chapter4FetchAssemblyVisual beat={beat} reveal={reveal}/>');
    expect(canBuildSourceGroundedHodderChapter('9618', 4)).toBe(true);
    expect(lessonChapter(4)?.number).toBe(4);
  });
});
