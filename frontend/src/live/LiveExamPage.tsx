import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowsClockwise, Broadcast, CheckCircle, Copy, Monitor, UsersThree } from '@phosphor-icons/react';
import {
  api,
  type ClassItem,
  type LiveExamAnswer,
  type LiveExamMarkingMode,
  type LiveExamPortableQuestion,
  type LiveExamQuestion,
  type LiveExamSnapshot,
  type LiveExamStatus,
  type LiveExamSummary,
  type LiveMarkScheme,
  type User,
} from '../lib/api';
import { navigate, useRoute } from '../lib/router';
import { LatexQuestionText } from '../lib/latex-question-text';
import { AttemptContext } from '../AttemptContext';
import {
  StructuredQuestionView,
  structuredQuestionAssetsReady,
  structuredQuestionUsable,
} from '../student/StructuredQuestionView';
import { LiveExamLeaderboard } from './LiveExamLeaderboard';
import './live-exam.css';

type FilterOptions = {
  topics: Array<{
    syllabus_code:string;topic_id:string;topic_number:number;topic_title:string;
    subtopic_id:string;code:string;subtopic_title:string;component:number|null;
  }>;
};
type EligibleQuestion = {id:string;displayRef:string;marks:number;commandWord:string|null;stem:string;hasAssets:boolean;dependencyCount:number};

const EMPTY_OPTIONS:FilterOptions = { topics:[] };

const STATUS_LABEL:Record<LiveExamStatus,string> = {
  lobby:'Kutilmoqda',question_open:'Savol ochiq',marking:'Baholash',review:'Natijani ko‘rish',
  finished:'Yakunlangan',cancelled:'Bekor qilingan',
};
const MODE_LABEL:Record<LiveExamMarkingMode,string> = {
  teacher:'O‘qituvchi baholaydi',peer:'Anonim o‘zaro baholash',self:'O‘zini baholash',
};

function message(error:unknown,fallback:string) {
  return error instanceof Error ? error.message : fallback;
}

function liveDraftKey(sessionId:string,answerId:string) {
  return `campath:live-draft:${sessionId}:${answerId}`;
}

function readLiveDraft(key:string) {
  try {
    const raw=localStorage.getItem(key);
    if(!raw)return null;
    const draft=JSON.parse(raw) as {text?:unknown;updatedAt?:unknown};
    if(typeof draft.text!=='string'||typeof draft.updatedAt!=='number'||Date.now()-draft.updatedAt>86_400_000){localStorage.removeItem(key);return null}
    return draft.text;
  }catch{return null}
}

function writeLiveDraft(key:string,text:string) {
  try{localStorage.setItem(key,JSON.stringify({text,updatedAt:Date.now()}))}catch{/* Storage may be disabled or full. */}
}

function removeLiveDraft(key:string) {
  try{localStorage.removeItem(key)}catch{/* Storage may be disabled. */}
}

function formatClock(seconds:number|null) {
  if (seconds === null) return 'Vaqt cheklanmagan';
  const safe=Math.max(0,seconds),minutes=Math.floor(safe/60),rest=safe%60;
  return `${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`;
}

function schemeNeedsManualScore(scheme:LiveMarkScheme|undefined|null) {
  return !scheme?.points.length||['manual_only','code_output','levels_of_response'].includes(scheme.schemeType);
}

function markSchemeNotes(value:unknown):string[] {
  if(typeof value==='string')return value.trim()?[value.trim()]:[];
  if(Array.isArray(value))return value.flatMap(markSchemeNotes).slice(0,10);
  if(value&&typeof value==='object')return Object.values(value).flatMap(markSchemeNotes).slice(0,10);
  return [];
}

function useCountdown(deadline:string|null,serverNow:string|undefined) {
  const [remaining,setRemaining]=useState<number|null>(null);
  useEffect(()=>{
    if(!deadline){setRemaining(null);return}
    const offset=serverNow?new Date(serverNow).getTime()-Date.now():0;
    const update=()=>setRemaining(Math.max(0,Math.ceil((new Date(deadline).getTime()-(Date.now()+offset))/1000)));
    update();const timer=window.setInterval(update,1000);return()=>window.clearInterval(timer);
  },[deadline,serverNow]);
  return remaining;
}

function useLiveSnapshot(sessionId:string) {
  const [snapshot,setSnapshot]=useState<LiveExamSnapshot|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const request=useRef(false);
  const refresh=useCallback(async(silent=false)=>{
    if(request.current)return;
    request.current=true;
    try{
      const next=await api<LiveExamSnapshot>(`/live-exams/${sessionId}`);
      // Presence changes do not increment the session version, so retain the
      // complete server snapshot on every poll instead of only state changes.
      setSnapshot(next);
      setError('');
    }catch(cause){if(!silent)setError(message(cause,'Live sessiya yuklanmadi.'));}
    finally{request.current=false;setLoading(false)}
  },[sessionId]);
  useEffect(()=>{
    void refresh();
    const timer=window.setInterval(()=>void refresh(true),1500);
    const visible=()=>{if(document.visibilityState==='visible')void refresh(true)};
    document.addEventListener('visibilitychange',visible);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
  },[refresh]);
  useEffect(()=>{
    const beat=()=>void api(`/live-exams/${sessionId}/heartbeat`,{method:'POST'}).catch(()=>{});
    beat();const timer=window.setInterval(beat,15000);return()=>window.clearInterval(timer);
  },[sessionId]);
  return{snapshot,error,loading,refresh};
}

function QuestionAsset({asset}:{asset:LiveExamPortableQuestion['contextBlocks'][number]['assets'][number]}) {
  return <figure className="live-asset">
    {asset.url?<img src={asset.url} alt={asset.altText||'Cambridge source diagram'} />:
      asset.contentMd?<pre>{asset.contentMd}</pre>:<div role="alert">Diagramma yuklanmadi.</div>}
    {asset.altText?<figcaption>{asset.altText}</figcaption>:null}
  </figure>;
}

