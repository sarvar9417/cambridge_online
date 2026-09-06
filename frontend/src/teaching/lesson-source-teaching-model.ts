import { sourceAtomsForChapter, sourceAtomsForSlide } from './lesson-source-atom-registry';
import { CHAPTER_7_SOURCE_ATOMS, type Chapter7SourceAtomKind } from './chapter7-source-atoms';
import { CHAPTER_7_SOURCE_ACTIVITY_ATOMS } from './chapter7-source-activity-atoms';
import { CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS } from './chapter7-source-pdf-detail';

export type SourceTeachingChapter = 1 | 7 | 13;
export type SourceTeachingKind =
  | 'objective'
  | 'prior'
  | 'concept'
  | 'keyword'
  | 'example'
  | 'activity'
  | 'extension'
  | 'table'
  | 'figure'
  | 'review'
  | 'exam';

export type SourceTeachingAtom = {
  id: string;
  chapter: SourceTeachingChapter;
  page: number;
  pageLabel: string;
  kind: SourceTeachingKind;
  sourceRef: string;
  targetSlideId: string;
  lines: string[];
};

const chapter7Atoms = [
  ...CHAPTER_7_SOURCE_ATOMS,
  ...CHAPTER_7_SOURCE_ACTIVITY_ATOMS,
  ...CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS,
];

const printedPage = (chapter: 1 | 13, page: number) => chapter === 13 ? page + 303 : page;

const normalize9618 = (chapter: 1 | 13, slideId?: string): SourceTeachingAtom[] => {
  const atoms = slideId ? sourceAtomsForSlide(slideId).filter((item) => item.chapter === chapter) : sourceAtomsForChapter(chapter);
  return atoms.map((item) => {
    const page = printedPage(chapter, item.page);
    return {
      id: item.id,
      chapter,
      page,
      pageLabel: `Hodder p.${page}`,
      kind: item.kind,
      sourceRef: item.sourceRef,
      targetSlideId: item.targetSlideId,
      lines: item.needles,
    };
  });
};

const normalize0478 = (slideId?: string): SourceTeachingAtom[] => chapter7Atoms
  .filter((item) => !slideId || item.targetSlideId === slideId)
  .map((item) => ({
    id: item.id,
    chapter: 7 as const,
    page: item.printedPage,
    pageLabel: `Coursebook p.${item.printedPage}`,
    kind: item.kind as Chapter7SourceAtomKind,
    sourceRef: item.sourceRef,
    targetSlideId: item.targetSlideId,
    lines: item.needles,
  }));

export const sourceTeachingAtomsForSlide = (chapter: SourceTeachingChapter, slideId: string): SourceTeachingAtom[] => {
  if (chapter === 7) return normalize0478(slideId);
  return normalize9618(chapter, slideId);
};

export const sourceTeachingAtomsForChapter = (chapter: SourceTeachingChapter): SourceTeachingAtom[] => {
  if (chapter === 7) return normalize0478();
  return normalize9618(chapter);
};

export const sourceTeachingKindLabel = (kind: SourceTeachingKind) => {
  switch (kind) {
    case 'objective': return 'CHAPTER OBJECTIVE';
    case 'prior': return 'PRIOR KNOWLEDGE';
    case 'keyword': return 'KEY TERM';
    case 'example': return 'WORKED SOURCE';
    case 'activity': return 'BOOK ACTIVITY';
    case 'extension': return 'EXTENSION';
    case 'table': return 'SOURCE TABLE / DATA';
    case 'figure': return 'SOURCE FIGURE';
    case 'review': return 'CHAPTER REVIEW';
    case 'exam': return 'EXAM-STYLE SOURCE';
    default: return 'SOURCE EXPLANATION';
  }
};

export const sourceTeachingIsTask = (kind: SourceTeachingKind) =>
  kind === 'prior' || kind === 'activity' || kind === 'extension' || kind === 'review' || kind === 'exam';

export const sourceTeachingIsWorked = (kind: SourceTeachingKind) => kind === 'example';
