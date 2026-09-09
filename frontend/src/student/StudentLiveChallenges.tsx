import { FormEvent, useEffect, useState } from 'react';
import { api, type LiveChallengeJoinResult, type LiveChallengeState, type LiveChallengeStudentCard } from '../lib/api';
import { AttemptContext } from '../AttemptContext';
import { StructuredQuestionView, structuredQuestionAssetsReady, structuredQuestionUsable } from './StructuredQuestionView';
import './student-live-challenges.css';

const STATE_LABEL:Record<LiveChallengeStudentCard['status'],string>={
  PUBLISHED:'Kutilmoqda',LOBBY:'Lobby ochiq',QUESTION_ACTIVE:'Jonli',ANSWERS_LOCKED:'Javoblar yopildi',
  PEER_MARKING:'Peer marking',ROUND_RESULTS:'Natijalar',PAUSED:'Pauza',
};
const QUESTION_VISIBLE=new Set<LiveChallengeStudentCard['status']>(['QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS']);
type OwnAnswerState={challengeId:string;challengeStatus:string;stateVersion:number;roundId:string|null;roundNumber:number|null;roundStatus:string|null;answer:{id:string;text:string;submittedAt:string;lockedAt:string|null;submissionDurationMs:number|null}|null};

export function StudentLiveChallenges(){
  const[items,setItems]=useState<LiveChallengeStudentCard[]>([]);
  const[code,setCode]=useState('');
  const[joining,setJoining]=useState(false);
  const[active,setActive]=useState<LiveChallengeState|null>(null);
  const[ownAnswer,setOwnAnswer]=useState<OwnAnswerState|null>(null);
  const[loadingState,setLoadingState]=useState(false);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');

  const refresh=async()=>setItems((await api<{data:LiveChallengeStudentCard[]}>('/live-challenges/student')).data);
  useEffect(()=>{void refresh().catch(()=>{})},[]);

  const joinCode=async(value:string)=>{
    setJoining(true);setError('');setNotice('');
    try{
      const joined=(await api<{data:LiveChallengeJoinResult}>('/live-challenges/join',{method:'POST',body:JSON.stringify({code:value})})).data;
      setNotice(`${joined.title} challenge’iga qo‘shildingiz.`);
      await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'Challenge’ga qo‘shilib bo‘lmadi.')}finally{setJoining(false)}
  };
  const submit=async(event:FormEvent)=>{event.preventDefault();if(code.trim().length!==6)return;await joinCode(code);setCode('')};
  const joinCard=async(item:LiveChallengeStudentCard)=>{
    // Discovery never exposes the code. Card join still requires the code shown
    // by the teacher, and the server independently verifies class enrollment.
    const entered=window.prompt(`${item.title} uchun 6 belgili join code kiriting:`)?.trim().toUpperCase()??'';
    if(entered)await joinCode(entered);
  };
  const loadState=async(id:string)=>{
    const[stateResult,answerResult]=await Promise.all([
      api<{data:LiveChallengeState}>(`/live-challenges/${id}/state`),
      api<{data:OwnAnswerState}>(`/live-challenges/${id}/answer`),
    ]);
    setActive(stateResult.data);setOwnAnswer(answerResult.data);
  };
  const openState=async(item:LiveChallengeStudentCard)=>{
    setLoadingState(true);setError('');
    try{await loadState(item.id)}
    catch(cause){setError(cause instanceof Error?cause.message:'Live Challenge holati yuklanmadi.')}
    finally{setLoadingState(false)}
  };
  const refreshState=async()=>{if(!active)return;setLoadingState(true);try{await loadState(active.id);await refresh()}finally{setLoadingState(false)}};
  const submitAnswer=async(text:string)=>{
    if(!active)return;
    setLoadingState(true);setError('');setNotice('');
    try{
      await api(`/live-challenges/${active.id}/answer`,{method:'POST',body:JSON.stringify({answerText:text,expectedStateVersion:active.stateVersion})});
      await loadState(active.id);await refresh();
      setNotice('Javob topshirildi. Bu round uchun javob endi o‘zgarmaydi.');
    }catch(cause){setError(cause instanceof Error?cause.message:'Javob yuborilmadi.')}finally{setLoadingState(false)}
  };
  const live=items.filter(item=>item.status!=='PUBLISHED');
  const upcoming=items.filter(item=>item.status==='PUBLISHED');
  return <section className="slc-card" aria-label="Live Challenges">
    <div className="slc-head"><div><span>LIVE CLASSROOM</span><h2>Live Challenges</h2></div><form onSubmit={submit}><input aria-label="Join code" value={code} onChange={event=>setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="6 BELGILI KOD"/><button disabled={joining||code.length!==6}>Join</button></form></div>
    {error?<p className="slc-message slc-message--error">{error}</p>:null}
    {notice?<p className="slc-message slc-message--ok">{notice}</p>:null}
    {active?<ActiveRound state={active} answer={ownAnswer?.answer??null} loading={loadingState} onSubmit={submitAnswer} onRefresh={refreshState} onClose={()=>{setActive(null);setOwnAnswer(null)}}/>:null}
    {!items.length?<p className="slc-empty">Hozircha sinfingiz uchun ochiq Live Challenge yo‘q.</p>:<div className="slc-groups">
      {live.length?<div><h3>Live</h3><div className="slc-list">{live.map(item=><ChallengeRow key={item.id} item={item} busy={joining||loadingState} onJoin={()=>joinCard(item)} onOpen={()=>openState(item)}/>)}</div></div>:null}
      {upcoming.length?<div><h3>Upcoming</h3><div className="slc-list">{upcoming.map(item=><ChallengeRow key={item.id} item={item} busy={joining||loadingState} onJoin={()=>joinCard(item)} onOpen={()=>openState(item)}/>)}</div></div>:null}
    </div>}
  </section>;
}

