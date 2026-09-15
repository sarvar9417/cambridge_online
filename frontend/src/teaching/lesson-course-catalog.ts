import { CHAPTER_7 as CHAPTER_7_0478 } from './lesson-content-chapter7-complete';
import { buildTopicPlan, type LessonTopic } from './lesson-topic-plan';
import {
  LESSON_EXPERIENCE_CHAPTERS as CAMBRIDGE_9618_CHAPTERS,
  courseCode,
  presentationBeatsForTopic,
  type LessonExperienceChapter,
  type LessonPresentationBeat,
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

function uniqueBeats(beats:LessonPresentationBeat[]) {
  const seen=new Set<string>();
  return beats.filter(beat=>{
    if(seen.has(beat.id))return false;
    seen.add(beat.id);
    return true;
  });
}

/**
 * Build a complete chapter presentation from the exact selected course object.
 *
 * The legacy presentation builder can infer a chapter from a numeric topic or
 * slide id. That is useful for existing deep-fidelity chapters, but it cannot
 * safely resolve two different Chapter 7s and older inference did not know the
 * newer h5…h20 overview ids. The catalog therefore makes the chapter object the
 * source of truth: keep only its own overview beats, append every one of its
 * own teachable topics, then deduplicate any beats already expanded by a legacy
 * chapter-specific presenter.
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
    .flatMap(item=>presentationBeatsForTopic(item))
    .filter(beat=>ownSlideIds.has(beat.slideId));

  return uniqueBeats([...overviewBeats,...remaining]);
}
