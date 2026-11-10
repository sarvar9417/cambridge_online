import { findMatchOptions, type GamePair, type GameKind, type QuizQuestion, type SpeakingPrompt } from './game-content';

/** Authenticated game catalogue and packs are sourced directly from PostgreSQL. */
export interface LiveGameSection {
  code: string;
  title: string;
  parentCode: string | null;
  termCount: number;
}
export interface LiveGameTopic {
  code: string;
  title: string;
  termCount: number;
}
export type GameScope = {
  chapterNo: number;
  kind: 'chapter' | 'topic' | 'section';
  code?: string;
};
export interface LiveGameChapter {
  chapterNo: number;
  title: string;
  termCount: number;
  approvedCount: number;
  topics: LiveGameTopic[];
  sections: LiveGameSection[];
}
export interface LiveGameCatalog {
  courseCode: '9618' | '0478';
  chapters: LiveGameChapter[];
}
export interface LiveGameTerm extends GamePair {
  status: 'approved' | 'needs_review';
  source: string | null;
}
export interface LiveGamePack {
  courseCode: '9618' | '0478';
  scopes: GameScope[];
  contentStatus: 'approved' | 'needs_review';
  pairs: LiveGameTerm[];
  source: string;
  assessed: false;
}

/** Chapter-wide selection supersedes its narrower topics and sections. */
export function normalizeGameScopes(scopes: readonly GameScope[]): GameScope[] {
  const selected = new Map<string, GameScope>();
  const full = new Set(scopes.filter((scope) => scope.kind === 'chapter').map((scope) => scope.chapterNo));
  for (const scope of scopes) {
    if (scope.kind !== 'chapter' && full.has(scope.chapterNo)) continue;
    selected.set(scope.chapterNo + ':' + scope.kind + ':' + (scope.code ?? ''), scope);
  }
  return [...selected.values()].sort((a, b) =>
    a.chapterNo - b.chapterNo || a.kind.localeCompare(b.kind) || (a.code ?? '').localeCompare(b.code ?? ''));
}
export function selectWholeChapter(scopes: readonly GameScope[], chapterNo: number, checked: boolean) {
  const without = scopes.filter((scope) => scope.chapterNo !== chapterNo);
  return checked ? normalizeGameScopes([...without, { chapterNo, kind: 'chapter' }]) : normalizeGameScopes(without);
}
export function toggleNarrowScope(
  scopes: readonly GameScope[], next: GameScope, checked: boolean,
): GameScope[] {
  const other = scopes.filter((scope) => !(scope.chapterNo === next.chapterNo && scope.kind === next.kind && scope.code === next.code));
  if (!checked) return normalizeGameScopes(other);
  return normalizeGameScopes([...other.filter((scope) => !(scope.chapterNo === next.chapterNo && scope.kind === 'chapter')), next]);
}
export function validGameScopes(scopes: readonly GameScope[], catalog: LiveGameCatalog) {
  return normalizeGameScopes(scopes.filter((scope) => {
    const chapter = catalog.chapters.find((item) => item.chapterNo === scope.chapterNo);
    if (!chapter) return false;
    if (scope.kind === 'chapter') return chapter.termCount > 0;
    if (scope.kind === 'topic') return chapter.topics.some((topic) => topic.code === scope.code && topic.termCount > 0);
    return chapter.sections.some((section) => section.code === scope.code && section.termCount > 0);
  }));
}

/** Syllabus subtopic codes and Hodder section codes can overlap while naming
 * different scopes. Keep each source's entries separate and exclude the book's
 * root chapter item, which duplicates the existing whole-Chapter checkbox.
 */
export function visibleGameCatalogEntries(chapter: LiveGameChapter, query: string) {
  const needle = query.trim().toLocaleLowerCase('en');
  const wholeChapter = !needle || needle === String(chapter.chapterNo)
    || needle === 'chapter ' + chapter.chapterNo
    || chapter.title.toLocaleLowerCase('en').includes(needle);
  const codeOnly = /^\d+(?:\.\d+)+$/.test(needle);
  const matches = (entry: { code: string; title: string }) => {
    if (wholeChapter) return true;
    const code = entry.code.toLocaleLowerCase('en');
    return codeOnly
      ? code === needle || code.startsWith(needle + '.')
      : code.includes(needle) || entry.title.toLocaleLowerCase('en').includes(needle);
  };
  return {
    topics: chapter.topics.filter(matches),
    sections: chapter.sections.filter((section) =>
      section.code !== String(chapter.chapterNo) && matches(section)),
  };
}

