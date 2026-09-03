import { SOURCE_ATOMS, type LessonSourceAtom } from './lesson-source-atoms';
import { PAGE_COMPLETE_SOURCE_ATOMS } from './lesson-source-atoms-page-complete';
import { VISUAL_COMPLETE_SOURCE_ATOMS } from './lesson-source-atoms-visual-complete';

export type { LessonSourceAtom } from './lesson-source-atoms';

export const COMPLETE_SOURCE_ATOMS: LessonSourceAtom[] = [
  ...SOURCE_ATOMS,
  ...PAGE_COMPLETE_SOURCE_ATOMS,
  ...VISUAL_COMPLETE_SOURCE_ATOMS,
];

export const sourceAtomsForChapter = (chapter: 1 | 13) => COMPLETE_SOURCE_ATOMS.filter((item) => item.chapter === chapter);
export const sourceAtomsForSlide = (slideId: string) => COMPLETE_SOURCE_ATOMS.filter((item) => item.targetSlideId === slideId);
