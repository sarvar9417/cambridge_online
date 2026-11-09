import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpinWheel } from './ExtraGames';
import type { GamePair } from './game-content';

describe('Readable classroom wheel with 29 terms', () => {
  let root: Root;
  let container: HTMLDivElement;
  const pairs: GamePair[] = Array.from({ length: 29 }, (_, i) => ({
    id: 'term-' + i, term: 'Term ' + (i + 1),
    definition: 'An accurate source-backed description of Cambridge term ' + (i + 1),
  }));
  const click = async (button: HTMLButtonElement) => {
    await act(async () => button.click());
  };
  const findButton = (name: string) => {
    const btn = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((element) => element.textContent === name);
    if (!btn) throw new Error('Button not found ' + name);
    return btn;
  };
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<SpinWheel pairs={pairs} />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('shows at most ten readable sectors, with access to all 29 items', async () => {
    expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(10);
    expect(container.textContent).toContain('Wheel set 1 of 3');
    expect(findButton('← Previous set').disabled).toBe(true);
    await click(findButton('Next set →'));
    expect(container.textContent).toContain('Wheel set 2 of 3');
    expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(10);
    await click(findButton('Next set →'));
    expect(container.textContent).toContain('Wheel set 3 of 3');
    expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(9);
    expect(container.textContent).toContain('29 segments remaining');
  });
  it('keeps the full definition in the result panel, not tiny circular text', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await click(findButton('Spin the wheel'));
    expect(container.querySelector('.ig-wheel-result')?.textContent).toContain('An accurate source-backed description');
    expect(findButton('Spin the wheel').disabled).toBe(true);
    await click(findButton('Eliminate this segment'));
    expect(container.textContent).toContain('28 segments remaining');
    expect(findButton('Spin the wheel').disabled).toBe(false);
  });
});
