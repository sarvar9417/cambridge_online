import { createContext, useContext } from 'react';

/**
 * Lightweight feedback channel for practice-only game rounds.
 * Signals are local to the mounted game; no scores are sent to a server.
 * Revealing a card or dealing a speaking prompt is never counted as mastery.
 */
export type GameSignal = 'start' | 'correct' | 'incorrect' | 'review' | 'flip' | 'deal' | 'spin' | 'tick' | 'open' | 'complete';
export type GameSignalHandler = (signal: GameSignal, count?: number) => void;
export const GameSignalContext = createContext<GameSignalHandler>(() => {});
export const useGameSignal = () => useContext(GameSignalContext);

let sharedAudio: AudioContext | null = null;

/** Original, synthesized short sound effects: no third-party sound assets. */
export function soundEffect(kind: Exclude<GameSignal, 'start'>) {
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return;
  try {
    sharedAudio ??= new window.AudioContext();
    const context = sharedAudio;
    if (context.state === 'suspended') void context.resume().catch(() => {});
    const tones: Record<Exclude<GameSignal, 'start'>, Array<[number, number]>> = {
      correct: [[523, 0], [784, 0.095]],
      incorrect: [[240, 0], [175, 0.095]],
      review: [[440, 0]],
      flip: [[560, 0]],
      deal: [[390, 0], [460, 0.055]],
      spin: [[850, 0]],
      tick: [[1050, 0]],
      open: [[330, 0], [660, 0.09]],
      complete: [[523, 0], [659, 0.1], [784, 0.2]],
    };
    const short = kind === 'tick' || kind === 'spin';
    const duration = short ? .035 : .16;
    const start = context.currentTime + 0.005;
    for (const [frequency, offset] of tones[kind]) {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const time = start + offset;
      oscillator.type = short ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(0.0001, time);
      volume.gain.exponentialRampToValueAtTime(short ? .04 : .075, time + .008);
      volume.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(volume);
      volume.connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + duration + .01);
    }
  } catch {
    // Private-mode, autoplay and unsupported devices must never stop gameplay.
  }
}

export function formatClock(value: number): string {
  const safe = Math.max(0, Math.floor(value));
  return String(Math.floor(safe / 60)).padStart(2, '0') + ':' + String(safe % 60).padStart(2, '0');
}

export const GAME_TIMER_OPTIONS = [
  { seconds: 0, label: 'No time limit' },
  { seconds: 30, label: '30 seconds' },
  { seconds: 60, label: '1 minute' },
  { seconds: 120, label: '2 minutes' },
  { seconds: 300, label: '5 minutes' },
  { seconds: 600, label: '10 minutes' },
] as const;
