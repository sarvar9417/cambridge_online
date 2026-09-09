import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type LiveChallengeState } from '../lib/api';
import { AttemptContext } from '../AttemptContext';
import { StructuredQuestionView, structuredQuestionAssetsReady, structuredQuestionUsable } from '../student/StructuredQuestionView';
import './live-challenges.css';

type SyllabusOption={id:string;code:string;subject:string};
type SubtopicOption={id:string;code:string;title:string};
type TopicOption={id:string;number:number;title:string;subtopics:SubtopicOption[]};
type ClassOption={id:string;name:string;grade:number|null;level:string;academicYear:string;syllabusId:string;syllabusCode:string};
type Settings={questionOrder:'fixed'|'shuffled';timingMode:'teacher'|'per_question';defaultTimeLimitSeconds:number|null;allowLateJoin:boolean;autoCloseWhenAllSubmitted:boolean;peerMarkingEnabled:boolean;teacherOverrideEnabled:boolean;leaderboardMode:'marks'|'marks_plus_small_speed_bonus';displayNameMode:'first_name'|'full_name'|'anonymous'};
type BuilderOptions={syllabi:SyllabusOption[];selectedSyllabusId:string|null;topics:TopicOption[];classes:ClassOption[];defaultSettings:Settings};
type EligibleQuestion={id:string;displayRef:string;stemMd:string|null;commandWord:string|null;marks:number;answerKind:string;ao:string|null;year:number;series:string;variant:number;component:number};
type Challenge={id:string;title:string;classId:string;className:string;syllabusId:string;syllabusCode:string;topicId:string|null;topicTitle:string|null;subtopicId:string|null;subtopicTitle:string|null;joinCode:string|null;status:string;settings:Settings;currentQuestionPosition:number|null;stateVersion:number;questionCount:number;createdAt:string;publishedAt:string|null;startedAt:string|null;finishedAt:string|null};
type DraftResult={id:string;title:string;classId:string;syllabusId:string;topicId:string|null;subtopicId:string|null;status:string;settings:Settings;stateVersion:number;questionCount:number;createdAt:string};
type PublishResult={id:string;title:string;classId:string;joinCode:string;status:string;stateVersion:number;publishedAt:string;questionCount:number};
type Lobby={id:string;title:string;classId:string;className:string;syllabusCode:string;topicTitle:string|null;subtopicTitle:string|null;status:string;joinCode:string;stateVersion:number;participantCount:number;participants:Array<{studentId:string;fullName:string;status:string;joinedAt:string;lastSeenAt:string}>};
type SelectionMode='manual'|'auto';

const message=(error:unknown,fallback:string)=>error instanceof Error?error.message:fallback;
const statusLabel:Record<string,string>={DRAFT:'Draft',PUBLISHED:'Nashr qilingan',LOBBY:'Lobby',QUESTION_ACTIVE:'Savol ochiq',ANSWERS_LOCKED:'Javoblar yopiq',PEER_MARKING:'Peer marking',ROUND_RESULTS:'Round natijasi',FINISHED:'Yakunlangan',PAUSED:'Pauza',CANCELLED:'Bekor qilingan'};

