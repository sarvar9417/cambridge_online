import type { LessonPresentationBeat } from './lesson-experience-model';
import { Chapter14PresentationContentFinal } from './Chapter14PresentationContentFinal';
import { Chapter14PresentationContentV2 } from './Chapter14PresentationContentV2';
import { Chapter14EndOfChapterMaster } from './Chapter14EndOfChapterMaster';
import { Chapter14EmailSourceComplete } from './Chapter14EmailSourceComplete';
import { Chapter14HttpJourney, Chapter14RouterJourney, Chapter14TcpIpJourney } from './Chapter14HeroVisuals';
import { Chapter14BitTorrentHero } from './Chapter14BitTorrentHero';
import { Chapter14SwitchingCompareHero } from './Chapter14SwitchingCompareHero';
import { Chapter14EmailMechanicsHero, Chapter14EncapsulationHero, Chapter14TcpHandshakeHero, Chapter14TransportReliabilityHero } from './Chapter14FlowHeroes';
import { Chapter14RoutingExamBuilder, Chapter14WebPageTransferHero } from './Chapter14RoutingTransferHero';
import { Chapter14IpLinkHero, Chapter14PacketHeaderExtendedHero, Chapter14PacketHeaderHero, Chapter14RecapHero, Chapter14WirelessHero } from './Chapter14NetworkControlHeroes';
import { Chapter14RoutingTableHero, Chapter14VideoConferenceHero } from './Chapter14RoutingTableHero';
import { Chapter14HopHero, Chapter14PacketControlHero } from './Chapter14PacketControlHero';
import { hasChapter14PresentationRuntime } from './chapter14-presentation-runtime';
import { Chapter13PresentationVisual, hasChapter13PresentationVisual } from './Chapter13PresentationVisuals';
import { Chapter7PresentationVisual, hasChapter7PresentationVisual } from './Chapter7PresentationVisuals';
import { Chapter5OperatingSystemVisual, hasChapter5OperatingSystemVisual } from './Chapter5OperatingSystemVisuals';
import { Chapter4InstructionsBitVisual, hasChapter4InstructionsBitVisual } from './Chapter4InstructionsBitVisuals';
import { Chapter4FetchAssemblyVisual, hasChapter4FetchAssemblyVisual } from './Chapter4FetchAssemblyVisuals';
import { Chapter4ProcessorVisual, hasChapter4ProcessorVisual } from './Chapter4ProcessorVisuals';
import { Chapter3LogicVisual, hasChapter3LogicVisual } from './Chapter3LogicVisuals';
import { Chapter3SensorVisual, hasChapter3SensorVisual } from './Chapter3SensorVisuals';
import { Chapter3DeviceVisual, hasChapter3DeviceVisual } from './Chapter3DeviceVisuals';
import { Chapter3PresentationVisual, hasChapter3PresentationVisual } from './Chapter3PresentationVisuals';
import { Chapter2PresentationVisual, hasChapter2PresentationVisual } from './Chapter2PresentationVisuals';
import { Chapter2InternetVisual, hasChapter2InternetVisual } from './Chapter2InternetVisuals';
import { Chapter2DeviceVisual, hasChapter2DeviceVisual } from './Chapter2DeviceVisuals';
import { Chapter2ActivityVisual, hasChapter2ActivityVisual } from './Chapter2ActivityVisuals';
import { Chapter2AddressingVisual, hasChapter2AddressingVisual } from './Chapter2AddressingVisuals';
import { Chapter2DnsVisual, hasChapter2DnsVisual } from './Chapter2DnsVisuals';
import { Chapter1PresentationVisual, hasChapter1PresentationVisual } from './Chapter1PresentationVisuals';
import './chapter14-presentation-master.css';
import './chapter14-presentation-content-v2.css';
import './chapter14-presentation-content-v2-eoc.css';
import './chapter14-presentation-master-projector.css';
import './chapter14-presentation-density-master.css';
import './chapter14-presentation-source-complete.css';
import './chapter14-presentation-deep-audit.css';
import './chapter14-presentation-deep-network.css';
import './chapter14-presentation-deep-content.css';
import './chapter14-presentation-final-source.css';
import './chapter14-email-source-complete.css';
import './chapter13-presentation-hardening.css';

