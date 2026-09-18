import { useEffect, useState } from 'react';
import { Broadcast, PlayCircle } from '@phosphor-icons/react';
import { api, type LiveExamSummary } from '../lib/api';
import { navigate } from '../lib/router';
import './student-live-challenge.css';

const ACTIVE_STATUS = new Set(['lobby','question_open','answers_locked','marking','review','paused']);

const STATUS_TEXT:Record<LiveExamSummary['status'],string> = {
  draft:'Qoralama',
  published:'Nashr qilingan',
  lobby:'O‘qituvchi boshlashini kutmoqda',
  question_open:'Savol ochiq',
  answers_locked:'Javoblar yopildi',
  marking:'Baholash davom etmoqda',
  review:'Natijalar ochiq',
  paused:'Sessiya pauzada',
  finished:'Yakunlangan',
  cancelled:'Bekor qilingan',
};

export function StudentLiveChallengeCard() {
  type FeedItem=Pick<LiveExamSummary,'id'|'title'|'className'|'status'|'participantCount'>;
  const [active,setActive]=useState<FeedItem|null>(null);

  useEffect(()=>{
    let cancelled=false;
    const load=()=>api<{data:{active:FeedItem[]}}>('/live-exams/student-feed')
      .then((result)=>{if(!cancelled)setActive(result.data.active[0]??null)})
      .catch(()=>{});
    void load();
    const timer=window.setInterval(()=>void load(),15_000);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[]);

  const visibleActive=active&&ACTIVE_STATUS.has(active.status)?active:null;
  const destination=visibleActive?`oquvchi/live?id=${visibleActive.id}`:'oquvchi/live';

  return <section className={`sh-live ${visibleActive?'is-active':''}`} aria-label="Live Challenge">
    <div className="sh-live-icon"><Broadcast size={28} weight={visibleActive?'fill':'regular'}/></div>
    <div className="sh-live-copy">
      <span>CAMBRIDGE LIVE CHALLENGE</span>
      <h2>{visibleActive?visibleActive.title:'Sinf bilan bir vaqtda past-paper ishlang'}</h2>
      <p>{visibleActive
        ? `${visibleActive.className} · ${STATUS_TEXT[visibleActive.status]} · ${visibleActive.participantCount} o‘quvchi`
        : 'O‘qituvchi bergan 6 xonali kod bilan live sessiyaga qo‘shiling. Savol, mark scheme va natija bir xil ritmda ochiladi.'}</p>
    </div>
    <button type="button" onClick={()=>navigate(destination)}>
      <PlayCircle size={20} weight="fill"/>{visibleActive?'Sessiyaga kirish':'Kodni kiritish'}
    </button>
  </section>;
}
