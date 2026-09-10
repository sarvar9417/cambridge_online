import type { LessonPresentationBeat } from './lesson-experience-model';
import {
  Chapter14PresentationVisualV6,
  hasChapter14PresentationVisualV6,
} from './Chapter14PresentationVisualsV6';
import { Chapter14PracticeQ4 } from './Chapter14PracticeQ4';
import { Chapter14PresentationCompleteness } from './Chapter14PresentationCompleteness';
import { Chapter13PresentationVisual, hasChapter13PresentationVisual } from './Chapter13PresentationVisuals';
import { Chapter2PresentationVisual, hasChapter2PresentationVisual } from './Chapter2PresentationVisuals';
import { Chapter2InternetVisual, hasChapter2InternetVisual } from './Chapter2InternetVisuals';
import { Chapter2DeviceVisual, hasChapter2DeviceVisual } from './Chapter2DeviceVisuals';
import { Chapter1PresentationVisual, hasChapter1PresentationVisual } from './Chapter1PresentationVisuals';
import './chapter14-presentation-v6.css';
import './chapter14-presentation-v6-hardening.css';
import './chapter14-presentation-professional.css';
import './chapter13-presentation-hardening.css';

/**
 * Compatibility facade used by LessonContent. Chapter 14 keeps its dedicated V6
 * storyboard. Hodder chapters plug source-specific renderers into the same stable
 * projector/navigation pipeline instead of copying presentation shell logic.
 */
export function hasChapter14PresentationVisualV4(beat:LessonPresentationBeat){
  return hasChapter14PresentationVisualV6(beat)||hasChapter13PresentationVisual(beat)||hasChapter2InternetVisual(beat)||hasChapter2DeviceVisual(beat)||hasChapter2PresentationVisual(beat)||hasChapter1PresentationVisual(beat);
}

export function Chapter14PresentationVisualV4({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  if(hasChapter1PresentationVisual(beat))return <Chapter1PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2InternetVisual(beat))return <Chapter2InternetVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2DeviceVisual(beat))return <Chapter2DeviceVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2PresentationVisual(beat))return <Chapter2PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter13PresentationVisual(beat))return <Chapter13PresentationVisual beat={beat} reveal={reveal}/>;
  return <>
    <Chapter14PresentationVisualV6 beat={beat} reveal={reveal}/>
    <Chapter14PresentationCompleteness beat={beat}/>
    {beat.id==='h14p-142-practice'?<Chapter14PracticeQ4 reveal={reveal}/>:null}
  </>;
}