/**
 * These Chapter 14 scenes already have hand-authored visual teaching surfaces in V2.
 * Route them directly instead of wrapping them in later source-audit composites. The
 * detailed source renderers remain in the repository for audit/study fidelity, while
 * projector mode follows one consistent dark-blue visual language: process, topology,
 * lifeline, comparison, bitfield and retrieval.
 *
 * Deliberate specialist exceptions stay out of this set:
 * - TCP/IP, encapsulation, HTTP, email mechanics, transport/PAR, TCP handshake,
 *   IP/link, wireless, packet headers, hop/control, routing-table, video-conference
 *   example, BitTorrent process, switching comparison, router decision, Example 14.2
 *   web transfer, routing exam-builder and final recap use benchmark-style hero visuals.
 * - Packet-order basics, switching pros/cons, BitTorrent terminology and Activity 14A
 *   use richer source-exact V4 surfaces.
 */
const CHAPTER_14_VISUAL_FIRST_SCENES=new Set([
  'h14p-141-hook',
  'h14p-141-objectives',
  'h14p-141-protocol',
  'h14p-141-protocol-map',
  'h14p-141-ftp-detail',
  'h14p-141-pop-imap',
  'h14p-141-ethernet-detail',
  'h14p-142-hook',
  'h14p-142-objectives',
  'h14p-142-circuit-stages',
]);

/** Stable presentation facade shared by source-grounded chapter scenes. */
export function hasChapter14PresentationVisualV4(beat:LessonPresentationBeat){
  return hasChapter14PresentationRuntime(beat)||hasChapter13PresentationVisual(beat)||hasChapter7PresentationVisual(beat)||hasChapter5OperatingSystemVisual(beat)||hasChapter4InstructionsBitVisual(beat)||hasChapter4FetchAssemblyVisual(beat)||hasChapter4ProcessorVisual(beat)||hasChapter3LogicVisual(beat)||hasChapter3SensorVisual(beat)||hasChapter3DeviceVisual(beat)||hasChapter3PresentationVisual(beat)||hasChapter2DnsVisual(beat)||hasChapter2AddressingVisual(beat)||hasChapter2ActivityVisual(beat)||hasChapter2InternetVisual(beat)||hasChapter2DeviceVisual(beat)||hasChapter2PresentationVisual(beat)||hasChapter1PresentationVisual(beat);
}

/**
 * Chapter 14, Chapter 1 and Chapter 13 render the beat payload inside their
 * specialised visual surface. The Chapter 2/3/4 systems are deliberately
 * diagram-only: their source text/table/steps must therefore remain visible
 * beside the visual instead of being suppressed by the generic presenter.
 */
export function presentationVisualOwnsBeatContent(beat:LessonPresentationBeat){
  return hasChapter14PresentationRuntime(beat)||hasChapter1PresentationVisual(beat)||hasChapter13PresentationVisual(beat);
}

