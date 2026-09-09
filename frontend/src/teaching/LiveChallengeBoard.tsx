import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type AttemptQuestion, type LiveChallengeRoundState } from '../lib/api';
import { AttemptContext } from '../AttemptContext';
import { useLiveChallengeSync } from '../hooks/useLiveChallengeSync';
import { StructuredQuestionView, structuredQuestionAssetsReady, structuredQuestionUsable } from '../student/StructuredQuestionView';
import './live-challenge-board.css';

type MarkPoint={id?:string;code?:string;text?:string;marks?:number};
type Scoreboard={challengeId:string;status:string;stateVersion:number;releasedRounds:number;maxMarks:number;classAveragePercentage:number;entries:Array<{rank:number;displayName:string;score:number;maxMarks:number;percentage:number}>};
type BoardState={
  id:string;title:string;className:string;syllabusCode:string;topicTitle:string|null;subtopicTitle:string|null;
  status:string;stateVersion:number;currentQuestionPosition:number|null;serverNow:string;
  round:LiveChallengeRoundState|null;question:AttemptQuestion|null;
  markScheme:{maxMarks?:number;guidanceMd?:string|null;points?:MarkPoint[]}|null;
  joinCode:string|null;joinedCount:number;submittedCount:number;peerAssignmentCount:number;peerMarkCount:number;
  scoreboard:Scoreboard|null;
};

const LABEL:Record<string,string>={
  PUBLISHED:'Challenge tayyor',LOBBY:'O‘quvchilarni kutyapmiz',QUESTION_ACTIVE:'Javob bering',
  ANSWERS_LOCKED:'Javoblar yopildi',PEER_MARKING:'Mark Scheme bilan tekshirish',ROUND_RESULTS:'Round natijalari',
  FINISHED:'Challenge yakunlandi',PAUSED:'Challenge pauzada',CANCELLED:'Challenge bekor qilindi',
};

function remainingSeconds(state:BoardState,now:number){
  if(state.status!=='QUESTION_ACTIVE'||!state.round?.startedAt||!state.round.timeLimitSeconds)return null;
  const end=new Date(state.round.startedAt).getTime()+state.round.timeLimitSeconds*1000;
  return Math.max(0,Math.ceil((end-now)/1000));
}