function LiveQuestionView({question}:{question:LiveExamQuestion}) {
  const portable=question.portable;
  const content=portable.leaf.contentJson;
  const assetUrls=useMemo(()=>Object.fromEntries(portable.contextBlocks.flatMap((block)=>
    block.assets.filter((asset)=>Boolean(asset.url)).map((asset)=>[asset.id,asset.url!] as const))),[portable]);
  const structured=content&&structuredQuestionUsable(content)&&structuredQuestionAssetsReady(content,assetUrls);
  return <article className="live-question-card">
    <header><div><span>Savol {question.position+1}</span><strong>{portable.sourceRef}</strong></div><b>{question.marks} ball</b></header>
    {portable.leaf.commandWord?<span className="live-command">{portable.leaf.commandWord}</span>:null}
    {question.dependencyWork.length?<section className="live-dependency-work">
      <header><strong>Oldingi ish kerak</strong><span>{question.dependencyWork.length} ta bog‘lanish</span></header>
      {question.dependencyWork.map((dependency)=><article key={dependency.questionId}>
        <div><b>{dependency.displayRef}</b><small>{dependency.kind==='answer_ref'?'Oldingi javobingizdan foydalaning':'Oldingi qismdagi ma’lumotdan foydalaning'}</small></div>
        {dependency.ownAnswer!==null?<pre>{dependency.ownAnswer||'Javob bo‘sh topshirilgan.'}</pre>:<p>{dependency.position===null?'Bu majburiy qism sessiyada topilmadi.':'Bu qism avval bajariladi.'}</p>}
      </article>)}
    </section>:null}
    {structured?<StructuredQuestionView content={content} assetUrls={assetUrls}/>:<>
      {portable.contextBlocks.map((block)=><section className="live-context" key={block.id}>
        {block.contextLatex||block.context?<LatexQuestionText latex={block.contextLatex} fallback={block.context}/>:null}
        {block.assets.map((asset)=><QuestionAsset key={asset.id} asset={asset}/>)}
      </section>)}
      {portable.leaf.stem?<LatexQuestionText
        latex={portable.leaf.bodyFormat==='latex'?portable.leaf.stemLatex:null}
        fallback={portable.leaf.stem}/>:null}
    </>}
  </article>;
}

function MarkSchemeView({scheme,selected,onToggle,interactive=false}:{
  scheme:LiveMarkScheme;selected?:Set<string>;onToggle?:(id:string)=>void;interactive?:boolean;
}) {
  return <section className="live-scheme">
    <header><div><span>OFFICIAL MARK SCHEME</span><h2>Baholash mezoni</h2></div><strong>{scheme.maxMarks} ball</strong></header>
    {scheme.guidanceMd?<p className="live-scheme-guidance">{scheme.guidanceMd}</p>:null}
    {scheme.groups.length?<div className="live-scheme-groups">{scheme.groups.map((group)=><span key={group.id}>
      {group.label||'Mark group'} · {group.nRequired} ta talab · maksimum {group.maxMarks}
    </span>)}</div>:null}
    {scheme.levels.length?<div className="live-scheme-levels"><h3>Levels of response</h3>{scheme.levels.map((level)=><article key={level.id}><header><strong>Level {level.levelNumber}</strong><b>{level.minMarks}–{level.maxMarks} ball</b></header><p>{level.descriptorMd}</p>{level.indicativeContentMd?<small>{level.indicativeContentMd}</small>:null}</article>)}</div>:null}
    <div className="live-scheme-points">
      {scheme.points.map((point,index)=><label className={selected?.has(point.id)?'is-selected':''} key={point.id}>
        {interactive?<input type="checkbox" checked={selected?.has(point.id)??false} onChange={()=>onToggle?.(point.id)}/>:<b>{index+1}</b>}
        <span><strong>{point.code}</strong>{point.text}{markSchemeNotes(point.accept).map((note,noteIndex)=><small className="live-ms-note is-accept" key={`a-${noteIndex}`}>Accept: {note}</small>)}{markSchemeNotes(point.reject).map((note,noteIndex)=><small className="live-ms-note is-reject" key={`r-${noteIndex}`}>Reject: {note}</small>)}</span><i>{point.marks}</i>
      </label>)}
      {!scheme.points.length?<p>Bu savol umumiy ball bilan baholanadi.</p>:null}
    </div>
  </section>;
}

function SessionProgress({snapshot}:{snapshot:LiveExamSnapshot}) {
  const {session}=snapshot;
  return <div className="live-progress" aria-label={`Savol ${session.currentQuestionIndex+1}, jami ${session.questionCount}`}>
    {Array.from({length:session.questionCount},(_,index)=><i key={index} className={
      index<session.currentQuestionIndex?'is-done':index===session.currentQuestionIndex?'is-current':''}/>) }
  </div>;
}

function LobbyParticipants({snapshot,busy,onRemove}:{snapshot:LiveExamSnapshot;busy:boolean;onRemove:(studentId:string,fullName:string)=>void}) {
  return <section className="live-roster">
    <header><h2>O‘quvchilar</h2><span>{snapshot.session.participantCount} qo‘shildi</span></header>
    {!snapshot.participants.length?<p className="live-empty">O‘quvchilar kodni kiritishi kutilmoqda.</p>:<ul>
      {snapshot.participants.map((person)=><li key={person.id}>
        <span className={person.online?'is-online':''}/><strong>{person.fullName}</strong><small>{person.online?'Online':'Aloqa uzilgan'}</small><button className="live-roster-remove" disabled={busy} onClick={()=>onRemove(person.studentId,person.fullName)}>Chiqarish</button>
      </li>)}
    </ul>}
  </section>;
}

