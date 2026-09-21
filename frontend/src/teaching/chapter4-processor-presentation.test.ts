import { describe, expect, it } from 'vitest';
import { hasChapter4ProcessorVisual } from './Chapter4ProcessorVisuals';
import {
  CHAPTER_4_ASSEMBLY_LESSON_COUNT,
  CHAPTER_4_BIT_LESSON_COUNT,
  CHAPTER_4_CPU_LESSON_COUNT,
} from './chapter4-processor-presentation';
import { LESSON_EXPERIENCE_CHAPTERS, presentationBeatsForTopic } from './lesson-experience-model';
import { buildTopicPlan } from './lesson-topic-plan';

const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===4)!;
const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
const cpu=topics.find(item=>item.code==='4.1')!;
const assembly=topics.find(item=>item.code==='4.2')!;
const bit=topics.find(item=>item.code==='4.3')!;
const cpuBeats=presentationBeatsForTopic(cpu);
const assemblyBeats=presentationBeatsForTopic(assembly);
const bitBeats=presentationBeatsForTopic(bit);
const ids=(beats:typeof cpuBeats)=>beats.map(beat=>beat.id);

describe('Chapter 4 classroom presentation framing',()=>{
  it('frames CPU architecture as three source-backed lessons',()=>{
    const list=ids(cpuBeats);
    expect(CHAPTER_4_CPU_LESSON_COUNT).toBe(3);
    for(let lesson=1;lesson<=3;lesson+=1){
      for(const stage of ['cover','objectives','starter','recap'])expect(list).toContain(`h4c-l${lesson}-${stage}`);
    }
    expect(list.indexOf('h4c-l1-recap')).toBeLessThan(list.indexOf('h4c-l2-cover'));
    expect(list.indexOf('h4c-l2-recap')).toBeLessThan(list.indexOf('h4c-l3-cover'));
    expect(list.indexOf('h4c-l2-starter')).toBeLessThan(cpuBeats.findIndex(beat=>beat.slideId==='h4-414-system-buses'));
    expect(list.indexOf('h4c-l3-starter')).toBeLessThan(cpuBeats.findIndex(beat=>beat.slideId==='h4-416-fetch-cycle'));
  });

  it('frames assembly as two lessons and keeps addressing/traces in the second lesson',()=>{
    const list=ids(assemblyBeats);
    expect(CHAPTER_4_ASSEMBLY_LESSON_COUNT).toBe(2);
    for(let lesson=1;lesson<=2;lesson+=1){
      for(const stage of ['cover','objectives','starter','recap'])expect(list).toContain(`h4a-l${lesson}-${stage}`);
    }
    expect(list.indexOf('h4a-l1-recap')).toBeLessThan(list.indexOf('h4a-l2-cover'));
    expect(list.indexOf('h4a-l2-starter')).toBeLessThan(assemblyBeats.findIndex(beat=>beat.slideId==='h4-424-addressing-modes'));
    expect(assemblyBeats.findIndex(beat=>beat.slideId==='h4-42-activity4b')).toBeLessThan(list.indexOf('h4a-l2-recap'));
  });

  it('frames bit manipulation as one focused lesson without absorbing chapter review questions',()=>{
    const list=ids(bitBeats);
    expect(CHAPTER_4_BIT_LESSON_COUNT).toBe(1);
    for(const stage of ['cover','objectives','starter','recap'])expect(list).toContain(`h4b-l1-${stage}`);
    expect(list.indexOf('h4b-l1-starter')).toBeLessThan(bitBeats.findIndex(beat=>beat.slideId==='h4-43-binary-shifts'));
    expect(bitBeats.findIndex(beat=>beat.slideId==='h4-43-activity4c')).toBeLessThan(list.indexOf('h4b-l1-recap'));
    expect(bitBeats.some(beat=>beat.slideId.startsWith('h4-eoc-'))).toBe(false);
  });

  it('routes every inserted Chapter 4 frame through a custom projector visual',()=>{
    const framed=[...cpuBeats,...assemblyBeats,...bitBeats].filter(beat=>/^h4[cab]-/.test(beat.id));
    expect(framed.length).toBeGreaterThan(0);
    for(const beat of framed){
      expect(hasChapter4ProcessorVisual(beat),beat.id).toBe(true);
      expect(beat.showSource).toBe(false);
      expect(beat.sceneRole).toBeTruthy();
    }
  });
});
