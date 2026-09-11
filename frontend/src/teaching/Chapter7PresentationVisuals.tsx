import type { LessonPresentationBeat } from './lesson-experience-model';
import type { LessonSlide } from './lesson-content-full';
import { Chapter7BookVisual } from './Chapter7BookVisual';

export function hasChapter7PresentationVisual(beat:LessonPresentationBeat){
  return beat.slideId.startsWith('ch7-book-');
}

/** Reuse the source-grounded Chapter 7 diagrams in the projector deck. */
export function Chapter7PresentationVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  const slide={
    id:beat.slideId,
    example:beat.example,
    keyTerms:beat.keyTerms,
  } as LessonSlide;
  return <div className="ch7-presentation-visual"><Chapter7BookVisual slide={slide} revealed={reveal>0}/></div>;
}