function LiveLanding({user,classes}:{user:User;classes:ClassItem[]}) {
  const [sessions,setSessions]=useState<LiveExamSummary[]>([]);
  const [options,setOptions]=useState<FilterOptions>(EMPTY_OPTIONS);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [code,setCode]=useState('');
  const [selectedClassId,setSelectedClassId]=useState(()=>classes[0]?.id??'');
  const [topicIds,setTopicIds]=useState<string[]>([]);
  const [subtopicIds,setSubtopicIds]=useState<string[]>([]);
  const [selectionMode,setSelectionMode]=useState<'auto'|'manual'>('auto');
  const [questionPool,setQuestionPool]=useState<EligibleQuestion[]>([]);
  const [selectedQuestionIds,setSelectedQuestionIds]=useState<string[]>([]);

  useEffect(()=>{
    const requests:Promise<unknown>[]=[api<{data:LiveExamSummary[]}>('/live-exams').then((r)=>setSessions(r.data))];
    if(user.role!=='student')requests.push(api<FilterOptions>('/questions/filter-options').then(setOptions));
    Promise.all(requests).catch((cause)=>setError(message(cause,'Ma’lumotlar yuklanmadi.'))).finally(()=>setLoading(false));
  },[user.role]);
  useEffect(()=>{if(!selectedClassId&&classes[0])setSelectedClassId(classes[0].id)},[classes,selectedClassId]);

  const syllabusTopics=options.topics.filter((item)=>item.syllabus_code==='9618');
  const topics=[...new Map(syllabusTopics.map((item)=>[item.topic_id,item])).values()];
  const visibleSubtopics=syllabusTopics.filter((item)=>!topicIds.length||topicIds.includes(item.topic_id));
  const toggle=(value:string,current:string[],set:(value:string[])=>void)=>set(current.includes(value)?current.filter((id)=>id!==value):[...current,value]);

  const loadQuestionPool=async()=>{
    setBusy(true);setError('');
    try{
      const params=new URLSearchParams({
        classId:selectedClassId,
        topicIds:topicIds.join(','),subtopicIds:subtopicIds.join(','),includeDiagrams:'true',excludeSeen:'true',limit:'30',
      });
      const result=await api<{data:EligibleQuestion[]}>(`/live-exams/eligible-questions?${params}`);
      setQuestionPool(result.data);setSelectedQuestionIds((current)=>current.filter((id)=>result.data.some((item)=>item.id===id)));
    }catch(cause){setError(message(cause,'Savollar havzasi yuklanmadi.'))}finally{setBusy(false)}
  };

  const create=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setBusy(true);setError('');
    const data=new FormData(event.currentTarget);
    try{
      const created=await api<{id:string}>('/live-exams',{method:'POST',body:JSON.stringify({
        classId:data.get('classId'),title:data.get('title'),topicIds,subtopicIds,
        questionCount:selectionMode==='manual'?selectedQuestionIds.length:Number(data.get('questionCount')),questionTimeLimitS:data.get('timeLimit')?Number(data.get('timeLimit'))*60:undefined,
        markingMode:data.get('markingMode'),includeDiagrams:data.get('includeDiagrams')==='on',excludeSeen:data.get('excludeSeen')==='on',
        questionIds:selectionMode==='manual'?selectedQuestionIds:undefined,questionOrder:data.get('questionOrder'),
        allowLateJoin:data.get('allowLateJoin')==='on',autoCloseWhenAllSubmitted:data.get('autoCloseWhenAllSubmitted')==='on',
        teacherOverrideEnabled:data.get('teacherOverrideEnabled')==='on',leaderboardMode:data.get('leaderboardMode'),
      })});
      navigate(`oqitish/live?id=${created.id}`);
    }catch(cause){setError(message(cause,'Live Challenge yaratilmadi.'));setBusy(false)}
  };

  const join=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setError('');
    try{const result=await api<{sessionId:string}>('/live-exams/join',{method:'POST',body:JSON.stringify({code})});navigate(`oquvchi/live?id=${result.sessionId}`)}
    catch(cause){setError(message(cause,'Xonaga qo‘shilib bo‘lmadi.'));setBusy(false)}
  };

  return <div className="live-page live-landing">
    <header className="live-page-head"><div><span className="live-eyebrow"><Broadcast size={18}/> CAMBRIDGE 9618</span><h1>Live Challenge</h1><p>Past-paper savolini bir vaqtda ishlang, so‘ng official mark scheme bilan baholang.</p></div></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    {user.role==='student'?<section className="live-join-card">
      <div><span className="live-eyebrow">XONAGA KIRISH</span><h2>O‘qituvchi bergan 6 xonali kodni kiriting</h2></div>
      <form onSubmit={join}><input aria-label="Xona kodi" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000"/><button disabled={busy||code.length!==6}>Qo‘shilish</button></form>
    </section>:<form className="live-create" onSubmit={create}>
      <section className="live-create-main"><span className="live-step">1</span><div><h2>Sessiya</h2><p>Sinf va savollar ko‘lamini tanlang.</p></div>
        <label>Sinf<select name="classId" required value={selectedClassId} onChange={(event)=>{setSelectedClassId(event.target.value);setQuestionPool([]);setSelectedQuestionIds([])}}>{classes.map((item)=><option key={item.id} value={item.id}>{item.name} · {item.level}</option>)}</select></label>
        <label>Sessiya nomi<input name="title" required minLength={3} maxLength={120} placeholder="Chapter 14 revision"/></label>
        <div className="live-topic-grid"><fieldset><legend>Topic</legend>{topics.map((topic)=><label key={topic.topic_id}><input type="checkbox" checked={topicIds.includes(topic.topic_id)} onChange={()=>{toggle(topic.topic_id,topicIds,setTopicIds);setSubtopicIds((current)=>current.filter((id)=>syllabusTopics.some((row)=>row.subtopic_id===id&&row.topic_id!==topic.topic_id)))}}/><span>{topic.topic_number}. {topic.topic_title}</span></label>)}</fieldset>
          <fieldset><legend>Subtopic</legend>{visibleSubtopics.map((subtopic)=><label key={subtopic.subtopic_id}><input type="checkbox" checked={subtopicIds.includes(subtopic.subtopic_id)} onChange={()=>toggle(subtopic.subtopic_id,subtopicIds,setSubtopicIds)}/><span>{subtopic.code} {subtopic.subtopic_title}</span></label>)}</fieldset></div>
        <section className="live-question-picker"><header><div><h3>Savol tanlash</h3><p>Automatic pool yoki source-ready savollarni qo‘lda tanlang.</p></div><select aria-label="Savol tanlash usuli" value={selectionMode} onChange={(event)=>setSelectionMode(event.target.value as 'auto'|'manual')}><option value="auto">Automatic</option><option value="manual">Manual</option></select></header>
          {selectionMode==='manual'?<><button type="button" className="live-secondary" disabled={busy||(!topicIds.length&&!subtopicIds.length)} onClick={()=>void loadQuestionPool()}>Eligible savollarni ko‘rsatish</button><p>{selectedQuestionIds.length} ta savol · {questionPool.filter((item)=>selectedQuestionIds.includes(item.id)).reduce((sum,item)=>sum+item.marks,0)} ball</p><div className="live-question-pool">{questionPool.map((question)=><label key={question.id} className={selectedQuestionIds.includes(question.id)?'is-selected':''}><input type="checkbox" checked={selectedQuestionIds.includes(question.id)} onChange={()=>toggle(question.id,selectedQuestionIds,setSelectedQuestionIds)}/><span><strong>{question.displayRef}</strong><small>{question.commandWord??'—'} · {question.marks} ball{question.hasAssets?' · diagramma':''}{question.dependencyCount?` · +${question.dependencyCount} majburiy oldingi qism`:''}</small><em>{question.stem}</em></span></label>)}</div></>:null}
        </section>
      </section>
      <aside className="live-create-side"><span className="live-step">2</span><h2>O‘yin qoidalari</h2>
        <label>Savollar soni<input name="questionCount" type="number" min={1} max={20} defaultValue={5} disabled={selectionMode==='manual'}/></label>
        <label>Tartib<select name="questionOrder" defaultValue="shuffled"><option value="shuffled">Aralashtirilgan</option><option value="fixed">Tanlangan tartib</option></select></label>
        <label>Har savol uchun vaqt<select name="timeLimit" defaultValue="5"><option value="">Cheklanmagan</option><option value="2">2 daqiqa</option><option value="3">3 daqiqa</option><option value="5">5 daqiqa</option><option value="10">10 daqiqa</option><option value="15">15 daqiqa</option></select></label>
        <label>Baholash<select name="markingMode" defaultValue="teacher"><option value="teacher">O‘qituvchi baholaydi</option><option value="peer">Anonim o‘zaro baholash</option><option value="self">O‘zini baholash</option></select></label>
        <label>Leaderboard<select name="leaderboardMode" defaultValue="marks"><option value="marks">Faqat Cambridge ballari</option><option value="marks_speed_tiebreak">Ball, teng bo‘lsa tezlik</option></select></label>
        <label className="live-check"><input name="includeDiagrams" type="checkbox" defaultChecked/><span>Diagramma va jadvallarni qo‘shish</span></label>
        <label className="live-check"><input name="excludeSeen" type="checkbox" defaultChecked/><span>Oldin ishlatilgan savollarni olmaslik</span></label>
        <label className="live-check"><input name="allowLateJoin" type="checkbox"/><span>Boshlanganidan keyin qo‘shilishga ruxsat</span></label>
        <label className="live-check"><input name="autoCloseWhenAllSubmitted" type="checkbox"/><span>Barcha javob berganda avtomatik yopish</span></label>
        <label className="live-check"><input name="teacherOverrideEnabled" type="checkbox" defaultChecked/><span>Peer/self bahoni o‘qituvchi tuzata oladi</span></label>
        <button disabled={busy||(!topicIds.length&&!subtopicIds.length)||!classes.length||(selectionMode==='manual'&&!selectedQuestionIds.length)}>{busy?'Yaratilmoqda…':'Xonani yaratish'}</button>
        {!classes.length?<small className="live-warning">Avval kamida bitta sinf yarating.</small>:null}
      </aside>
    </form>}
    <section className="live-history"><header><h2>{user.role==='student'?'Sessiyalarim':'Oxirgi sessiyalar'}</h2><span>{sessions.length}</span></header>
      {loading?<p className="live-empty">Yuklanmoqda…</p>:!sessions.length?<p className="live-empty">Hali live sessiya yo‘q.</p>:<div className="live-session-list">{sessions.map((session)=><button key={session.id} onClick={()=>navigate(`${user.role==='student'?'oquvchi':'oqitish'}/live?id=${session.id}`)}><span className={`live-state live-state--${session.status}`}>{STATUS_LABEL[session.status]}</span><strong>{session.title}</strong><small>{session.className} · {session.questionCount} savol · {session.participantCount} o‘quvchi</small><i>→</i></button>)}</div>}
    </section>
  </div>;
}

