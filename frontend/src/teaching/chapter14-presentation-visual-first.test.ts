import { describe, expect, it } from 'vitest';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import v2 from './Chapter14PresentationContentV2.tsx?raw';
import v4 from './Chapter14PresentationContentV4.tsx?raw';
import finalRenderer from './Chapter14PresentationContentFinal.tsx?raw';

describe('Chapter 14 visual-first projector routing',()=>{
  it('uses the existing dark-blue visual master instead of an extra rebuild layer',()=>{
    expect(facade).toContain("import { Chapter14PresentationContentV2 }");
    expect(facade).toContain('CHAPTER_14_VISUAL_FIRST_SCENES');
    expect(facade).toContain('return <Chapter14PresentationContentV2 beat={beat} reveal={reveal}/>');
    expect(facade).not.toContain('Chapter14PresentationRebuild');
    expect(facade).not.toContain('chapter14-presentation-rebuild.css');
  });

  it('renders the TCP IP stack as a large send and receive journey',()=>{
    expect(facade).toContain('function Chapter14TcpIpJourney');
    expect(facade).toContain("if(beat.id==='h14p-141-stack')return <Chapter14TcpIpJourney reveal={reveal}/>;");
    for(const marker of ['SENDER','SEND · 4 → 1','APPLICATION','TRANSPORT','INTERNET','LINK','RECEIVE · 1 → 4','RECEIVER','decomposition'])expect(facade).toContain(marker);
  });

  it('renders the HTTP journey as an integrated browser-to-server teaching diagram',()=>{
    expect(facade).toContain('function Chapter14HttpJourney');
    expect(facade).toContain("if(beat.id==='h14p-141-http')return <Chapter14HttpJourney reveal={reveal}/>;");
    for(const marker of ['BROWSER','HTTP(S)','TCP packet','PORT 80','DNS','IP / INTERNET ROUTING','WEB SERVER','HTML RESPONSE'])expect(facade).toContain(marker);
    for(const marker of ['URL → HTTP(S)','TCP/port 80','DNS lookup','TCP acknowledgement','HTML response','browser display'])expect(facade).toContain(marker);
  });

  it('routes explanation-heavy scenes to hand-authored visual diagrams',()=>{
    for(const id of [
      'h14p-141-hook','h14p-141-units','h14p-141-protocol-map',
      'h14p-141-email-mechanics','h14p-141-pop-imap','h14p-141-transport-family','h14p-141-tcp','h14p-141-ip-link',
      'h14p-141-wireless','h14p-141-bittorrent','h14p-142-hook','h14p-142-circuit-stages',
      'h14p-142-packet-basics','h14p-142-compare','h14p-142-circuit-pros-cons','h14p-142-packet-pros-cons',
      'h14p-142-video-example','h14p-142-hop','h14p-142-packet-control','h14p-142-routing','h14p-142-routing-fields',
      'h14p-142-web-page','h14p-142-exam','h14p-142-recap',
    ])expect(facade).toContain(`'${id}'`);
  });

  it('keeps richer source-exact specialist surfaces where they teach better than V2',()=>{
    expect(facade).not.toContain("  'h14p-141-bittorrent-terms',");
    expect(facade).not.toContain("  'h14p-142-activity14a',");
    expect(v4).toContain("if(beat.id==='h14p-141-bittorrent-terms')return <BitTorrentSwarmExact");
    expect(v4).toContain("if(beat.id==='h14p-142-activity14a')return <Activity14AExact");
  });

  it('keeps source-exact specialist surfaces for diagrams where precision matters',()=>{
    for(const marker of [
      "if(beat.id==='h14p-141-ethernet')return <EthernetFrameSourceComplete",
      "if(beat.id==='h14p-142-circuit-route')return <SourceNetwork mode=\"circuit\"",
      "if(beat.id==='h14p-142-packet-route')return <SourceNetwork mode=\"packet\"",
      "if(beat.id==='h14p-142-header')return <PacketHeaderCoreExact",
      "if(beat.id==='h14p-142-header-extended')return <PacketHeaderExtendedExact",
    ])expect(finalRenderer).toContain(marker);
  });

  it('retains visual teaching primitives for the benchmark-style sequence',()=>{
    for(const marker of [
      'h14c-agreement','h14c-encapsulation','h14c-protocol-map','h14c-email-mechanics',
      'h14c-popimap','h14c-transport','h14c-handshake','h14c-iplink','h14c-wireless','h14c-bittorrent-process',
      'h14c-switch-hook','h14c-circuit-stages','h14c-packet-basics','h14c-routing','h14c-final-map',
    ])expect(v2).toContain(marker);
  });

  it('keeps benchmark-critical concepts visible on the presentation surface',()=>{
    for(const marker of [
      'SENDING','RECEIVING','APPLICATION DATA','SEGMENT','DATAGRAM','FRAME',
      'SMTP · PUSH','POP / IMAP · PULL','HOST X','HOST Y',
      'TRACKER','SEED','destination IP','routing table',
    ])expect(v2).toContain(marker);
  });
});
