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

/** Search chapter, syllabus topic and book-section *codes* as well as names.
 * A teacher searching "17.2" expects the actual curriculum section to appear.
 */
export function chapterMatchesGameSearch(chapter: LiveGameChapter, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('en');
  if (!needle) return true;
  const values = [
    String(chapter.chapterNo), 'chapter ' + chapter.chapterNo, chapter.title,
    ...chapter.topics.flatMap((topic) => [topic.code, topic.title]),
    ...chapter.sections.flatMap((section) => [section.code, section.title]),
  ];
  return values.some((value) => value.toLocaleLowerCase('en').includes(needle));
}

export const GAME_LENGTHS = [8, 16, 29] as const;
export type GameLength = typeof GAME_LENGTHS[number];

/** Letters are deliberately restricted to short, playable A-Z words.
 * Numbers, punctuation and multi-word terms cannot be meaningfully moved
 * into the current letter-tile UI. Do not silently drop them after game start.
 */
export function isAnagramEligible(term: string): boolean {
  return /^[A-Za-z]{4,22}$/.test(term) && new Set(term.toLowerCase()).size > 1;
}

export function gameIsAvailable(mode: GameKind, pairs: readonly GamePair[]) {
  if (!pairs.length) return false;
  switch (mode) {
    case 'quiz': case 'find-the-match':
      return new Set(pairs.map((pair) => pair.definition.trim().toLowerCase())).size >= 4;
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
    prompt: 'Explain "' + pair.term + '" in your own words.',
    talkingPoints: pair.definition,
  }));
}

/**
 * A glossary-pair quiz asks for a term matching the displayed definition.
 * Uses exactly one correct source-backed term and three other source-backed
 * terms from this SAME selection. Never invent a Cambridge answer.
 */
export function createQuizQuestions(pairs: readonly GamePair[]): QuizQuestion[] {
  if (pairs.length < 4) return [];
  return pairs.map((pair, index) => {
    const choices = findMatchOptions(pairs, index);
    const answerIndex = choices.findIndex((choice) => choice.id === pair.id);
    if (choices.length !== 4 || answerIndex < 0) {
      throw new Error('Unable to make a valid source-backed quiz item.');
    }
    return {
      id: 'quiz-' + pair.id,
      prompt: pair.definition,
      options: choices.map((choice) => choice.term) as [string, string, string, string],
      answerIndex: answerIndex as 0 | 1 | 2 | 3,
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
