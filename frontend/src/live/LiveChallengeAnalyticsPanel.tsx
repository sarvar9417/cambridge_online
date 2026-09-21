import { useEffect, useState } from 'react';
import { ChartBar, CheckCircle, Target } from '@phosphor-icons/react';
import { api } from '../lib/api';
import './live-exam.css';

type Objective={
  learningObjectiveId:string;code:string;text:string;subtopicCode:string;subtopicTitle:string;
  marksEarned:number;marksPossible:number;attempts:number;mastery:number;
};
type Analytics={
  session:{id:string;title:string;className:string};
  strongest:Objective[];weakest:Objective[];objectives:Objective[];
  commonlyMissedMarkPoints:Array<{code:string;text:string;marks:number;reviewedCount:number;missedCount:number}>;
  evidence:{rows:number;answers:number;teacherOverriddenAnswers:number;marksOnly:true;speedIncluded:false};
  missedPointCoverage:'unmoderated_review_evidence';
};

function pct(value:number){return `${Math.round(value*100)}%`;}
function ObjectiveList({items,empty}:{items:Objective[];empty:string}){
  if(!items.length)return <p className="live-empty">{empty}</p>;
  return <div className="live-report-list">{items.map((item)=><article key={item.learningObjectiveId}>
    <span>{item.code}</span><strong>{item.text}</strong><b>{item.marksEarned} / {item.marksPossible} · {pct(item.mastery)}</b>
  </article>)}</div>;
}

export function LiveChallengeAnalyticsPanel({sessionId}:{sessionId:string}){
  const [data,setData]=useState<Analytics|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;
    api<{data:Analytics}>(`/live-exams/${sessionId}/analytics`)
      .then((result)=>{if(!cancelled){setData(result.data);setError('')}})
      .catch((cause)=>{if(!cancelled)setError(cause instanceof Error?cause.message:'Analytics yuklanmadi.')});
    return()=>{cancelled=true};
  },[sessionId]);

  if(error&&!data)return <p className="live-error" role="alert">{error}</p>;
  if(!data)return <p className="live-loading">Academic analytics hisoblanmoqda…</p>;

  return <section className="live-history">
    <header><h2><ChartBar/> Academic analytics</h2><span>{data.objectives.length} LO</span></header>
    <div className="live-topic-grid">
      <section><h3><CheckCircle/> Kuchli LO’lar</h3><ObjectiveList items={data.strongest} empty="Yetarli LO evidence yo‘q."/></section>
      <section><h3><Target/> Ko‘proq mashq kerak bo‘lgan LO’lar</h3><ObjectiveList items={data.weakest} empty="Yetarli LO evidence yo‘q."/></section>
    </div>
    <div className="live-score-distribution">
      <div><Target/><strong>Ko‘p o‘tkazib yuborilgan Mark Scheme pointlari</strong></div>
      {!data.commonlyMissedMarkPoints.length?<p className="live-empty">Ishonchli mark-point evidence yetarli emas.</p>:<div className="live-report-list">{data.commonlyMissedMarkPoints.map((point,index)=><article key={`${point.code}-${index}`}><span>{point.code||'MS'}</span><strong>{point.text}</strong><b>{point.missedCount}/{point.reviewedCount} missed</b></article>)}</div>}
      <small>Bu chastota faqat teacher override qilinmagan submitted review pointlardan hisoblanadi.</small>
    </div>
    <p className="live-wait-note">Mastery faqat Cambridge ballari asosida: {data.evidence.answers} ta answer evidence, speed va rank hisobga olinmaydi.</p>
  </section>;
}
