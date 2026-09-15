import { describe, expect, it } from 'vitest';
import { formal9618Terms } from './coursebook-page-slides';
import { sourceAtomsForChapter } from './lesson-source-atom-registry';
import { rawPdfEmphasisForChapter } from './raw-pdf-emphasis-baseline';
import { buildTopicPlan } from './lesson-topic-plan';
import {
  LESSON_EXPERIENCE_CHAPTERS,
  courseCode,
  displayPageTitle,
  learnerSlidesForPage,
  presentationBeatsForTopic,
} from './lesson-experience-model';

const ALL_9618 = Array.from({ length: 20 }, (_, index) => index + 1);
const normalise=(value:string)=>value.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const presentationText=(chapter:(typeof LESSON_EXPERIENCE_CHAPTERS)[number])=>normalise(JSON.stringify(
  buildTopicPlan(chapter.slides,chapter.subtopics).flatMap(presentationBeatsForTopic),
));

describe('lesson experience model',()=>{
  it('keeps every source-backed 9618 chapter in the active experience exactly once',()=>{
    expect(LESSON_EXPERIENCE_CHAPTERS.map(chapter=>chapter.number)).toEqual(ALL_9618);
    expect(new Set(LESSON_EXPERIENCE_CHAPTERS.map(chapter=>chapter.number)).size).toBe(20);
    expect(LESSON_EXPERIENCE_CHAPTERS.find(chapter=>chapter.number===7)?.title).toBe('Ethics and ownership');
    expect(courseCode(LESSON_EXPERIENCE_CHAPTERS.find(chapter=>chapter.number===7)!)).toBe('9618');
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
          expect(beat.bullets?.length??0,`${chapter.number} ${topic.code} ${beat.id}`).toBeLessThanOrEqual(4);
          expect(beat.keyTerms?.length??0,`${chapter.number} ${topic.code} ${beat.id}`).toBeLessThanOrEqual(2);
          if(beat.richBlock?.kind==='table')expect(beat.richBlock.table.rows.length).toBeLessThanOrEqual(6);
          if(beat.richBlock?.kind==='code')expect(beat.richBlock.lines.length).toBeLessThanOrEqual(10);
        }
      }
    }
  }, 30000);

  it('gives every non-Chapter-14 projector screen a scene role and hides audit chrome',()=>{
    for(const chapter of LESSON_EXPERIENCE_CHAPTERS.filter(item=>item.number!==14)){
      const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
      for(const topic of topics.filter(item=>item.pages.some(page=>page.kind==='study'))){
        const beats=presentationBeatsForTopic(topic);
        expect(beats.every(beat=>Boolean(beat.sceneRole)),`${chapter.number} ${topic.code} scene roles`).toBe(true);
        expect(beats.every(beat=>beat.showSource===false),`${chapter.number} ${topic.code} source chrome`).toBe(true);
        const visible=JSON.stringify(beats);
        expect(visible).not.toContain('COURSEBOOK · EMPHASISED CONTENT');
        expect(visible).not.toContain('Important emphasised coursebook concepts');
      }
    }
  },30000);

  it('opens a complete chapter presentation from the overview route',()=>{
    for(const chapter of LESSON_EXPERIENCE_CHAPTERS.filter(item=>item.number!==14)){
      const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
      const overview=topics.find(item=>item.code==='overview');
      if(!overview)continue;
      const deck=presentationBeatsForTopic(overview);
      for(const topic of topics.filter(item=>item.code!=='overview'&&item.pages.some(page=>page.kind==='study'))){
        const topicSlideIds=new Set(presentationBeatsForTopic(topic).map(beat=>beat.slideId));
        expect(deck.some(beat=>topicSlideIds.has(beat.slideId)),`${chapter.number} ${topic.code}`).toBe(true);
      }
    }
  },30000);

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

  it('keeps the existing deep-fidelity source atoms, formal terms and bold PDF anchors in Chapters 1 and 13',()=>{
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
  });
});