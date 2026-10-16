import { useEffect, useState } from 'react';
import { ChartBar, Medal, Trophy } from '@phosphor-icons/react';
import { api } from '../lib/api';
import './live-exam-leaderboard.css';

type Standing = {
  rank:number;
  studentId?:string;
  studentName:string;
  score:number;
  possible:number;
};

type GroupStanding = {
  rank:number;groupNo:number;label:string;score:number;possible:number;totalScore:number;memberCount:number;
};

type RoundSummary = {
  sessionId:string;
  questionPosition:number;
  marksFirst:true;
  leaderboardMode:'marks'|'marks_speed_tiebreak';
  competition:{mode:'individual'|'teams'|'houses';roundStandings:GroupStanding[];overallStandings:GroupStanding[]};
  round:{
    possible:number;
    average:number;
    distribution:Array<{score:number;count:number}>;
    standings:Standing[];
  };
  overall:{
    possible:number;
    standings:Standing[];
  };
};

function scoreText(score:number,possible:number) {
  return `${Number.isInteger(score)?score:score.toFixed(1)} / ${possible}`;
}

function GroupStandingList({items,emptyText}:{items:GroupStanding[];emptyText:string}) {
  if(!items.length)return <p className="live-leaderboard-empty">{emptyText}</p>;
  return <ol className="live-leaderboard-list live-group-leaderboard-list">
    {items.map((item)=><li key={item.groupNo}>
      <span className={`live-leaderboard-rank live-leaderboard-rank--${Math.min(item.rank,4)}`}>{item.rank<=3?<Medal weight="fill"/>:item.rank}</span>
      <strong>{item.label}<small>{item.memberCount} a’zo</small></strong>
      <b>{scoreText(item.score,item.possible)}<small>avg · jami {Number.isInteger(item.totalScore)?item.totalScore:item.totalScore.toFixed(1)}</small></b>
    </li>)}
  </ol>;
}

function StandingList({items,emptyText}:{items:Standing[];emptyText:string}) {
  if(!items.length)return <p className="live-leaderboard-empty">{emptyText}</p>;
  return <ol className="live-leaderboard-list">
    {items.map((item)=><li key={`${item.rank}-${item.studentName}`}>
      <span className={`live-leaderboard-rank live-leaderboard-rank--${Math.min(item.rank,4)}`}>{item.rank<=3?<Medal weight="fill"/>:item.rank}</span>
      <strong>{item.studentName}</strong>
      <b>{scoreText(item.score,item.possible)}</b>
    </li>)}
  </ol>;
}

export function LiveExamLeaderboard({sessionId,version,variant='teacher'}:{sessionId:string;version:number;variant?:'teacher'|'projector'}) {
  const [summary,setSummary]=useState<RoundSummary|null>(null);
  const [error,setError]=useState('');

  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      try{
        const result=await api<RoundSummary>(`/live-exams/${sessionId}/round-summary${variant==='projector'?'?projector=true':''}`);
        if(!cancelled){setSummary(result);setError('')}
      }catch(cause){
        if(!cancelled)setError(cause instanceof Error?cause.message:'Natijalar yuklanmadi.');
      }
    };
    void load();
    const timer=window.setInterval(()=>void load(),3000);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[sessionId,version]);

  if(error&&!summary)return <p className="live-leaderboard-error" role="alert">{error}</p>;
  if(!summary)return <p className="live-leaderboard-loading">Reyting hisoblanmoqda…</p>;

  const grouped=summary.competition.mode!=='individual';
  const roundTop=summary.round.standings.slice(0,variant==='projector'?6:8);
  const overallTop=summary.overall.standings.slice(0,variant==='projector'?6:8);
  const groupRoundTop=summary.competition.roundStandings.slice(0,8);
  const groupOverallTop=summary.competition.overallStandings.slice(0,8);
  const maxCount=Math.max(1,...summary.round.distribution.map((item)=>item.count));

  return <section className={`live-leaderboard live-leaderboard--${variant}`}>
    <header>
      <div><span>MARKS-FIRST{grouped?` · ${summary.competition.mode==='houses'?'HOUSES':'TEAMS'}`:''}</span><h2><Trophy weight="fill"/> Live Challenge reytingi</h2></div>
      <p>{grouped?'Guruh reytingi a’zolarning o‘rtacha Cambridge ballari bilan hisoblanadi; individual academic natijalar o‘zgarmaydi.':summary.leaderboardMode==='marks_speed_tiebreak'?'Cambridge ballari asosiy; faqat teng ballarda topshirish vaqti ishlatiladi.':'Tezlik emas, Cambridge ballari tartibni belgilaydi.'}</p>
    </header>
    <div className="live-leaderboard-grid">
      <article>
        <div className="live-leaderboard-section-head"><div><span>SAVOL {summary.questionPosition+1}</span><h3>Joriy savol</h3></div><strong>O‘rtacha {summary.round.average.toFixed(1)} / {summary.round.possible}</strong></div>
        {grouped?<GroupStandingList items={groupRoundTop} emptyText="Hali guruh natijasi yo‘q."/>:<StandingList items={roundTop} emptyText="Hali natija yo‘q."/>}
      </article>
      <article>
        <div className="live-leaderboard-section-head"><div><span>UMUMIY</span><h3>Jami natija</h3></div><strong>{summary.overall.possible} ballgacha</strong></div>
        {grouped?<GroupStandingList items={groupOverallTop} emptyText="Hali umumiy guruh natijasi yo‘q."/>:<StandingList items={overallTop} emptyText="Hali umumiy natija yo‘q."/>}
      </article>
    </div>
    <div className="live-score-distribution">
      <div><ChartBar/><strong>Ball taqsimoti</strong></div>
      <div className="live-score-bars">{summary.round.distribution.map((item)=><div key={item.score}>
        <span>{Number.isInteger(item.score)?item.score:item.score.toFixed(1)} ball</span>
        <i><b style={{width:`${Math.max(8,(item.count/maxCount)*100)}%`}}/></i>
        <em>{item.count}</em>
      </div>)}</div>
    </div>
  </section>;
}
