import { computeScore, type Scheme } from './marking.js';

export interface ReleasedMarkScheme {
  schemeType:string;
  maxMarks:number;
  points:Array<{id:string;code:string;text:string;marks:number;groupId:string|null;requires:unknown}>;
  groups:Array<{id:string;nRequired:number;marksPerPoint:number;maxMarks:number;awardMode?:'fixed'|'point_marks'}>;
}
export type ReleasedPointFeedback =
  | {status:'available';points:Array<{id:string;code:string;text:string;marks:number;matched:boolean;credited:boolean}>}
  | {status:'unavailable';reason:'teacher_override'|'manual_scoring'|'not_recorded'};

const unavailable=(reason:'teacher_override'|'manual_scoring'|'not_recorded'):ReleasedPointFeedback=>
  ({status:'unavailable',reason});

/**
 * Present only authoritative, released assessments. A teacher override changes
 * the official score without changing the review-point checkboxes, so those
 * checkboxes must NEVER be presented as the student's awarded marks.
 */
export function releasedPointFeedback(
  scheme:ReleasedMarkScheme,
  finalScore:number|null,
  teacherModerated:boolean,
  review:{matchedPointIds:string[];recordedCount:number}|null,
):ReleasedPointFeedback {
  if(teacherModerated)return unavailable('teacher_override');
  if(!scheme.points.length||!['all_required','any_n_from_m','exact_match'].includes(scheme.schemeType))
    return unavailable('manual_scoring');
  if(finalScore===null||!review||review.recordedCount!==scheme.points.length)
    return unavailable('not_recorded');

  const matchedIds=new Set(review.matchedPointIds);
  const scored=computeScore({
    type:scheme.schemeType as Scheme['type'],
    maxMarks:scheme.maxMarks,
    points:scheme.points.map((point)=>({
      code:point.code,marks:point.marks,groupId:point.groupId,
      requires:Array.isArray(point.requires)?point.requires.map(String):[],
    })),
    groups:scheme.groups.map((group)=>({
      id:group.id,nRequired:group.nRequired,marksPerPoint:group.marksPerPoint,
      maxMarks:group.maxMarks,awardMode:group.awardMode,
    })),
    levels:[],
  },scheme.points.map((point)=>({
    code:point.code,matched:matchedIds.has(point.id),confidence:1,
  })));
  if(scored.score!==finalScore)return unavailable('not_recorded');

  const effective=scheme.points.filter((point)=>scored.effectiveMatched[point.code]);
  const credited=new Set<string>();
  if(scheme.schemeType==='exact_match'){
    if(finalScore>0)effective.forEach((point)=>credited.add(point.id));
  }else if(scheme.schemeType==='all_required'){
    let remaining=finalScore;
    for(const point of effective){
      if(remaining<=0)break;
      credited.add(point.id);
      remaining-=point.marks;
    }
  }else{
    // Group caps mean that a correctly matched point need not contribute
    // another mark. Follow computeScore's ordering and nRequired rules.
    let globalRemaining=finalScore;
    const grouped=new Set<string>();
    for(const group of scheme.groups){
      const members=scheme.points.filter((point)=>point.groupId===group.id);
      members.forEach((point)=>grouped.add(point.id));
      const candidates=members.filter((point)=>scored.effectiveMatched[point.code]);
      if(group.awardMode==='point_marks')
        candidates.sort((a,b)=>b.marks-a.marks||a.code.localeCompare(b.code));
      let groupRemaining=group.maxMarks;
      for(const point of candidates.slice(0,group.nRequired)){
        const size=group.awardMode==='point_marks'?point.marks:group.marksPerPoint;
        const amount=Math.min(size,groupRemaining,globalRemaining);
        if(amount>0)credited.add(point.id);
        groupRemaining-=amount;
        globalRemaining-=amount;
      }
    }
    for(const point of effective.filter((point)=>!grouped.has(point.id))){
      const amount=Math.min(point.marks,globalRemaining);
      if(amount>0)credited.add(point.id);
      globalRemaining-=amount;
    }
  }
  return {
    status:'available',
    points:scheme.points.map((point)=>({
      id:point.id,code:point.code,text:point.text,marks:point.marks,
      matched:Boolean(scored.effectiveMatched[point.code]),credited:credited.has(point.id),
    })),
  };
}
