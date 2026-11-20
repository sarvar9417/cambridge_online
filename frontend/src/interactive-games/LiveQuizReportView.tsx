import { useState } from 'react';
import type { LiveQuizDetail, LiveQuizReport } from './live-quiz-api';

function downloadCsv(report:LiveQuizReport){
  const csvCell=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`;
  const rows=[['Name','Correct','Total','Answered','Score','Question','Result','Selected answer','Correct answer','Prompt']];
  for(const student of report.students){
    for(const detail of student.details){
      rows.push([student.nickname,String(student.correct),String(student.total),
        String(student.answered),String(student.score),String(detail.number),detail.status,
        detail.choiceIndex===null?'—':detail.options[detail.choiceIndex]??'',
        detail.options[detail.correctIndex]??'',detail.prompt]);
    }
  }
  const csv='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`cambridge-live-quiz-${report.pin}-report.csv`;a.click();
  URL.revokeObjectURL(url);
}

function Mistake({detail}:{detail:LiveQuizDetail}){
  return <li className={'lq-answer-detail lq-'+detail.status}>
    <div className="lq-detail-heading"><strong>Question {detail.number}</strong>
      <span>{detail.status==='correct'?'✓ Correct':detail.status==='wrong'?'✕ Wrong answer':'— No answer'}</span>
    </div>
    <p>{detail.prompt}</p>
    <p className="lq-source">{detail.sourceContext}</p>
    <p><b>Student answer: </b>{detail.choiceIndex===null?'Not answered':detail.options[detail.choiceIndex]}</p>
    <p><b>Correct answer: </b>{detail.options[detail.correctIndex]}</p>
    {!detail.correct&&<p className="lq-explanation">{detail.explanation}</p>}
    <small>{detail.points} points</small>
  </li>;
}

export function LiveQuizReportView({report,teacher}:{report:LiveQuizReport;teacher:boolean}){
  const [chosen,setChosen]=useState<string|null>(null);
  const [showAll,setShowAll]=useState(false);
  const selected=report.students.find(student=>student.id===chosen)??report.students[0];
  return <section className="lq-final" aria-label="Live quiz final results">
    <header className="lq-final-heading">
      <span className="lq-eyebrow">FINAL RESULTS · GAME {report.pin}</span>
      <h2>🏆 Quiz complete!</h2>
      <p>{report.totalQuestions} questions · {report.students.length} players · detailed first-attempt results</p>
      {teacher&&<button type="button" className="lq-secondary" onClick={()=>downloadCsv(report)}>Download detailed CSV report</button>}
    </header>
    {teacher&&<div className="lq-podium">
      {report.students.slice(0,3).map((student,index)=><div key={student.id} className="lq-podium-item">
        <span>{['🥇','🥈','🥉'][index]}</span><strong>{student.avatar} {student.nickname}</strong>
        <b>{student.score.toLocaleString('en')} points</b>
        <small>{student.correct} / {student.total} correct</small>
      </div>)}
    </div>}
    {teacher&&<div className="lq-roster" role="group" aria-label="Select student report">
      {report.students.map((student,index)=><button key={student.id} type="button"
        aria-pressed={selected?.id===student.id} onClick={()=>{setChosen(student.id);setShowAll(false);}}>
        <span>{index+1}. {student.avatar} {student.nickname}</span>
        <b>{student.correct}/{student.total}</b><small>{student.score} pts</small>
      </button>)}
    </div>}
    {selected&&<div className="lq-personal-report">
      <h3>{selected.avatar} {selected.nickname} — detailed report</h3>
      <div className="lq-result-numbers">
        <div><strong>{selected.correct} / {selected.total}</strong><span>Correct answers</span></div>
        <div><strong>{selected.answered} / {selected.total}</strong><span>Questions answered</span></div>
        <div><strong>{selected.total?Math.round(selected.correct/selected.total*100):0}%</strong><span>Accuracy</span></div>
        <div><strong>{selected.score}</strong><span>Points</span></div>
      </div>
      <h4>Incorrect and unanswered questions ({selected.details.filter(detail=>!detail.correct).length})</h4>
      {selected.details.every(detail=>detail.correct)
        ? <p className="lq-all-correct">Excellent! All questions were answered correctly.</p>
        : <ol className="lq-detail-list">{selected.details.filter(detail=>!detail.correct).map(detail=><Mistake key={detail.number} detail={detail}/>)}</ol>}
      <button type="button" className="lq-secondary" onClick={()=>setShowAll(value=>!value)}>
        {showAll?'Hide':'Show'} all {selected.total} questions and answers
      </button>
      {showAll&&<ol className="lq-detail-list">{selected.details.map(detail=><Mistake key={detail.number} detail={detail}/>)}</ol>}
    </div>}
  </section>;
}
