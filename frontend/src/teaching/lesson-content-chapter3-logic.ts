import type { HodderLessonSlide } from './lesson-content-hodder-types';

const source = (page: number, elements: string[]) => ({
  sourcePages: [page],
  sourceLabel: `Hodder Chapter 3 · p.${page}`,
  sourceElements: [`Hodder p.${page}`, ...elements],
});

/** Source-specific continuation of Hodder 9618 Chapter 3, printed pp.90–94. */
export const CHAPTER_3_LOGIC_SLIDES: readonly HodderLessonSlide[] = [
  {
    id: 'h3-322-truth-table-combinations',
    section: '3.2 Logic gates and logic circuits',
    subtopicCode: '3.2.2',
    eyebrow: '3.2.2 · TABLE 3.9 · TRUTH TABLES',
    title: 'Truth tables trace every possible binary input combination',
    lead: 'The NOT gate has one input; the other five gates have two inputs. Hodder generalises the row count as 2ⁿ for n inputs.',
    bullets: [
      'NOT has 2¹ = 2 possible input combinations.',
      'Two-input gates have 2² = 4 possible input combinations.',
      'Three inputs produce 2³ = 8 combinations; four inputs produce 2⁴ = 16.',
      'Every possible combination of 0s and 1s must appear exactly once before outputs are traced.',
    ],
    visual: 'types',
    accent: 'cyan',
    ...source(90, ['3.2.2 Truth tables', 'Table 3.9', '2¹ = 2', '2² = 4', '2³ = 8', '2⁴ = 16']),
  },
  {
    id: 'h3-323-not-and-or',
    section: '3.2 Logic gates and logic circuits',
    subtopicCode: '3.2.3',
    eyebrow: 'FIGURES 3.23–3.25 · TABLES 3.10–3.12',
    title: 'NOT, AND and OR: symbol, description, notation and truth table belong together',
    lead: 'Hodder presents each gate using the same four-part pattern: gate symbol, verbal rule, logic/Boolean notation and truth table.',
    richBlocks: [{
      kind: 'table',
      table: {
        caption: 'Source-grounded gate rules',
        headers: ['Gate', 'Hodder rule', 'Logic notation', 'Boolean algebra'],
        rows: [
          ['NOT', 'X is 1 if input A is NOT 1', 'X = NOT A', 'X = A̅'],
          ['AND', 'X is 1 if A is 1 and B is 1', 'X = A AND B', 'X = A.B'],
          ['OR', 'X is 1 if A is 1 or B is 1', 'X = A OR B', 'X = A + B'],
        ],
      },
    }],
    visual: 'types',
    accent: 'indigo',
    ...source(91, ['Figure 3.23 NOT gate', 'Table 3.10', 'Figure 3.24 AND gate', 'Table 3.11', 'Figure 3.25 OR gate', 'Table 3.12']),
  },
  {
    id: 'h3-323-nand-nor-xor',
    section: '3.2 Logic gates and logic circuits',
    subtopicCode: '3.2.3',
    eyebrow: 'FIGURES 3.26–3.28 · NAND · NOR · XOR',
    title: 'NAND and NOR invert familiar gates; XOR is 1 when the two inputs differ',
    lead: 'The second group completes Hodder’s six-gate set and prepares students for tracing larger logic circuits.',
    richBlocks: [{
      kind: 'table',
      table: {
        caption: 'Source-grounded gate rules',
        headers: ['Gate', 'Hodder rule', 'Logic notation'],
        rows: [
          ['NAND (NOT AND)', 'X is 1 if input A is NOT 1 or input B is NOT 1', 'X = A NAND B'],
          ['NOR (NOT OR)', 'X is 1 if input A is NOT 1 and input B is NOT 1', 'X = A NOR B'],
          ['XOR', 'X is 1 when exactly one of A and B is 1', 'X = A XOR B'],
        ],
      },
    }],
    visual: 'types',
    accent: 'rose',
    ...source(93, ['Figure 3.26 NAND gate', 'Figure 3.27 NOR gate', 'Figure 3.28 XOR gate']),
  },
  {
    id: 'h3-323-six-gate-truth-tables',
    section: '3.2 Logic gates and logic circuits',
    subtopicCode: '3.2.3',
    eyebrow: 'TRACE · COMPARE · PREDICT',
    title: 'Compare all six gate behaviours before building logic circuits',
    lead: 'This projector scene consolidates the source truth tables without replacing the book sequence.',
    richBlocks: [{
      kind: 'table',
      table: {
        caption: 'Two-input truth-table comparison',
        headers: ['A', 'B', 'AND', 'OR', 'NAND', 'NOR', 'XOR'],
        rows: [
          ['0', '0', '0', '0', '1', '1', '0'],
          ['0', '1', '0', '1', '1', '0', '1'],
          ['1', '0', '0', '1', '1', '0', '1'],
          ['1', '1', '1', '1', '0', '0', '0'],
        ],
      },
    }],
    visual: 'types',
    accent: 'emerald',
    ...source(94, ['3.2.3 The function of the six logic gates', 'truth tables', 'NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR']),
  },
];
