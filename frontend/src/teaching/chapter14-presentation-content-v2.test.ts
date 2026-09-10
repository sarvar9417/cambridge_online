import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chapter14PresentationStoryboard } from './chapter14-presentation-storyboard';
import source from './Chapter14PresentationContentV2.tsx?raw';
import finalRenderer from './Chapter14PresentationContentFinal.tsx?raw';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import { CHAPTER_14_PRESENTATION_REVEAL_COUNTS } from './chapter14-presentation-runtime';

const css=readFileSync(resolve(process.cwd(),'src','teaching','chapter14-presentation-content-v2.css'),'utf8');

describe('Chapter 14 source-semantic presentation base layer',()=>{
  it('keeps the legacy semantic layer for its authored scenes while the final runtime owns all 43 live scenes',()=>{
    const scenes=chapter14PresentationStoryboard('overview')??[];
    expect(scenes).toHaveLength(43);
    expect(Object.keys(CHAPTER_14_PRESENTATION_REVEAL_COUNTS)).toHaveLength(43);
    for(const scene of scenes.filter(scene=>scene.id!=='h14p-142-practice'&&scene.id!=='h14p-142-recap-routing')){
      expect(source,`V2 base layer lost ${scene.id}`).toContain(`case '${scene.id}'`);
    }
    expect(finalRenderer).toContain("if(beat.id==='h14p-142-recap-routing')return <FinalRoutingRetrieval");
  });

  it('locks the source-sensitive communication processes instead of generic decoration',()=>{
    for(const anchor of [
      'EVEN or ODD?',
      'SENDING<br/>4 → 1',
      'port 80',
      '331 Anonymous access allowed',
      'SMTP · PUSH',
      'MIME · ATTACHMENT SUPPORT',
      'POP3/4',
      'synchronisation sequence bits',
      'FF:FF:FF:FF:FF:FF',
      'IEEE 802.11',
      '20 MiB → 20 × 1 MiB',
      'SEED × 6',
      'LEECH × 2',
      'NEW × 3',
    ])expect(source).toContain(anchor);
  });

  it('locks switching, packet-control and routing meaning in the semantic base',()=>{
    for(const anchor of [
      'A → R2 → R5 → R8 → R7 → R10 → B',
      '4 packets',
      'different arrival order',
      'hop number = 0',
      'Different checksum values → request the packet to be re-sent.',
      'DF = do not fragment',
      'value 6 → 6 × 4 = 24 bytes',
      'NEXT-ROUTER MAC',
      'NETWORK DESTINATION',
      'NETMASK',
      'INTERFACE',
      'reassemble packets to rebuild the page',
    ])expect(source).toContain(anchor);
  });

  it('routes the live deck through the final source renderer while retaining base CSS',()=>{
    expect(facade).toContain('Chapter14PresentationContentFinal');
    expect(facade).toContain('hasChapter14PresentationRuntime');
    expect(facade).toContain("./chapter14-presentation-content-v2.css");
    expect(facade.indexOf("./chapter14-presentation-master.css")).toBeLessThan(facade.indexOf("./chapter14-presentation-content-v2.css"));
  });

  it('keeps semantic diagrams projector-responsive',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  });
});
