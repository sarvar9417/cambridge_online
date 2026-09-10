import { describe, expect, it } from 'vitest';
import { LESSON_EXPERIENCE_CHAPTERS } from './lesson-experience-model';
import { buildTopicPlan } from './lesson-topic-plan';
import { chapterPastPaperScope } from './lesson-chapter-past-paper-scope';

describe('chapter Past Paper scope',()=>{
  it('aggregates every live checkpoint across all topics in a chapter',()=>{
    const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===1);
    expect(chapter).toBeTruthy();
    const topics=buildTopicPlan(chapter!.slides,chapter!.subtopics);
    const scope=chapterPastPaperScope(topics);
    const topicCodes=topics.flatMap(topic=>chapterPastPaperScope([topic]).learningObjectiveCodes);
    const expected=[...new Set(topicCodes)];

    expect(scope.learningObjectiveCodes).toEqual(expected);
    expect(scope.learningObjectiveCodes.length).toBeGreaterThan(0);
    expect(scope.learningObjectiveCodes.length).toBeGreaterThan(
      Math.max(...topics.map(topic=>chapterPastPaperScope([topic]).learningObjectiveCodes.length)),
    );
  });

  it('keeps mapped lesson chapters inside one Cambridge course and approved year window',()=>{
    for(const chapter of LESSON_EXPERIENCE_CHAPTERS){
      const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
      const scope=chapterPastPaperScope(topics);

      expect(scope.yearFrom,`Chapter ${chapter.number}`).toBeLessThanOrEqual(scope.yearTo);
      expect(scope.checkpoints.every(slide=>slide.examPractice)).toBe(true);
      expect(scope.checkpoints.every(slide=>(slide.learningObjectiveCodes??[]).length>0)).toBe(true);

      if(scope.checkpoints.length===0){
        expect(scope.learningObjectiveCodes,`Chapter ${chapter.number}`).toEqual([]);
        expect(scope.syllabusCodes,`Chapter ${chapter.number}`).toEqual([]);
        continue;
      }

      expect(scope.learningObjectiveCodes.length,`Chapter ${chapter.number}`).toBeGreaterThan(0);
      expect(scope.syllabusCodes,`Chapter ${chapter.number}`).toHaveLength(1);
    }
  });

  it('maps Chapter 3 only to the source-backed primary-memory objectives',()=>{
    const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===3);
    expect(chapter).toBeTruthy();
    const scope=chapterPastPaperScope(buildTopicPlan(chapter!.slides,chapter!.subtopics));

    expect(scope.checkpoints.map(slide=>slide.id)).toEqual(['h3-cp-primary-memory']);
    expect(scope.learningObjectiveCodes).toEqual(['3.1.5','3.1.6','3.1.7']);
    expect(scope.syllabusCodes).toEqual(['9618']);
    expect(scope.yearFrom).toBe(2021);
    expect(scope.yearTo).toBe(2026);
  });
});
