import { FormEvent, useState } from 'react';
import type { LiveChallengeStudentCard } from '../lib/api';
import './student-live-challenges.css';

const STATE_LABEL:Record<LiveChallengeStudentCard['status'],string>={
  PUBLISHED:'Kutilmoqda',LOBBY:'Lobby ochiq',QUESTION_ACTIVE:'Jonli',ANSWERS_LOCKED:'Javoblar yopildi',
  PEER_MARKING:'Peer marking',ROUND_RESULTS:'Natijalar',PAUSED:'Pauza',
};

export function StudentLiveChallenges({items,onJoinCode,onJoinCard,joining}:{
  items:LiveChallengeStudentCard[];
  onJoinCode:(code:string)=>Promise<void>;
  onJoinCard:(item:LiveChallengeStudentCard)=>Promise<void>;
  joining:boolean;
}){
  const[code,setCode]=useState('');
  const submit=async(event:FormEvent)=>{event.preventDefault();if(code.trim().length!==6)return;await onJoinCode(code);setCode('')};
  const live=items.filter(item=>item.status!=='PUBLISHED');
  const upcoming=items.filter(item=>item.status==='PUBLISHED');
  return <section className="slc-card" aria-label="Live Challenges">
    <div className="slc-head"><div><span>LIVE CLASSROOM</span><h2>Live Challenges</h2></div><form onSubmit={submit}><input aria-label="Join code" value={code} onChange={event=>setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="6 BELGILI KOD"/><button disabled={joining||code.length!==6}>Join</button></form></div>
    {!items.length?<p className="slc-empty">Hozircha sinfingiz uchun ochiq Live Challenge yo‘q.</p>:<div className="slc-groups">
      {live.length?<div><h3>Live</h3><div className="slc-list">{live.map(item=><ChallengeRow key={item.id} item={item} joining={joining} onJoin={()=>onJoinCard(item)}/>)}</div></div>:null}
      {upcoming.length?<div><h3>Upcoming</h3><div className="slc-list">{upcoming.map(item=><ChallengeRow key={item.id} item={item} joining={joining} onJoin={()=>onJoinCard(item)}/>)}</div></div>:null}
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
