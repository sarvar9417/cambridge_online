import { describe, expect, it } from 'vitest';
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

  it('scrambles anagram letters without deleting or adding any', () => {
    for (const item of chapter7Pilot.pairs.filter((pair) => !pair.term.includes(' ') && pair.term.length >= 4)) {
      const scrambled = scrambleTerm(item.term);
      expect(scrambled).not.toBe(item.term.toUpperCase());
      expect([...scrambled].sort()).toEqual([...item.term.toUpperCase()].sort());
    }
  });
});
