import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { chapter7Pilot } from './game-content';
import type { LiveGameCatalog, LiveGamePack } from './remote-games';
import { InteractiveGamesPage } from './InteractiveGamesPage';

vi.mock('../lib/api', () => ({ api: vi.fn() }));
const mockApi = vi.mocked(api);
const baseTerms = chapter7Pilot.pairs.map((pair) => ({ ...pair, status: 'needs_review' as const, source: 'Hodder coursebook' }));
let importedChapter4 = false;
let extraChapter2Term = false;
const catalog = (): LiveGameCatalog => ({
  courseCode: '9618',
  chapters: [
    { chapterNo: 1, title: 'Information representation', termCount: 137, approvedCount: 0,
      sections: [{ code: '1.1.1', title: 'Number systems', termCount: 5, parentCode: '1.1' }] },
    { chapterNo: 2, title: 'Communication', termCount: 258 + (extraChapter2Term ? 1 : 0), approvedCount: 0,
      sections: [{ code: '2.1.1', title: 'Networking devices', termCount: 23, parentCode: '2.1' }] },
    { chapterNo: 3, title: 'Hardware', termCount: 273, approvedCount: 0, sections: [] },
    ...(importedChapter4 ? [{ chapterNo: 4, title: 'Processor fundamentals', termCount: 44, approvedCount: 0, sections: [] }] : []),
  ],
});
function pack(chapterNo: number, sectionCode: string | null): LiveGamePack {
  const terms = baseTerms.map((pair) => ({ ...pair, term: chapterNo === 1 ? pair.term : chapterNo + ': ' + pair.term }));
  if (chapterNo === 2 && extraChapter2Term) terms.push({ ...baseTerms[0]!, id: 'imported', term: 'Newly imported term', definition: 'Added during import' });
  return {
    courseCode: '9618', chapterNo, sectionCode, contentStatus: 'needs_review',
    pairs: sectionCode ? terms.slice(0, 5) : terms,
    source: 'Live PostgreSQL coursebook glossary (test fixture)',
    assessed: false,
  };
}
const respond = async (path: string) => {
  if (path.startsWith('/content/interactive-games/catalog')) return { data: catalog() };
  if (path.startsWith('/content/interactive-games/pack?')) {
    const q = new URLSearchParams(path.split('?')[1]);
    return { data: pack(Number(q.get('chapterNo')), q.get('sectionCode')) };
  }
  throw new Error('Unexpected API path ' + path);
};

describe('Interactive Games loads all modes from current database catalog', () => {
  let root: Root;
  let container: HTMLDivElement;
  const render = async (teacher = false) => {
    await act(async () => {
      root.render(<InteractiveGamesPage isTeacher={teacher} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  };
  const click = async (item: HTMLButtonElement) => {
    await act(async () => { item.click(); await Promise.resolve(); await Promise.resolve(); });
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
    expect(tile).toBeDefined();
    await click(tile!);
  };
  const change = async (selector: string, value: string) => {
    const select = container.querySelector<HTMLSelectElement>(selector)!;
    await act(async () => {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
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

  it('starts at live Chapter 1, offers Chapters 1–3 and eight original games', async () => {
    await render(true);
    expect(container.textContent).toContain('Chapter 1');
    expect(container.textContent).toContain('137 terms');
    expect(container.textContent).toContain('258 terms');
    expect(container.textContent).toContain('273 terms');
    expect(container.textContent).toContain('pending curriculum review');
    expect([...container.querySelectorAll('.ig-game-tile strong')].map((el) => el.textContent)).toEqual([
      'Match Up', 'Flash Cards', 'Speaking Cards', 'Spin the Wheel',
      'Open the Box', 'Quiz', 'Find the Match', 'Anagram',
    ]);
    expect(mockApi).toHaveBeenCalledWith('/content/interactive-games/catalog?courseCode=9618');
    expect(mockApi).toHaveBeenCalledWith('/content/interactive-games/pack?courseCode=9618&chapterNo=1');
  });

  it('filters a real Hodder subsection and switches to Chapter 2 without leaking Chapter 1 state', async () => {
    await render();
    await change('select[aria-label="Section"]', '1.1.1');
    expect(mockApi).toHaveBeenCalledWith('/content/interactive-games/pack?courseCode=9618&chapterNo=1&sectionCode=1.1.1');
    expect(container.textContent).toContain('5 unique glossary terms loaded');
    await change('select[aria-label="Chapter"]', '2');
    expect(mockApi).toHaveBeenCalledWith('/content/interactive-games/pack?courseCode=9618&chapterNo=2');
    expect(container.textContent).toContain('Chapter 2');
    expect(container.textContent).toContain('2: Legal');
    expect(container.textContent).not.toContain('Section 1.1.1');
  });

  it('refreshes the database catalogue, automatically discovering future chapters and new terms', async () => {
    await render();
    importedChapter4 = true;
    extraChapter2Term = true;
    await click(button('↻ Refresh database'));
    expect(container.textContent).toContain('Processor fundamentals');
    await change('select[aria-label="Chapter"]', '2');
    expect(container.textContent).toContain('9 unique glossary terms loaded');
    await change('select[aria-label="Chapter"]', '4');
    expect(container.textContent).toContain('Chapter 4');
    expect(container.textContent).toContain('4: Legal');
  });

  it('builds a Match Up board and grades only after final submission', async () => {
    await render();
    await click([...container.querySelectorAll<HTMLButtonElement>('.ig-bank-term')].find((x) => x.textContent === 'Legal')!);
    const slot = [...container.querySelectorAll<HTMLButtonElement>('.ig-drop-target button')]
      .find((item) => item.getAttribute('aria-label')?.includes('permitted or required by law'))!;
    await click(slot);
    expect(container.textContent).toContain('1 of 8 placed');
    await click(button('Submit Answers'));
    expect(container.textContent).toContain('1 / 8 correct');
  });

  it('generates source-backed Quiz and Speaking Cards from the selected database terms', async () => {
    await render();
    await game('Speaking Cards');
    await click(button('Deal'));
    expect(container.textContent).toContain('in your own words');
    await game('Quiz');
    expect(container.querySelectorAll('.ig-quiz .ig-answer-button')).toHaveLength(4);
    expect(container.querySelector('.ig-question')?.textContent).toBe('Relating to what is permitted or required by law.');
  });

  it('shows a clean no-content state instead of fake or stale sample questions', async () => {
    mockApi.mockImplementation(async (path: string) => {
      if (path.includes('/catalog')) return { data: catalog() };
      return { data: { ...pack(1, null), pairs: [] } };
    });
    await render();
    expect(container.textContent).toContain('No linked glossary terms');
    expect(container.querySelectorAll('.ig-game-tile')).toHaveLength(0);
  });
});
