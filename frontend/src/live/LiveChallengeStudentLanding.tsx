import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Broadcast, CheckCircle, Clock, History } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import './live-exam.css';

type FeedItem={
  id:string;title:string;className:string;status:string;markingMode:string;currentQuestionIndex:number;
  questionCount:number;participantCount:number;publishedAt:string|null;updatedAt:string;joined:boolean;
  canJoinWithCode:boolean;earned:number|null;possible:number|null;
};
type StudentFeed={active:FeedItem[];upcoming:FeedItem[];history:FeedItem[]};

const STATUS_LABEL:Record<string,string>={
  published:'Nashr qilingan',lobby:'Xona ochiq',question_open:'Live davom etmoqda',answers_locked:'Javoblar yopildi',
  marking:'Baholash',review:'Natijalar',paused:'Pauza',finished:'Yakunlangan',cancelled:'Bekor qilingan',
};

function message(error:unknown){return error instanceof Error?error.message:'Live Challenge ma’lumotlari yuklanmadi.';}

function ChallengeRows({items,mode}:{items:FeedItem[];mode:'active'|'upcoming'|'history'}){
  if(!items.length)return <p className="live-empty">Hozircha bu bo‘limda challenge yo‘q.</p>;
  return <div className="live-session-list">{items.map((item)=>{
    const clickable=mode!=='upcoming'&&item.joined;
    const score=mode==='history'&&item.possible!==null?`${item.earned??0} / ${item.possible}`:null;
    return <button type="button" key={item.id} disabled={!clickable} onClick={()=>{if(clickable)navigate(`oquvchi/live?id=${item.id}`)}}>
      <span className={`live-state live-state--${item.status}`}>{STATUS_LABEL[item.status]??item.status}</span>
      <strong>{item.title}</strong>
      <small>{item.className} · {item.questionCount} savol · {item.participantCount} o‘quvchi{item.canJoinWithCode?' · kod bilan late join mumkin':''}</small>
      <i>{score??(clickable?'→':'Kod kutilmoqda')}</i>
    </button>;
  })}</div>;
}

export function LiveChallengeStudentLanding(){
  const [feed,setFeed]=useState<StudentFeed>({active:[],upcoming:[],history:[]});
  const [code,setCode]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    try{
      const result=await api<{data:StudentFeed}>('/live-exams/student-feed');
      setFeed(result.data);setError('');
    }catch(cause){setError(message(cause));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),10_000);return()=>window.clearInterval(timer)},[load]);

  const join=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setError('');
    try{
      const result=await api<{sessionId:string}>('/live-exams/join',{method:'POST',body:JSON.stringify({code})});
      navigate(`oquvchi/live?id=${result.sessionId}`);
    }catch(cause){setError(message(cause));setBusy(false);await load();}
  };

  return <div className="live-page live-landing">
    <header className="live-page-head"><div><span className="live-eyebrow"><Broadcast size={18}/> CAMBRIDGE LIVE CHALLENGE</span><h1>Live Challenge</h1><p>Sinfingiz uchun nashr qilingan challenge’larni ko‘ring, kod bilan xonaga kiring va oldingi natijalaringizni oching.</p></div></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    <section className="live-join-card"><div><span className="live-eyebrow">XONAGA KIRISH</span><h2>O‘qituvchi bergan 6 xonali kodni kiriting</h2></div><form onSubmit={join}><input aria-label="Xona kodi" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" value={code} onChange={(event)=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000"/><button disabled={busy||code.length!==6}>{busy?'Tekshirilmoqda…':'Qo‘shilish'}</button></form></section>

    <section className="live-history"><header><h2><Broadcast/> Faol challenge’lar</h2><span>{feed.active.length}</span></header>{loading?<p className="live-empty">Yuklanmoqda…</p>:<ChallengeRows items={feed.active} mode="active"/>}</section>
    <section className="live-history"><header><h2><Clock/> Kutilayotgan / Live</h2><span>{feed.upcoming.length}</span></header><ChallengeRows items={feed.upcoming} mode="upcoming"/></section>
    <section className="live-history"><header><h2><History/> Tarix</h2><span>{feed.history.length}</span></header><ChallengeRows items={feed.history} mode="history"/></section>
    {feed.history.length?<p className="live-wait-note"><CheckCircle/> Yakunlangan challenge ballari Cambridge marks asosida saqlanadi.</p>:null}
  </div>;
}