export function LiveChallengesPage(){
  const[options,setOptions]=useState<BuilderOptions|null>(null);
  const[challenges,setChallenges]=useState<Challenge[]>([]);
  const[questions,setQuestions]=useState<EligibleQuestion[]>([]);
  const[selected,setSelected]=useState<string[]>([]);
  const[lobby,setLobby]=useState<Lobby|null>(null);
  const[runtime,setRuntime]=useState<LiveChallengeState|null>(null);
  const[loading,setLoading]=useState(true);
  const[questionLoading,setQuestionLoading]=useState(false);
  const[saving,setSaving]=useState(false);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');
  const[syllabusId,setSyllabusId]=useState('');
  const[classId,setClassId]=useState('');
  const[topicId,setTopicId]=useState('');
  const[subtopicId,setSubtopicId]=useState('');
  const[mode,setMode]=useState<SelectionMode>('manual');
  const[autoCount,setAutoCount]=useState(5);
  const[publishNow,setPublishNow]=useState(true);
  const[timingMode,setTimingMode]=useState<Settings['timingMode']>('teacher');
  const[timeLimit,setTimeLimit]=useState('');
  const[leaderboardMode,setLeaderboardMode]=useState<Settings['leaderboardMode']>('marks');
  const[allowLateJoin,setAllowLateJoin]=useState(false);

  const loadChallenges=async()=>setChallenges((await api<{data:Challenge[]}>('/live-challenges')).data);
  const loadOptions=async(nextSyllabusId?:string)=>{
    const suffix=nextSyllabusId?`?syllabusId=${encodeURIComponent(nextSyllabusId)}`:'';
    const next=(await api<{data:BuilderOptions}>(`/live-challenges/builder-options${suffix}`)).data;
    setOptions(next);
    const resolved=next.selectedSyllabusId??'';
    setSyllabusId(resolved);
    setClassId(current=>next.classes.some(item=>item.id===current&&item.syllabusId===resolved)?current:(next.classes.find(item=>item.syllabusId===resolved)?.id??''));
    setTopicId('');setSubtopicId('');setQuestions([]);setSelected([]);
    setTimingMode(next.defaultSettings.timingMode);
    setLeaderboardMode(next.defaultSettings.leaderboardMode);
    setAllowLateJoin(next.defaultSettings.allowLateJoin);
  };

  useEffect(()=>{Promise.all([loadOptions(),loadChallenges()]).catch(cause=>setError(message(cause,'Live Challenge ma’lumotlari yuklanmadi.'))).finally(()=>setLoading(false))},[]);

  const syllabusClasses=useMemo(()=>options?.classes.filter(item=>item.syllabusId===syllabusId)??[],[options,syllabusId]);
  const activeTopic=options?.topics.find(item=>item.id===topicId)??null;
  const totalSelectedMarks=selected.reduce((sum,id)=>sum+(questions.find(item=>item.id===id)?.marks??0),0);

  const changeSyllabus=async(value:string)=>{setError('');setNotice('');setSyllabusId(value);setLoading(true);try{await loadOptions(value)}catch(cause){setError(message(cause,'Syllabus yuklanmadi.'))}finally{setLoading(false)}};
  const changeTopic=(value:string)=>{setTopicId(value);setSubtopicId('');setQuestions([]);setSelected([])};
  const loadQuestionPool=async()=>{
    if(!syllabusId||!topicId)return;
    setQuestionLoading(true);setError('');setNotice('');
    try{
      const query=new URLSearchParams({syllabusId,topicId,limit:'200'});
      if(subtopicId)query.set('subtopicId',subtopicId);
      const result=await api<{data:EligibleQuestion[]}>(`/live-challenges/eligible-questions?${query}`);
      setQuestions(result.data);setSelected([]);
      if(!result.data.length)setNotice('Bu scope uchun hozircha Live Challenge’ga yaroqli source-complete savol topilmadi.');
    }catch(cause){setError(message(cause,'Eligible savollar yuklanmadi.'))}finally{setQuestionLoading(false)}
  };
  const toggleQuestion=(id:string)=>setSelected(current=>current.includes(id)?current.filter(item=>item!==id):current.length>=30?current:[...current,id]);

  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(saving)return;
    if(!classId||!syllabusId||!topicId){setError('Sinf, syllabus va chapter/topicni tanlang.');return}
    if(mode==='manual'&&!selected.length){setError('Manual rejimda kamida bitta savol tanlang.');return}
    setSaving(true);setError('');setNotice('');
    const data=new FormData(event.currentTarget),title=String(data.get('title')??'').trim();
    try{
      const settings={timingMode,defaultTimeLimitSeconds:timingMode==='per_question'&&timeLimit?Number(timeLimit):null,leaderboardMode,allowLateJoin};
      const created=(await api<{data:DraftResult}>('/live-challenges',{method:'POST',body:JSON.stringify({classId,title,syllabusId,topicId,subtopicId:subtopicId||null,settings,questionIds:mode==='manual'?selected:undefined})})).data;
      if(mode==='auto')await api(`/live-challenges/${created.id}/questions/auto`,{method:'POST',body:JSON.stringify({count:autoCount})});
      let published:PublishResult|null=null;
      if(publishNow)published=(await api<{data:PublishResult}>(`/live-challenges/${created.id}/publish`,{method:'POST'})).data;
      setNotice(published?`Challenge nashr qilindi. Join code: ${published.joinCode}`:'Challenge draft sifatida saqlandi.');
      setSelected([]);setQuestions([]);await loadChallenges();
    }catch(cause){setError(message(cause,'Challenge yaratilmadi.'))}finally{setSaving(false)}
  };
  const publishDraft=async(id:string)=>{
    setSaving(true);setError('');setNotice('');
    try{const published=(await api<{data:PublishResult}>(`/live-challenges/${id}/publish`,{method:'POST'})).data;setNotice(`Challenge nashr qilindi. Join code: ${published.joinCode}`);await loadChallenges()}catch(cause){setError(message(cause,'Challenge publish qilinmadi.'))}finally{setSaving(false)}
  };
  const viewLobby=async(id:string)=>{
    setSaving(true);setError('');setNotice('');
    try{setLobby((await api<{data:Lobby}>(`/live-challenges/${id}/lobby`)).data)}catch(cause){setError(message(cause,'Waiting room yuklanmadi.'))}finally{setSaving(false)}
  };
  const openLobby=async(item:Challenge)=>{
    setSaving(true);setError('');setNotice('');
    try{
      await api(`/live-challenges/${item.id}/lobby/open`,{method:'POST',body:JSON.stringify({expectedStateVersion:item.stateVersion})});
      await loadChallenges();setLobby((await api<{data:Lobby}>(`/live-challenges/${item.id}/lobby`)).data);
      setNotice('Waiting room ochildi. Join code’ni ekranga chiqarishingiz mumkin.');
    }catch(cause){setError(message(cause,'Waiting room ochilmadi.'))}finally{setSaving(false)}
  };
  const viewState=async(id:string)=>{
    setSaving(true);setError('');
    try{setRuntime((await api<{data:LiveChallengeState}>(`/live-challenges/${id}/state`)).data)}catch(cause){setError(message(cause,'Live round yuklanmadi.'))}finally{setSaving(false)}
  };
  const refreshRuntime=async(id:string)=>{
    const state=(await api<{data:LiveChallengeState}>(`/live-challenges/${id}/state`)).data;
    setRuntime(state);await loadChallenges();return state;
  };
  const startChallenge=async(current:Lobby)=>{
    setSaving(true);setError('');setNotice('');
    try{
      await api(`/live-challenges/${current.id}/start`,{method:'POST',body:JSON.stringify({expectedStateVersion:current.stateVersion})});
      const state=await refreshRuntime(current.id);setLobby(null);
      setNotice(`1-round boshlandi. ${state.question?.displayRef??'Birinchi savol'} studentlarga ochildi.`);
    }catch(cause){setError(message(cause,'Challenge boshlanmadi.'))}finally{setSaving(false)}
  };
  const lockAnswers=async(state:LiveChallengeState)=>{
    setSaving(true);setError('');setNotice('');
    try{
      const result=await api<{data:{submissionCount?:number}}>(`/live-challenges/${state.id}/answers/lock`,{method:'POST',body:JSON.stringify({expectedStateVersion:state.stateVersion})});
      await refreshRuntime(state.id);
      setNotice(`Javoblar yopildi${result.data.submissionCount===undefined?'':`: ${result.data.submissionCount} ta javob qulflandi`}.`);
    }catch(cause){setError(message(cause,'Javoblarni yopib bo‘lmadi.'))}finally{setSaving(false)}
  };
  const startPeerMarking=async(state:LiveChallengeState)=>{
    setSaving(true);setError('');setNotice('');
    try{
      const result=await api<{data:{assignmentCount:number}}>(`/live-challenges/${state.id}/peer-marking/start`,{method:'POST',body:JSON.stringify({expectedStateVersion:state.stateVersion})});
      await refreshRuntime(state.id);
      setNotice(`Anonymous peer marking ochildi: ${result.data.assignmentCount} ta assignment.`);
    }catch(cause){setError(message(cause,'Peer markingni ochib bo‘lmadi.'))}finally{setSaving(false)}
  };
  const releaseResults=async(state:LiveChallengeState)=>{
    setSaving(true);setError('');setNotice('');
    try{
      const result=await api<{data:{markCount?:number}}>(`/live-challenges/${state.id}/peer-marking/release`,{method:'POST',body:JSON.stringify({expectedStateVersion:state.stateVersion})});
      await refreshRuntime(state.id);
      setNotice(`Round natijalari chiqarildi${result.data.markCount===undefined?'':`: ${result.data.markCount} ta peer mark`}.`);
    }catch(cause){setError(message(cause,'Round natijalarini chiqarib bo‘lmadi.'))}finally{setSaving(false)}
  };
  const nextQuestion=async(state:LiveChallengeState)=>{
    setSaving(true);setError('');setNotice('');
    try{
      const result=await api<{data:{status:string;roundNumber:number;finished:boolean}}>(`/live-challenges/${state.id}/next`,{method:'POST',body:JSON.stringify({expectedStateVersion:state.stateVersion})});
      const refreshed=await refreshRuntime(state.id);
      if(result.data.finished)setNotice(`Challenge yakunlandi. ${result.data.roundNumber} ta round tugadi.`);
      else setNotice(`${result.data.roundNumber}-round boshlandi. ${refreshed.question?.displayRef??'Keyingi savol'} studentlarga ochildi.`);
    }catch(cause){setError(message(cause,'Keyingi savolni ochib bo‘lmadi.'))}finally{setSaving(false)}
  };

  if(loading&&!options)return <main className="live-state">Live Challenge Builder yuklanmoqda…</main>;

  return <main className="live-page">
    <header className="live-hero"><div><span className="live-eyebrow">CAMBRIDGE LIVE ASSESSMENT</span><h1>Live Challenges</h1><p>Canonical Cambridge savollaridan real-time sinf challenge yarating. Mark Scheme studentlarga faqat javoblar yopilib, peer marking ochilgandan keyin ko‘rinadi.</p></div><div className="live-safety"><strong>Fail-closed pool</strong><span>Faqat approved + source-complete savollar</span></div></header>
    {error&&<div className="live-alert live-alert--error">{error}</div>}
    {notice&&<div className="live-alert live-alert--ok">{notice}</div>}
    {runtime?<TeacherRound state={runtime} busy={saving} onRefresh={()=>viewState(runtime.id)} onLock={()=>lockAnswers(runtime)} onStartPeer={()=>startPeerMarking(runtime)} onRelease={()=>releaseResults(runtime)} onNext={()=>nextQuestion(runtime)} onClose={()=>setRuntime(null)}/>:null}

    {lobby?<section className="live-lobby">
      <div className="live-lobby-top"><div><span className="live-eyebrow">WAITING ROOM</span><h2>{lobby.title}</h2><p>{lobby.className} · {lobby.syllabusCode}{lobby.topicTitle?` · ${lobby.topicTitle}`:''}</p></div><div className="live-code"><small>JOIN CODE</small><strong>{lobby.joinCode}</strong><span>{lobby.participantCount} joined</span></div></div>
      <div className="live-participants">{lobby.participants.length?lobby.participants.map(person=><div key={person.studentId} className={person.status==='JOINED'?'is-joined':'is-left'}><span>{person.fullName.slice(0,1).toUpperCase()}</span><strong>{person.fullName}</strong><small>{person.status==='JOINED'?'Joined':'Left'}</small></div>):<p>Hali hech kim join qilmagan.</p>}</div>
      <div className="live-lobby-actions"><button type="button" className="secondary" onClick={()=>void viewLobby(lobby.id)} disabled={saving}>Yangilash</button><button type="button" className="secondary" onClick={()=>setLobby(null)}>Yopish</button><button type="button" className="live-primary" disabled={saving||lobby.status!=='LOBBY'} onClick={()=>void startChallenge(lobby)}>{saving?'Boshlanmoqda…':'Start challenge'}</button></div>
    </section>:null}

    <div className="live-grid">
      <section className="live-builder-card">
        <div className="live-card-head"><div><small>YANGI CHALLENGE</small><h2>Teacher Builder</h2></div><span>1 → 5</span></div>
        <form onSubmit={submit} className="live-form">
          <label>Challenge nomi<input name="title" minLength={3} maxLength={120} required placeholder="Masalan: CPU Architecture Challenge"/></label>
          <div className="live-two">
            <label>Syllabus<select value={syllabusId} onChange={event=>void changeSyllabus(event.target.value)} required><option value="">Tanlang</option>{options?.syllabi.map(item=><option value={item.id} key={item.id}>{item.code} · {item.subject}</option>)}</select></label>
            <label>Sinf<select value={classId} onChange={event=>setClassId(event.target.value)} required><option value="">Tanlang</option>{syllabusClasses.map(item=><option value={item.id} key={item.id}>{item.name} · {item.level}</option>)}</select></label>
          </div>
          <div className="live-two">
            <label>Chapter / topic<select value={topicId} onChange={event=>changeTopic(event.target.value)} required><option value="">Tanlang</option>{options?.topics.map(item=><option value={item.id} key={item.id}>{item.number}. {item.title}</option>)}</select></label>
            <label>Section / subtopic<select value={subtopicId} onChange={event=>{setSubtopicId(event.target.value);setQuestions([]);setSelected([])}} disabled={!activeTopic}><option value="">Butun chapter</option>{activeTopic?.subtopics.map(item=><option value={item.id} key={item.id}>{item.code} · {item.title}</option>)}</select></label>
          </div>
          <fieldset className="live-mode"><legend>Savol tanlash</legend><label><input type="radio" checked={mode==='manual'} onChange={()=>setMode('manual')}/> Manual</label><label><input type="radio" checked={mode==='auto'} onChange={()=>setMode('auto')}/> Auto-select</label></fieldset>
          {mode==='manual'?<div className="live-pool"><div className="live-pool-toolbar"><button type="button" onClick={()=>void loadQuestionPool()} disabled={!topicId||questionLoading}>{questionLoading?'Yuklanmoqda…':'Eligible savollarni ko‘rsatish'}</button><span>{selected.length} savol · {totalSelectedMarks} ball</span></div><div className="live-question-list">{questions.map(question=><label className={`live-question${selected.includes(question.id)?' is-selected':''}`} key={question.id}><input type="checkbox" checked={selected.includes(question.id)} onChange={()=>toggleQuestion(question.id)}/><span><strong>{question.displayRef}</strong><small>{question.year} · {question.series} · P{question.component} · {question.marks} ball · {question.commandWord??'—'}</small><em>{question.stemMd??'Savol matni structured content orqali beriladi.'}</em></span></label>)}</div></div>:<label>Auto-select savollar soni<input type="number" min={1} max={30} value={autoCount} onChange={event=>setAutoCount(Math.max(1,Math.min(30,Number(event.target.value)||1)))}/></label>}
          <div className="live-settings"><h3>Session settings</h3><div className="live-two"><label>Timing<select value={timingMode} onChange={event=>setTimingMode(event.target.value as Settings['timingMode'])}><option value="teacher">Teacher-controlled</option><option value="per_question">Har savolga vaqt</option></select></label><label>Vaqt (soniya)<input type="number" min={10} max={7200} disabled={timingMode!=='per_question'} value={timeLimit} onChange={event=>setTimeLimit(event.target.value)} placeholder="60"/></label></div><label>Leaderboard<select value={leaderboardMode} onChange={event=>setLeaderboardMode(event.target.value as Settings['leaderboardMode'])}><option value="marks">Faqat ball</option><option value="marks_plus_small_speed_bonus">Ball + kichik speed bonus</option></select></label><label className="live-check"><input type="checkbox" checked={allowLateJoin} onChange={event=>setAllowLateJoin(event.target.checked)}/><span>Challenge boshlanganidan keyin late join’ga ruxsat</span></label><label className="live-check"><input type="checkbox" checked={publishNow} onChange={event=>setPublishNow(event.target.checked)}/><span>Yaratilgach darhol publish qilish</span></label></div>
          <button className="live-primary" disabled={saving||!classId||!topicId||(mode==='manual'&&!selected.length)}>{saving?'Saqlanmoqda…':publishNow?'Challenge yaratish va publish':'Draft saqlash'}</button>
        </form>
      </section>

      <aside className="live-existing"><div className="live-card-head"><div><small>SESSIONLAR</small><h2>Mening challenge’larim</h2></div><span>{challenges.length}</span></div>{!challenges.length?<p className="live-empty">Hali challenge yaratilmagan.</p>:<div className="live-challenge-list">{challenges.map(item=><article key={item.id}><div className="live-challenge-title"><span className={`live-status live-status--${item.status.toLowerCase()}`}>{statusLabel[item.status]??item.status}</span><strong>{item.title}</strong></div><p>{item.className} · {item.syllabusCode}{item.topicTitle?` · ${item.topicTitle}`:''}</p><div className="live-challenge-meta"><span>{item.questionCount} savol</span>{item.joinCode?<b>{item.joinCode}</b>:<span>Join code yo‘q</span>}</div><div className="live-challenge-actions">{item.status==='DRAFT'?<button type="button" disabled={saving||item.questionCount===0} onClick={()=>void publishDraft(item.id)}>Publish</button>:null}{item.status==='PUBLISHED'?<button type="button" disabled={saving} onClick={()=>void openLobby(item)}>Lobby ochish</button>:null}{item.status==='LOBBY'||item.status==='PAUSED'?<button type="button" disabled={saving} onClick={()=>void viewLobby(item.id)}>Waiting room</button>:null}{['QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS','FINISHED'].includes(item.status)?<button type="button" disabled={saving} onClick={()=>void viewState(item.id)}>{item.status==='FINISHED'?'Yakun':'Live round'}</button>:null}</div></article>)}</div>}</aside>
    </div>
  </main>;
}

