import { describe, expect, it, vi } from 'vitest';
import { chapter7Pilot, GAME_CATALOG, findMatchOptions, isCorrectPair, scrambleTerm } from './game-content';

describe('Interactive Games Cambridge 9618 Chapter 7.1 pilot', () => {
  it('has unique glossary IDs and eight requested modes in the specified order', () => {
    expect(chapter7Pilot.courseCode).toBe('9618');
    expect(chapter7Pilot.chapterNo).toBe(7);
    expect(chapter7Pilot.sectionCode).toBe('7.1');
    expect(new Set(chapter7Pilot.pairs.map((pair) => pair.id)).size).toBe(chapter7Pilot.pairs.length);
    expect(chapter7Pilot.pairs.length).toBeGreaterThanOrEqual(8);
    expect(GAME_CATALOG.map((item) => item.label)).toEqual([
      'Match Up', 'Flash Cards', 'Speaking Cards', 'Spin the Wheel',
      'Open the Box', 'Quiz', 'Find the Match', 'Anagram',
    ]);
    for (const item of chapter7Pilot.pairs) {
      expect(item.term.length).toBeGreaterThan(0);
      expect(item.definition.length).toBeGreaterThan(0);
      expect(isCorrectPair(item.id, item.id)).toBe(true);
    }
    expect(isCorrectPair('ethics', 'morality')).toBe(false);
  });

  it('has usable speaking prompts and valid multiple-choice keys', () => {
    expect(chapter7Pilot.speaking.length).toBeGreaterThanOrEqual(5);
    expect(chapter7Pilot.quiz.length).toBeGreaterThanOrEqual(5);
    for (const item of chapter7Pilot.speaking) {
      expect(item.prompt.trim()).not.toBe('');
      expect(item.talkingPoints.trim()).not.toBe('');
    }
    for (const item of chapter7Pilot.quiz) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options).size).toBe(4);
      expect(item.options[item.answerIndex].length).toBeGreaterThan(0);
      expect(item.explanation.trim()).not.toBe('');
    }
  });

  it('generates four distinct Find the Match choices with one correct term for each prompt', () => {
    chapter7Pilot.pairs.forEach((item, index) => {
      const options = findMatchOptions(chapter7Pilot.pairs, index);
      expect(options).toHaveLength(4);
      expect(new Set(options.map((option) => option.id)).size).toBe(4);
      expect(options.filter((option) => option.id === item.id)).toHaveLength(1);
    });
    expect(findMatchOptions(chapter7Pilot.pairs.slice(0, 3), 0)).toEqual([]);
    for (const size of [4, 5]) {
      const shortSet = chapter7Pilot.pairs.slice(0, size);
      shortSet.forEach((item, index) => {
        const choices = findMatchOptions(shortSet, index);
        expect(choices).toHaveLength(4);
        expect(new Set(choices.map((choice) => choice.id)).size).toBe(4);
        expect(choices.filter((choice) => choice.id === item.id)).toHaveLength(1);
      });
    }
  });

  it('does not leak Quiz answers through a fixed A/B/C/D cycle or sorted adjacent terms', () => {
    let state = 1_234_567;
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 2 ** 32;
    });
    try {
      const pairs = Array.from({ length: 80 }, (_, index) => ({
        id: 'id-' + index, term: 'Term ' + String(index).padStart(3, '0'),
        definition: 'Distinct concept about memory and processing number ' + index,
      }));
      const placements = pairs.map((pair, index) =>
        findMatchOptions(pairs, index).findIndex((choice) => choice.id === pair.id));
      expect(new Set(placements).size).toBe(4);
      expect(placements).not.toEqual(pairs.map((_, index) => index % 4));
      expect(placements).not.toEqual(pairs.map((_, index) => 0));
    } finally { random.mockRestore(); }
  });

  it('prefers genuinely related source-backed distractors over alphabetic neighbours', () => {
    const pairs = [
      { id: 'target', term: 'Symmetric encryption', definition: 'Encryption that uses the same secret key to encrypt and decrypt data' },
      { id: 'noise1', term: 'Algorithm design', definition: 'Steps for solving a computational problem' },
      { id: 'noise2', term: 'Database index', definition: 'A structure used to search stored records efficiently' },
      { id: 'near1', term: 'Asymmetric encryption', definition: 'Encryption that uses different public and private keys to encrypt and decrypt data' },
      { id: 'noise3', term: 'Iteration', definition: 'Repeated execution of a set of instructions in a loop' },
      { id: 'near2', term: 'Cryptographic key', definition: 'Secret key value used for encrypting and decrypting data in cryptography' },
    ];
    const choices = findMatchOptions(pairs, 0);
    expect(choices).toHaveLength(4);
    expect(choices.map((item) => item.id)).toContain('near1');
    expect(choices.map((item) => item.id)).toContain('near2');
    expect(choices.filter((item) => item.id === 'target')).toHaveLength(1);
    expect(findMatchOptions(pairs.slice(0, 3), 0)).toEqual([]);
  });

  it('scrambles anagram letters without deleting or adding any', () => {
    for (const item of chapter7Pilot.pairs.filter((pair) => !pair.term.includes(' ') && pair.term.length >= 4)) {
      const scrambled = scrambleTerm(item.term);
      expect(scrambled).not.toBe(item.term.toUpperCase());
      expect([...scrambled].sort()).toEqual([...item.term.toUpperCase()].sort());
    }
  });
});
