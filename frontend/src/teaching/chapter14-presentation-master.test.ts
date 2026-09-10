import { describe,expect,it } from 'vitest';
import { chapter14PresentationStoryboard } from './chapter14-presentation-storyboard';
import { CHAPTER_14_MASTER_PRINTED_PAGES,CHAPTER_14_MASTER_SOURCE_MAP,chapter14SourcePagesCovered } from './chapter14-master-source-map';
import { CHAPTER_14_MASTER_VISUAL_IDS,hasChapter14PresentationMaster } from './Chapter14PresentationMaster';

const sourceText=JSON.stringify(CHAPTER_14_MASTER_SOURCE_MAP);
const visualText=JSON.stringify(CHAPTER_14_MASTER_VISUAL_IDS);

describe('Chapter 14 PRESENTATION MASTER MODE',()=>{
  it('covers every supplied printed page 328–345 in the source contract',()=>{
    expect(chapter14SourcePagesCovered()).toEqual(CHAPTER_14_MASTER_PRINTED_PAGES);
  });

  it('locks the current authored storyboard to an explicit master renderer',()=>{
    const scenes=chapter14PresentationStoryboard('overview')!;
    expect(scenes.length).toBeGreaterThanOrEqual(42);
    for(const scene of scenes)expect(hasChapter14PresentationMaster(scene)).toBe(true);
    expect(new Set(CHAPTER_14_MASTER_VISUAL_IDS).size).toBe(CHAPTER_14_MASTER_VISUAL_IDS.length);
    expect(visualText).toContain('h14p-142-practice');
  });

  it('preserves high-risk source facts and terminology',()=>{
    for(const marker of [
      'port 80','331 Anonymous access allowed','RIP','SNMP','MIME header','synchronisation sequence bits',
      'FF:FF:FF:FF:FF:FF','802.16-2004','802.16-2005','20 × 1MiB','share ratio','12%','50%',
      'A–R2','R2–R5','R5–R8','R8–R7','R7–R10','R10–B','four packets','6 × 4 = 24bytes','DF','MF',
      'MAC address of the next router','metrics','network destination','gateway','netmask','interface',
      'no route can be found','hop number = 0','VoIP','Question 4',
    ])expect(sourceText).toContain(marker);
  });

  it('does not replace the coursebook handshake with unsupported shorthand',()=>{
    expect(sourceText).not.toContain('SYN/ACK');
    expect(sourceText).not.toContain('SYN-ACK');
  });

  it('treats end-of-chapter practice as pp. 344–345',()=>{
    expect(CHAPTER_14_MASTER_SOURCE_MAP.find(item=>item.id==='eoc')?.pages).toEqual([344,345]);
  });
});
