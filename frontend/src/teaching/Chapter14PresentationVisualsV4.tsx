import type { LessonPresentationBeat } from './lesson-experience-model';
import { Chapter14PresentationContentFinal } from './Chapter14PresentationContentFinal';
import { Chapter14EndOfChapterMaster } from './Chapter14EndOfChapterMaster';
import { Chapter14EmailSourceComplete } from './Chapter14EmailSourceComplete';
import { hasChapter14PresentationRuntime } from './chapter14-presentation-runtime';
import { Chapter13PresentationVisual, hasChapter13PresentationVisual } from './Chapter13PresentationVisuals';
import { Chapter4InstructionsBitVisual, hasChapter4InstructionsBitVisual } from './Chapter4InstructionsBitVisuals';
import { Chapter4FetchAssemblyVisual, hasChapter4FetchAssemblyVisual } from './Chapter4FetchAssemblyVisuals';
import { Chapter4ProcessorVisual, hasChapter4ProcessorVisual } from './Chapter4ProcessorVisuals';
import { Chapter3LogicVisual, hasChapter3LogicVisual } from './Chapter3LogicVisuals';
import { Chapter3SensorVisual, hasChapter3SensorVisual } from './Chapter3SensorVisuals';
import { Chapter3DeviceVisual, hasChapter3DeviceVisual } from './Chapter3DeviceVisuals';
import { Chapter3PresentationVisual, hasChapter3PresentationVisual } from './Chapter3PresentationVisuals';
import { Chapter2PresentationVisual, hasChapter2PresentationVisual } from './Chapter2PresentationVisuals';
import { Chapter2InternetVisual, hasChapter2InternetVisual } from './Chapter2InternetVisuals';
import { Chapter2DeviceVisual, hasChapter2DeviceVisual } from './Chapter2DeviceVisuals';
import { Chapter2ActivityVisual, hasChapter2ActivityVisual } from './Chapter2ActivityVisuals';
import { Chapter2AddressingVisual, hasChapter2AddressingVisual } from './Chapter2AddressingVisuals';
import { Chapter2DnsVisual, hasChapter2DnsVisual } from './Chapter2DnsVisuals';
import { Chapter1PresentationVisual, hasChapter1PresentationVisual } from './Chapter1PresentationVisuals';
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
import './chapter13-presentation-hardening.css';

/** Stable presentation facade shared by source-grounded chapter scenes. */
export function hasChapter14PresentationVisualV4(beat:LessonPresentationBeat){
  return hasChapter14PresentationRuntime(beat)||hasChapter13PresentationVisual(beat)||hasChapter4InstructionsBitVisual(beat)||hasChapter4FetchAssemblyVisual(beat)||hasChapter4ProcessorVisual(beat)||hasChapter3LogicVisual(beat)||hasChapter3SensorVisual(beat)||hasChapter3DeviceVisual(beat)||hasChapter3PresentationVisual(beat)||hasChapter2DnsVisual(beat)||hasChapter2AddressingVisual(beat)||hasChapter2ActivityVisual(beat)||hasChapter2InternetVisual(beat)||hasChapter2DeviceVisual(beat)||hasChapter2PresentationVisual(beat)||hasChapter1PresentationVisual(beat);
}

export function Chapter14PresentationVisualV4({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  if(hasChapter1PresentationVisual(beat))return <Chapter1PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2DnsVisual(beat))return <Chapter2DnsVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2AddressingVisual(beat))return <Chapter2AddressingVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2ActivityVisual(beat))return <Chapter2ActivityVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2InternetVisual(beat))return <Chapter2InternetVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2DeviceVisual(beat))return <Chapter2DeviceVisual beat={beat} reveal={reveal}/>;
  if(hasChapter2PresentationVisual(beat))return <Chapter2PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter3LogicVisual(beat))return <Chapter3LogicVisual beat={beat} reveal={reveal}/>;
  if(hasChapter3SensorVisual(beat))return <Chapter3SensorVisual beat={beat} reveal={reveal}/>;
  if(hasChapter3DeviceVisual(beat))return <Chapter3DeviceVisual beat={beat} reveal={reveal}/>;
  if(hasChapter3PresentationVisual(beat))return <Chapter3PresentationVisual beat={beat} reveal={reveal}/>;
  if(hasChapter4InstructionsBitVisual(beat))return <Chapter4InstructionsBitVisual beat={beat} reveal={reveal}/>;
  if(hasChapter4FetchAssemblyVisual(beat))return <Chapter4FetchAssemblyVisual beat={beat} reveal={reveal}/>;
  if(hasChapter4ProcessorVisual(beat))return <Chapter4ProcessorVisual beat={beat} reveal={reveal}/>;
  if(hasChapter13PresentationVisual(beat))return <Chapter13PresentationVisual beat={beat} reveal={reveal}/>;
  if(beat.id==='h14p-141-email')return <Chapter14EmailSourceComplete reveal={reveal}/>;
  if(beat.id==='h14p-142-practice')return <Chapter14EndOfChapterMaster beat={beat} reveal={reveal}/>;
  if(hasChapter14PresentationRuntime(beat))return <Chapter14PresentationContentFinal beat={beat} reveal={reveal}/>;
  return null;
}
