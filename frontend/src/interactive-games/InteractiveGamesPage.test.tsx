import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractiveGamesPage } from './InteractiveGamesPage';

describe('Standalone Interactive Games', () => {
  let root: Root;
  let container: HTMLDivElement;
  const render = async (isTeacher = false) => {
    await act(async () => root.render(<InteractiveGamesPage isTeacher={isTeacher} />));
  };
  const click = async (button: HTMLButtonElement) => {
    await act(async () => button.click());
  };
  const chooseGame = async (name: string) => {
    const tile = [...container.querySelectorAll<HTMLButtonElement>('.ig-game-tile')]
      .find((item) => item.querySelector('strong')?.textContent === name);
    expect(tile).toBeDefined();
    await click(tile!);
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
  });

  it('opens Chapter 7.1 and scores a correct match, then restarts cleanly', async () => {
    await render();
    expect(container.textContent).toContain('Chapter 7');
    expect(container.textContent).toContain('Section 7.1');
    expect(container.querySelectorAll('.ig-game-tile')).toHaveLength(4);
    const term = [...container.querySelectorAll<HTMLButtonElement>('.ig-choice-column:first-child button')]
      .find((item) => item.textContent === 'Legal')!;
    const definition = [...container.querySelectorAll<HTMLButtonElement>('.ig-choice-column:nth-child(2) button')]
      .find((item) => item.textContent?.startsWith('Relating to what is permitted'))!;
    await click(term);
    await click(definition);
    expect(container.textContent).toContain('1 / 8 matched');
    expect(container.textContent).toContain('1 correct on first attempt');
    await click(container.querySelector<HTMLButtonElement>('.ig-reset')!);
    expect(container.textContent).toContain('0 / 8 matched');
  });

  it('reveals flashcards and changes the card without carrying over the answer', async () => {
    await render();
    await chooseGame('Flash Cards');
    expect(container.querySelector('.ig-flashcard')?.textContent).toContain('Legal');
    await click([...container.querySelectorAll<HTMLButtonElement>('.ig-card-controls button')].find((button) => button.textContent === 'Reveal answer')!);
    expect(container.querySelector('.ig-flashcard')?.textContent).toContain('Relating to what is permitted');
    await click([...container.querySelectorAll<HTMLButtonElement>('.ig-card-controls button')].find((button) => button.textContent?.includes('Next'))!);
    expect(container.querySelector('.ig-flashcard')?.textContent).toContain('Morality');
    expect(container.querySelector('.ig-flashcard')?.textContent).not.toContain('Beliefs about the difference');
  });

  it('can find a memory pair and switches games with fresh state', async () => {
    await render(true);
    expect(container.textContent).toContain('Teacher preview');
    await chooseGame('Matching Pairs');
    const cards = [...container.querySelectorAll<HTMLButtonElement>('.ig-memory-card')];
    expect(cards).toHaveLength(16);
    // Pilot deck order: index 2 is the term Legal, index 7 its definition.
    await click(cards[2]);
    await click(cards[7]);
    expect(container.textContent).toContain('1 / 8 pairs found');
    expect(cards[2].disabled).toBe(true);
    expect(cards[7].disabled).toBe(true);
    await chooseGame('Group Sort');
    expect(container.textContent).toContain('A rule established by law');
    await click([...container.querySelectorAll<HTMLButtonElement>('.ig-sort-choice')].find((button) => button.textContent === 'Legal')!);
    expect(container.textContent).toContain('Correct!');
    expect(container.textContent).toContain('1 correct');
  });
});
