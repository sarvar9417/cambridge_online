export type LiveQuestionTimeOverrides=Record<string,number|null>;

export function setLiveQuestionTimeOverride(
  current:LiveQuestionTimeOverrides,
  questionId:string,
  value:number|null|undefined,
) {
  const next={...current};
  if(value===undefined) delete next[questionId];
  else next[questionId]=value;
  return next;
}

export function serializeLiveQuestionTimeOverrides(
  selectedQuestionIds:string[],
  current:LiveQuestionTimeOverrides,
) {
  const selected=new Set(selectedQuestionIds);
  return Object.fromEntries(
    Object.entries(current).filter(([questionId,value])=>
      selected.has(questionId)
      && (value===null || (Number.isInteger(value)&&value>=30&&value<=7200))
    ),
  ) as LiveQuestionTimeOverrides;
}

export function moveLiveQuestionTimeOverride(
  current:LiveQuestionTimeOverrides,
  fromQuestionId:string,
  toQuestionId:string,
) {
  if(!Object.prototype.hasOwnProperty.call(current,fromQuestionId))return current;
  const value=current[fromQuestionId];
  const next={...current};
  delete next[fromQuestionId];
  next[toQuestionId]=value!;
  return next;
}
