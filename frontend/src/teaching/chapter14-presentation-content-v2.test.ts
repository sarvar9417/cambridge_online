import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chapter14PresentationStoryboard } from './chapter14-presentation-storyboard';

const fixture=(name:string)=>readFileSync(resolve(process.cwd(),'src','teaching',name),'utf8');
const source=fixture('Chapter14PresentationContentV2.tsx');
const facade=fixture('Chapter14PresentationVisualsV4.tsx');
const css=fixture('chapter14-presentation-content-v2.css');

describe('Chapter 14 source-semantic presentation V2',()=>{
  it('renders every non-EOC Chapter 14 scene with authored semantic content',()=>{
    const scenes=chapter14PresentationStoryboard('overview')??[];
    for(const scene of scenes.filter(scene=>scene.id!=='h14p-142-practice')){
      expect(source).toContain(`case '${scene.id}'`);
    }
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

  it('locks switching, packet-control and routing meaning',()=>{
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

  it('uses the semantic renderer in the live facade and imports its CSS after the master design',()=>{
    expect(facade).toContain('Chapter14PresentationContentV2');
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
