import { describe, expect, it } from 'vitest';
import { CHAPTER_14_MASTER_PRINTED_PAGES, CHAPTER_14_MASTER_SOURCE_MAP, chapter14SourcePagesCovered } from './chapter14-master-source-map';
import { CHAPTER_14_MASTER_VISUAL_IDS } from './Chapter14PresentationMaster';
import { chapter14PresentationStoryboard } from './chapter14-presentation-storyboard';
import facadeSource from './Chapter14PresentationVisualsV4.tsx?raw';
import projectorCss from './chapter14-presentation-master-projector.css?raw';
import navigationSource from './presentation-scroll-controller.ts?raw';

const TERMS_141=['Protocol','HTTP','Packet','Segment','FTP','SMTP','Push protocol','Binary file','MIME','POP','IMAP','TCP','Pull protocol','Host-to-host','Host','BitTorrent','Peer','Metadata','Pieces','Tracker','Swarm','Seed','Leech','Lurker'];

describe('Chapter 14 PRESENTATION MASTER quality gates',()=>{
  it('covers every supplied printed page from 328 to 345',()=>{
    expect(chapter14SourcePagesCovered()).toEqual(CHAPTER_14_MASTER_PRINTED_PAGES);
  });

  it('locks every 14.1 key term from the supplied source',()=>{
    const termItem=CHAPTER_14_MASTER_SOURCE_MAP.find(item=>item.id==='terms-141');
    expect(termItem).toBeTruthy();
    for(const term of TERMS_141)expect(termItem?.anchors).toContain(term);
  });

  it('locks Q4 and the routing/control concepts on p.345',()=>{
    const eoc=CHAPTER_14_MASTER_SOURCE_MAP.find(item=>item.id==='eoc');
    expect(eoc?.pages).toEqual([344,345]);
    for(const anchor of ['Question 4','dedicated circuit/path','bandwidth is shared','hop number/hopping','checksum','headers and routing tables'])expect(eoc?.anchors).toContain(anchor);
  });

  it('has a unique authored projector visual for every Chapter 14 storyboard scene',()=>{
    const scenes=[...(chapter14PresentationStoryboard('14.1')??[]),...(chapter14PresentationStoryboard('14.2')??[])];
    expect(CHAPTER_14_MASTER_VISUAL_IDS).toHaveLength(scenes.length);
    expect(new Set(CHAPTER_14_MASTER_VISUAL_IDS).size).toBe(CHAPTER_14_MASTER_VISUAL_IDS.length);
    for(const scene of scenes)expect(CHAPTER_14_MASTER_VISUAL_IDS).toContain(scene.id as typeof CHAPTER_14_MASTER_VISUAL_IDS[number]);
  });

  it('uses the dedicated four-group EOC master instead of the legacy supplemental patch',()=>{
    expect(facadeSource).toContain("Chapter14EndOfChapterMaster");
    expect(facadeSource).toContain("beat.id==='h14p-142-practice'");
    expect(facadeSource).not.toContain('Chapter14PresentationVisualV6');
    expect(facadeSource).not.toContain('Chapter14PresentationCompleteness');
    expect(facadeSource).not.toContain('Chapter14PracticeQ4');
  });

  it('keeps projector stage scroll-safe and controls above presentation content',()=>{
    expect(projectorCss).toContain('.lx-present-stage{min-height:0;overflow:auto');
    expect(projectorCss).toContain('.lx-present-nav{position:relative;z-index:40}');
    expect(projectorCss).toContain('@media (max-height:768px)');
    expect(projectorCss).toContain('@media (prefers-reduced-motion:reduce)');
  });

  it('does not capture ArrowLeft/ArrowRight or footer clicks in the scroll controller',()=>{
    expect(navigationSource).not.toContain("event.key==='ArrowRight'");
    expect(navigationSource).not.toContain("event.key==='ArrowLeft'");
    expect(navigationSource).not.toContain(".lx-present-nav button");
    expect(navigationSource).toContain("event.key==='PageDown'");
    expect(navigationSource).toContain("event.key==='PageUp'");
  });
});
