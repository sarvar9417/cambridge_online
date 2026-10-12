import { createHash } from 'node:crypto';

export type PeerAnswer = { answerId:string; studentId:string };
export type PeerAssignment = PeerAnswer & { reviewerId:string; kind:'peer'|'self' };
export type PeerPairHistory = { answerStudentId:string; reviewerId:string; count:number };

function digest(value:string) {
  return createHash('sha256').update(value).digest('hex');
}

export function assignPeerReviewersWithHistory(
  answers: PeerAnswer[],
  seed: string,
  history: PeerPairHistory[] = [],
): PeerAssignment[] {
  const ordered=[...answers].sort((left,right)=>
    digest(`${seed}:${left.studentId}`).localeCompare(digest(`${seed}:${right.studentId}`))
  );
  if(ordered.length<2){
    return ordered.map((answer)=>({...answer,reviewerId:answer.studentId,kind:'self' as const}));
  }

  const penalties=new Map<string,number>();
  for(const pair of history){
    penalties.set(`${pair.answerStudentId}:${pair.reviewerId}`,Math.max(0,Number(pair.count)||0));
  }

  let bestOffset=1;
  let bestPenalty=Number.POSITIVE_INFINITY;
  let bestTie='';
  for(let offset=1;offset<ordered.length;offset+=1){
    let penalty=0;
    for(let index=0;index<ordered.length;index+=1){
      const answer=ordered[index]!;
      const reviewer=ordered[(index+offset)%ordered.length]!;
      penalty+=penalties.get(`${answer.studentId}:${reviewer.studentId}`)??0;
    }
    const tie=digest(`${seed}:offset:${offset}`);
    if(penalty<bestPenalty||(penalty===bestPenalty&&(bestTie===''||tie<bestTie))){
      bestPenalty=penalty;
      bestOffset=offset;
      bestTie=tie;
    }
  }

  return ordered.map((answer,index)=>({
    ...answer,
    reviewerId:ordered[(index+bestOffset)%ordered.length]!.studentId,
    kind:'peer' as const,
  }));
}

export function selectPeerCalibrationAnswers(
  assignments: PeerAssignment[],
  seed: string,
  percent: number,
) {
  const peer=assignments.filter((item)=>item.kind==='peer');
  const bounded=Math.max(0,Math.min(100,Math.round(percent)));
  if(!peer.length||bounded===0)return [];
  const count=Math.min(peer.length,Math.max(1,Math.ceil(peer.length*bounded/100)));
  return [...peer]
    .sort((left,right)=>digest(`${seed}:calibration:${left.answerId}`).localeCompare(
      digest(`${seed}:calibration:${right.answerId}`)
    ))
    .slice(0,count)
    .map((item)=>item.answerId);
}

export function peerScoreDisagreement(peerScore:number,teacherScore:number) {
  return Math.abs(peerScore-teacherScore);
}
