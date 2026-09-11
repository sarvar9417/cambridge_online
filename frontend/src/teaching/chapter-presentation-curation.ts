import type { LessonPresentationBeat } from './lesson-experience-model';
import { HODDER_CHAPTER_1 } from './lesson-content-hodder-ch1';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { CHAPTER_4_CURRENT_DRAFT } from './lesson-content-chapter4-current';
import { chapter1PresentationStoryboard } from './chapter1-presentation-storyboard';
import { chapter2PresentationStoryboard } from './chapter2-presentation-storyboard';
import { chapter3PresentationStoryboard } from './chapter3-presentation-storyboard';
import { chapter4PresentationStoryboard } from './chapter4-presentation-storyboard';
import {
  rebuildChapter14StylePresentation,
  type RebuiltPresentationChapter,
} from './chapter14-style-presentation-rebuild';

const REBUILT_CHAPTERS = new Set<RebuiltPresentationChapter>([1,2,3,4,7,13]);

function chapterFromBeats(beats:LessonPresentationBeat[],topicCode:string):RebuiltPresentationChapter|null {
  const topicNumber=Number(topicCode.split('.')[0]);
  if(REBUILT_CHAPTERS.has(topicNumber as RebuiltPresentationChapter))return topicNumber as RebuiltPresentationChapter;
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
 * Presentation dispatch for the non-Chapter-14 rebuild.
 *
 * Chapters 1, 2, 3 and 4 now use genuinely hand-authored, source-shaped scene
 * plans rather than the generic reconstruction engine. Chapters 7 and 13 stay
 * on the temporary rebuild engine only until their own authored storyboards
 * land in this branch.
 *
 * Chapter 14 never calls this entry point for its dedicated storyboard/runtime.
 */
export function curateChapterPresentation(rawBeats:LessonPresentationBeat[],topicCode:string) {
  const sourceBeats=rawBeats.filter(beat=>!beat.id.startsWith('h2n-'));
  const chapter=chapterFromBeats(sourceBeats,topicCode);
  if(!chapter)return sourceBeats;

  if(chapter===1){
    const storyboard=chapter1PresentationStoryboard(topicCode,chapter1SourceSlides(topicCode));
    if(storyboard)return storyboard;
  }

  if(chapter===2){
    const storyboard=chapter2PresentationStoryboard(topicCode,CHAPTER_2_FINAL.slides);
    if(storyboard)return storyboard;
  }

  if(chapter===3){
    const storyboard=chapter3PresentationStoryboard(topicCode,CHAPTER_3_FINAL.slides);
    if(storyboard)return storyboard;
  }

  if(chapter===4){
    const storyboard=chapter4PresentationStoryboard(topicCode,CHAPTER_4_CURRENT_DRAFT.slides);
    if(storyboard)return storyboard;
  }

  return rebuildChapter14StylePresentation(sourceBeats,topicCode,chapter);
}
