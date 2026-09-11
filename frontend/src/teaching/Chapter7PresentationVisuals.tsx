import type { LessonPresentationBeat } from './lesson-experience-model';
import type { LessonSlide } from './lesson-content-full';
import { Chapter7BookVisual } from './Chapter7BookVisual';

function hasMappedBookVisual(id:string){
  return id==='ch7-book-00-route'
    || id.includes('abstraction-maps')
    || id.includes('ipos')
    || id.includes('alarm-ipos')
    || id.includes('structure-basic')
    || id.includes('alarm-tree')
    || id.includes('teeth')
    || id.includes('flow-symbols')
    || id.includes('flow-purpose')
    || id.includes('ticket-flow')
    || id.includes('79-example1')
    || id.includes('operators')
    || id.includes('comparison')
    || id.includes('loops')
    || id.includes('loop-examples')
    || id.includes('74-overview')
    || id.includes('total-count')
    || id.includes('max-min')
    || id.includes('average')
    || id.includes('linear-search')
    || id.includes('bubble')
    || id.includes('75-')
    || id.includes('76-')
    || id.includes('77-')
    || id.includes('78-activity71314')
    || id.includes('78-')
    || id.includes('79-eight')
    || id.includes('79-fig')
    || id.includes('ext-')
    || id.includes('exam-');
}

export function hasChapter7PresentationVisual(beat:LessonPresentationBeat){
  return beat.slideId.startsWith('ch7-book-')
    && hasMappedBookVisual(beat.slideId)
    && !beat.richBlock
    && !beat.example
    && !beat.keyTerms;
}

/** Reuse the source-grounded Chapter 7 diagrams without hiding rich teaching content. */
export function Chapter7PresentationVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  const slide={id:beat.slideId} as LessonSlide;
  return <div className="ch7-presentation-visual"><Chapter7BookVisual slide={slide} revealed={reveal>0}/></div>;
}
