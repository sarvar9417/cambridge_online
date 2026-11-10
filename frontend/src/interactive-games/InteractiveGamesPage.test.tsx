import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { chapter7Pilot, type GamePair } from './game-content';
import type { GameScope, LiveGameCatalog, LiveGamePack } from './remote-games';
import { InteractiveGamesPage } from './InteractiveGamesPage';

vi.mock('../lib/api', () => ({ api: vi.fn() }));
const mockApi = vi.mocked(api);
const baseTerms = chapter7Pilot.pairs;
let importedChapter4 = false;
let extraChapter2Term = false;
const catalog = (): LiveGameCatalog => ({
  courseCode: '9618',
  chapters: [
    { chapterNo: 1, title: 'Information representation', termCount: 137, approvedCount: 0,
      topics: [{ code: '1.1', title: 'Data Representation', termCount: 51 }, { code: '1.2', title: 'Multimedia', termCount: 55 }],
      sections: [{ code: '1.1.1', title: 'Number systems', termCount: 5, parentCode: '1.1' }] },
    { chapterNo: 2, title: 'Communication', termCount: 258 + (extraChapter2Term ? 1 : 0), approvedCount: 0,
      topics: [{ code: '2.1', title: 'Networks', termCount: 258 }],
      sections: [{ code: '2.1.1', title: 'Networking devices', termCount: 23, parentCode: '2.1' }] },
    { chapterNo: 3, title: 'Hardware', termCount: 273, approvedCount: 0,
      topics: [{ code: '3.1', title: 'Computers and components', termCount: 190 }], sections: [] },
    ...(importedChapter4 ? [{ chapterNo: 4, title: 'Processor fundamentals', termCount: 44, approvedCount: 0,
      topics: [{ code: '4.1', title: 'Processor Architecture', termCount: 44 }], sections: [] }] : []),
  ],
});
function pack(scopes: GameScope[]): LiveGamePack {
  const rows = scopes.flatMap((scope) => {
    const candidates = baseTerms.map((item) => ({
      ...item, id: scope.chapterNo + ':' + item.id,
      term: scope.chapterNo === 1 ? item.term : scope.chapterNo + ': ' + item.term,
      definition: scope.chapterNo === 1 ? item.definition : '[' + scope.chapterNo + '] ' + item.definition,
      status: 'needs_review' as const, source: null,
    }));
    if (scope.chapterNo === 2 && extraChapter2Term) candidates.push({
      id: '2:imported', term: 'Newly imported term', definition: 'New communication concept',
      status: 'needs_review', source: null,
    });
    if (scope.kind === 'topic') return candidates.slice(0, 5);
    if (scope.kind === 'section') return candidates.slice(0, 4);
    return candidates;
  });
  return {
    courseCode: '9618', scopes, contentStatus: 'needs_review',
    pairs: [...new Map(rows.map((row) => [row.id, row])).values()],
    source: 'Live Cambridge glossary (fixture)', assessed: false,
  };
}
async function respond(path: string, init?: RequestInit) {
  if (path.startsWith('/content/interactive-games/catalog')) return { data: catalog() };
  if (path === '/content/interactive-games/collection' && init?.method === 'POST') {
    const input = JSON.parse(String(init.body)) as { scopes: GameScope[] };
    return { data: pack(input.scopes) };
  }
  throw new Error('Unexpected game request: ' + path);
}

