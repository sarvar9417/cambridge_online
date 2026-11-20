import { describe, expect, it } from 'vitest';
import { COMPARE_DECKS, compareCategoryFor, compareDeckMatchesScope } from './concept-compare-bank';
import { COMPARE_MS_EVIDENCE, compareMsFindings } from './concept-compare-ms-evidence';

describe('9618 Concept Compare curated bank', () => {
  it('has distinct chapter-scoped decks and no ambiguous empty or invalid answers', () => {
    expect(COMPARE_DECKS.length).toBe(130);
    expect(new Set(COMPARE_DECKS.map(deck => deck.id)).size).toBe(COMPARE_DECKS.length);
    expect(COMPARE_DECKS.reduce((sum, deck) => sum + deck.cards.length, 0)).toBe(1165);
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
    expect(both.length).toBeGreaterThanOrEqual(120);
    const symmetric = COMPARE_DECKS.find(deck => deck.id === 'symmetric-asymmetric');
    expect(symmetric?.cards.some(([statement, answer]) =>
      answer === 'AB' && statement.includes('keys'))).toBe(true);
  });
  it('covers every Hodder Chapter 13–18 and all matching 9618 syllabus topics', () => {
    const topics: Record<number, string[]> = {
      13:['13.1','13.2','13.3'], 14:['14.1','14.2'],
      15:['15.1','15.2'], 16:['16.1','16.2'],
      17:['17.1'], 18:['18.1'],
    };
    for (const [chapter, chapterTopics] of Object.entries(topics)) {
      const chapterNo = Number(chapter);
      const decks = COMPARE_DECKS.filter(deck => deck.chapterNo === chapterNo);
      expect(decks.length).toBeGreaterThanOrEqual(5);
      for (const code of chapterTopics) {
        expect(decks.some(deck => compareDeckMatchesScope(deck,
          {chapterNo,kind:'topic',code}))).toBe(true);
      }
      expect(decks.every(deck => deck.cards.some(card => card[1] === 'A') &&
        deck.cards.some(card => card[1] === 'B') && deck.cards.some(card => card[1] === 'AB'))).toBe(true);
    }
    expect(COMPARE_DECKS.find(deck => deck.id === 'sequential-direct')?.extractPages).toBe(true);
    expect(compareDeckMatchesScope(COMPARE_DECKS.find(deck => deck.id === 'lexical-syntax')!,
      {chapterNo:16,kind:'section',code:'16.3.2'})).toBe(true);
    expect(compareDeckMatchesScope(COMPARE_DECKS.find(deck => deck.id === 'lexical-syntax')!,
      {chapterNo:16,kind:'topic',code:'16.2'})).toBe(true);
  });
  it('covers every in-syllabus Hodder subsection of Chapters 1–8, with usable A/B/Both cards', () => {
    const required: Record<number, string> = {
      1: '1.1.1 1.1.2 1.1.3 1.1.4 1.1.5 1.2.1 1.2.2 1.2.3 1.3.1 1.3.2',
      2: '2.1.1 2.1.2 2.1.3 2.1.4 2.1.5 2.1.6 2.1.7 2.1.8 2.2.1 2.2.2 2.2.3 2.2.4 2.2.5',
      3: '3.1.1 3.1.2 3.2.1 3.2.2 3.2.3 3.2.4 3.2.5 3.2.6',
      4: '4.1.1 4.1.2 4.1.3 4.1.4 4.1.5 4.1.6 4.1.7 4.2.1 4.2.2 4.2.3 4.2.4 4.2.5 4.3.1 4.3.2',
      5: '5.1.1 5.1.2 5.1.3 5.1.4 5.2.1 5.2.2 5.2.3 5.2.4',
      6: '6.1.1 6.1.2 6.1.3 6.1.4 6.2.1 6.2.2',
      7: '7.1.1 7.1.2 7.1.3 7.2.1 7.2.2 7.2.3 7.3.1 7.3.2 7.3.3',
      8: '8.1.1 8.1.2 8.1.3 8.1.4 8.1.5 8.2.1 8.2.2 8.3.1 8.3.2 8.3.3',
    };
    const topicCodes: Record<number, string[]> = {
      1: ['1.1', '1.2', '1.3'], 2: ['2.1'], 3: ['3.1', '3.2'],
      4: ['4.1', '4.2', '4.3'], 5: ['5.1', '5.2'], 6: ['6.1', '6.2'],
      7: ['7.1'], 8: ['8.1', '8.2', '8.3'],
    };
    for (const [rawChapter, codes] of Object.entries(required)) {
      const chapterNo = Number(rawChapter);
      const chapterDecks = COMPARE_DECKS.filter(deck => deck.chapterNo === chapterNo);
      expect(chapterDecks.length).toBeGreaterThanOrEqual(5);
      for (const code of codes.split(' ')) {
        expect(chapterDecks.some(deck => compareDeckMatchesScope(deck, {
          chapterNo, kind:'section', code,
        })), `Chapter ${chapterNo} section ${code} has no Compare deck`).toBe(true);
      }
      for (const code of topicCodes[chapterNo]!) {
        expect(chapterDecks.some(deck => compareDeckMatchesScope(deck, {
          chapterNo, kind:'topic', code,
        })), `Chapter ${chapterNo} syllabus topic ${code} has no Compare deck`).toBe(true);
      }
      for (const deck of chapterDecks) {
        for (const side of ['A', 'B', 'AB']) {
          expect(deck.cards.some(([,answer])=>answer===side), `${deck.id} missing ${side}`).toBe(true);
        }
      }
    }
    expect(compareDeckMatchesScope(COMPARE_DECKS.find(deck => deck.id === 'sql-where-having')!,
      { chapterNo:8,kind:'section',code:'8.3.2' })).toBe(false);
    expect(compareDeckMatchesScope(COMPARE_DECKS.find(deck => deck.id === 'bytecode-machinecode')!,
      { chapterNo:5,kind:'section',code:'5.2.3' })).toBe(true);
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

describe('9618 Chapter 1–8 Cambridge QP/MS provenance', () => {
  const decks = COMPARE_DECKS.filter(deck => deck.chapterNo <= 8);
  it('identifies exactly which individual cards have direct marking-point support', () => {
    expect(decks).toHaveLength(83);
    expect(decks.reduce((total, deck) => total + deck.cards.length, 0)).toBe(689);
    let supported = 0;
    for (const deck of decks) {
      const entries = COMPARE_MS_EVIDENCE[deck.id] ?? [];
      const seen = new Set<number>();
      for (const entry of entries) {
        expect(entry.question).toMatch(/^9618\/1[123]\/(?:M\/J|O\/N)\/2[1-5] Q\d+(?:\([a-z]\))?(?:\([ivx]+\))?$/);
        expect(entry.rationale.length).toBeGreaterThan(25);
        for (const card of entry.cards) {
          expect(card).toBeGreaterThan(0);
          expect(card).toBeLessThanOrEqual(deck.cards.length);
          seen.add(card);
          expect(compareMsFindings(deck.id, card - 1)).toContainEqual(entry);
        }
      }
      supported += seen.size;
    }
    expect(Object.keys(COMPARE_MS_EVIDENCE).every(id => decks.some(deck => deck.id === id))).toBe(true);
    expect(supported).toBe(245);
    expect(compareMsFindings('bitmap-vector', 0)[0]?.question).toBe('9618/12/O/N/21 Q5(b)(i)');
    expect(compareMsFindings('bitmap-vector', 4)).toEqual([]);
  });
});
