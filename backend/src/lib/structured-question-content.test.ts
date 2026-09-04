import { describe, expect, it } from 'vitest';
import {
  parseStructuredQuestionContent,
  safeParseStructuredQuestionContent,
} from './structured-question-content.js';

const source = {
  paperId: '11111111-1111-4111-8111-111111111111',
  sha256: 'a'.repeat(64),
};

const location = { page: 3, bbox: [10, 20, 300, 420] as [number, number, number, number] };

const valid = {
  version: 1 as const,
  source,
  blocks: [
    { type: 'text' as const, style: 'task' as const, text: 'Complete the truth table.', source: location },
    {
      type: 'math' as const,
      semantics: 'boolean_expression' as const,
      latex: '\\overline{A} \\land B',
      display: true,
      source: location,
    },
    {
      type: 'table' as const,
      kind: 'truth_table' as const,
      headers: ['A', 'B', 'Output'],
      rows: [['0', '0', null], ['0', '1', null], ['1', '0', null], ['1', '1', null]],
      editableCells: [[0, 2], [1, 2], [2, 2], [3, 2]] as [number, number][],
      source: location,
    },
    {
      type: 'matching' as const,
      left: [{ id: 'a', text: 'Compiler' }],
      right: [{ id: '1', text: 'Translates the whole program' }],
      source: location,
    },
    {
      type: 'asset' as const,
      kind: 'logic_circuit' as const,
      assetId: '22222222-2222-4222-8222-222222222222',
      altText: 'Logic circuit from the original question paper',
      source: location,
    },
  ],
};

describe('structured question content v1', () => {
  it('accepts a source-backed mixed Cambridge question', () => {
    const parsed = parseStructuredQuestionContent(valid);
    expect(parsed.version).toBe(1);
    expect(parsed.blocks).toHaveLength(5);
    expect(parsed.blocks[1]).toMatchObject({ type: 'math', semantics: 'boolean_expression' });
  });

  it('rejects a malformed source hash', () => {
    const result = safeParseStructuredQuestionContent({
      ...valid,
      source: { ...source, sha256: 'not-a-sha' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects table rows whose width does not match the canonical width', () => {
    const result = safeParseStructuredQuestionContent({
      ...valid,
      blocks: [{
        type: 'table',
        kind: 'truth_table',
        headers: ['A', 'B', 'Output'],
        rows: [['0', '0']],
        editableCells: [],
        source: location,
      }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects editable cells outside table bounds', () => {
    const result = safeParseStructuredQuestionContent({
      ...valid,
      blocks: [{
        type: 'table',
        kind: 'table',
        headers: ['Value'],
        rows: [[null]],
        editableCells: [[5, 0]],
        source: location,
      }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate matching identifiers', () => {
    const result = safeParseStructuredQuestionContent({
      ...valid,
      blocks: [{
        type: 'matching',
        left: [{ id: 'x', text: 'One' }, { id: 'x', text: 'Two' }],
        right: [{ id: '1', text: 'Answer' }],
        source: location,
      }],
    });
    expect(result.success).toBe(false);
  });
});