function ProjectorView({snapshot}:{snapshot:LiveExamSnapshot}) {
  const {session}=snapshot;
  const remaining=useCountdown(session.deadline,session.serverNow);
  return <div className="live-projector-overlay">
    <header><div className="live-projector-brand"><span/><strong>CamPath</strong><small>LIVE</small></div><div>{session.title}<small>{session.className}</small></div><time className={remaining!==null&&remaining<30?'is-urgent':''}>{formatClock(remaining)}</time></header>
    <main className={session.pausedAt?'is-paused':''}>
      {session.pausedAt?<section className="live-paused-card"><Broadcast size={56}/><span>CHALLENGE PAUZADA</span><h1>O‘qituvchi davom ettirishi kutilmoqda</h1></section>:null}
      {!session.pausedAt?<>
      {session.status==='lobby'?<section className="live-projector-lobby"><span>JOIN CODE</span><strong>{session.joinCode}</strong><p>{session.participantCount} o‘quvchi qo‘shildi</p></section>:null}
      {session.status==='question_open'&&snapshot.question?<><LiveQuestionView question={snapshot.question}/><div className="live-projector-count"><UsersThree size={32}/><strong>{session.submittedCount}/{session.participantCount}</strong><span>javob topshirdi</span></div></>:null}
      {session.status==='marking'&&snapshot.markScheme?<><MarkSchemeView scheme={snapshot.markScheme}/><div className="live-projector-count"><CheckCircle size={32}/><strong>{session.reviewedCount}/{session.reviewCount}</strong><span>baholash tugadi</span></div></>:null}
      {session.status==='review'?<LiveExamLeaderboard sessionId={session.id} version={session.version} variant="projector"/>:null}
      {session.status==='finished'?<section className="live-projector-result"><CheckCircle size={72} weight="fill"/><h1>Sessiya yakunlandi</h1><p>{session.questionCount} ta Cambridge savoli bajarildi.</p></section>:null}
      {session.status==='cancelled'?<section className="live-projector-result"><h1>Sessiya bekor qilindi</h1></section>:null}
      </>:null}
    </main>
    {session.status!=='lobby'?<SessionProgress snapshot={snapshot}/>:null}
  </div>;
}

