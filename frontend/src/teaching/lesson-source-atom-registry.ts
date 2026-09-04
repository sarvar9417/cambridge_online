import { SOURCE_ATOMS, type LessonSourceAtom } from './lesson-source-atoms';
import { PAGE_COMPLETE_SOURCE_ATOMS } from './lesson-source-atoms-page-complete';
import { VISUAL_COMPLETE_SOURCE_ATOMS } from './lesson-source-atoms-visual-complete';
import { EXAMPLE_COMPLETE_SOURCE_ATOMS } from './lesson-source-atoms-example-complete';
import { SUPPLIED_PDF_DETAIL_ATOMS } from './lesson-source-atoms-supplied-pdf-detail';
import { SOURCE_ATOM_LINE_OVERRIDES } from './lesson-source-atom-line-overrides';

export type { LessonSourceAtom } from './lesson-source-atoms';

const correctAtom = (item: LessonSourceAtom): LessonSourceAtom => {
  let targetSlideId = item.targetSlideId;
  if (targetSlideId === 'h13-hashing') targetSlideId = 'h13-hash-address';
  if (targetSlideId === 'h13-hodder-review-3') targetSlideId = 'h13-hodder-review-2';
  return {
    ...item,
    targetSlideId,
    needles: SOURCE_ATOM_LINE_OVERRIDES[item.id] ?? item.needles,
  };
};

export const COMPLETE_SOURCE_ATOMS: LessonSourceAtom[] = [
  ...SOURCE_ATOMS,
  ...PAGE_COMPLETE_SOURCE_ATOMS,
  ...VISUAL_COMPLETE_SOURCE_ATOMS,
  ...EXAMPLE_COMPLETE_SOURCE_ATOMS,
  ...SUPPLIED_PDF_DETAIL_ATOMS,
].map(correctAtom);

export const sourceAtomsForChapter = (chapter: 1 | 13) => COMPLETE_SOURCE_ATOMS.filter((item) => item.chapter === chapter);
export const sourceAtomsForSlide = (slideId: string) => COMPLETE_SOURCE_ATOMS.filter((item) => item.targetSlideId === slideId);
