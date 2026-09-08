import { BOOK_COMPLETENESS_BASELINES, type BookAuditChapter, type BookFeatureAnchor } from './book-completeness-baseline';
import { sourceAtomsForChapter } from './lesson-source-atom-registry';
import { CHAPTER_7_ALL_SOURCE_ATOMS } from './chapter7-source-atom-complete';
import { CHAPTER_7_SOURCE_KEY_TERMS } from './chapter7-source-keyterms';
import { CHAPTER_7_SOURCE_MAP } from './chapter7-book-coverage';
import { CHAPTER_7_PAST_PAPER_CHECKPOINTS } from './chapter7-past-paper-checkpoints';
import { CHAPTER_7_COURSEBOOK_PAGE_SLIDES, coursebookPageSlides9618 } from './coursebook-page-slides';
import { rawPdfEmphasisForChapter } from './raw-pdf-emphasis-baseline';
import { sourceSemanticFidelityCategories } from './source-semantic-fidelity-gate';
import {
  CHAPTER_1_SOURCE_FILE_MANIFEST,
  CHAPTER_7_SOURCE_FILE_MANIFEST,
  CHAPTER_13_SOURCE_FILE_MANIFEST,
} from './source-file-fidelity-manifest';
import { lessonChapter } from './lesson-content-source-complete';

export type BookCompletenessCategory = {
  expected: number;
  covered: number;
  missing: string[];
  complete: boolean;
};

export type BookCompletenessAudit = {
  chapter: BookAuditChapter;
  checksExpected: number;
  checksCovered: number;
  complete: boolean;
  categories: Record<string, BookCompletenessCategory>;
};

