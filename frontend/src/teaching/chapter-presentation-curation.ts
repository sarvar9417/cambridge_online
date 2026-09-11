import type { LessonPresentationBeat } from './lesson-experience-model';
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

/**
 * Compatibility entry point retained because the lesson experience model calls
 * this function. The former non-Chapter-14 curation implementation has been
 * removed. All active non-Chapter-14 decks are rebuilt from their source beats
 * by the Chapter 14-derived scene engine.
 *
 * Chapter 2's historical h2n-* framing screens are intentionally discarded
 * here; they belonged to the retired presentation implementation and are not
 * source content.
 */
export function curateChapterPresentation(rawBeats:LessonPresentationBeat[],topicCode:string) {
  const sourceBeats=rawBeats.filter(beat=>!beat.id.startsWith('h2n-'));
  const chapter=chapterFromBeats(sourceBeats,topicCode);
  if(!chapter)return sourceBeats;
  return rebuildChapter14StylePresentation(sourceBeats,topicCode,chapter);
}
