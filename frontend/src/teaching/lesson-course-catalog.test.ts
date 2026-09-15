import { describe, expect, it } from 'vitest';
import { buildTopicPlan } from './lesson-topic-plan';
import { courseCode, presentationBeatsForTopic } from './lesson-experience-model';
import {
  CAMBRIDGE_0478_CHAPTERS,
  LESSON_COURSE_CATALOG,
  lessonCatalogChapter,
  presentationBeatsForCatalogTopic,
} from './lesson-course-catalog';

const ALL_9618 = Array.from({ length:20 },(_,index)=>index+1);

describe('lesson course catalog',()=>{
  it('keeps the complete 9618 course and restores 0478 Chapter 7 as a separate course entry',()=>{
    const chapters9618=LESSON_COURSE_CATALOG.filter(chapter=>courseCode(chapter)==='9618');
    const chapters0478=LESSON_COURSE_CATALOG.filter(chapter=>courseCode(chapter)==='0478');
    expect(chapters9618.map(chapter=>chapter.number)).toEqual(ALL_9618);
    expect(chapters0478.map(chapter=>chapter.number)).toEqual([7]);
    expect(CAMBRIDGE_0478_CHAPTERS).toHaveLength(1);
  });

  it('resolves the overlapping Chapter 7 number by syllabus instead of replacing either course',()=>{
    const chapter9618=lessonCatalogChapter('9618',7)!;
    const chapter0478=lessonCatalogChapter('0478',7)!;
    expect(chapter9618.title).toBe('Ethics and ownership');
    expect(chapter0478.title).toBe('Algorithm design and problem-solving');
    expect(chapter9618).not.toBe(chapter0478);
  });

  it('builds a complete 9618 overview presentation only from the selected 9618 chapter',()=>{
    const chapter=lessonCatalogChapter('9618',7)!;
    const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
    const overview=topics.find(topic=>topic.code==='overview')!;
    const beats=presentationBeatsForCatalogTopic(chapter,overview);
    const ownIds=new Set(chapter.slides.map(slide=>slide.id));

    expect(beats.length).toBeGreaterThan(0);
    expect(beats.every(beat=>ownIds.has(beat.slideId))).toBe(true);
    for(const topic of topics.filter(item=>item.code!=='overview'&&item.pages.some(page=>page.kind==='study'))){
      const topicSlideIds=new Set(presentationBeatsForTopic(topic).map(beat=>beat.slideId));
      expect(beats.some(beat=>topicSlideIds.has(beat.slideId)),topic.code).toBe(true);
    }
  },15000);

  it('builds the 0478 Chapter 7 overview presentation only from 0478 Chapter 7 slides',()=>{
    const chapter=lessonCatalogChapter('0478',7)!;
    const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
    const overview=topics.find(topic=>topic.code==='overview')!;
    const beats=presentationBeatsForCatalogTopic(chapter,overview);
    const ownIds=new Set(chapter.slides.map(slide=>slide.id));
    expect(beats.length).toBeGreaterThan(0);
    expect(beats.every(beat=>ownIds.has(beat.slideId))).toBe(true);
    expect(beats.some(beat=>beat.slideId.startsWith('ch7-'))).toBe(true);
  },15000);
});
