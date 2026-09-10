import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type QuestionInsight={
  roundId:string;roundNumber:number;questionId:string;questionRef:string;maxMarks:number;
  participantCount:number;answeredCount:number;classScore:number;averagePercentage:number;
};
type LearningObjectiveInsight={
  id:string;code:string;text:string;subtopicCode:string;subtopicTitle:string;topicNumber:number;topicTitle:string;
  questionCount:number;evidenceCount:number;marksEarned:number;marksPossible:number;percentage:number;
};
type MissedMarkPoint={
  id:string;code:string;text:string;marks:number;questionRef:string;missed:number;total:number;missPercentage:number;
};
type AnalyticsSummary={
  challengeId:string;status:string;stateVersion:number;releasedRounds:number;classAveragePercentage:number;
  questions:QuestionInsight[];learningObjectives:LearningObjectiveInsight[];
  strongestLearningObjectives:LearningObjectiveInsight[];weakestLearningObjectives:LearningObjectiveInsight[];
  missedMarkPoints:MissedMarkPoint[];
};

export function LiveChallengeAnalyticsPanel({challengeId,stateVersion}:{challengeId:string;stateVersion:number}){
  const[data,setData]=useState<AnalyticsSummary|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');

  useEffect(()=>{
    let cancelled=false;
    setLoading(true);setError('');
    api<{data:AnalyticsSummary}>(`/live-challenges/${challengeId}/analytics`)
      .then(response=>{if(!cancelled)setData(response.data)})
      .catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:'Analytics yuklanmadi.')})
      .finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[challengeId,stateVersion]);

  if(loading)return <section className="live-analytics-panel"><p className="live-empty">Challenge analytics hisoblanmoqda…</p></section>;
  if(error)return <section className="live-analytics-panel"><p className="live-analytics-error">{error}</p></section>;
  if(!data)return null;

  return <section className="live-analytics-panel" aria-label="Live Challenge analytics">
    <header>
      <div><span className="live-eyebrow">LEARNING ANALYTICS</span><h3>Class learning evidence</h3></div>
      <div className="live-analytics-kpis"><strong>{data.classAveragePercentage}%<small>class average</small></strong><strong>{data.releasedRounds}<small>released rounds</small></strong></div>
    </header>

    <div className="live-analytics-questions">
      <h4>Question performance</h4>
      {data.questions.length?data.questions.map(item=><article key={item.roundId}>
        <div><strong>R{item.roundNumber} · {item.questionRef}</strong><small>{item.answeredCount}/{item.participantCount} answered · {item.maxMarks} marks</small></div>
        <b>{item.averagePercentage}%</b>
      </article>):<p className="live-empty">Released question evidence yo‘q.</p>}
    </div>

    <div className="live-analytics-lo-grid">
      <InsightList title="Strongest learning objectives" items={data.strongestLearningObjectives}/>
      <InsightList title="Review first" items={data.weakestLearningObjectives}/>
    </div>

    <div className="live-analytics-markpoints">
      <h4>Commonly missed mark points</h4>
      {data.missedMarkPoints.length?data.missedMarkPoints.map(item=><article key={`${item.questionRef}-${item.id}`}>
        <div><strong>{item.code} · {item.questionRef}</strong><p>{item.text}</p><small>{item.missed} of {item.total} peer-marked answers missed this point</small></div>
        <b>{item.missPercentage}% missed</b>
      </article>):<p className="live-empty">Structured peer-mark evidence yetarli emas yoki mark-point data mavjud emas.</p>}
    </div>
  </section>;
}

function InsightList({title,items}:{title:string;items:LearningObjectiveInsight[]}){
  return <section><h4>{title}</h4>{items.length?items.map(item=><article key={item.id}>
    <div><strong>{item.code}</strong><small>{item.subtopicCode} · {item.subtopicTitle}</small><p>{item.text}</p></div>
    <b>{item.percentage}%</b>
  </article>):<p className="live-empty">Mapped LO evidence yo‘q.</p>}</section>;
}
