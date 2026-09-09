import { describe, expect, it } from 'vitest';
import { CHAPTER_7_ALL_SOURCE_ATOMS } from './chapter7-source-atom-complete';
import { CHAPTER_7_SOURCE_KEY_TERMS } from './chapter7-source-keyterms';
import { formal9618Terms } from './coursebook-page-slides';
import { sourceAtomsForChapter } from './lesson-source-atom-registry';
import { rawPdfEmphasisForChapter } from './raw-pdf-emphasis-baseline';
import { buildTopicPlan } from './lesson-topic-plan';
import {
  LESSON_EXPERIENCE_CHAPTERS,
  displayPageTitle,
  learnerSlidesForPage,
  presentationBeatsForTopic,
} from './lesson-experience-model';

const normalise=(value:string)=>value.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const presentationText=(chapter:(typeof LESSON_EXPERIENCE_CHAPTERS)[number])=>normalise(JSON.stringify(
  buildTopicPlan(chapter.slides,chapter.subtopics).flatMap(presentationBeatsForTopic),
));

describe('lesson experience model',()=>{
  it('keeps all five source-backed chapters in the active experience',()=>{
    expect(LESSON_EXPERIENCE_CHAPTERS.map(chapter=>chapter.number)).toEqual([1,2,7,13,14]);
  });

  it('turns every teachable topic into bounded projector beats',()=>{
    for(const chapter of LESSON_EXPERIENCE_CHAPTERS){
      const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
      for(const topic of topics){
        const studyPages=topic.pages.filter(page=>page.kind==='study');
        if(!studyPages.length)continue;
        const beats=presentationBeatsForTopic(topic);
        expect(beats.length,`${chapter.number} ${topic.code}`).toBeGreaterThan(0);
        for(const beat of beats){
          expect(beat.bullets?.length??0).toBeLessThanOrEqual(4);
          expect(beat.keyTerms?.length??0).toBeLessThanOrEqual(2);
          if(beat.richBlock?.kind==='table')expect(beat.richBlock.table.rows.length).toBeLessThanOrEqual(6);
          if(beat.richBlock?.kind==='code')expect(beat.richBlock.lines.length).toBeLessThanOrEqual(10);
        }
      }
    }
  }, 15000);

  it('does not duplicate exact parser transcripts beside curated learner content',()=>{
    for(const chapter of LESSON_EXPERIENCE_CHAPTERS){
      const pages=buildTopicPlan(chapter.slides,chapter.subtopics).flatMap(topic=>topic.pages);
      for(const page of pages){
        const visible=learnerSlidesForPage(page);
        const hasCurated=page.slides.some(slide=>!slide.id.startsWith('pdf-first-'));
        if(hasCurated)expect(visible.some(slide=>slide.id.startsWith('pdf-first-')&&!slide.id.startsWith('pdf-first-lens-'))).toBe(false);
      }
    }
  });

  it('does not label the floating-point route as file organisation',()=>{
    const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===13)!;
    const topic=buildTopicPlan(chapter.slides,chapter.subtopics).find(item=>item.code==='13.3')!;
    for(const page of topic.pages)expect(displayPageTitle(page,topic)).not.toMatch(/^File organisation$/i);
  });

  it('puts every source atom, formal term and bold PDF anchor into presentation mode',()=>{
    for(const chapterNumber of [1,13] as const){
      const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===chapterNumber)!;
      const visible=presentationText(chapter);
      for(const atom of sourceAtomsForChapter(chapterNumber)){
        for(const line of atom.needles)expect(visible,`${atom.id}: ${line}`).toContain(normalise(line));
      }
      for(const term of formal9618Terms(chapterNumber)){
        expect(visible,term.term).toContain(normalise(term.term));
        expect(visible,`${term.term} definition`).toContain(normalise(term.definition));
      }
      for(const anchor of rawPdfEmphasisForChapter(chapterNumber))expect(visible,anchor.text).toContain(normalise(anchor.text));
    }

    const chapter7=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===7)!;
    const visible7=presentationText(chapter7);
    for(const atom of CHAPTER_7_ALL_SOURCE_ATOMS){
      for(const line of atom.needles)expect(visible7,`${atom.id}: ${line}`).toContain(normalise(line));
    }
    for(const term of CHAPTER_7_SOURCE_KEY_TERMS){
      expect(visible7,term.term).toContain(normalise(term.term));
      expect(visible7,`${term.term} definition`).toContain(normalise(term.definition));
    }
    for(const anchor of rawPdfEmphasisForChapter(7))expect(visible7,anchor.text).toContain(normalise(anchor.text));
  });
});
