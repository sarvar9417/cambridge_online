import { describe, expect, it } from 'vitest';
import v3 from './Chapter14PresentationContentV3.tsx?raw';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import css from './chapter14-presentation-source-complete.css?raw';
import { chapter14PresentationStoryboard } from './chapter14-presentation-storyboard';
import { CHAPTER_14_LIVE_PRINTED_PAGES, CHAPTER_14_LIVE_SOURCE_CONTRACT, chapter14LivePagesCovered } from './chapter14-live-source-contract';

describe('Chapter 14 live presentation source completeness',()=>{
  it('maps every supplied printed page 328–345 into the live presentation',()=>{
    expect(chapter14LivePagesCovered()).toEqual(CHAPTER_14_LIVE_PRINTED_PAGES);
    const liveSceneIds=new Set((chapter14PresentationStoryboard('overview')??[]).map(scene=>scene.id));
    for(const item of CHAPTER_14_LIVE_SOURCE_CONTRACT){
      expect(item.scenes.length).toBeGreaterThan(0);
      for(const scene of item.scenes)expect(liveSceneIds.has(scene),`${item.pages.join(',')} points to missing live scene ${scene}`).toBe(true);
    }
  });

  it('restores both coursebook prior-knowledge checkpoints',()=>{
    for(const marker of [
      'Five checks before 14.1','IP + TCP','PEER-TO-PEER','STACK + QUEUE','IP-address conflicts','status flags',
      'Bridge from Chapter 2 to switching','PSTN','VoIP','THREE-PACKET ROUTE',
    ])expect(v3).toContain(marker);
  });

  it('keeps source-significant protocol details in the live projector renderer',()=>{
    for(const marker of [
      'HTTP defines the format of messages sent and received',
      'browser sends request messages to web servers',
      'ftp://username@ftp.example.gov/',
      'computer/machine-readable rather than human-readable',
      'SMTP remains used when transferring email between email servers',
      'PHYSICAL NETWORK LAYER',
      'avoid two or more devices transmitting at the same time',
      'CSMA/CA',
      'NOT CSMA/CD',
      'thousands of internet users',
      'Number of complete copies of the torrent contents distributed amongst the swarm',
      'uploaded data ÷ downloaded data',
      'about 12% BitTorrent video-file sharing versus about 50% YouTube',
    ])expect(v3).toContain(marker);
  });

  it('locks source-specific switching and routing details',()=>{
    for(const marker of [
      'A → R2 → R5 → R8 → R7 → R10 → B',
      'provided device B is not busy',
      'Public telephone networks, private telephone networks and private data networks',
      'number of datagram packets waiting to be processed at each node/router',
      'shortest path available is selected',
    ])expect(v3).toContain(marker);
  });

  it('reproduces all six Table 14.5 rows instead of replacing the last row',()=>{
    for(const marker of [
      'Actual route must be set up before transmission begins',
      'A dedicated transmission path is required',
      'Each packet uses the same route',
      'Packets arrive at the destination in the correct order',
      'All the bandwidth of the channel is required',
      'Is bandwidth wasted?',
    ])expect(v3).toContain(marker);
    expect(v3).toContain('Fault rerouting is taught on the dedicated failure scene');
  });

  it('routes Chapter 14 through the final renderer and keeps source-complete CSS after density CSS',()=>{
    expect(facade).toContain('Chapter14PresentationContentFinal');
    expect(facade).not.toContain('return <Chapter14PresentationContentV3 beat={beat}');
    expect(facade.indexOf("./chapter14-presentation-density-master.css")).toBeLessThan(facade.indexOf("./chapter14-presentation-source-complete.css"));
  });

  it('keeps source detail projector-dense rather than creating empty scenes',()=>{
    expect(css).toContain('.h14f-composite');
    expect(css).toContain('grid-template-rows:minmax(0,1fr) auto');
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px)');
    expect(css).not.toContain('display:none');
  });
});
