import { describe, expect, it } from 'vitest';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import hero from './Chapter14HeroVisuals.tsx?raw';
import flow from './Chapter14FlowHeroes.tsx?raw';
import routingTransfer from './Chapter14RoutingTransferHero.tsx?raw';
import networkControl from './Chapter14NetworkControlHeroes.tsx?raw';
import bittorrent from './Chapter14BitTorrentHero.tsx?raw';
import switching from './Chapter14SwitchingCompareHero.tsx?raw';
import v2 from './Chapter14PresentationContentV2.tsx?raw';
import v4 from './Chapter14PresentationContentV4.tsx?raw';
import finalRenderer from './Chapter14PresentationContentFinal.tsx?raw';

describe('Chapter 14 visual-first projector routing',()=>{
  it('uses the existing dark-blue visual master instead of an extra rebuild layer',()=>{
    expect(facade).toContain("import { Chapter14PresentationContentV2 }");
    expect(facade).toContain("from './Chapter14HeroVisuals'");
    expect(facade).toContain("from './Chapter14FlowHeroes'");
    expect(facade).toContain("from './Chapter14RoutingTransferHero'");
    expect(facade).toContain("from './Chapter14NetworkControlHeroes'");
    expect(facade).toContain("from './Chapter14BitTorrentHero'");
    expect(facade).toContain("from './Chapter14SwitchingCompareHero'");
    expect(facade).toContain('CHAPTER_14_VISUAL_FIRST_SCENES');
    expect(facade).toContain('return <Chapter14PresentationContentV2 beat={beat} reveal={reveal}/>');
    expect(facade).not.toContain('Chapter14PresentationRebuild');
    expect(facade).not.toContain('chapter14-presentation-rebuild.css');
  });

  it('renders the TCP IP stack as a large send and receive journey',()=>{
    expect(hero).toContain('function Chapter14TcpIpJourney');
    expect(facade).toContain("if(beat.id==='h14p-141-stack')return <Chapter14TcpIpJourney reveal={reveal}/>;");
    for(const marker of ['SENDER','SEND · 4 → 1','APPLICATION','TRANSPORT','INTERNET','LINK','RECEIVE · 1 → 4','RECEIVER','decomposition'])expect(hero).toContain(marker);
  });

  it('renders encapsulation as nested wrappers with send and receive directions',()=>{
    expect(flow).toContain('function Chapter14EncapsulationHero');
    expect(facade).toContain("if(beat.id==='h14p-141-units')return <Chapter14EncapsulationHero reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-141-units',");
    for(const marker of ['APPLICATION DATA','SEGMENT','DATAGRAM','FRAME','TCP HEADER','IP HEADER','LINK HEADER','FRAME CHECK','4 → 1','1 → 4'])expect(flow).toContain(marker);
  });

  it('renders the HTTP journey as an integrated browser-to-server teaching diagram',()=>{
    expect(hero).toContain('function Chapter14HttpJourney');
    expect(facade).toContain("if(beat.id==='h14p-141-http')return <Chapter14HttpJourney reveal={reveal}/>;");
    for(const marker of ['BROWSER','HTTP(S)','TCP packet','PORT 80','DNS','IP / INTERNET ROUTING','WEB SERVER','HTML RESPONSE'])expect(hero).toContain(marker);
    for(const marker of ['URL → HTTP(S)','TCP/port 80','DNS lookup','TCP acknowledgement','HTML response','browser display'])expect(hero).toContain(marker);
  });

  it('separates SMTP push, MIME attachment support and POP IMAP pull',()=>{
    expect(flow).toContain('function Chapter14EmailMechanicsHero');
    expect(facade).toContain("if(beat.id==='h14p-141-email-mechanics')return <Chapter14EmailMechanicsHero reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-141-email-mechanics',");
    for(const marker of ['SMTP · PUSH','CLIENT → EMAIL SERVER','MIME · ATTACHMENTS','MIME HEADER','POP / IMAP · PULL','CLIENT ← EMAIL SERVER','SMTP is still used between email servers'])expect(flow).toContain(marker);
  });

  it('teaches transport reliability with PAR before the TCP handshake',()=>{
    expect(flow).toContain('function Chapter14TransportReliabilityHero');
    expect(facade).toContain("if(beat.id==='h14p-141-transport-family')return <Chapter14TransportReliabilityHero reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-141-transport-family',");
    for(const marker of ['MESSAGE','P1','P2','P3','P4','NO POSITIVE ACK FOR P3','RE-SEND P3','PAR','TCP · UDP · SCTP'])expect(flow).toContain(marker);
  });

  it('renders the source TCP connection setup as a host-to-host dialogue',()=>{
    expect(flow).toContain('function Chapter14TcpHandshakeHero');
    expect(facade).toContain("if(beat.id==='h14p-141-tcp')return <Chapter14TcpHandshakeHero reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-141-tcp',");
    for(const marker of ['HOST X','HOST Y','segment containing synchronisation sequence bits','acknowledgement + Y’s own synchronisation sequence bits','transmission between X and Y can now take place','connection-oriented and host-to-host'])expect(flow).toContain(marker);
  });

  it('makes the Internet to Link handoff visible as datagram to local frame',()=>{
    expect(networkControl).toContain('function Chapter14IpLinkHero');
    expect(facade).toContain("if(beat.id==='h14p-141-ip-link')return <Chapter14IpLinkHero reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-141-ip-link',");
    for(const marker of ['2 · INTERNET LAYER · IP','SOURCE IP','DESTINATION IP','PACKET + IP HEADER = DATAGRAM','1 · LINK LAYER','IP → MAC','LINK HEADER + IP DATAGRAM + CHECK = FRAME','Ethernet is local'])expect(networkControl).toContain(marker);
  });

  it('renders wireless access as the source WiFi DCF acknowledgement loop',()=>{
    expect(networkControl).toContain('function Chapter14WirelessHero');
    expect(facade).toContain("if(beat.id==='h14p-141-wireless')return <Chapter14WirelessHero reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-141-wireless',");
    for(const marker of ['Wi-Fi · IEEE 802.11','CSMA/CA + DCF','SENSE CHANNEL','DCF DECISION','WAIT FOR ACK','NO ACK?','BLUETOOTH','IEEE 802.15','WiMAX','IEEE 802.16'])expect(networkControl).toContain(marker);
  });

  it('renders BitTorrent as tracker discovery plus direct peer piece sharing',()=>{
    expect(bittorrent).toContain('function Chapter14BitTorrentHero');
    expect(facade).toContain("if(beat.id==='h14p-141-bittorrent')return <Chapter14BitTorrentHero reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-141-bittorrent',");
    for(const marker of ['ORIGINAL PEER','FILE SPLIT INTO PIECES','TRACKER','connected peer details','IP addresses','PEER-TO-PEER','SEED + REASSEMBLY','not the shared file store','DASHED LINKS','SOLID ARROWS'])expect(bittorrent).toContain(marker);
  });

  it('uses a source-exact visual comparison for circuit and packet switching',()=>{
    expect(switching).toContain('function Chapter14SwitchingCompareHero');
    expect(facade).toContain("if(beat.id==='h14p-142-compare')return <Chapter14SwitchingCompareHero reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-142-compare',");
    for(const marker of ['Route set up before transmission','Dedicated transmission path','Each packet uses the same route','Packets arrive in the correct order','All channel bandwidth is required','Bandwidth is wasted'])expect(switching).toContain(marker);
  });

  it('keeps all Figure 14.9 core packet-header fields while grouping them by purpose',()=>{
    expect(networkControl).toContain('function Chapter14PacketHeaderHero');
    expect(facade).toContain("if(beat.id==='h14p-142-header')return <Chapter14PacketHeaderHero reveal={reveal}/>;");
    for(const marker of ['SOURCE IP','32 bits','DESTINATION IP','HOP NUMBER','8 bits','PACKET LENGTH','16 bits','NUMBER OF PACKETS','SEQUENCE NUMBER','HEADER CHECKSUM','ROUTER','LIFETIME','DESTINATION','CHECK'])expect(networkControl).toContain(marker);
  });

  it('keeps every general packet-header field and bit length on the extended hero',()=>{
    expect(networkControl).toContain('function Chapter14PacketHeaderExtendedHero');
    expect(facade).toContain("if(beat.id==='h14p-142-header-extended')return <Chapter14PacketHeaderExtendedHero reveal={reveal}/>;");
    for(const marker of ['PROTOCOL VERSION','4 bits','HEADER LENGTH','PRIORITY','8 bits','FRAGMENT FLAGS','3 bits','FRAGMENT OFFSET','13 bits','CURRENT HOP','PACKET COUNT','SEQUENCE','TRANSPORT PROTOCOL','TCP or UDP','HEADER CHECKSUM','SOURCE IP','DESTINATION IP','DF = do not fragment','MF = more fragments follow','6 × 4 = 24 bytes'])expect(networkControl).toContain(marker);
  });

  it('renders router forwarding as header to routing-table to next-hop journey',()=>{
    expect(hero).toContain('function Chapter14RouterJourney');
    expect(facade).toContain("if(beat.id==='h14p-142-routing')return <Chapter14RouterJourney reveal={reveal}/>;");
    for(const marker of ['PACKET HEADER','Destination IP','ROUTING TABLE','NEXT HOP','Next-router MAC','READ HEADER','LOOK UP','CHOOSE','UPDATE','FORWARD','hop = 0'])expect(hero).toContain(marker);
  });

  it('renders Example 14.2 as a complete web-page packet-switching journey',()=>{
    expect(routingTransfer).toContain('function Chapter14WebPageTransferHero');
    expect(facade).toContain("if(beat.id==='h14p-142-web-page')return <Chapter14WebPageTransferHero reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-142-web-page',");
    for(const marker of ['Divide the web page into data packets','destination IP address','compare the header with the routing table','next router MAC address','hop value has reached zero','Different packets may travel by different routes','rebuilds the final web page'])expect(routingTransfer).toContain(marker);
  });

  it('turns the routing exam prompt into a visible answer-building chain',()=>{
    expect(routingTransfer).toContain('function Chapter14RoutingExamBuilder');
    expect(facade).toContain("if(beat.id==='h14p-142-exam')return <Chapter14RoutingExamBuilder reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-142-exam',");
    for(const marker of ['CAMBRIDGE-STYLE PROMPT','HEADER → TABLE → NEXT HOP → MAC → FORWARD','READ','COMPARE','SELECT','UPDATE','FORWARD','STOP / ARRIVE','Sequence number','Hop number','Checksum'])expect(routingTransfer).toContain(marker);
  });

  it('finishes with a complete communication-journey recap instead of isolated cards',()=>{
    expect(networkControl).toContain('function Chapter14RecapHero');
    expect(facade).toContain("if(beat.id==='h14p-142-recap')return <Chapter14RecapHero reveal={reveal}/>;");
    expect(facade).not.toContain("  'h14p-142-recap',");
    for(const marker of ['FROM AGREED RULES TO A RECONSTRUCTED MESSAGE','PROTOCOL','APPLICATION','TRANSPORT','INTERNET','LINK','SWITCHING','ROUTER','DESTINATION','rules → layers → headers → routes → local frames → router decisions → reassembly'])expect(networkControl).toContain(marker);
  });

  it('routes remaining explanation-heavy scenes to hand-authored visual diagrams',()=>{
    for(const id of [
      'h14p-141-hook','h14p-141-protocol-map','h14p-141-pop-imap',
      'h14p-142-hook','h14p-142-circuit-stages','h14p-142-video-example','h14p-142-hop','h14p-142-packet-control','h14p-142-routing-fields',
    ])expect(facade).toContain(`'${id}'`);
  });

  it('keeps richer source-exact specialist surfaces where they teach better than V2',()=>{
    for(const id of ['h14p-141-bittorrent-terms','h14p-142-packet-basics','h14p-142-circuit-pros-cons','h14p-142-packet-pros-cons','h14p-142-activity14a'])expect(facade).not.toContain(`  '${id}',`);
    expect(v4).toContain("if(beat.id==='h14p-141-bittorrent-terms')return <BitTorrentSwarmExact");
    expect(v4).toContain("if(beat.id==='h14p-142-packet-basics')return <ExactPacketBasics");
    expect(v4).toContain("if(beat.id==='h14p-142-circuit-pros-cons')return <ExactProsCons kind=\"circuit\"");
    expect(v4).toContain("if(beat.id==='h14p-142-packet-pros-cons')return <ExactProsCons kind=\"packet\"");
    expect(v4).toContain("if(beat.id==='h14p-142-activity14a')return <Activity14AExact");
    expect(v4).toContain("const arrival=['P1','P4','P3','P2']");
  });

  it('keeps source-exact specialist surfaces for topology and Ethernet precision',()=>{
    for(const marker of [
      "if(beat.id==='h14p-141-ethernet')return <EthernetFrameSourceComplete",
      "if(beat.id==='h14p-142-circuit-route')return <SourceNetwork mode=\"circuit\"",
      "if(beat.id==='h14p-142-packet-route')return <SourceNetwork mode=\"packet\"",
    ])expect(finalRenderer).toContain(marker);
  });

  it('retains visual teaching primitives for scenes that still use V2',()=>{
    for(const marker of ['h14c-agreement','h14c-protocol-map','h14c-popimap','h14c-switch-hook','h14c-circuit-stages','h14c-routing'])expect(v2).toContain(marker);
  });

  it('keeps benchmark-critical concepts visible on presentation surfaces',()=>{
    for(const marker of ['APPLICATION DATA','SEGMENT','DATAGRAM','FRAME','SMTP · PUSH','POP / IMAP · PULL','HOST X','HOST Y'])expect(flow).toContain(marker);
    for(const marker of ['TRACKER','SEED','piece','peer'])expect(bittorrent.toLowerCase()).toContain(marker.toLowerCase());
    for(const marker of ['destination IP','routing table','next router MAC','hop value'])expect(routingTransfer.toLowerCase()).toContain(marker.toLowerCase());
    for(const marker of ['SOURCE IP','DESTINATION IP','IEEE 802.11','HEADER CHECKSUM','reconstructed message'])expect(networkControl.toLowerCase()).toContain(marker.toLowerCase());
  });
});
