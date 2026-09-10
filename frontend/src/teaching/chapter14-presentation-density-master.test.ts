import { describe, expect, it } from 'vitest';
import source from './Chapter14PresentationContentV2.tsx?raw';
import densityCss from './chapter14-presentation-density-master.css?raw';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';

describe('Chapter 14 CONTENT-DENSITY MASTER',()=>{
  it('keeps all six Table 14.4 packet-switching benefit/drawback pairs in the authored slide',()=>{
    for(const text of [
      'No need to tie up a communication line',
      'Faulty lines can be bypassed by rerouting',
      'Traffic usage can be expanded easily',
      'Users charged for connectivity duration in source comparison',
      'High data transmission possible',
      'Uses digital networks',
      'Protocols can be more complex',
      'Lost packet must be resent',
      'Poor for real-time data streams',
      'Bandwidth is shared with other packets',
      'Delay while destination reassembles packets',
      'Large amounts of RAM may be needed',
    ])expect(source).toContain(text);
  });

  it('keeps all six Table 14.3 circuit-switching benefit/drawback pairs in the authored slide',()=>{
    for(const text of [
      'Dedicated to one transmission',
      'Whole bandwidth available',
      'Faster transfer rate than packet switching',
      'Frames arrive in same order',
      'A data packet cannot get lost by taking another route',
      'Works better for real-time applications',
      'Not flexible; single dedicated line',
      'Nobody else can use it even when idle',
      'Circuit remains reserved whether used or not',
      'No alternative routing after line fault',
      'Dedicated channels require greater bandwidth',
      'Link establishment can take time',
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