function StudentRoom({snapshot,refresh}:{snapshot:LiveExamSnapshot;refresh:()=>Promise<void>}) {
  const {session}=snapshot;
  const [answer,setAnswer]=useState('');
  const [dirty,setDirty]=useState(false);
  const [saving,setSaving]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [manualScore,setManualScore]=useState(0);
  const [levelNumber,setLevelNumber]=useState<number|undefined>();
  const [feedback,setFeedback]=useState('');
  const saveTimer=useRef<number|undefined>(undefined);
  const retryTimer=useRef<number|undefined>(undefined);
  const pendingSave=useRef<string|null>(null);
  const answerKey=useRef('');
  const remaining=useCountdown(session.deadline,session.serverNow);
  const leave=async()=>{
    setBusy(true);setError('');
    try{await api(`/live-exams/${session.id}/leave`,{method:'POST'});navigate('oquvchi/live')}
    catch(cause){setError(message(cause,'Xonadan chiqib bo‘lmadi.'));setBusy(false)}
  };

  useEffect(()=>{
    const key=snapshot.ownAnswer?.id??snapshot.question?.id??'';
    if(key===answerKey.current)return;
    answerKey.current=key;
    const serverText=snapshot.ownAnswer?.text??'';
    setAnswer(serverText||readLiveDraft(liveDraftKey(session.id,key))||'');
    setDirty(false);
  },[session.id,snapshot.ownAnswer?.id,snapshot.ownAnswer?.text,snapshot.question?.id]);
  const draftKey=snapshot.ownAnswer?.id?snapshot.ownAnswer.id:snapshot.question?.id??'';
  useEffect(()=>{
    if(!draftKey||snapshot.ownAnswer?.submittedAt)return;
    writeLiveDraft(liveDraftKey(session.id,draftKey),answer);
  },[answer,draftKey,session.id,snapshot.ownAnswer?.submittedAt]);
  useEffect(()=>{setSelected(new Set());setManualScore(0);setLevelNumber(undefined);setFeedback('')},[snapshot.review?.id]);
  const flushAnswer=async(text=answer,attempt=0)=>{
    if(!text||session.status!=='question_open'||session.pausedAt||snapshot.ownAnswer?.submittedAt)return;
    pendingSave.current=text;
    setSaving(true);
    try{
      await api(`/live-exams/${session.id}/answer`,{method:'PUT',body:JSON.stringify({text})});
      if(pendingSave.current===text){pendingSave.current=null;setDirty(false);setError('')}
    }catch(cause){
      setError(message(cause,'Javob saqlanmadi. Ulanish tiklanganda qayta uriniladi.'));
      if(attempt<4){window.clearTimeout(retryTimer.current);retryTimer.current=window.setTimeout(()=>void flushAnswer(text,attempt+1),2**attempt*1000)}
    }finally{setSaving(false)}
  };
  useEffect(()=>{
    if(!dirty||session.status!=='question_open'||session.pausedAt||snapshot.ownAnswer?.submittedAt)return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current=window.setTimeout(()=>void flushAnswer(answer),700);
    return()=>window.clearTimeout(saveTimer.current);
  },[answer,dirty,session.id,session.pausedAt,session.status,snapshot.ownAnswer?.submittedAt]);
  useEffect(()=>{
    const retry=()=>{if(pendingSave.current)void flushAnswer(pendingSave.current)};
    const flush=()=>{if(dirty&&pendingSave.current)void flushAnswer(pendingSave.current)};
    window.addEventListener('online',retry);
    window.addEventListener('visibilitychange',flush);
    window.addEventListener('pagehide',flush);
    return()=>{window.removeEventListener('online',retry);window.removeEventListener('visibilitychange',flush);window.removeEventListener('pagehide',flush);window.clearTimeout(retryTimer.current)};
  },[dirty]);

  const submitAnswer=async()=>{
    setBusy(true);setError('');
    try{await api(`/live-exams/${session.id}/answer/submit`,{method:'POST',body:JSON.stringify({text:answer})});if(draftKey)removeLiveDraft(liveDraftKey(session.id,draftKey));setDirty(false);await refresh()}
    catch(cause){setError(message(cause,'Javob topshirilmadi.'))}finally{setBusy(false)}
  };
  const submitReview=async()=>{
    if(!snapshot.review)return;setBusy(true);setError('');
    try{await api(`/live-exams/${session.id}/reviews/${snapshot.review.id}/submit`,{method:'POST',body:JSON.stringify({matchedPointIds:[...selected],score:manualScore,levelNumber,feedback:feedback||undefined})});await refresh()}
    catch(cause){setError(message(cause,'Baholash yuborilmadi.'))}finally{setBusy(false)}
  };

  if(session.status==='lobby')return <section className="live-wait"><div className="live-pulse"><Broadcast size={42}/></div><span>XONAGA QO‘SHILDINGIZ</span><h1>{session.title}</h1><p>O‘qituvchi o‘yinni boshlashi kutilmoqda.</p><strong>{session.participantCount} o‘quvchi tayyor</strong>{error?<p className="live-error" role="alert">{error}</p>:null}<button className="live-secondary" disabled={busy} onClick={()=>void leave()}>Xonadan chiqish</button></section>;
  if(session.pausedAt)return <section className="live-wait"><div className="live-pulse"><Broadcast size={42}/></div><span>CHALLENGE PAUZADA</span><h1>{session.title}</h1><p>Javob va baholash vaqtincha to‘xtatildi. O‘qituvchi davom ettirishi kutilmoqda.</p></section>;
  if(session.status==='question_open'&&snapshot.question)return <div className="live-student-workspace">
    <header><button className="live-icon-button" onClick={()=>navigate('oquvchi/live')} aria-label="Sessiyalarga qaytish"><ArrowLeft/></button><div><strong>{session.title}</strong><small>{saving?'Saqlanmoqda…':dirty?'O‘zgarish bor':'✓ Sinxronlandi'}</small></div><time className={remaining!==null&&remaining<30?'is-urgent':''}>{formatClock(remaining)}</time></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}<SessionProgress snapshot={snapshot}/><LiveQuestionView question={snapshot.question}/>
    <section className="live-answer-box"><header><label htmlFor="live-answer">Javobingiz</label><span>{answer.trim()?answer.trim().split(/\s+/).length:0} so‘z</span></header><textarea id="live-answer" value={answer} disabled={Boolean(snapshot.ownAnswer?.submittedAt)||remaining===0||Boolean(session.pausedAt)} onChange={(event)=>{setAnswer(event.target.value);setDirty(true)}} placeholder="Javobingizni shu yerga yozing…"/><button disabled={busy||Boolean(snapshot.ownAnswer?.submittedAt)||Boolean(session.pausedAt)} onClick={submitAnswer}>{snapshot.ownAnswer?.submittedAt?'Topshirildi ✓':busy?'Yuborilmoqda…':'Javobni topshirish'}</button></section>
  </div>;
  if(session.status==='marking'&&snapshot.markScheme)return <div className="live-marking-layout"><div><MarkSchemeView scheme={snapshot.markScheme}/></div><aside className="live-review-card">
    {!snapshot.review?<><h2>Baholash kutilmoqda</h2><p>O‘qituvchi sizga javob biriktirmoqda.</p></>:snapshot.review.status!=='assigned'?<><CheckCircle size={54} weight="fill"/><h2>Baholash yuborildi</h2><p>O‘qituvchi barcha baholashlarni yakunlashi kutilmoqda.</p><strong>{snapshot.review.awardedMarks}/{snapshot.question?.marks} ball</strong></>:<><span className="live-eyebrow">{snapshot.review.kind==='peer'?'ANONIM JAVOB':snapshot.review.kind==='self'?'O‘Z JAVOBINGIZ':'JAVOB'}</span><h2>Mark scheme asosida tekshiring</h2><blockquote>{snapshot.review.answerText||'Javob yozilmagan'}</blockquote><MarkSchemeView scheme={{...snapshot.markScheme,points:snapshot.review.points}} interactive selected={selected} onToggle={(id)=>setSelected((current)=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}/>{snapshot.markScheme.levels.length?<label>Rasmiy band<select value={levelNumber??''} onChange={(e)=>{const level=snapshot.markScheme?.levels.find((item)=>item.levelNumber===Number(e.target.value));setLevelNumber(level?.levelNumber);if(level)setManualScore(level.minMarks)}}><option value="">Bandni tanlang</option>{snapshot.markScheme.levels.map((level)=><option key={level.id} value={level.levelNumber}>Level {level.levelNumber}: {level.minMarks}–{level.maxMarks} ball</option>)}</select></label>:null}{schemeNeedsManualScore(snapshot.markScheme)?<label>Ball<input type="number" min={snapshot.markScheme.levels.find((level)=>level.levelNumber===levelNumber)?.minMarks??0} max={snapshot.markScheme.levels.find((level)=>level.levelNumber===levelNumber)?.maxMarks??snapshot.question?.marks??0} value={manualScore} onChange={(e)=>setManualScore(Number(e.target.value))}/></label>:null}<label>Qisqa izoh<textarea value={feedback} maxLength={5000} onChange={(e)=>setFeedback(e.target.value)} placeholder="Nima uchun shu ballni berdingiz?"/></label>{error?<p className="live-error" role="alert">{error}</p>:null}<button disabled={busy} onClick={submitReview}>{busy?'Yuborilmoqda…':'Baholashni yuborish'}</button></>}
  </aside></div>;
  if(session.status==='review')return <section className="live-student-result"><span className="live-eyebrow">SAVOL NATIJASI</span><h1>{snapshot.ownAnswer?.score??'—'} <small>/ {snapshot.question?.marks}</small></h1><p>{snapshot.ownAnswer?.feedback||'Mark scheme pointlari asosida baholandi.'}</p><div><h2>Sizning javobingiz</h2><blockquote>{snapshot.ownAnswer?.text||'Javob yozilmagan'}</blockquote></div>{snapshot.markScheme?<MarkSchemeView scheme={snapshot.markScheme}/>:null}<p className="live-wait-note">O‘qituvchi keyingi savolni ochishi kutilmoqda.</p></section>;
  if(session.status==='finished')return <section className="live-student-result live-finished"><CheckCircle size={64} weight="fill"/><span className="live-eyebrow">SESSIYA YAKUNLANDI</span><h1>{session.title}</h1><p>{session.questionCount} ta savol bajarildi. Natijalar saqlandi.</p>{snapshot.report?<><strong className="live-total-score">{snapshot.report.earned} / {snapshot.report.possible}</strong><div className="live-report-list">{snapshot.report.rows.map((row)=><article key={`${row.questionPosition}-${row.displayRef}`}><span>Savol {row.questionPosition+1}</span><strong>{row.displayRef}</strong><b>{row.score??'—'} / {row.marks}</b></article>)}</div></>:null}<button onClick={()=>navigate('oquvchi/live')}>Sessiyalarimga qaytish</button></section>;
  return <section className="live-wait"><h1>Sessiya bekor qilindi</h1><button onClick={()=>navigate('oquvchi/live')}>Ortga</button></section>;
}

