import { FormEvent, useEffect, useState } from 'react';
import { api, type LiveChallengeJoinResult, type LiveChallengeState, type LiveChallengeStudentCard } from '../lib/api';
import { AttemptContext } from '../AttemptContext';
import { useLiveChallengeSync } from '../hooks/useLiveChallengeSync';
import { StructuredQuestionView, structuredQuestionAssetsReady, structuredQuestionUsable } from './StructuredQuestionView';
import './student-live-challenges.css';

const STATE_LABEL:Record<LiveChallengeStudentCard['status'],string>={
  PUBLISHED:'Kutilmoqda',LOBBY:'Lobby ochiq',QUESTION_ACTIVE:'Jonli',ANSWERS_LOCKED:'Javoblar yopildi',
  PEER_MARKING:'Peer marking',ROUND_RESULTS:'Natijalar',PAUSED:'Pauza',
};
const QUESTION_VISIBLE=new Set<LiveChallengeStudentCard['status']>(['QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS']);
type OwnAnswerState={challengeId:string;challengeStatus:string;stateVersion:number;roundId:string|null;roundNumber:number|null;roundStatus:string|null;answer:{id:string;text:string;submittedAt:string;lockedAt:string|null;submissionDurationMs:number|null}|null};
type MarkPoint={id:string;code:string;text:string;marks:number;accept?:string|null;reject?:string|null};
type PeerAssignmentState={challengeId:string;status:string;stateVersion:number;roundId:string;roundNumber:number;assignment:null|{id:string;status:string;questionRef:string;answerText:string;maxMarks:number;markScheme:{maxMarks:number;guidanceMd?:string|null;points?:MarkPoint[];groups?:unknown[];levels?:unknown[]};submittedMark:null|{awardedMarks:number;markPointIds:string[];feedbackText:string|null;submittedAt:string}}};
type OwnResultRound={roundId:string;roundNumber:number;questionRef:string;answered:boolean;score:number;maxMarks:number;percentage:number;teacherOverridden:boolean};
type LearningObjectiveResult={id:string;code:string;text:string;subtopicCode:string;subtopicTitle:string;topicNumber:number;topicTitle:string;questionCount:number;marksEarned:number;marksPossible:number;percentage:number};
type OwnResult={challengeId:string;status:string;stateVersion:number;roundId:string;roundNumber:number;questionRef:string;score:number;maxMarks:number;percentage:number;teacherOverridden:boolean;rounds:OwnResultRound[];totalScore:number;totalMax:number;overallPercentage:number;learningObjectives:LearningObjectiveResult[];strengths:LearningObjectiveResult[];reviewAreas:LearningObjectiveResult[]};
type HistoryCard={id:string;title:string;classId:string;className:string;status:'FINISHED';teacherName:string;syllabusCode:string;topicTitle:string|null;subtopicTitle:string|null;finishedAt:string|null;roundCount:number;totalScore:number;totalMax:number;overallPercentage:number};

