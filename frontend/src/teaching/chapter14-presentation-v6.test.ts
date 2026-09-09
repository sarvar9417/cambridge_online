import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chapter14PresentationStoryboard } from './chapter14-presentation-storyboard';
import { hasChapter14PresentationVisualV4 } from './Chapter14PresentationVisualsV4';
import { CHAPTER_14_V6_VISUAL_IDS } from './Chapter14PresentationVisualsV6';

const visualSource=readFileSync(new URL('./Chapter14PresentationVisualsV6.tsx',import.meta.url),'utf8');
const completenessSource=readFileSync(new URL('./Chapter14PresentationCompleteness.tsx',import.meta.url),'utf8');
const q4Source=readFileSync(new URL('./Chapter14PracticeQ4.tsx',import.meta.url),'utf8');

describe('Chapter 14 complete visual-first presentation',()=>{
  it('gives every storyboard scene a dedicated V6 visual',()=>{
    const scenes=chapter14PresentationStoryboard('overview')??[];
    expect(scenes).toHaveLength(42);
    expect(CHAPTER_14_V6_VISUAL_IDS).toHaveLength(42);
    expect(new Set(CHAPTER_14_V6_VISUAL_IDS).size).toBe(42);
    expect(scenes.map(scene=>scene.id)).toEqual([...CHAPTER_14_V6_VISUAL_IDS]);
    expect(scenes.every(hasChapter14PresentationVisualV4)).toBe(true);
  });

  it('locks the source-sensitive visual details that were previously easy to lose',()=>{
    for(const marker of [
      '331 Anonymous access allowed',
      'RIP',
      'SNMP',
      'MIME header',
      'synchronisation sequence bits',
      'FF:FF:FF:FF:FF:FF',
      '802.16-2004',
      '802.16-2005',
      'uploaded ÷ downloaded',
      'A → R2 → R5 → R8 → R7 → R10 → B',
      "['P4'",
      '0 · DF · MF',
      'NEXT-ROUTER MAC',
      'add its MAC',
    ]) expect(visualSource,`missing visual source marker: ${marker}`).toContain(marker);
  });

  it('keeps secondary but source-significant details visible without crowding the main diagrams',()=>{
    for(const marker of [
      'IP conflicts',
      'status flags',
      'port 80',
      'server TCP sends an acknowledgement',
      'machine-readable but not human-readable',
      'external devices requires IP',
      '20 × 1 MiB pieces',
      'about 12% of video-file sharing',
      'private data networks',
      'provided device B is not busy',
      '6 × 4 = 24 bytes',
      'no route can be found',
    ]) expect(completenessSource,`missing secondary source marker: ${marker}`).toContain(marker);
  });

  it('uses the coursebook TCP handshake wording instead of unsupported SYN shorthand',()=>{
    expect(visualSource).toContain('acknowledgement + own synchronisation sequence bits');
    expect(visualSource).not.toContain('SYN /');
    expect(visualSource).not.toContain('SYN/ACK');
  });

  it('includes all four source end-of-chapter question groups',()=>{
    expect(visualSource).toContain("['Q1'");
    expect(visualSource).toContain("['Q2'");
    expect(visualSource).toContain("['Q3'");
    expect(q4Source).toContain('Q4');
    expect(q4Source).toContain('hop number and checksum');
    expect(q4Source).toContain('headers and routing tables');
  });
});
