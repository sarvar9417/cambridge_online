import { describe, expect, it } from 'vitest';
import { COMPARE_DECKS, compareCategoryFor, compareDeckMatchesScope } from './concept-compare-bank';

describe('9618 Concept Compare curated bank', () => {
  it('has distinct chapter-scoped decks and no ambiguous empty or invalid answers', () => {
    expect(COMPARE_DECKS.length).toBe(24);
    expect(new Set(COMPARE_DECKS.map(deck => deck.id)).size).toBe(COMPARE_DECKS.length);
    expect(COMPARE_DECKS.reduce((sum, deck) => sum + deck.cards.length, 0)).toBe(243);
    for (const deck of COMPARE_DECKS) {
      expect(deck.chapterNo).toBeGreaterThan(0);
      expect(deck.a).not.toBe(deck.b);
      expect(deck.cards.length).toBeGreaterThanOrEqual(8);
      expect(deck.sectionCodes.length).toBeGreaterThan(0);
      expect(deck.sectionCodes.every(code => code.startsWith(String(deck.chapterNo) + '.'))).toBe(true);
      expect(deck.syllabusTopicCode.startsWith(String(deck.chapterNo) + '.')).toBe(true);
      expect(new Set(deck.cards.map(card => card[0])).size).toBe(deck.cards.length);
      for (const [index, [statement, answer]] of deck.cards.entries()) {
        expect(compareCategoryFor(deck, index)).toBeTruthy();
        expect(statement.trim().length).toBeGreaterThan(12);
        expect(['A','B','AB']).toContain(answer);
      }
    }
  });
  it('preserves statements that legitimately belong to both concepts', () => {
    const both = COMPARE_DECKS.flatMap(deck => deck.cards).filter(([, answer]) => answer === 'AB');
    expect(both.length).toBe(58);
    const symmetric = COMPARE_DECKS.find(deck => deck.id === 'symmetric-asymmetric');
    expect(symmetric?.cards.some(([statement, answer]) =>
      answer === 'AB' && statement.includes('keys'))).toBe(true);
  });
});
describe('Curriculum selections for Concept Compare', () => {
  const find = (id: string) => COMPARE_DECKS.find(deck => deck.id === id)!;
  it('maps a book section separately from its syllabus topic code', () => {
    expect(compareDeckMatchesScope(find('ssl-tls'), { chapterNo:17, kind:'topic', code:'17.1' })).toBe(true);
    expect(compareDeckMatchesScope(find('ssl-tls'), { chapterNo:17, kind:'section', code:'17.3.2' })).toBe(true);
    expect(compareDeckMatchesScope(find('ssl-tls'), { chapterNo:17, kind:'section', code:'17.1.2' })).toBe(false);
    expect(compareDeckMatchesScope(find('supervised-unsupervised'), { chapterNo:18, kind:'topic', code:'18.1' })).toBe(true);
    expect(compareDeckMatchesScope(find('supervised-unsupervised'), { chapterNo:18, kind:'section', code:'18.2.2' })).toBe(true);
  });
  it('includes an entire chapter but excludes unrelated topics and sections', () => {
    expect(compareDeckMatchesScope(find('validation-verification'), { chapterNo:6, kind:'chapter' })).toBe(true);
    expect(compareDeckMatchesScope(find('validation-verification'), { chapterNo:6, kind:'topic', code:'6.2' })).toBe(true);
    expect(compareDeckMatchesScope(find('validation-verification'), { chapterNo:6, kind:'section', code:'6.2' })).toBe(true);
    expect(compareDeckMatchesScope(find('validation-verification'), { chapterNo:6, kind:'section', code:'6.2.1' })).toBe(true);
    expect(compareDeckMatchesScope(find('validation-verification'), { chapterNo:6, kind:'section', code:'6.1.3' })).toBe(false);
    expect(compareDeckMatchesScope(find('validation-verification'), { chapterNo:4, kind:'chapter' })).toBe(false);
  });
  it('honestly preserves overlapping facts and out-of-syllabus warnings', () => {
    expect(find('hub-switch').extensionOnly).toBe(true);
    const sources = find('ssl-tls').cards;
    expect(sources.some(([text, key]) => key === 'AB' && text.includes('handshake'))).toBe(true);
    expect(find('shareware-commercial').cards.some(([text, key]) => key === 'AB' && text.includes('source code'))).toBe(true);
  });
});
