import { describe, expect, it } from 'vitest';
import { CHAPTER_14_FINAL } from './lesson-content-chapter14-checkpoints';
import { lessonChapter } from './lesson-content-source-complete';
import { LESSON_EXPERIENCE_CHAPTERS, presentationBeatsForTopic } from './lesson-experience-model';
import { buildTopicPlan } from './lesson-topic-plan';
import { rawPdfEmphasisForChapter } from './raw-pdf-emphasis-baseline';
import { CHAPTER_14_SOURCE_FILE_MANIFEST } from './source-file-fidelity-manifest';

const chapter = CHAPTER_14_FINAL;
const text = JSON.stringify(chapter);
const figureTitles = chapter.slides.flatMap(slide =>
  (slide.richBlocks ?? []).flatMap(block => block.kind === 'figure' ? [block.figure.title] : []),
);
const representedPages = [...new Set(chapter.slides.flatMap(slide => slide.sourcePages ?? []))].sort((a,b)=>a-b);
const normalise = (value:string) => value.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();

describe('Chapter 14 communication and internet technologies', () => {
  it('classifies the chapter as A Level content', () => {
    expect(chapter.level).toBe('A Level');
  });

  it('is exposed through the active Lessons chapter library', () => {
    expect(lessonChapter(14)?.number).toBe(14);
    expect(lessonChapter(14)?.title).toBe('Communication and internet technologies');
  });

  it('represents every supplied printed source page from 328 to 345', () => {
    expect(representedPages).toEqual(Array.from({ length: 18 }, (_, index) => 328 + index));
    expect(chapter.coverage).toContain('18/18 supplied source pages represented');
    expect(chapter.coverage).toContain('18/18 page fingerprints');
    expect(CHAPTER_14_SOURCE_FILE_MANIFEST.pages.map(page=>page.printedPage)).toEqual(representedPages);
    for(const page of CHAPTER_14_SOURCE_FILE_MANIFEST.pages){
      expect(text,`Missing p.${page.printedPage} fingerprint`).toContain(`SOURCE FILE PAGE ${page.printedPage} · sha256:${page.sha256}`);
    }
  });

  it('keeps both source sections in the lesson navigation model', () => {
    expect(chapter.subtopics).toEqual([
      '14.1 Protocols',
      '14.2 Circuit switching and packet switching',
    ]);
    expect(chapter.slides.some(slide=>slide.subtopicCode==='14.1')).toBe(true);
    expect(chapter.slides.some(slide=>slide.subtopicCode==='14.2')).toBe(true);
  });

  it('keeps Chapter 14 study content slide-by-slide and ends each topic with Past Paper practice', () => {
    const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
    for(const topic of topics.filter(item=>item.code==='14.1'||item.code==='14.2')){
      expect(topic.pages.length,topic.code).toBeGreaterThan(1);
      const studyPages=topic.pages.filter(page=>page.kind==='study');
      for(const page of studyPages){
        expect(page.slides.length,`${topic.code}:${page.title}`).toBe(1);
      }
      expect(topic.pages.at(-1)?.kind,`${topic.code} final page`).toBe('practice');
      expect(topic.pages.at(-1)?.title,`${topic.code} final page title`).toBe('Past Paper practice');
    }
    const firstProtocolPage=topics.find(item=>item.code==='14.1')?.pages[0];
    expect(firstProtocolPage?.bookPage).toBe(2);
    expect(firstProtocolPage?.bookPages).toEqual([2]);
  });

  it('targets the current 2026–2028 Cambridge objectives without loose substitutions', () => {
    const protocol=chapter.slides.find(slide=>slide.id==='h14-cp-protocols');
    const switching=chapter.slides.find(slide=>slide.id==='h14-cp-switching');

    expect(protocol?.examPractice).toBe(true);
    expect(protocol?.learningObjectiveCodes).toEqual(['14.1.1','14.1.2','14.1.3','14.1.4']);
    expect(protocol?.checkpointYearFrom).toBe(2021);
    expect(protocol?.checkpointYearTo).toBe(2026);
    expect(switching?.examPractice).toBe(true);
    expect(switching?.learningObjectiveCodes).toEqual(['14.2.1','14.2.2','14.2.3']);
    expect(switching?.checkpointYearFrom).toBe(2021);
    expect(switching?.checkpointYearTo).toBe(2026);
  });

  it('covers the complete protocol and switching keyword set', () => {
    for (const term of [
      'Protocol','HTTP','Packet','Segment','FTP','SMTP','Push protocol','Binary file','MIME','POP','IMAP','TCP',
      'Pull protocol','Host-to-host','Host','BitTorrent','Peer','Metadata','Pieces','Tracker','Swarm','Seed','Leech','Lurker',
      'Circuit switching','Packet switching','Hop number / hopping','Header (data packet)','Routing table',
    ]) expect(text, `Missing Chapter 14 term: ${term}`).toContain(term);
  });

  it('retains the source details that are easy to lose during presentation conversion', () => {
    for(const detail of [
      '331 Anonymous access allowed',
      'ftp://username@ftp.example.gov/',
      'superseded by increasing use of HTTP protocols',
      '1539 bytes to around 9000 bytes per frame',
      'IEEE 802.16-2004',
      'IEEE 802.16-2005',
      'about 12% of video file sharing',
      'YouTube at about 50%',
      'Availability means the number of complete copies',
      'checksum and why it is used [2]',
      'headers and routing tables are used to route packets efficiently',
    ]) expect(text,`Missing source-detail fidelity: ${detail}`).toContain(detail);
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

  it('keeps every source keyword and bold/emphasised anchor in Presentation mode',()=>{
    const active=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===14)!;
    const presentation=normalise(JSON.stringify(buildTopicPlan(active.slides,active.subtopics).flatMap(presentationBeatsForTopic)));
    for(const slide of chapter.slides){
      for(const term of slide.keyTerms??[]){
        expect(presentation,term.term).toContain(normalise(term.term));
        expect(presentation,`${term.term} definition`).toContain(normalise(term.definition));
      }
    }
    for(const anchor of rawPdfEmphasisForChapter(14)){
      expect(presentation,`p.${anchor.printedPage}: ${anchor.text}`).toContain(normalise(anchor.text));
    }
  });
});
