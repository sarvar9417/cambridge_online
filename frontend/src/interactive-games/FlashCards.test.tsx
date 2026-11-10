import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlashCards } from './FlashCards';
import { GameSignalContext, type GameSignalHandler } from './game-session';

describe('Flash Cards spaced-review self-rating', () => {
  let root: Root;
  let container: HTMLDivElement;
  const signal = vi.fn<GameSignalHandler>();
  const onResult = vi.fn();
  const pair = {
    id: '302745c8-0397-4ec2-ac0a-a0b65cef1fb1',
    term: 'Encryption',
    definition: 'Converts plaintext into ciphertext.',
  };
  const render = async () => act(async () => {
    root.render(
      <GameSignalContext.Provider value={signal}>
        <FlashCards pairs={[pair]} requireSelfMark onResult={onResult} />
      </GameSignalContext.Provider>,
    );
    await Promise.resolve();
  });
  const click = async (label: string) => {
    const button = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((item) => item.textContent?.trim() === label);
    if (!button) throw new Error('Missing button: ' + label);
    await act(async () => { button.click(); await Promise.resolve(); });
  };

  beforeEach(() => {
    signal.mockReset();
    onResult.mockReset();
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

  it('requires a self-rating and records it as self_rating, not scored_response', async () => {
    await render();
    const selfMark = container.querySelector<HTMLInputElement>('.ig-template-options input[type="checkbox"]');
    expect(selfMark?.checked).toBe(true);
    expect(selfMark?.disabled).toBe(true);
    await click('Flip card');
    await click('✓ Knew it');
    expect(onResult).toHaveBeenCalledWith({
      id: pair.id,
      prompt: pair.definition,
      submitted: 'self-rated: knew it',
      expected: pair.term,
      correct: true,
    });
    expect(signal).toHaveBeenCalledWith('correct');
  });

  it('records a due term marked for further practice as an incorrect self-rating', async () => {
    await render();
    await click('Flip card');
    await click('✕ Practise again');
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({
      id: pair.id, correct: false, submitted: 'self-rated: practise again',
    }));
    expect(signal).toHaveBeenCalledWith('incorrect');
  });
});
