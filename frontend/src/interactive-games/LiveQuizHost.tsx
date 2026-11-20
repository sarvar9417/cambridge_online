import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { api, type ClassItem } from '../lib/api';
import type { GameScope } from './remote-games';
import type { LiveQuizHistoryItem, LiveQuizMode, LiveQuizReport, LiveQuizSnapshot } from './live-quiz-api';
import { LiveQuizReportView } from './LiveQuizReportView';
import './live-quiz.css';

export function countdownSeconds(snapshot:LiveQuizSnapshot|null,now:number,serverOffset=0){
  if(!snapshot||snapshot.status!=='active'||!snapshot.questionStartedAt)return 0;
  const deadline=new Date(snapshot.questionStartedAt).getTime()+snapshot.questionSeconds*1000;
  return Math.max(0,Math.ceil((deadline-now-serverOffset)/1000));
}

export function reviewCountdownSeconds(snapshot:LiveQuizSnapshot|null,now:number,serverOffset=0){
  if(!snapshot||snapshot.status!=='review'||!snapshot.reviewEndsAt)return 0;
  return Math.max(0,Math.ceil((new Date(snapshot.reviewEndsAt).getTime()-now-serverOffset)/1000));
}

export function LiveQuizHost({courseCode,scopes,onExit,onToggleFullscreen,isFullscreen}:{
  courseCode:'9618'|'0478';scopes:readonly GameScope[];onExit:()=>void;
  onToggleFullscreen:()=>void;isFullscreen:boolean;
}){
  const [count,setCount]=useState(15);
  const [seconds,setSeconds]=useState(20);
  const [gameMode,setGameMode]=useState<LiveQuizMode>('classic');
  const [durationSeconds,setDurationSeconds]=useState(420);
  const [treasureGoal,setTreasureGoal]=useState(10000);
  const [allowLateJoin,setAllowLateJoin]=useState(true);
  const [randomNames,setRandomNames]=useState(false);
  const [showCorrectness,setShowCorrectness]=useState(true);
  const [questionOrder,setQuestionOrder]=useState<'random'|'ordered'|'mastery'>('random');
  const [incorrectPenaltySeconds,setIncorrectPenaltySeconds]=useState(2);
  const [classes,setClasses]=useState<ClassItem[]>([]);
  const [classId,setClassId]=useState('');
  const [classesLoading,setClassesLoading]=useState(true);
  const [classesError,setClassesError]=useState(false);
  const [roomId,setRoomId]=useState<string|null>(null);
  const [snapshot,setSnapshot]=useState<LiveQuizSnapshot|null>(null);
  const [report,setReport]=useState<LiveQuizReport|null>(null);
  const [history,setHistory]=useState<LiveQuizHistoryItem[]>([]);
  const [copied,setCopied]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [clock,setClock]=useState(Date.now());
  const [serverOffset,setServerOffset]=useState(0);

  useEffect(()=>{
    let mounted=true;
    void api<{data:ClassItem[]}>('/classes').then(({data})=>{
      if(!mounted)return;
      setClasses(data);setClassesError(false);
      setClassId(current=>data.some(item=>item.id===current)?current:data.length===1?data[0]!.id:'');
    }).catch(()=>{if(mounted)setClassesError(true);})
      .finally(()=>{if(mounted)setClassesLoading(false);});
    return()=>{mounted=false;};
  },[]);
  useEffect(()=>{let active=true;
    void api<{data:LiveQuizHistoryItem[]}>('/live-quizzes').then(({data})=>{
      if(active)setHistory(data);
    }).catch(()=>{});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!roomId||snapshot?.status==='finished')return;
    let active=true,inFlight=false;
    const poll=async()=>{
      if(inFlight)return;inFlight=true;
      try{
        const {data}=await api<{data:LiveQuizSnapshot}>(`/live-quizzes/${roomId}`);
        if(active){setSnapshot(data);setServerOffset(new Date(data.serverNow).getTime()-Date.now());setError('');}
      }catch(cause){if(active)setError(cause instanceof Error?cause.message:'Could not update game.');}
      finally{inFlight=false;}
    };
    void poll();const interval=window.setInterval(()=>{void poll();},1600);
    return()=>{active=false;window.clearInterval(interval);};
  },[roomId,snapshot?.status==='finished']);
  useEffect(()=>{
    if(!roomId||snapshot?.status!=='finished')return;
    let active=true,loaded=false,inFlight=false;
    const load=async()=>{
      if(!active||loaded||inFlight)return;
      inFlight=true;
      try{
        const {data}=await api<{data:LiveQuizReport}>(`/live-quizzes/${roomId}/report`);
        if(active){loaded=true;setReport(data);setError('');}
      }catch(cause){if(active)setError(cause instanceof Error?cause.message:'Report could not be loaded.');}
      finally{inFlight=false;}
    };
    void load();
    const interval=window.setInterval(()=>{void load();},3000);
    return()=>{active=false;window.clearInterval(interval);};
  },[roomId,snapshot?.status]);
  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),250);return()=>window.clearInterval(timer);},[]);

  async function create(){
    setLoading(true);setError('');
    try{
      const {data}=await api<{data:{id:string;pin:string;questionCount:number}}>('/live-quizzes',{
        method:'POST',body:JSON.stringify({classId,courseCode,scopes,count,seconds,mode:gameMode,
          durationSeconds,treasureGoal,allowLateJoin,randomNames,showCorrectness,
          questionOrder,incorrectPenaltySeconds}),
      });
      setReport(null);setSnapshot(null);setCopied(false);setRoomId(data.id);
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to create game.');}
    finally{setLoading(false);}
  }
  async function command(action:'start'|'reveal'|'next'|'finish'){
    if(!roomId)return;
    if(action==='finish'&&!window.confirm('Finish this game early and publish results?'))return;
    setLoading(true);setError('');
    try{
      await api(`/live-quizzes/${roomId}/action`,{method:'POST',
        body:JSON.stringify({action,expectedQuestionIndex:snapshot?.questionIndex})});
      const {data}=await api<{data:LiveQuizSnapshot}>(`/live-quizzes/${roomId}`);
      setSnapshot(data);setServerOffset(new Date(data.serverNow).getTime()-Date.now());
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not advance the game.');}
    finally{setLoading(false);}
  }
  function reopen(item:LiveQuizHistoryItem){setRoomId(item.id);setReport(null);setSnapshot(null);setError('');setCopied(false);}

  const joinUrl=snapshot?`${window.location.origin}/#/play/${snapshot.pin}`:'';
  async function copyJoinLink(){
    try{
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);setError('');
    }catch{setError('Could not copy the join link. Use the displayed URL or scan the QR code.');}
  }
  const qr=useMemo(()=>{
    if(!joinUrl)return '';
    const code=qrcode(0,'M');code.addData(joinUrl);code.make();return code.createDataURL(5,2);
  },[joinUrl]);
  const timeLeft=countdownSeconds(snapshot,clock,serverOffset);
  const reviewLeft=reviewCountdownSeconds(snapshot,clock,serverOffset);
  const gameRemaining=snapshot?.endsAt?Math.max(0,Math.ceil((new Date(snapshot.endsAt).getTime()-clock-serverOffset)/1000)):0;
  const active=snapshot?.status==='active',review=snapshot?.status==='review';
  const finished=snapshot?.status==='finished';
  const question=snapshot?.question;
  return <section className="lq-host" aria-label="Cambridge Live Quiz host">
    <div className="lq-header">
      <div><span className="lq-eyebrow">CAMBRIDGE / LIVE QUIZ <span className="lq-course-tag">{courseCode}</span></span>
        <h2>Live Quiz Studio</h2><p>Choose a mode, bring your class together, and understand every answer.</p></div>
      <div className="lq-header-actions">
        <button type="button" className="lq-secondary" onClick={onToggleFullscreen}>{isFullscreen?'Exit full screen':'Full screen'}</button>
        <button type="button" className="lq-secondary" onClick={onExit}>Back to games</button>
      </div>
    </div>
    {error&&<p className="lq-error" role="alert">{error}</p>}
    {!roomId&&<>
      <div className="lq-setup">
        <h3>01 <span className="lq-heading-separator">/</span> Choose your game mode</h3>
        <p>{scopes.length} selected curriculum scopes · {courseCode}. Questions use the approved, source-verified glossary bank.</p>
        <div className="lq-mode-grid" role="group" aria-label="Choose live quiz game mode">
          <button type="button" className={'lq-mode-card'+(gameMode==='classic'?' is-selected':'')}
            aria-pressed={gameMode==='classic'} onClick={()=>{setGameMode('classic');
              if(questionOrder==='mastery')setQuestionOrder('random');}}>
            <span className="lq-mode-icon" aria-hidden="true">01</span><strong>Classic Challenge</strong>
            <small>All players answer the same question at the same time. Speed + accuracy decide the winner.</small>
            <b>Synced · Auto-advance after results</b>
          </button>
          <button type="button" className={'lq-mode-card'+(gameMode==='treasure'?' is-selected':'')}
            aria-pressed={gameMode==='treasure'} onClick={()=>setGameMode('treasure')}>
            <span className="lq-mode-icon" aria-hidden="true">02</span><strong>Treasure Quest</strong>
            <small>Players answer independently, choose mystery chests, grow gold, steal or swap to climb the board.</small>
            <b>Self-paced · Luck + knowledge</b>
          </button>
        </div>
        <h3>02 <span className="lq-heading-separator">/</span> Your classroom</h3>
        <div className="lq-setup-controls">
          <label>Class whose students will see the join link automatically
            <select aria-label="Live Quiz classroom" value={classId}
              disabled={classesLoading||!classes.length} onChange={event=>setClassId(event.target.value)}>
              <option value="">Select a class…</option>
              {classes.map(item=><option key={item.id} value={item.id}>
                {item.name} · {item.studentCount} students</option>)}
            </select>
          </label>
        </div>
        {classesLoading?<p className="lq-small" role="status">Loading your classes…</p>:
          classesError?<p className="lq-error" role="alert">Could not load your classes. Reopen Live Quiz to retry.</p>:
          !classes.length?<p className="lq-error" role="status">No assigned classes. Ask your school admin to assign a class first.</p>:
          <p className="lq-small">A join button will appear on enrolled students’ Home and Interactive Games pages, usually within 10 seconds. You can still share the PIN or QR code.</p>}
        <h3>03 <span className="lq-heading-separator">/</span> Game settings</h3>
        <div className="lq-setup-controls">
          <label>{gameMode==='classic'?'Questions':'Question bank'} <select aria-label="Live quiz question count" value={count}
            onChange={e=>setCount(Number(e.target.value))}>
            {[10,15,20,30].map(n=><option key={n} value={n}>{n} questions</option>)}
          </select></label>
          {gameMode==='classic'&&<label>Seconds per question <select aria-label="Live quiz seconds per question" value={seconds}
            onChange={e=>setSeconds(Number(e.target.value))}>
            {[10,15,20,30].map(n=><option key={n} value={n}>{n} seconds</option>)}
          </select></label>}
          {gameMode==='treasure'&&<>
            <label>Game duration <select aria-label="Treasure game duration" value={durationSeconds}
              onChange={e=>setDurationSeconds(Number(e.target.value))}>
              {[180,300,420,600,900].map(n=><option key={n} value={n}>{n/60} minutes</option>)}
            </select></label>
            <label>Gold goal <select aria-label="Treasure gold goal" value={treasureGoal}
              onChange={e=>setTreasureGoal(Number(e.target.value))}>
              {[5000,10000,25000,50000].map(n=><option key={n} value={n}>{n.toLocaleString('en')} gold</option>)}
            </select></label>
            <label>Wrong-answer cooldown <select aria-label="Wrong-answer cooldown"
              value={incorrectPenaltySeconds} onChange={e=>setIncorrectPenaltySeconds(Number(e.target.value))}>
              {[0,2,5,10].map(n=><option key={n} value={n}>{n===0?'No penalty':n+' seconds'}</option>)}
            </select></label>
          </>}
          <label>Question order <select aria-label="Live quiz question ordering" value={questionOrder}
            onChange={e=>setQuestionOrder(e.target.value as 'random'|'ordered'|'mastery')}>
            <option value="random">Random</option><option value="ordered">Ordered by topic</option>
            {gameMode==='treasure'&&<option value="mastery">Mastery · revisit missed questions</option>}
          </select></label>
        </div>
        <div className="lq-host-options">
          <label><input type="checkbox" checked={allowLateJoin} onChange={e=>setAllowLateJoin(e.target.checked)}/> Allow late joining</label>
          <label><input type="checkbox" checked={randomNames} onChange={e=>setRandomNames(e.target.checked)}/> Use random player names</label>
          {gameMode==='treasure'&&<label><input type="checkbox" checked={showCorrectness} onChange={e=>setShowCorrectness(e.target.checked)}/> Reveal correct answer after a wrong answer</label>}
        </div>
        <button type="button" className="lq-primary" onClick={()=>{void create();}} disabled={loading||!scopes.length||!classId}>
          {loading?'Creating…':'Host Now →'}</button>
        <p className="lq-small">If a narrow topic contains fewer verified questions, the game uses every eligible question (minimum four).</p>
      </div>
      {!!history.length&&<div className="lq-history"><h3>My recent Live Quizzes</h3>
        {history.map(item=><button key={item.id} type="button" onClick={()=>reopen(item)}>
          <b>PIN {item.pin}</b><span>{item.mode==='treasure'?'🏴‍☠️ Treasure Quest':'⚡ Classic'} · {item.courseCode} · {item.questionCount} questions · {item.playerCount} students</span>
          <small>{item.status==='finished'?'View final reports':'Resume game'} · {new Date(item.createdAt).toLocaleDateString('en-GB')}</small>
        </button>)}
      </div>}
    </>}
    {roomId&&!snapshot&&<p className="lq-loading" role="status">Loading the live room…</p>}
    {snapshot&&!finished&&<>
      <div className={'lq-join-banner'+(snapshot.status==='waiting'?'':' is-compact')}>
        <div><span>JOIN THE CLASSROOM · GAME PIN</span><strong className="lq-pin">{snapshot.pin}</strong>
          <p>Join at <a href={joinUrl} target="_blank" rel="noopener noreferrer">{joinUrl}</a></p>
          <button type="button" className="lq-secondary" onClick={()=>{void copyJoinLink();}}>
            {copied?'Copied!':'Copy join link'}</button>
        </div>
        {qr&&<img className="lq-qr" src={qr} alt={`QR code to join game ${snapshot.pin}`} />}
        <div className="lq-lobby-count"><strong>{snapshot.players.length}</strong><span>players joined</span></div>
      </div>
      {snapshot.status==='waiting'&&<div className="lq-waiting">
        <h3>Waiting for players · {snapshot.mode==='treasure'?'🏴‍☠️ Treasure Quest':'⚡ Classic Challenge'}</h3>
        <p>The names below appear automatically as students join.</p>
        <div className="lq-player-bubbles">{snapshot.players.map(player=><span key={player.id}>{player.avatar} {player.nickname}</span>)}</div>
        <button type="button" className="lq-primary" disabled={loading||!snapshot.players.length}
          onClick={()=>{void command('start');}}>Start Game · {snapshot.players.length} players</button>
      </div>}
      {snapshot.mode==='treasure'&&active&&<div className="lq-question-stage lq-treasure-projector">
        <span className="lq-eyebrow">TREASURE QUEST · LIVE</span>
        <h3>🏴‍☠️ The treasure hunt is on!</h3>
        <div className="lq-treasure-metrics">
          <div><b>{Math.floor(gameRemaining/60)}:{String(gameRemaining%60).padStart(2,'0')}</b><span>Time remaining</span></div>
          <div><b>{snapshot.treasureGoal?.toLocaleString('en')}</b><span>Gold goal</span></div>
          <div><b>{snapshot.answeredCount}</b><span>Questions answered</span></div>
        </div>
        <div className="lq-leaderboard"><h3>Live Gold Leaderboard</h3>
          {snapshot.players.slice(0,10).map((player,index)=><div key={player.id}>
            <span>{['🥇','🥈','🥉'][index]??(index+1)+'.'} {player.avatar} {player.nickname}</span>
            <strong>🪙 {player.score.toLocaleString('en')}</strong></div>)}
          {snapshot.players.length>10&&<p className="lq-small">Top 10 of {snapshot.players.length} players · Full results after the game.</p>}
        </div>
        <button type="button" className="lq-secondary" disabled={loading} onClick={()=>{void command('finish');}}>End game & show reports</button>
      </div>}
      {(active||review)&&question&&<div className={'lq-question-stage'+(review?' is-review':'')}>
        <div className="lq-question-meta"><b>Question {question.index+1} / {snapshot.questionCount}</b>
          <span role="timer" aria-label={active?'Time remaining':'Next question countdown'}
            className={active&&timeLeft<=5?'lq-countdown is-urgent':'lq-countdown'}>
            {active?`◷ ${timeLeft}s`:`✓ Results · next in ${reviewLeft}s`}</span>
          <b>{snapshot.answeredCount} / {snapshot.players.length} answered</b></div>
        <div className="lq-progress-track" role="progressbar" aria-label="Question progress"
          aria-valuenow={question.index+1} aria-valuemin={0} aria-valuemax={snapshot.questionCount}>
          <span style={{width:`${(question.index+1)/Math.max(1,snapshot.questionCount)*100}%`}}/></div>
        <p className="lq-question-prompt">{question.prompt}</p>
        <p className="lq-source">{question.sourceContext}</p>
        {(!review||!snapshot.answerCounts)&&<div className="lq-options">{question.options.map((option,index)=><div key={index}
          className={'lq-option lq-option-'+index+(review&&index===question.correctIndex?' is-answer':'')}>
          <span>{['▲','◆','●','■'][index]}</span><b>{option}</b>
          {review&&index===question.correctIndex&&<small className="lq-option-label">Correct answer</small>}</div>)}</div>}
        {review&&snapshot.answerCounts&&<section className="lq-answer-distribution" aria-label="Class answer distribution">
          <h4>How the class answered</h4>
          {question.options.map((option,index)=>{
            const total=snapshot.answerCounts?.[index]??0;
            const percent=snapshot.answeredCount?Math.round(total/snapshot.answeredCount*100):0;
            return <div key={index} className={index===question.correctIndex?'is-correct':''}>
              <span>{['▲','◆','●','■'][index]} {option}
                {index===question.correctIndex&&<small className="lq-distribution-correct">✓ Correct</small>}</span>
              <progress value={total} max={Math.max(1,snapshot.answeredCount)} aria-label={`${option}: ${total} answers`}/>
              <b>{total} · {percent}%</b>
            </div>;
          })}
        </section>}
        {active?<div className="lq-stage-actions">
          <button type="button" className="lq-primary" disabled={loading}
            onClick={()=>{void command('reveal');}}>Reveal correct answer</button>
          <button type="button" className="lq-secondary" disabled={loading}
            onClick={()=>{void command('finish');}}>Finish early</button>
        </div>:<div className="lq-stage-actions">
          <p className="lq-explanation">Correct answer: {question.options[question.correctIndex!]}. {question.explanation}</p>
          <button type="button" className="lq-primary" disabled={loading}
            onClick={()=>{void command('next');}}>{question.index+1===snapshot.questionCount?'Show final report now':'Next now'} · auto in {reviewLeft}s</button>
        </div>}
      </div>}
      {review&&<div className="lq-leaderboard"><h3>Leaderboard</h3>
        {snapshot.players.slice(0,10).map((player,index)=><div key={player.id}>
          <span>{index+1}. {player.avatar} {player.nickname}</span><strong>{player.score} points</strong></div>)}
        {snapshot.players.length>10&&<p className="lq-small">Top 10 of {snapshot.players.length} players · Full results after the game.</p>}
      </div>}
    </>}
    {finished&&(report?<LiveQuizReportView report={report} teacher/>:<p role="status">Preparing detailed student reports…</p>)}
    {finished&&<button type="button" className="lq-secondary" onClick={()=>{setRoomId(null);setSnapshot(null);setReport(null);
      void api<{data:LiveQuizHistoryItem[]}>('/live-quizzes').then(({data})=>setHistory(data));}}>
      Host another quiz</button>}
  </section>;
}
