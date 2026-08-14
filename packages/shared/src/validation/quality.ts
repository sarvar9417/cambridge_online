import { COMMAND_WORDS, type CommandWord } from '../enums.js';
import { finding, isLeaf, leavesOf, type RuleDefinition } from './types.js';

export const MIN_EXTRACT_CONFIDENCE = 0.8;
export const MIN_STEM_LENGTH = 10;
export const MAX_STEM_LENGTH = 3000;
/** Two stems this similar across years are the same question reused. */
export const DUPLICATE_SIMILARITY = 0.95;

/**
 * Plausible mark ranges per command word. A `State` worth 6 marks is almost
 * always a misread bracket, not an unusual question.
 */
export const MARK_RANGES: Record<CommandWord, [number, number]> = {
  State: [1, 2],
  Give: [1, 2],
  Name: [1, 2],
  Identify: [1, 2],
  Define: [1, 3],
  Describe: [2, 5],
  Explain: [2, 5],
  Compare: [2, 6],
  Calculate: [1, 5],
  Complete: [1, 6],
  Draw: [1, 5],
  Write: [3, 15],
  Evaluate: [4, 12],
  Justify: [1, 5],
  Suggest: [1, 5],
  Show: [1, 5],
  Other: [1, 20],
};

/** V12 — a leaf with no command word cannot be graded to the right standard. */
export const V12: RuleDefinition = {
  code: 'V12',
  severity: 'warning',
  title: 'Command word is missing or not in the enum',
  run: (context) =>
    leavesOf(context)
      .filter(
        (leaf) =>
          !leaf.commandWord || !(COMMAND_WORDS as readonly string[]).includes(leaf.commandWord),
      )
      .map((leaf) =>
        finding(
          'V12',
          'warning',
          leaf.commandWord
            ? `"${leaf.commandWord}" is not a Cambridge command word`
            : 'no command word was extracted',
          leaf.path,
        ),
      ),
};

/** V13 — marks outside the usual range for the command word. */
export const V13: RuleDefinition = {
  code: 'V13',
  severity: 'warning',
  title: 'Marks are implausible for the command word',
  run: (context) =>
    leavesOf(context).flatMap((leaf) => {
      if (!leaf.commandWord || leaf.marks === null) return [];
      const range = MARK_RANGES[leaf.commandWord];
      if (!range) return [];
      const [min, max] = range;
      if (leaf.marks >= min && leaf.marks <= max) return [];
      return [
        finding(
          'V13',
          'warning',
          `${leaf.commandWord} worth ${leaf.marks}; expected ${min}-${max}`,
          leaf.path,
          { commandWord: leaf.commandWord, marks: leaf.marks, expected: range },
        ),
      ];
    }),
};

/**
 * V14 — printed answer lines should not be fewer than the marks.
 *
 * Cambridge gives roughly two lines per mark; fewer lines than marks usually
 * means the mark allocation was misread.
 */
export const V14: RuleDefinition = {
  code: 'V14',
  severity: 'warning',
  title: 'Fewer answer lines than marks',
  run: (context) =>
    leavesOf(context)
      .filter(
        (leaf) =>
          (leaf.answerKind === 'text' || leaf.answerKind === 'pseudocode') &&
          leaf.marks !== null &&
          (leaf.answerLines ?? 0) < leaf.marks,
      )
      .map((leaf) =>
        finding(
          'V14',
          'warning',
          `${leaf.answerLines ?? 0} answer lines for ${leaf.marks} marks`,
          leaf.path,
        ),
      ),
};

/** V17 — an empty or runaway stem is an extraction failure. */
export const V17: RuleDefinition = {
  code: 'V17',
  severity: 'warning',
  title: 'Stem length is implausible',
  run: (context) =>
    context.questions
      .filter((question) => isLeaf(context, question.path))
      .flatMap((question) => {
        const length = (question.stemMd ?? '').trim().length;
        if (length >= MIN_STEM_LENGTH && length <= MAX_STEM_LENGTH) return [];
        return [
          finding('V17', 'warning', `stem is ${length} characters`, question.path, { length }),
        ];
      }),
};

/** V18 — the model's own doubt is the cheapest signal available. */
export const V18: RuleDefinition = {
  code: 'V18',
  severity: 'error',
  title: 'Extraction confidence is below the floor',
  run: (context) =>
    context.questions
      .filter((question) => question.extractConfidence < MIN_EXTRACT_CONFIDENCE)
      .map((question) =>
        finding(
          'V18',
          'error',
          `extract_confidence ${question.extractConfidence.toFixed(2)} is below ${MIN_EXTRACT_CONFIDENCE}`,
          question.path,
        ),
      ),
};

/** Normalises a stem for comparison: case, punctuation and spacing are noise. */
export const normaliseStem = (stem: string) =>
  stem
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Dice coefficient over word bigrams; robust to small edits, cheap to run. */
export function stemSimilarity(left: string, right: string): number {
  const bigrams = (value: string) => {
    const words = normaliseStem(value).split(' ').filter(Boolean);
    if (words.length < 2) return new Set(words);
    return new Set(words.slice(0, -1).map((word, index) => `${word} ${words[index + 1]}`));
  };

  const a = bigrams(left);
  const b = bigrams(right);
  if (a.size === 0 || b.size === 0) return normaliseStem(left) === normaliseStem(right) ? 1 : 0;

  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared += 1;
  return (2 * shared) / (a.size + b.size);
}

/**
 * V19 — the same question printed in another year.
 *
 * Reported as information the teacher wants, not a defect: a repeat is proof
 * the topic matters, and it also stops a revision set showing the same question
 * five times.
 */
export const V19: RuleDefinition = {
  code: 'V19',
  severity: 'warning',
  title: 'Stem duplicates a question from another year',
  run: (context) => {
    const known = context.knownStems ?? [];
    if (known.length === 0) return [];

    return leavesOf(context).flatMap((leaf) => {
      const stem = leaf.stemMd ?? '';
      if (stem.trim().length < MIN_STEM_LENGTH) return [];

      const match = known
        .filter((candidate) => candidate.year !== context.year)
        .map((candidate) => ({ candidate, score: stemSimilarity(stem, candidate.stem) }))
        .filter((entry) => entry.score >= DUPLICATE_SIMILARITY)
        .sort((a, b) => b.score - a.score)[0];

      if (!match) return [];
      return [
        finding(
          'V19',
          'warning',
          `repeat of ${match.candidate.displayRef} (${match.candidate.year})`,
          leaf.path,
          { of: match.candidate.displayRef, year: match.candidate.year, score: match.score },
        ),
      ];
    });
  },
};

export const qualityRules = [V12, V13, V14, V17, V18, V19];
