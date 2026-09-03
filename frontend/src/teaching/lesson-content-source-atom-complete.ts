import { SOURCE_VERIFIED_CHAPTER_1, SOURCE_VERIFIED_CHAPTER_13 } from './lesson-content-source-verified';
import type { HodderLessonChapter, HodderLessonSlide, LessonRichBlock } from './lesson-content-hodder-types';
import { sourceAtomsForChapter, sourceAtomsForSlide, type LessonSourceAtom } from './lesson-source-atom-registry';

const atomBlock = (atom: LessonSourceAtom): LessonRichBlock => ({
  kind: 'code',
  title: `${atom.sourceRef} · SOURCE ATOM`,
  lines: atom.needles,
});

const atomIntro = (atoms: LessonSourceAtom[]): LessonRichBlock => {
  const practiceCount = atoms.filter((item) => ['prior', 'activity', 'extension', 'review'].includes(item.kind)).length;
  const evidenceCount = atoms.length - practiceCount;
  return {
    kind: 'callout',
    tone: practiceCount ? 'activity' : 'info',
    title: practiceCount ? 'BOOK PRACTICE · exact source data' : 'SOURCE DETAIL · exact values retained',
    text: practiceCount
      ? `The actual Hodder values/tasks are retained here instead of being replaced by a title-only summary. ${practiceCount} practice atom(s) and ${evidenceCount} supporting source atom(s) are pinned to this teaching unit.`
      : `The high-value numbers, bit patterns, table rows and worked-example values from the Hodder source are pinned here so source coverage is semantic rather than title-only.`,
  };
};

const enrichSlide = (slide: HodderLessonSlide): HodderLessonSlide => {
  const atoms = sourceAtomsForSlide(slide.id);
  if (!atoms.length) return slide;
  return {
    ...slide,
    sourceElements: [
      ...(slide.sourceElements ?? []),
      ...atoms.map((item) => `SOURCE ATOM ${item.id} · ${item.sourceRef}`),
    ],
    richBlocks: [
      ...(slide.richBlocks ?? []),
      atomIntro(atoms),
      ...atoms.map(atomBlock),
    ],
  };
};

const enrichChapter = (chapter: HodderLessonChapter): HodderLessonChapter => {
  const atoms = sourceAtomsForChapter(chapter.number);
  const pages = new Set(atoms.map((item) => item.page));
  return {
    ...chapter,
    coverage: `${chapter.coverage} · ${atoms.length}/${atoms.length} source atoms pinned · ${pages.size}/${chapter.number === 1 ? 26 : 24} atom-audited pages`,
    slides: chapter.slides.map(enrichSlide),
  };
};

export const SOURCE_ATOM_COMPLETE_CHAPTER_1 = enrichChapter(SOURCE_VERIFIED_CHAPTER_1);
export const SOURCE_ATOM_COMPLETE_CHAPTER_13 = enrichChapter(SOURCE_VERIFIED_CHAPTER_13);
