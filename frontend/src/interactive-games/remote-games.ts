import { findMatchOptions, gamePairProvenance, type GamePair, type GameKind, type QuizQuestion, type SpeakingPrompt } from './game-content';

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
  /** Verified book-defined term, not merely a curriculum concept. */
  isOfficialKeyTerm?: boolean;
  /** Independent content-QA state, separate from database workflow approval. */
  definitionEvidenceStatus?: 'official_textbook_definition'
    | 'supplementary_source_screened' | 'supplementary_targeted_verified'
    | 'supplementary_manual_review_required' | 'unclassified';
}
export type GameVocabularyQuality = 'core' | 'extended';

/**
 * Do not mistake PostgreSQL workflow "approved" for textbook verification.
 * The default core game bank admits only official Hodder Key Terms and
 * individually verified supplementary terms. Broad source-screened concepts
 * require a deliberate Extended selection; manual-review entries never
 * become answer choices while their evidence remains unresolved.
 *
 * Older APIs without any evidence metadata are preserved for compatibility
 * instead of silently discarding their learning content.
 */
export function selectQualityGameTerms(pairs:readonly LiveGameTerm[], quality:GameVocabularyQuality):LiveGameTerm[] {
  const hasEvidenceMetadata=pairs.some(pair=>pair.isOfficialKeyTerm!==undefined||
    pair.definitionEvidenceStatus!==undefined);
  if(!hasEvidenceMetadata)return [...pairs];
  return pairs.filter(pair=>{
    if(pair.status==='needs_review'||pair.definitionEvidenceStatus==='supplementary_manual_review_required')return false;
    if(quality==='extended')return true;
    return pair.isOfficialKeyTerm===true ||
      pair.definitionEvidenceStatus==='official_textbook_definition' ||
      pair.definitionEvidenceStatus==='supplementary_targeted_verified';
  });
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
  const values = [...selected.values()];
  return values.filter((scope) => scope.kind !== 'section' || !values.some((parent) =>
    parent.chapterNo === scope.chapterNo && parent.kind === 'section' && parent.code &&
    scope.code?.startsWith(parent.code + '.') && parent.code !== scope.code))
    .sort((a, b) =>
      a.chapterNo - b.chapterNo || a.kind.localeCompare(b.kind) || (a.code ?? '').localeCompare(b.code ?? '', 'en', { numeric: true }));
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
  return normalizeGameScopes([...other.filter((scope) =>
    !(scope.chapterNo === next.chapterNo &&
      (scope.kind === 'chapter' ||
        (next.kind === 'section' && scope.kind === 'section' && scope.code &&
          next.code?.startsWith(scope.code + '.'))))), next]);
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

/** Default to a 30-term round; preset sizes can go much higher than 29.
 * Custom counts use the actual selected vocabulary pool rather than a fixed ceiling.
 */
export const DEFAULT_GAME_LENGTH = 30;
export const GAME_LENGTHS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 400, 500,
] as const;
export type GameLength = typeof GAME_LENGTHS[number];

/** Keep spaces and punctuation visible while arranging letters and digits. */
export function isAnagramTile(character: string): boolean {
  return /^[A-Z0-9]$/i.test(character);
}

export function isAnagramEligible(term: string): boolean {
  const tiles = [...term.toUpperCase()].filter(isAnagramTile);
  return !/[^a-z0-9\s()./+–-]/i.test(term) && tiles.length >= 2 && tiles.length <= 36 && new Set(tiles).size > 1;
}

/** Each distractor must be distinguishable by both its term and its definition.
 * Duplicate labels are excluded from multiple-choice rounds rather than causing
 * the whole chapter's Quiz mode to disappear.
 */
function answerEvidenceRank(pair: GamePair): number {
  const entry = pair as Partial<LiveGameTerm>;
  if (entry.isOfficialKeyTerm && entry.definitionEvidenceStatus === 'official_textbook_definition') return 0;
  if (entry.definitionEvidenceStatus === 'supplementary_targeted_verified') return 1;
  if (entry.definitionEvidenceStatus === 'supplementary_source_screened') return 2;
  if (entry.definitionEvidenceStatus === 'supplementary_manual_review_required') return 5;
  return entry.status === 'needs_review' ? 4 : 3;
}

function uniqueAnswerPairs<T extends GamePair>(pairs: readonly T[]): T[] {
  const terms = new Set<string>();
  const definitions = new Set<string>();
  // Prefer explicitly verified source entries when several chapters use the
  // same answer label. Stable sort preserves the supplied order on ties.
  const preferred = [...pairs].sort((a, b) => answerEvidenceRank(a) - answerEvidenceRank(b));
  return preferred.filter((pair) => {
    const termKey = pair.term.trim().toLocaleLowerCase('en');
    const definitionKey = pair.definition.trim().toLocaleLowerCase('en');
    if (!termKey || !definitionKey || terms.has(termKey) || definitions.has(definitionKey)) return false;
    terms.add(termKey);
    definitions.add(definitionKey);
    return true;
  });
}

