import { describe, expect, it } from 'vitest';
import type { StructuredQuestionContent } from '../lib/structured-question-content';
import { answerWordCount, formatRemainingTime, isAnswered } from './StudentAttemptWorkspace';
import { structuredQuestionAssetsReady } from './StructuredQuestionView';

const assetId='22222222-2222-4222-8222-222222222222';
const structured:StructuredQuestionContent={
  version:1,
  source:{paperId:'11111111-1111-4111-8111-111111111111',sha256:'a'.repeat(64)},
  blocks:[
    {type:'text',style:'task',text:'Use the diagram.',source:{page:1}},
    {type:'asset',kind:'diagram',assetId,altText:'Diagram',source:{page:1}},
  ],
};

describe('student attempt workspace helpers', () => {
  it('formats server-authoritative remaining time', () => {
    expect(formatRemainingTime(null)).toBeNull();
    expect(formatRemainingTime(0)).toBe('0:00');
    expect(formatRemainingTime(65)).toBe('1:05');
    expect(formatRemainingTime(3661)).toBe('1:01:01');
  });

  it('treats whitespace-only answers as unanswered', () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered('   ')).toBe(false);
    expect(isAnswered('answer')).toBe(true);
  });

  it('counts words without inflating repeated whitespace', () => {
    expect(answerWordCount('')).toBe(0);
    expect(answerWordCount('one')).toBe(1);
    expect(answerWordCount('one   two\nthree')).toBe(3);
  });

  it('does not treat a structured visual question as ready until every referenced asset has a URL',()=>{
    expect(structuredQuestionAssetsReady(structured,{})).toBe(false);
    expect(structuredQuestionAssetsReady(structured,{[assetId]:'https://signed.example/diagram.png'})).toBe(true);
  });
});
