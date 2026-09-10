import type { HodderLessonSlide } from './lesson-content-hodder-types';
import type { LessonTopic } from './lesson-topic-plan';

export type ChapterPastPaperScope = {
  checkpoints:HodderLessonSlide[];
  learningObjectiveCodes:string[];
  syllabusCodes:Array<'9618'|'0478'>;
  yearFrom:number;
  yearTo:number;
};

/**
 * Builds one exam scope for the whole lesson chapter.
 *
 * Past Paper mode is chapter-wide: every live Cambridge checkpoint from every
 * topic in the chapter contributes its learning-objective codes. The backend
 * then remains responsible for resolving those current targets through the
 * explicit compatibility graph to approved source questions.
 */
export function chapterPastPaperScope(topics:readonly LessonTopic[]):ChapterPastPaperScope {
  const checkpoints=topics
    .flatMap(topic=>topic.pages)
    .filter(page=>page.kind==='practice')
    .flatMap(page=>page.slides)
    .filter(slide=>slide.examPractice) as HodderLessonSlide[];

  const live=checkpoints.filter(slide=>(slide.learningObjectiveCodes??[]).length>0);
  const learningObjectiveCodes=[...new Set(live.flatMap(slide=>slide.learningObjectiveCodes??[]))];
  const syllabusCodes=[...new Set(live.map(slide=>slide.checkpointSyllabusCode??'9618'))] as Array<'9618'|'0478'>;

  return {
    checkpoints:live,
    learningObjectiveCodes,
    syllabusCodes,
    yearFrom:live.length?Math.min(...live.map(slide=>slide.checkpointYearFrom??2021)):2021,
    yearTo:live.length?Math.max(...live.map(slide=>slide.checkpointYearTo??2026)):2026,
  };
}
