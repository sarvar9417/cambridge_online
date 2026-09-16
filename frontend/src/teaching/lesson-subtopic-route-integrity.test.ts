import { describe, expect, it } from 'vitest';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import { buildTopicPlan } from './lesson-topic-plan';

const chapters=[...LESSON_CHAPTERS,CHAPTER_7];
const topicCode=(label:string)=>label.trim().match(/^(\d+\.\d+)/)?.[1] ?? null;

describe('declared lesson subtopic routing',()=>{
  it('keeps every declared subtopic reachable with at least one semantic page',()=>{
    for(const chapter of chapters){
      const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
      const routed=new Map(topics.map(topic=>[topic.code,topic] as const));
      const declared=chapter.subtopics.map(topicCode).filter((code):code is string=>Boolean(code));

      expect(declared.length,`Chapter ${chapter.number} declared topic codes`).toBe(chapter.subtopics.length);
      expect(new Set(declared).size,`Chapter ${chapter.number} duplicate declared topic codes`).toBe(declared.length);

      for(const code of declared){
        const topic=routed.get(code);
        expect(topic,`Chapter ${chapter.number} declared topic ${code} disappeared from routing`).toBeTruthy();
        expect(topic?.pages.length,`Chapter ${chapter.number} topic ${code} semantic pages`).toBeGreaterThan(0);
        expect(topic?.pages.some(page=>page.slides.length>0),`Chapter ${chapter.number} topic ${code} content`).toBe(true);
      }
    }
  });

  it('keeps every routed non-overview topic inside the chapter namespace',()=>{
    for(const chapter of chapters){
      const topics=buildTopicPlan(chapter.slides,chapter.subtopics).filter(topic=>topic.code!=='overview');
      const prefix=`${chapter.number}.`;
      topics.forEach(topic=>{
        expect(topic.code.startsWith(prefix),`Chapter ${chapter.number} leaked topic ${topic.code}`).toBe(true);
      });
    }
  });
});
