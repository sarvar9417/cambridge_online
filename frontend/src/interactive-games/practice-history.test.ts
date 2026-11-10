import { describe, expect, it } from 'vitest';
import { missedPracticePairs, practiceAttempts } from './practice-history';

const a = '302745c8-0397-4ec2-ac0a-a0b65cef1fb1';
const b = '94fe437b-f43f-4ad7-a4f5-9fefbcb04ab5';
const c = '86c23d9c-28ed-448d-b20c-b03f4e44c88e';
const pairs = [
  { id: a, term: 'Encryption', definition: 'Converts data to ciphertext' },
  { id: b, term: 'Decryption', definition: 'Converts ciphertext to plaintext' },
  { id: c, term: 'Key', definition: 'Secret cryptographic value' },
];
describe('Interactive Games limited formative evidence', () => {
  it('keeps first-attempt outcomes and never saves typed response text', () => {
    const answer = (id: string, submitted: string, correct: boolean) => ({
      id, prompt: 'private prompt', submitted, expected: 'private answer', correct,
    });
    expect(practiceAttempts([
      answer('quiz-' + a, 'a long typed answer', false),
      answer('quiz-' + a, 'corrected retry', true),
      answer(b, 'other answer', true),
      answer('quiz-bad-id', 'not a glossary term', false),
      answer(c, 'another answer', false),
    ], pairs)).toEqual([
      { termId: a, firstCorrect: false, evidenceType: 'scored_response' },
      { termId: b, firstCorrect: true, evidenceType: 'scored_response' },
      { termId: c, firstCorrect: false, evidenceType: 'scored_response' },
    ]);
    expect(JSON.stringify(practiceAttempts([answer(a, 'a long typed answer', false)], pairs)))
      .not.toContain('a long typed answer');
  });

  it('uses only the latest mistake queue among selected accessible content', () => {
    expect(missedPracticePairs(pairs, [b.toUpperCase(), a, 'unknown']))
      .toEqual([pairs[0], pairs[1]]);
    expect(missedPracticePairs(pairs, [c])).toEqual([pairs[2]]);
    expect(missedPracticePairs(pairs, [])).toEqual([]);
  });
});
