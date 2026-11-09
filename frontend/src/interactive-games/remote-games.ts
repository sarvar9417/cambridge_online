import { findMatchOptions, type GamePair, type GameKind, type QuizQuestion, type SpeakingPrompt } from './game-content';

/** Authenticated game catalogue and packs are sourced directly from PostgreSQL. */
export interface LiveGameSection {
  code: string;
  title: string;
  parentCode: string | null;
  termCount: number;
}
export interface LiveGameChapter {
  chapterNo: number;
  title: string;
  termCount: number;
  approvedCount: number;
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
  chapterNo: number;
  sectionCode: string | null;
  contentStatus: 'approved' | 'needs_review';
  pairs: LiveGameTerm[];
  source: string;
  assessed: false;
}

export const GAME_LENGTHS = [8, 16, 29] as const;
export type GameLength = typeof GAME_LENGTHS[number];

export function gameIsAvailable(mode: GameKind, pairs: readonly GamePair[]) {
  if (!pairs.length) return false;
  switch (mode) {
    case 'quiz': case 'find-the-match': return pairs.length >= 4;
    case 'anagram': return pairs.some((pair) => pair.term.length >= 4 && !pair.term.includes(' '));
    default: return true;
  }
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
