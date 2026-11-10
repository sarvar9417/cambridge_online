/**
 * Presentation-only reward logic. Cambridge marks are never recalculated or
 * awarded here; badges and streaks are local, non-academic session feedback.
 */
export type CelebrationTier = 'gold' | 'spark' | 'steady' | 'support';
export type CelebrationIntensity = 'calm' | 'balanced' | 'spectacular';
export type RewardEntry = {questionIndex:number;score:number;possible:number};
export type RewardBadge = 'first-perfect' | 'on-fire' | 'five-questions' | 'high-flyer';

export const REWARD_LABELS:Record<RewardBadge,{icon:string;title:string;description:string}> = {
  'first-perfect': {icon:'✦',title:'Perfect Answer',description:'First full-marks answer'},
  'on-fire': {icon:'⚡',title:'On Fire',description:'Three strong answers in a row'},
  'five-questions': {icon:'◆',title:'Challenge Explorer',description:'Five questions reviewed'},
  'high-flyer': {icon:'★',title:'High Flyer',description:'Five strong answers'},
};

export function isRewardEntry(value:unknown):value is RewardEntry {
  if(!value||typeof value!=='object')return false;
  const row=value as Partial<RewardEntry>;
  return Number.isInteger(row.questionIndex)&&row.questionIndex!>=0&&
    Number.isFinite(row.score)&&row.score!>=0&&Number.isFinite(row.possible)&&
    row.possible!>0&&row.score!<=row.possible!;
}

export function celebrationTier(score:number,possible:number):CelebrationTier|null {
  if(!isRewardEntry({questionIndex:0,score,possible}))return null;
  const ratio=score/possible;
  return ratio>=0.9?'gold':ratio>=0.7?'spark':ratio>=0.4?'steady':'support';
}

export function getRewardSummary(entries:readonly RewardEntry[]) {
  const byIndex=new Map<number,RewardEntry>();
  for(const entry of entries)if(isRewardEntry(entry))byIndex.set(entry.questionIndex,entry);
  const rows=[...byIndex.values()].sort((a,b)=>a.questionIndex-b.questionIndex);
  const high=rows.filter(row=>row.score/row.possible>=0.7).length;
  const perfect=rows.some(row=>row.score===row.possible);
  const highestIndex=rows.length?rows[rows.length-1].questionIndex:-1;
  let streak=0;
  for(let index=highestIndex;index>=0;index--) {
    const row=byIndex.get(index);
    if(!row||row.score/row.possible<0.7)break;
    streak++;
  }
  const badges:RewardBadge[]=[];
  if(perfect)badges.push('first-perfect');
  if(streak>=3)badges.push('on-fire');
  if(rows.length>=5)badges.push('five-questions');
  if(high>=5)badges.push('high-flyer');
  return {streak,badges,reviewed:rows.length,high,perfect,rows};
}
