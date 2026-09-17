import { useEffect, useState } from 'react';
import { Broadcast, Plus } from '@phosphor-icons/react';
import { api, type LiveExamStatus, type LiveExamSummary } from '../lib/api';
import { navigate } from '../lib/router';
import './live-exam.css';

const STATUS_LABEL:Record<LiveExamStatus,string>={
  draft:'Qoralama',published:'Nashr qilingan',lobby:'Kutilmoqda',question_open:'Savol ochiq',
  answers_locked:'Javoblar yopildi',marking:'Baholash',review:'Natijalar',paused:'Pauza',
  finished:'Yakunlangan',cancelled:'Bekor qilingan',
};

export function LiveChallengeStaffLanding(){
  const [sessions,setSessions]=useState<LiveExamSummary[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    let cancelled=false;
    api<{data:LiveExamSummary[]}>('/live-exams')
      .then((result)=>{if(!cancelled)setSessions(result.data)})
      .catch((cause)=>{if(!cancelled)setError(cause instanceof Error?cause.message:'Live Challenge sessiyalari yuklanmadi.')})
      .finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[]);

  const open=(session:LiveExamSummary)=>{
    if(session.status==='draft')navigate(`oqitish/live?builder=${session.id}`);
    else if(session.status==='finished')navigate(`oqitish/live?analytics=${session.id}`);
    else navigate(`oqitish/live?id=${session.id}`);
  };

  return <div className="live-page live-landing">
    <header className="live-page-head">
      <div><span className="live-eyebrow"><Broadcast size={18}/> CAMBRIDGE LIVE CHALLENGE</span><h1>Live Challenge</h1><p>Canonical Cambridge savollaridan challenge tuzing, publish qiling va sinfni bitta authoritative state machine orqali boshqaring.</p></div>
      <button className="live-start" type="button" onClick={()=>navigate('oqitish/live?builder=new')}><Plus/> Yangi challenge</button>
    </header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    <section className="live-history"><header><h2>Challenge’lar</h2><span>{sessions.length}</span></header>
      {loading?<p className="live-empty">Yuklanmoqda…</p>:!sessions.length?<div className="live-empty"><p>Hali challenge yo‘q.</p><button type="button" onClick={()=>navigate('oqitish/live?builder=new')}>Birinchi challenge’ni yaratish</button></div>:<div className="live-session-list">{sessions.map((session)=><button type="button" key={session.id} onClick={()=>open(session)}><span className={`live-state live-state--${session.status}`}>{STATUS_LABEL[session.status]}</span><strong>{session.title}</strong><small>{session.className} · {session.questionCount} savol · {session.participantCount} o‘quvchi</small><i>{session.status==='finished'?'Analytics →':'→'}</i></button>)}</div>}
    </section>
  </div>;
}
