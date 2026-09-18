import { useCallback, useEffect, useState } from 'react';
import { SignOut, UserMinus } from '@phosphor-icons/react';
import { api, type LiveExamSnapshot, type User } from '../lib/api';
import { navigate } from '../lib/router';
import './live-exam.css';

export function LiveChallengeParticipationControls({user,sessionId}:{user:User;sessionId:string}){
  const [snapshot,setSnapshot]=useState<LiveExamSnapshot|null>(null);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const load=useCallback(async()=>{
    try{setSnapshot(await api<LiveExamSnapshot>(`/live-exams/${sessionId}`));setError('');}
    catch(cause){setError(cause instanceof Error?cause.message:'Lobby boshqaruvi yuklanmadi.');}
  },[sessionId]);
  useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),5000);return()=>window.clearInterval(timer)},[load]);

  const session=snapshot?.session;
  if(!session||session.status!=='lobby')return null;

  const leave=async()=>{
    if(!window.confirm('Live Challenge xonasidan chiqmoqchimisiz?'))return;
    setBusy('leave');setError('');
    try{await api(`/live-exams/${sessionId}/leave`,{method:'POST'});navigate('oquvchi/live');}
    catch(cause){setError(cause instanceof Error?cause.message:'Xonadan chiqib bo‘lmadi.');setBusy('');await load();}
  };
  const remove=async(participantId:string,name:string)=>{
    if(!window.confirm(`${name} xonadan olib tashlansinmi?`))return;
    setBusy(participantId);setError('');
    try{
      await api(`/live-exams/${sessionId}/participants/${participantId}/remove`,{
        method:'POST',body:JSON.stringify({expectedVersion:session.version}),
      });
      await load();
    }catch(cause){setError(cause instanceof Error?cause.message:'Ishtirokchini olib tashlab bo‘lmadi.');await load();}
    finally{setBusy('');}
  };

  return <section className="live-page live-history" aria-label="Lobby participation controls">
    <header><h2>{user.role==='student'?'Xona boshqaruvi':'Lobby ishtirokchilari'}</h2><span>{session.participantCount}</span></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    {user.role==='student'?<button type="button" className="live-danger" disabled={Boolean(busy)} onClick={()=>void leave()}><SignOut/> Xonadan chiqish</button>:<div className="live-session-list">
      {snapshot.participants.map((person)=><button type="button" key={person.id} disabled={Boolean(busy)} onClick={()=>void remove(person.id,person.fullName)}><span className="live-state">{person.online?'Online':'Offline'}</span><strong>{person.fullName}</strong><small>Faqat lobby bosqichida olib tashlash mumkin.</small><i><UserMinus/> Olib tashlash</i></button>)}
    </div>}
  </section>;
}
