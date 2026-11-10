import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpinWheel, type WheelOptions } from './SpinWheel';
import type { GamePair } from './game-content';
import { GameSignalContext } from './game-session';

const pairs: GamePair[] = Array.from({ length: 29 }, (_, i) => ({
  id: `term-${i}`, term: `Term ${i + 1}`,
  definition: `An accurate source-backed description of Cambridge term ${i + 1}`,
}));

function WheelFixture({ items, blocked, ended }: { items: readonly GamePair[]; blocked?: boolean; ended?: boolean }) {
  const [options, setOptions] = useState<WheelOptions>({ power: 'low', shuffle: false });
  return <SpinWheel pairs={items} options={options} onOptionsChange={setOptions} blocked={blocked} ended={ended} />;
}

describe('Classroom wheel', () => {
  let root: Root;
  let container: HTMLDivElement;
  const signal = vi.fn();
  const render = (items = pairs, blocked = false, ended = false) => act(async () => {
    root.render(<GameSignalContext.Provider value={signal}>
      <WheelFixture items={items} blocked={blocked} ended={ended} />
    </GameSignalContext.Provider>);
  });
  const click = (button: HTMLButtonElement) => act(async () => button.click());
  const advance = (ms: number) => act(async () => { vi.advanceTimersByTime(ms); });
  const findButton = (name: string) => {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent === name);
    if (!button) throw new Error(`Button not found ${name}`);
    return button;
  };
  const result = () => container.querySelector('.ig-wheel-result h3')?.textContent;
  const rotation = () => Number.parseFloat(container.querySelector<HTMLElement>('.ig-wheel-disc')!.style.getPropertyValue('--wheel-angle'));

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    signal.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lands on the selected segment, resumes with it, and excludes it after elimination', async () => {
    await render();
    expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(29);
    vi.spyOn(Math, 'random').mockReturnValue(.999);
    await click(findButton('Spin It'));
    expect(result()).toBeUndefined();
    expect(findButton('Spinning…').disabled).toBe(true);
    await advance(2400);
    expect(signal).toHaveBeenCalledWith('tick');
    expect(rotation()).toBeCloseTo(360 / 29);
    expect(result()).toContain('Cambridge term 29');
    expect(container.querySelector('.ig-wheel-viewport[hidden]')).toBeTruthy();
    await click(findButton('Resume'));
    expect(container.querySelector('.ig-wheel-viewport[hidden]')).toBeNull();
    expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(29);
    await click(findButton('Spin It'));
    await advance(2400);
    expect(result()).toContain('Cambridge term 29');
    await click(findButton('Eliminate'));
    expect(container.querySelectorAll('.ig-wheel-label')).toHaveLength(28);
    await click(findButton('Spin It'));
    await advance(2400);
    expect(result()).toContain('Cambridge term 28');
    expect(container.querySelectorAll('.ig-wheel-choice')).toHaveLength(4);
  });

  it('supports a touch flick and uses the final pointer angle for the result', async () => {
    await render();
    const wheel = container.querySelector<HTMLDivElement>('.ig-wheel-wrap')!;
    wheel.setPointerCapture = vi.fn();
    vi.spyOn(wheel, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200 } as DOMRect);
    function touch(type: string, x: number, y: number, time: number) {
      const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
      Object.defineProperties(event, {
        pointerId: { value: 7 }, pointerType: { value: 'touch' }, timeStamp: { value: time },
      });
      return act(async () => { wheel.dispatchEvent(event); });
    }
    await touch('pointerdown', 100, 12, 0);
    await touch('pointermove', 188, 100, 40);
    expect(rotation()).toBe(90);
    await touch('pointerup', 188, 100, 44);
    expect(wheel.setPointerCapture).toHaveBeenCalledWith(7);
    expect(result()).toBeUndefined();
    await advance(2400);
    const indexAtPointer = (29 - Math.round(rotation() / (360 / 29))) % 29;
    expect(result()).toBe(pairs[indexAtPointer]?.definition);
  });

  it('opens the selected definition as a four-choice test and marks the first answer', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.spyOn(Math, 'random').mockReturnValue(.999);
    await render(pairs.slice(0, 5));
    await click(findButton('Spin It'));
    const choices = () => [...container.querySelectorAll<HTMLButtonElement>('.ig-wheel-choice')];
    expect(result()).toBe(pairs[4]?.definition);
    expect(choices().map((button) => button.querySelector('span')?.textContent)).toEqual(['A', 'B', 'C', 'D']);
    expect(new Set(choices().map((button) => button.querySelector('strong')?.textContent)).size).toBe(4);
    expect(container.querySelector('.ig-wheel-choice.is-correct')).toBeNull();
    await click(choices().find((button) => button.querySelector('strong')?.textContent !== pairs[4]?.term)!);
    expect(container.querySelector('.ig-wheel-choice.is-wrong')).toBeTruthy();
    expect(container.querySelector('.ig-wheel-choice.is-correct strong')?.textContent).toBe(pairs[4]?.term);
    expect(choices().every((button) => button.disabled)).toBe(true);
    expect(signal.mock.calls.filter(([kind]) => kind === 'review')).toHaveLength(1);
    await click(findButton('Resume'));
    await click(findButton('Terms'));
    await click(findButton('Spin It'));
    expect(result()).toBe(pairs[4]?.term);
    const correct = choices().find((button) => button.querySelector('strong')?.textContent === pairs[4]?.definition)!;
    expect(correct.disabled).toBe(false);
    await click(correct);
    expect(container.querySelector('.ig-wheel-answer-status')?.textContent).toBe('Correct!');
  });

  it('shows the full answer and completes when the last segment is eliminated', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    await render(pairs.slice(0, 1));
    await click(findButton('Terms'));
    await click(container.querySelector<HTMLButtonElement>('.ig-wheel-hub')!);
    expect(result()).toBe(pairs[0]?.term);
    await click(findButton('Reveal answer'));
    expect(container.querySelector('.ig-reveal')?.textContent).toBe(pairs[0]?.definition);
    await click(findButton('Hide answer'));
    await click(findButton('Reveal answer'));
    expect(signal.mock.calls.filter(([kind]) => kind === 'review')).toHaveLength(1);
    await click(findButton('Eliminate'));
    expect(container.textContent).toContain('All segments have been eliminated.');
    expect(signal).toHaveBeenCalledWith('complete');
  });

  it('keeps all items when shuffled and spins longer on High', async () => {
    await render();
    const labels = () => [...container.querySelectorAll('.ig-wheel-radial title')].map((item) => item.textContent);
    const original = labels();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await act(async () => container.querySelector<HTMLInputElement>('.ig-wheel-settings input')!.click());
    expect(labels()).not.toEqual(original);
    expect(labels().sort()).toEqual(original.sort());
    const select = container.querySelector<HTMLSelectElement>('.ig-wheel-settings select')!;
    await act(async () => { select.value = 'high'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await click(findButton('Spin It'));
    await advance(2400);
    expect(result()).toBeUndefined();
    await advance(1800);
    expect(result()).toBeTruthy();
  });

  it('cancels an in-flight spin when the session expires or is finished', async () => {
    await render();
    await click(findButton('Spin It'));
    await advance(400);
    await render(pairs, true, true);
    const stoppedAt = rotation();
    await advance(5000);
    expect(rotation()).toBe(stoppedAt);
    expect(result()).toBeUndefined();
    await click(findButton('Spin It'));
    expect(signal.mock.calls.filter(([kind]) => kind === 'spin')).toHaveLength(1);
  });
});