const normalise = (value: string) => value
  .normalize('NFKC')
  .replace(/[’‘]/g, "'")
  .replace(/[–—−]/g, '-')
  .replace(/…/g, '...')
  .replace(/\\"/g, '"')
  .replace(/\\\\/g, '\\')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const ch7KeyTermText = CHAPTER_7_SOURCE_KEY_TERMS
  .map((item) => `${item.term} ${item.definition}`)
  .join(' ');

const ch7FigureMap = CHAPTER_7_SOURCE_MAP.figures as Record<string, string>;

function chapterAtoms(chapter: BookAuditChapter) {
  return chapter === 7 ? CHAPTER_7_ALL_SOURCE_ATOMS : sourceAtomsForChapter(chapter);
}

function atomPrintedPage(chapter: BookAuditChapter, atom: ReturnType<typeof chapterAtoms>[number]) {
  if (chapter === 7) return (atom as (typeof CHAPTER_7_ALL_SOURCE_ATOMS)[number]).printedPage;
  const page = (atom as ReturnType<typeof sourceAtomsForChapter>[number]).page;
  return chapter === 13 ? page + 303 : page;
}

function atomText(atom: ReturnType<typeof chapterAtoms>[number]) {
  return normalise(`${atom.sourceRef} ${atom.needles.join(' ')}`);
}

function globalSourceText(chapter: BookAuditChapter) {
  const atomContent = chapterAtoms(chapter).map(atomText).join(' ');
  return chapter === 7 ? `${atomContent} ${normalise(ch7KeyTermText)}` : atomContent;
}

function pageSourceText(chapter: BookAuditChapter, page: number) {
  const content = chapterAtoms(chapter)
    .filter((atom) => atomPrintedPage(chapter, atom) === page)
    .map(atomText)
    .join(' ');
  return chapter === 7 && page === 294 ? `${content} ${normalise(ch7KeyTermText)}` : content;
}

function pageHasKind(chapter: BookAuditChapter, page: number, kind: string) {
  return chapterAtoms(chapter).some((atom) => atomPrintedPage(chapter, atom) === page && atom.kind === kind);
}

const SOURCE_EQUIVALENT_ANCHORS: Record<string, readonly string[]> = {
  'mpeg-3 (mp3)': ['mp3/mp4 files', 'mp3'],
  'mpeg-4 (mp4)': ['mp3/mp4 files', 'mp4'],
  'vector graphic images': ['vector graphics', 'vector formats'],
  'binary floating-point representation': ['binary floating-point number'],
  'positive number': ['positive normalised mantissa', 'positive normalised mantissas'],
  'negative number': ['negative normalised mantissa', 'negative normalised mantissas'],
  'maximum positive number': ['maximum positive:'],
  'smallest positive number': ['smallest positive:'],
  'smallest magnitude negative number': ['smallest-magnitude negative:'],
  'largest magnitude negative number': ['largest-magnitude negative:'],
};

function sourceContainsAnchor(sourceValue: string, anchorValue: string) {
  const source = normalise(sourceValue);
  const anchor = normalise(anchorValue);
  if (source.includes(anchor)) return true;

  const aliases = SOURCE_EQUIVALENT_ANCHORS[anchor] ?? [];
  if (aliases.some((alias) => source.includes(normalise(alias)))) return true;

  const target = anchor.match(/^(figure|example|table)\s+(?:(\d+)\.)?(\d+)$/);
  if (!target) return false;
  const [, kind, targetMajor, targetMinorRaw] = target;
  const targetMinor = Number(targetMinorRaw);
  const rangePattern = new RegExp(`\\b${kind}s?\\s+(?:(\\d+)\\.)?(\\d+)\\s*-\\s*(?:(\\d+)\\.)?(\\d+)`, 'g');
  for (const match of source.matchAll(rangePattern)) {
    const startMajor = match[1] ?? '';
    const startMinor = Number(match[2]);
    const endMajor = match[3] ?? startMajor;
    const endMinor = Number(match[4]);
    if ((targetMajor ?? '') !== startMajor || (targetMajor ?? '') !== endMajor) continue;
    if (targetMinor >= Math.min(startMinor, endMinor) && targetMinor <= Math.max(startMinor, endMinor)) return true;
  }
  return false;
}

function categoryFromMissing(expected: number, missing: string[]): BookCompletenessCategory {
  const covered = Math.max(0, expected - missing.length);
  return { expected, covered, missing, complete: missing.length === 0 && covered === expected };
}

function anchorCategory(chapter: BookAuditChapter, anchors: readonly BookFeatureAnchor[]) {
  const missing = anchors
    .filter(({ page, anchor }) => {
      if (sourceContainsAnchor(pageSourceText(chapter, page), anchor)) return false;
      if (normalise(anchor) === 'extension activity' && pageHasKind(chapter, page, 'extension')) return false;
      return true;
    })
    .map(({ page, anchor }) => `p.${page}: ${anchor}`);
  return categoryFromMissing(anchors.length, missing);
}

function figureCategory(chapter: BookAuditChapter, anchors: readonly BookFeatureAnchor[]) {
  if (chapter !== 7) return anchorCategory(chapter, anchors);
  const missing = anchors
    .filter(({ page, anchor }) => {
      if (sourceContainsAnchor(pageSourceText(chapter, page), anchor)) return false;
      const match = anchor.match(/^Figure\s+(7\.\d+)$/i);
      return !match || !ch7FigureMap[match[1]!];
    })
    .map(({ page, anchor }) => `p.${page}: ${anchor}`);
  return categoryFromMissing(anchors.length, missing);
}

function globalAnchorCategory(chapter: BookAuditChapter, anchors: readonly string[]) {
  const source = globalSourceText(chapter);
  const missing = anchors.filter((anchor) => !sourceContainsAnchor(source, anchor));
  return categoryFromMissing(anchors.length, missing);
}

function pseudocodeCategory(chapter: BookAuditChapter, pages: readonly number[]) {
  const codeSignal = /(?:pseudocode|←|\binput\b|\boutput\b|\bdeclare\b|\btype\b|\bif\b|\bthen\b|\belse\b|\bfor\b|\bwhile\b|\brepeat\b|\buntil\b|\bcase\b|\bnext\b|\bend(?:if|while|case|type)\b)/i;
  const missing = pages
    .filter((page) => !codeSignal.test(pageSourceText(chapter, page)))
    .map((page) => `p.${page}: pseudocode/code evidence`);
  return categoryFromMissing(pages.length, missing);
}

function pageFingerprintCategory(chapter: BookAuditChapter, expected: number) {
  const manifest = chapter === 1
    ? CHAPTER_1_SOURCE_FILE_MANIFEST
    : chapter === 7
      ? CHAPTER_7_SOURCE_FILE_MANIFEST
      : CHAPTER_13_SOURCE_FILE_MANIFEST;
  const sourcePages = new Set(chapterAtoms(chapter).map((atom) => atomPrintedPage(chapter, atom)));
  const missing = manifest.pages
    .filter((page) => !sourcePages.has(page.printedPage))
    .map((page) => `p.${page.printedPage}: source atom coverage`);
  if (manifest.pageCount !== expected) missing.push(`manifest page count ${manifest.pageCount} != ${expected}`);
  if (manifest.pages.length !== expected) missing.push(`fingerprint count ${manifest.pages.length} != ${expected}`);
  return categoryFromMissing(expected, missing);
}

function visibleSlideText(slide: {
  title?: string;
  lead?: string;
  bullets?: string[];
  keyTerms?: Array<{ term: string; definition: string }>;
  formula?: string;
  example?: unknown;
  activity?: unknown;
  richBlocks?: unknown;
}) {
  return normalise(JSON.stringify({
    title: slide.title,
    lead: slide.lead,
    bullets: slide.bullets,
    keyTerms: slide.keyTerms,
    formula: slide.formula,
    example: slide.example,
    activity: slide.activity,
    richBlocks: slide.richBlocks,
  }));
}

/**
 * Typography completeness is a formal source audit. It intentionally reads the
 * deterministic page projection directly rather than requiring that projection
 * to be appended to the active learner route. Active section-first visibility
 * is enforced separately by pdf-first-section-lessons.test.ts.
 */
function rawPdfEmphasisCategory(chapter: BookAuditChapter) {
  const anchors = rawPdfEmphasisForChapter(chapter);
  const pageSlides = chapter === 7 ? CHAPTER_7_COURSEBOOK_PAGE_SLIDES : coursebookPageSlides9618(chapter);
  const missing = anchors.filter((anchor) => {
    const slide = chapter === 7
      ? pageSlides.find((item) => item.id === `ch7-source-page-${anchor.printedPage}`)
      : pageSlides.find((item) => item.id === `h${chapter}-coursebook-page-${String(anchor.page).padStart(2, '0')}`);
    return !slide || !visibleSlideText(slide).includes(normalise(anchor.text));
  }).map((anchor) => `p.${anchor.printedPage}: ${anchor.text}`);
  return categoryFromMissing(anchors.length, missing);
}

function checkpointCategory(chapter: BookAuditChapter, expected: number) {
  const count = chapter === 7
    ? CHAPTER_7_PAST_PAPER_CHECKPOINTS.length
    : (lessonChapter(chapter)?.slides ?? []).filter((slide) => slide.examPractice && Boolean(slide.learningObjectiveCodes?.length)).length;
  const missing = count === expected ? [] : [`checkpoint count ${count} != ${expected}`];
  return { expected, covered: Math.min(count, expected), missing, complete: count === expected };
}

function buildAudit(chapter: BookAuditChapter): BookCompletenessAudit {
  const baseline = BOOK_COMPLETENESS_BASELINES[chapter];
  const categories: Record<string, BookCompletenessCategory> = {
    source_page_fingerprints: pageFingerprintCategory(chapter, baseline.pageCount),
    raw_pdf_emphasis: rawPdfEmphasisCategory(chapter),
    ...sourceSemanticFidelityCategories(chapter),
    chapter_objectives: anchorCategory(chapter, baseline.objectiveAnchors),
    prior_knowledge: anchorCategory(chapter, baseline.priorKnowledgeAnchors),
    key_terms: globalAnchorCategory(chapter, baseline.keyTerms),
    worked_examples: anchorCategory(chapter, baseline.examples),
    activities: anchorCategory(chapter, baseline.activities),
    extension_activities: anchorCategory(chapter, baseline.extensionActivities),
    figures: figureCategory(chapter, baseline.figures),
    tables: anchorCategory(chapter, baseline.tables),
    find_out_more: anchorCategory(chapter, baseline.findOutMore),
    links: anchorCategory(chapter, baseline.links),
    pseudocode: pseudocodeCategory(chapter, baseline.pseudocodePages),
    chapter_review: globalAnchorCategory(chapter, baseline.chapterReviewAnchors),
    semantic_emphasis: globalAnchorCategory(chapter, baseline.semanticEmphasisAnchors),
    past_paper_checkpoints: checkpointCategory(chapter, baseline.expectedCheckpointCount),
  };
  const checksExpected = Object.values(categories).reduce((total, item) => total + item.expected, 0);
  const checksCovered = Object.values(categories).reduce((total, item) => total + item.covered, 0);
  return {
    chapter,
    checksExpected,
    checksCovered,
    complete: Object.values(categories).every((item) => item.complete),
    categories,
  };
}

export const BOOK_COMPLETENESS_AUDITS: Record<BookAuditChapter, BookCompletenessAudit> = {
  1: buildAudit(1),
  7: buildAudit(7),
  13: buildAudit(13),
};

export const bookCompletenessAudit = (chapter: number) =>
  chapter === 1 || chapter === 7 || chapter === 13 ? BOOK_COMPLETENESS_AUDITS[chapter] : null;
