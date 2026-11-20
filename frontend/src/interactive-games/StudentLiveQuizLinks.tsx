import { useEffect, useState } from 'react';
import { GameController, ArrowSquareOut } from '@phosphor-icons/react';
import { api } from '../lib/api';
import type { AvailableLiveQuiz } from './live-quiz-api';
import './student-live-quiz-links.css';

/** Live room invitations are discovered from the student's active class enrollments. */
export function StudentLiveQuizLinks(){
  const [rooms,setRooms]=useState<AvailableLiveQuiz[]>([]);
  useEffect(()=>{
    let mounted=true,inFlight=false;
    const load=async()=>{
      if(inFlight)return;
      inFlight=true;
      try{
        const {data}=await api<{data:AvailableLiveQuiz[]}>('/live-quizzes/available');
        if(mounted)setRooms(data);
      }catch{/* Keep the last-known invitation on a transient network error. */}
      finally{inFlight=false;}
    };
    const onVisible=()=>{if(document.visibilityState==='visible')void load();};
    void load();
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load();},10_000);
    window.addEventListener('focus',load);
    document.addEventListener('visibilitychange',onVisible);
    return()=>{mounted=false;window.clearInterval(timer);
      window.removeEventListener('focus',load);document.removeEventListener('visibilitychange',onVisible);};
  },[]);
  return <section className="lq-student-discovery" aria-label="Join a Cambridge Live Quiz" aria-live="polite">
    <div className="lq-student-discovery-heading">
      <span className="lq-student-discovery-icon"><GameController size={25} weight="duotone"/></span>
      <div><span className="lq-student-discovery-kicker">CAMBRIDGE · LIVE QUIZ</span>
        <h2>{rooms.length?'Sinfingiz uchun o‘yin tayyor!':'O‘yin kodini kiritib qo‘shiling'}</h2>
        <p>O‘qituvchingiz bergan 6 xonali kod orqali istalgan sinf o‘yiniga kiring.</p></div>
      <a className="lq-student-discovery-code-link" href="#/play">
        Kodni kiritish <ArrowSquareOut size={18} weight="bold"/></a>
    </div>
    {!!rooms.length&&<div className="lq-student-discovery-rooms">{rooms.map(room=><div className="lq-student-discovery-room" key={room.id}>
      <div><strong>{room.className} · {room.mode==='treasure'?'Treasure Quest':'Classic Quiz'}</strong>
        <small>{room.courseCode} · {room.status==='waiting'?'O‘yin boshlanishini kutmoqda':room.status==='review'?'Javoblar ko‘rsatilmoqda':'O‘yin davom etmoqda'} · {room.playerCount} o‘quvchi</small></div>
      <a href={`#/play/${room.pin}`} aria-label={`O‘yinga kirish — ${room.className} Live Quiz`}>
        O‘yinga kirish <ArrowSquareOut size={18} weight="bold"/></a>
    </div>)}</div>}
  </section>;
}