/** Numeric chapter search is exact ("1" must not match Chapters 10–19).
 * A specific curriculum code filters its entries rather than merely revealing
 * every subtopic within a matching chapter.
 */
export function chapterMatchesGameSearch(chapter: LiveGameChapter, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('en');
  if (!needle) return true;
  if (/^(?:chapter\s+)?\d+$/.test(needle)) {
    return needle === String(chapter.chapterNo) || needle === 'chapter ' + chapter.chapterNo;
  }
  if (chapter.title.toLocaleLowerCase('en').includes(needle)) return true;
  const visible = visibleGameCatalogEntries(chapter, needle);
  return visible.topics.length > 0 || visible.sections.length > 0;
}

export const GAME_LENGTHS = [8, 16, 29] as const;
export type GameLength = typeof GAME_LENGTHS[number];

/** Keep spaces and punctuation visible while arranging letters and digits. */
export function isAnagramTile(character: string): boolean {
  return /^[A-Z0-9]$/i.test(character);
}

export function isAnagramEligible(term: string): boolean {
  const tiles = [...term.toUpperCase()].filter(isAnagramTile);
  return !/[^a-z0-9\s()./+–-]/i.test(term) && tiles.length >= 2 && tiles.length <= 36 && new Set(tiles).size > 1;
}

export function gameIsAvailable(mode: GameKind, pairs: readonly GamePair[]) {
  if (!pairs.length) return false;
  switch (mode) {
    case 'quiz':
    case 'find-the-match':
      return (mode !== 'quiz' || pairs.length >= 2)
        && new Set(pairs.map((pair) => pair.definition.trim().toLowerCase())).size === pairs.length;
    case 'anagram':
      return pairs.some((pair) => isAnagramEligible(pair.term));
    default:
      return true;
  }
}

export function poolForMode(pairs: readonly LiveGameTerm[], mode: GameKind): LiveGameTerm[] {
  if (mode === 'anagram') return pairs.filter((pair) => isAnagramEligible(pair.term));
  return [...pairs];
}

/** Same source terms, different game mechanics. No generated false definitions. */
export function createSpeakingPrompts(pairs: readonly GamePair[]): SpeakingPrompt[] {
  return pairs.map((pair) => ({
    id: 'speaking-' + pair.id,
    prompt: pair.definition,
    talkingPoints: pair.term,
  }));
}

/**
 * A glossary-pair quiz asks for a term matching the displayed definition.
 * Uses one correct term and up to three other source-backed
 * terms from this SAME selection. Never invent a Cambridge answer.
 */
export function createQuizQuestions(pairs: readonly GamePair[]): QuizQuestion[] {
  if (pairs.length < 2) return [];
  return pairs.map((pair, index) => {
    const choices = findMatchOptions(pairs, index, 2);
    const answerIndex = choices.findIndex((choice) => choice.id === pair.id);
    if (choices.length < 2 || answerIndex < 0) {
      throw new Error('Unable to make a valid source-backed quiz item.');
    }
    return {
      id: 'quiz-' + pair.id,
      prompt: pair.definition,
      options: choices.map((choice) => choice.term),
      answerIndex,
      explanation: pair.term + ' — ' + pair.definition,
    };
  });
}

/** Server can return a complete chapter. Use repeatable rotating windows to
 * prevent UI overload while still allowing every source term to be practiced.
 */
export function selectGamePairs(pairs: readonly LiveGameTerm[], length: number, round: number): LiveGameTerm[] {
  if (pairs.length <= length) return [...pairs];
  const start = (round * length) % pairs.length;
  return Array.from({ length }, (_, index) => pairs[(start + index) % pairs.length]!);
}
