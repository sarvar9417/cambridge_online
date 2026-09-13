import type { LessonPresentationBeat } from './lesson-experience-model';
import { HODDER_CHAPTER_1 } from './lesson-content-hodder-ch1';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { CHAPTER_4_CURRENT_DRAFT } from './lesson-content-chapter4-current';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { SOURCE_FILE_FIDELITY_CHAPTER_13 } from './lesson-content-source-file-fidelity';
import { chapter1PresentationStoryboard } from './chapter1-presentation-storyboard';
import { chapter2PresentationStoryboard } from './chapter2-presentation-storyboard';
import { chapter3PresentationStoryboard } from './chapter3-presentation-storyboard';
import { chapter4PresentationStoryboard } from './chapter4-presentation-storyboard';
import { chapter7PresentationStoryboard } from './chapter7-presentation-storyboard';
import { chapter13PresentationStoryboard } from './chapter13-presentation-storyboard';

type AuthoredPresentationChapter=1|2|3|4|7|13;
const AUTHORED_CHAPTERS=new Set<AuthoredPresentationChapter>([1,2,3,4,7,13]);

function chapterFromBeats(beats:LessonPresentationBeat[],topicCode:string):AuthoredPresentationChapter|null {
  const topicNumber=Number(topicCode.split('.')[0]);
  if(AUTHORED_CHAPTERS.has(topicNumber as AuthoredPresentationChapter))return topicNumber as AuthoredPresentationChapter;
  for(const beat of beats){
    const id=`${beat.slideId} ${beat.id}`;
    if(/(?:^|\s)h13-/.test(id))return 13;
    if(/(?:^|\s)h7-|(?:^|\s)ch7-/.test(id))return 7;
    if(/(?:^|\s)h4-/.test(id))return 4;
    if(/(?:^|\s)h3-/.test(id))return 3;
    if(/(?:^|\s)h2-/.test(id))return 2;
    if(/(?:^|\s)h1-/.test(id))return 1;
  }
  return null;
}

function chapter1SourceSlides(topicCode:string) {
  if(topicCode==='overview')return HODDER_CHAPTER_1.slides;
  return HODDER_CHAPTER_1.slides.filter(slide=>slide.subtopicCode===topicCode);
}

/**
 * Presentation dispatch for the Chapter-14-standard rebuild.
 *
 * Every active non-Chapter-14 presentation chapter now has its own hand-authored,
 * source-shaped storyboard. There is deliberately no generic presentation
 * reconstruction fallback for Chapters 1, 2, 3, 4, 7 or 13.
 *
 * Chapter 14 never calls this entry point for its dedicated storyboard/runtime.
 */
export function curateChapterPresentation(rawBeats:LessonPresentationBeat[],topicCode:string) {
  const sourceBeats=rawBeats.filter(beat=>!beat.id.startsWith('h2n-'));
  const chapter=chapterFromBeats(sourceBeats,topicCode);
  if(!chapter)return sourceBeats;

  if(chapter===1)return chapter1PresentationStoryboard(topicCode,chapter1SourceSlides(topicCode))??sourceBeats;
  if(chapter===2)return chapter2PresentationStoryboard(topicCode,CHAPTER_2_FINAL.slides)??sourceBeats;
  if(chapter===3)return chapter3PresentationStoryboard(topicCode,CHAPTER_3_FINAL.slides)??sourceBeats;
  if(chapter===4)return chapter4PresentationStoryboard(topicCode,CHAPTER_4_CURRENT_DRAFT.slides)??sourceBeats;
  if(chapter===7)return chapter7PresentationStoryboard(topicCode,CHAPTER_7.slides)??sourceBeats;
  if(chapter===13)return chapter13PresentationStoryboard(topicCode,SOURCE_FILE_FIDELITY_CHAPTER_13.slides)??sourceBeats;

  return sourceBeats;
}