describe('database-backed Interactive Games multi-selection', () => {
  let root: Root;
  let container: HTMLDivElement;
  const render = async (teacher = false) => {
    await act(async () => { root.render(<InteractiveGamesPage isTeacher={teacher} />); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
  };
  const click = async (item: HTMLButtonElement | HTMLInputElement) => {
    await act(async () => { item.click(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
  };
  const button = (text: string) => {
    const value = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((item) => item.textContent?.trim() === text);
    if (!value) throw new Error('Missing button ' + text);
    return value;
  };
  const game = async (name: string) => {
    const tile = [...container.querySelectorAll<HTMLButtonElement>('.ig-game-tile')]
      .find((item) => item.querySelector('strong')?.textContent === name);
    if (!tile) throw new Error('Missing game: ' + name);
    await click(tile);
  };
  const choose = async (name: string) => {
    const input = container.querySelector<HTMLInputElement>('input[aria-label="' + name + '"]');
    if (!input) throw new Error('Missing choice ' + name);
    await click(input);
  };
  const change = async (selector: string, value: string) => {
    const select = container.querySelector<HTMLSelectElement>(selector)!;
    await act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
  };
  const lastScopes = () => {
    const calls = mockApi.mock.calls.filter((call) => call[0] === '/content/interactive-games/collection');
    const init = calls.at(-1)?.[1];
    return JSON.parse(String(init?.body)) as { courseCode: string; scopes: GameScope[] };
  };

  beforeEach(() => {
    importedChapter4 = false;
    extraChapter2Term = false;
    mockApi.mockReset();
    mockApi.mockImplementation(respond as typeof api);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads chapters, syllabus topics and Hodder sections with the eight game templates', async () => {
    await render(true);
    expect(container.textContent).toContain('Chapter 1');
    expect(container.textContent).toContain('137 terms');
    expect(container.textContent).toContain('258 terms');
    expect(container.textContent).toContain('273 terms');
    expect(container.textContent).toContain('Syllabus topics');
    expect(container.textContent).toContain('Hodder book sections');
    expect(container.textContent).toContain('pending review');
    expect([...container.querySelectorAll('.ig-game-tile strong')].map((el) => el.textContent)).toEqual([
      'Match Up', 'Flash Cards', 'Speaking Cards', 'Spin the Wheel',
      'Open the Box', 'Quiz', 'Find the Match', 'Anagram',
    ]);
    expect(lastScopes()).toEqual({ courseCode: '9618', scopes: [{ chapterNo: 1, kind: 'chapter' }] });
  });

  it('gives Spin the Wheel a choice of no timer, count up, or a timed round', async () => {
    await render(true);
    await game('Spin the Wheel');
    expect(container.querySelector('[role="timer"]')).toBeNull();
    expect(container.querySelector('.ig-session-metrics')?.textContent).not.toContain('correct');
    await change('select[aria-label="Time limit"]', 'count-up');
    expect(container.querySelector('[role="timer"]')?.textContent).toContain('Elapsed 00:00');
    await change('select[aria-label="Time limit"]', '30');
    expect(container.querySelector('[role="timer"]')?.textContent).toContain('Remaining 00:30');
    expect(container.querySelector<HTMLFieldSetElement>('.ig-game-stage')?.disabled).toBe(true);
    await click(button('Start timed round'));
    expect(container.querySelector<HTMLFieldSetElement>('.ig-game-stage')?.disabled).toBe(false);
  });

  it('combines two whole chapters into one 16-term bank and changes game without losing selection', async () => {
    await render();
    await choose('Select entire Chapter 2');
    expect(lastScopes().scopes).toEqual([
      { chapterNo: 1, kind: 'chapter' }, { chapterNo: 2, kind: 'chapter' },
    ]);
    expect(container.textContent).toContain('16 unique glossary terms loaded');
    await game('Quiz');
    expect(container.querySelectorAll('.ig-quiz .ig-answer-button')).toHaveLength(4);
    expect(lastScopes().scopes).toHaveLength(2);
    await game('Speaking Cards');
    await click(button('Deal'));
    expect(container.textContent).toContain('in your own words');
  });

  it('combines a selected syllabus topic and a Hodder section from different chapters', async () => {
    await render();
    await choose('Topic 1.1 · Chapter 1');
    await choose('Hodder section 2.1.1 · Chapter 2');
    expect(lastScopes().scopes).toEqual([
      { chapterNo: 1, kind: 'topic', code: '1.1' },
      { chapterNo: 2, kind: 'section', code: '2.1.1' },
    ]);
    expect(container.textContent).toContain('9 unique glossary terms loaded');
    await game('Find the Match');
    expect(container.querySelectorAll('.ig-find-tile')).toHaveLength(9);
  });

  it('keeps a full-chapter choice canonical rather than double-adding nested subtopics', async () => {
    await render();
    await choose('Topic 1.1 · Chapter 1');
    await choose('Select entire Chapter 1');
    expect(lastScopes().scopes).toEqual([{ chapterNo: 1, kind: 'chapter' }]);
    expect(container.textContent).toContain('8 unique glossary terms loaded');
  });

  it('discovers imported chapters and new glossary terms on Refresh database', async () => {
    await render();
    importedChapter4 = true;
    extraChapter2Term = true;
    await click(button('↻ Refresh database'));
    expect(container.textContent).toContain('Chapter 4');
    await choose('Select entire Chapter 2');
    expect(container.textContent).toContain('17 unique glossary terms loaded');
    await choose('Select entire Chapter 4');
    expect(container.textContent).toContain('25 unique glossary terms loaded');
  });

  it('shows an actionable 400-error state, not empty topic controls or fake terms', async () => {
    mockApi.mockRejectedValueOnce(new Error('HTTP 400: validation_error'));
    await render();
    expect(container.querySelector('.ig-data-error')?.textContent).toContain('Chapter catalogue failed');
    expect(container.querySelectorAll('.ig-game-tile')).toHaveLength(0);
    mockApi.mockImplementation(respond as typeof api);
    await click(button('Retry'));
    expect(container.querySelectorAll('.ig-game-tile')).toHaveLength(8);
  });

  it('removes stale content errors as soon as the user clears a failed multi-selection', async () => {
    mockApi.mockImplementation(async (path: string) => {
      if (path.includes('/catalog')) return { data: catalog() };
      throw new Error('HTTP 500 on selected topics');
    });
    await render();
    expect(container.querySelector('.ig-data-error')?.textContent).toContain('Selected content failed');
    await click(button('Clear selection'));
    expect(container.querySelector('.ig-data-error')).toBeNull();
    expect(container.querySelectorAll('.ig-game-tile')).toHaveLength(0);
    expect(container.textContent).toContain('Select at least one chapter');
    mockApi.mockImplementation(respond as typeof api);
    const attempts = mockApi.mock.calls.filter((call) => call[0] === '/content/interactive-games/collection').length;
    await choose('Select entire Chapter 2');
    expect(container.textContent).toContain('8 unique glossary terms loaded');
    expect(mockApi.mock.calls.filter((call) => call[0] === '/content/interactive-games/collection').length).toBe(attempts + 1);
    expect(container.querySelector('.ig-data-error')).toBeNull();
  });

  it('shows no stale sample terms when the selected bank has zero linked vocabulary', async () => {
    mockApi.mockImplementation(async (path: string) => path.includes('/catalog')
      ? { data: catalog() } : { data: { ...pack([]), pairs: [] } });
    await render();
    expect(container.textContent).toContain('no linked glossary terms');
    expect(container.querySelectorAll('.ig-game-tile')).toHaveLength(0);
  });

  function drop(target: Element, type: string, value: string) {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { getData: (key: string) => key === type ? value : '' } });
    return act(async () => { target.dispatchEvent(event); });
  }

  function toggleOption(label: string) {
    const setting = [...container.querySelectorAll('.ig-template-options label')]
      .find((node) => node.textContent?.trim() === label);
    return click(setting!.querySelector<HTMLInputElement>('input')!);
  }

  it('Match Up waits for all pairs and preserves the first submission after a retry', async () => {
    await render();
    await toggleOption('Allow one retry');
    async function match(target: GamePair, submitted: GamePair) {
      await click([...container.querySelectorAll<HTMLButtonElement>('.ig-bank-term')].find((item) => item.textContent === submitted.term)!);
      await click([...container.querySelectorAll<HTMLButtonElement>('.ig-drop-target button')]
        .find((item) => item.getAttribute('aria-label')?.endsWith(target.definition))!);
    }
    const legalSlot = [...container.querySelectorAll('.ig-drop-target')]
      .find((item) => item.querySelector('button')?.getAttribute('aria-label')?.endsWith(baseTerms[0]!.definition))!;
    await drop(legalSlot, 'text/plain', `1:${baseTerms[0]!.id}`);
    expect(container.textContent).toContain('1 of 8 placed');
    expect(container.querySelectorAll('.ig-bank-term')).toHaveLength(7);
    expect(button('Submit Answers').disabled).toBe(true);
    for (const [index, pair] of baseTerms.entries()) {
      if (index) await match(pair, index === 1 ? baseTerms[2]! : index === 2 ? baseTerms[1]! : pair);
    }
    await click(button('Submit Answers'));
    expect(container.textContent).toContain('6 / 8 correct');
    await click(button('Retry incorrect matches'));
    expect(container.querySelectorAll('.ig-match-row.is-correct')).toHaveLength(6);
    await match(baseTerms[1]!, baseTerms[1]!);
    await match(baseTerms[2]!, baseTerms[2]!);
    await click(button('Submit Answers'));
    expect(container.textContent).toContain('8 / 8 correct');
    expect(container.textContent).toContain('✓ 6 correct');
    expect(container.querySelector('.ig-answer-review')?.textContent).toContain('First answer · Ethics');
    await click(button('↻ Play this round again'));
    expect(container.textContent).toContain('✓ 0 correct');
    expect(container.querySelector('.ig-answer-review')).toBeNull();
  });

  it('flips flashcards, navigates by arrow key, and repeats a self-marked missed card', async () => {
    await render();
    await game('Flash Cards');
    await toggleOption('Self-mark cards');
    await toggleOption('Repeat missed cards');
    const card = container.querySelector<HTMLButtonElement>('.ig-flashcard')!;
    await click(card);
    expect(card.textContent).toContain('Legal');
    await click(button('✕ Practise again'));
    expect(card.querySelector('.ig-flashcard-mark.is-wrong')).toBeTruthy();
    await act(async () => { card.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(card.textContent).toContain(baseTerms[1]!.definition);
    for (let i = 1; i < baseTerms.length - 1; i++) await click(button('Next →'));
    await click(button('Review missed cards'));
    expect(card.textContent).toContain(baseTerms[0]!.definition);
    expect(container.textContent).toContain('Card 1 / 1');
    expect(container.querySelector('.ig-session-metrics')?.textContent).not.toContain('correct');
  });

  it('deals a shuffled batch without duplicates and returns it to the deck on Undo', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await render();
    await game('Speaking Cards');
    await change('.ig-template-options select', '3');
    await click(button('Deal'));
    const dealt = () => [...container.querySelectorAll('.ig-dealt-card > p')].map((item) => item.textContent);
    const first = dealt();
    expect(new Set(first).size).toBe(3);
    expect(first[0]).not.toBe(baseTerms[0]!.definition);
    expect(container.textContent).toContain('3 dealt · 5 remaining');
    await click(button('Undo'));
    expect(container.textContent).toContain('0 dealt · 8 remaining');
    await click(button('Deal'));
    expect(dealt()).toEqual(first);
    expect(container.querySelector('.ig-session-metrics')?.textContent).toContain('3 reviewed');
  });

  it('leaves simple boxes open on the board and scores question boxes before returning', async () => {
    vi.useFakeTimers();
    try {
      await render();
      await game('Open the Box');
      const secondBox = container.querySelector<HTMLButtonElement>('.ig-box:nth-child(2)')!;
      await click(secondBox);
      expect(secondBox.classList.contains('is-opened')).toBe(true);
      expect(secondBox.textContent).toContain('Morality');
      expect(container.querySelectorAll('.ig-box')).toHaveLength(8);
      await click(secondBox);
      expect(secondBox.textContent).toContain(baseTerms[1]!.definition);
      await game('Open the Box');
      await change('.ig-template-options select', 'questions');
      await click(container.querySelector<HTMLButtonElement>('.ig-box:nth-child(1)')!);
      expect(container.querySelector('.ig-box-question h3')?.textContent).toBe(baseTerms[0]!.definition);
      expect(container.querySelectorAll('.ig-box-question .ig-choice-card')).toHaveLength(4);
      await click(button('ALegal'));
      expect(container.querySelector('.ig-box-question .ig-reveal')?.textContent).toContain('Correct!');
      expect(container.querySelector('.ig-session-metrics')?.textContent).toContain('1 correct');
      await act(async () => { vi.advanceTimersByTime(1100); });
      const answeredBox = container.querySelector<HTMLButtonElement>('.ig-box:nth-child(1)')!;
      expect(answeredBox.textContent).toContain('✓ Correct');
      expect(answeredBox.disabled).toBe(true);
      await click(button('■ Finish game'));
      expect(container.querySelector('.ig-answer-review')?.textContent).toContain('✓ Correct · Legal');
    } finally { vi.useRealTimers(); }
  });

  it('pauses the question-box clock and records a timeout as an incorrect attempt', async () => {
    vi.useFakeTimers();
    try {
      await render();
      await game('Open the Box');
      await change('.ig-template-options select', 'questions');
      await change('.ig-template-options label:nth-child(3) select', '15');
      await click(container.querySelector<HTMLButtonElement>('.ig-box:nth-child(1)')!);
      expect(container.querySelector('.ig-box-clock')?.textContent).toContain('00:15');
      await click(button('Ⅱ Pause timer'));
      await act(async () => { vi.advanceTimersByTime(15000); });
      expect(container.querySelector('.ig-box-clock')?.textContent).toContain('00:15');
      await click(button('▶ Resume timer'));
      await act(async () => { vi.advanceTimersByTime(15000); });
      expect(container.querySelector('.ig-box-question .ig-reveal')?.textContent).toContain("Time's up!");
      await act(async () => { vi.advanceTimersByTime(1100); });
      expect(container.querySelector('.ig-box:nth-child(1)')?.textContent).toContain('Time expired');
      await click(container.querySelector<HTMLButtonElement>('.ig-box:nth-child(2)')!);
      expect(container.querySelector('.ig-box-clock')?.textContent).toContain('00:15');
    } finally { vi.useRealTimers(); }
  });

  it('preserves marked quiz answers while moving between questions manually', async () => {
    await render();
    await game('Quiz');
    await toggleOption('Automatically proceed');
    await click(button('ALegal'));
    await click(button('Next question →'));
    expect(container.querySelector('.ig-quiz .ig-score')?.textContent).toContain('Question 2');
    await click(button('← Previous question'));
    expect(container.querySelector('.ig-quiz .ig-answer-button.is-correct')?.textContent).toContain('Legal');
    expect(container.querySelectorAll('.ig-quiz .ig-answer-button:disabled')).toHaveLength(4);
  });

  it('marks the quiz immediately, allows one retry, and pauses automatic advancement', async () => {
    vi.useFakeTimers();
    try {
      await render();
      await game('Quiz');
      await toggleOption('Allow one retry');
      await click(button('BMorality'));
      expect(container.querySelector('.ig-answer-button.is-wrong')?.textContent).toContain('Morality');
      expect(container.querySelector('.ig-answer-button.is-correct')).toBeNull();
      await click(button('ALegal'));
      expect(container.querySelector('.ig-answer-button.is-correct')?.textContent).toContain('Legal');
      await click(button('Ⅱ Pause timer'));
      await act(async () => { vi.advanceTimersByTime(1500); });
      expect(container.querySelector('.ig-quiz .ig-score')?.textContent).toContain('Question 1');
      await click(button('▶ Resume timer'));
      await act(async () => { vi.advanceTimersByTime(1100); });
      expect(container.querySelector('.ig-quiz .ig-score')?.textContent).toContain('Question 2');
      await click(button('■ Finish game'));
      expect(container.querySelector('.ig-answer-review')?.textContent).toContain('First answer · Morality');
    } finally { vi.useRealTimers(); }
  });

  it('removes a correct Find the Match tile and retains the first incorrect choice for review', async () => {
    await render();
    await game('Find the Match');
    const clue = container.querySelector('.ig-find-clue p')?.textContent;
    const correct = baseTerms.find((item) => item.definition === clue)!;
    const wrong = baseTerms.find((item) => item.id !== correct.id)!;
    await click(button(wrong.term));
    expect(container.querySelector('[aria-label="2 lives remaining"]')).toBeTruthy();
    const originalPosition = [...container.querySelectorAll('.ig-find-grid > *')].indexOf(button(correct.term));
    await click(button(correct.term));
    expect(container.querySelectorAll('.ig-find-tile')).toHaveLength(7);
    expect(container.querySelector('.ig-find-grid')?.children[originalPosition]?.classList.contains('ig-find-gap')).toBe(true);
    await click(button('■ Finish game'));
    expect(container.querySelector('.ig-answer-review')?.textContent).toContain(`First answer · ${wrong.term}`);
  });

  it('locks correct anagram letters immediately and separates a corrected word from a first attempt', async () => {
    await render();
    await game('Anagram');
    await toggleOption('Automatically proceed');
    function tile(letter: string) {
      return [...container.querySelectorAll<HTMLButtonElement>('.ig-anagram-letter:not(:disabled)')]
        .find((item) => item.textContent === letter)!;
    }
    await click(tile('E'));
    expect(container.textContent).toContain('does not fit in slot 1');
    expect(container.querySelectorAll('.ig-anagram-slot.is-correct')).toHaveLength(0);
    const lastTile = tile('L');
    const lastPosition = container.querySelectorAll('.ig-anagram-slot')[4]!;
    const tileIndex = Number(lastTile.getAttribute('aria-label')?.split(' ').at(-1)) - 1;
    await drop(lastPosition, 'application/x-cambridge-anagram', String(tileIndex));
    expect(lastPosition.classList.contains('is-correct')).toBe(true);
    for (const letter of 'LEGA') await click(tile(letter));
    expect(container.querySelectorAll('.ig-anagram-slot.is-correct button:disabled')).toHaveLength(5);
    await click(button('Next anagram →'));
    expect(container.querySelector('.ig-anagram .ig-score')?.textContent).toContain('0 solved on first try');
    await click(button('■ Finish game'));
    expect(container.querySelector('.ig-answer-review')?.textContent).toContain('E in slot 1');
  });

  it('rearranges anagram letters within the word by selecting two positions', async () => {
    await render();
    await game('Anagram');
    await change('.ig-template-options label:nth-child(2) select', 'inline');
    await toggleOption('Automatically proceed');
    const tiles = () => [...container.querySelectorAll<HTMLButtonElement>('.ig-anagram-slot button')];
    expect(container.querySelector('.ig-anagram-letters')).toBeNull();
    expect(tiles().map((tile) => tile.textContent).join('')).not.toBe('LEGAL');
    for (const [index, letter] of [...'LEGAL'].entries()) {
      if (tiles()[index]!.textContent === letter) continue;
      const matching = tiles().find((tile) => !tile.disabled && tile.textContent === letter)!;
      await click(matching);
      expect(matching.getAttribute('aria-pressed')).toBe('true');
      await click(tiles()[index]!);
    }
    expect(tiles().map((tile) => tile.textContent).join('')).toBe('LEGAL');
    expect(container.querySelector('.ig-feedback')?.textContent).toContain('Correct!');
  });

  it('pauses and expires a 30-second round without treating it as an assessment', async () => {
    await render();
    await click(button('Ⅱ Pause timer'));
    expect(container.querySelector('fieldset.ig-game-stage')?.hasAttribute('disabled')).toBe(true);
    await click(button('▶ Resume timer'));
    expect(container.querySelector('fieldset.ig-game-stage')?.hasAttribute('disabled')).toBe(false);
    vi.useFakeTimers();
    try {
      await change('select[aria-label="Time limit"]', '30');
      expect(container.textContent).toContain('Remaining 00:30');
      await act(async () => { vi.advanceTimersByTime(30_000); });
      expect(container.textContent).toContain('Remaining 00:30');
      await click(button('Start timed round'));
      await act(async () => { vi.advanceTimersByTime(30_000); await Promise.resolve(); });
      expect(container.textContent).toContain("Time's up!");
      expect(container.querySelector('.ig-result-panel')?.textContent).toContain('Scores are not saved');
    } finally { vi.useRealTimers(); }
  });
});
