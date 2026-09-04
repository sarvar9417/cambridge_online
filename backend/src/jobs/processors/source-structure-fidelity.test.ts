import { describe, expect, it } from 'vitest';
import type { ExtractedQuestion } from './ingestion-contract.js';
import {
  enforceSourceStructureFidelity,
  requiredSourceStructures,
  SOURCE_STRUCTURE_MISSING_PREFIX,
} from './source-structure-fidelity.js';

const question = (overrides: Partial<ExtractedQuestion> = {}): ExtractedQuestion => ({
  path: '3.a',
  label: 'a',
  parentPath: '3',
  displayRef: '9618/11/M/J/25 Q3(a)',
  stemMd: 'Complete the table by writing the answer for each statement.',
  contextMd: null,
  commandWord: 'Complete',
  marks: 3,
  answerKind: 'table',
  answerLines: 3,
  sourcePages: [5],
  assets: [],
  issues: [],
  confidence: 0.97,
  ...overrides,
});

const parent = (assets: ExtractedQuestion['assets'] = []): ExtractedQuestion => question({
  path: '3', label: '3', parentPath: null, displayRef: '3', stemMd: null,
  commandWord: null, marks: null, answerKind: 'text', answerLines: null, assets,
});

describe('source structure fidelity', () => {
  it('recognises complete-table, tick-grid, trace-table, K-map and matching prompts', () => {
    expect(requiredSourceStructures('Complete the table by writing the answer for each statement.')).toEqual(['table']);
    expect(requiredSourceStructures('Put one tick (3) in each row to identify the minimum number of bits.')).toEqual(['table']);
    expect(requiredSourceStructures('Complete the trace table using the input data.')).toEqual(['table']);
    expect(requiredSourceStructures('The truth table below contains three errors.')).toEqual(['table']);
    expect(requiredSourceStructures('Complete the Karnaugh map (K-map).')).toEqual(['table']);
    expect(requiredSourceStructures('Draw a line to match each device to its description.')).toEqual(['layout']);
    expect(requiredSourceStructures('Draw a line to connect each bus to its correct description.')).toEqual(['layout']);
  });

  it('does not treat ordinary prose about a database table as a required printed layout', () => {
    expect(requiredSourceStructures('Describe two fields stored in a database table.')).toEqual([]);
  });

  it('blocks a flattened table question with no structured asset', () => {
    const result = enforceSourceStructureFidelity([parent(), question()]);
    const leaf = result.find((item) => item.path === '3.a')!;
    expect(leaf.issues).toContain(`${SOURCE_STRUCTURE_MISSING_PREFIX}table`);
    expect(leaf.confidence).toBe(0.79);
  });

  it('treats answerKind=table as a fail-closed signal even with uncommon wording', () => {
    const leaf = question({ stemMd: 'Evaluate each expression and record your answers.', answerKind: 'table' });
    const result = enforceSourceStructureFidelity([parent(), leaf]);
    expect(result[1]?.issues).toContain(`${SOURCE_STRUCTURE_MISSING_PREFIX}table`);
  });

  it('accepts a semantic Markdown table attached to the leaf', () => {
    const leaf = question({
      assets: [{
        kind: 'table',
        contentMd: '| Statement | Answer |\n| --- | --- |\n| smallest element | |',
        altText: 'Answer table', bbox: null, page: 5,
      }],
    });
    const result = enforceSourceStructureFidelity([parent(), leaf]);
    expect(result[1]?.issues).not.toContain(`${SOURCE_STRUCTURE_MISSING_PREFIX}table`);
  });

  it('accepts a source-faithful crop inherited from an ancestor', () => {
    const root = parent([{ kind: 'image', contentMd: null, altText: 'Printed tick grid', bbox: [80, 420, 1480, 1540], page: 5 }]);
    const result = enforceSourceStructureFidelity([root, question()]);
    expect(result[1]?.issues).not.toContain(`${SOURCE_STRUCTURE_MISSING_PREFIX}table`);
  });
});
