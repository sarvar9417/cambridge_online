import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import v2 from './Chapter14PresentationContentV2.tsx?raw';
import v3 from './Chapter14PresentationContentV3.tsx?raw';
import v4 from './Chapter14PresentationContentV4.tsx?raw';
import finalRenderer from './Chapter14PresentationContentFinal.tsx?raw';
import eoc from './Chapter14EndOfChapterMaster.tsx?raw';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import { chapter14PresentationStoryboard } from './chapter14-presentation-storyboard';
import { CHAPTER_14_DEEP_LIVE_PAGES, CHAPTER_14_DEEP_LIVE_REQUIREMENTS, CHAPTER_14_REQUIRED_SOURCE_TERMS } from './chapter14-deep-live-source-contract';

const sourceFile=(name:string)=>readFileSync(resolve(process.cwd(),'src','teaching',name),'utf8');
const deepCss=sourceFile('chapter14-presentation-deep-audit.css');
const networkCss=sourceFile('chapter14-presentation-deep-network.css');
const contentCss=sourceFile('chapter14-presentation-deep-content.css');
const finalCss=sourceFile('chapter14-presentation-final-source.css');
const live=[v2,v3,v4,finalRenderer,eoc].join('\n');
const css=[deepCss,networkCss,contentCss,finalCss].join('\n');

