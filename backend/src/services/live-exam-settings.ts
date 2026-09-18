import { DomainError } from './assignments-service.js';

export type LiveExamQuestionOrder='fixed'|'shuffled';
export type LiveExamTimingMode='teacher'|'per_question';
export type LiveExamDisplayNameMode='first_name'|'full_name'|'anonymous';
export type LiveExamSettingsMarkingMode='teacher'|'peer'|'self';

export interface LiveExamSettings{
  questionOrder:LiveExamQuestionOrder;
  timingMode:LiveExamTimingMode;
  defaultTimeLimitSeconds:number|null;
  allowLateJoin:boolean;
  autoCloseWhenAllSubmitted:boolean;
  peerMarkingEnabled:boolean;
  teacherOverrideEnabled:boolean;
  displayNameMode:LiveExamDisplayNameMode;
}

export const DEFAULT_LIVE_EXAM_SETTINGS:LiveExamSettings={
  questionOrder:'fixed',
  timingMode:'teacher',
  defaultTimeLimitSeconds:null,
  allowLateJoin:false,
  autoCloseWhenAllSubmitted:true,
  peerMarkingEnabled:true,
  teacherOverrideEnabled:true,
  displayNameMode:'first_name',
};

export function normalizeLiveExamSettings(
  patch?:Partial<LiveExamSettings>,
  current:LiveExamSettings=DEFAULT_LIVE_EXAM_SETTINGS,
):LiveExamSettings{
  const merged={...current,...(patch??{})};
  if(
    merged.defaultTimeLimitSeconds!==null
    &&(!Number.isInteger(merged.defaultTimeLimitSeconds)
      ||merged.defaultTimeLimitSeconds<30
      ||merged.defaultTimeLimitSeconds>7200)
  )throw new DomainError('live_builder_invalid_time_limit',400);
  if(merged.timingMode==='per_question'&&merged.defaultTimeLimitSeconds===null){
    throw new DomainError('live_builder_invalid_time_limit',400);
  }
  return merged;
}

export function parseLiveExamSettings(value:unknown):LiveExamSettings{
  if(!value||typeof value!=='object'||Array.isArray(value))return DEFAULT_LIVE_EXAM_SETTINGS;
  const raw=value as Record<string,unknown>;
  return normalizeLiveExamSettings({
    questionOrder:raw.questionOrder==='shuffled'?'shuffled':'fixed',
    timingMode:raw.timingMode==='per_question'?'per_question':'teacher',
    defaultTimeLimitSeconds:typeof raw.defaultTimeLimitSeconds==='number'?raw.defaultTimeLimitSeconds:null,
    allowLateJoin:raw.allowLateJoin===true,
    autoCloseWhenAllSubmitted:raw.autoCloseWhenAllSubmitted!==false,
    peerMarkingEnabled:raw.peerMarkingEnabled!==false,
    teacherOverrideEnabled:raw.teacherOverrideEnabled!==false,
    displayNameMode:raw.displayNameMode==='full_name'?'full_name':raw.displayNameMode==='anonymous'?'anonymous':'first_name',
  });
}

export function effectiveQuestionTimeLimit(settings:LiveExamSettings){
  return settings.timingMode==='per_question'?settings.defaultTimeLimitSeconds:null;
}

export function assertLiveExamMarkingSettings(
  markingMode:LiveExamSettingsMarkingMode,
  settings:LiveExamSettings,
){
  if(markingMode==='peer'&&!settings.peerMarkingEnabled){
    throw new DomainError('live_peer_marking_disabled',400);
  }
}
