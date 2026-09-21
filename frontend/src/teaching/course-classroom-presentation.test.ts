import { describe, expect, it } from 'vitest';
import { hasCourseClassroomPresentationVisual } from './CourseClassroomPresentationVisual';
import { CONFIGURED_COURSE_TOPIC_FRAMES } from './course-classroom-presentation';
import { LESSON_EXPERIENCE_CHAPTERS, presentationBeatsForTopic } from './lesson-experience-model';
import { buildTopicPlan } from './lesson-topic-plan';

describe('configured course classroom presentation framing',()=>{
  it('grounds every configured Chapter 5–12 frame in a real source-backed topic and boundary',()=>{
    for(const frame of CONFIGURED_COURSE_TOPIC_FRAMES){
      const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===frame.chapter);
      expect(chapter,`chapter ${frame.chapter}`).toBeTruthy();
      const topic=buildTopicPlan(chapter!.slides,chapter!.subtopics).find(item=>item.code===frame.topicCode);
      expect(topic,`topic ${frame.topicCode}`).toBeTruthy();
      const beats=presentationBeatsForTopic(topic!);
      const ids=beats.map(beat=>beat.id);
      frame.lessons.forEach((lesson,index)=>{
        const prefix=`hcf-${frame.topicCode.replace('.','-')}-l${index+1}`;
        for(const stage of ['cover','objectives','starter','recap'])expect(ids,`${frame.topicCode} lesson ${index+1}`).toContain(`${prefix}-${stage}`);
        expect(ids.indexOf(`${prefix}-cover`)).toBeLessThan(ids.indexOf(`${prefix}-objectives`));
        expect(ids.indexOf(`${prefix}-objectives`)).toBeLessThan(ids.indexOf(`${prefix}-starter`));
        expect(ids.indexOf(`${prefix}-starter`)).toBeLessThan(ids.indexOf(`${prefix}-recap`));
        if(index>0){
          expect(lesson.boundary,`${frame.topicCode} lesson ${index+1} boundary`).toBeTruthy();
          const boundaryIndex=beats.findIndex(beat=>beat.slideId===lesson.boundary);
          expect(boundaryIndex,`${frame.topicCode} boundary ${lesson.boundary}`).toBeGreaterThan(-1);
          expect(ids.indexOf(`${prefix}-starter`)).toBeLessThan(boundaryIndex);
          const previous=`hcf-${frame.topicCode.replace('.','-')}-l${index}-recap`;
          expect(ids.indexOf(previous)).toBeLessThan(ids.indexOf(`${prefix}-cover`));
        }
      });
    }
  });

  it('routes every inserted frame through the shared projector visual without exposing source-audit chrome',()=>{
    for(const frame of CONFIGURED_COURSE_TOPIC_FRAMES){
      const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===frame.chapter)!;
      const topic=buildTopicPlan(chapter.slides,chapter.subtopics).find(item=>item.code===frame.topicCode)!;
      const framed=presentationBeatsForTopic(topic).filter(beat=>beat.id.startsWith('hcf-'));
      expect(framed.length,`topic ${frame.topicCode}`).toBe(frame.lessons.length*4);
      for(const beat of framed){
        expect(hasCourseClassroomPresentationVisual(beat),beat.id).toBe(true);
        expect(beat.showSource).toBe(false);
        expect(beat.sceneRole).toBeTruthy();
      }
    }
  });

  it('does not classify chapter review beats as classroom frame visuals',()=>{
    for(const chapterNo of [5,6,7,8,9,10,11,12]){
      const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===chapterNo)!;
      for(const topic of buildTopicPlan(chapter.slides,chapter.subtopics)){
        for(const beat of presentationBeatsForTopic(topic).filter(beat=>/review/i.test(beat.slideId))){
          expect(hasCourseClassroomPresentationVisual(beat)).toBe(false);
        }
      }
    }
  });
});
