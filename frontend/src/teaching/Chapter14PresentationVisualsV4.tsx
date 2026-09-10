import type { LessonPresentationBeat } from './lesson-experience-model';
import { Chapter14PresentationMaster, hasChapter14PresentationMaster } from './Chapter14PresentationMaster';
import { Chapter13PresentationVisual, hasChapter13PresentationVisual } from './Chapter13PresentationVisuals';
import { Chapter2PresentationVisual, hasChapter2PresentationVisual } from './Chapter2PresentationVisuals';
import { Chapter2InternetVisual, hasChapter2InternetVisual } from './Chapter2InternetVisuals';
import { Chapter2DeviceVisual, hasChapter2DeviceVisual } from './Chapter2DeviceVisuals';
import { Chapter2ActivityVisual, hasChapter2ActivityVisual } from './Chapter2ActivityVisuals';
import { Chapter1PresentationVisual, hasChapter1PresentationVisual } from './Chapter1PresentationVisuals';
import './chapter14-presentation-master.css';
import './chapter13-presentation-hardening.css';

/** Stable presentation facade. Chapter 14 uses the MASTER projector system. */
export function hasChapter14PresentationVisualV4(beat:LessonPresentationBeat){
  return hasChapter14PresentationMaster(beat)||hasChapter13PresentationVisual(beat)||hasChapter2ActivityVisual(beat)||hasChapter2InternetVisual(beat)||hasChapter2DeviceVisual(beat)||hasChapter2PresentationVisual(beat)||hasChapter1PresentationVisual(beat);
}

export function Chapter14PresentationVisualV4({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  if(hasChapter1PresentationVisual(beat))return <Chapter1PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2ActivityVisual(beat))return <Chapter2ActivityVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2InternetVisual(beat))return <Chapter2InternetVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2DeviceVisual(beat))return <Chapter2DeviceVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2PresentationVisual(beat))return <Chapter2PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter13PresentationVisual(beat))return <Chapter13PresentationVisual beat={beat} reveal={reveal}/>;
  return <Chapter14PresentationMaster beat={beat} reveal={reveal}/>;
}
