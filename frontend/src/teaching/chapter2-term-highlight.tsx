/**
 * Term highlighting layer.
 *
 * Chapter 2 key terms appear throughout slide copy (bullets, leads, key-term
 * cards, rich blocks). To make the presentation classroom-clear, every
 * occurrence of a coursebook key term is wrapped in a <mark> so the board view
 * and the student view both show the emphasised vocabulary the book prints in
 * bold.
 */

import type { ReactNode } from 'react';
import {
  CHAPTER_2_KEY_TERMS_2_1,
  CHAPTER_2_KEY_TERMS_2_2,
} from './chapter2-source-emphasis';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Longest-first matching so compound terms win over their fragments. */
const ALL_TERMS = [...CHAPTER_2_KEY_TERMS_2_1, ...CHAPTER_2_KEY_TERMS_2_2]
  .map(item => item.term)
  .sort((a, b) => b.length - a.length);

/** Per-term boundary: word characters get \b, non-word starts/ends do not. */
const termPattern = (term: string) => {
  const start = /^\w/.test(term) ? '\\b' : '';
  const end = /\w$/.test(term) ? '\\b' : '';
  return `${start}${escapeRegExp(term)}${end}`;
};

const MATCHER = new RegExp(`(${ALL_TERMS.map(termPattern).join('|')})`, 'gi');

/** True when a term is an all-caps acronym (WAN, IPv4, CSMA/CD…). */
const isAllCapsAcronym = (term: string) => /^[A-Z0-9()/]+$/.test(term.replace(/\s/g, ''));

/**
 * Case policy at the matcher call sites: acronyms must match their exact
 * casing (WAN ≠ wan), ordinary words match case-insensitively so natural
 * sentence use is covered. The regex runs case-insensitively and the check
 * below filters exact-case acronyms out.
 */
const isExactCaseAcronym = (match: string) =>
  ALL_TERMS.some(term => isAllCapsAcronym(term) && term === match);

/**
 * Split text into highlighted fragments. Terms are only highlighted inside
 * Chapter 2 slides (guarded by the caller through `enabled`).
 */
export function highlightChapter2Terms(text: string, enabled: boolean): ReactNode[] {
  if (!enabled || !text) return [text];
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  MATCHER.lastIndex = 0;
  for (let match = MATCHER.exec(text); match; match = MATCHER.exec(text)) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (!isExactCaseAcronym(match[0])) {
      nodes.push(<mark key={`ch2-term-${key++}`} className="ch2-term-highlight">{match[0]}</mark>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : [text];
}

export const isChapter2KeyTerm = (value: string) => {
  const text = value.trim();
  return ALL_TERMS.some(term =>
    isAllCapsAcronym(term) ? term === text : term.toLowerCase() === text.toLowerCase(),
  );
};
/** Chapter 2 slide guard used by the render layer. */
export const isChapter2Slide = (slideId: string) => slideId.startsWith('h2-');
