import { describe, expect, it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_2_KEY_TERMS_2_1, CHAPTER_2_KEY_TERMS_2_2 } from './chapter2-source-emphasis';
import { lessonChapter } from './lesson-content-source-complete';
import { LESSON_EXPERIENCE_CHAPTERS, presentationBeatsForTopic } from './lesson-experience-model';
import { buildTopicPlan } from './lesson-topic-plan';
import { rawPdfEmphasisForChapter } from './raw-pdf-emphasis-baseline';
import { CHAPTER_2_SOURCE_FILE_MANIFEST } from './source-file-fidelity-manifest';

const chapter = CHAPTER_2_FINAL;
const chapterText = JSON.stringify(chapter);
const normalise = (value:string) => value.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();

describe('Chapter 2 Communication source-complete lesson',()=>{
  it('is exposed as an AS Level lesson in the active library',()=>{
    expect(chapter.level).toBe('AS Level');
    expect(lessonChapter(2)?.title).toBe('Communication');
    expect(LESSON_EXPERIENCE_CHAPTERS.map(item=>item.number)).toContain(2);
  });

  it('locks all 41 supplied pages and represents printed pages 27–67',()=>{
    const represented=[...new Set(chapter.slides.flatMap(slide=>slide.sourcePages??[]))].sort((a,b)=>a-b);
    expect(represented).toEqual(Array.from({length:41},(_,index)=>27+index));
    expect(chapter.coverage).toContain('41/41 page fingerprints');
    expect(CHAPTER_2_SOURCE_FILE_MANIFEST.sourceFileSha256).toBe('8788c2659eb35e3e9a25e054ddc9da7cf374408f309224bf26d8546add6a4f15');
    for(const page of CHAPTER_2_SOURCE_FILE_MANIFEST.pages){
      expect(chapterText,`Missing Chapter 2 p.${page.printedPage} fingerprint`)
        .toContain(`SOURCE FILE PAGE ${page.printedPage} · sha256:${page.sha256}`);
    }
  });

  it('uses slide-by-slide Study pages and ends both topics with clean Past Paper practice',()=>{
    const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
    for(const topic of topics.filter(item=>item.code==='2.1'||item.code==='2.2')){
      const study=topic.pages.filter(page=>page.kind==='study');
      expect(study.length,topic.code).toBeGreaterThan(10);
      expect(study.every(page=>page.slides.length===1),topic.code).toBe(true);
      expect(topic.pages.at(-1)?.kind,topic.code).toBe('practice');
      expect(topic.pages.at(-1)?.title,topic.code).toBe('Past Paper practice');
    }
    expect(topics.find(item=>item.code==='2.1')?.pages[0]?.bookPage).toBe(2);
    expect(topics.find(item=>item.code==='2.2')?.pages[0]?.bookPage).toBe(28);
  });

  it('uses the complete current 2026–2028 objective set in two section checkpoints',()=>{
    const practice=chapter.slides.filter(slide=>slide.examPractice);
    expect(practice.map(slide=>slide.id)).toEqual(['h2-cp-networking-full','h2-cp-internet-full']);
    expect(practice[0]?.learningObjectiveCodes).toEqual(Array.from({length:11},(_,index)=>`2.1.${index+1}`));
    expect(practice[1]?.learningObjectiveCodes).toEqual(['2.1.12','2.1.13','2.1.14','2.1.15']);
    expect(practice.every(slide=>slide.checkpointYearFrom===2021&&slide.checkpointYearTo===2026)).toBe(true);
  });

  it('keeps every formal key term and bold source anchor in Presentation mode',()=>{
    const active=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===2)!;
    const presentation=normalise(JSON.stringify(buildTopicPlan(active.slides,active.subtopics).flatMap(presentationBeatsForTopic)));
    for(const term of [...CHAPTER_2_KEY_TERMS_2_1,...CHAPTER_2_KEY_TERMS_2_2]){
      expect(presentation,term.term).toContain(normalise(term.term));
      expect(presentation,`${term.term} definition`).toContain(normalise(term.definition));
      expect(presentation,`${term.term} simple explanation`).toContain(normalise(term.simple));
    }
    for(const anchor of rawPdfEmphasisForChapter(2)){
      expect(presentation,`p.${anchor.printedPage}: ${anchor.text}`).toContain(normalise(anchor.text));
    }
  });

  it('includes the prior knowledge, all activities, figures and tables from the extract',()=>{
    for(const id of [
      'h2-activity-2a','h2-activity-2b','h2-activity-2c',
      'h2-extension-2a','h2-extension-2b','h2-extension-2c',
      'h2-extension-2d','h2-extension-2e','h2-extension-2f',
    ]) expect(chapter.slides.some(slide=>slide.id===id),id).toBe(true);
    for(let number=1;number<=25;number+=1)expect(chapterText,`Figure 2.${number}`).toContain(`Figure 2.${number}`);
    for(let number=1;number<=10;number+=1)expect(chapterText,`Table 2.${number}`).toContain(`Table 2.${number}`);
    expect(chapterText).toContain('WHAT YOU SHOULD ALREADY KNOW');
    expect(chapterText).toContain('20 employees developing a new mobile-phone battery');
    expect(chapterText).toContain('group of financial consultants');
  });

  it('retains source-specific facts and removes the unsupported substitutions found in the earlier draft',()=>{
    for(const detail of [
      'Around 1970', 'ARPAnet coverage in 1973', 'one collision domain',
      'Coaxial is about 80× twisted pair', 'About 26,000× twisted-pair capacity',
      'f = c / λ', 'random wait alone does not guarantee termination',
      '900B:3E4A:AE41::AFF7:DD44:F1FF', '107.162.140.19',
    ]) expect(chapterText,detail).toContain(detail);
    for(const unsupported of [
      'ARPAnet in 1957', 'Ring topology', 'SaaS', 'IaaS', 'PaaS',
      '22 dB/km', '80km for fibre', '1,600 times per second',
    ]) expect(chapterText,unsupported).not.toContain(unsupported);
  });
});