function ChallengeRow({item,busy,onJoin,onOpen}:{item:LiveChallengeStudentCard;busy:boolean;onJoin:()=>Promise<void>;onOpen:()=>Promise<void>}){
  const joined=item.participantStatus==='JOINED';
  const canOpen=joined&&QUESTION_VISIBLE.has(item.status);
  return <article className={`slc-row slc-row--${item.status.toLowerCase()}`}>
    <div className="slc-main"><span className="slc-state">{STATE_LABEL[item.status]}</span><strong>{item.title}</strong><small>{item.className} · {item.syllabusCode}{item.topicTitle?` · ${item.topicTitle}`:''}{item.subtopicTitle?` · ${item.subtopicTitle}`:''}</small><small>{item.teacherName} · {item.questionCount} savol · {item.joinedCount} joined</small></div>
    <div className="slc-action">{canOpen?<button disabled={busy} onClick={()=>void onOpen()}>{busy?'…':'Ochish'}</button>:joined?<span className="slc-joined">✓ Joined</span>:item.canJoin?<button disabled={busy} onClick={()=>void onJoin()}>{busy?'…':'Join'}</button>:<span className="slc-closed">Join yopiq</span>}</div>
  </article>;
}

function ActiveRound({state,answer,loading,onSubmit,onRefresh,onClose}:{state:LiveChallengeState;answer:OwnAnswerState['answer'];loading:boolean;onSubmit:(text:string)=>Promise<void>;onRefresh:()=>Promise<void>;onClose:()=>void}){
  const question=state.question;
  const[draft,setDraft]=useState(answer?.text??'');
  useEffect(()=>{setDraft(answer?.text??'')},[state.round?.id,answer?.id]);
  const structured=question?.contentJson??null;
  const structuredReady=Boolean(structured&&question?.contentVersion===1&&structuredQuestionUsable(structured)&&structuredQuestionAssetsReady(structured,question.assetUrls??{}));
  const canAnswer=state.status==='QUESTION_ACTIVE'&&!answer&&Boolean(question);
  return <section className="slc-round" aria-live="polite">
    <header><div><span>LIVE ROUND {state.round?.number??''}</span><h3>{state.title}</h3><small>{state.status.replaceAll('_',' ')} · server state #{state.stateVersion}</small></div><div><button type="button" className="slc-secondary" disabled={loading} onClick={()=>void onRefresh()}>{loading?'…':'Yangilash'}</button><button type="button" className="slc-secondary" onClick={onClose}>Yopish</button></div></header>
    {question?<div className="slc-question"><div className="slc-question-meta"><strong>{question.displayRef}</strong>{question.commandWord?<span>{question.commandWord}</span>:null}<b>{question.marks} ball</b></div>{structuredReady&&structured?<StructuredQuestionView content={structured} assetUrls={question.assetUrls}/>:structured?<StructuredQuestionView content={structured} assetUrls={question.assetUrls}/>:<>{question.contextMd?<AttemptContext value={question.contextMd}/>:null}<p className="slc-stem">{question.stemMd}</p></>}</div>:<p className="slc-empty">O‘qituvchi savolni ochishini kuting.</p>}
    {question?<section className={`slc-answer${answer?' is-submitted':''}`}><div><strong>{answer?'Javob topshirildi':'Javobingiz'}</strong>{answer?<small>{new Date(answer.submittedAt).toLocaleTimeString()} · o‘zgartirib bo‘lmaydi</small>:<small>Topshirgandan keyin javob o‘zgarmaydi</small>}</div><textarea disabled={!canAnswer||loading} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={canAnswer?'Javobingizni yozing…':answer?'Topshirilgan javob':'Javob qabul qilish yopilgan.'}/>{canAnswer?<button type="button" disabled={loading||draft.trim().length===0} onClick={()=>void onSubmit(draft)}>{loading?'Yuborilmoqda…':'Javobni topshirish'}</button>:null}</section>:null}
    {answer&&state.status==='QUESTION_ACTIVE'?<p className="slc-round-note">Javob qabul qilindi. O‘qituvchi roundni yopishini kuting.</p>:null}
    {state.status==='ANSWERS_LOCKED'?<p className="slc-round-note">Barcha ochiq javoblar qulflandi. Keyingi bosqichni o‘qituvchi ochadi.</p>:null}
  </section>;
}
