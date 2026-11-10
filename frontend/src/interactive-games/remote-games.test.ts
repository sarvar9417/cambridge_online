import { describe, expect, it } from 'vitest';
import { scrambleTerm } from './game-content';
import {
  createQuizQuestions, createSpeakingPrompts, chapterMatchesGameSearch, visibleGameCatalogEntries, gameIsAvailable,
  isAnagramEligible, poolForMode, selectGamePairs, selectModeStage, normalizeGameScopes, toggleNarrowScope,
  DEFAULT_GAME_LENGTH, GAME_LENGTHS, type LiveGameTerm,
} from './remote-games';

const term = (id: number, word: string): LiveGameTerm => ({
  id: String(id), term: word, definition: 'Definition ' + id,
  status: 'needs_review', source: null,
});

describe('Interactive Games robust production catalogue selection', () => {
  it('finds chapters by exact topic and Hodder section codes even when titles do not contain them', () => {
    const chapter = {
      chapterNo: 17, title: 'Security', termCount: 100, approvedCount: 0,
      topics: [{ code: '17.1', title: 'Threats to security', termCount: 50 }],
      sections: [
        { code: '17.2', title: 'Symmetric encryption', parentCode: null, termCount: 30 },
        { code: '17.2.1', title: 'Cryptography', parentCode: '17.2', termCount: 10 },
      ],
    };
    expect(chapterMatchesGameSearch(chapter, '17.2')).toBe(true);
    expect(chapterMatchesGameSearch(chapter, '17.2.1')).toBe(true);
    expect(chapterMatchesGameSearch(chapter, '17.1')).toBe(true);
    expect(chapterMatchesGameSearch(chapter, ' CRYPTOGRAPHY ')).toBe(true);
    expect(chapterMatchesGameSearch(chapter, 'chapter 17')).toBe(true);
    expect(chapterMatchesGameSearch(chapter, '19.9')).toBe(false);
    expect(chapterMatchesGameSearch(chapter, '')).toBe(true);
  });

  it('limits numeric searches to the exact chapter, preserves source distinctions and removes redundant book roots', () => {
    const chapter = {
      chapterNo: 17, title: 'Security', termCount: 186, approvedCount: 0,
      topics: [{ code: '17.1', title: 'Encryption, Encryption Protocols and Digital certificates', termCount: 186 }],
      sections: [
        { code: '17', title: 'Security', parentCode: null, termCount: 186 },
        { code: '17.1', title: 'Encryption', parentCode: '17', termCount: 51 },
        { code: '17.1.2', title: 'Symmetric encryption', parentCode: '17.1', termCount: 17 },
        { code: '17.2', title: 'Quantum cryptography', parentCode: '17', termCount: 30 },
        { code: '17.3', title: 'Protocols', parentCode: '17', termCount: 54 },
      ],
    };
    expect(chapterMatchesGameSearch(chapter, '17')).toBe(true);
    expect(chapterMatchesGameSearch(chapter, '1')).toBe(false);
    expect(chapterMatchesGameSearch(chapter, 'chapter 1')).toBe(false);
    expect(chapterMatchesGameSearch(chapter, '17.2')).toBe(true);
    expect(visibleGameCatalogEntries(chapter, '17.2').topics).toEqual([]);
    expect(visibleGameCatalogEntries(chapter, '17.2').sections.map((section) => section.code)).toEqual(['17.2']);
    expect(visibleGameCatalogEntries(chapter, '17.1').sections.map((section) => section.code)).toEqual(['17.1', '17.1.2']);
    expect(visibleGameCatalogEntries(chapter, '17.1').topics).toHaveLength(1);
    expect(visibleGameCatalogEntries(chapter, '').sections.some((section) => section.code === '17')).toBe(false);
    expect(visibleGameCatalogEntries(chapter, 'Security').sections.some((section) => section.code === '17')).toBe(false);
  });

  it('keeps overlapping syllabus codes separate but canonicalizes Hodder parent and child selections', () => {
    const broad = { chapterNo: 17, kind: 'topic' as const, code: '17.1' };
    const parent = { chapterNo: 17, kind: 'section' as const, code: '17.1' };
    const child = { chapterNo: 17, kind: 'section' as const, code: '17.1.2' };
    const other = { chapterNo: 17, kind: 'section' as const, code: '17.2' };
    const normalized = normalizeGameScopes([child, parent, broad, other]);
    expect(normalized).toContainEqual(broad);
    expect(normalized).toContainEqual(parent);
    expect(normalized).toContainEqual(other);
    expect(normalized).not.toContainEqual(child);
    expect(toggleNarrowScope([parent, broad], child, true)).toEqual(
      normalizeGameScopes([child, broad]));
    expect(normalizeGameScopes([parent, { ...child, code: '17.10' }])).toHaveLength(2);
  });

  it('builds valid Anagram rounds even when the first 29 terms have no playable words', () => {
    const chapter = Array.from({ length: 35 }, (_, i) => term(i, 'X'.repeat(40) + i));
    chapter.push(term(35, 'DATABASE'), term(36, 'BINARY'), term(37, 'ETHICS'));
    expect(gameIsAvailable('anagram', chapter.slice(0, 29))).toBe(false);
    expect(gameIsAvailable('anagram', chapter)).toBe(true);
    const selected = selectGamePairs(poolForMode(chapter, 'anagram'), 8, 0);
    expect(selected.map((pair) => pair.term)).toEqual(['DATABASE', 'BINARY', 'ETHICS']);
    expect(selected.every((pair) => isAnagramEligible(pair.term))).toBe(true);
    expect(poolForMode(chapter, 'match-up')).toHaveLength(38);
  });

  it('accepts compound terms and digits but rejects impossible or oversized scrambles', () => {
    for (const value of ['A', 'AAAA', 'X'.repeat(30), '!', 'A 😊']) {
      expect(isAnagramEligible(value)).toBe(false);
    }
    for (const value of ['SQL', '3NF', 'RAM/ROM', 'Primary key', 'Python-3']) {
      expect(isAnagramEligible(value)).toBe(true);
    }
    expect(isAnagramEligible('LEVEL')).toBe(true);
    expect(scrambleTerm('ABBA')).not.toBe('ABBA');
    expect([...scrambleTerm('ABBA')].sort()).toEqual([...('ABBA')].sort());
  });

  it('defaults to 30 and offers 10, 20, 30 and larger rounds rather than a 29-term ceiling', () => {
    expect(DEFAULT_GAME_LENGTH).toBe(30);
    expect(GAME_LENGTHS).toContain(10);
    expect(GAME_LENGTHS).toContain(20);
    expect(GAME_LENGTHS).toContain(30);
    expect(GAME_LENGTHS).toContain(40);
    expect(GAME_LENGTHS).toContain(50);
    expect(GAME_LENGTHS).toContain(100);
    expect(GAME_LENGTHS).toContain(500);
    expect(GAME_LENGTHS).not.toContain(29);
    const terms = Array.from({ length: 75 }, (_, index) => term(index, 'TERM-' + index));
    expect(selectGamePairs(terms, DEFAULT_GAME_LENGTH, 0)).toHaveLength(30);
    expect(selectGamePairs(terms, 40, 0)).toHaveLength(40);
    expect(selectGamePairs(terms, 50, 0)).toHaveLength(50);
    expect(selectGamePairs(terms, 100, 0)).toHaveLength(75);
    expect(new Set(selectGamePairs(terms, 100, 0).map((pair) => pair.id)).size).toBe(75);
  });

  it('cycles each supplied vocabulary term through fair limited rounds', () => {
    const terms = Array.from({ length: 75 }, (_, index) => term(index, 'TERM' + index));
    const pages = [0, 1, 2].flatMap((round) => selectGamePairs(terms, 29, round).map((pair) => pair.id));
    expect(new Set(pages).size).toBe(75);
    expect(pages).toHaveLength(87);
    expect(selectGamePairs(terms, 29, 0)).toHaveLength(29);
    expect(selectGamePairs(terms, 29, 999)).toHaveLength(29);
  });

  it('generates review-only speaking prompts and a single correct quiz option per definition', () => {
    const pairs = ['Legal', 'Ethics', 'Culture', 'Morality', 'Privacy', 'Plagiarism'].map((x, i) => term(i, x));
    const prompts = createSpeakingPrompts(pairs);
    expect(prompts).toHaveLength(pairs.length);
    expect(prompts[0]).toMatchObject({ prompt: pairs[0]!.definition, talkingPoints: 'Legal' });
    const questions = createQuizQuestions(pairs);
    expect(questions).toHaveLength(pairs.length);
    for (const question of questions) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
      expect(question.answerIndex).toBeLessThan(4);
    }
    expect(gameIsAvailable('quiz', pairs.slice(0, 1))).toBe(false);
    expect(gameIsAvailable('quiz', pairs.slice(0, 2))).toBe(false);
    expect(createQuizQuestions(pairs.slice(0, 2))).toEqual([]);
    expect(gameIsAvailable('find-the-match', pairs.slice(0, 1))).toBe(false);
    expect(gameIsAvailable('quiz', pairs)).toBe(true);
  });

  it('does not classify an ambiguous four-option question as playable', () => {
    const pairs = [
      { ...term(1, 'A'), definition: 'Same' },
      { ...term(2, 'B'), definition: 'Same' },
      { ...term(3, 'C'), definition: 'Other' },
      { ...term(4, 'D'), definition: 'Third' },
    ];
    expect(gameIsAvailable('quiz', pairs)).toBe(false);
    expect(gameIsAvailable('find-the-match', pairs)).toBe(true);
    expect(poolForMode(pairs, 'quiz')).toHaveLength(3);
    expect(gameIsAvailable('quiz', [...pairs, term(5, 'Extra')])).toBe(true);
    expect(poolForMode([...pairs, term(5, 'Extra')], 'quiz')).toHaveLength(4);
  });
  it('stages 500 selected questions in readable blocks while preserving each source term once', () => {
    const terms = Array.from({ length: 520 }, (_, index) => term(index, 'Term ' + index));
    const blocks = Array.from({ length: 10 }, (_, round) => selectModeStage(terms, 500, round, 'quiz'));
    expect(blocks.map((items) => items.length)).toEqual(Array(10).fill(50));
    expect(new Set(blocks.flat().map((item) => item.id)).size).toBe(500);
    expect(selectModeStage(terms, 500, 10, 'quiz').map((item) => item.id))
      .toEqual(blocks[0]!.map((item) => item.id));
    const wheelBlocks = [0, 1, 2, 3].map((round) => selectModeStage(terms, 100, round, 'spin-wheel'));
    expect(wheelBlocks.map((items) => items.length)).toEqual([30, 30, 30, 10]);
    expect(new Set(wheelBlocks.flat().map((item) => item.id)).size).toBe(100);
    expect(selectModeStage(terms, 20, 0, 'quiz')).toHaveLength(20);
    expect(selectModeStage(terms, 30, 0, 'match-up')).toHaveLength(30);
    expect(selectModeStage(terms, 100, 0, 'open-box')).toHaveLength(30);
  });

  it('keeps duplicate definitions from disabling the entire four-choice Quiz', () => {
    const values = [
      { ...term(1, 'A'), definition: 'One shared definition' },
      { ...term(2, 'B'), definition: 'One shared definition' },
      { ...term(3, 'C'), definition: 'Definition C' },
      { ...term(4, 'D'), definition: 'Definition D' },
      { ...term(5, 'E'), definition: 'Definition E' },
    ];
    expect(gameIsAvailable('quiz', values)).toBe(true);
    const filtered = poolForMode(values, 'quiz');
    expect(filtered).toHaveLength(4);
    const questions = createQuizQuestions(filtered);
    expect(questions).toHaveLength(4);
    expect(questions.every((question) => new Set(question.options).size === 4)).toBe(true);
  });

});
