import { describe, expect, it } from 'vitest';
import type { ExtractedQuestion } from './ingestion-contract.js';
import { enforceSourceVisualFidelity, requiresSourceVisual, SOURCE_VISUAL_MISSING_ISSUE } from './source-visual-fidelity.js';

const question = (overrides: Partial<ExtractedQuestion> = {}): ExtractedQuestion => ({
  path: '1.a',
  label: 'a',
  parentPath: '1',
  displayRef: '1(a)',
  stemMd: 'Write the logic expressions for the following logic circuit.',
  contextMd: null,
  commandWord: 'Write',
  marks: 2,
  answerKind: 'text',
  answerLines: 2,
  sourcePages: [2],
  assets: [],
  issues: [],
  confidence: 0.96,
  ...overrides,
});

const parent = (assets: ExtractedQuestion['assets'] = []): ExtractedQuestion => question({
  path: '1',
  label: '1',
  parentPath: null,
  displayRef: '1',
  stemMd: null,
  commandWord: null,
  marks: null,
  answerKind: 'text',
  answerLines: null,
  assets,
});

describe('source visual fidelity', () => {
  it('recognises an explicit printed-visual reference', () => {
    expect(requiresSourceVisual('Write the logic expressions for the following logic circuit.')).toBe(true);
    expect(requiresSourceVisual('Draw a logic circuit for the expression X = A AND B.')).toBe(false);
  });

  it('flags a leaf that requires a source visual when the full ancestor chain has none', () => {
    const result = enforceSourceVisualFidelity([parent(), question()]);
    const leaf = result.find((item) => item.path === '1.a')!;
    expect(leaf.issues).toContain(SOURCE_VISUAL_MISSING_ISSUE);
    expect(leaf.confidence).toBe(0.79);
  });

  it('accepts a renderable SVG attached directly to the leaf', () => {
    const leaf = question({ assets: [{ kind: 'diagram', contentMd: '<svg viewBox="0 0 10 10"></svg>', altText: 'Logic circuit', bbox: null, page: 2 }] });
    const result = enforceSourceVisualFidelity([parent(), leaf]);
    expect(result[1]?.issues).not.toContain(SOURCE_VISUAL_MISSING_ISSUE);
  });

  it('accepts a crop-ready diagram inherited from a parent context node', () => {
    const root = parent([{ kind: 'diagram', contentMd: null, altText: 'Circuit', bbox: [10, 20, 200, 180], page: 2 }]);
    const result = enforceSourceVisualFidelity([root, question()]);
    expect(result[1]?.issues).not.toContain(SOURCE_VISUAL_MISSING_ISSUE);
  });
});
