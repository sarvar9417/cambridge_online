import { describe, expect, it } from 'vitest';
import v2 from './Chapter14PresentationContentV2.tsx?raw';
import v3 from './Chapter14PresentationContentV3.tsx?raw';
import v4 from './Chapter14PresentationContentV4.tsx?raw';
import finalRenderer from './Chapter14PresentationContentFinal.tsx?raw';
import eoc from './Chapter14EndOfChapterMaster.tsx?raw';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import deepCss from './chapter14-presentation-deep-audit.css?raw';
import networkCss from './chapter14-presentation-deep-network.css?raw';
import contentCss from './chapter14-presentation-deep-content.css?raw';
import finalCss from './chapter14-presentation-final-source.css?raw';
import { CHAPTER_14_DEEP_LIVE_PAGES, CHAPTER_14_DEEP_LIVE_REQUIREMENTS } from './chapter14-deep-live-source-contract';

const live=[v2,v3,v4,finalRenderer,eoc].join('\n');
const css=[deepCss,networkCss,contentCss,finalCss].join('\n');

describe('Chapter 14 final page-by-page live source audit',()=>{
  it('covers every supplied printed page 328–345 exactly once in the strong contract',()=>{
    expect(CHAPTER_14_DEEP_LIVE_PAGES).toEqual(Array.from({length:18},(_,i)=>328+i));
    expect(new Set(CHAPTER_14_DEEP_LIVE_PAGES).size).toBe(18);
  });

  it('requires every page-significant source anchor to exist in the live projector renderer',()=>{
    for(const requirement of CHAPTER_14_DEEP_LIVE_REQUIREMENTS){
      for(const anchor of requirement.requiredAnchors){
        expect(live, `p.${requirement.page} missing live source anchor: ${anchor}`).toContain(anchor);
      }
    }
  });

  it('locks Figure 14.8 packet order and the four source-coloured teaching routes',()=>{
    expect(v4).toContain("const arrival=['P1','P4','P3','P2']");
    for(const route of [
      'router A → R2 → R5 → R8 → R7 → R10 → router B',
      'router A → R6 → R8 → R9 → R10 → router B',
      'router A → R2 → R1 → R3 → R4 → R10 → router B',
      'router A → R6 → R5 → R3 → R7 → R10 → router B',
    ])expect(finalRenderer).toContain(route);
    expect(finalRenderer).toContain('computer A');
    expect(finalRenderer).toContain('router A');
    expect(finalRenderer).toContain('router B');
    expect(finalRenderer).toContain('computer B');
    expect(finalRenderer.indexOf('<Edges/>')).toBeLessThan(finalRenderer.indexOf('<NodeLabels/>'));
  });

  it('locks Figure 14.7 exact route, condition and all three source use categories',()=>{
    expect(finalRenderer).toContain('A–R2 → R2–R5 → R5–R8 → R8–R7 → R7–R10 → R10–B');
    expect(finalRenderer).toContain('provided device B is not busy');
    expect(finalRenderer).toContain('Public telephone networks, private telephone networks and private data networks');
  });

  it('preserves source wording tensions instead of silently correcting the coursebook',()=>{
    expect(v4).toContain('Table 14.1 says transferring messages and attachments');
    expect(v4).toContain('LEECH · THREE COURSEBOOK WORDINGS');
    expect(v4).toContain('negative feedback from swarm members');
    expect(v4).toContain('logs off once the full download is complete');
    expect(v4).toContain('poor share ratio');
  });

  it('keeps complete source tables, header sizes, transport error control and Activity 14A',()=>{
    expect(v4).toContain('The complete Chapter 14 learning map');
    expect(v4).toContain('TABLE 14.1');
    expect(v4).toContain('empty frames');
    expect(v4).toContain('distance and duration');
    expect(v4).toContain('VERSION · 4 BITS');
    expect(v4).toContain('SOURCE + DESTINATION · 32 BITS EACH');
    expect(finalRenderer).toContain('lost or corrupted');
    expect(v4).toContain('Five-part consolidation task');
    expect(v4).toContain('deal with peers acting as leeches');
  });

  it('renders the real Q4 statements rather than a placeholder instruction',()=>{
    for(const statement of [
      'a dedicated circuit/path is needed at all times',
      'the same route/circuit is used for every packet in the message',
      'bandwidth is shared with other packets of data',
      'none of the bandwidth available is wasted during transmission',
      'packets arrive at the destination in the correct order',
    ])expect(eoc).toContain(statement);
    expect(eoc).toContain('9608 · Paper 32 Q3 · November 2015');
  });

  it('routes live Chapter 14 through the final renderer and loads final CSS after deep layers',()=>{
    expect(facade).toContain('Chapter14PresentationContentFinal');
    expect(facade).not.toContain('return <Chapter14PresentationContentV4 beat={beat}');
    expect(facade).toContain("./chapter14-presentation-final-source.css");
    expect(facade.indexOf("./chapter14-presentation-deep-audit.css")).toBeLessThan(facade.indexOf("./chapter14-presentation-final-source.css"));
    expect(facade.indexOf("./chapter14-presentation-deep-content.css")).toBeLessThan(facade.indexOf("./chapter14-presentation-final-source.css"));
  });

  it('keeps dense first-paint projector rules without hiding source content',()=>{
    for(const marker of ['.h14d-objectives','.h14d-app-protocols','.h14d-exact-proscons','.h14d-swarm','.h14d-iplink-exact','.h14d-activity14a','.h14final-network'])expect(css).toContain(marker);
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px)');
    expect(css).not.toContain('display:none');
  });
});
