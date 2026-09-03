import { SOURCE_VERIFIED_CHAPTER_1, SOURCE_VERIFIED_CHAPTER_13 } from './lesson-content-source-verified';
import type { HodderLessonChapter, HodderLessonSlide, LessonRichBlock } from './lesson-content-hodder-types';
import { sourceAtomsForChapter, sourceAtomsForSlide, type LessonSourceAtom } from './lesson-source-atom-registry';
import './lesson-source-atoms.css';

const isPracticeAtom = (item: LessonSourceAtom) => ['prior', 'activity', 'extension', 'review'].includes(item.kind);
const isBoardPracticeAtom = (item: LessonSourceAtom) =>
  item.kind === 'prior' ||
  item.kind === 'activity' ||
  item.kind === 'review' ||
  (item.kind === 'extension' && /activity/i.test(item.sourceRef));

const atomDrawerPrompt = (slide: HodderLessonSlide, atoms: LessonSourceAtom[]) => {
  const sourceLines = atoms.flatMap((atom) => [
    `[${atom.sourceRef} · Hodder p.${atom.page}]`,
    ...atom.needles.map((value) => `• ${value}`),
  ]);
  const existingLines = slide.activity
    ? ['[Existing classroom activity]', `• ${slide.activity.title}`, `• ${slide.activity.prompt}`]
    : [];
  return [...existingLines, ...sourceLines].join('\n');
};

const boardPracticeBlocks = (atoms: LessonSourceAtom[]): LessonRichBlock[] =>
  atoms.filter(isBoardPracticeAtom).flatMap((atom) => {
    const [instruction, ...items] = atom.needles;
    const tone: 'activity' | 'extension' = atom.kind === 'extension' ? 'extension' : 'activity';
    const blocks: LessonRichBlock[] = [
      {
        kind: 'callout',
        tone,
        title: `${atom.sourceRef} · Hodder p.${atom.page}`,
        text: instruction ?? `Complete the source task from Hodder p.${atom.page}.`,
      },
    ];
    if (items.length) {
      blocks.push({
        kind: 'code',
        title: `${atom.sourceRef} · exact task data`,
        lines: items,
      });
    }
    return blocks;
  });

const enrichSlide = (slide: HodderLessonSlide): HodderLessonSlide => {
  const atoms = sourceAtomsForSlide(slide.id);
  if (!atoms.length) return slide;
  const practiceCount = atoms.filter(isPracticeAtom).length;
  const title = practiceCount
    ? `BOOK PRACTICE · ${practiceCount} exact Hodder task${practiceCount === 1 ? '' : 's'}`
    : `SOURCE DETAIL · ${atoms.length} exact Hodder atom${atoms.length === 1 ? '' : 's'}`;
  const visiblePractice = boardPracticeBlocks(atoms);
  return {
    ...slide,
    sourceElements: [
      ...(slide.sourceElements ?? []),
      ...atoms.map((item) => `SOURCE ATOM ${item.id} · ${item.sourceRef}`),
    ],
    richBlocks: visiblePractice.length
      ? [...(slide.richBlocks ?? []), ...visiblePractice]
      : slide.richBlocks,
    activity: {
      title,
      prompt: atomDrawerPrompt(slide, atoms),
      reveal: slide.activity?.reveal,
    },
  };
};

const enrichChapter = (chapter: HodderLessonChapter): HodderLessonChapter => {
  const atoms = sourceAtomsForChapter(chapter.number);
  const pages = new Set(atoms.map((item) => item.page));
  const boardPracticeCount = atoms.filter(isBoardPracticeAtom).length;
  return {
    ...chapter,
    coverage: `${chapter.coverage} · ${atoms.length}/${atoms.length} source atoms pinned · ${pages.size}/${chapter.number === 1 ? 26 : 24} atom-audited pages · ${boardPracticeCount}/${boardPracticeCount} source tasks board-visible`,
    slides: chapter.slides.map(enrichSlide),
  };
};

export const SOURCE_ATOM_COMPLETE_CHAPTER_1 = enrichChapter(SOURCE_VERIFIED_CHAPTER_1);
export const SOURCE_ATOM_COMPLETE_CHAPTER_13 = enrichChapter(SOURCE_VERIFIED_CHAPTER_13);
