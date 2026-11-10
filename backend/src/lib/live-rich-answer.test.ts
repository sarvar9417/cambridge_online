import { describe, expect, it } from 'vitest';
import { LIVE_RICH_ANSWER_PREFIX, liveAnswerPlainText, liveAnswerWordCount } from './live-rich-answer.js';

describe('Live rich-answer compatibility',()=>{
  it('counts ordinary legacy answers without changing them',()=>{
    expect(liveAnswerPlainText('alpha <br> beta')).toBe('alpha <br> beta');
    expect(liveAnswerWordCount('alpha beta\n gamma')).toBe(3);
  });
  it('counts words in formatted paragraphs and code, excluding tag names',()=>{
    const answer=LIVE_RICH_ANSWER_PREFIX+'<p><strong>two words</strong></p><pre>if x:\n return y</pre>';
    expect(liveAnswerPlainText(answer)).toBe('two words\nif x:\n return y');
    expect(liveAnswerWordCount(answer)).toBe(6);
  });
  it('recognises escaped HTML characters within learner answers',()=>{
    expect(liveAnswerPlainText(LIVE_RICH_ANSWER_PREFIX+'<p>x &lt; y &amp; z</p>'))
      .toBe('x < y & z');
  });
});
