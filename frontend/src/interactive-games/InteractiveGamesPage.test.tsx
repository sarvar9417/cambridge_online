import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { chapter7Pilot } from './game-content';
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
    await choose('Select entire Chapter 1'); // Remove default whole-chapter selection.
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
    await choose('Select entire Chapter 1');
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

  it('Match Up grades only submitted answers and resets first-attempt statistics', async () => {
    await render();
    await click([...container.querySelectorAll<HTMLButtonElement>('.ig-bank-term')].find((x) => x.textContent === 'Legal')!);
    const slot = [...container.querySelectorAll<HTMLButtonElement>('.ig-drop-target button')]
      .find((item) => item.getAttribute('aria-label')?.includes('permitted or required by law'))!;
    await click(slot);
    expect(container.textContent).toContain('1 of 8 placed');
    await click(button('Submit Answers'));
    expect(container.textContent).toContain('1 / 8 correct');
    expect(container.textContent).toContain('✓ 1 correct');
    expect(container.textContent).toContain('✕ 7 mistakes');
    await click(button('↻ Play this round again'));
    expect(container.textContent).toContain('✓ 0 correct');
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
      await act(async () => { vi.advanceTimersByTime(30_000); await Promise.resolve(); });
      expect(container.textContent).toContain("Time's up!");
      expect(container.querySelector('.ig-result-panel')?.textContent).toContain('Scores are not saved');
    } finally { vi.useRealTimers(); }
  });
});
