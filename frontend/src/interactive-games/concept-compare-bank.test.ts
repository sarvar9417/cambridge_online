import { describe, expect, it } from 'vitest';
import { COMPARE_DECKS } from './concept-compare-bank';

describe('9618 Concept Compare curated bank', () => {
  it('has distinct chapter-scoped decks and no ambiguous empty or invalid answers', () => {
    expect(COMPARE_DECKS.length).toBeGreaterThanOrEqual(7);
    expect(new Set(COMPARE_DECKS.map(deck => deck.id)).size).toBe(COMPARE_DECKS.length);
    for (const deck of COMPARE_DECKS) {
      expect(deck.chapterNo).toBeGreaterThan(0);
      expect(deck.a).not.toBe(deck.b);
      expect(deck.cards.length).toBeGreaterThanOrEqual(8);
      expect(new Set(deck.cards.map(card => card[0])).size).toBe(deck.cards.length);
      for (const [statement, answer] of deck.cards) {
        expect(statement.trim().length).toBeGreaterThan(12);
        expect(['A','B','AB']).toContain(answer);
      }
    }
  });
  it('preserves statements that legitimately belong to both concepts', () => {
    const both = COMPARE_DECKS.flatMap(deck => deck.cards).filter(([, answer]) => answer === 'AB');
    expect(both.length).toBeGreaterThan(8);
    const symmetric = COMPARE_DECKS.find(deck => deck.id === 'symmetric-asymmetric');
    expect(symmetric?.cards.some(([statement, answer]) =>
      answer === 'AB' && statement.includes('keys'))).toBe(true);
  });
});