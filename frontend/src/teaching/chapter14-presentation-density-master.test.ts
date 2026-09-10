import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import source from './Chapter14PresentationContentV4.tsx?raw';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';

const densityCss=readFileSync(resolve(process.cwd(),'src','teaching','chapter14-presentation-density-master.css'),'utf8');

describe('Chapter 14 CONTENT-DENSITY MASTER',()=>{
  it('keeps all six Table 14.4 packet-switching benefit/drawback pairs in the live authored layer',()=>{
    for(const text of [
      'No need to tie up a communication line.',
      'Failed or faulty lines can be overcome by re-routing packets.',
      'Traffic usage is easy to expand.',
      'circuit switching uses distance and duration; packet switching uses duration of connectivity',
      'High data transmission is possible with packet switching.',
      'Packet switching always uses digital networks',
      'Packet-switching protocols can be more complex than circuit-switching protocols.',
      'If a packet is lost, the sender must re-send it',
      'It does not work well with real-time data streams.',
      'share its bandwidth with other packets',
      'delay at the destination while packets are reassembled',
      'Large amounts of RAM may be needed to handle the data.',
    ])expect(source).toContain(text);
  });

  it('keeps all six Table 14.3 circuit-switching benefit/drawback pairs in the live authored layer',()=>{
    for(const text of [
      'The circuit is dedicated to the single transmission only.',
      'The whole of the bandwidth is available.',
      'The data transfer rate is faster than with packet switching.',
      'Packets/frames arrive at the destination in the same order as sent.',
      'all packets follow in sequence along the same single route',
      'It works better than packet switching in real-time applications.',
      'it can send empty frames and has to use one dedicated line',
      'Nobody else can use the circuit/channel even when it is idle.',
      'The circuit is always there whether or not it is used.',
      'failure/fault on the dedicated line leaves no alternative routing',
      'Dedicated channels require a greater bandwidth.',
      'time required to establish a link can be long',
    ])expect(source).toContain(text);
  });

  it('makes future reveal content dim-but-visible rather than absent',()=>{
    expect(densityCss).toContain('--h14-density-upcoming:.42');
    expect(densityCss).toContain('.h14c-proscons>section:not(.is-visible)');
    expect(densityCss).toContain('opacity:var(--h14-density-upcoming)!important');
    expect(densityCss).toContain('visibility:visible!important');
    expect(densityCss).toContain('transform:none!important');
  });

  it('uses dense six-row projector comparison geometry',()=>{
    expect(densityCss).toContain('.h14c-proscons>section{');
    expect(densityCss).toContain('min-height:54px');
    expect(densityCss).toContain('@media(max-height:768px)');
    expect(densityCss).toContain('min-height:44px');
  });

  it('applies density overrides after projector rules so reveal means emphasis',()=>{
    expect(facade).toContain("./chapter14-presentation-density-master.css");
    expect(facade.indexOf("./chapter14-presentation-master-projector.css")).toBeLessThan(facade.indexOf("./chapter14-presentation-density-master.css"));
  });

  it('never hides unrevealed teaching structure with display none',()=>{
    expect(densityCss).not.toContain('display:none');
  });
});
