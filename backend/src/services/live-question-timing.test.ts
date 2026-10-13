import { describe, expect, it } from 'vitest';
import { resolveLiveQuestionTimeLimit } from './live-exam-service.js';

describe('resolveLiveQuestionTimeLimit',()=>{
  const q='11111111-1111-4111-8111-111111111111';

  it('uses a valid per-question override ahead of the session default',()=>{
    expect(resolveLiveQuestionTimeLimit({questionTimeLimits:{[q]:90}},q,300)).toBe(90);
  });

  it('allows an explicit unlimited question',()=>{
    expect(resolveLiveQuestionTimeLimit({questionTimeLimits:{[q]:null}},q,300)).toBeNull();
  });

  it('falls back when the override is missing or outside the accepted range',()=>{
    expect(resolveLiveQuestionTimeLimit({questionTimeLimits:{}},q,180)).toBe(180);
    expect(resolveLiveQuestionTimeLimit({questionTimeLimits:{[q]:29}},q,180)).toBe(180);
    expect(resolveLiveQuestionTimeLimit({questionTimeLimits:{[q]:7201}},q,180)).toBe(180);
  });
});
