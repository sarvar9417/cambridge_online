import type { CSSProperties } from 'react';

/**
 * Chapter 14 projector reveal contract.
 * Future teaching structure stays faintly visible so the projector never looks
 * empty and students can keep their place. The current step is fully emphasised.
 */
export function revealStyle(reveal:number,step:number):CSSProperties{
  const visible=reveal>=step;
  return {
    opacity:visible?1:.28,
    visibility:'visible',
    transform:'none',
    transition:'opacity .2s ease',
  };
}

export const chapter14Mono={fontFamily:'var(--font-mono)'} as const;