function TeacherAnswerMarker({snapshot,answer,onDone}:{snapshot:LiveExamSnapshot;answer:LiveExamAnswer&{studentName:string;reviewId:string|null;reviewStatus:string|null};onDone:()=>void}) {
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [score,setScore]=useState(answer.score??0);
  const [levelNumber,setLevelNumber]=useState<number|undefined>();
  const [feedback,setFeedback]=useState(answer.feedback??'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const submit=async()=>{
    setBusy(true);setError('');
    try{
      if(answer.reviewStatus==='assigned'&&answer.reviewId)await api(`/live-exams/${snapshot.session.id}/reviews/${answer.reviewId}/submit`,{method:'POST',body:JSON.stringify({matchedPointIds:[...selected],score,levelNumber,feedback:feedback||undefined})});
      else await api(`/live-exams/${snapshot.session.id}/answers/${answer.id}/moderate`,{method:'PUT',body:JSON.stringify({score,feedback:feedback||undefined})});
      onDone();
    }catch(cause){setError(message(cause,'Baho saqlanmadi.'));setBusy(false)}
  };
  const scheme=snapshot.markScheme;
  return <article className="live-teacher-marker"><header><div><span>O‘QUVCHI JAVOBI</span><h2>{answer.studentName}</h2></div><strong>{answer.score??0}/{snapshot.question?.marks}</strong></header><blockquote>{answer.text||'Javob yozilmagan'}</blockquote>
    {scheme?<MarkSchemeView scheme={scheme} interactive={answer.reviewStatus==='assigned'} selected={selected} onToggle={(id)=>setSelected((current)=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}/>:null}
    {scheme?.levels.length?<label>Rasmiy band<select value={levelNumber??''} onChange={(e)=>{const level=scheme.levels.find((item)=>item.levelNumber===Number(e.target.value));setLevelNumber(level?.levelNumber);if(level)setScore(level.minMarks)}}><option value="">Bandni tanlang</option>{scheme.levels.map((level)=><option key={level.id} value={level.levelNumber}>Level {level.levelNumber}: {level.minMarks}–{level.maxMarks} ball</option>)}</select></label>:null}
    {(schemeNeedsManualScore(scheme)||answer.reviewStatus!=='assigned')?<label>Ball<input type="number" min={scheme?.levels.find((level)=>level.levelNumber===levelNumber)?.minMarks??0} max={scheme?.levels.find((level)=>level.levelNumber===levelNumber)?.maxMarks??snapshot.question?.marks??0} value={score} onChange={(e)=>setScore(Number(e.target.value))}/></label>:null}
    <label>Izoh<textarea value={feedback} onChange={(e)=>setFeedback(e.target.value)} maxLength={5000}/></label>{error?<p className="live-error">{error}</p>:null}<button disabled={busy||Boolean(snapshot.session.pausedAt)} onClick={submit}>{busy?'Saqlanmoqda…':answer.reviewStatus==='assigned'?'Bahoni tasdiqlash':'Bahoni yangilash'}</button>
  </article>;
}

function TeacherRoom({snapshot,refresh}:{snapshot:LiveExamSnapshot;refresh:()=>Promise<void>}) {
  const {session}=snapshot;
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [activeAnswerId,setActiveAnswerId]=useState('');
  const remaining=useCountdown(session.deadline,session.serverNow);
  const activeAnswer=snapshot.teacherAnswers.find((item)=>item.id===activeAnswerId)??snapshot.teacherAnswers.find((item)=>item.reviewStatus==='assigned')??snapshot.teacherAnswers[0];
  const act=async(path:string,body?:Record<string, unknown>)=>{setBusy(true);setError('');try{const payload=body??{};if(!('expectedVersion' in payload)&&['/start','/reveal','/marking/complete','/next','/cancel'].includes(path))payload.expectedVersion=session.version;await api(`/live-exams/${session.id}${path}`,{method:'POST',body:JSON.stringify(payload)});await refresh()}catch(cause){setError(message(cause,'Amal bajarilmadi.'))}finally{setBusy(false)}};
  const removeParticipant=async(studentId:string,fullName:string)=>{
    if(!window.confirm(`${fullName} xonadan chiqarilsinmi?`))return;
    await act(`/participants/${studentId}/remove`,{expectedVersion:session.version});
  };
  const copyCode=()=>void navigator.clipboard?.writeText(session.joinCode);
  const openProjector=()=>window.open(`${window.location.href.split('#')[0]}#oqitish/live?id=${session.id}&projector=1`,'campath-projector','noopener,noreferrer');

  return <div className="live-page live-room"><header className="live-room-head"><button className="live-icon-button" onClick={()=>navigate('oqitish/live')} aria-label="Live sessiyalarga qaytish"><ArrowLeft/></button><div><span className={`live-state live-state--${session.status}`}>{session.pausedAt?'Pauzada':STATUS_LABEL[session.status]}</span><h1>{session.title}</h1><p>{session.className} · {MODE_LABEL[session.markingMode]}</p></div><div className="live-room-actions"><button className="live-secondary" onClick={openProjector}><Monitor/> Proyektor</button><button className="live-secondary" onClick={()=>void refresh()}><ArrowsClockwise/> Yangilash</button>{['question_open','marking','review'].includes(session.status)?<button className="live-secondary" disabled={busy} onClick={()=>void act(session.pausedAt?'/resume':'/pause',{expectedVersion:session.version})}>{session.pausedAt?'Davom ettirish':'Pauza'}</button>:null}{!['finished','cancelled'].includes(session.status)?<button className="live-danger" disabled={busy} onClick={()=>{if(window.confirm('Live sessiyani bekor qilmoqchimisiz? Bu amalni ortga qaytarib bo‘lmaydi.'))void act('/cancel')}}>Bekor qilish</button>:null}</div></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    {session.pausedAt?<section className="live-paused-banner"><strong>Challenge pauzada</strong><span>Student javobi va baholash bloklangan; timer muzlatilgan.</span></section>:null}
    {session.status==='lobby'?<div className="live-lobby-layout"><section className="live-code-card"><span>JOIN CODE</span><strong>{session.joinCode}</strong><button onClick={copyCode}><Copy/> Kodni nusxalash</button><p>O‘quvchilar akkauntiga kirib, “Live Challenge” bo‘limida kodni kiritadi.</p><button className="live-start" disabled={busy||session.participantCount<1} onClick={()=>void act('/start')}>{busy?'Boshlanmoqda…':'O‘yinni boshlash'}</button></section><LobbyParticipants snapshot={snapshot} busy={busy} onRemove={(studentId,fullName)=>void removeParticipant(studentId,fullName)}/></div>:null}
    {session.status==='question_open'&&snapshot.question?<><SessionProgress snapshot={snapshot}/><div className="live-teacher-question"><div><LiveQuestionView question={snapshot.question}/></div><aside><div className="live-timer-card"><span>QOLGAN VAQT</span><strong className={remaining!==null&&remaining<30?'is-urgent':''}>{session.pausedAt?formatClock(session.pauseRemainingS):formatClock(remaining)}</strong></div><div className="live-submit-stat"><strong>{session.submittedCount}</strong><span>/ {session.participantCount} topshirdi</span><progress max={Math.max(1,session.participantCount)} value={session.submittedCount}/></div><ul className="live-submit-list">{snapshot.participants.map((person)=><li key={person.id}><span>{person.fullName}</span><b className={person.submitted?'is-done':''}>{person.submitted?'Topshirdi':'Yozmoqda'}</b></li>)}</ul><button disabled={busy||Boolean(session.pausedAt)} onClick={()=>void act('/reveal')}>Javoblarni yopish va MSni ochish</button><small>Topshirmagan javoblar bo‘sh holatda avtomatik yopiladi.</small></aside></div></>:null}
    {session.status==='marking'?<><SessionProgress snapshot={snapshot}/><div className="live-marking-head"><div><span className="live-eyebrow">BAHOLASH</span><h2>{session.reviewedCount}/{session.reviewCount} ta tugadi</h2></div><div className="live-marking-actions"><button disabled={busy||Boolean(session.pausedAt)||session.reviewedCount<session.reviewCount} onClick={()=>void act('/marking/complete')}>Natijalarni ochish</button>{session.reviewedCount<session.reviewCount?<button className="live-secondary" disabled={busy||Boolean(session.pausedAt)} onClick={()=>{if(window.confirm('Tugallanmagan baholashlar 0 ball bilan yopilsinmi?'))void act('/marking/complete',{force:true})}}>Kutilayotganlarsiz davom etish</button>:null}</div></div>
      {session.markingMode==='teacher'&&activeAnswer?<div className="live-teacher-marking"><nav>{snapshot.teacherAnswers.map((answer,index)=><button className={activeAnswer.id===answer.id?'is-active':''} key={answer.id} onClick={()=>setActiveAnswerId(answer.id)}><span>{index+1}</span><strong>{answer.studentName}</strong><i>{answer.reviewStatus==='assigned'?'Kutilmoqda':`${answer.score??0}/${snapshot.question?.marks}`}</i></button>)}</nav><TeacherAnswerMarker key={`${activeAnswer.id}:${activeAnswer.reviewStatus}:${activeAnswer.score}`} snapshot={snapshot} answer={activeAnswer} onDone={()=>{setActiveAnswerId('');void refresh()}}/></div>:null}
      {session.markingMode!=='teacher'?<div className="live-peer-progress"><MarkSchemeView scheme={snapshot.markScheme!}/><section><h2>{MODE_LABEL[session.markingMode]}</h2><p>O‘quvchilar mark scheme asosida baholamoqda. Ismlar faqat o‘qituvchi ekranida ko‘rinadi.</p>{snapshot.teacherAnswers.map((answer)=><div key={answer.id}><span><strong>{answer.studentName}</strong><small>{answer.reviewStatus==='assigned'?'Baholamoqda':'Yakunladi'}</small></span><b>{answer.score===null?'—':`${answer.score}/${snapshot.question?.marks}`}</b></div>)}</section></div>:null}
    </>:null}
    {session.status==='review'?<><section className="live-review-summary"><div><span className="live-eyebrow">SAVOL YAKUNI</span><h2>Natijalarni ko‘rib chiqing</h2><p>{session.settings.teacherOverrideEnabled?'Peer va self baholarni kerak bo‘lsa o‘qituvchi tuzatishi mumkin.':'Peer va self baholar final; teacher override o‘chirilgan.'}</p></div><button disabled={busy||Boolean(session.pausedAt)} onClick={()=>void act('/next')}>{session.currentQuestionIndex+1<session.questionCount?'Keyingi savol →':'Sessiyani yakunlash'}</button></section><LiveExamLeaderboard sessionId={session.id} version={session.version}/><div className="live-result-table"><header><span>O‘quvchi</span><span>Baholash</span><span>Ball</span></header>{snapshot.teacherAnswers.map((answer)=><div key={answer.id}><strong>{answer.studentName}</strong><span>{answer.scoreSource?MODE_LABEL[answer.scoreSource]:'Baholanmagan'}</span><b>{answer.score??'—'} / {snapshot.question?.marks}</b></div>)}</div>{snapshot.markScheme?<MarkSchemeView scheme={snapshot.markScheme}/>:null}</>:null}
    {session.status==='finished'?<section className="live-finished live-teacher-finished"><CheckCircle size={64} weight="fill"/><span className="live-eyebrow">SESSIYA YAKUNLANDI</span><h1>{session.questionCount} ta savol bajarildi</h1><p>Barcha javoblar, baholar va audit voqealari saqlandi.</p>{snapshot.report?<><strong className="live-total-score">{snapshot.report.earned} / {snapshot.report.possible} sinf ballari</strong><div className="live-report-list">{snapshot.report.rows.map((row,index)=><article key={`${row.studentId}-${row.questionPosition}-${index}`}><span>Savol {row.questionPosition+1}</span><strong>{row.studentName} · {row.displayRef}</strong><b>{row.score??'—'} / {row.marks}</b></article>)}</div></>:null}<button onClick={()=>navigate('oqitish/live')}>Sessiyalar ro‘yxati</button></section>:null}
    {session.status==='cancelled'?<section className="live-finished"><h1>Sessiya bekor qilingan</h1><button onClick={()=>navigate('oqitish/live')}>Ortga</button></section>:null}
  </div>;
}

function LiveRoom({user,sessionId,projector}:{user:User;sessionId:string;projector:boolean}) {
  const {snapshot,error,loading,refresh}=useLiveSnapshot(sessionId);
  if(loading&&!snapshot)return <p className="live-loading">Live sessiya yuklanmoqda…</p>;
  if(error&&!snapshot)return <div className="live-page"><p className="live-error">{error}</p><button onClick={()=>navigate(`${user.role==='student'?'oquvchi':'oqitish'}/live`)}>Ortga</button></div>;
  if(!snapshot)return null;
  if(projector&&user.role!=='student')return <ProjectorView snapshot={snapshot}/>;
  return user.role==='student'?<StudentRoom snapshot={snapshot} refresh={()=>refresh()}/>:<TeacherRoom snapshot={snapshot} refresh={()=>refresh()}/>;
}

export function LiveExamPage({user,classes}:{user:User;classes:ClassItem[]}) {
  const route=useRoute();
  const sessionId=route.params.get('id');
  const projector=route.params.get('projector')==='1';
  return sessionId?<LiveRoom user={user} sessionId={sessionId} projector={projector}/>:<LiveLanding user={user} classes={classes}/>;
}
