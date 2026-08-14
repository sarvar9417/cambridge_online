import { describe, expect, it } from 'vitest';
import { findDependencyMentions } from './dependencies.js';
import { validateExtraction, type ValidationInput } from './rules.js';

function baseInput(stem: string, dependencies?: ValidationInput['dependencies']): ValidationInput {
  return {
    componentTotal: 2,
    questions: [
      {
        id: 'root',
        path: '3',
        parentId: null,
        marks: null,
        stem: 'Shared context for question three.',
        commandWord: null,
        answerKind: 'text',
        answerLines: null,
        assetCount: 0,
        subtopicConfidences: [],
        extractConfidence: 1,
      },
      {
        id: 'q3a',
        path: '3.a',
        parentId: 'root',
        marks: 1,
        stem: 'State one property of the value.',
        commandWord: 'State',
        answerKind: 'text',
        answerLines: 1,
        assetCount: 0,
        subtopicConfidences: [0.95],
        extractConfidence: 1,
      },
      {
        id: 'q3b',
        path: '3.b',
        parentId: 'root',
        marks: 1,
        stem,
        commandWord: 'State',
        answerKind: 'text',
        answerLines: 1,
        assetCount: 0,
        subtopicConfidences: [0.95],
        extractConfidence: 1,
      },
    ],
    schemes: [
      { questionId: 'q3a', type: 'all_required', maxMarks: 1, points: [1] },
      { questionId: 'q3b', type: 'all_required', maxMarks: 1, points: [1] },
    ],
    assets: [],
    dependencies,
  };
}

describe('dependency mention detection', () => {
  it('detects an answer reference to a sibling part', () => {
    const mentions = findDependencyMentions('Using your answer to part (a), state the final value.');
    expect(mentions.length).toBeGreaterThan(0);
    expect(mentions.some((mention) => mention.excerpt.toLowerCase().includes('part (a)'))).toBe(true);
  });

  it('detects a printed-material reference', () => {
    const mentions = findDependencyMentions('Use the table from part (b) to complete the calculation.');
    expect(mentions.length).toBeGreaterThan(0);
  });

  it('does not flag ordinary prose containing the word part', () => {
    expect(findDependencyMentions('Describe one part of the fetch-execute cycle.')).toEqual([]);
  });
});

describe('V23 unrecorded dependency validation', () => {
  it('warns when a sibling reference has no dependency row', () => {
    const findings = validateExtraction(
      baseInput('Using your answer to part (a), state the final value.'),
    );
    expect(findings).toContainEqual(
      expect.objectContaining({ code: 'V23', severity: 'warning' }),
    );
  });

  it('does not warn when the dependency was recorded', () => {
    const findings = validateExtraction(
      baseInput('Using your answer to part (a), state the final value.', [
        { fromPath: '3.b', kind: 'answer_ref' },
      ]),
    );
    expect(findings.some((finding) => finding.code === 'V23')).toBe(false);
  });

  it('does not warn for unrelated prose', () => {
    const findings = validateExtraction(
      baseInput('State one part of the fetch-execute cycle.'),
    );
    expect(findings.some((finding) => finding.code === 'V23')).toBe(false);
  });
});
