import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_14_PRESENTATION_REVEAL_COUNTS } from './chapter14-presentation-runtime';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const progressiveHeroes=[
  'Chapter14ApplicationHeroes.tsx',
  'Chapter14BitTorrentHero.tsx',
  'Chapter14FlowHeroes.tsx',
  'Chapter14HeroVisuals.tsx',
  'Chapter14NetworkControlHeroes.tsx',
  'Chapter14PacketControlHero.tsx',
  'Chapter14RoutingTableHero.tsx',
  'Chapter14RoutingTransferHero.tsx',
  'Chapter14SwitchingCompareHero.tsx',
].map(source).join('\n');

describe('Chapter 14 reveal runtime quality',()=>{
  it('matches runtime reveal counts to the hand-authored teaching sequence',()=>{
    expect(CHAPTER_14_PRESENTATION_REVEAL_COUNTS).toMatchObject({
      'h14p-141-protocol-map':4,
      'h14p-141-http':7,
      'h14p-141-email-mechanics':3,
      'h14p-141-pop-imap':4,
      'h14p-141-ip-link':4,
      'h14p-141-wireless':5,
      'h14p-142-compare':6,
      'h14p-142-video-example':5,
      'h14p-142-hop':4,
      'h14p-142-packet-control':3,
      'h14p-142-header-extended':4,
      'h14p-142-routing':5,
      'h14p-142-routing-fields':5,
      'h14p-142-web-page':8,
      'h14p-142-exam':6,
    });
  });

  it('uses the shared reveal primitive rather than duplicated emphasis helpers',()=>{
    expect(progressiveHeroes).toContain("from './Chapter14VisualPrimitives'");
    expect(progressiveHeroes).not.toContain('const emphasis=(reveal:number,step:number)');
    expect(progressiveHeroes).toContain('revealStyle(reveal');
  });

  it('keeps future structure faintly visible while fully emphasising the current step',()=>{
    const primitives=source('Chapter14VisualPrimitives.ts');
    expect(primitives).toContain("opacity:visible?1:.28");
    expect(primitives).toContain("visibility:'visible'");
    expect(primitives).toContain("transform:'none'");
    expect(primitives).not.toContain("visibility:visible?'visible':'hidden'");
  });
});