export function LiveChallengeBoard({challengeId,onClose}:{challengeId:string;onClose?:()=>void}){
  const[state,setState]=useState<BoardState|null>(null);
  const[error,setError]=useState('');
  const[now,setNow]=useState(Date.now());
  const[fullscreen,setFullscreen]=useState(Boolean(document.fullscreenElement));

  const load=useCallback(async()=>{
    try{
      const next=(await api<{data:BoardState}>(`/live-challenges/${challengeId}/board`)).data;
      setState(next);setError('');
    }catch(cause){setError(cause instanceof Error?cause.message:'Board state yuklanmadi.')}
  },[challengeId]);

  useEffect(()=>{void load()},[load]);
  useLiveChallengeSync(challengeId,load);

  useEffect(()=>{
    const clock=window.setInterval(()=>setNow(Date.now()),250);
    const fs=()=>setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange',fs);
    return()=>{window.clearInterval(clock);document.removeEventListener('fullscreenchange',fs)};
  },[]);

  const remaining=state?remainingSeconds(state,now):null;
  const progress=state&&state.joinedCount>0?Math.min(100,Math.round(state.submittedCount/state.joinedCount*100)):0;
  const markingProgress=state&&state.peerAssignmentCount>0?Math.min(100,Math.round(state.peerMarkCount/state.peerAssignmentCount*100)):0;
  const question=state?.question??null;
  const structured=question?.contentJson??null;
  const structuredReady=Boolean(structured&&question?.contentVersion===1&&structuredQuestionUsable(structured)&&structuredQuestionAssetsReady(structured,question.assetUrls??{}));
  const points=state?.markScheme?.points??[];
  const statusLabel=state?LABEL[state.status]??state.status:'Yuklanmoqda…';
  const topic=useMemo(()=>state?[state.syllabusCode,state.topicTitle,state.subtopicTitle].filter(Boolean).join(' · '):'',[state]);

  const toggleFullscreen=async()=>{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };

  return <main className="lcb" data-status={state?.status??'LOADING'}>
    <header className="lcb-top"><div><span>CAMBRIDGE LIVE CHALLENGE</span><h1>{state?.title??'Live Challenge'}</h1><p>{state?`${state.className} · ${topic}`:'Board ulanmoqda…'}</p></div><div className="lcb-top-actions"><strong>{statusLabel}</strong><button type="button" onClick={()=>void toggleFullscreen()}>{fullscreen?'Fullscreendan chiqish':'Fullscreen'}</button>{onClose?<button type="button" onClick={onClose}>Boardni yopish</button>:null}</div></header>

    {error?<div className="lcb-connection" role="alert">Ulanish tiklanmoqda… {error}</div>:null}
    {!state?<section className="lcb-center"><div className="lcb-loader"/><h2>Board state yuklanmoqda…</h2></section>:null}

    {state&&['PUBLISHED','LOBBY'].includes(state.status)?<section className="lcb-lobby">
      <div><span>JOIN CODE</span><strong>{state.joinCode??'———'}</strong><p>Dashboard → Live Challenges → Join</p></div>
      <aside><strong>{state.joinedCount}</strong><span>o‘quvchi qo‘shildi</span><div className="lcb-pulse"/></aside>
    </section>:null}

    {state&&['QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS'].includes(state.status)?<section className="lcb-round">
      <div className="lcb-round-head"><div><span>ROUND {state.round?.number??'—'}</span><strong>{question?.displayRef??'Cambridge question'}</strong>{question?.commandWord?<em>{question.commandWord}</em>:null}</div><div>{remaining!==null?<strong className={remaining<=10?'is-urgent':''}>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</strong>:<strong>{question?.marks??0} marks</strong>}</div></div>
      {state.status==='ROUND_RESULTS'?<Leaderboard scoreboard={state.scoreboard}/>:question?<article className="lcb-question">{structuredReady&&structured?<StructuredQuestionView content={structured} assetUrls={question.assetUrls}/>:structured?<StructuredQuestionView content={structured} assetUrls={question.assetUrls}/>:<>{question.contextMd?<AttemptContext value={question.contextMd}/>:null}<p>{question.stemMd}</p></>}</article>:<div className="lcb-center"><h2>Savol tayyorlanmoqda…</h2></div>}

      {state.status==='QUESTION_ACTIVE'?<div className="lcb-progress"><div><strong>{state.submittedCount}/{state.joinedCount}</strong><span>javob topshirildi</span></div><div className="lcb-track"><i style={{width:`${progress}%`}}/></div></div>:null}
      {state.status==='ANSWERS_LOCKED'?<div className="lcb-stage"><strong>Javoblar qulflandi</strong><span>O‘qituvchi peer markingni ochishini kuting.</span></div>:null}
      {state.status==='PEER_MARKING'?<div className="lcb-marking"><section><h2>Official Mark Scheme</h2>{state.markScheme?.guidanceMd?<p>{state.markScheme.guidanceMd}</p>:null}<div>{points.map((point,index)=><article key={point.id??index}><b>{point.code??`M${index+1}`}</b><span>{point.text}</span><strong>{point.marks??0}</strong></article>)}</div></section><aside><strong>{state.peerMarkCount}/{state.peerAssignmentCount}</strong><span>peer mark tugadi</span><div className="lcb-track"><i style={{width:`${markingProgress}%`}}/></div></aside></div>:null}
      {state.status==='ROUND_RESULTS'?<div className="lcb-stage lcb-stage--result"><strong>{state.scoreboard?.releasedRounds??0} round hisoblandi</strong><span>Class average: {state.scoreboard?.classAveragePercentage??0}% · O‘qituvchi keyingi savolni ochadi.</span></div>:null}
    </section>:null}

    {state?.status==='FINISHED'?<section className="lcb-final"><div className="lcb-final-title"><span>✓</span><div><h2>Challenge yakunlandi</h2><p>{state.scoreboard?.releasedRounds??state.round?.number??0} ta round · class average {state.scoreboard?.classAveragePercentage??0}%</p></div></div><Leaderboard scoreboard={state.scoreboard}/></section>:null}
    {state?.status==='PAUSED'?<section className="lcb-center"><h2>Challenge pauzada</h2><p>O‘qituvchi davom ettirishini kuting.</p></section>:null}
  </main>;
}

function Leaderboard({scoreboard}:{scoreboard:Scoreboard|null}){
  if(!scoreboard||!scoreboard.entries.length)return <section className="lcb-leaderboard lcb-leaderboard--empty"><h2>Natijalar hisoblanmoqda…</h2></section>;
  return <section className="lcb-leaderboard"><header><div><span>LEADERBOARD</span><h2>Cumulative Cambridge marks</h2></div><strong>{scoreboard.classAveragePercentage}%<small>class avg</small></strong></header><div className="lcb-leader-list">{scoreboard.entries.slice(0,12).map(entry=><article key={`${entry.rank}-${entry.displayName}`} className={entry.rank<=3?'is-podium':''}><b>{entry.rank}</b><strong>{entry.displayName}</strong><span>{entry.score}/{entry.maxMarks}</span><em>{entry.percentage}%</em></article>)}</div></section>;
}