export function Chapter14PresentationVisualV4({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  if(hasChapter1PresentationVisual(beat))return <Chapter1PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2DnsVisual(beat))return <Chapter2DnsVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2AddressingVisual(beat))return <Chapter2AddressingVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2ActivityVisual(beat))return <Chapter2ActivityVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2InternetVisual(beat))return <Chapter2InternetVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2DeviceVisual(beat))return <Chapter2DeviceVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2PresentationVisual(beat))return <Chapter2PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter3LogicVisual(beat))return <Chapter3LogicVisual beat={beat} reveal={reveal}/>;
  if(hasChapter3SensorVisual(beat))return <Chapter3SensorVisual beat={beat} reveal={reveal}/>;
  if(hasChapter3DeviceVisual(beat))return <Chapter3DeviceVisual beat={beat} reveal={reveal}/>;
  if(hasChapter3PresentationVisual(beat))return <Chapter3PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter4InstructionsBitVisual(beat))return <Chapter4InstructionsBitVisual beat={beat} reveal={reveal}/>;
  if(hasChapter4FetchAssemblyVisual(beat))return <Chapter4FetchAssemblyVisual beat={beat} reveal={reveal}/>;
  if(hasChapter4ProcessorVisual(beat))return <Chapter4ProcessorVisual beat={beat} reveal={reveal}/>;
  if(hasChapter5OperatingSystemVisual(beat))return <Chapter5OperatingSystemVisual beat={beat} reveal={reveal}/>;
  if(hasChapter7PresentationVisual(beat))return <Chapter7PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter13PresentationVisual(beat))return <Chapter13PresentationVisual beat={beat} reveal={reveal}/>;
  if(beat.id==='h14p-141-stack')return <Chapter14TcpIpJourney reveal={reveal}/>;
  if(beat.id==='h14p-141-units')return <Chapter14EncapsulationHero reveal={reveal}/>;
  if(beat.id==='h14p-141-http')return <Chapter14HttpJourney reveal={reveal}/>;
  if(beat.id==='h14p-141-email')return <Chapter14EmailSourceComplete reveal={reveal}/>;
  if(beat.id==='h14p-141-email-mechanics')return <Chapter14EmailMechanicsHero reveal={reveal}/>;
  if(beat.id==='h14p-141-transport-family')return <Chapter14TransportReliabilityHero reveal={reveal}/>;
  if(beat.id==='h14p-141-tcp')return <Chapter14TcpHandshakeHero reveal={reveal}/>;
  if(beat.id==='h14p-141-ip-link')return <Chapter14IpLinkHero reveal={reveal}/>;
  if(beat.id==='h14p-141-wireless')return <Chapter14WirelessHero reveal={reveal}/>;
  if(beat.id==='h14p-141-bittorrent')return <Chapter14BitTorrentHero reveal={reveal}/>;
  if(beat.id==='h14p-142-compare')return <Chapter14SwitchingCompareHero reveal={reveal}/>;
  if(beat.id==='h14p-142-hop')return <Chapter14HopHero reveal={reveal}/>;
  if(beat.id==='h14p-142-packet-control')return <Chapter14PacketControlHero reveal={reveal}/>;
  if(beat.id==='h14p-142-header')return <Chapter14PacketHeaderHero reveal={reveal}/>;
  if(beat.id==='h14p-142-header-extended')return <Chapter14PacketHeaderExtendedHero reveal={reveal}/>;
  if(beat.id==='h14p-142-routing-fields')return <Chapter14RoutingTableHero reveal={reveal}/>;
  if(beat.id==='h14p-142-routing')return <Chapter14RouterJourney reveal={reveal}/>;
  if(beat.id==='h14p-142-video-example')return <Chapter14VideoConferenceHero reveal={reveal}/>;
  if(beat.id==='h14p-142-web-page')return <Chapter14WebPageTransferHero reveal={reveal}/>;
  if(beat.id==='h14p-142-exam')return <Chapter14RoutingExamBuilder reveal={reveal}/>;
  if(beat.id==='h14p-142-recap')return <Chapter14RecapHero reveal={reveal}/>;
  if(CHAPTER_14_VISUAL_FIRST_SCENES.has(beat.id))return <Chapter14PresentationContentV2 beat={beat} reveal={reveal}/>;
  if(beat.id==='h14p-142-practice')return <Chapter14EndOfChapterMaster beat={beat} reveal={reveal}/>;
  if(hasChapter14PresentationRuntime(beat))return <Chapter14PresentationContentFinal beat={beat} reveal={reveal}/>;
  return null;
}
