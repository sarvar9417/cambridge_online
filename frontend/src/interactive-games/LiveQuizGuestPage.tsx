import { useEffect, useState, type FormEvent } from 'react';
import { forgetQuizGuest, LIVE_QUIZ_AVATARS, quizGuestRequest, readQuizGuest,
  saveQuizGuest, type LiveQuizReport, type LiveQuizSnapshot } from './live-quiz-api';
import { LiveQuizReportView } from './LiveQuizReportView';
import { countdownSeconds } from './LiveQuizHost';
import './live-quiz.css';

export function LiveQuizGuestPage({pin}:{pin:string}){
  const [name,setName]=useState('');
  const [avatar,setAvatar]=useState<(typeof LIVE_QUIZ_AVATARS)[number]>('🦊');
  const [guest,setGuest]=useState(()=>readQuizGuest(pin));
  const [snapshot,setSnapshot]=useState<LiveQuizSnapshot|null>(null);
  const [report,setReport]=useState<LiveQuizReport|null>(null);
  const [clock,setClock]=useState(Date.now());
  const [serverOffset,setServerOffset]=useState(0);
  const [sending,setSending]=useState(false);
  const [localAnswer,setLocalAnswer]=useState<number|null>(null);
  const [error,setError]=useState('');
  const [enteredPin,setEnteredPin]=useState('');

  useEffect(()=>{setGuest(readQuizGuest(pin));setSnapshot(null);setReport(null);setLocalAnswer(null);},[pin]);
  useEffect(()=>{
    if(!guest||snapshot?.status==='finished')return;
    let active=true,inFlight=false;
    const poll=async()=>{
      if(inFlight)return;inFlight=true;
      try{
        const data=await quizGuestRequest<LiveQuizSnapshot>(`/${guest.playerId}`,guest.token);
        if(active){
          setSnapshot(data);setServerOffset(new Date(data.serverNow).getTime()-Date.now());setError('');
        }
      }catch(cause){
        if(!active)return;
        const message=cause instanceof Error?cause.message:'Could not update game.';
        if(message.includes('sessiyasi topilmadi')||message.includes('not found')){
          forgetQuizGuest(pin);setGuest(null);setSnapshot(null);
        }
        setError(message);
      }finally{inFlight=false;}
    };
    void poll();const interval=window.setInterval(()=>{void poll();},1500);
    return()=>{active=false;window.clearInterval(interval);};
  },[guest?.playerId,guest?.token,pin,snapshot?.status==='finished']);
  useEffect(()=>{
    if(!guest||snapshot?.status!=='finished')return;
    let active=true;
    void quizGuestRequest<LiveQuizReport>(`/${guest.playerId}/report`,guest.token)
      .then(data=>{if(active)setReport(data);})
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Report unavailable.');});
    return()=>{active=false;};
  },[guest?.playerId,guest?.token,snapshot?.status]);
  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),250);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{setLocalAnswer(null);},[snapshot?.questionIndex]);

  async function join(event:FormEvent){
    event.preventDefault();setError('');setSending(true);
    try{
      const data=await quizGuestRequest<{playerId:string;token:string;pin:string;roomId:string}>(
        '/join',undefined,{pin,nickname:name.trim(),avatar});
      saveQuizGuest(data);setGuest(data);setSnapshot(null);
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not join.');}
    finally{setSending(false);}
  }
  async function answer(choiceIndex:number){
    if(!guest||!snapshot?.question||sending||localAnswer!==null||snapshot.ownAnswer)return;
    setSending(true);setError('');
    try{
      await quizGuestRequest(`/${guest.playerId}/answer`,guest.token,
        {questionIndex:snapshot.questionIndex,choiceIndex});
      setLocalAnswer(choiceIndex);
    }catch(cause){setError(cause instanceof Error?cause.message:'Answer could not be saved.');}
    finally{setSending(false);}
  }

  const timeLeft=countdownSeconds(snapshot,clock,serverOffset);
  const selected=snapshot?.ownAnswer?.choiceIndex??localAnswer;
  const question=snapshot?.question;
  return <main className="lq-guest" aria-label="Join Cambridge Live Quiz">
    <header className="lq-guest-header"><span>🎮 CAMBRIDGE LIVE QUIZ</span><h1>Play together. Learn together.</h1>
      <p>GAME PIN <strong>{pin}</strong></p></header>
    {error&&<p className="lq-error" role="alert">{error}</p>}
    {!/^\d{6}$/.test(pin)&&<form className="lq-guest-join" onSubmit={event=>{
      event.preventDefault();if(/^\d{6}$/.test(enteredPin))window.location.hash='/play/'+enteredPin;
    }}>
      <h2>Enter your Game PIN</h2>
      <label>Six-digit classroom code <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
        autoComplete="off" placeholder="e.g. 123456" value={enteredPin}
        onChange={event=>setEnteredPin(event.target.value.replace(/\D/g,'').slice(0,6))}/></label>
      <button type="submit" className="lq-primary" disabled={enteredPin.length!==6}>Continue</button>
    </form>}
    {/^\d{6}$/.test(pin)&&!guest&&<form className="lq-guest-join" onSubmit={e=>{void join(e);}}>
      <h2>Join the classroom</h2>
      <label>Your name <input required minLength={2} maxLength={24} autoComplete="nickname"
        placeholder="Enter your name" value={name} onChange={e=>setName(e.target.value)}/></label>
      <fieldset><legend>Choose your avatar</legend><div className="lq-avatar-list">
        {LIVE_QUIZ_AVATARS.map(icon=><button key={icon} type="button" aria-pressed={avatar===icon}
          onClick={()=>setAvatar(icon)} aria-label={'Avatar '+icon}>{icon}</button>)}
      </div></fieldset>
      <button type="submit" className="lq-primary" disabled={sending}>{sending?'Joining…':'Join Game'}</button>
    </form>}
    {guest&&!snapshot&&<p className="lq-loading" role="status">Connecting to the classroom…</p>}
    {snapshot&&<>
      <div className="lq-self-heading"><b>{snapshot.players.find(p=>p.id===snapshot.selfId)?.avatar} {snapshot.nickname}</b>
        <span>{snapshot.players.length} players connected</span></div>
      {snapshot.status==='waiting'&&<section className="lq-guest-waiting">
        <h2>You're in! 🎉</h2><p>Waiting for your teacher to start the game.</p>
        <div className="lq-player-bubbles">{snapshot.players.map(player=><span key={player.id}>
          {player.avatar} {player.nickname}</span>)}</div>
      </section>}
      {snapshot.status==='active'&&question&&<section className="lq-guest-question">
        <div className="lq-question-meta"><b>Question {question.index+1} / {snapshot.questionCount}</b>
          <span className={timeLeft<=5?'lq-countdown is-urgent':'lq-countdown'}>◷ {timeLeft}s</span></div>
        <h2>{question.prompt}</h2><small className="lq-source">{question.sourceContext}</small>
        <div className="lq-options">{question.options.map((option,index)=><button key={index} type="button"
          className={'lq-option lq-option-'+index+(selected===index?' is-selected':'')}
          disabled={selected!==null||timeLeft<=0||sending} onClick={()=>{void answer(index);}}>
          <span>{['▲','◆','●','■'][index]}</span><b>{option}</b></button>)}</div>
        {selected!==null?<p className="lq-sent" role="status">✓ Answer locked. Wait for the teacher to reveal the result.</p>
          :timeLeft===0?<p className="lq-sent" role="status">Time is up. Wait for the result.</p>
          :<p className="lq-help">Select ONE answer. Your first choice is final.</p>}
      </section>}
      {snapshot.status==='review'&&question&&<section className="lq-reveal">
        <span className="lq-eyebrow">QUESTION {question.index+1} RESULT</span>
        <h2>{snapshot.ownAnswer?.correct?'✅ Correct answer!':selected===null?'⏳ No answer submitted':'❌ Review your answer'}</h2>
        <p>{question.prompt}</p>
        <div className="lq-options">{question.options.map((option,index)=><div key={index}
          className={'lq-option lq-option-'+index+(index===question.correctIndex?' is-answer':'')+
            (index===selected&&index!==question.correctIndex?' is-wrong':'')}>
          <span>{['▲','◆','●','■'][index]}</span><b>{option}</b></div>)}</div>
        <p className="lq-explanation"><strong>Correct: {question.options[question.correctIndex!]}</strong><br/>{question.explanation}</p>
        <p>{snapshot.ownAnswer?.points??0} points this question</p>
        <div className="lq-leaderboard"><h3>Leaderboard</h3>
          {snapshot.players.slice(0,10).map((player,index)=><div key={player.id}>
            <span>{index+1}. {player.avatar} {player.nickname}</span><b>{player.score} pts</b></div>)}</div>
        <p className="lq-help">Waiting for the teacher to start the next question…</p>
      </section>}
      {snapshot.status==='finished'&&(report?<LiveQuizReportView report={report} teacher={false}/>
        :<p className="lq-loading" role="status">Calculating your detailed result…</p>)}
    </>}
  </main>;
}
