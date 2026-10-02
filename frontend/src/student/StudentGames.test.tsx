import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentGames } from '../lib/api';
import { StudentGames } from './StudentGames';

const empty: ContentGames = { termMatch: [], sequence: [], spotTheGap: [] };
const sequence = [{ id: 'one', code: '1.1', text: 'First' }, { id: 'two', code: '1.2', text: 'Second' }];

describe('Student games', () => {
  let root: Root;
  let container: HTMLDivElement;
  const render = async (games: ContentGames) => { await act(async () => root.render(<StudentGames games={games} />)); };
  const button = (text: string) => [...container.querySelectorAll('button')].find(el => el.textContent === text)!;
  const click = async (text: string) => { await act(async () => button(text).click()); };
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

  it('opens the available sequence game and prevents empty modes and zero-question scores', async () => {
    await render({ ...empty, sequence });
    expect(button('Term match').disabled).toBe(true);
    expect(button('Spot the gap').disabled).toBe(true);
    expect(container.querySelectorAll('.sequence-item')).toHaveLength(2);
    await click('Term match');
    await click('Tekshirish');
    expect(container.textContent).toContain('Tartibni yana tekshiring');
    expect(container.textContent).not.toContain('0/0');
    await act(async () => container.querySelectorAll<HTMLButtonElement>('[title="Yuqoriga"]')[1]!.click());
    await click('Tekshirish');
    expect(container.textContent).toContain('To‘g‘ri tartib');
  });

  it('does not offer a game when no playable dataset exists', async () => {
    await render(empty);
    expect(container.querySelector('button')).toBeNull();
    await render({ ...empty, sequence: sequence.slice(0, 1) });
    expect(container.querySelector('button')).toBeNull();
  });

  it('allows a gap-only dataset and accepts a trimmed answer without case sensitivity', async () => {
    await render({ ...empty, spotTheGap: [{ id: 'bit', prompt: '_____ is a binary digit', answer: 'Bit' }] });
    const input = container.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, ' BIT ');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click('Tekshirish');
    expect(container.querySelector('.game-result')?.textContent).toBe('To‘g‘ri');
  });

  it('scores term matches and resets results when the dataset changes', async () => {
    await render({ ...empty, termMatch: [{ id: 'bit', term: 'Bit', definition: 'A binary digit' }] });
    const select = container.querySelector('select')!;
    await act(async () => { select.value = 'bit'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await click('Tekshirish');
    expect(container.querySelector('.game-result')?.textContent).toBe('1/1 to‘g‘ri');
    await render({ ...empty, sequence });
    expect(container.querySelector('.game-result')).toBeNull();
    expect(container.querySelectorAll('.sequence-item')).toHaveLength(2);
  });
});
