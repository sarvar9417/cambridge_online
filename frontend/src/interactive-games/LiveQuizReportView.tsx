import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { LiveQuizDetail, LiveQuizReport } from './live-quiz-api';

export function liveQuizCsv(report:LiveQuizReport){
  // A nickname is participant-controlled; don't allow spreadsheet formula injection.
  const csvCell=(value:unknown)=>{
    const raw=String(value??'');const safe=/^[\s]*[=+\-@]/.test(raw)?"'"+raw:raw;
    return `"${safe.replace(/"/g,'""')}"`;
  };
  const rows=[['Name','Correct','Total','Answered','Score','Question','Result','Selected answer',
    'Correct answer','Prompt','Response time ms','Source']];
  for(const student of report.students){
    if(student.details.length===0){
      // Keep students who joined but attempted nothing in the teacher export.
      rows.push([student.nickname,String(student.correct),String(student.total),
        String(student.answered),String(student.score),'','not attempted','','','','','']);
    }
    for(const detail of student.details){
      rows.push([student.nickname,String(student.correct),String(student.total),
        String(student.answered),String(student.score),String(detail.number),detail.status,
        detail.choiceIndex===null?'—':detail.options[detail.choiceIndex]??'',
        detail.options[detail.correctIndex]??'',detail.prompt,
        String(detail.elapsedMs??''),detail.sourceContext]);
    }
  }
  return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}

function downloadCsv(report:LiveQuizReport){
  const csv=liveQuizCsv(report);
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`cambridge-live-quiz-${report.pin}-report.csv`;a.click();
  URL.revokeObjectURL(url);
}

function Mistake({detail,treasure}:{detail:LiveQuizDetail;treasure:boolean}){
  return <li className={'lq-answer-detail lq-'+detail.status}>
    <div className="lq-detail-heading"><strong>Question {detail.number}</strong>
      <span>{detail.status==='correct'?'✓ Correct':detail.status==='wrong'?'✕ Wrong answer':'— No answer'}</span>
    </div>
    <p>{detail.prompt}</p>
    <p className="lq-source">{detail.sourceContext}</p>
    <p><b>Student answer: </b>{detail.choiceIndex===null?'Not answered':detail.options[detail.choiceIndex]}</p>
    <p><b>Correct answer: </b>{detail.options[detail.correctIndex]}</p>
    {!detail.correct&&<p className="lq-explanation">{detail.explanation}</p>}
    <small>{treasure?(detail.rewardType&&detail.rewardType!=='none'
      ?`Treasure reward: ${detail.rewardType.replaceAll('_',' ')}`:'No treasure reward')
      :`${detail.points} points`}</small>
  </li>;
}

