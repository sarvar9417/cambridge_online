import { describe, expect, it } from 'vitest';
import { hasChapter3PresentationVisual } from './Chapter3PresentationVisuals';
import {
  CHAPTER_3_COMPONENT_LESSON_COUNT,
  CHAPTER_3_LOGIC_LESSON_COUNT,
} from './chapter3-hardware-presentation';
import { LESSON_EXPERIENCE_CHAPTERS, presentationBeatsForTopic } from './lesson-experience-model';
import { buildTopicPlan } from './lesson-topic-plan';

const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===3)!;
const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
const components=topics.find(item=>item.code==='3.1')!;
const logic=topics.find(item=>item.code==='3.2')!;
const componentBeats=presentationBeatsForTopic(components);
const logicBeats=presentationBeatsForTopic(logic);
const componentIds=componentBeats.map(beat=>beat.id);
const logicIds=logicBeats.map(beat=>beat.id);

describe('Chapter 3 Hardware classroom presentation framing',()=>{
  it('frames 3.1 as four source-backed classroom lessons',()=>{
    expect(CHAPTER_3_COMPONENT_LESSON_COUNT).toBe(4);
    for(let lesson=1;lesson<=4;lesson+=1){
      for(const stage of ['cover','objectives','starter','recap'])expect(componentIds).toContain(`h3c-l${lesson}-${stage}`);
      expect(componentIds.indexOf(`h3c-l${lesson}-cover`)).toBeLessThan(componentIds.indexOf(`h3c-l${lesson}-objectives`));
      expect(componentIds.indexOf(`h3c-l${lesson}-objectives`)).toBeLessThan(componentIds.indexOf(`h3c-l${lesson}-starter`));
      expect(componentIds.indexOf(`h3c-l${lesson}-starter`)).toBeLessThan(componentIds.indexOf(`h3c-l${lesson}-recap`));
    }
    expect(componentIds.indexOf('h3c-l1-recap')).toBeLessThan(componentIds.indexOf('h3c-l2-cover'));
    expect(componentIds.indexOf('h3c-l2-recap')).toBeLessThan(componentIds.indexOf('h3c-l3-cover'));
    expect(componentIds.indexOf('h3c-l3-recap')).toBeLessThan(componentIds.indexOf('h3c-l4-cover'));
    expect(componentIds.indexOf('h3c-l2-starter')).toBeLessThan(componentBeats.findIndex(beat=>beat.slideId==='h3-311-hdd'));
    expect(componentIds.indexOf('h3c-l3-starter')).toBeLessThan(componentBeats.findIndex(beat=>beat.slideId==='h3-312-laser-printer'));
    expect(componentIds.indexOf('h3c-l4-starter')).toBeLessThan(componentBeats.findIndex(beat=>beat.slideId==='h3-312-sensors-adc-dac'));
  });

  it('frames 3.2 as three classroom lessons without absorbing chapter-wide review questions',()=>{
    expect(CHAPTER_3_LOGIC_LESSON_COUNT).toBe(3);
    for(let lesson=1;lesson<=3;lesson+=1){
      for(const stage of ['cover','objectives','starter','recap'])expect(logicIds).toContain(`h3l-l${lesson}-${stage}`);
    }
    expect(logicIds.indexOf('h3l-l1-recap')).toBeLessThan(logicIds.indexOf('h3l-l2-cover'));
    expect(logicIds.indexOf('h3l-l2-recap')).toBeLessThan(logicIds.indexOf('h3l-l3-cover'));
    expect(logicIds.indexOf('h3l-l2-starter')).toBeLessThan(logicBeats.findIndex(beat=>beat.slideId==='h3-324-example32'));
    expect(logicIds.indexOf('h3l-l3-starter')).toBeLessThan(logicBeats.findIndex(beat=>beat.slideId==='h3-325-real-world-design'));
    expect(logicBeats.some(beat=>beat.slideId.startsWith('h3-end-questions-'))).toBe(false);
  });

  it('routes every inserted lesson frame through a Chapter 3 projector visual',()=>{
    for(const beat of [...componentBeats,...logicBeats].filter(item=>/^h3[cl]-/.test(item.id))){
      expect(hasChapter3PresentationVisual(beat),beat.id).toBe(true);
      expect(beat.showSource).toBe(false);
      expect(beat.sceneRole).toBeTruthy();
    }
  });
});
