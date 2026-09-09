import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
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
type SelectionMode='manual'|'auto';

const message=(error:unknown,fallback:string)=>error instanceof Error?error.message:fallback;
const statusLabel:Record<string,string>={DRAFT:'Draft',PUBLISHED:'Nashr qilingan',LOBBY:'Lobby',QUESTION_ACTIVE:'Savol ochiq',ANSWERS_LOCKED:'Javoblar yopiq',PEER_MARKING:'Peer marking',ROUND_RESULTS:'Round natijasi',FINISHED:'Yakunlangan',PAUSED:'Pauza',CANCELLED:'Bekor qilingan'};

export function LiveChallengesPage(){
  const[options,setOptions]=useState<BuilderOptions|null>(null);
  const[challenges,setChallenges]=useState<Challenge[]>([]);
  const[questions,setQuestions]=useState<EligibleQuestion[]>([]);
  const[selected,setSelected]=useState<string[]>([]);
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
      const settings={
        timingMode,
        defaultTimeLimitSeconds:timingMode==='per_question'&&timeLimit?Number(timeLimit):null,
        leaderboardMode,
        allowLateJoin,
      };
      const created=(await api<{data:DraftResult}>('/live-challenges',{method:'POST',body:JSON.stringify({classId,title,syllabusId,topicId,subtopicId:subtopicId||null,settings,questionIds:mode==='manual'?selected:undefined})})).data;
      if(mode==='auto')await api(`/live-challenges/${created.id}/questions/auto`,{method:'POST',body:JSON.stringify({count:autoCount})});
      let published:PublishResult|null=null;
      if(publishNow)published=(await api<{data:PublishResult}>(`/live-challenges/${created.id}/publish`,{method:'POST'})).data;
      setNotice(published?`Challenge nashr qilindi. Join code: ${published.joinCode}`:'Challenge draft sifatida saqlandi.');
      setSelected([]);setQuestions([]);
      await loadChallenges();
    }catch(cause){setError(message(cause,'Challenge yaratilmadi.'))}finally{setSaving(false)}
  };

  const publishDraft=async(id:string)=>{
    setSaving(true);setError('');setNotice('');
    try{const published=(await api<{data:PublishResult}>(`/live-challenges/${id}/publish`,{method:'POST'})).data;setNotice(`Challenge nashr qilindi. Join code: ${published.joinCode}`);await loadChallenges()}catch(cause){setError(message(cause,'Challenge publish qilinmadi.'))}finally{setSaving(false)}
  };

  if(loading&&!options)return <main className="live-state">Live Challenge Builder yuklanmoqda…</main>;

  return <main className="live-page">
    <header className="live-hero"><div><span className="live-eyebrow">CAMBRIDGE LIVE ASSESSMENT</span><h1>Live Challenges</h1><p>Canonical Cambridge savollaridan real-time sinf challenge yarating. Mark Scheme studentlarga faqat javoblar yopilgandan keyin ochiladi.</p></div><div className="live-safety"><strong>Fail-closed pool</strong><span>Faqat approved + source-complete savollar</span></div></header>

    {error&&<div className="live-alert live-alert--error">{error}</div>}
    {notice&&<div className="live-alert live-alert--ok">{notice}</div>}

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

          {mode==='manual'?<div className="live-pool">
            <div className="live-pool-toolbar"><button type="button" onClick={()=>void loadQuestionPool()} disabled={!topicId||questionLoading}>{questionLoading?'Yuklanmoqda…':'Eligible savollarni ko‘rsatish'}</button><span>{selected.length} savol · {totalSelectedMarks} ball</span></div>
            <div className="live-question-list">{questions.map(question=><label className={`live-question${selected.includes(question.id)?' is-selected':''}`} key={question.id}><input type="checkbox" checked={selected.includes(question.id)} onChange={()=>toggleQuestion(question.id)}/><span><strong>{question.displayRef}</strong><small>{question.year} · {question.series} · P{question.component} · {question.marks} ball · {question.commandWord??'—'}</small><em>{question.stemMd??'Savol matni structured content orqali beriladi.'}</em></span></label>)}</div>
          </div>:<label>Auto-select savollar soni<input type="number" min={1} max={30} value={autoCount} onChange={event=>setAutoCount(Math.max(1,Math.min(30,Number(event.target.value)||1)))}/></label>}

          <div className="live-settings"><h3>Session settings</h3><div className="live-two"><label>Timing<select value={timingMode} onChange={event=>setTimingMode(event.target.value as Settings['timingMode'])}><option value="teacher">Teacher-controlled</option><option value="per_question">Har savolga vaqt</option></select></label><label>Vaqt (soniya)<input type="number" min={10} max={7200} disabled={timingMode!=='per_question'} value={timeLimit} onChange={event=>setTimeLimit(event.target.value)} placeholder="60"/></label></div><label>Leaderboard<select value={leaderboardMode} onChange={event=>setLeaderboardMode(event.target.value as Settings['leaderboardMode'])}><option value="marks">Faqat ball</option><option value="marks_plus_small_speed_bonus">Ball + kichik speed bonus</option></select></label><label className="live-check"><input type="checkbox" checked={allowLateJoin} onChange={event=>setAllowLateJoin(event.target.checked)}/><span>Challenge boshlanganidan keyin late join’ga ruxsat</span></label><label className="live-check"><input type="checkbox" checked={publishNow} onChange={event=>setPublishNow(event.target.checked)}/><span>Yaratilgach darhol publish qilish</span></label></div>

          <button className="live-primary" disabled={saving||!classId||!topicId||(mode==='manual'&&!selected.length)}>{saving?'Saqlanmoqda…':publishNow?'Challenge yaratish va publish':'Draft saqlash'}</button>
        </form>
      </section>

      <aside className="live-existing"><div className="live-card-head"><div><small>SESSIONLAR</small><h2>Mening challenge’larim</h2></div><span>{challenges.length}</span></div>{!challenges.length?<p className="live-empty">Hali challenge yaratilmagan.</p>:<div className="live-challenge-list">{challenges.map(item=><article key={item.id}><div className="live-challenge-title"><span className={`live-status live-status--${item.status.toLowerCase()}`}>{statusLabel[item.status]??item.status}</span><strong>{item.title}</strong></div><p>{item.className} · {item.syllabusCode}{item.topicTitle?` · ${item.topicTitle}`:''}</p><div className="live-challenge-meta"><span>{item.questionCount} savol</span>{item.joinCode?<b>{item.joinCode}</b>:<span>Join code yo‘q</span>}</div>{item.status==='DRAFT'?<button type="button" disabled={saving||item.questionCount===0} onClick={()=>void publishDraft(item.id)}>Publish</button>:null}</article>)}</div>}</aside>
    </div>
  </main>;
}
