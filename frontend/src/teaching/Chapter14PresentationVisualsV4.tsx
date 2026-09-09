import type { LessonPresentationBeat } from './lesson-experience-model';
import {
  Chapter14PresentationVisualV6,
  hasChapter14PresentationVisualV6,
} from './Chapter14PresentationVisualsV6';
import { Chapter14PracticeQ4 } from './Chapter14PracticeQ4';
import { Chapter14PresentationCompleteness } from './Chapter14PresentationCompleteness';
import { Chapter13PresentationVisual, hasChapter13PresentationVisual } from './Chapter13PresentationVisuals';
import './chapter14-presentation-v6.css';
import './chapter14-presentation-v6-hardening.css';
import './chapter14-presentation-professional.css';

/**
 * Compatibility facade used by LessonContent. Chapter 14 keeps its dedicated V6
 * storyboard, while Chapter 13 now shares the same projector entry point with a
 * source-specific renderer. This lets later Hodder chapters plug into one stable
 * presentation pipeline instead of copying the screen shell/navigation layer.
 */
export function hasChapter14PresentationVisualV4(beat:LessonPresentationBeat){
  return hasChapter14PresentationVisualV6(beat)||hasChapter13PresentationVisual(beat);
}

export function Chapter14PresentationVisualV4({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  if(hasChapter13PresentationVisual(beat))return <Chapter13PresentationVisual beat={beat} reveal={reveal}/>;
  return <>
    <Chapter14PresentationVisualV6 beat={beat} reveal={reveal}/>
    <Chapter14PresentationCompleteness beat={beat}/>
    {beat.id==='h14p-142-practice'?<Chapter14PracticeQ4 reveal={reveal}/>:null}
  </>;
}
