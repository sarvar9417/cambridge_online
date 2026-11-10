import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassroomMode } from './ClassroomMode';
import type { GamePair } from './game-content';

const terms: GamePair[] = [
  { id: 'a', term: 'Encryption', definition: 'Converting plaintext into ciphertext.', chapterNo: 17 },
  { id: 'b', term: 'Decryption', definition: 'Recovering plaintext from ciphertext.', chapterNo: 17 },
];

describe('teacher Classroom Mode', () => {
  let root: Root;
  let container: HTMLDivElement;
  const nextRound = vi.fn();
  const exit = vi.fn();
  const fullscreen = vi.fn();
  async function render(pairs: readonly GamePair[] = terms) {
    await act(async () => {
      root.render(<ClassroomMode pairs={pairs} isFullscreen={false}
        onToggleFullscreen={fullscreen} onNextRound={nextRound} onExit={exit} />);
    });
  }
  async function click(text: string) {
    const button = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((item) => item.textContent?.trim() === text);
    if (!button) throw new Error('Missing button: ' + text);
    await act(async () => { button.click(); });
  }
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    nextRound.mockReset();
    exit.mockReset();
    fullscreen.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('reveals source-linked vocabulary only on request and hides the answer on navigation', async () => {
    await render();
    expect(container.querySelector('.ig-classroom-card h3')?.textContent).toBe('Encryption');
    expect(container.querySelector('.ig-classroom-definition')).toBeNull();
    await click('Reveal definition');
    expect(container.querySelector('.ig-classroom-definition')?.textContent).toContain(terms[0]!.definition);
    await click('Next term →');
    expect(container.querySelector('.ig-classroom-card h3')?.textContent).toBe('Decryption');
    expect(container.querySelector('.ig-classroom-definition')).toBeNull();
    await click('↻ Next vocabulary round');
    expect(nextRound).toHaveBeenCalledOnce();
    await click('⛶ Full screen');
    expect(fullscreen).toHaveBeenCalledOnce();
    await click('Exit classroom mode');
    expect(exit).toHaveBeenCalledOnce();
  });

  it('uses only session-local manual scores, supports up to four teams and requires clear confirmation', async () => {
    await render();
    expect(container.querySelectorAll('.ig-classroom-team')).toHaveLength(2);
    const award = container.querySelector<HTMLButtonElement>('button[aria-label="Award one point to team 1"]')!;
    await act(async () => { award.click(); });
    expect(container.querySelector('.ig-classroom-team output')?.textContent).toBe('1');
    await click('+ Add team');
    await click('+ Add team');
    expect(container.querySelectorAll('.ig-classroom-team')).toHaveLength(4);
    const add = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((item) => item.textContent?.trim() === '+ Add team')!;
    expect(add.disabled).toBe(true);
    await click('Clear scoreboard');
    expect(container.querySelector('.ig-classroom-team output')?.textContent).toBe('1');
    await click('Cancel');
    expect(container.querySelector('.ig-classroom-team output')?.textContent).toBe('1');
    await click('Clear scoreboard');
    await click('Yes, clear scores');
    expect([...container.querySelectorAll('.ig-classroom-team output')].every((item) => item.textContent === '0')).toBe(true);
    expect(container.textContent).toContain('never written to a student profile');
  });

  it('resets the revealed answer and index when a new vocabulary round arrives', async () => {
    await render();
    await click('Next term →');
    await click('Reveal definition');
    await render([terms[1]!]);
    expect(container.textContent).toContain('Vocabulary 1 / 1');
    expect(container.querySelector('.ig-classroom-definition')).toBeNull();
  });
});