describe('Chapter 14 final page-by-page live source audit',()=>{
  it('covers every supplied printed page 328–345 exactly once and maps requirements to real scenes',()=>{
    expect(CHAPTER_14_DEEP_LIVE_PAGES).toEqual(Array.from({length:18},(_,i)=>328+i));
    expect(new Set(CHAPTER_14_DEEP_LIVE_PAGES).size).toBe(18);
    const sceneIds=new Set((chapter14PresentationStoryboard('overview')??[]).map(scene=>scene.id));
    for(const requirement of CHAPTER_14_DEEP_LIVE_REQUIREMENTS){
      expect(requirement.scenes.length).toBeGreaterThan(0);
      for(const scene of requirement.scenes)expect(sceneIds.has(scene),`p.${requirement.page} maps to missing scene ${scene}`).toBe(true);
    }
  });

  it('requires every page-significant source anchor to exist in the live projector renderer',()=>{
    for(const requirement of CHAPTER_14_DEEP_LIVE_REQUIREMENTS){
      for(const anchor of requirement.requiredAnchors){
        expect(live,`p.${requirement.page} missing live source anchor: ${anchor}`).toContain(anchor);
      }
    }
  });

  it('keeps every source key term visible somewhere in the live teaching content',()=>{
    const lower=live.toLowerCase();
    for(const term of CHAPTER_14_REQUIRED_SOURCE_TERMS)expect(lower,`missing key term: ${term}`).toContain(term.toLowerCase());
  });

  it('locks Figure 14.8 packet order and the four source-coloured teaching routes',()=>{
    expect(v4).toContain("const arrival=['P1','P4','P3','P2']");
    for(const route of [
      'router A → R2 → R5 → R8 → R7 → R10 → router B',
      'router A → R6 → R8 → R9 → R10 → router B',
      'router A → R2 → R1 → R3 → R4 → router B',
      'router A → R6 → R5 → R3 → R7 → R10 → router B',
    ])expect(finalRenderer).toContain(route);
    expect(finalRenderer).not.toContain('R3 → R4 → R10 → router B');
    expect(finalRenderer).toContain("mode==='circuit'?'device A':'computer A'");
    expect(finalRenderer).toContain("mode==='circuit'?'device B':'computer B'");
    const packetRouteRender=finalRenderer.indexOf("mode==='circuit'?<polyline");
    const nodeRender=finalRenderer.indexOf('<NodeLabels mode={mode}/>');
    expect(packetRouteRender).toBeGreaterThan(-1);
    expect(nodeRender).toBeGreaterThan(packetRouteRender);
  });

  it('locks Figure 14.7 exact route, endpoint terminology, condition and uses',()=>{
    expect(finalRenderer).toContain('A–R2 → R2–R5 → R5–R8 → R8–R7 → R7–R10 → R10–B');
    expect(finalRenderer).toContain('device A → router A → dedicated route → router B → device B');
    expect(finalRenderer).toContain('provided device B is not busy');
    expect(finalRenderer).toContain('Public telephone networks, private telephone networks and private data networks');
  });

  it('preserves source wording tensions instead of silently correcting the coursebook',()=>{
    expect(v4).toContain('Table 14.1 says transferring messages and attachments');
    expect(v4).toContain('LEECH · THREE COURSEBOOK WORDINGS');
    expect(v4).toContain('negative feedback from swarm members');
    expect(v4).toContain('logs off once the full download is complete');
    expect(v4).toContain('poor share ratio');
    expect(finalRenderer).toContain('VLAN wording says the Ethernet data size increases from 1539 bytes to around 9000 bytes per frame');
  });

  it('renders Figure 14.5 as a nested Ethernet structure rather than a flat decorative strip',()=>{
    for(const marker of ['PRE-AMBLE','START FRAME','ETHERNET DATA','64–1518 bytes','Destination','6 bytes','Source','Ethernet type / length','2 bytes','Actual message','46–1500 bytes','Frame check sequence','4 bytes','INTERPACKET GAP','12 bytes'])expect(finalRenderer).toContain(marker);
    expect(finalRenderer).toContain('FF:FF:FF:FF:FF:FF');
    expect(finalCss).toContain('.h14final-ethernet .ethernet-data>div');
  });

  it('renders every p.341 packet-header field in the live overridden scenes',()=>{
    for(const marker of ['PROTOCOL VERSION','4 bits','HEADER LENGTH','PRIORITY','8 bits','PACKET LENGTH','16 bits','FRAGMENT FLAGS','DF and MF','FRAGMENT OFFSET','13 bits','CURRENT HOP','PACKET COUNT','SEQUENCE','TRANSPORT PROTOCOL','TCP or UDP','HEADER CHECKSUM','SOURCE IP','32 bits','DESTINATION IP','6 × 4 = 24 bytes'])expect(finalRenderer).toContain(marker);
    expect(finalRenderer).toContain("if(beat.id==='h14p-142-header')return <PacketHeaderCoreExact");
    expect(finalRenderer).toContain("if(beat.id==='h14p-142-header-extended')return <PacketHeaderExtendedExact");
  });

  it('keeps complete source tables, transport error control and Activity 14A',()=>{
    expect(v4).toContain('The complete Chapter 14 learning map');
    expect(v4).toContain('TABLE 14.1');
    expect(v4).toContain('empty frames');
    expect(v4).toContain('distance and duration');
    expect(finalRenderer).toContain('lost or corrupted');
    expect(v4).toContain('Five-part consolidation task');
    expect(v4).toContain('deal with peers acting as leeches');
  });

  it('renders real Q4 statements rather than a placeholder instruction',()=>{
    for(const statement of [
      'a dedicated circuit/path is needed at all times',
      'the same route/circuit is used for every packet in the message',
      'bandwidth is shared with other packets of data',
      'none of the bandwidth available is wasted during transmission',
      'packets arrive at the destination in the correct order',
    ])expect(eoc).toContain(statement);
    expect(eoc).toContain('9608 · Paper 32 Q3 · November 2015');
  });

  it('turns both final retrieval scenes into information-rich teaching screens',()=>{
    for(const marker of ['PROTOCOL','TCP/IP STACK','HTTP','EMAIL','ETHERNET','BITTORRENT'])expect(finalRenderer).toContain(marker);
    for(const marker of ['FINAL ROUTING RETRIEVAL','HEADER','ROUTING TABLE','NEXT ROUTER','MAC UPDATE','FORWARD / DELETE','DESTINATION','WHY SEQUENCE?','WHY HOP NUMBER?','WHY CHECKSUM?'])expect(finalRenderer).toContain(marker);
    expect(finalRenderer).toContain("if(beat.id==='h14p-142-recap-routing')return <FinalRoutingRetrieval");
  });

  it('routes live Chapter 14 through the final renderer and loads final CSS after deep layers',()=>{
    expect(facade).toContain('Chapter14PresentationContentFinal');
    expect(facade).not.toContain('return <Chapter14PresentationContentV4 beat={beat}');
    expect(facade).toContain("./chapter14-presentation-final-source.css");
    expect(facade.indexOf("./chapter14-presentation-deep-audit.css")).toBeLessThan(facade.indexOf("./chapter14-presentation-final-source.css"));
    expect(facade.indexOf("./chapter14-presentation-deep-content.css")).toBeLessThan(facade.indexOf("./chapter14-presentation-final-source.css"));
  });

  it('keeps dense first-paint projector rules without hiding source content',()=>{
    for(const marker of ['.h14d-objectives','.h14d-app-protocols','.h14d-exact-proscons','.h14d-swarm','.h14d-iplink-exact','.h14d-activity14a','.h14final-network','.h14final-ethernet','.h14final-header-core','.h14final-header-extended','.h14final-check141','.h14final-recap','.h14final-routing-retrieval'])expect(css).toContain(marker);
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px)');
    expect(css).not.toContain('display:none');
  });
});