export function LiveQuizReportView({report,teacher}:{report:LiveQuizReport;teacher:boolean}){
  const [chosen,setChosen]=useState<string|null>(null);
  const [showAll,setShowAll]=useState(false);
  const [tab,setTab]=useState<'students'|'questions'>('students');
  const [questionNo,setQuestionNo]=useState<number|null>(null);
  const selected=report.students.find(student=>student.id===chosen)??report.students[0];
  const question=report.questionSummary?.find(item=>item.number===questionNo);
  const questionDetail=question?report.students.flatMap(student=>student.details)
    .find(detail=>(detail.bankQuestionNo??detail.number)===question.number):undefined;
  const classAttempts=report.students.reduce((sum,student)=>sum+student.answered,0);
  const classCorrect=report.students.reduce((sum,student)=>sum+student.correct,0);
  return <><section className={'lq-final'+(teacher?' is-teacher':' is-student')} aria-label="Live quiz final results">
    <header className="lq-final-heading">
      <span className="lq-eyebrow">FINAL RESULTS · GAME {report.pin}</span>
      <h2>Quiz complete<span className="lq-finish-mark">.</span></h2>
      <p>{report.questionBankSize??report.totalQuestions} verified questions in the bank · {report.students.length} players
        {report.mode==='treasure'?' · self-paced Treasure Quest':' · synced Classic Challenge'}</p>
      {teacher&&<button type="button" className="lq-secondary" onClick={()=>downloadCsv(report)}>Download detailed CSV report</button>}
      {teacher&&!!report.answerKey?.length&&<button type="button" className="lq-secondary"
        onClick={()=>window.print()}>Print complete answer key</button>}
    </header>
    {!teacher&&selected&&<div className="lq-student-overview">
      <div><span className="lq-eyebrow">YOUR PERSONAL RESULT</span>
        <h3>{selected.avatar} {selected.nickname}</h3>
        <p><strong>{selected.correct} / {selected.total}</strong> correct answers</p>
        <span className="lq-overview-score">{selected.score.toLocaleString('en')} {report.mode==='treasure'?'gold':'points'}</span>
      </div>
      <div className="lq-score-ring" role="img"
        aria-label={`${selected.total?Math.round(selected.correct/selected.total*100):0}% accuracy`}
        style={{'--lq-accuracy':`${selected.total?Math.round(selected.correct/selected.total*100):0}%`} as CSSProperties}>
        <strong>{selected.total?Math.round(selected.correct/selected.total*100):0}%</strong><span>accuracy</span>
      </div>
    </div>}
    {teacher&&<div className="lq-class-summary">
      <div><b>{classCorrect} / {classAttempts}</b><span>Class correct / answered</span></div>
      <div><b>{classAttempts?Math.round(classCorrect/classAttempts*100):0}%</b><span>Class accuracy</span></div>
      <div><b>{report.students.length}</b><span>Participants</span></div>
      <div><b>{report.questionSummary?.length??report.totalQuestions}</b><span>Questions reviewed</span></div>
    </div>}
    {teacher&&<div className="lq-podium">
      {report.students.slice(0,3).map((student,index)=><div key={student.id} className="lq-podium-item">
        <span>{['🥇','🥈','🥉'][index]}</span><strong>{student.avatar} {student.nickname}</strong>
        <b>{student.score.toLocaleString('en')} {report.mode==='treasure'?'gold':'points'}</b>
        <small>{student.correct} / {student.total} correct</small>
      </div>)}
    </div>}
    {teacher&&<div className="lq-report-tabs" role="group" aria-label="Report view">
      <button type="button" aria-pressed={tab==='students'} onClick={()=>setTab('students')}>Student results</button>
      <button type="button" aria-pressed={tab==='questions'} onClick={()=>setTab('questions')}>Question breakdown</button>
    </div>}
    {teacher&&tab==='questions'&&<div className="lq-question-breakdown">
      <h3>Question-by-question performance</h3>
      <p>{report.mode==='treasure'
        ?'Counts are answer attempts, not unique students. Revisited questions may include the same student more than once.'
        :'Select a question to see exactly which students missed it.'}</p>
      <div className="lq-question-breakdown-list">{(report.questionSummary??[])
        .slice().sort((a,b)=>(b.wrong+b.skipped)/Math.max(1,b.total)-
          (a.wrong+a.skipped)/Math.max(1,a.total))
        .map(item=><button type="button" key={item.number} aria-pressed={questionNo===item.number}
          onClick={()=>setQuestionNo(item.number)}>
          <b>Q{item.number}</b><span>{item.prompt}</span>
          <strong>{item.correct}/{item.total} correct</strong>
          <small>{item.wrong} wrong · {item.skipped} skipped</small>
        </button>)}</div>
      {question&&<div className="lq-question-inspector">
        <h4>Question {question.number}: {question.prompt}</h4>
        <p className="lq-source">{question.sourceContext}</p>
        {questionDetail&&<p><strong>Correct answer: </strong>
          {questionDetail.options[questionDetail.correctIndex]}</p>}
        <p>✓ {question.correct} correct · ✕ {question.wrong} wrong · — {question.skipped} unanswered</p>
        {question.wrongStudents.length?<ul>{question.wrongStudents.map((student,index)=><li key={student.id+index}>
          <b>{student.nickname}</b>{student.attemptNumber!==undefined?` · Attempt ${student.attemptNumber}`:''}
          {' — '}{student.answer}</li>)}</ul>
          :<p>Everyone answered this correctly.</p>}
      </div>}
    </div>}
    {teacher&&tab==='students'&&<div className="lq-roster" role="group" aria-label="Select student report">
      {report.students.map((student,index)=><button key={student.id} type="button"
        aria-pressed={selected?.id===student.id} onClick={()=>{setChosen(student.id);setShowAll(false);}}>
        <span>{index+1}. {student.avatar} {student.nickname}</span>
        <b>{student.correct}/{student.total}</b><small>{student.score} {report.mode==='treasure'?'gold':'pts'}</small>
      </button>)}
    </div>}
    {selected&&(!teacher||tab==='students')&&<div className="lq-personal-report">
      <h3>{selected.avatar} {selected.nickname} — detailed report</h3>
      <div className="lq-result-numbers">
        <div><strong>{selected.correct} / {selected.total}</strong><span>Correct answers</span></div>
        <div><strong>{selected.answered} / {selected.total}</strong><span>Questions answered</span></div>
        <div><strong>{selected.total?Math.round(selected.correct/selected.total*100):0}%</strong><span>Accuracy</span></div>
        <div><strong>{selected.score.toLocaleString('en')}</strong><span>{report.mode==='treasure'?'Gold':'Points'}</span></div>
        {selected.averageResponseMs!==undefined&&<div><strong>{(selected.averageResponseMs/1000).toFixed(1)}s</strong><span>Average answer time</span></div>}
      </div>
      <h4>Incorrect and unanswered questions ({selected.details.filter(detail=>!detail.correct).length})</h4>
      {selected.details.length===0?<p className="lq-help">No questions attempted during this game.</p>
        :selected.details.every(detail=>detail.correct)
        ? <p className="lq-all-correct">Excellent! All questions were answered correctly.</p>
        : <ol className="lq-detail-list">{selected.details.filter(detail=>!detail.correct).map(detail=><Mistake key={detail.number} detail={detail} treasure={report.mode==='treasure'}/>)}</ol>}
      <button type="button" className="lq-secondary" onClick={()=>setShowAll(value=>!value)}>
        {showAll?'Hide':'Show'} all {selected.total} questions and answers
      </button>
      {showAll&&<ol className="lq-detail-list">{selected.details.map(detail=><Mistake key={detail.number} detail={detail} treasure={report.mode==='treasure'}/>)}</ol>}
    </div>}
  </section>
  {teacher&&!!report.answerKey?.length&&createPortal(
    <section className="lq-print-sheet" aria-label="Printable teacher answer key">
      <header><h1>Cambridge {report.courseCode} · Live Quiz Answer Key</h1>
        <p>Game PIN {report.pin} · {report.answerKey.length} questions · {report.mode==='treasure'?'Treasure Quest':'Classic Challenge'}</p>
        <p>Teacher copy · Correct answers are generated from the approved glossary entries used when this game was created.</p>
      </header>
      {report.answerKey.map(question=><article key={question.number}>
        <h2>Question {question.number} <small>{question.sourceContext}</small></h2>
        <p>{question.prompt}</p>
        <ol type="A">{question.options.map((option,index)=><li key={index}
          className={index===question.correctIndex?'lq-print-correct':''}>
          {option} {index===question.correctIndex&&<strong>✓ Correct</strong>}
        </li>)}</ol>
        <p className="lq-print-explanation">{question.explanation}</p>
      </article>)}
    </section>,document.body)}
  </>;
}
