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
  it('uses all 29 sectors, reveals only after landing, and removes the selected sector', async () => {
    vi.useFakeTimers();
    try {
      expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(29);
      vi.spyOn(Math, 'random').mockReturnValue(0.999);
      await click(findButton('Spin the wheel'));
      expect(container.querySelector('.ig-wheel-result')).toBeNull();
      expect(findButton('Spinning…').disabled).toBe(true);
      await act(async () => { vi.advanceTimersByTime(1800); });
      expect(container.querySelector('.ig-wheel-result h3')?.textContent).toContain('Cambridge term 29');
      await click(findButton('Eliminate this segment'));
      expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(28);
      expect(findButton('Spin the wheel').disabled).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
