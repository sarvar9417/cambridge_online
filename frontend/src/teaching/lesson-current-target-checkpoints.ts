import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';

export const CURRENT_9618_CHECKPOINT_TARGETS: Readonly<Record<string, readonly string[]>> = {
  'h1-cp-number-purpose':['1.1.2'],
  'h1-cp-base-convert':['1.1.3'],
  'h1-cp-arithmetic':['1.1.4','1.1.5'],
  'h1-cp-memory-prefixes':['1.1.1'],
  'h1-cp-hex':['1.1.3','1.1.6'],
  'h1-cp-bcd':['1.1.3','1.1.6'],
  'h1-cp-character-purpose':['1.1.7'],
  'h1-cp-character-rep':['1.1.7'],
  'h1-cp-bitmap':['1.2.1','1.2.2','1.2.3'],
  'h1-cp-vector':['1.2.4'],
  'h1-cp-format-choice':['1.2.5'],
  'h1-cp-sound-digitise':['1.2.6'],
  'h1-cp-sampling':['1.2.7'],
  'h1-cp-compression-need':['1.3.1'],
  'h1-cp-lossy-lossless':['1.3.2'],
  'h1-cp-compression-choice':['1.3.2'],
  'h1-cp-rle':['1.3.3'],

  'h13-cp-udt-need':['13.1.1'],
  'h13-cp-noncomposite':['13.1.2'],
  'h13-cp-composite':['13.1.3'],
  'h13-cp-type-choice':['13.1.4'],
  'h13-cp-file-org':['13.2.1'],
  'h13-cp-file-access':['13.2.2'],
  'h13-cp-org-access-choice':['13.2.1'],
  'h13-cp-hashing':['13.2.3'],
  'h13-cp-float-format':['13.3.1'],
  'h13-cp-float-to-denary':['13.3.2'],
  'h13-cp-denary-to-float':['13.3.2'],
  'h13-cp-approximation':['13.3.4'],
  'h13-cp-normalise':['13.3.3'],
  'h13-cp-precision-range':['13.3.3'],
  'h13-cp-rounding':['13.3.5'],
  'h13-cp-approx-final':['13.3.4'],
};

const CURRENT_9618_CODE=/^(?:1\.[123]|13\.[123])\.\d+$/;

const currentTargetSlide=(slide:HodderLessonSlide):HodderLessonSlide=>{
  const targets=CURRENT_9618_CHECKPOINT_TARGETS[slide.id];
  if(!targets)return slide;
  if(!slide.examPractice||!slide.learningObjectiveCodes?.length){
    throw new Error(`Current-target checkpoint map points at a non-live checkpoint: ${slide.id}`);
  }
  if(!targets.every(code=>CURRENT_9618_CODE.test(code))){
    throw new Error(`Invalid current 9618 checkpoint target for ${slide.id}`);
  }
  return {
    ...slide,
    eyebrow:'CAMBRIDGE CHECKPOINT · CURRENT 2026–2028 TARGET',
    lead:'This checkpoint starts from the current Cambridge 9618 learning objective(s). The backend may surface 2021–2025 questions only through explicit equivalent/subtopic_compatible compatibility edges; no historical LO is selected directly by the lesson UI.',
    learningObjectiveCodes:[...targets],
    checkpointLabel:targets.join(' · '),
    sourceElements:[
      ...(slide.sourceElements??[]),
      'Current 2026–2028 LO target → explicit compatibility graph → approved 2021–2025 QP leaves',
    ],
  };
};

export const applyCurrent9618CheckpointTargets=(chapter:HodderLessonChapter):HodderLessonChapter=>({
  ...chapter,
  coverage:`${chapter.coverage} · live checkpoints target current 2026–2028 LOs`,
  slides:chapter.slides.map(currentTargetSlide),
});
