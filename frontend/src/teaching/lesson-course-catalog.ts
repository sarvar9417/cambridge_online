import { CHAPTER_7 as CHAPTER_7_0478 } from './lesson-content-chapter7-complete';
import { buildTopicPlan, type LessonTopic } from './lesson-topic-plan';
import {
  LESSON_EXPERIENCE_CHAPTERS as CAMBRIDGE_9618_CHAPTERS,
  courseCode,
  presentationBeatsForTopic,
  type LessonExperienceChapter,
} from './lesson-experience-model';

/**
 * Keep syllabuses as separate catalogs even when chapter numbers overlap.
 * Cambridge 0478 currently has one completed source-backed lesson here; more
 * 0478 chapters can be appended to this array later without disturbing 9618.
 */
export const CAMBRIDGE_0478_CHAPTERS: LessonExperienceChapter[] = [CHAPTER_7_0478];

export const LESSON_COURSE_CATALOG: LessonExperienceChapter[] = [
  ...CAMBRIDGE_9618_CHAPTERS,
  ...CAMBRIDGE_0478_CHAPTERS,
].sort((left, right) => {
  const leftCourse=courseCode(left),rightCourse=courseCode(right);
  if(leftCourse!==rightCourse)return leftCourse==='9618'?-1:1;
  return left.number-right.number;
});

export function lessonCatalogChapter(course:'9618'|'0478',chapterNumber:number) {
  return LESSON_COURSE_CATALOG.find(chapter=>courseCode(chapter)===course&&chapter.number===chapterNumber)??null;
}

/**
 * The historic 0478 Chapter 7 and the new 9618 Chapter 7 share the number 7.
 * The older presentation builder predates that overlap and expands an overview
 * by chapter number alone. For a catalog chapter, rebuild the overview from the
 * exact chapter object's own topics so neither syllabus can borrow the other
 * syllabus's screens.
 */
export function presentationBeatsForCatalogTopic(chapter:LessonExperienceChapter,topic:LessonTopic) {
  if(topic.code!=='overview')return presentationBeatsForTopic(topic);
  const ownSlideIds=new Set(chapter.slides.map(slide=>slide.id));
  const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
  const overview=topics.find(item=>item.code==='overview');
  const overviewBeats=overview
    ? presentationBeatsForTopic(overview).filter(beat=>ownSlideIds.has(beat.slideId))
    : [];
  const remaining=topics
    .filter(item=>item.code!=='overview'&&item.pages.some(page=>page.kind==='study'))
    .flatMap(presentationBeatsForTopic);
  return [...overviewBeats,...remaining];
}
