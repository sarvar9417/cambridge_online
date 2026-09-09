import { FormEvent, useEffect, useState } from 'react';
import { api, type LiveChallengeJoinResult, type LiveChallengeStudentCard } from '../lib/api';
import './student-live-challenges.css';

const STATE_LABEL:Record<LiveChallengeStudentCard['status'],string>={
  PUBLISHED:'Kutilmoqda',LOBBY:'Lobby ochiq',QUESTION_ACTIVE:'Jonli',ANSWERS_LOCKED:'Javoblar yopildi',
  PEER_MARKING:'Peer marking',ROUND_RESULTS:'Natijalar',PAUSED:'Pauza',
};

export function StudentLiveChallenges(){
  const[items,setItems]=useState<LiveChallengeStudentCard[]>([]);
  const[code,setCode]=useState('');
  const[joining,setJoining]=useState(false);
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
    // Dashboard discovery never exposes another class's join code. A card-level
    // join deliberately asks for the teacher-displayed code, preserving the
    // plan's explicit code gate while the server also verifies enrollment.
    const entered=window.prompt(`${item.title} uchun 6 belgili join code kiriting:`)?.trim().toUpperCase()??'';
    if(entered)await joinCode(entered);
  };
  const live=items.filter(item=>item.status!=='PUBLISHED');
  const upcoming=items.filter(item=>item.status==='PUBLISHED');
  return <section className="slc-card" aria-label="Live Challenges">
    <div className="slc-head"><div><span>LIVE CLASSROOM</span><h2>Live Challenges</h2></div><form onSubmit={submit}><input aria-label="Join code" value={code} onChange={event=>setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="6 BELGILI KOD"/><button disabled={joining||code.length!==6}>Join</button></form></div>
    {error?<p className="slc-message slc-message--error">{error}</p>:null}
    {notice?<p className="slc-message slc-message--ok">{notice}</p>:null}
    {!items.length?<p className="slc-empty">Hozircha sinfingiz uchun ochiq Live Challenge yo‘q.</p>:<div className="slc-groups">
      {live.length?<div><h3>Live</h3><div className="slc-list">{live.map(item=><ChallengeRow key={item.id} item={item} joining={joining} onJoin={()=>joinCard(item)}/>)}</div></div>:null}
      {upcoming.length?<div><h3>Upcoming</h3><div className="slc-list">{upcoming.map(item=><ChallengeRow key={item.id} item={item} joining={joining} onJoin={()=>joinCard(item)}/>)}</div></div>:null}
    </div>}
  </section>;
}

function ChallengeRow({item,joining,onJoin}:{item:LiveChallengeStudentCard;joining:boolean;onJoin:()=>Promise<void>}){
  const joined=item.participantStatus==='JOINED';
  return <article className={`slc-row slc-row--${item.status.toLowerCase()}`}>
    <div className="slc-main"><span className="slc-state">{STATE_LABEL[item.status]}</span><strong>{item.title}</strong><small>{item.className} · {item.syllabusCode}{item.topicTitle?` · ${item.topicTitle}`:''}{item.subtopicTitle?` · ${item.subtopicTitle}`:''}</small><small>{item.teacherName} · {item.questionCount} savol · {item.joinedCount} joined</small></div>
    <div className="slc-action">{joined?<span className="slc-joined">✓ Joined</span>:item.canJoin?<button disabled={joining} onClick={()=>void onJoin()}>{joining?'…':'Join'}</button>:<span className="slc-closed">Join yopiq</span>}</div>
  </article>;
}
