import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_2_DNS_VISUAL_IDS, hasChapter2DnsVisual } from './Chapter2DnsVisuals';
import { presentationBeatsForSlide } from './lesson-experience-model';

const sourceFile=(name:string)=>readFileSync(resolve(process.cwd(),'src','teaching',name),'utf8');
const visual = sourceFile('Chapter2DnsVisuals.tsx');
const css = sourceFile('chapter2-dns-visuals.css');
const facade = sourceFile('Chapter14PresentationVisualsV4.tsx');

describe('Chapter 2 Hodder Figure 2.25 DNS visual-first batch', () => {
  it('keeps the DNS source scenes available to the shared projector facade', () => {
    const ids = new Set(CHAPTER_2_FINAL.slides.map(slide => slide.id));
    expect(ids.has('h2-225-dns')).toBe(true);
    for (const id of CHAPTER_2_DNS_VISUAL_IDS.filter(id => ids.has(id))) {
      const slide = CHAPTER_2_FINAL.slides.find(candidate => candidate.id === id)!;
      expect(presentationBeatsForSlide(slide, slide.title).some(hasChapter2DnsVisual), id).toBe(true);
    }
    expect(facade).toContain('hasChapter2DnsVisual(beat)');
    expect(facade).toContain('<Chapter2DnsVisual beat={beat} reveal={reveal}/>');
  });

  it('locks the five Figure 2.25 hops without collapsing source-critical details', () => {
    for (const marker of [
      'FIGURE 2.25 · DOMAIN NAME SERVICE',
      'www.hoddereducation.co.uk → 107.162.140.19',
      'DNS SERVER (1)', 'DNS SERVER (2)', 'WEBSITE SERVER',
      'cannot find the host in its database or cache',
      'stores the host/IP association in its cache or database',
      '107.162.140.19 is returned to the user’s computer',
      'required pages are downloaded',
      'browser interprets the HTML for display',
    ]) expect(visual, `missing Figure 2.25 source marker: ${marker}`).toContain(marker);
    expect((visual.match(/number: [1-5],/g) ?? []).length).toBe(5);
  });

  it('uses reveal-driven progressive disclosure and projector/mobile density rules', () => {
    for (const marker of [
      'reveal + 1', 'is-visible',
      '.h2dns-topology', '.h2dns-steps', '.h2dns-memory',
      '@media(max-height:820px)', '@media(max-width:900px)',
    ]) expect(`${visual}\n${css}`).toContain(marker);
  });
});
