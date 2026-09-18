import { describe,expect,it } from 'vitest';
import {
  assertLiveExamMarkingSettings,
  effectiveQuestionTimeLimit,
  normalizeLiveExamSettings,
  parseLiveExamSettings,
} from './live-exam-settings.js';

describe('LiveExam settings policy',()=>{
  it('keeps teacher-controlled timing without a server deadline',()=>{
    const settings=normalizeLiveExamSettings({timingMode:'teacher',defaultTimeLimitSeconds:300});
    expect(effectiveQuestionTimeLimit(settings)).toBeNull();
  });

  it('requires a valid duration for per-question timing',()=>{
    expect(()=>normalizeLiveExamSettings({timingMode:'per_question',defaultTimeLimitSeconds:null})).toThrowError();
    const settings=normalizeLiveExamSettings({timingMode:'per_question',defaultTimeLimitSeconds:180});
    expect(effectiveQuestionTimeLimit(settings)).toBe(180);
  });

  it('fails closed when peer mode is selected while peer marking is disabled',()=>{
    const settings=normalizeLiveExamSettings({peerMarkingEnabled:false});
    expect(()=>assertLiveExamMarkingSettings('peer',settings)).toThrowError();
    expect(()=>assertLiveExamMarkingSettings('teacher',settings)).not.toThrow();
  });

  it('parses board identity and auto-close policies from canonical settings JSON',()=>{
    const settings=parseLiveExamSettings({displayNameMode:'anonymous',autoCloseWhenAllSubmitted:false,teacherOverrideEnabled:false,questionOrder:'shuffled'});
    expect(settings).toMatchObject({displayNameMode:'anonymous',autoCloseWhenAllSubmitted:false,teacherOverrideEnabled:false,questionOrder:'shuffled'});
  });
});
