import type { CSSProperties } from 'react';

/**
 * Chapter 14 projector reveal contract.
 * Future teaching content is genuinely hidden rather than left readable at low opacity.
 * Layout space remains reserved so the slide does not jump while the teacher reveals it.
 */
export function revealStyle(reveal:number,step:number):CSSProperties{
  const visible=reveal>=step;
  return {
    opacity:visible?1:0,
    visibility:visible?'visible':'hidden',
    transform:visible?'translateY(0)':'translateY(6px)',
    transition:'opacity .2s ease, transform .2s ease',
  };
}

export const chapter14Mono={fontFamily:'var(--font-mono)'} as const;
