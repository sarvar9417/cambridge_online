import { BOOK_COMPLETENESS_BASELINES, type BookAuditChapter, type BookFeatureAnchor } from './book-completeness-baseline';
import { sourceAtomsForChapter } from './lesson-source-atom-registry';
import { CHAPTER_7_ALL_SOURCE_ATOMS } from './chapter7-source-atom-complete';
import { CHAPTER_7_SOURCE_KEY_TERMS } from './chapter7-source-keyterms';
import {
  CHAPTER_1_SOURCE_FILE_MANIFEST,
  CHAPTER_7_SOURCE_FILE_MANIFEST,
  CHAPTER_13_SOURCE_FILE_MANIFEST,
} from './source-file-fidelity-manifest';
import { lessonChapter } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';

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
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const ch7KeyTermText = CHAPTER_7_SOURCE_KEY_TERMS
  .map((item) => `${item.term} ${item.definition}`)
  .join(' ');

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

function categoryFromMissing(expected: number, missing: string[]): BookCompletenessCategory {
  const covered = Math.max(0, expected - missing.length);
  return { expected, covered, missing, complete: missing.length === 0 && covered === expected };
}

function anchorCategory(chapter: BookAuditChapter, anchors: readonly BookFeatureAnchor[]) {
  const missing = anchors
    .filter(({ page, anchor }) => !pageSourceText(chapter, page).includes(normalise(anchor)))
    .map(({ page, anchor }) => `p.${page}: ${anchor}`);
  return categoryFromMissing(anchors.length, missing);
}

function globalAnchorCategory(chapter: BookAuditChapter, anchors: readonly string[]) {
  const source = globalSourceText(chapter);
  const missing = anchors.filter((anchor) => !source.includes(normalise(anchor)));
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

function checkpointCategory(chapter: BookAuditChapter, expected: number) {
  const count = chapter === 7
    ? CHAPTER_7.slides.filter((slide) => slide.examPractice && Boolean(slide.learningObjectiveCodes?.length)).length
    : (lessonChapter(chapter)?.slides ?? []).filter((slide) => slide.examPractice && Boolean(slide.learningObjectiveCodes?.length)).length;
  const missing = count === expected ? [] : [`checkpoint count ${count} != ${expected}`];
  return { expected, covered: Math.min(count, expected), missing, complete: count === expected };
}

function buildAudit(chapter: BookAuditChapter): BookCompletenessAudit {
  const baseline = BOOK_COMPLETENESS_BASELINES[chapter];
  const categories: Record<string, BookCompletenessCategory> = {
    source_page_fingerprints: pageFingerprintCategory(chapter, baseline.pageCount),
    chapter_objectives: anchorCategory(chapter, baseline.objectiveAnchors),
    prior_knowledge: anchorCategory(chapter, baseline.priorKnowledgeAnchors),
    key_terms: globalAnchorCategory(chapter, baseline.keyTerms),
    worked_examples: anchorCategory(chapter, baseline.examples),
    activities: anchorCategory(chapter, baseline.activities),
    extension_activities: anchorCategory(chapter, baseline.extensionActivities),
    figures: anchorCategory(chapter, baseline.figures),
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
