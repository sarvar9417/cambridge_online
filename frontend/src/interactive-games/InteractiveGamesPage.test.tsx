import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractiveGamesPage } from './InteractiveGamesPage';

describe('Standalone Interactive Games — exactly eight requested experiences', () => {
  let root: Root;
  let container: HTMLDivElement;
  const render = async (isTeacher = false) => {
    await act(async () => root.render(<InteractiveGamesPage isTeacher={isTeacher} />));
  };
  const click = async (button: HTMLButtonElement) => {
    await act(async () => button.click());
  };
  const findButton = (text: string): HTMLButtonElement => {
    const found = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((item) => item.textContent?.trim() === text);
    if (!found) throw new Error('Missing button: ' + text);
    return found;
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
    vi.restoreAllMocks();
  });

  it('shows the exact eight-mode catalog and Match Up first-attempt results', async () => {
    await render();
    expect(container.textContent).toContain('Chapter 7');
    expect(container.textContent).toContain('Section 7.1');
    expect([...container.querySelectorAll('.ig-game-tile strong')].map((node) => node.textContent)).toEqual([
      'Match Up', 'Flash Cards', 'Speaking Cards', 'Spin the Wheel',
      'Open the Box', 'Quiz', 'Find the Match', 'Anagram',
    ]);
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

  it('reveals Flash Cards, advances, and hides the next answer', async () => {
    await render();
    await chooseGame('Flash Cards');
    expect(container.querySelector('.ig-flashcard')?.textContent).toContain('Legal');
    await click(findButton('Reveal answer'));
    expect(container.querySelector('.ig-flashcard')?.textContent).toContain('Relating to what is permitted');
    await click(findButton('Next →'));
    expect(container.querySelector('.ig-flashcard')?.textContent).toContain('Morality');
    expect(container.querySelector('.ig-flashcard')?.textContent).not.toContain('Beliefs about the difference');
  });

  it('shows oral Speaking Cards without claiming a verified speaking score', async () => {
    await render(true);
    expect(container.textContent).toContain('Teacher preview');
    await chooseGame('Speaking Cards');
    expect(container.textContent).toContain('answer aloud');
    expect(container.textContent).toContain('does not record or verify audio');
    await click(findButton('Reveal talking points'));
    expect(container.textContent).toContain('Law determines legality');
    await click(findButton('Next →'));
    expect(container.textContent).not.toContain('Law determines legality');
  });

  it('spins a visible wheel and reveals its selected topic definition', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    await render();
    await chooseGame('Spin the Wheel');
    expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(8);
    await click(findButton('Spin the wheel'));
    expect(container.querySelector('.ig-wheel-result')?.textContent).toContain('Morality');
    await click(findButton('Reveal definition'));
    expect(container.querySelector('.ig-wheel-result')?.textContent).toContain('Beliefs about the difference');
  });

  it('opens independent numbered boxes and supports hiding the revealed answer', async () => {
    await render();
    await chooseGame('Open the Box');
    expect(container.querySelectorAll('.ig-box')).toHaveLength(8);
    await click(container.querySelector<HTMLButtonElement>('.ig-box')!);
    expect(container.textContent).toContain('1 / 8 boxes explored');
    expect(container.textContent).toContain('Explain: Legal');
    await click(findButton('Reveal answer'));
    expect(container.querySelector('.ig-box-detail')?.textContent).toContain('permitted or required by law');
    await click(findButton('Hide answer'));
    expect(container.querySelector('.ig-box-detail')?.textContent).not.toContain('permitted or required by law');
  });

  it('scores Quiz and Find the Match as two distinct question experiences', async () => {
    await render();
    await chooseGame('Quiz');
    expect(container.querySelector('.ig-question')?.textContent).toContain('another person');
    await click(findButton('Plagiarism'));
    expect(container.querySelector('.ig-answer-feedback')?.textContent).toContain('Correct!');
    expect(container.textContent).toContain('1 correct');
    await click(findButton('Next question →'));
    expect(container.textContent).toContain('Question 2 / 6');

    await chooseGame('Find the Match');
    expect(container.querySelector('.ig-question')?.textContent).toContain('permitted or required by law');
    await click(findButton('Legal'));
    expect(container.querySelector('.ig-answer-feedback')?.textContent).toContain('Correct!');
    await click(findButton('Next definition →'));
    expect(container.textContent).toContain('Definition 2 / 8');
  });

  it('validates anagram input, showing first-try success only for independent answers', async () => {
    await render();
    await chooseGame('Anagram');
    expect(container.querySelectorAll('.ig-anagram-letters span')).toHaveLength(5);
    const input = container.querySelector<HTMLInputElement>('#ig-anagram-input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Legal');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(findButton('Check answer'));
    expect(container.textContent).toContain('Correct! Legal');
    expect(container.textContent).toContain('1 solved on first try');
    await click(findButton('Next anagram →'));
    expect(container.textContent).toContain('Word 2 / 6');
    await click(findButton('Reveal answer'));
    expect(container.textContent).toContain('Answer revealed, not counted as a correct attempt.');
    expect(container.textContent).toContain('1 solved on first try');
  });
});
