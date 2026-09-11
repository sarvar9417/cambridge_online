import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import './live-challenge-moderation.css';

type ModerationAnswer={
  answerId:string;
  studentId:string;
  studentName:string;
  answerText:string;
  submittedAt:string;
  assignmentStatus:string|null;
  peerScore:number|null;
  peerMarkedAt:string|null;
  overrideScore:number|null;
  overridePreviousScore:number|null;
  overrideReason:string|null;
  overrideCreatedAt:string|null;
  effectiveScore:number|null;
  resolved:boolean;
};

type ModerationState={
  challengeId:string;
  status:string;
  stateVersion:number;
  roundId:string;
  roundNumber:number;
  questionRef:string;
  maxMarks:number;
  answers:ModerationAnswer[];
};

type Draft={score:string;reason:string};

const errorText=(error:unknown)=>error instanceof Error?error.message:'Moderation ma’lumotlari yuklanmadi.';

export function LiveChallengeModerationPanel({challengeId,status,stateVersion,onChanged}:{challengeId:string;status:string;stateVersion:number;onChanged:()=>Promise<void>}){
  const[data,setData]=useState<ModerationState|null>(null);
  const[drafts,setDrafts]=useState<Record<string,Draft>>({});
  const[loading,setLoading]=useState(false);
  const[savingId,setSavingId]=useState<string|null>(null);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');
  const editable=status==='PEER_MARKING';

  const load=async()=>{
    setLoading(true);setError('');
    try{
      const next=(await api<{data:ModerationState}>(`/live-challenges/${challengeId}/moderation`)).data;
      setData(next);
      setDrafts(current=>Object.fromEntries(next.answers.map(answer=>[
        answer.answerId,
        current[answer.answerId]??{score:answer.effectiveScore==null?'':String(answer.effectiveScore),reason:answer.overrideReason??''},
      ])));
    }catch(cause){setError(errorText(cause))}finally{setLoading(false)}
  };

  useEffect(()=>{if(['PEER_MARKING','ROUND_RESULTS','FINISHED'].includes(status))void load()},[challengeId,status,stateVersion]);

  const resolvedCount=useMemo(()=>data?.answers.filter(answer=>answer.resolved).length??0,[data]);
  const save=async(event:FormEvent,answer:ModerationAnswer)=>{
    event.preventDefault();
    if(!data||!editable)return;
    const draft=drafts[answer.answerId]??{score:'',reason:''};
    const score=Number(draft.score);
    if(!Number.isFinite(score)||score<0||score>data.maxMarks){setError(`Ball 0–${data.maxMarks} oralig‘ida bo‘lishi kerak.`);return}
    if(draft.reason.trim().length<3){setError('Teacher moderation uchun qisqa sabab yozing.');return}
    setSavingId(answer.answerId);setError('');setNotice('');
    try{
      await api(`/live-challenges/${challengeId}/moderation/${answer.answerId}/override`,{
        method:'POST',
        body:JSON.stringify({newScore:score,reason:draft.reason.trim(),expectedStateVersion:data.stateVersion}),
      });
      setNotice(`${answer.studentName} uchun teacher score saqlandi.`);
      await onChanged();
      await load();
    }catch(cause){setError(errorText(cause))}finally{setSavingId(null)}
  };

  if(!['PEER_MARKING','ROUND_RESULTS','FINISHED'].includes(status))return null;
  return <section className="live-moderation" aria-label="Teacher moderation">
    <header><div><span>TEACHER MODERATION</span><h3>{data?.questionRef??'Round javoblari'}</h3></div><div><strong>{resolvedCount}/{data?.answers.length??0}</strong><small>score resolved</small></div></header>
    {error?<p className="live-moderation-message is-error">{error}</p>:null}
    {notice?<p className="live-moderation-message is-ok">{notice}</p>:null}
    {loading&&!data?<p className="live-moderation-empty">Javoblar yuklanmoqda…</p>:null}
    {data&&!data.answers.length?<p className="live-moderation-empty">Bu roundda topshirilgan javob yo‘q.</p>:null}
    {data?.answers.length?<div className="live-moderation-list">{data.answers.map(answer=>{
      const draft=drafts[answer.answerId]??{score:'',reason:''};
      return <article key={answer.answerId} className={answer.resolved?'is-resolved':'is-unresolved'}>
        <div className="live-moderation-answer-head"><div><strong>{answer.studentName}</strong><small>{answer.resolved?'Score resolved':'Teacher action required'} · {new Date(answer.submittedAt).toLocaleTimeString()}</small></div><div className="live-moderation-score"><b>{answer.effectiveScore??'—'}</b><span>/ {data.maxMarks}</span></div></div>
        <pre>{answer.answerText}</pre>
        <div className="live-moderation-evidence"><span>Peer: <b>{answer.peerScore??'—'}</b></span><span>Teacher override: <b>{answer.overrideScore??'—'}</b></span>{answer.assignmentStatus?<span>Assignment: <b>{answer.assignmentStatus}</b></span>:null}</div>
        {editable?<form onSubmit={event=>void save(event,answer)}><label>Teacher score<input type="number" min={0} max={data.maxMarks} step="0.5" value={draft.score} onChange={event=>setDrafts(current=>({...current,[answer.answerId]:{...draft,score:event.target.value}}))}/></label><label className="live-moderation-reason">Sabab<input maxLength={1000} value={draft.reason} onChange={event=>setDrafts(current=>({...current,[answer.answerId]:{...draft,reason:event.target.value}}))} placeholder="Masalan: mark point noto‘g‘ri baholangan"/></label><button disabled={savingId===answer.answerId||draft.score===''||draft.reason.trim().length<3}>{savingId===answer.answerId?'Saqlanmoqda…':'Teacher score saqlash'}</button></form>:<p className="live-moderation-readonly">Natija chiqarilgan — score muzlatilgan.</p>}
      </article>;
    })}</div>:null}
  </section>;
}
