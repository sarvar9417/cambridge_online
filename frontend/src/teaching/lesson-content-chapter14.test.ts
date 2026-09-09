import { describe, expect, it } from 'vitest';
import { CHAPTER_14 } from './lesson-content-chapter14';
import { lessonChapter } from './lesson-content-source-complete';
import { buildTopicPlan } from './lesson-topic-plan';

const text = JSON.stringify(CHAPTER_14);
const figureTitles = CHAPTER_14.slides.flatMap(slide =>
  (slide.richBlocks ?? []).flatMap(block => block.kind === 'figure' ? [block.figure.title] : []),
);
const representedPages = [...new Set(CHAPTER_14.slides.flatMap(slide => slide.sourcePages ?? []))].sort((a,b)=>a-b);

describe('Chapter 14 communication and internet technologies', () => {
  it('is exposed through the active Lessons chapter library', () => {
    expect(lessonChapter(14)?.number).toBe(14);
    expect(lessonChapter(14)?.title).toBe('Communication and internet technologies');
  });

  it('represents every supplied printed source page from 328 to 345', () => {
    expect(representedPages).toEqual(Array.from({ length: 18 }, (_, index) => 328 + index));
    expect(CHAPTER_14.coverage).toContain('18/18 supplied source pages represented');
  });

  it('keeps both source sections in the lesson navigation model', () => {
    expect(CHAPTER_14.subtopics).toEqual([
      '14.1 Protocols',
      '14.2 Circuit switching and packet switching',
    ]);
    expect(CHAPTER_14.slides.some(slide=>slide.subtopicCode==='14.1')).toBe(true);
    expect(CHAPTER_14.slides.some(slide=>slide.subtopicCode==='14.2')).toBe(true);
  });

  it('keeps Chapter 14 as a true slide-by-slide presentation route', () => {
    const topics=buildTopicPlan(CHAPTER_14.slides,CHAPTER_14.subtopics);
    for(const topic of topics.filter(item=>item.code==='14.1'||item.code==='14.2')){
      expect(topic.pages.length,topic.code).toBeGreaterThan(1);
      for(const page of topic.pages){
        expect(page.slides.length,`${topic.code}:${page.title}`).toBe(1);
      }
    }
    const firstProtocolPage=topics.find(item=>item.code==='14.1')?.pages[0];
    expect(firstProtocolPage?.bookPage).toBe(2);
    expect(firstProtocolPage?.bookPages).toEqual([2]);
  });

  it('covers the complete protocol and switching keyword set', () => {
    for (const term of [
      'Protocol','HTTP','Packet','Segment','FTP','SMTP','Push protocol','Binary file','MIME','POP','IMAP','TCP',
      'Pull protocol','Host-to-host','Host','BitTorrent','Peer','Metadata','Pieces','Tracker','Swarm','Seed','Leech','Lurker',
      'Circuit switching','Packet switching','Hop number / hopping','Header (data packet)','Routing table',
    ]) expect(text, `Missing Chapter 14 term: ${term}`).toContain(term);
  });

  it('contains all ten reconstructed source figures plus tables and worked examples', () => {
    for (let number=1; number<=10; number+=1) {
      expect(text, `Missing Figure 14.${number}`).toContain(`Figure 14.${number}`);
    }
    for (let number=1; number<=5; number+=1) {
      expect(text, `Missing Table 14.${number}`).toContain(`Table 14.${number}`);
    }
    expect(text).toContain('Example 14.1');
    expect(text).toContain('Example 14.2');
    expect(text).toContain('Activity 14A');
    expect(text).toContain('End of chapter questions');
  });

  it('contains board-readable visual models for the high-value processes', () => {
    expect(figureTitles).toEqual(expect.arrayContaining([
      'Figure 14.1 reconstructed · sending',
      'Figure 14.2 reconstructed · fetching a web page',
      'TCP handshake reconstructed',
      'Figure 14.5 reconstructed · typical Ethernet frame',
      'BitTorrent file-sharing process',
      'Figure 14.8 reconstructed · packet switching',
      'Figure 14.9 reconstructed · main header fields',
      'Figure 14.10 reconstructed · router forwarding',
    ]));
  });
});
