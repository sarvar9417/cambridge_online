import type { LessonPresentationBeat } from './lesson-experience-model';

/**
 * Runtime contract for the source-complete Chapter 14 projector deck.
 * Counts are visual teaching beats, not raw storyboard array lengths. Keeping
 * this explicit prevents dead Space presses when a custom renderer groups or
 * expands source material differently from the generic rich-block metadata.
 */
export const CHAPTER_14_PRESENTATION_REVEAL_COUNTS:Readonly<Record<string,number>>={
  'h14p-141-hook':0,
  'h14p-141-objectives':0,
  'h14p-141-protocol':0,
  'h14p-141-stack':4,
  'h14p-141-units':4,
  'h14p-141-protocol-map':0,
  'h14p-141-ftp-detail':4,
  'h14p-141-http':6,
  'h14p-141-email':6,
  'h14p-141-email-mechanics':4,
  'h14p-141-pop-imap':3,
  'h14p-141-transport-family':4,
  'h14p-141-tcp':4,
  'h14p-141-ip-link':0,
  'h14p-141-ethernet':5,
  'h14p-141-ethernet-detail':4,
  'h14p-141-wireless':3,
  'h14p-141-bittorrent':5,
  'h14p-141-bittorrent-terms':5,
  'h14p-141-check':6,
  'h14p-142-hook':0,
  'h14p-142-objectives':3,
  'h14p-142-circuit-stages':3,
  'h14p-142-circuit-route':1,
  'h14p-142-circuit-failure':1,
  'h14p-142-packet-basics':5,
  'h14p-142-packet-route':4,
  'h14p-142-compare':0,
  'h14p-142-circuit-pros-cons':6,
  'h14p-142-packet-pros-cons':6,
  'h14p-142-video-example':4,
  'h14p-142-hop':5,
  'h14p-142-packet-control':3,
  'h14p-142-header':4,
  'h14p-142-header-extended':5,
  'h14p-142-routing':4,
  'h14p-142-routing-fields':4,
  'h14p-142-web-page':7,
  'h14p-142-exam':1,
  'h14p-142-activity14a':5,
  'h14p-142-practice':4,
  'h14p-142-recap':4,
  'h14p-142-recap-routing':6,
};

const runtimeIds=new Set(Object.keys(CHAPTER_14_PRESENTATION_REVEAL_COUNTS));

export function hasChapter14PresentationRuntime(beat:LessonPresentationBeat){
  return runtimeIds.has(beat.id);
}

/** null means this is not a Chapter 14 runtime-owned scene. */
export function chapter14PresentationRevealCount(beat:LessonPresentationBeat):number|null{
  return runtimeIds.has(beat.id)?CHAPTER_14_PRESENTATION_REVEAL_COUNTS[beat.id]:null;
}
