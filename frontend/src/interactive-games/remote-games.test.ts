import { describe, expect, it } from 'vitest';
import { scrambleTerm } from './game-content';
import {
  createQuizQuestions, createSpeakingPrompts, chapterMatchesGameSearch, visibleGameCatalogEntries, gameIsAvailable,
  isAnagramEligible, poolForMode, selectGamePairs, selectModeStage, normalizeGameScopes, toggleNarrowScope, selectQualityGameTerms,
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

  it('draws a genuinely randomized subset of the full selected bank without repetitions', () => {
    const terms = Array.from({ length: 75 }, (_, index) => term(index, 'TERM' + index));
    const first = selectGamePairs(terms, 29, 0, 12345);
    const next = selectGamePairs(terms, 29, 1, 12345);
    expect(first).toEqual(selectGamePairs(terms, 29, 0, 12345));
    expect(first).toHaveLength(29);
    expect(new Set(first.map((item) => item.id)).size).toBe(29);
    expect(first.map((item) => item.id)).not.toEqual(terms.slice(0, 29).map((item) => item.id));
    expect(next.map((item) => item.id)).not.toEqual(first.map((item) => item.id));
    expect(selectGamePairs(terms, 29, 999, 12345)).toHaveLength(29);
    expect(selectGamePairs(terms, 100, 0, 12345)).toHaveLength(75);
  });

  it('advances through a randomly permuted bank before repeating vocabulary', () => {
    const terms = Array.from({ length: 90 }, (_, index) => term(index, 'Vocabulary ' + index));
    const draws = [0, 1, 2].map((round) => selectGamePairs(terms, 30, round, 12345));
    expect(draws.every((draw) => draw.length === 30)).toBe(true);
    expect(new Set(draws.flat().map((item) => item.id)).size).toBe(90);
    expect(selectGamePairs(terms, 30, 0, 12345)).toEqual(draws[0]);
    expect(selectGamePairs(terms, 30, 3, 12345).map((item) => item.id))
      .not.toEqual(draws[0]!.map((item) => item.id));
  });

  it('reshuffles the entire vocabulary when all available terms already fit in one round', () => {
    const terms = Array.from({ length: 8 }, (_, index) => term(index, 'Term ' + index));
    const first = selectGamePairs(terms, 30, 0, 12345);
    const second = selectGamePairs(terms, 30, 1, 12345);
    const third = selectGamePairs(terms, 30, 2, 12345);
    expect(first).toEqual(terms);
    expect(second.map((item) => item.id)).not.toEqual(first.map((item) => item.id));
    expect(third.map((item) => item.id)).not.toEqual(second.map((item) => item.id));
    expect(new Set(second.map((item) => item.id))).toEqual(new Set(first.map((item) => item.id)));
  });

  it('samples early and late source terms, not a sorted prefix with its order shuffled', () => {
    const terms = Array.from({ length: 186 }, (_, index) => term(index, 'Vocabulary ' + index));
    const selected = selectGamePairs(terms, 30, 0, 17);
    const positions = selected.map((item) => Number(item.id));
    expect(new Set(positions).size).toBe(30);
    expect(positions.some((position) => position >= 140)).toBe(true);
    expect(positions.some((position) => position < 40)).toBe(true);
    expect(selected.map((item) => item.id)).not.toEqual(terms.slice(0, 30).map((item) => item.id));
    const allSamples = Array.from({ length: 100 }, (_, index) =>
      selectGamePairs(terms, 30, index, 123).map((item) => item.id)).flat();
    expect(new Set(allSamples).size).toBe(186);
  });

  it('keeps different chapter meanings in review cards but prevents ambiguous scored answers', () => {
    const contextual: LiveGameTerm[] = [
      { ...term(1, 'Assembly language'),
        definition: 'Mnemonic processor instructions', chapterNo: 4,
        syllabusTopicCode: '4.1', hodderSectionCodes: ['4.2'],
        isOfficialKeyTerm: true, officialKeyTermPage: 127 },
      { ...term(2, 'Assembly language'),
        definition: 'Program converted by an assembler', chapterNo: 20,
        syllabusTopicCode: '20.3', hodderSectionCodes: ['20.2'] },
      { ...term(3, 'Machine code'), definition: 'Binary processor instructions', chapterNo: 4 },
      { ...term(4, 'Assembler'), definition: 'Translator for assembly code', chapterNo: 5 },
      { ...term(5, 'Compiler'), definition: 'Translator for a whole program', chapterNo: 5 },
      { ...term(6, 'Alternative'), definition: 'Binary processor instructions', chapterNo: 7 },
    ];
    expect(poolForMode(contextual, 'flash-cards')).toHaveLength(6);
    expect(poolForMode(contextual, 'speaking-cards')).toHaveLength(6);
    for (const mode of ['quiz', 'match-up', 'find-the-match', 'open-box', 'spin-wheel', 'anagram'] as const) {
      const filtered = poolForMode(contextual, mode);
      const labels = filtered.map((item) => item.term.trim().toLowerCase());
      expect(labels.length).toBe(new Set(labels).size);
      expect(filtered.filter((pair) => pair.term === 'Assembly language')).toHaveLength(1);
    }
    const quizPairs = poolForMode(contextual, 'quiz');
    expect(quizPairs).toHaveLength(4);
    const questions = createQuizQuestions(quizPairs);
    expect(questions).toHaveLength(4);
    expect(questions[0]?.sourceContext).toContain('Chapter 4');
    expect(questions[0]?.sourceContext).toContain('Official Key Term, page 127');
    const speech = createSpeakingPrompts(contextual);
    expect(speech).toHaveLength(6);
    expect(speech[0]?.sourceContext).toContain('Chapter 4');
    expect(speech[1]?.sourceContext).toContain('Chapter 20');
    expect(speech[1]?.talkingPoints).toBe('Assembly language');
  });

  it('chooses verified official glossary entries over manual-review duplicates for scored items', () => {
    const values: LiveGameTerm[] = [
      { ...term(1, 'Assembly language'), chapterNo: 20,
        definitionEvidenceStatus: 'supplementary_manual_review_required' },
      { ...term(2, 'Assembly language'), chapterNo: 4, isOfficialKeyTerm: true,
        officialKeyTermPage: 127, definitionEvidenceStatus: 'official_textbook_definition',
        status: 'approved' },
      { ...term(3, 'Compiler'), definitionEvidenceStatus: 'supplementary_source_screened' },
      { ...term(4, 'Interpreter'), definitionEvidenceStatus: 'supplementary_targeted_verified' },
      { ...term(5, 'Machine code'), definitionEvidenceStatus: 'supplementary_source_screened' },
    ];
    expect(poolForMode(values, 'flash-cards')).toHaveLength(5);
    const scored = poolForMode(values, 'quiz');
    expect(scored).toHaveLength(4);
    expect(scored.find((item) => item.term === 'Assembly language')?.id).toBe('2');
    expect(createQuizQuestions(scored).find((item) => item.id === 'quiz-2')?.sourceContext)
      .toContain('Official Key Term, page 127');
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
    const blocks = Array.from({ length: 10 }, (_, round) => selectModeStage(terms, 500, round, 'quiz', 12345));
    expect(blocks.map((items) => items.length)).toEqual(Array(10).fill(50));
    expect(new Set(blocks.flat().map((item) => item.id)).size).toBe(500);
    expect(selectModeStage(terms, 500, 10, 'quiz', 12345).map((item) => item.id))
      .not.toEqual(blocks[0]!.map((item) => item.id));
    const wheelBlocks = [0, 1, 2, 3].map((round) => selectModeStage(terms, 100, round, 'spin-wheel', 12345));
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

describe('Evidence-graded glossary vocabulary selection', () => {
  const entries:LiveGameTerm[]=[
    {...term(1,'Firewall'),status:'approved',isOfficialKeyTerm:true,definitionEvidenceStatus:'official_textbook_definition'},
    {...term(2,'Packet switching'),status:'approved',isOfficialKeyTerm:false,definitionEvidenceStatus:'supplementary_targeted_verified'},
    {...term(3,'Diagram arrow label'),status:'approved',isOfficialKeyTerm:false,definitionEvidenceStatus:'supplementary_source_screened'},
    {...term(4,'Example calculation step'),status:'approved',isOfficialKeyTerm:false,definitionEvidenceStatus:'supplementary_manual_review_required'},
    {...term(5,'Unapproved term'),status:'needs_review',isOfficialKeyTerm:true,definitionEvidenceStatus:'official_textbook_definition'},
  ];
  it('defaults to textbook-backed and individually verified concepts',()=>{
    expect(selectQualityGameTerms(entries,'core').map(x=>x.term)).toEqual(['Firewall','Packet switching']);
  });
  it('includes source-screened concepts only on an explicit extended choice',()=>{
    expect(selectQualityGameTerms(entries,'extended').map(x=>x.term)).toEqual(['Firewall','Packet switching','Diagram arrow label']);
  });
  it('does not return manually flagged or unapproved entries in either quality bank',()=>{
    expect(selectQualityGameTerms(entries,'core').some(x=>x.id==='4'||x.id==='5')).toBe(false);
    expect(selectQualityGameTerms(entries,'extended').some(x=>x.id==='4'||x.id==='5')).toBe(false);
  });
  it('does not discard prior API content missing all provenance metadata',()=>{
    const legacy=[term(1,'Binary'),term(2,'Router')];
    expect(selectQualityGameTerms(legacy,'core')).toEqual(legacy);
  });
});
