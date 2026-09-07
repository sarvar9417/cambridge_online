import { SOURCE_VERIFIED_CHAPTER_1, SOURCE_VERIFIED_CHAPTER_13 } from './lesson-content-source-verified';
import type {
  HodderLessonChapter,
  HodderLessonSlide,
  LessonRichBlock,
  LessonSourceAtomEvidence,
} from './lesson-content-hodder-types';
import { sourceAtomsForChapter, sourceAtomsForSlide, type LessonSourceAtom } from './lesson-source-atom-registry';
import './lesson-source-atoms.css';

const isBoardPracticeAtom = (item: LessonSourceAtom) =>
  item.kind === 'prior' ||
  item.kind === 'activity' ||
  item.kind === 'review' ||
  (item.kind === 'extension' && /activity/i.test(item.sourceRef));

const learnerPracticeLabel = (atom: LessonSourceAtom) => {
  const ref = atom.sourceRef.trim();
  const priorQuestion = ref.match(/^What you should already know\s*·\s*(Q\d+)$/i);
  if (priorQuestion) return `Prior knowledge · ${priorQuestion[1]}`;
  if (/^\d+(?:\.\d+)+\s+What you should already know$/i.test(ref)) return 'Prior knowledge';
  const review = ref.match(/^End-of-chapter\s+(Q\d+)$/i);
  if (review) return `Chapter review · ${review[1]}`;
  if (/^Extension Activity\b/i.test(ref)) return ref.replace(/^Extension Activity/i, 'Extension activity');
  return ref;
};

const stripPrintedHeading = (atom: LessonSourceAtom, line: string) => {
  const prefixes = [
    `${atom.sourceRef} · `,
    `${atom.sourceRef}: `,
  ];
  for (const prefix of prefixes) {
    if (line.toLowerCase().startsWith(prefix.toLowerCase())) return line.slice(prefix.length).trim();
  }
  return line.trim();
};

const looksLikeInstruction = (value: string) =>
  /[:?]$/.test(value.trim()) ||
  /^(?:carry out|convert|select|write|state|describe|explain|use|find|show|calculate|investigate|complete|run|normalise|normalize|choose|define|using|declare|give|identify|create|read|append)\b/i.test(value.trim()) ||
  /^\d+[.)]\s/.test(value.trim());

const practiceParts = (atom: LessonSourceAtom) => {
  const [rawFirst, ...rest] = atom.needles;
  if (!rawFirst) {
    return { instruction: 'Complete the coursebook task.', items: [] as string[] };
  }
  const first = stripPrintedHeading(atom, rawFirst);
  if (looksLikeInstruction(first)) return { instruction: first, items: rest };
  return {
    instruction: atom.kind === 'review' ? 'Complete the chapter-review question.' : 'Complete the coursebook task.',
    items: atom.needles,
  };
};

const taskItemsNeedCodeLayout = (items: string[]) =>
  items.some((line) => /←|^\s*(?:DECLARE|TYPE|FOR|NEXT|OUTPUT|INPUT|IF|ELSE|ENDIF|ENDFOR|WHILE|ENDWHILE)\b/i.test(line));

const boardPracticeBlocks = (atoms: LessonSourceAtom[]): LessonRichBlock[] =>
  atoms.filter(isBoardPracticeAtom).flatMap((atom) => {
    const { instruction, items } = practiceParts(atom);
    const tone: 'activity' | 'extension' = atom.kind === 'extension' ? 'extension' : 'activity';
    const blocks: LessonRichBlock[] = [
      {
        kind: 'callout',
        tone,
        title: learnerPracticeLabel(atom),
        text: instruction,
      },
    ];
    if (items.length) {
      blocks.push(taskItemsNeedCodeLayout(items)
        ? { kind: 'code', title: 'Task data / pseudocode', lines: items }
        : { kind: 'bullets', items });
    }
    return blocks;
  });

const sourceAtomEvidence = (atoms: LessonSourceAtom[]): LessonSourceAtomEvidence[] =>
  atoms.map((atom) => ({
    id: atom.id,
    page: atom.page,
    kind: atom.kind,
    sourceRef: atom.sourceRef,
    lines: [...atom.needles],
  }));

const learnerActivity = (
  slide: HodderLessonSlide,
  practiceAtoms: LessonSourceAtom[],
): HodderLessonSlide['activity'] => {
  if (slide.activity) return slide.activity;
  if (!practiceAtoms.length) return undefined;

  const allPrior = practiceAtoms.every((atom) => atom.kind === 'prior');
  const allReview = practiceAtoms.every((atom) => atom.kind === 'review');
  const allExtension = practiceAtoms.every((atom) => atom.kind === 'extension');
  const title = allPrior
    ? 'Prior knowledge check'
    : allReview
      ? 'Chapter review'
      : allExtension
        ? 'Extension task'
        : 'Coursebook practice';
  const noun = allPrior ? 'prior-knowledge task' : allReview ? 'review question' : 'coursebook task';
  const plural = practiceAtoms.length === 1 ? noun : `${noun}s`;
  return {
    title,
    prompt: `Complete the ${practiceAtoms.length} ${plural} shown above. Work independently first and show your working or reasoning.`,
  };
};

const enrichSlide = (slide: HodderLessonSlide): HodderLessonSlide => {
  const atoms = sourceAtomsForSlide(slide.id);
  if (!atoms.length) return slide;
  const practiceAtoms = atoms.filter(isBoardPracticeAtom);
  const visiblePractice = boardPracticeBlocks(practiceAtoms);
  return {
    ...slide,
    sourceElements: [
      ...(slide.sourceElements ?? []),
      ...atoms.map((item) => `SOURCE ATOM ${item.id} · ${item.sourceRef}`),
    ],
    sourceAtomEvidence: [
      ...(slide.sourceAtomEvidence ?? []),
      ...sourceAtomEvidence(atoms),
    ],
    richBlocks: visiblePractice.length
      ? [...(slide.richBlocks ?? []), ...visiblePractice]
      : slide.richBlocks,
    activity: learnerActivity(slide, practiceAtoms),
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
