const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

export type ChoiceQuestion = {
  kind: 'single' | 'multiple';
  maxSelections: number;
  prompt: string;
  options: Array<{ key: string; text: string }>;
};

export type WordBankQuestion = {
  prompt: string;
  bankText: string;
  passage: string;
  slots: number;
};

/** Remove PDF-print artefacts without rewriting the Cambridge wording. */
export function cleanExamStem(value: string | null | undefined) {
  return (value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/DO\s+NOT\s+WRITE\s+IN\s+THIS\s+MARGIN/gi, '\n')
    .replace(/\s*\[\s*\d+\s*\]\s*$/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function plain(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function markerPositions(text: string) {
  const matches = [...text.matchAll(/(?:^|\s)([A-D])\s+(?=\S)/g)];
  const positions: Array<{ key: string; index: number; contentStart: number }> = [];
  let cursor = -1;
  for (const key of ['A', 'B', 'C', 'D']) {
    const found = matches.find((match) => match[1] === key && (match.index ?? -1) > cursor);
    if (!found || found.index === undefined) return [];
    const leading = found[0].startsWith(' ') ? 1 : 0;
    const index = found.index + leading;
    const contentStart = found.index + found[0].length;
    positions.push({ key, index, contentStart });
    cursor = found.index;
  }
  return positions;
}

/** Parse the common Cambridge A/B/C/D tick-box layout from flattened PDF text. */
export function parseChoiceQuestion(value: string | null | undefined): ChoiceQuestion | null {
  const text = plain(cleanExamStem(value));
  if (!text) return null;

  const markers = markerPositions(text);
  if (markers.length === 4) {
    const options = markers.map((marker, index) => ({
      key: marker.key,
      text: text.slice(marker.contentStart, markers[index + 1]?.index ?? text.length).trim(),
    }));
    if (options.every((option) => option.text.length > 0)) {
      return {
        kind: 'single',
        maxSelections: 1,
        prompt: text.slice(0, markers[0]!.index).trim(),
        options,
      };
    }
  }

  const circle = text.match(/\bCircle\s+(one|two|three|four|five|six|\d+)\b/i);
  if (!circle || circle.index === undefined) return null;
  const rawCount = circle[1]!.toLowerCase();
  const maxSelections = /^\d+$/.test(rawCount) ? Number(rawCount) : NUMBER_WORDS[rawCount] ?? 0;
  if (!maxSelections) return null;

  const instructionEnd = text.indexOf('.', circle.index);
  if (instructionEnd < 0) return null;
  const prompt = text.slice(0, instructionEnd + 1).trim();
  const tail = text.slice(instructionEnd + 1).trim();
  const tokens = tail.split(/\s+/).filter(Boolean);
  if (tokens.length < maxSelections + 2 || tokens.length > 18) return null;
  if (!tokens.every((token) => /^[A-Za-z][A-Za-z-]{0,28}$/.test(token))) return null;

  return {
    kind: 'multiple',
    maxSelections,
    prompt,
    options: tokens.map((token, index) => ({ key: String(index + 1), text: token })),
  };
}

/**
 * Separate a printed word bank from the completion passage when PDF extraction
 * flattened the columns into one line. The raw bank is intentionally preserved
 * as text because column flattening can erase multi-word term boundaries.
 */
export function parseWordBankQuestion(
  value: string | null | undefined,
  marks: number,
): WordBankQuestion | null {
  const text = plain(cleanExamStem(value));
  if (!/Use (?:the )?terms? from the list/i.test(text)) return null;

  const instructionMatches = [...text.matchAll(/(?:Some\s+terms?[^.]*\.|You\s+should[^.]*\.)/gi)];
  const fallback = text.match(/Use (?:the )?terms? from the list\.[^.]*/i);
  const lastInstruction = instructionMatches.at(-1);
  const bankStart = lastInstruction?.index !== undefined
    ? lastInstruction.index + lastInstruction[0].length
    : fallback?.index !== undefined
      ? fallback.index + fallback[0].length
      : -1;
  if (bankStart < 0 || bankStart >= text.length) return null;

  const remainder = text.slice(bankStart).trim();
  const passageMatch = remainder.match(/\b[A-Z][A-Za-z-]*(?:\s+[A-Za-z][A-Za-z-]*){0,5}\s+(?:is|are|means|has|have|can|will|uses|contains|stores)\b/);
  if (!passageMatch || passageMatch.index === undefined || passageMatch.index < 3) return null;

  const bankText = remainder.slice(0, passageMatch.index).trim();
  const passage = remainder.slice(passageMatch.index).trim();
  if (!bankText || !passage) return null;

  return {
    prompt: text.slice(0, bankStart).trim(),
    bankText,
    passage,
    slots: Math.max(1, marks),
  };
}

export function responseKindFor(
  stem: string | null | undefined,
  answerKind: string | null | undefined,
  marks: number,
) {
  if (parseChoiceQuestion(stem)) return 'choice' as const;
  if (parseWordBankQuestion(stem, marks)) return 'word_bank' as const;
  if (answerKind === 'pseudocode' || answerKind === 'code') return 'code' as const;
  if (answerKind === 'table') return 'table' as const;
  if (answerKind === 'diagram' || answerKind === 'image') return 'diagram' as const;
  return 'text' as const;
}
