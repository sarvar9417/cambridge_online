import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_4_DRAFT, CHAPTER_4_PROCESSOR_SLIDES } from './lesson-content-chapter4';
import { CHAPTER_4_PROCESSOR_VISUAL_IDS } from './Chapter4ProcessorVisuals';
import { canBuildSourceGroundedHodderChapter } from './hodder-source-readiness';
import { lessonChapter } from './lesson-content-source-complete';

const fixture = (name: string) => readFileSync(resolve(process.cwd(), 'src', 'teaching', name), 'utf8');
const chapterText = JSON.stringify(CHAPTER_4_PROCESSOR_SLIDES);

describe('Hodder 9618 Chapter 4 opening source completeness', () => {
  it('keeps the verified opening batch in printed-page order', () => {
    expect(CHAPTER_4_PROCESSOR_SLIDES.map(slide => slide.sourcePages?.[0])).toEqual([107, 109, 109, 110, 111, 112, 113, 114]);
    expect(CHAPTER_4_DRAFT.coverage).toContain('Source-complete through p.114');
    expect(CHAPTER_4_DRAFT.sourceNote).toContain('pp.115–135 remain explicitly unresolved');
  });

  it('preserves the Chapter 4 source figures, table, activity and terminology', () => {
    for (const token of ['Figure 4.1 Representation of Von Neumann architecture','Table 4.1 Common registers','Extension Activity 4A','Figure 4.2 System buses','Figure 4.3 Two cores, one channel and four cores, six channels','Figure 4.4 USB cable, HDMI cable, VGA cable','immediate access store (IAS)','CIR','IX','MAR','MDR/MBR','PC','SR','Carry flag','Negative flag','Overflow flag','Zero flag','address bus','data bus','control bus','3.5 GHz','overclocking','cache memory','asynchronous serial data transmission']) expect(chapterText).toContain(token);
  });

  it('locks source numeric examples instead of replacing them with generic examples', () => {
    expect(chapterText).toContain('00110111 shifted two places left → 11011100');
    expect(chapterText).toContain('01110111 + 00111000 = 10101111 → NVCZ = 1100');
    expect(chapterText).toContain('10001000 + 11000111 = 101001111 → NVCZ = 0110');
    expect(chapterText).toContain('16-bit address bus → 2^16 = 65 536 memory locations');
    expect(chapterText).toContain('32-bit address bus → 4 294 967 296 memory locations');
  });

  it('provides a source-specific progressive projector visual for every content scene in the batch', () => {
    expect(CHAPTER_4_PROCESSOR_VISUAL_IDS).toEqual(['h4-411-von-neumann','h4-412-cpu-components','h4-413-registers','h4-413-status-flags','h4-414-system-buses','h4-414-performance','h4-415-ports-usb']);
    const visuals = fixture('Chapter4ProcessorVisuals.tsx');
    expect(visuals).toContain('revealStyle');
    expect(visuals).toContain('Hodder Figure 4.1');
    expect(visuals).toContain('Hodder Table 4.1');
    expect(visuals).toContain('Hodder Figure 4.2');
    expect(visuals).toContain('Hodder Figure 4.3');
    expect(visuals).toContain('Hodder Figure 4.4');
    const css = fixture('chapter4-processor-visuals.css');
    expect(css).toContain('@media (max-height:760px)');
    expect(css).toContain('@media (max-width:760px)');
  });

  it('is wired into the shared V6 projector facade and remains part of active Chapter 4 after full source lock', () => {
    const facade = fixture('Chapter14PresentationVisualsV4.tsx');
    expect(facade).toContain('hasChapter4ProcessorVisual');
    expect(facade).toContain('<Chapter4ProcessorVisual beat={beat} reveal={reveal}/>');
    expect(canBuildSourceGroundedHodderChapter('9618', 4)).toBe(true);
    expect(lessonChapter(4)?.number).toBe(4);
  });
});