function TeacherRound({state,busy,onRefresh,onLock,onStartPeer,onRelease,onNext,onClose}:{state:LiveChallengeState;busy:boolean;onRefresh:()=>Promise<void>;onLock:()=>Promise<void>;onStartPeer:()=>Promise<void>;onRelease:()=>Promise<void>;onNext:()=>Promise<void>;onClose:()=>void}){
  const question=state.question;
  const structured=question?.contentJson??null;
  const structuredReady=Boolean(structured&&question?.contentVersion===1&&structuredQuestionUsable(structured)&&structuredQuestionAssetsReady(structured,question.assetUrls??{}));
  const markScheme=state.markScheme as {points?:Array<{id?:string;code?:string;text?:string;marks?:number}>}|null;
  return <section className="live-round-panel">
    <header><div><span className="live-eyebrow">LIVE ROUND {state.round?.number??''}</span><h2>{state.title}</h2><p>{state.className} · {statusLabel[state.status]??state.status} · state #{state.stateVersion}</p></div><div><button type="button" className="secondary" disabled={busy} onClick={()=>void onRefresh()}>{busy?'…':'Yangilash'}</button><button type="button" className="secondary" onClick={onClose}>Yopish</button></div></header>
    {question?<div className="live-round-question"><div className="live-round-meta"><strong>{question.displayRef}</strong>{question.commandWord?<span>{question.commandWord}</span>:null}<b>{question.marks} ball</b></div>{structuredReady&&structured?<StructuredQuestionView content={structured} assetUrls={question.assetUrls}/>:structured?<StructuredQuestionView content={structured} assetUrls={question.assetUrls}/>:<>{question.contextMd?<AttemptContext value={question.contextMd}/>:null}<p>{question.stemMd}</p></>}</div>:<p className="live-empty">Joriy savol topilmadi.</p>}
    {state.status!=='QUESTION_ACTIVE'&&markScheme?.points?.length?<section className="live-ms-preview"><strong>Mark Scheme snapshot</strong>{markScheme.points.map((point,index)=><div key={point.id??`${point.code}-${index}`}><b>{point.code??`P${index+1}`}</b><span>{point.text}</span><em>{point.marks??0}</em></div>)}</section>:null}
    <div className="live-runtime-actions">{state.status==='QUESTION_ACTIVE'?<button type="button" disabled={busy} onClick={()=>void onLock()}>Javoblarni yopish</button>:null}{state.status==='ANSWERS_LOCKED'?<button type="button" disabled={busy} onClick={()=>void onStartPeer()}>Peer markingni ochish</button>:null}{state.status==='PEER_MARKING'?<button type="button" disabled={busy} onClick={()=>void onRelease()}>Natijalarni chiqarish</button>:null}{state.status==='ROUND_RESULTS'?<button type="button" disabled={busy} onClick={()=>void onNext()}>Keyingi savol</button>:null}{state.status==='FINISHED'?<span className="live-finished-chip">✓ Challenge yakunlangan</span>:null}</div>
    <footer><span>Teacher projection</span><span>Mark Scheme studentdan {state.status==='QUESTION_ACTIVE'||state.status==='ANSWERS_LOCKED'?'yashirin':'peer/result bosqichida ochiq'}</span>{state.round?.timeLimitSeconds?<span>{state.round.timeLimitSeconds}s</span>:<span>Teacher-controlled timing</span>}</footer>
  </section>;
}