export function gameIsAvailable(mode: GameKind, pairs: readonly GamePair[]) {
  if (!pairs.length) return false;
  switch (mode) {
    case 'quiz':
      return uniqueAnswerPairs(pairs).length >= 4;
    case 'find-the-match':
      return uniqueAnswerPairs(pairs).length >= 2;
    case 'anagram':
      return pairs.some((pair) => isAnagramEligible(pair.term));
    default:
      return true;
  }
}

export function poolForMode(pairs: readonly LiveGameTerm[], mode: GameKind): LiveGameTerm[] {
  // All chapter-specific meanings remain accessible in reveal-only cards.
  // In games with a single answer key, duplicated terms or definitions would
  // otherwise introduce competing, indistinguishable correct choices.
  if (mode === 'flash-cards' || mode === 'speaking-cards') return [...pairs];
  if (mode === 'anagram') return uniqueAnswerPairs(pairs.filter((pair) => isAnagramEligible(pair.term)));
  return uniqueAnswerPairs(pairs);
}

/** Big banks stay selectable while the visual stage has a manageable workload.
 * A full requested subset is sampled from the ENTIRE selected bank first.
 * Consecutive stages share the same sampled subset without repeats.
 */
export const GAME_STAGE_LIMITS: Partial<Record<GameKind, number>> = {
  'match-up': 30,
  'spin-wheel': 30,
  'open-box': 30,
  'find-the-match': 30,
  'quiz': 50,
  'anagram': 50,
  'flash-cards': 50,
  'speaking-cards': 50,
};
export function selectModeStage(
  pairs: readonly LiveGameTerm[], requested: number, round: number, mode: GameKind, selectionSeed?: number,
) {
  const limit = GAME_STAGE_LIMITS[mode];
  const count = Math.min(requested, pairs.length);
  if (!limit || count <= limit) return selectGamePairs(pairs, requested, round, selectionSeed);
  const stages = Math.ceil(count / limit);
  const cycle = Math.floor(round / stages);
  const stage = ((round % stages) + stages) % stages;
  const selected = selectGamePairs(pairs, requested, cycle, selectionSeed);
  return selected.slice(stage * limit, (stage + 1) * limit);
}

/** Same source terms, different game mechanics. No generated false definitions. */
export function createSpeakingPrompts(pairs: readonly GamePair[]): SpeakingPrompt[] {
  return pairs.map((pair) => ({
    id: 'speaking-' + pair.id,
    prompt: pair.definition,
    talkingPoints: pair.term,
    sourceContext: gamePairProvenance(pair) || undefined,
  }));
}

/**
 * A glossary-pair quiz asks for a term matching the displayed definition.
 * Uses one correct term and up to three other source-backed
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
      options: choices.map((choice) => choice.term),
      answerIndex,
      explanation: pair.term + ' — ' + pair.definition,
      sourceContext: gamePairProvenance(pair) || undefined,
    };
  });
}

/** A local PRNG keeps a full-bank shuffle stable across consecutive rounds.
 * The source selection determines the seed; only a completed bank starts a
 * fresh randomized traversal.
 */
function seededGameRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Draw from one randomly shuffled FULL bank, rather than reshuffling the same
 * alphabetic prefix on every round. Consecutive rounds visit fresh entries
 * before wrapping; staged games take consecutive, non-overlapping slices of
 * the same random draw.
 *
 * When the selected bank fits entirely in a round, it cannot yield different
 * vocabulary. A new round still visibly reshuffles the same terms.
 */
export function selectGamePairs(
  pairs: readonly LiveGameTerm[], length: number, round: number, selectionSeed?: number,
): LiveGameTerm[] {
  if (length <= 0 || !pairs.length) return [];
  const size = pairs.length;
  const count = Math.min(size, length);
  const index = Math.max(0, Math.floor(round));
  const epoch = size <= length ? 0 : Math.floor(index * count / size);
  const random = selectionSeed === undefined
    ? Math.random
    : seededGameRandom((selectionSeed ^ Math.imul(epoch + 1, 0x9E3779B9)) >>> 0);
  const shuffled = [...pairs];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const other = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[other]] = [shuffled[other]!, shuffled[i]!];
  }

  if (size <= length) {
    // Always shuffle even on the FIRST round. Source rows arrive alphabetically
    // ordered; returning [...pairs] here made an 8-Chapter Match Up start at A.
    if (size === 1) return shuffled;
    // An unlikely identity permutation should not leave a full-bank round
    // looking alphabetically sorted.
    if (shuffled.every((pair, i) => pair.id === pairs[i]!.id)) {
      shuffled.push(shuffled.shift()!);
    }
    const offset = index % size;
    return [...shuffled.slice(offset), ...shuffled.slice(0, offset)];
  }

  const start = (index * count) % size;
  return Array.from({ length: count }, (_, i) => shuffled[(start + i) % size]!);
}
