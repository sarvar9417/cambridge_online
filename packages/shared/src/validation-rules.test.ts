import { describe, expect, it } from 'vitest';
import { validateExtraction, type ValidationInput } from './validation-rules.js';
const base = (): ValidationInput => ({
  componentTotal: 2,
  questions: [
    {
      id: 'p',
      path: '1',
      parentId: null,
      marks: null,
      stem: 'Parent context text',
      commandWord: null,
      answerKind: 'text',
      answerLines: null,
      assetCount: 0,
      subtopicConfidences: [0.9],
      extractConfidence: 0.95,
    },
    {
      id: 'q',
      path: '1.a',
      parentId: 'p',
      marks: 2,
      stem: 'Explain a valid technical reason.',
      commandWord: 'Explain',
      answerKind: 'text',
      answerLines: 2,
      assetCount: 0,
      subtopicConfidences: [0.9],
      extractConfidence: 0.95,
    },
  ],
  schemes: [{ questionId: 'q', type: 'all_required', maxMarks: 2, points: [1, 1] }],
  assets: [],
});
describe('V01-V20 extraction rules', () => {
  const cases: Array<[string, (x: ValidationInput) => void]> = [
    ['V01', (x) => (x.schemes[0]!.points = [1])],
    ['V02', (x) => (x.componentTotal = 3)],
    ['V03', (x) => (x.schemes = [])],
    [
      'V04',
      (x) =>
        x.schemes.push({ questionId: 'missing', type: 'all_required', maxMarks: 1, points: [1] }),
    ],
    [
      'V05',
      (x) => Object.assign(x.schemes[0]!, { type: 'any_n_from_m', nRequired: 2, points: [1, 1] }),
    ],
    [
      'V06',
      (x) =>
        Object.assign(x.schemes[0]!, {
          type: 'any_n_from_m',
          nRequired: 1,
          points: [1, 1],
          groupMaxMarks: 3,
        }),
    ],
    ['V07', (x) => (x.questions[0]!.marks = 1)],
    ['V08', (x) => (x.questions[1]!.path = '2.a')],
    ['V09', (x) => x.questions.push({ ...x.questions[0]!, id: 'p3', path: '3' })],
    ['V10', (x) => (x.questions[1]!.answerKind = 'diagram')],
    ['V11', (x) => (x.assets = [{ storagePath: '', size: 10 }])],
    ['V12', (x) => (x.questions[1]!.commandWord = 'Invalid')],
    ['V13', (x) => (x.questions[1]!.marks = 10)],
    ['V14', (x) => (x.questions[1]!.answerLines = 1)],
    ['V15', (x) => (x.questions[1]!.subtopicConfidences = [])],
    ['V16', (x) => (x.questions[1]!.subtopicConfidences = [0.5])],
    ['V17', (x) => (x.questions[1]!.stem = 'short')],
    ['V18', (x) => (x.questions[1]!.extractConfidence = 0.5)],
    ['V19', (x) => (x.duplicateSimilarity = 0.95)],
    ['V20', (x) => Object.assign(x.schemes[0]!, { type: 'levels_of_response', levels: 0 })],
  ];
  it.each(cases)('%s triggers', (code, mutate) => {
    const x = base();
    mutate(x);
    expect(validateExtraction(x).map((f) => f.code)).toContain(code);
  });
  it('accepts a clean extraction', () => expect(validateExtraction(base())).toEqual([]));
});
