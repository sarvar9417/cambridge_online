import type { LessonPresentationBeat } from './lesson-experience-model';
import {
  Chapter14PresentationVisualV6,
  hasChapter14PresentationVisualV6,
} from './Chapter14PresentationVisualsV6';
import { Chapter14PracticeQ4 } from './Chapter14PracticeQ4';
import { Chapter14PresentationCompleteness } from './Chapter14PresentationCompleteness';
import './chapter14-presentation-v6.css';
import './chapter14-presentation-v6-hardening.css';
import './chapter14-presentation-professional.css';

/**
 * Compatibility facade.
 * LessonContent already prioritises the V4 renderer. Keep that stable API while
 * routing every Chapter 14 storyboard scene through the single V6 visual system.
 */
export function hasChapter14PresentationVisualV4(beat:LessonPresentationBeat){
  return hasChapter14PresentationVisualV6(beat);
}

export function Chapter14PresentationVisualV4({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  return <>
    <Chapter14PresentationVisualV6 beat={beat} reveal={reveal}/>
    <Chapter14PresentationCompleteness beat={beat}/>
    {beat.id==='h14p-142-practice'?<Chapter14PracticeQ4 reveal={reveal}/>:null}
  </>;
}
