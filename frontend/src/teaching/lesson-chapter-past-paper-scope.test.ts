import { describe, expect, it } from 'vitest';
import { LESSON_EXPERIENCE_CHAPTERS } from './lesson-experience-model';
import { buildTopicPlan } from './lesson-topic-plan';
import { chapterPastPaperScope } from './lesson-chapter-past-paper-scope';

const expectedCodes:Record<number,string[]>={
  1:[
    '1.1.1','1.1.2','1.1.3','1.1.4','1.1.5','1.1.6','1.1.7',
    '1.2.1','1.2.2','1.2.3','1.2.4','1.2.5','1.2.6','1.2.7',
    '1.3.1','1.3.2','1.3.3',
  ],
  2:[
    '2.1.1','2.1.2','2.1.3','2.1.4','2.1.5','2.1.6','2.1.7','2.1.8',
    '2.1.9','2.1.10','2.1.11','2.1.12','2.1.13','2.1.14','2.1.15',
  ],
  7:['7-lo-01','7-lo-02','7-lo-03','7-lo-04','7-lo-05','7-lo-06','7-lo-07','7-lo-08','7-lo-09'],
  13:[
    '13.1.1','13.1.2','13.1.3','13.1.4',
    '13.2.1','13.2.2','13.2.3',
    '13.3.1','13.3.2','13.3.3','13.3.4','13.3.5',
  ],
  14:['14.1.1','14.1.2','14.1.3','14.1.4','14.2.1','14.2.2','14.2.3'],
};

function scopeForChapter(number:number){
  const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===number);
  expect(chapter,`Chapter ${number}`).toBeTruthy();
  return chapterPastPaperScope(buildTopicPlan(chapter!.slides,chapter!.subtopics));
}

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

  it('locks every supported chapter to its intended current-target LO set',()=>{
    expect(LESSON_EXPERIENCE_CHAPTERS.map(chapter=>chapter.number)).toEqual([1,2,7,13,14]);
    for(const [chapterNumber,codes] of Object.entries(expectedCodes)){
      const scope=scopeForChapter(Number(chapterNumber));
      expect([...scope.learningObjectiveCodes].sort(),`Chapter ${chapterNumber}`).toEqual([...codes].sort());
      expect(new Set(scope.learningObjectiveCodes).size,`Chapter ${chapterNumber}`).toBe(scope.learningObjectiveCodes.length);
      expect(scope.learningObjectiveCodes.length,`Chapter ${chapterNumber}`).toBeLessThanOrEqual(100);
    }
  });

  it('keeps 9618 and 0478 chapter scopes isolated',()=>{
    for(const chapter of LESSON_EXPERIENCE_CHAPTERS){
      const scope=scopeForChapter(chapter.number);
      const expectedSyllabus=chapter.number===7?'0478':'9618';
      expect(scope.syllabusCodes,`Chapter ${chapter.number}`).toEqual([expectedSyllabus]);
      expect(scope.checkpoints.every(slide=>(slide.checkpointSyllabusCode??'9618')===expectedSyllabus),`Chapter ${chapter.number}`).toBe(true);
    }
  });

  it('keeps each chapter inside the intended approved paper window',()=>{
    for(const chapter of LESSON_EXPERIENCE_CHAPTERS){
      const scope=scopeForChapter(chapter.number);
      expect(scope.yearFrom,`Chapter ${chapter.number}`).toBe(chapter.number===7?2015:2021);
      expect(scope.yearTo,`Chapter ${chapter.number}`).toBe(2026);
      expect(scope.checkpoints.every(slide=>slide.examPractice)).toBe(true);
      expect(scope.checkpoints.every(slide=>(slide.learningObjectiveCodes??[]).length>0)).toBe(true);
    }
  });

  it('never leaks a different chapter prefix into a 9618 chapter request',()=>{
    for(const chapterNumber of [1,2,13,14]){
      const scope=scopeForChapter(chapterNumber);
      expect(scope.learningObjectiveCodes.every(code=>code.startsWith(`${chapterNumber}.`)),`Chapter ${chapterNumber}`).toBe(true);
    }
  });
});
