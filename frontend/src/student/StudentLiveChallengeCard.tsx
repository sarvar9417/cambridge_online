import { useEffect, useState } from 'react';
import { Broadcast, PlayCircle } from '@phosphor-icons/react';
import { api, type LiveExamSummary } from '../lib/api';
import { navigate } from '../lib/router';
import './student-live-challenge.css';

const ACTIVE_STATUS = new Set(['lobby','question_open','answers_locked','marking','review']);
const UPCOMING_STATUS = new Set(['published','lobby','question_open']);

const STATUS_TEXT:Record<LiveExamSummary['status'],string> = {
  draft:'Draft',
  published:'Nashr qilingan',
  lobby:'O‘qituvchi boshlashini kutmoqda',
  question_open:'Savol ochiq',
  answers_locked:'Javoblar yopildi',
  marking:'Baholash davom etmoqda',
  review:'Natijalar ochiq',
  finished:'Yakunlangan',
  cancelled:'Bekor qilingan',
};

export function StudentLiveChallengeCard() {
  const [sessions,setSessions]=useState<LiveExamSummary[]>([]);

  useEffect(()=>{
    let cancelled=false;
    const load=()=>api<{data:LiveExamSummary[]}>('/live-exams')
      .then((result)=>{if(!cancelled)setSessions(result.data)})
      .catch(()=>{});
    void load();
    const timer=window.setInterval(()=>void load(),15_000);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[]);

  const active=sessions.find((session)=>session.joined===true&&ACTIVE_STATUS.has(session.status));
  const upcoming=sessions.find((session)=>session.joined!==true&&UPCOMING_STATUS.has(session.status));
  const visible=active??upcoming;
  const destination=active?`oquvchi/live?id=${active.id}`:'oquvchi/live';

  return <section className={`sh-live ${visible?'is-active':''}`} aria-label="Live Challenge">
    <div className="sh-live-icon"><Broadcast size={28} weight={visible?'fill':'regular'}/></div>
    <div className="sh-live-copy">
      <span>CAMBRIDGE LIVE CHALLENGE</span>
      <h2>{visible?visible.title:'Sinf bilan bir vaqtda past-paper ishlang'}</h2>
      <p>{active
        ? `${active.className} · ${STATUS_TEXT[active.status]} · ${active.participantCount} o‘quvchi`
        : upcoming
          ? `${upcoming.className} · ${STATUS_TEXT[upcoming.status]} · qo‘shilish uchun o‘qituvchi bergan kodni kiriting`
          : 'O‘qituvchi bergan 6 xonali kod bilan live sessiyaga qo‘shiling. Savol, mark scheme va natija bir xil ritmda ochiladi.'}</p>
    </div>
    <button type="button" onClick={()=>navigate(destination)}>
      <PlayCircle size={20} weight="fill"/>{active?'Sessiyaga kirish':'Kodni kiritish'}
    </button>
  </section>;
}
