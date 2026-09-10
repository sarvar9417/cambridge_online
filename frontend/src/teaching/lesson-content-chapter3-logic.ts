import type { HodderLessonSlide } from './lesson-content-hodder-types';

const source = (page: number, elements: string[]) => ({
  sourcePages: [page],
  sourceLabel: `Hodder Chapter 3 · p.${page}`,
  sourceElements: [`Hodder p.${page}`, ...elements],
});

/** Source-specific continuation of Hodder 9618 Chapter 3, printed pp.90–94. */
export const CHAPTER_3_LOGIC_SLIDES: readonly HodderLessonSlide[] = [
  {
    id: 'h3-322-truth-table-not',
    section: '3.2 Logic gates and logic circuits',
    subtopicCode: '3.2.2',
    eyebrow: '3.2.2 · TABLE 3.9 · FIGURE 3.23 · TABLE 3.10',
    title: 'Truth tables list every binary input combination before the output is traced',
    lead: 'Hodder starts with the number of possible input combinations, then introduces the one-input NOT gate and its two-row truth table.',
    bullets: [
      'NOT is the only gate in this section with one input: 2¹ = 2 possible combinations.',
      'The other five gates have two inputs: 2² = 4 possible combinations.',
      'Three inputs give 2³ = 8 combinations; four inputs give 2⁴ = 16.',
      'NOT rule: output X is 1 if input A is NOT 1.',
      'Logic notation: X = NOT A. Boolean algebra: X = A̅.',
    ],
    richBlocks: [{ kind: 'table', table: { caption: 'Table 3.10 · NOT gate', headers: ['A', 'X'], rows: [['0', '1'], ['1', '0']] } }],
    visual: 'types',
    accent: 'cyan',
    ...source(90, ['3.2.2 Truth tables', 'Table 3.9', '2¹ = 2', '2² = 4', '2³ = 8', '2⁴ = 16', 'Figure 3.23 NOT gate', 'Table 3.10']),
  },
  {
    id: 'h3-323-and-or-nand-nor',
    section: '3.2 Logic gates and logic circuits',
    subtopicCode: '3.2.3',
    eyebrow: 'FIGURES 3.24–3.27 · TABLES 3.11–3.14',
    title: 'AND, OR, NAND and NOR use the same symbol → rule → notation → truth-table pattern',
    lead: 'Hodder presents four two-input gates together on p.91. Their truth tables make the inverse relationships between AND/NAND and OR/NOR visible.',
    richBlocks: [{
      kind: 'table',
      table: {
        caption: 'Gate rules on Hodder p.91',
        headers: ['Gate', 'Output X is 1 when…', 'Logic notation'],
        rows: [
          ['AND', 'A is 1 and B is 1', 'X = A AND B'],
          ['OR', 'A is 1 or B is 1', 'X = A OR B'],
          ['NAND (NOT AND)', 'A is NOT 1 or B is NOT 1', 'X = A NAND B'],
          ['NOR (NOT OR)', 'A is NOT 1 and B is NOT 1', 'X = A NOR B'],
        ],
      },
    }],
    visual: 'types',
    accent: 'indigo',
    ...source(91, ['Figure 3.24 AND gate', 'Table 3.11', 'Figure 3.25 OR gate', 'Table 3.12', 'Figure 3.26 NAND gate', 'Table 3.13', 'Figure 3.27 NOR gate', 'Table 3.14']),
  },
  {
    id: 'h3-323-xor-example31',
    section: '3.2 Logic gates and logic circuits',
    subtopicCode: '3.2.4',
    eyebrow: 'FIGURE 3.28 · TABLE 3.15 · EXTENSION 3G · EXAMPLE 3.1',
    title: 'XOR completes the six-gate set, then Hodder moves directly into tracing a logic circuit',
    lead: 'XOR outputs 1 when the two inputs differ. The page then defines the Boolean symbols and introduces Example 3.1, a three-part circuit traced with intermediate values P, Q and R.',
    bullets: [
      'XOR: X is 1 when A = 1 and B = 0, or A = 0 and B = 1.',
      'Logic notation: X = A XOR B.',
      'Boolean symbols introduced: dot for AND, plus sign for OR, and a bar above a letter for NOT.',
      'A logic circuit combines gates to carry out a particular function; its output is checked with a truth table.',
      'Example 3.1 circuit: P comes from AND(A,B); Q from NOR(B,C); R combines P and Q with OR; final X combines R and C with XOR.',
    ],
    richBlocks: [
      { kind: 'table', table: { caption: 'Table 3.15 · XOR gate', headers: ['A', 'B', 'X'], rows: [['0', '0', '0'], ['0', '1', '1'], ['1', '0', '1'], ['1', '1', '0']] } },
      { kind: 'callout', tone: 'extension', title: 'Extension Activity 3G', text: 'Use truth tables to show that the two Boolean expressions printed in the source both represent the XOR logic gate.' },
    ],
    visual: 'types',
    accent: 'rose',
    ...source(92, ['Figure 3.28 XOR gate', 'Table 3.15', 'Extension Activity 3G', '3.2.4 Logic circuits', 'Example 3.1', 'P = AND(A,B)', 'Q = NOR(B,C)', 'R = OR(P,Q)', 'X = XOR(R,C)']),
  },
  {
    id: 'h3-324-example31-parts12',
    section: '3.2 Logic gates and logic circuits',
    subtopicCode: '3.2.4',
    eyebrow: 'EXAMPLE 3.1 · PART 1 + PART 2',
    title: 'Trace the circuit in stages: first P and Q, then R',
    lead: 'With three inputs there are eight input rows. Hodder reduces errors by splitting the circuit and carrying intermediate values forward.',
    richBlocks: [
      { kind: 'table', table: { caption: 'Part 1 · P = A AND B; Q = B NOR C', headers: ['A', 'B', 'C', 'P', 'Q'], rows: [['0','0','0','0','1'],['0','0','1','0','0'],['0','1','0','0','0'],['0','1','1','0','0'],['1','0','0','0','1'],['1','0','1','0','0'],['1','1','0','1','0'],['1','1','1','1','0']] } },
      { kind: 'table', table: { caption: 'Part 2 · R = P OR Q', headers: ['P', 'Q', 'R'], rows: [['0','1','1'],['0','0','0'],['0','0','0'],['0','0','0'],['0','1','1'],['0','0','0'],['1','0','1'],['1','0','1']] } },
    ],
    visual: 'types',
    accent: 'amber',
    ...source(93, ['Example 3.1 Solution', 'Part 1', 'P = AND(A,B)', 'Q = NOR(B,C)', 'Part 2', 'R = OR(P,Q)', 'eight binary values']),
  },
  {
    id: 'h3-324-example31-part3-activity3b',
    section: '3.2 Logic gates and logic circuits',
    subtopicCode: '3.2.4',
    eyebrow: 'EXAMPLE 3.1 · PART 3 · ACTIVITY 3B',
    title: 'Finish the trace with XOR, then practise the same intermediate-value method',
    lead: 'Part 3 combines R and C to produce X. Hodder then joins all intermediate columns into the final truth table and asks students to repeat the method on five circuits.',
    richBlocks: [
      { kind: 'table', table: { caption: 'Example 3.1 · final truth table', headers: ['A','B','C','P','Q','R','X'], rows: [['0','0','0','0','1','1','1'],['0','0','1','0','0','0','1'],['0','1','0','0','0','0','0'],['0','1','1','0','0','0','1'],['1','0','0','0','1','1','1'],['1','0','1','0','0','0','1'],['1','1','0','1','0','1','1'],['1','1','1','1','0','1','0']] } },
      { kind: 'callout', tone: 'extension', title: 'Activity 3B', text: 'Produce truth tables for each of the five logic circuits. Split each circuit into intermediate parts to help eliminate errors.' },
    ],
    visual: 'types',
    accent: 'emerald',
    ...source(94, ['Example 3.1 Part 3', 'X = XOR(R,C)', 'final truth table', 'Activity 3B', 'five logic circuits', 'intermediate parts']),
  },
];
