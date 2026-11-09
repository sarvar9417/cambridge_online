import { describe, expect, it } from 'vitest';
import { chapter7Pilot, GAME_CATALOG, GROUPS, isCorrectGroup, isCorrectPair } from './game-content';

describe('Interactive Games pilot bank', () => {
  it('has unique IDs and valid matches for the supplied Cambridge section', () => {
    expect(chapter7Pilot.courseCode).toBe('9618');
    expect(chapter7Pilot.chapterNo).toBe(7);
    expect(chapter7Pilot.sectionCode).toBe('7.1');
    expect(chapter7Pilot.pairs.length).toBeGreaterThanOrEqual(6);
    expect(new Set(chapter7Pilot.pairs.map((pair) => pair.id)).size).toBe(chapter7Pilot.pairs.length);
    for (const pair of chapter7Pilot.pairs) {
      expect(pair.term.trim()).not.toBe('');
      expect(pair.definition.trim()).not.toBe('');
      expect(isCorrectPair(pair.id, pair.id)).toBe(true);
    }
    expect(isCorrectPair('ethics', 'morality')).toBe(false);
  });

  it('includes only valid classification targets', () => {
    expect(new Set(GROUPS).size).toBe(4);
    expect(new Set(chapter7Pilot.groups.map((item) => item.id)).size).toBe(chapter7Pilot.groups.length);
    for (const item of chapter7Pilot.groups) {
      expect(GROUPS).toContain(item.group);
      expect(isCorrectGroup(item, item.group)).toBe(true);
      expect(isCorrectGroup(item, GROUPS.find((group) => group !== item.group)!)).toBe(false);
    }
  });

  it('provides four distinct game templates', () => {
    expect(GAME_CATALOG.map((item) => item.id)).toEqual(['match-up', 'matching-pairs', 'flash-cards', 'group-sort']);
  });
});
