export interface LiveQuizPlayer {
  id:string;nickname:string;avatar:string;score:number;answered:boolean|number;
  correct?:number;
}
export type LiveQuizMode='classic'|'treasure';
export interface LiveQuizQuestion {
  id:string;index:number;prompt:string;options:string[];sourceContext:string;
  correctIndex?:number;explanation?:string;
}
export interface LiveQuizSnapshot {
  id:string;pin:string;courseCode:string;status:'waiting'|'active'|'review'|'finished';
  mode:LiveQuizMode;allowLateJoin?:boolean;showCorrectness?:boolean;randomNames?:boolean;
  questionCount:number;questionIndex:number;questionSeconds:number;
  questionStartedAt:string|null;serverNow:string;players:LiveQuizPlayer[];
  reviewEndsAt?:string;answerCounts?:number[];
  answeredCount:number;question:LiveQuizQuestion|null;
  endsAt?:string|null;durationSeconds?:number;treasureGoal?:number;dragonPool?:number;
  ownScore?:number;ownCorrect?:number;ownTurn?:number;blockedUntil?:string|null;
  pendingReward?:{turnIndex:number;type:string|null;percent?:number;
    targets:Array<{id:string;nickname:string;avatar:string;score:number}>}|null;
  ownAnswer?:{choiceIndex:number;correct?:boolean;points?:number}|null;
  selfId?:string;nickname?:string;
}
export interface LiveQuizLobby {
  pin:string;courseCode:string;mode:LiveQuizMode;status:'waiting'|'active';
  randomNames:boolean;allowLateJoin:boolean;playerCount:number;
}
export interface TreasureAnswerResponse {
  submitted:boolean;turnIndex:number;correct:boolean;rewardPending:boolean;
  correctIndex?:number;explanation?:string;
}
export interface TreasureRewardResponse {
  rewardType:string;needsTarget:boolean;percent?:number;delta?:number;
  newScore?:number;gameFinished?:boolean;
}
export interface LiveQuizDetail {
  number:number;prompt:string;options:string[];choiceIndex:number|null;correctIndex:number;
  correct:boolean;points:number;explanation:string;sourceContext:string;
  status:'correct'|'wrong'|'skipped';
  elapsedMs?:number;rewardType?:string|null;bankQuestionNo?:number;
}
export interface LiveQuizResult {
  id:string;nickname:string;avatar:string;score:number;correct:number;answered:number;
  total:number;details:LiveQuizDetail[];averageResponseMs?:number;
}
export interface LiveQuizQuestionSummary {
  number:number;prompt:string;sourceContext:string;correct:number;wrong:number;
  skipped:number;total:number;wrongStudents:Array<{id:string;nickname:string;answer:string;attemptNumber?:number}>;
}
export interface LiveQuizReport {
  id:string;pin:string;courseCode:string;totalQuestions:number;finishedAt:string|null;
  mode?:LiveQuizMode;questionBankSize?:number;students:LiveQuizResult[];
  questionSummary?:LiveQuizQuestionSummary[];
}
export interface LiveQuizHistoryItem {
  id:string;pin:string;courseCode:string;status:string;createdAt:string;
  finishedAt:string|null;questionCount:number;playerCount:number;mode?:LiveQuizMode;
}
export const LIVE_QUIZ_AVATARS=['🦊','🐼','🦁','🐯','🐸','🐨','🐙','🦄'] as const;

type GuestCredentials={playerId:string;token:string;pin:string;roomId:string};
const apiBase=import.meta.env.DEV?'/api/v1':(import.meta.env.VITE_API_URL??'/api/v1');
const storageKey=(pin:string)=>`campath:live-quiz:${pin}`;
export function readQuizGuest(pin:string):GuestCredentials|null {
  try{
    const item=JSON.parse(localStorage.getItem(storageKey(pin))??'null') as GuestCredentials|null;
    return item?.pin===pin&&/^[0-9a-f-]{36}$/i.test(item.playerId)&&/^[0-9a-f]{64}$/i.test(item.token)?item:null;
  }catch{return null;}
}
export function saveQuizGuest(guest:GuestCredentials){
  try{localStorage.setItem(storageKey(guest.pin),JSON.stringify(guest));}catch{/* private mode */}
}
export function forgetQuizGuest(pin:string){try{localStorage.removeItem(storageKey(pin));}catch{/* private mode */}}

/** Guest tokens are never placed in URLs, local request logs, or standard login cookies. */
export async function quizGuestRequest<T>(path:string,token?:string,body?:unknown):Promise<T>{
  const response=await fetch(apiBase+'/live-quiz-guest'+path,{
    method:body===undefined?'GET':'POST',
    headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),
      ...(token?{'Authorization':'Quiz '+token}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
    cache:'no-store',credentials:'omit',
  });
  let payload:unknown=null;
  try{payload=await response.json();}catch{/* non-JSON errors */}
  if(!response.ok){
    const message=(payload as {error?:{message?:string}}|null)?.error?.message;
    throw new Error(message??`Game request failed (${response.status})`);
  }
  return (payload as {data:T}).data;
}
