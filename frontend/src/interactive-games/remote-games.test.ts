import { describe, expect, it } from 'vitest';
import { scrambleTerm } from './game-content';
import {
  createQuizQuestions, createSpeakingPrompts, gameIsAvailable,
  isAnagramEligible, poolForMode, selectGamePairs, type LiveGameTerm,
} from './remote-games';

const term = (id: number, word: string): LiveGameTerm => ({
  id: String(id), term: word, definition: 'Definition ' + id,
  status: 'needs_review', source: null,
});

describe('Interactive Games robust production catalogue selection', () => {
  it('builds valid Anagram rounds even when the first 29 terms have no playable words', () => {
    const chapter = Array.from({ length: 35 }, (_, i) => term(i, 'multi word ' + i));
    chapter.push(term(35, 'DATABASE'), term(36, 'BINARY'), term(37, 'ETHICS'));
    expect(gameIsAvailable('anagram', chapter.slice(0, 29))).toBe(false);
    expect(gameIsAvailable('anagram', chapter)).toBe(true);
    const selected = selectGamePairs(poolForMode(chapter, 'anagram'), 8, 0);
    expect(selected.map((pair) => pair.term)).toEqual(['DATABASE', 'BINARY', 'ETHICS']);
    expect(selected.every((pair) => isAnagramEligible(pair.term))).toBe(true);
    expect(poolForMode(chapter, 'match-up')).toHaveLength(38);
  });

  it('disables Anagram for non-alphabetic strings and impossible letter scrambles', () => {
    for (const value of ['SQL', 'One two', '3NF', 'RAM/ROM', 'AAAA', 'IP address', 'Python-3', 'X'.repeat(30)]) {
      expect(isAnagramEligible(value)).toBe(false);
    }
    expect(isAnagramEligible('MALWARE')).toBe(true);
    expect(isAnagramEligible('LEVEL')).toBe(true);
    expect(scrambleTerm('ABBA')).not.toBe('ABBA');
    expect([...scrambleTerm('ABBA')].sort()).toEqual([...('ABBA')].sort());
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
    expect(prompts.every((prompt) => prompt.prompt.startsWith('Explain "'))).toBe(true);
    const questions = createQuizQuestions(pairs);
    expect(questions).toHaveLength(pairs.length);
    for (const question of questions) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
      expect(question.answerIndex).toBeLessThan(4);
    }
    expect(gameIsAvailable('quiz', pairs.slice(0, 3))).toBe(false);
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
    expect(gameIsAvailable('find-the-match', pairs)).toBe(false);
  });
});
