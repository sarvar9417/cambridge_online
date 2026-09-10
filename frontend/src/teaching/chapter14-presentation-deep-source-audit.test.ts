import { describe, expect, it } from 'vitest';
import v2 from './Chapter14PresentationContentV2.tsx?raw';
import v3 from './Chapter14PresentationContentV3.tsx?raw';
import v4 from './Chapter14PresentationContentV4.tsx?raw';
import eoc from './Chapter14EndOfChapterMaster.tsx?raw';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import css from './chapter14-presentation-deep-audit.css?raw';
import { CHAPTER_14_DEEP_LIVE_PAGES, CHAPTER_14_DEEP_LIVE_REQUIREMENTS } from './chapter14-deep-live-source-contract';

const live=[v2,v3,v4,eoc].join('\n');

describe('Chapter 14 deep page-by-page live source audit',()=>{
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

  it('locks the corrected Figure 14.8 teaching reconstruction',()=>{
    expect(v4).toContain("const arrival=['P1','P4','P3','P2']");
    for(const route of [
      "['A','R2','R5','R8','R7','R10','B']",
      "['A','R6','R8','R9','R10','B']",
      "['A','R2','R1','R3','R4','R10','B']",
      "['A','R6','R5','R3','R7','R10','B']",
    ])expect(v4).toContain(route);
    expect(v4).toContain('P1–P4 are teaching labels assigned to the source colours');
  });

  it('preserves source wording tensions instead of silently rewriting the book',()=>{
    expect(v4).toContain('Table 14.1 says transferring messages and attachments');
    expect(v4).toContain('SOURCE WORDING · TORRENT');
    expect(v4).toContain('LEECH · TWO SOURCE DESCRIPTIONS');
  });

  it('keeps complete source tables and a dense first-paint model',()=>{
    expect(v4).toContain('The complete Chapter 14 learning map');
    expect(v4).toContain('TABLE 14.1');
    expect(v4).toContain('empty frames');
    expect(v4).toContain('distance and duration');
    expect(css).toContain('.h14d-objectives');
    expect(css).toContain('.h14d-app-protocols');
    expect(css).toContain('.h14d-exact-proscons');
    expect(css).not.toContain('display:none');
  });

  it('routes live Chapter 14 through V4 and loads deep-audit hardening last',()=>{
    expect(facade).toContain('Chapter14PresentationContentV4');
    expect(facade).not.toContain('return <Chapter14PresentationContentV3 beat={beat}');
    expect(facade).toContain("./chapter14-presentation-deep-audit.css");
    expect(facade.indexOf("./chapter14-presentation-source-complete.css")).toBeLessThan(facade.indexOf("./chapter14-presentation-deep-audit.css"));
  });
});
