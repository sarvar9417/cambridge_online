import { useEffect, useState, type FormEvent } from 'react';
import { forgetQuizGuest, LIVE_QUIZ_AVATARS, quizGuestRequest, readQuizGuest,
  saveQuizGuest, type LiveQuizLobby, type LiveQuizReport, type LiveQuizSnapshot,
  type LiveQuizQuestion, type TreasureAnswerResponse, type TreasureRewardResponse } from './live-quiz-api';
import { LiveQuizReportView } from './LiveQuizReportView';
import { countdownSeconds, reviewCountdownSeconds } from './LiveQuizHost';
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
  const [lobby,setLobby]=useState<LiveQuizLobby|null>(null);
  const [lobbyError,setLobbyError]=useState('');
  const [feedback,setFeedback]=useState<(TreasureAnswerResponse&{
    choiceIndex:number;answeredQuestion:LiveQuizQuestion})|null>(null);
  const [rewardReveal,setRewardReveal]=useState<TreasureRewardResponse|null>(null);
  const [soundOn,setSoundOn]=useState(false);
  function playTone(correct:boolean){
    if(!soundOn)return;
    try{
      const context=new AudioContext();
      const oscillator=context.createOscillator();const gain=context.createGain();
      oscillator.type='sine';oscillator.frequency.value=correct?740:270;
      oscillator.connect(gain);gain.connect(context.destination);
      gain.gain.setValueAtTime(.08,context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.19);
      oscillator.start();oscillator.stop(context.currentTime+.2);
      oscillator.onended=()=>{void context.close();};
    }catch{/* Browser sound unavailable; gameplay remains usable. */}
  }

  useEffect(()=>{
    if(!/^\d{6}$/.test(pin))return;
    let active=true;
    setLobby(null);setLobbyError('');
    void quizGuestRequest<LiveQuizLobby>(`/lobby/${pin}`).then(data=>{
      if(active){setLobby(data);setLobbyError('');}
    }).catch(cause=>{
      if(active){setLobby(null);setLobbyError(cause instanceof Error?cause.message:'Game code could not be verified.');}
    });
    return()=>{active=false;};
  },[pin]);

  useEffect(()=>{setGuest(readQuizGuest(pin));setSnapshot(null);setReport(null);
    setLocalAnswer(null);setFeedback(null);setRewardReveal(null);},[pin]);
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
    let active=true,loaded=false,inFlight=false;
    const load=async()=>{
      if(!active||loaded||inFlight)return;
      inFlight=true;
      try{
        const data=await quizGuestRequest<LiveQuizReport>(`/${guest.playerId}/report`,guest.token);
        if(active){loaded=true;setReport(data);setError('');}
      }catch(cause){if(active)setError(cause instanceof Error?cause.message:'Report unavailable.');}
      finally{inFlight=false;}
    };
    void load();
    const interval=window.setInterval(()=>{void load();},3000);
    return()=>{active=false;window.clearInterval(interval);};
  },[guest?.playerId,guest?.token,snapshot?.status]);
  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),250);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{setLocalAnswer(null);},[snapshot?.questionIndex]);

  async function join(event:FormEvent){
    event.preventDefault();setError('');setSending(true);
    try{
      const data=await quizGuestRequest<{playerId:string;token:string;pin:string;roomId:string}>(
        '/join',undefined,{pin,...(lobby?.randomNames?{}:{nickname:name.trim()}),avatar});
      saveQuizGuest(data);setGuest(data);setSnapshot(null);
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not join.');}
    finally{setSending(false);}
  }
  async function answer(choiceIndex:number){
    if(!guest||!snapshot?.question||sending||localAnswer!==null||snapshot.ownAnswer)return;
    setSending(true);setError('');
    try{
      const result=await quizGuestRequest<TreasureAnswerResponse>(`/${guest.playerId}/answer`,guest.token,
        {questionIndex:snapshot.questionIndex,choiceIndex});
      setLocalAnswer(choiceIndex);
      if(snapshot.mode==='treasure'){
        setFeedback({...result,choiceIndex,answeredQuestion:snapshot.question});setRewardReveal(null);
        playTone(result.correct);
        if(!result.correct)window.setTimeout(()=>setFeedback(current=>current?.turnIndex===result.turnIndex?null:current),2200);
      }
    }catch(cause){setError(cause instanceof Error?cause.message:'Answer could not be saved.');}
    finally{setSending(false);}
  }
  async function chooseChest(chestIndex:number){
    if(!guest||!snapshot?.pendingReward||sending)return;
    await claimReward({turnIndex:snapshot.pendingReward.turnIndex,chestIndex});
  }
  async function chooseTarget(targetId:string){
    if(!guest||!snapshot?.pendingReward||sending)return;
    await claimReward({turnIndex:snapshot.pendingReward.turnIndex,targetId});
  }
  async function claimReward(input:{turnIndex:number;chestIndex?:number;targetId?:string}){
    if(!guest)return;
    setSending(true);setError('');
    try{
      const result=await quizGuestRequest<TreasureRewardResponse>(`/${guest.playerId}/reward`,guest.token,input);
      setFeedback(null);
      if(result.needsTarget){
        const fresh=await quizGuestRequest<LiveQuizSnapshot>(`/${guest.playerId}`,guest.token);
        setSnapshot(fresh);
      }else{
        setRewardReveal(result);
        playTone(true);
        // The resolved turn is authoritative on the server. Refresh immediately
        // so an old poll cannot leave the already-claimed chest clickable.
        try{
          const fresh=await quizGuestRequest<LiveQuizSnapshot>(`/${guest.playerId}`,guest.token);
          setSnapshot(fresh);
        }catch{/* The periodic snapshot poll will recover this view. */}
        window.setTimeout(()=>setRewardReveal(current=>current===result?null:current),2200);
      }
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not open the chest.');}
    finally{setSending(false);}
  }

  const timeLeft=countdownSeconds(snapshot,clock,serverOffset);
  const reviewLeft=reviewCountdownSeconds(snapshot,clock,serverOffset);
  const selected=snapshot?.ownAnswer?.choiceIndex??localAnswer;
  const question=snapshot?.question;
  const isTreasure=snapshot?.mode==='treasure';
  const gameRemaining=snapshot?.endsAt?Math.max(0,Math.ceil((new Date(snapshot.endsAt).getTime()-clock-serverOffset)/1000)):0;
  const waitRemaining=snapshot?.blockedUntil?Math.max(0,Math.ceil((new Date(snapshot.blockedUntil).getTime()-clock-serverOffset)/1000)):0;
  // Treasure is self-paced: question.index is a turn counter and can exceed
  // the fixed bank size. Its progress bar represents remaining game time.
  const progressMax=Math.max(1,isTreasure?(snapshot?.durationSeconds??420):(snapshot?.questionCount??1));
  const progressValue=isTreasure?Math.min(progressMax,gameRemaining):
    Math.max(0,Math.min(progressMax,(question?.index??-1)+1));
  const pending=snapshot?.pendingReward;
  return <main className="lq-guest" aria-label="Join Cambridge Live Quiz">
    <header className="lq-guest-header"><span>CAMBRIDGE / LIVE QUIZ</span>
      <h1>{(snapshot?.mode??lobby?.mode)==='treasure'?'Your treasure hunt starts here.':'Think fast. Learn together.'}</h1>
      <p>GAME PIN <strong>{pin}</strong>
        {/^[0-9]{6}$/.test(pin)&&<a className="lq-change-pin" href="#/play">Change code</a>}</p></header>
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
      {lobbyError&&<p className="lq-error" role="alert">{lobbyError}</p>}
      {lobby&&<p className="lq-help">{lobby.mode==='treasure'?'Treasure Quest · self-paced questions and mystery chests':'Classic Challenge · live timed questions'} · {lobby.playerCount} players waiting/playing</p>}
      {!lobby?.randomNames&&<label>Your name <input required minLength={2} maxLength={24} autoComplete="nickname"
        placeholder="Enter your name" value={name} onChange={e=>setName(e.target.value)}/></label>
      }
      {lobby?.randomNames&&<p className="lq-help">Your teacher enabled random names. The game will assign yours automatically.</p>}
      <fieldset><legend>Choose your avatar</legend><div className="lq-avatar-list">
        {LIVE_QUIZ_AVATARS.map(icon=><button key={icon} type="button" aria-pressed={avatar===icon}
          onClick={()=>setAvatar(icon)} aria-label={'Avatar '+icon}>{icon}</button>)}
      </div></fieldset>
      <button type="submit" className="lq-primary" disabled={sending}>{sending?'Joining…':'Join Game'}</button>
    </form>}
    {guest&&!snapshot&&<p className="lq-loading" role="status">Connecting to the classroom…</p>}
    {snapshot&&<>
      <div className="lq-self-heading"><b>{snapshot.players.find(p=>p.id===snapshot.selfId)?.avatar} {snapshot.nickname}</b>
        <span>{snapshot.players.length} players connected</span>
        <button type="button" className="lq-sound-button" aria-pressed={soundOn}
          onClick={()=>setSoundOn(value=>!value)}>{soundOn?'🔊 Sound on':'🔇 Sound off'}</button></div>
      {snapshot.status==='waiting'&&<section className="lq-guest-waiting">
        <h2>You're in! 🎉</h2><p>Waiting for your teacher to start the game.</p>
        <div className="lq-player-bubbles">{snapshot.players.map(player=><span key={player.id}>
          {player.avatar} {player.nickname}</span>)}</div>
      </section>}
      {isTreasure&&snapshot.status==='active'&&<div className="lq-treasure-status">
        <strong>🪙 {(snapshot.ownScore??0).toLocaleString('en')} gold</strong>
        <span>✅ {snapshot.ownCorrect??0} correct</span>
        <span>⏱ {Math.floor(gameRemaining/60)}:{String(gameRemaining%60).padStart(2,'0')} left</span>
        <span>🎯 {(snapshot.treasureGoal??0).toLocaleString('en')} goal</span>
      </div>}
      {isTreasure&&snapshot.status==='active'&&pending&&!rewardReveal&&<section className="lq-chest-stage">
        {pending.type===null?<>
          <h2>🎉 Great answer! Choose a treasure chest</h2>
          <p>One hidden reward. You could gain gold, double it, take from someone, swap, or meet the dragon!</p>
          <div className="lq-chest-grid">{[0,1,2].map(index=><button key={index} type="button" disabled={sending}
            onClick={()=>{void chooseChest(index);}} aria-label={`Choose treasure chest ${index+1}`}>
            <span>🧰</span><b>Chest {index+1}</b></button>)}</div>
        </>:<>
          <h2>{pending.type==='swap'?'🔄 Swap your gold!':'🪙 Take gold from another player!'}</h2>
          <p>Choose who to {pending.type==='swap'?'swap balances with':`take ${pending.percent}% gold from`}.</p>
          <div className="lq-target-grid">{pending.targets.map(target=><button key={target.id}
            type="button" disabled={sending} onClick={()=>{void chooseTarget(target.id);}}>
            {target.avatar} {target.nickname} <b>{target.score.toLocaleString('en')} 🪙</b></button>)}</div>
        </>}
      </section>}
      {isTreasure&&snapshot.status==='active'&&rewardReveal&&<section className="lq-treasure-reward" role="status">
        <span>✨</span><h2>{rewardReveal.rewardType?.replaceAll('_',' ').toUpperCase()}!</h2>
        <p>{(rewardReveal.delta??0)>=0?'+':''}{rewardReveal.delta} gold</p>
        <strong>Total: {rewardReveal.newScore?.toLocaleString('en')} 🪙</strong>
      </section>}
      {isTreasure&&snapshot.status==='active'&&feedback&&!feedback.correct&&<section className="lq-guest-question lq-wrong-feedback" role="status">
        <h2>❌ Not quite! Keep going.</h2>
        {feedback.correctIndex!==undefined&&<p>Correct answer: {feedback.answeredQuestion.options[feedback.correctIndex]}</p>}
        <p>Next question is coming. Every correct answer gives a new chest!</p>
      </section>}
      {snapshot.status==='active'&&question&&!(isTreasure&&(pending||rewardReveal||feedback&&!feedback.correct))&&<section className="lq-guest-question">
        <div className="lq-question-meta"><b>{isTreasure?'Your question '+(question.index+1):`Question ${question.index+1} / ${snapshot.questionCount}`}</b>
          <span role="timer" aria-label="Time remaining"
            className={(isTreasure?gameRemaining:timeLeft)<=5?'lq-countdown is-urgent':'lq-countdown'}>◷ {isTreasure?gameRemaining:timeLeft}s</span></div>
        <div className="lq-progress-track" role="progressbar"
          aria-label={isTreasure?'Game time remaining':'Question progress'}
          aria-valuenow={progressValue} aria-valuemin={0} aria-valuemax={progressMax}>
          <span style={{width:`${progressValue/progressMax*100}%`}}/></div>
        <h2>{question.prompt}</h2><small className="lq-source">{question.sourceContext}</small>
        <div className="lq-options">{question.options.map((option,index)=><button key={index} type="button"
          className={'lq-option lq-option-'+index+(selected===index?' is-selected':'')}
          disabled={selected!==null||(!isTreasure&&timeLeft<=0)||waitRemaining>0||sending} onClick={()=>{void answer(index);}}>
          <span>{['▲','◆','●','■'][index]}</span><b>{option}</b>
          {selected===index&&<small className="lq-option-label">Your answer</small>}</button>)}</div>
        {waitRemaining>0?<p className="lq-sent" role="status">⏳ {waitRemaining} second cooldown after an incorrect answer.</p>
          :selected!==null?<p className="lq-sent" role="status">{isTreasure?'✓ Answer saved. Your chest is loading…':'✓ Answer locked. Wait for the teacher to reveal the result.'}</p>
          :!isTreasure&&timeLeft===0?<p className="lq-sent" role="status">Time is up. Wait for the result.</p>
          :<p className="lq-help">Select ONE answer. Your first choice is final.</p>}
      </section>}
      {isTreasure&&snapshot.status==='active'&&<div className="lq-leaderboard lq-mini-board"><h3>🏆 Live gold standings</h3>
        {snapshot.players.slice(0,5).map((player,index)=><div key={player.id}>
          <span>{index+1}. {player.avatar} {player.nickname}</span><b>{player.score.toLocaleString('en')} 🪙</b></div>)}
      </div>}
      {snapshot.status==='review'&&question&&<section className="lq-reveal">
        <span className="lq-eyebrow">QUESTION {question.index+1} RESULT</span>
        <h2>{snapshot.ownAnswer?.correct?'✅ Correct answer!':selected===null?'⏳ No answer submitted':'❌ Review your answer'}</h2>
        <p>{question.prompt}</p>
        <div className="lq-options">{question.options.map((option,index)=><div key={index}
          className={'lq-option lq-option-'+index+(index===question.correctIndex?' is-answer':'')+
            (index===selected&&index!==question.correctIndex?' is-wrong':'')}>
          <span>{['▲','◆','●','■'][index]}</span><b>{option}</b>
          {index===question.correctIndex&&<small className="lq-option-label">Correct</small>}
          {index===selected&&index!==question.correctIndex&&<small className="lq-option-label">Your answer</small>}</div>)}</div>
        <p className="lq-explanation"><strong>Correct: {question.options[question.correctIndex!]}</strong><br/>{question.explanation}</p>
        <p>{snapshot.ownAnswer?.points??0} points this question</p>
        <div className="lq-leaderboard"><h3>Leaderboard</h3>
          {snapshot.players.slice(0,10).map((player,index)=><div key={player.id}>
            <span>{index+1}. {player.avatar} {player.nickname}</span><b>{player.score} pts</b></div>)}</div>
        <p className="lq-help" role="status">{question.index+1===snapshot.questionCount
          ?`Final results appear automatically in ${reviewLeft} seconds.`
          :`Next question starts automatically in ${reviewLeft} seconds.`}</p>
      </section>}
      {snapshot.status==='finished'&&(report?<LiveQuizReportView report={report} teacher={false}/>
        :<p className="lq-loading" role="status">Calculating your detailed result…</p>)}
    </>}
  </main>;
}
