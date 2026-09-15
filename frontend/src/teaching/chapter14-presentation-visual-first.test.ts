import { describe, expect, it } from 'vitest';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import registry from './Chapter14PresentationHeroRegistry.tsx?raw';
import primitives from './Chapter14VisualPrimitives.ts?raw';
import orientation from './Chapter14OrientationHero.tsx?raw';
import hero from './Chapter14HeroVisuals.tsx?raw';
import flow from './Chapter14FlowHeroes.tsx?raw';
import routingTransfer from './Chapter14RoutingTransferHero.tsx?raw';
import networkControl from './Chapter14NetworkControlHeroes.tsx?raw';
import routingTable from './Chapter14RoutingTableHero.tsx?raw';
import packetControl from './Chapter14PacketControlHero.tsx?raw';
import bittorrent from './Chapter14BitTorrentHero.tsx?raw';
import switching from './Chapter14SwitchingCompareHero.tsx?raw';
import v4 from './Chapter14PresentationContentV4.tsx?raw';

describe('Chapter 14 final visual-first presentation contract',()=>{
  it('delegates Chapter 14 rendering to one registry instead of a long facade chain',()=>{
    expect(facade).toContain("import { Chapter14PresentationHero } from './Chapter14PresentationHeroRegistry'");
    expect(facade).toContain('if(hasChapter14PresentationRuntime(beat))return <Chapter14PresentationHero beat={beat} reveal={reveal}/>;');
    expect(facade).not.toContain("if(beat.id==='h14p-141-stack')");
    expect(registry).toContain('CHAPTER_14_HERO_RENDERERS');
    expect(registry).toContain('CHAPTER_14_V2_VISUAL_SCENES');
  });

  it('keeps future reveal structure faintly visible while the current step is emphasised',()=>{
    expect(primitives).toContain("opacity:visible?1:.28");
    expect(primitives).toContain("visibility:'visible'");
    expect(primitives).toContain("transform:'none'");
    expect(primitives).not.toContain("visibility:visible?'visible':'hidden'");
  });

  it('adds a chapter road map without inventing syllabus content',()=>{
    expect(registry).toContain("'h14p-141-objectives':Chapter14OrientationHero");
    for(const marker of ['LEARNING OUTCOMES','ROAD MAP','PROTOCOLS','TCP/IP','APPLICATION','BITTORRENT','SWITCHING','ROUTERS'])expect(orientation).toContain(marker);
  });

  it('renders the TCP/IP stack as a large device-to-device journey and labels the memory aid',()=>{
    expect(registry).toContain("'h14p-141-stack':Chapter14TcpIpJourney");
    for(const marker of ['SENDER','SEND · 4 → 1','APPLICATION','TRANSPORT','INTERNET','LINK','RECEIVE · 1 → 4','RECEIVER','decomposition','APP → PORT → IP → MAC','Memory aid only'])expect(hero).toContain(marker);
  });

  it('keeps layer-specific data-unit terminology consistent',()=>{
    for(const marker of ['APPLICATION DATA','SEGMENT','DATAGRAM','FRAME','TCP HEADER','IP HEADER','LINK HEADER','FRAME CHECK'])expect(flow).toContain(marker);
    expect(hero).toContain('TCP segment');
    expect(hero).not.toContain('TCP packet {i+1}');
    expect(flow).toContain('transport layer breaks data into <b');
    expect(flow).toContain('segments');
    expect(networkControl).toContain('SEGMENT + IP HEADER = DATAGRAM');
  });

  it('teaches HTTP as a diagram first and readable source-sequence recap second',()=>{
    expect(registry).toContain("'h14p-141-http':Chapter14HttpJourney");
    expect(hero).toContain('if(reveal>=7)');
    for(const marker of ['BROWSER','HTTP(S)','TCP SEGMENTS','PORT 80','DNS','IP / INTERNET ROUTING','WEB SERVER','HTML RESPONSE','COURSEBOOK REQUEST SEQUENCE','not intended as a full real-world timing model'])expect(hero).toContain(marker);
  });

  it('separates SMTP push, MIME attachments and POP/IMAP pull',()=>{
    expect(registry).toContain("'h14p-141-email-mechanics':Chapter14EmailMechanicsHero");
    for(const marker of ['SMTP · PUSH','MIME · ATTACHMENTS','MIME HEADER','POP / IMAP · PULL','SMTP is still used between email servers'])expect(flow).toContain(marker);
  });

  it('teaches transport reliability and the TCP handshake with staged emphasis',()=>{
    expect(registry).toContain("'h14p-141-transport-family':Chapter14TransportReliabilityHero");
    expect(registry).toContain("'h14p-141-tcp':Chapter14TcpHandshakeHero");
    for(const marker of ['S1','S2','S3','S4','NO POSITIVE ACK FOR S3','RE-SEND S3','PAR','TCP · UDP · SCTP','HOST X','HOST Y','connection-oriented and host-to-host'])expect(flow).toContain(marker);
  });

  it('makes the Internet-to-Link handoff explicit as segment to datagram to frame',()=>{
    expect(registry).toContain("'h14p-141-ip-link':Chapter14IpLinkHero");
    for(const marker of ['FROM TRANSPORT','SEGMENT','SOURCE IP','DESTINATION IP','SEGMENT + IP HEADER = DATAGRAM','IP → MAC','LINK HEADER + IP DATAGRAM + CHECK = FRAME','Ethernet is local'])expect(networkControl).toContain(marker);
  });

  it('keeps the wireless explanation inside the coursebook-supported sequence',()=>{
    expect(registry).toContain("'h14p-141-wireless':Chapter14WirelessHero");
    for(const marker of ['Wi-Fi · IEEE 802.11','CSMA/CA + DCF','SENSE CHANNEL','DCF DECISION','WAIT FOR ACK','NO ACK?','Coursebook sequence','BLUETOOTH','IEEE 802.15','WiMAX','IEEE 802.16'])expect(networkControl).toContain(marker);
    expect(networkControl).not.toContain('wireless Ethernet cannot detect a collision while transmitting');
  });

  it('renders BitTorrent as tracker discovery plus direct peer-piece sharing',()=>{
    expect(registry).toContain("'h14p-141-bittorrent':Chapter14BitTorrentHero");
    for(const marker of ['ORIGINAL PEER','FILE SPLIT INTO PIECES','TRACKER','connected peer details','IP addresses','PEER-TO-PEER','SEED + REASSEMBLY','not the shared file store','DASHED LINKS','SOLID ARROWS'])expect(bittorrent).toContain(marker);
  });

  it('uses the exact six Table 14.5 circuit-versus-packet rows',()=>{
    expect(registry).toContain("'h14p-142-compare':Chapter14SwitchingCompareHero");
    for(const marker of ['Route set up before transmission','Dedicated transmission path','Each packet uses the same route','Packets arrive in the correct order','All channel bandwidth is required','Bandwidth is wasted'])expect(switching).toContain(marker);
  });

  it('teaches packet lifetime, error checking and priority controls',()=>{
    expect(registry).toContain("'h14p-142-hop':Chapter14HopHero");
    expect(registry).toContain("'h14p-142-packet-control':Chapter14PacketControlHero");
    for(const marker of ['HOP = 4','DELETE PACKET','hop number = 0','CHECKSUM / PARITY','PRIORITY','packet queue'])expect(packetControl).toContain(marker);
  });

  it('keeps source packet-header and routing-table detail visible',()=>{
    expect(registry).toContain("'h14p-142-header':Chapter14PacketHeaderHero");
    expect(registry).toContain("'h14p-142-header-extended':Chapter14PacketHeaderExtendedHero");
    expect(registry).toContain("'h14p-142-routing-fields':Chapter14RoutingTableHero");
    for(const marker of ['SOURCE IP','DESTINATION IP','HOP NUMBER','PACKET LENGTH','NUMBER OF PACKETS','SEQUENCE NUMBER','HEADER CHECKSUM','FRAGMENT FLAGS','FRAGMENT OFFSET','TRANSPORT PROTOCOL'])expect(networkControl).toContain(marker);
    for(const marker of ['NUMBER OF HOPS','NEXT ROUTER MAC','METRICS / COST','NETWORK DESTINATION','GATEWAY','NETMASK','INTERFACE','HEADER → TABLE → NEXT HOP'])expect(routingTable).toContain(marker);
  });

  it('renders router forwarding, Example 14.1 and Example 14.2 as visual journeys',()=>{
    expect(registry).toContain("'h14p-142-routing':Chapter14RouterJourney");
    expect(registry).toContain("'h14p-142-video-example':Chapter14VideoConferenceHero");
    expect(registry).toContain("'h14p-142-web-page':Chapter14WebPageTransferHero");
    for(const marker of ['PACKET HEADER','ROUTING TABLE','NEXT HOP','Next-router MAC','READ HEADER','LOOK UP','CHOOSE','UPDATE','FORWARD'])expect(hero).toContain(marker);
    for(const marker of ['OUT OF SYNC','PAUSES / FREEZES','DEGRADED QUALITY','DROP-OUT','ONE ROUTE','CORRECT ORDER','DEDICATED CHANNEL','FULL BANDWIDTH'])expect(routingTable).toContain(marker);
    for(const marker of ['Divide the web page into data packets','destination IP address','routing table','next router MAC address','hop value has reached zero','Different packets may travel by different routes','rebuilds the final web page'])expect(routingTransfer).toContain(marker);
  });

  it('keeps the routing exam builder and final recap exam-ready',()=>{
    expect(registry).toContain("'h14p-142-exam':Chapter14RoutingExamBuilder");
    expect(registry).toContain("'h14p-142-recap':Chapter14RecapHero");
    for(const marker of ['CAMBRIDGE-STYLE PROMPT','HEADER → TABLE → NEXT HOP → MAC → FORWARD','READ','COMPARE','SELECT','UPDATE','FORWARD','STOP / ARRIVE'])expect(routingTransfer).toContain(marker);
    for(const marker of ['FROM AGREED RULES TO A RECONSTRUCTED MESSAGE','PROTOCOL','APPLICATION','TRANSPORT','INTERNET','LINK','SWITCHING','ROUTER','DESTINATION'])expect(networkControl).toContain(marker);
  });

  it('preserves richer source-exact specialist surfaces where they are still stronger',()=>{
    for(const id of ['h14p-141-bittorrent-terms','h14p-142-packet-basics','h14p-142-circuit-pros-cons','h14p-142-packet-pros-cons','h14p-142-activity14a'])expect(registry).not.toContain(`'${id}':`);
    expect(v4).toContain("if(beat.id==='h14p-141-bittorrent-terms')return <BitTorrentSwarmExact");
    expect(v4).toContain("if(beat.id==='h14p-142-packet-basics')return <ExactPacketBasics");
    expect(v4).toContain("if(beat.id==='h14p-142-circuit-pros-cons')return <ExactProsCons kind=\"circuit\"");
    expect(v4).toContain("if(beat.id==='h14p-142-packet-pros-cons')return <ExactProsCons kind=\"packet\"");
  });
});
