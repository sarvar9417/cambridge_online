import type { ComponentType } from 'react';
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
import { Chapter14ApplicationProtocolHero, Chapter14FtpHero, Chapter14PopImapHero } from './Chapter14ApplicationHeroes';
import { Chapter14OrientationHero } from './Chapter14OrientationHero';
import { hasChapter14PresentationRuntime } from './chapter14-presentation-runtime';

type RevealHero=ComponentType<{reveal:number}>;

/** One authoritative mapping from runtime scene ID to its hand-authored teaching visual. */
export const CHAPTER_14_HERO_RENDERERS:Readonly<Record<string,RevealHero>>={
  'h14p-141-objectives':Chapter14OrientationHero,
  'h14p-141-stack':Chapter14TcpIpJourney,
  'h14p-141-units':Chapter14EncapsulationHero,
  'h14p-141-protocol-map':Chapter14ApplicationProtocolHero,
  'h14p-141-ftp-detail':Chapter14FtpHero,
  'h14p-141-http':Chapter14HttpJourney,
  'h14p-141-email':Chapter14EmailSourceComplete,
  'h14p-141-email-mechanics':Chapter14EmailMechanicsHero,
  'h14p-141-pop-imap':Chapter14PopImapHero,
  'h14p-141-transport-family':Chapter14TransportReliabilityHero,
  'h14p-141-tcp':Chapter14TcpHandshakeHero,
  'h14p-141-ip-link':Chapter14IpLinkHero,
  'h14p-141-wireless':Chapter14WirelessHero,
  'h14p-141-bittorrent':Chapter14BitTorrentHero,
  'h14p-142-compare':Chapter14SwitchingCompareHero,
  'h14p-142-hop':Chapter14HopHero,
  'h14p-142-packet-control':Chapter14PacketControlHero,
  'h14p-142-header':Chapter14PacketHeaderHero,
  'h14p-142-header-extended':Chapter14PacketHeaderExtendedHero,
  'h14p-142-routing-fields':Chapter14RoutingTableHero,
  'h14p-142-routing':Chapter14RouterJourney,
  'h14p-142-video-example':Chapter14VideoConferenceHero,
  'h14p-142-web-page':Chapter14WebPageTransferHero,
  'h14p-142-exam':Chapter14RoutingExamBuilder,
  'h14p-142-recap':Chapter14RecapHero,
};

/** Existing V2 surfaces that are already clearer than later audit composites. */
export const CHAPTER_14_V2_VISUAL_SCENES=new Set([
  'h14p-141-hook',
  'h14p-141-protocol',
  'h14p-141-ethernet-detail',
  'h14p-142-hook',
  'h14p-142-objectives',
  'h14p-142-circuit-stages',
]);

export function Chapter14PresentationHero({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  const Hero=CHAPTER_14_HERO_RENDERERS[beat.id];
  if(Hero)return <Hero reveal={reveal}/>;
  if(CHAPTER_14_V2_VISUAL_SCENES.has(beat.id))return <Chapter14PresentationContentV2 beat={beat} reveal={reveal}/>;
  if(beat.id==='h14p-142-practice')return <Chapter14EndOfChapterMaster beat={beat} reveal={reveal}/>;
  if(hasChapter14PresentationRuntime(beat))return <Chapter14PresentationContentFinal beat={beat} reveal={reveal}/>;
  return null;
}
