import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractiveGamesPage } from './InteractiveGamesPage';

describe('Eight screenshot-aligned Cambridge Interactive Games', () => {
  let root: Root;
  let container: HTMLDivElement;
  const render = async (teacher = false) => {
    await act(async () => root.render(<InteractiveGamesPage isTeacher={teacher} />));
  };
  const click = async (item: HTMLButtonElement) => { await act(async () => item.click()); };
  const getButton = (text: string) => {
    const node = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((item) => item.textContent?.trim() === text);
    if (!node) throw new Error('Missing button: ' + text);
    return node;
  };
  const choose = async (name: string) => {
    const tile = [...container.querySelectorAll<HTMLButtonElement>('.ig-game-tile')]
      .find((item) => item.querySelector('strong')?.textContent === name);
    if (!tile) throw new Error('Missing game: ' + name);
    await click(tile);
  };

  beforeEach(() => {
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

  it('shows precisely eight requested games plus real pause and reset controls', async () => {
    await render(true);
    expect(container.textContent).toContain('Teacher preview');
    expect([...container.querySelectorAll('.ig-game-tile strong')].map((node) => node.textContent)).toEqual([
      'Match Up', 'Flash Cards', 'Speaking Cards', 'Spin the Wheel',
      'Open the Box', 'Quiz', 'Find the Match', 'Anagram',
    ]);
    expect(container.querySelector('.ig-clock')?.textContent).toContain('00:00');
    await click(getButton('Ⅱ Pause timer'));
    expect(container.textContent).toContain('▶ Resume timer');
    await click(getButton('↻ Restart'));
    expect(container.textContent).toContain('Ⅱ Pause timer');
  });

  it('Match Up places terms in definition slots and marks only on Submit Answers', async () => {
    await render();
    const terms = [...container.querySelectorAll<HTMLButtonElement>('.ig-bank-term')];
    const legal = terms.find((item) => item.textContent === 'Legal')!;
    await click(legal);
    const slot = [...container.querySelectorAll<HTMLButtonElement>('.ig-drop-target button')]
      .find((item) => item.getAttribute('aria-label')?.includes('permitted or required by law'))!;
    await click(slot);
    expect(slot.textContent).toBe('Legal');
    expect(container.querySelector('.ig-match-row.is-correct')).toBeNull();
    expect(container.textContent).toContain('1 of 8 placed');
    await click(getButton('Submit Answers'));
    expect(container.textContent).toContain('1 / 8 correct');
    expect(container.querySelectorAll('.ig-match-row.is-correct')).toHaveLength(1);
    await click(getButton('↻ Restart'));
    expect(container.textContent).toContain('0 of 8 placed');
  });

  it('Flash Cards begins with definition and reveals the corresponding term', async () => {
    await render();
    await choose('Flash Cards');
    expect(container.querySelector('.ig-flashcard')?.textContent).toContain('Relating to what is permitted');
    await click(getButton('Flip card'));
    expect(container.querySelector('.ig-flashcard')?.textContent).toContain('Legal');
    await click(getButton('Next →'));
    expect(container.querySelector('.ig-flashcard')?.textContent).toContain('Beliefs about the difference');
  });

  it('Speaking Cards deals from a deck, reveals talking points and can undo', async () => {
    await render();
    await choose('Speaking Cards');
    expect(container.querySelector('.ig-deck-stack')).not.toBeNull();
    expect(container.textContent).toContain('0 dealt');
    await click(getButton('Deal'));
    expect(container.textContent).toContain('1 dealt');
    await click(getButton('Reveal talking points'));
    expect(container.textContent).toContain('Suggested talking points');
    await click(getButton('Undo'));
    expect(container.textContent).toContain('0 dealt');
    await click(getButton('Shuffle'));
    await click(getButton('Deal'));
    expect(container.textContent).toContain('1 dealt');
  });

  it('Spin the Wheel supports choosing a topic, revealing and eliminating a slice', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    await render();
    await choose('Spin the Wheel');
    expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(8);
    expect(container.textContent).toContain('Definitions');
    await click(getButton('Spin the wheel'));
    expect(container.querySelector('.ig-wheel-result')).not.toBeNull();
    await click(getButton('Reveal definition'));
    expect(container.querySelector('.ig-wheel-result')?.textContent).toContain('Morality');
    await click(getButton('Eliminate this segment'));
    expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(7);
  });

  it('Open the Box contains numbered closed tiles and reveals only after opening', async () => {
    await render();
    await choose('Open the Box');
    const boxes = [...container.querySelectorAll<HTMLButtonElement>('.ig-box')];
    expect(boxes).toHaveLength(8);
    expect(boxes[0]?.textContent).toContain('1');
    await click(boxes[0]!);
    expect(container.textContent).toContain('1 / 8 boxes explored');
    expect(container.textContent).toContain('Explain: Legal');
    await click(getButton('Reveal answer'));
    expect(container.querySelector('.ig-box-detail')?.textContent).toContain('permitted or required by law');
  });

  it('Quiz uses four choices with first-attempt result, independent from Find the Match', async () => {
    await render();
    await choose('Quiz');
    expect(container.querySelectorAll('.ig-quiz .ig-answer-button')).toHaveLength(4);
    const quizOption = [...container.querySelectorAll<HTMLButtonElement>('.ig-quiz .ig-answer-button')]
      .find((item) => item.textContent?.includes('Plagiarism'))!;
    await click(quizOption);
    expect(container.textContent).toContain('Correct!');
    expect(container.textContent).toContain('1 correct');
    await click(getButton('Next question →'));
    expect(container.textContent).toContain('Question 2 / 6');
  });

  it('Find the Match eliminates the correct tile and deducts one life on an error', async () => {
    await render();
    await choose('Find the Match');
    expect(container.querySelectorAll('.ig-find-tile')).toHaveLength(8);
    expect(container.querySelector('.ig-find-clue')?.textContent).toContain('permitted or required by law');
    await click([...container.querySelectorAll<HTMLButtonElement>('.ig-find-tile')].find((item) => item.textContent === 'Legal')!);
    expect(container.querySelectorAll('.ig-find-tile')).toHaveLength(7);
    expect(container.textContent).toContain('1 / 8 matched');
    await click([...container.querySelectorAll<HTMLButtonElement>('.ig-find-tile')].find((item) => item.textContent === 'Culture')!);
    expect(container.querySelector('.ig-hearts')?.getAttribute('aria-label')).toBe('2 lives remaining');
  });

  it('Anagram is assembled from clickable letter tiles, not a free-text answer', async () => {
    await render();
    await choose('Anagram');
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelectorAll('.ig-anagram-letter')).toHaveLength(5);
    for (const letter of 'LEGAL') {
      const unused = [...container.querySelectorAll<HTMLButtonElement>('.ig-anagram-letter')]
        .find((item) => item.textContent === letter && !item.disabled)!;
      expect(unused).toBeDefined();
      await click(unused);
    }
    const slots = [...container.querySelectorAll('.ig-anagram-slot button')];
    expect(slots.map((item) => item.textContent).join('')).toBe('LEGAL');
    await click(getButton('Check answer'));
    expect(container.textContent).toContain('Correct! Legal');
    expect(container.textContent).toContain('1 solved on first try');
    await click(getButton('Next anagram →'));
    expect(container.textContent).toContain('Word 2 of 6');
  });
});
