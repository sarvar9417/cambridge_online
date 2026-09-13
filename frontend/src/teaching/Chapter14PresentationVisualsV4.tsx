import type { LessonPresentationBeat } from './lesson-experience-model';
import { Chapter14PresentationContentFinal } from './Chapter14PresentationContentFinal';
import { Chapter14EndOfChapterMaster } from './Chapter14EndOfChapterMaster';
import { Chapter14EmailSourceComplete } from './Chapter14EmailSourceComplete';
import { hasChapter14PresentationRuntime } from './chapter14-presentation-runtime';
import './chapter14-presentation-master.css';
import './chapter14-presentation-content-v2.css';
import './chapter14-presentation-content-v2-eoc.css';
import './chapter14-presentation-master-projector.css';
import './chapter14-presentation-density-master.css';
import './chapter14-presentation-source-complete.css';
import './chapter14-presentation-deep-audit.css';
import './chapter14-presentation-deep-network.css';
import './chapter14-presentation-deep-content.css';
import './chapter14-presentation-final-source.css';
import './chapter14-email-source-complete.css';

/**
 * Chapter 14 is the benchmark implementation and keeps its dedicated runtime.
 * All non-Chapter-14 presentation renderers were removed from this facade;
 * rebuilt chapters now use the source-grounded Chapter-14-derived scene system.
 */
export function hasChapter14PresentationVisualV4(beat:LessonPresentationBeat){
  return hasChapter14PresentationRuntime(beat);
}

export function presentationVisualOwnsBeatContent(beat:LessonPresentationBeat){
  return hasChapter14PresentationRuntime(beat);
}

export function Chapter14PresentationVisualV4({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  if(beat.id==='h14p-141-email')return <Chapter14EmailSourceComplete reveal={reveal}/>;
  if(beat.id==='h14p-142-practice')return <Chapter14EndOfChapterMaster beat={beat} reveal={reveal}/>;
  if(hasChapter14PresentationRuntime(beat))return <Chapter14PresentationContentFinal beat={beat} reveal={reveal}/>;
  return null;
}