export function StudentLiveChallenges(){
  const[items,setItems]=useState<LiveChallengeStudentCard[]>([]);
  const[history,setHistory]=useState<HistoryCard[]>([]);
  const[code,setCode]=useState('');
  const[joining,setJoining]=useState(false);
  const[active,setActive]=useState<LiveChallengeState|null>(null);
  const[ownAnswer,setOwnAnswer]=useState<OwnAnswerState|null>(null);
  const[peer,setPeer]=useState<PeerAssignmentState|null>(null);
  const[result,setResult]=useState<OwnResult|null>(null);
  const[loadingState,setLoadingState]=useState(false);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');

  const refresh=async()=>setItems((await api<{data:LiveChallengeStudentCard[]}>('/live-challenges/student')).data);
  const refreshHistory=async()=>setHistory((await api<{data:HistoryCard[]}>('/live-challenges/student/history?limit=10')).data);
  useEffect(()=>{
    void Promise.all([refresh(),refreshHistory()]).catch(()=>{});
    const timer=window.setInterval(()=>void refresh().catch(()=>{}),5000);
    return()=>window.clearInterval(timer);
  },[]);

  const joinCode=async(value:string)=>{
    setJoining(true);setError('');setNotice('');
    try{
      const joined=(await api<{data:LiveChallengeJoinResult}>('/live-challenges/join',{method:'POST',body:JSON.stringify({code:value})})).data;
      setNotice(`${joined.title} challenge’iga qo‘shildingiz.`);await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'Challenge’ga qo‘shilib bo‘lmadi.')}finally{setJoining(false)}
  };
  const submit=async(event:FormEvent)=>{event.preventDefault();if(code.trim().length!==6)return;await joinCode(code);setCode('')};
  const joinCard=async(item:LiveChallengeStudentCard)=>{
    const entered=window.prompt(`${item.title} uchun 6 belgili join code kiriting:`)?.trim().toUpperCase()??'';
    if(entered)await joinCode(entered);
  };
  const loadState=async(id:string)=>{
    const[stateResult,answerResult]=await Promise.all([
      api<{data:LiveChallengeState}>(`/live-challenges/${id}/state`),
      api<{data:OwnAnswerState}>(`/live-challenges/${id}/answer`),
    ]);
    const state=stateResult.data;
    setActive(state);setOwnAnswer(answerResult.data);setPeer(null);setResult(null);
    if(state.status==='PEER_MARKING'||state.status==='ROUND_RESULTS'){
      const peerResult=await api<{data:PeerAssignmentState}>(`/live-challenges/${id}/peer-marking/assignment`);
      setPeer(peerResult.data);
    }
    if(state.status==='ROUND_RESULTS'||state.status==='FINISHED'){
      const resultResponse=await api<{data:OwnResult}>(`/live-challenges/${id}/result`);
      setResult(resultResponse.data);
      if(state.status==='FINISHED')void refreshHistory().catch(()=>{});
    }
  };
  const openChallenge=async(id:string)=>{
    setLoadingState(true);setError('');
    try{await loadState(id)}catch(cause){setError(cause instanceof Error?cause.message:'Live Challenge holati yuklanmadi.')}finally{setLoadingState(false)}
  };
  const openState=async(item:LiveChallengeStudentCard)=>openChallenge(item.id);
  const refreshState=async()=>{if(!active)return;setLoadingState(true);setError('');try{await loadState(active.id);await refresh()}catch(cause){setError(cause instanceof Error?cause.message:'Live Challenge yangilanmadi.')}finally{setLoadingState(false)}};
  const submitAnswer=async(text:string)=>{
    if(!active?.round?.id)return;
    setLoadingState(true);setError('');setNotice('');
    try{
      await api(`/live-challenges/${active.id}/answer`,{method:'POST',body:JSON.stringify({roundId:active.round.id,answerText:text,expectedStateVersion:active.stateVersion})});
      await loadState(active.id);await refresh();setNotice('Javob topshirildi. Bu round uchun javob endi o‘zgarmaydi.');
    }catch(cause){setError(cause instanceof Error?cause.message:'Javob yuborilmadi.')}finally{setLoadingState(false)}
  };
  const submitPeerMark=async(input:{awardedMarks:number;markPointIds:string[];feedbackText:string})=>{
    if(!active||!peer?.assignment?.id)return;
    setLoadingState(true);setError('');setNotice('');
    try{
      await api(`/live-challenges/${active.id}/peer-marking/submit`,{method:'POST',body:JSON.stringify({peerAssignmentId:peer.assignment.id,...input})});
      await loadState(active.id);setNotice('Peer mark topshirildi. Baholash anonim va endi o‘zgarmaydi.');
    }catch(cause){setError(cause instanceof Error?cause.message:'Peer mark yuborilmadi.')}finally{setLoadingState(false)}
  };

  useLiveChallengeSync(active?.id,async()=>{
    if(!active)return;
    try{await loadState(active.id);await refresh()}catch{/* manual refresh remains available */}
  });

  const live=items.filter(item=>item.status!=='PUBLISHED');
  const upcoming=items.filter(item=>item.status==='PUBLISHED');
  return <section className="slc-card" aria-label="Live Challenges">
    <div className="slc-head"><div><span>LIVE CLASSROOM</span><h2>Live Challenges</h2></div><form onSubmit={submit}><input aria-label="Join code" value={code} onChange={event=>setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="6 BELGILI KOD"/><button disabled={joining||code.length!==6}>Join</button></form></div>
    {error?<p className="slc-message slc-message--error">{error}</p>:null}
    {notice?<p className="slc-message slc-message--ok">{notice}</p>:null}
    {active?<ActiveRound state={active} answer={ownAnswer?.answer??null} peer={peer} result={result} loading={loadingState} onSubmit={submitAnswer} onPeerMark={submitPeerMark} onRefresh={refreshState} onClose={()=>{setActive(null);setOwnAnswer(null);setPeer(null);setResult(null)}}/>:null}
    {!items.length?<p className="slc-empty">Hozircha sinfingiz uchun ochiq Live Challenge yo‘q.</p>:null}
    {items.length||history.length?<div className="slc-groups">
      {live.length?<div><h3>Live</h3><div className="slc-list">{live.map(item=><ChallengeRow key={item.id} item={item} busy={joining||loadingState} onJoin={()=>joinCard(item)} onOpen={()=>openState(item)}/>)}</div></div>:null}
      {upcoming.length?<div><h3>Upcoming</h3><div className="slc-list">{upcoming.map(item=><ChallengeRow key={item.id} item={item} busy={joining||loadingState} onJoin={()=>joinCard(item)} onOpen={()=>openState(item)}/>)}</div></div>:null}
      {history.length?<div><h3>Completed</h3><div className="slc-list">{history.map(item=><HistoryRow key={item.id} item={item} busy={loadingState} onOpen={()=>openChallenge(item.id)}/>)}</div></div>:null}
    </div>:null}
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

function HistoryRow({item,busy,onOpen}:{item:HistoryCard;busy:boolean;onOpen:()=>Promise<void>}){
  return <article className="slc-row slc-row--finished">
    <div className="slc-main"><span className="slc-state">Yakunlangan</span><strong>{item.title}</strong><small>{item.className} · {item.syllabusCode}{item.topicTitle?` · ${item.topicTitle}`:''}{item.subtopicTitle?` · ${item.subtopicTitle}`:''}</small><small>{item.teacherName} · {item.roundCount} round · {item.totalScore}/{item.totalMax} · {item.overallPercentage}%</small></div>
    <div className="slc-action"><button disabled={busy} onClick={()=>void onOpen()}>{busy?'…':'Natijani ochish'}</button></div>
  </article>;
}

function ActiveRound({state,answer,peer,result,loading,onSubmit,onPeerMark,onRefresh,onClose}:{state:LiveChallengeState;answer:OwnAnswerState['answer'];peer:PeerAssignmentState|null;result:OwnResult|null;loading:boolean;onSubmit:(text:string)=>Promise<void>;onPeerMark:(input:{awardedMarks:number;markPointIds:string[];feedbackText:string})=>Promise<void>;onRefresh:()=>Promise<void>;onClose:()=>void}){
  const question=state.question;
  const[draft,setDraft]=useState(answer?.text??'');
  useEffect(()=>{setDraft(answer?.text??'')},[state.round?.id,answer?.id]);
  const structured=question?.contentJson??null;
  const structuredReady=Boolean(structured&&question?.contentVersion===1&&structuredQuestionUsable(structured)&&structuredQuestionAssetsReady(structured,question.assetUrls??{}));
  const canAnswer=state.status==='QUESTION_ACTIVE'&&!answer&&Boolean(question);
  return <section className="slc-round" aria-live="polite">
    <header><div><span>LIVE ROUND {state.round?.number??''}</span><h3>{state.title}</h3><small>{state.status.replaceAll('_',' ')}</small></div><div><button type="button" className="slc-secondary" disabled={loading} onClick={()=>void onRefresh()}>{loading?'…':'Yangilash'}</button><button type="button" className="slc-secondary" onClick={onClose}>Yopish</button></div></header>
    {question?<div className="slc-question"><div className="slc-question-meta"><strong>{question.displayRef}</strong>{question.commandWord?<span>{question.commandWord}</span>:null}<b>{question.marks} ball</b></div>{structuredReady&&structured?<StructuredQuestionView content={structured} assetUrls={question.assetUrls}/>:structured?<StructuredQuestionView content={structured} assetUrls={question.assetUrls}/>:<>{question.contextMd?<AttemptContext value={question.contextMd}/>:null}<p className="slc-stem">{question.stemMd}</p></>}</div>:<p className="slc-empty">O‘qituvchi savolni ochishini kuting.</p>}
    {question?<section className={`slc-answer${answer?' is-submitted':''}`}><div><strong>{answer?'Javob topshirildi':'Javobingiz'}</strong>{answer?<small>{new Date(answer.submittedAt).toLocaleTimeString()} · o‘zgartirib bo‘lmaydi</small>:<small>Topshirgandan keyin javob o‘zgarmaydi</small>}</div><textarea disabled={!canAnswer||loading} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={canAnswer?'Javobingizni yozing…':answer?'Topshirilgan javob':'Javob qabul qilish yopilgan.'}/>{canAnswer?<button type="button" disabled={loading||draft.trim().length===0} onClick={()=>void onSubmit(draft)}>{loading?'Yuborilmoqda…':'Javobni topshirish'}</button>:null}</section>:null}
    {answer&&state.status==='QUESTION_ACTIVE'?<p className="slc-round-note">Javob qabul qilindi. O‘qituvchi roundni yopishini kuting.</p>:null}
    {state.status==='ANSWERS_LOCKED'?<p className="slc-round-note">Barcha ochiq javoblar qulflandi. Peer marking boshlanishini kuting.</p>:null}
    {state.status==='PEER_MARKING'?<PeerMarkingPanel peer={peer} loading={loading} onSubmit={onPeerMark}/>:null}
    {state.status==='ROUND_RESULTS'||state.status==='FINISHED'?<RoundResultPanel result={result}/>:null}
    {state.status==='FINISHED'?<p className="slc-round-note">Challenge yakunlandi.</p>:null}
  </section>;
}

function PeerMarkingPanel({peer,loading,onSubmit}:{peer:PeerAssignmentState|null;loading:boolean;onSubmit:(input:{awardedMarks:number;markPointIds:string[];feedbackText:string})=>Promise<void>}){
  const assignment=peer?.assignment??null;
  const[selected,setSelected]=useState<string[]>(assignment?.submittedMark?.markPointIds??[]);
  const[score,setScore]=useState(assignment?.submittedMark?.awardedMarks??0);
  const[feedback,setFeedback]=useState(assignment?.submittedMark?.feedbackText??'');
  useEffect(()=>{setSelected(assignment?.submittedMark?.markPointIds??[]);setScore(assignment?.submittedMark?.awardedMarks??0);setFeedback(assignment?.submittedMark?.feedbackText??'')},[assignment?.id,assignment?.submittedMark?.submittedAt]);
  if(!peer)return <p className="slc-round-note">Anonymous peer assignment yuklanmoqda.</p>;
  if(!assignment)return <p className="slc-round-note">Sizga bu roundda peer answer biriktirilmagan. Natijalarni kuting.</p>;
  const submitted=Boolean(assignment.submittedMark);
  const points=assignment.markScheme.points??[];
  const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
  return <section className={`slc-peer${submitted?' is-submitted':''}`}>
    <div className="slc-peer-title"><div><span>ANONYMOUS PEER ANSWER</span><strong>{assignment.questionRef}</strong></div><b>{assignment.maxMarks} ball</b></div>
    <blockquote>{assignment.answerText}</blockquote>
    <div className="slc-ms"><h4>Mark Scheme</h4>{assignment.markScheme.guidanceMd?<p>{assignment.markScheme.guidanceMd}</p>:null}{points.length?points.map(point=><label key={point.id}><input type="checkbox" disabled={submitted||loading} checked={selected.includes(point.id)} onChange={()=>toggle(point.id)}/><span><strong>{point.code}</strong>{point.text}{point.accept?<small>Accept: {point.accept}</small>:null}{point.reject?<small>Reject: {point.reject}</small>:null}</span><b>{point.marks}</b></label>):<p>Bu savol level-based scheme’dan foydalanadi; umumiy ballni scheme bo‘yicha tanlang.</p>}</div>
    <div className="slc-peer-score"><label>Ball<input type="number" min={0} max={assignment.maxMarks} step="0.5" disabled={submitted||loading} value={score} onChange={event=>setScore(Number(event.target.value))}/></label><label>Qisqa feedback<textarea maxLength={5000} disabled={submitted||loading} value={feedback} onChange={event=>setFeedback(event.target.value)} placeholder="Ixtiyoriy feedback"/></label></div>
    {submitted?<p className="slc-peer-done">✓ Peer mark topshirilgan: {assignment.submittedMark?.awardedMarks}/{assignment.maxMarks}. Endi o‘zgarmaydi.</p>:<button type="button" disabled={loading||score<0||score>assignment.maxMarks} onClick={()=>void onSubmit({awardedMarks:score,markPointIds:selected,feedbackText:feedback})}>{loading?'Yuborilmoqda…':'Peer markni topshirish'}</button>}
  </section>;
}

function RoundResultPanel({result}:{result:OwnResult|null}){
  if(!result)return <p className="slc-round-note">Natija yuklanmoqda.</p>;
  return <section className="slc-result">
    <span>{result.status==='FINISHED'?'FINAL RESULT':'ROUND RESULT'}</span>
    <div><strong>{result.score}/{result.maxMarks}</strong><b>{result.percentage}%</b></div>
    <p>{result.questionRef}{result.teacherOverridden?' · Teacher override qo‘llangan':''}</p>
    <div className="slc-result-total"><span>Challenge jami</span><strong>{result.totalScore}/{result.totalMax}</strong><b>{result.overallPercentage}%</b></div>
    <div className="slc-result-rounds">{result.rounds.map(round=><div key={round.roundId}><span>R{round.roundNumber} · {round.questionRef}</span><strong>{round.score}/{round.maxMarks}</strong><b>{round.percentage}%</b>{!round.answered?<em>Javob topshirilmagan</em>:round.teacherOverridden?<em>Teacher override</em>:null}</div>)}</div>
    {result.strengths.length||result.reviewAreas.length?<div className="slc-result-insights">
      {result.strengths.length?<section><span>STRONGEST AREAS</span>{result.strengths.map(item=><article key={item.id}><div><strong>{item.code}</strong><small>{item.subtopicTitle}</small></div><p>{item.text}</p><b>{item.percentage}%</b></article>)}</section>:null}
      {result.reviewAreas.length?<section><span>REVIEW AREAS</span>{result.reviewAreas.map(item=><article key={item.id}><div><strong>{item.code}</strong><small>{item.subtopicTitle}</small></div><p>{item.text}</p><b>{item.percentage}%</b></article>)}</section>:null}
    </div>:null}
  </section>;
}
