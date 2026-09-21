import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowsClockwise, Broadcast, CheckCircle, Copy, Monitor, UsersThree } from '@phosphor-icons/react';
import {
  api,
  ApiError,
  type ClassItem,
  type LiveExamAnswer,
  type LiveExamBoardSnapshot,
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
type DraftBuilder = {
  selectedQuestionIds:string[];
  questions:Array<{id:string;questionId:string;position:number;marks:number;displayRef:string}>;
};

const EMPTY_OPTIONS:FilterOptions = { topics:[] };

const STATUS_LABEL:Record<LiveExamStatus,string> = {
  draft:'Draft',published:'Nashr qilingan',lobby:'Kutilmoqda',question_open:'Savol ochiq',
  answers_locked:'Javoblar yopildi',marking:'Baholash',review:'Natijani ko‘rish',
  finished:'Yakunlangan',cancelled:'Bekor qilingan',
};
const MODE_LABEL:Record<LiveExamMarkingMode,string> = {
  teacher:'O‘qituvchi baholaydi',peer:'Anonim o‘zaro baholash',self:'O‘zini baholash',
};

function message(error:unknown,fallback:string) {
  return error instanceof Error ? error.message : fallback;
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
    }catch(cause){
      if(cause instanceof ApiError&&cause.status===404){
        setSnapshot(null);
        setError('Bu Live Challenge sessiyasiga kirish huquqi qolmagan yoki sessiya mavjud emas.');
      }else if(!silent)setError(message(cause,'Live sessiya yuklanmadi.'));
    }
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

function useLiveBoard(sessionId:string) {
  const [snapshot,setSnapshot]=useState<LiveExamBoardSnapshot|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const request=useRef(false);
  const refresh=useCallback(async(silent=false)=>{
    if(request.current)return;
    request.current=true;
    try{
      const result=await api<{data:LiveExamBoardSnapshot}>(`/live-exams/${sessionId}/board`);
      setSnapshot(result.data);
      setError('');
    }catch(cause){if(!silent)setError(message(cause,'Proyektor holati yuklanmadi.'))}
    finally{request.current=false;setLoading(false)}
  },[sessionId]);
  useEffect(()=>{
    void refresh();
    const timer=window.setInterval(()=>void refresh(true),1500);
    const visible=()=>{if(document.visibilityState==='visible')void refresh(true)};
    document.addEventListener('visibilitychange',visible);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
  },[refresh]);
  return{snapshot,error,loading};
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
        {dependency.ownAnswer!==null?<pre>{dependency.ownAnswer||'Javob bo‘sh topshirilgan.'}</pre>:<p>{dependency.position===null?'Bu majburiy qism sessiyada topilmadi.':'Oldingi javob mavjud emas — siz bu qism bajarilgandan keyin qo‘shilgan bo‘lishingiz mumkin.'}</p>}
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
  const [includeDiagrams,setIncludeDiagrams]=useState(true);
  const [excludeSeen,setExcludeSeen]=useState(true);

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
        topicIds:topicIds.join(','),subtopicIds:subtopicIds.join(','),
        includeDiagrams:String(includeDiagrams),excludeSeen:String(excludeSeen),limit:'30',
      });
      const result=await api<{data:EligibleQuestion[]}>(`/live-exams/eligible-questions?${params}`);
      setQuestionPool(result.data);setSelectedQuestionIds((current)=>current.filter((id)=>result.data.some((item)=>item.id===id)));
    }catch(cause){setError(message(cause,'Savollar havzasi yuklanmadi.'))}finally{setBusy(false)}
  };

  const create=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setBusy(true);setError('');
    const data=new FormData(event.currentTarget);
    try{
      const draft=await api<{id:string;version:number}>('/live-exams/drafts',{method:'POST',body:JSON.stringify({
        classId:data.get('classId'),title:data.get('title'),topicIds,subtopicIds,
        questionTimeLimitS:data.get('timeLimit')?Number(data.get('timeLimit'))*60:undefined,
        markingMode:data.get('markingMode'),includeDiagrams,excludeSeen,
        questionOrder:data.get('questionOrder'),allowLateJoin:data.get('allowLateJoin')==='on',
        autoCloseWhenAllSubmitted:data.get('autoCloseWhenAllSubmitted')==='on',
        teacherOverrideEnabled:data.get('teacherOverrideEnabled')==='on',leaderboardMode:data.get('leaderboardMode'),
      })});
      const selection=selectionMode==='manual'
        ? await api<{version:number}>(`/live-exams/${draft.id}/questions`,{method:'PUT',body:JSON.stringify({
            questionIds:selectedQuestionIds,expectedVersion:draft.version,
          })})
        : await api<{version:number}>(`/live-exams/${draft.id}/questions/auto`,{method:'POST',body:JSON.stringify({
            count:Number(data.get('questionCount')),expectedVersion:draft.version,
          })});
      void selection;
      navigate(`oqitish/live?id=${draft.id}`);
    }catch(cause){setError(message(cause,'Live Challenge drafti tayyorlanmadi. Yarim saqlangan draft sessiyalar ro‘yxatida ko‘rinishi mumkin.'));setBusy(false)}
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
        <div className="live-topic-grid"><fieldset><legend>Topic</legend>{topics.map((topic)=><label key={topic.topic_id}><input type="checkbox" checked={topicIds.includes(topic.topic_id)} onChange={()=>{toggle(topic.topic_id,topicIds,setTopicIds);setSubtopicIds((current)=>current.filter((id)=>syllabusTopics.some((row)=>row.subtopic_id===id&&row.topic_id!==topic.topic_id)));setQuestionPool([]);setSelectedQuestionIds([])}}/><span>{topic.topic_number}. {topic.topic_title}</span></label>)}</fieldset>
          <fieldset><legend>Subtopic</legend>{visibleSubtopics.map((subtopic)=><label key={subtopic.subtopic_id}><input type="checkbox" checked={subtopicIds.includes(subtopic.subtopic_id)} onChange={()=>{toggle(subtopic.subtopic_id,subtopicIds,setSubtopicIds);setQuestionPool([]);setSelectedQuestionIds([])}}/><span>{subtopic.code} {subtopic.subtopic_title}</span></label>)}</fieldset></div>
        <section className="live-question-picker"><header><div><h3>Savol tanlash</h3><p>Automatic pool yoki source-ready savollarni qo‘lda tanlang.</p></div><select aria-label="Savol tanlash usuli" value={selectionMode} onChange={(event)=>setSelectionMode(event.target.value as 'auto'|'manual')}><option value="auto">Automatic</option><option value="manual">Manual</option></select></header>
          {selectionMode==='manual'?<><button type="button" className="live-secondary" disabled={busy||(!topicIds.length&&!subtopicIds.length)} onClick={()=>void loadQuestionPool()}>Eligible savollarni ko‘rsatish</button><p>{selectedQuestionIds.length} ta savol · {questionPool.filter((item)=>selectedQuestionIds.includes(item.id)).reduce((sum,item)=>sum+item.marks,0)} ball</p><div className="live-question-pool">{questionPool.map((question)=><label key={question.id} className={selectedQuestionIds.includes(question.id)?'is-selected':''}><input type="checkbox" checked={selectedQuestionIds.includes(question.id)} disabled={!selectedQuestionIds.includes(question.id)&&selectedQuestionIds.length>=20} onChange={()=>toggle(question.id,selectedQuestionIds,setSelectedQuestionIds)}/><span><strong>{question.displayRef}</strong><small>{question.commandWord??'—'} · {question.marks} ball{question.hasAssets?' · diagramma':''}{question.dependencyCount?` · +${question.dependencyCount} majburiy oldingi qism`:''}</small><em>{question.stem}</em></span></label>)}</div></>:null}
        </section>
      </section>
      <aside className="live-create-side"><span className="live-step">2</span><h2>O‘yin qoidalari</h2>
        <label>Savollar soni<input name="questionCount" type="number" min={1} max={20} defaultValue={5} disabled={selectionMode==='manual'}/></label>
        <label>Tartib<select name="questionOrder" defaultValue="shuffled"><option value="shuffled">Aralashtirilgan</option><option value="fixed">Tanlangan tartib</option></select></label>
        <label>Har savol uchun vaqt<select name="timeLimit" defaultValue="5"><option value="">Cheklanmagan</option><option value="2">2 daqiqa</option><option value="3">3 daqiqa</option><option value="5">5 daqiqa</option><option value="10">10 daqiqa</option><option value="15">15 daqiqa</option></select></label>
        <label>Baholash<select name="markingMode" defaultValue="teacher"><option value="teacher">O‘qituvchi baholaydi</option><option value="peer">Anonim o‘zaro baholash</option><option value="self">O‘zini baholash</option></select></label>
        <label>Leaderboard<select name="leaderboardMode" defaultValue="marks"><option value="marks">Faqat Cambridge ballari</option><option value="marks_speed_tiebreak">Ball, teng bo‘lsa tezlik</option></select></label>
        <label className="live-check"><input name="includeDiagrams" type="checkbox" checked={includeDiagrams} onChange={(event)=>{setIncludeDiagrams(event.target.checked);setQuestionPool([]);setSelectedQuestionIds([])}}/><span>Diagramma va jadvallarni qo‘shish</span></label>
        <label className="live-check"><input name="excludeSeen" type="checkbox" checked={excludeSeen} onChange={(event)=>{setExcludeSeen(event.target.checked);setQuestionPool([]);setSelectedQuestionIds([])}}/><span>Oldin ishlatilgan savollarni olmaslik</span></label>
        <label className="live-check"><input name="allowLateJoin" type="checkbox"/><span>Boshlanganidan keyin qo‘shilishga ruxsat</span></label>
        <label className="live-check"><input name="autoCloseWhenAllSubmitted" type="checkbox"/><span>Barcha javob berganda avtomatik yopish</span></label>
        <label className="live-check"><input name="teacherOverrideEnabled" type="checkbox" defaultChecked/><span>Peer/self bahoni o‘qituvchi tuzata oladi</span></label>
        <button disabled={busy||(!topicIds.length&&!subtopicIds.length)||!classes.length||(selectionMode==='manual'&&!selectedQuestionIds.length)}>{busy?'Saqlanmoqda…':'Draft yaratish'}</button>
        {!classes.length?<small className="live-warning">Avval kamida bitta sinf yarating.</small>:null}
      </aside>
    </form>}
    <section className="live-history"><header><h2>{user.role==='student'?'Sessiyalarim':'Oxirgi sessiyalar'}</h2><span>{sessions.length}</span></header>
      {loading?<p className="live-empty">Yuklanmoqda…</p>:!sessions.length?<p className="live-empty">Hali live sessiya yo‘q.</p>:<div className="live-session-list">{sessions.map((session)=>{const joined=user.role!=='student'||session.joined===true;return <button key={session.id} onClick={()=>navigate(joined?`${user.role==='student'?'oquvchi':'oqitish'}/live?id=${session.id}`:'oquvchi/live')}><span className={`live-state live-state--${session.status}`}>{STATUS_LABEL[session.status]}</span><strong>{session.title}</strong><small>{session.className} · {session.questionCount} savol · {session.participantCount} o‘quvchi{!joined?' · kod bilan qo‘shiling':''}</small><i>→</i></button>})}</div>}
    </section>
  </div>;
}

function ProjectorView({snapshot,sessionId}:{snapshot:LiveExamBoardSnapshot;sessionId:string}) {
  const {session}=snapshot;
  const remaining=useCountdown(session.deadline,session.serverNow);
  return <div className="live-projector-overlay">
    <header><div className="live-projector-brand"><span/><strong>CamPath</strong><small>LIVE</small></div><div>{session.title}<small>{session.className}</small></div><time className={remaining!==null&&remaining<30?'is-urgent':''}>{formatClock(remaining)}</time></header>
    <main className={session.pausedAt?'is-paused':''}>
      {session.pausedAt?<section className="live-paused-card"><Broadcast size={56}/><span>CHALLENGE PAUZADA</span><h1>O‘qituvchi davom ettirishi kutilmoqda</h1></section>:null}
      {!session.pausedAt?<>
      {session.status==='draft'?<section className="live-projector-result"><h1>Challenge draft holatida</h1><p>O‘qituvchi savollarni yakunlashi kutilmoqda.</p></section>:null}
      {session.status==='published'?<section className="live-projector-result"><h1>Challenge tayyor</h1><p>Lobby ochilishi kutilmoqda.</p></section>:null}
      {session.status==='lobby'?<section className="live-projector-lobby"><span>JOIN CODE</span><strong>{session.joinCode}</strong><p>{session.participantCount} o‘quvchi qo‘shildi</p></section>:null}
      {session.status==='question_open'&&snapshot.question?<><LiveQuestionView question={snapshot.question}/><div className="live-projector-count"><UsersThree size={32}/><strong>{session.submittedCount}/{session.participantCount}</strong><span>javob topshirdi</span></div></>:null}
      {session.status==='answers_locked'?<section className="live-projector-result"><CheckCircle size={72} weight="fill"/><h1>Javoblar yopildi</h1><p>Official Mark Scheme ochilishi kutilmoqda.</p></section>:null}
      {session.status==='marking'&&snapshot.markScheme?<><MarkSchemeView scheme={snapshot.markScheme}/><div className="live-projector-count"><CheckCircle size={32}/><strong>{session.reviewedCount}/{session.reviewCount}</strong><span>baholash tugadi</span></div></>:null}
      {session.status==='review'?<LiveExamLeaderboard sessionId={sessionId} version={session.version} variant="projector"/>:null}
      {session.status==='finished'?<><section className="live-projector-result"><CheckCircle size={72} weight="fill"/><h1>Sessiya yakunlandi</h1><p>{session.questionCount} ta Cambridge savoli bajarildi.</p></section><LiveExamLeaderboard sessionId={sessionId} version={session.version} variant="projector"/></>:null}
      {session.status==='cancelled'?<section className="live-projector-result"><h1>Sessiya bekor qilindi</h1></section>:null}
      </>:null}
    </main>
    {session.currentQuestionIndex>=0?<div className="live-progress" aria-label={`Savol ${session.currentQuestionIndex+1}, jami ${session.questionCount}`}>{Array.from({length:session.questionCount},(_,index)=><i key={index} className={index<session.currentQuestionIndex?'is-done':index===session.currentQuestionIndex?'is-current':''}/>)}</div>:null}
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
  const [feedback,setFeedback]=useState('');
  const saveTimer=useRef<number|undefined>(undefined);
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
    setAnswer(snapshot.ownAnswer?.text??'');
    setDirty(false);
  },[snapshot.ownAnswer?.id,snapshot.ownAnswer?.text,snapshot.question?.id]);
  useEffect(()=>{setSelected(new Set());setManualScore(0);setFeedback('')},[snapshot.review?.id]);
  useEffect(()=>{setError('')},[snapshot.question?.id,session.status]);
  useEffect(()=>{
    if(!dirty||session.status!=='question_open'||session.pausedAt||snapshot.ownAnswer?.submittedAt)return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current=window.setTimeout(async()=>{
      setSaving(true);
      try{if(!snapshot.question)return;await api(`/live-exams/${session.id}/answer`,{method:'PUT',body:JSON.stringify({questionId:snapshot.question.id,text:answer})});setDirty(false)}
      catch(cause){setError(message(cause,'Javob saqlanmadi.'))}finally{setSaving(false)}
    },700);
    return()=>window.clearTimeout(saveTimer.current);
  },[answer,dirty,session.id,session.pausedAt,session.status,snapshot.ownAnswer?.submittedAt]);

  const submitAnswer=async()=>{
    window.clearTimeout(saveTimer.current);
    setBusy(true);setError('');
    try{if(!snapshot.question)throw new Error('live_question_missing');await api(`/live-exams/${session.id}/answer/submit`,{method:'POST',body:JSON.stringify({questionId:snapshot.question.id,text:answer})});setDirty(false);await refresh()}
    catch(cause){setError(message(cause,'Javob topshirilmadi.'))}finally{setBusy(false)}
  };
  const submitReview=async()=>{
    if(!snapshot.review)return;setBusy(true);setError('');
    try{await api(`/live-exams/${session.id}/reviews/${snapshot.review.id}/submit`,{method:'POST',body:JSON.stringify({matchedPointIds:[...selected],score:manualScore,feedback:feedback||undefined})});await refresh()}
    catch(cause){setError(message(cause,'Baholash yuborilmadi.'))}finally{setBusy(false)}
  };

  if(session.status==='lobby')return <section className="live-wait"><div className="live-pulse"><Broadcast size={42}/></div><span>XONAGA QO‘SHILDINGIZ</span><h1>{session.title}</h1><p>O‘qituvchi o‘yinni boshlashi kutilmoqda.</p><strong>{session.participantCount} o‘quvchi tayyor</strong>{error?<p className="live-error" role="alert">{error}</p>:null}<button className="live-secondary" disabled={busy} onClick={()=>void leave()}>Xonadan chiqish</button></section>;
  if(session.pausedAt)return <section className="live-wait"><div className="live-pulse"><Broadcast size={42}/></div><span>CHALLENGE PAUZADA</span><h1>{session.title}</h1><p>Javob va baholash vaqtincha to‘xtatildi. O‘qituvchi davom ettirishi kutilmoqda.</p></section>;
  if(session.status==='question_open'&&snapshot.question)return <div className="live-student-workspace">
    <header><button className="live-icon-button" onClick={()=>navigate('oquvchi/live')} aria-label="Sessiyalarga qaytish"><ArrowLeft/></button><div><strong>{session.title}</strong><small>{saving?'Saqlanmoqda…':dirty?'O‘zgarish bor':'✓ Sinxronlandi'}</small></div><time className={remaining!==null&&remaining<30?'is-urgent':''}>{formatClock(remaining)}</time></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}<SessionProgress snapshot={snapshot}/><LiveQuestionView question={snapshot.question}/>
    <section className="live-answer-box"><header><label htmlFor="live-answer">Javobingiz</label><span>{answer.trim()?answer.trim().split(/\s+/).length:0} so‘z</span></header><textarea id="live-answer" value={answer} disabled={Boolean(snapshot.ownAnswer?.submittedAt)||remaining===0||Boolean(session.pausedAt)} onChange={(event)=>{setAnswer(event.target.value);setDirty(true)}} placeholder="Javobingizni shu yerga yozing…"/><button disabled={busy||saving||Boolean(snapshot.ownAnswer?.submittedAt)||remaining===0||Boolean(session.pausedAt)} onClick={submitAnswer}>{snapshot.ownAnswer?.submittedAt?'Topshirildi ✓':remaining===0?'Vaqt tugadi':busy||saving?'Yuborilmoqda…':'Javobni topshirish'}</button></section>
  </div>;
  if(session.status==='answers_locked')return <section className="live-wait"><div className="live-pulse"><CheckCircle size={42} weight="fill"/></div><span>JAVOBLAR YOPILDI</span><h1>{session.title}</h1><p>Endi javobni o‘zgartirib bo‘lmaydi. O‘qituvchi official Mark Scheme’ni ochishi kutilmoqda.</p></section>;
  if(session.status==='marking'&&snapshot.markScheme)return <div className="live-marking-layout"><div><MarkSchemeView scheme={snapshot.markScheme}/></div><aside className="live-review-card">
    {!snapshot.review?<>{snapshot.ownAnswer&&!snapshot.ownAnswer.submittedAt?<><h2>Javob topshirilmagan</h2><p>Bu savol uchun 0 ball qayd etildi. O‘qituvchi natijalarni yakunlashi kutilmoqda.</p><strong>0/{snapshot.question?.marks} ball</strong></>:<><h2>Baholash kutilmoqda</h2><p>O‘qituvchi sizga javob biriktirmoqda.</p></>}</>:snapshot.review.status!=='assigned'?<><CheckCircle size={54} weight="fill"/><h2>Baholash yuborildi</h2><p>O‘qituvchi barcha baholashlarni yakunlashi kutilmoqda.</p><strong>{snapshot.review.awardedMarks}/{snapshot.question?.marks} ball</strong></>:<><span className="live-eyebrow">{snapshot.review.kind==='peer'?'ANONIM JAVOB':snapshot.review.kind==='self'?'O‘Z JAVOBINGIZ':'JAVOB'}</span><h2>Mark scheme asosida tekshiring</h2><blockquote>{snapshot.review.answerText||'Javob yozilmagan'}</blockquote><MarkSchemeView scheme={{...snapshot.markScheme,points:snapshot.review.points}} interactive selected={selected} onToggle={(id)=>setSelected((current)=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}/>{schemeNeedsManualScore(snapshot.markScheme)?<label>Ball<input type="number" min={0} max={snapshot.question?.marks??0} value={manualScore} onChange={(e)=>setManualScore(Number(e.target.value))}/></label>:null}<label>Qisqa izoh<textarea value={feedback} maxLength={5000} onChange={(e)=>setFeedback(e.target.value)} placeholder="Nima uchun shu ballni berdingiz?"/></label>{error?<p className="live-error" role="alert">{error}</p>:null}<button disabled={busy} onClick={submitReview}>{busy?'Yuborilmoqda…':'Baholashni yuborish'}</button></>}
  </aside></div>;
  if(session.status==='review')return <section className="live-student-result"><span className="live-eyebrow">SAVOL NATIJASI</span><h1>{snapshot.ownAnswer?.score??'—'} <small>/ {snapshot.question?.marks}</small></h1><p>{snapshot.ownAnswer?.feedback||'Mark scheme pointlari asosida baholandi.'}</p><div><h2>Sizning javobingiz</h2><blockquote>{snapshot.ownAnswer?.text||'Javob yozilmagan'}</blockquote></div>{snapshot.markScheme?<MarkSchemeView scheme={snapshot.markScheme}/>:null}<p className="live-wait-note">O‘qituvchi keyingi savolni ochishi kutilmoqda.</p></section>;
  if(session.status==='finished')return <section className="live-student-result live-finished"><CheckCircle size={64} weight="fill"/><span className="live-eyebrow">SESSIYA YAKUNLANDI</span><h1>{session.title}</h1><p>{session.questionCount} ta savol bajarildi. Natijalar saqlandi.</p>{snapshot.report?<><strong className="live-total-score">{snapshot.report.earned} / {snapshot.report.possible}</strong><div className="live-report-list">{snapshot.report.rows.map((row)=><article key={`${row.questionPosition}-${row.displayRef}`}><span>Savol {row.questionPosition+1}</span><strong>{row.displayRef}</strong><b>{row.score??'—'} / {row.marks}</b></article>)}</div></>:null}<button onClick={()=>navigate('oquvchi/live')}>Sessiyalarimga qaytish</button></section>;
  return <section className="live-wait"><h1>Sessiya bekor qilindi</h1><button onClick={()=>navigate('oquvchi/live')}>Ortga</button></section>;
}

function DraftQuestionControls({snapshot,onChanged,onPublish}:{snapshot:LiveExamSnapshot;onChanged:()=>Promise<void>;onPublish:()=>void}) {
  const [builder,setBuilder]=useState<DraftBuilder|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{
    try{
      const result=await api<{data:DraftBuilder}>(`/live-exams/${snapshot.session.id}/builder`);
      setBuilder(result.data);setError('');
    }catch(cause){setError(message(cause,'Draft savollari yuklanmadi.'))}
  },[snapshot.session.id]);
  useEffect(()=>{void load()},[load,snapshot.session.version]);

  const replace=async(questionIds:string[])=>{
    setBusy(true);setError('');
    try{
      await api(`/live-exams/${snapshot.session.id}/questions`,{
        method:'PUT',
        body:JSON.stringify({questionIds,expectedVersion:snapshot.session.version}),
      });
      await onChanged();
      await load();
    }catch(cause){setError(message(cause,'Draft savollari yangilanmadi.'))}
    finally{setBusy(false)}
  };
  const roots=(builder?.selectedQuestionIds??[]).map((questionId)=>({
    questionId,
    question:builder?.questions.find((item)=>item.questionId===questionId)??null,
  }));
  const move=(index:number,delta:number)=>{
    if(!builder)return;
    const target=index+delta;
    if(target<0||target>=builder.selectedQuestionIds.length)return;
    const next=[...builder.selectedQuestionIds];
    [next[index],next[target]]=[next[target]!,next[index]!];
    void replace(next);
  };
  const remove=(questionId:string)=>{
    if(!builder)return;
    void replace(builder.selectedQuestionIds.filter((id)=>id!==questionId));
  };

  return <section className="live-finished">
    <span className="live-eyebrow">DRAFT</span><h1>Challenge hali ochilmagan</h1>
    <p>{roots.length?`${roots.length} ta asosiy Cambridge savoli tanlangan. Majburiy oldingi qismlar publish paytida avtomatik qo‘shiladi.`:'Asosiy savollar qolmadi. Builderga qaytib yangi draft yarating yoki bu draftni bekor qiling.'}</p>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    {builder===null?<p>Draft yuklanmoqda…</p>:roots.length?<div className="live-report-list">{roots.map((row,index)=><article key={row.questionId}>
      <span>Savol {index+1}</span><strong>{row.question?.displayRef??row.questionId}</strong><b>{row.question?.marks??'—'} ball</b>
      <div><button className="live-secondary" disabled={busy||index===0} onClick={()=>move(index,-1)}>↑</button><button className="live-secondary" disabled={busy||index===roots.length-1} onClick={()=>move(index,1)}>↓</button><button className="live-danger" disabled={busy} onClick={()=>remove(row.questionId)}>Olib tashlash</button></div>
    </article>)}</div>:null}
    <div className="live-room-actions">{roots.length?<button disabled={busy} onClick={onPublish}>Challenge’ni nashr qilish</button>:<button onClick={()=>navigate('oqitish/live')}>Builderga qaytish</button>}</div>
  </section>;
}

function TeacherAnswerMarker({snapshot,answer,onDone}:{snapshot:LiveExamSnapshot;answer:LiveExamAnswer&{studentName:string;reviewId:string|null;reviewStatus:string|null};onDone:()=>void}) {
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [score,setScore]=useState(answer.score??0);
  const [feedback,setFeedback]=useState(answer.feedback??'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const submit=async()=>{
    setBusy(true);setError('');
    try{
      if(answer.reviewStatus==='assigned'&&answer.reviewId)await api(`/live-exams/${snapshot.session.id}/reviews/${answer.reviewId}/submit`,{method:'POST',body:JSON.stringify({matchedPointIds:[...selected],score,feedback:feedback||undefined})});
      else await api(`/live-exams/${snapshot.session.id}/answers/${answer.id}/moderate`,{method:'PUT',body:JSON.stringify({score,feedback:feedback||undefined})});
      onDone();
    }catch(cause){setError(message(cause,'Baho saqlanmadi.'));setBusy(false)}
  };
  const scheme=snapshot.markScheme;
  return <article className="live-teacher-marker"><header><div><span>O‘QUVCHI JAVOBI</span><h2>{answer.studentName}</h2></div><strong>{answer.score??0}/{snapshot.question?.marks}</strong></header><blockquote>{answer.text||'Javob yozilmagan'}</blockquote>
    {scheme?<MarkSchemeView scheme={scheme} interactive={answer.reviewStatus==='assigned'} selected={selected} onToggle={(id)=>setSelected((current)=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}/>:null}
    {(schemeNeedsManualScore(scheme)||answer.reviewStatus!=='assigned')?<label>Ball<input type="number" min={0} max={snapshot.question?.marks??0} value={score} onChange={(e)=>setScore(Number(e.target.value))}/></label>:null}
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
  const act=async(path:string,body?:unknown)=>{setBusy(true);setError('');try{await api(`/live-exams/${session.id}${path}`,{method:'POST',body:body===undefined?undefined:JSON.stringify(body)});await refresh()}catch(cause){if(cause instanceof ApiError&&cause.code==='live_state_conflict'){await refresh();setError('Sessiya boshqa oynada yangilandi. Eng so‘nggi holat yuklandi.')}else setError(message(cause,'Amal bajarilmadi.'))}finally{setBusy(false)}};
  const removeParticipant=async(studentId:string,fullName:string)=>{
    if(!window.confirm(`${fullName} xonadan chiqarilsinmi?`))return;
    await act(`/participants/${studentId}/remove`,{expectedVersion:session.version});
  };
  const copyCode=()=>{if(session.joinCode)void navigator.clipboard?.writeText(session.joinCode)};
  const openProjector=()=>window.open(`${window.location.href.split('#')[0]}#oqitish/live?id=${session.id}&projector=1`,'campath-projector','noopener,noreferrer');

  return <div className="live-page live-room"><header className="live-room-head"><button className="live-icon-button" onClick={()=>navigate('oqitish/live')} aria-label="Live sessiyalarga qaytish"><ArrowLeft/></button><div><span className={`live-state live-state--${session.status}`}>{session.pausedAt?'Pauzada':STATUS_LABEL[session.status]}</span><h1>{session.title}</h1><p>{session.className} · {MODE_LABEL[session.markingMode]}</p></div><div className="live-room-actions">{!['draft','published','cancelled'].includes(session.status)?<button className="live-secondary" onClick={openProjector}><Monitor/> Proyektor</button>:null}<button className="live-secondary" onClick={()=>void refresh()}><ArrowsClockwise/> Yangilash</button>{['question_open','marking','review'].includes(session.status)?<button className="live-secondary" disabled={busy} onClick={()=>void act(session.pausedAt?'/resume':'/pause',{expectedVersion:session.version})}>{session.pausedAt?'Davom ettirish':'Pauza'}</button>:null}{!['finished','cancelled'].includes(session.status)?<button className="live-danger" disabled={busy} onClick={()=>{if(window.confirm('Live sessiyani bekor qilmoqchimisiz? Bu amalni ortga qaytarib bo‘lmaydi.'))void act('/cancel',{expectedVersion:session.version})}}>Bekor qilish</button>:null}</div></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    {session.status==='draft'?<DraftQuestionControls snapshot={snapshot} onChanged={()=>refresh()} onPublish={()=>void act('/publish',{expectedVersion:session.version})}/>:null}
    {session.status==='published'?<section className="live-finished"><span className="live-eyebrow">PUBLISHED</span><h1>Challenge tayyor</h1><p>Immutable savol va Mark Scheme snapshotlari yaratildi. Lobby ochilgach xona kodi o‘quvchilarga ko‘rsatiladi.</p><button disabled={busy} onClick={()=>void act('/open',{expectedVersion:session.version})}>Lobby’ni ochish</button></section>:null}
    {session.pausedAt?<section className="live-paused-banner"><strong>Challenge pauzada</strong><span>Student javobi va baholash bloklangan; timer muzlatilgan.</span></section>:null}
    {session.status==='lobby'?<div className="live-lobby-layout"><section className="live-code-card"><span>JOIN CODE</span><strong>{session.joinCode??'------'}</strong><button onClick={copyCode}><Copy/> Kodni nusxalash</button><p>O‘quvchilar akkauntiga kirib, “Live Challenge” bo‘limida kodni kiritadi.</p><button className="live-start" disabled={busy||session.participantCount<1} onClick={()=>void act('/start',{expectedVersion:session.version})}>{busy?'Boshlanmoqda…':'O‘yinni boshlash'}</button></section><LobbyParticipants snapshot={snapshot} busy={busy} onRemove={(studentId,fullName)=>void removeParticipant(studentId,fullName)}/></div>:null}
    {session.status==='question_open'&&snapshot.question?<><SessionProgress snapshot={snapshot}/><div className="live-teacher-question"><div><LiveQuestionView question={snapshot.question}/></div><aside><div className="live-timer-card"><span>QOLGAN VAQT</span><strong className={remaining!==null&&remaining<30?'is-urgent':''}>{session.pausedAt?formatClock(session.pauseRemainingS):formatClock(remaining)}</strong></div><div className="live-submit-stat"><strong>{session.submittedCount}</strong><span>/ {session.participantCount} topshirdi</span><progress max={Math.max(1,session.participantCount)} value={session.submittedCount}/></div><ul className="live-submit-list">{snapshot.participants.map((person)=><li key={person.id}><span>{person.fullName}</span><b className={person.submitted?'is-done':''}>{person.submitted?'Topshirdi':'Yozmoqda'}</b></li>)}</ul><button disabled={busy||Boolean(session.pausedAt)} onClick={()=>void act('/lock',{expectedVersion:session.version})}>Javoblarni yopish</button><small>Topshirmagan javoblar bo‘sh holatda avtomatik yopiladi. Mark Scheme keyingi alohida bosqichda ochiladi.</small></aside></div></>:null}
    {session.status==='answers_locked'?<><SessionProgress snapshot={snapshot}/><section className="live-review-summary"><div><span className="live-eyebrow">ANSWER LOCK</span><h2>Javoblar yopildi</h2><p>Student javoblari endi o‘zgarmaydi. Official Mark Scheme hali hech kimga ko‘rsatilmagan.</p>{session.markingMode==='peer'&&session.participantCount<2?<small>Peer marking uchun kamida 2 ta faol o‘quvchi kerak. O‘qituvchi baholashiga o‘tishingiz mumkin.</small>:null}</div><div className="live-marking-actions">{session.markingMode==='peer'?<button className="live-secondary" disabled={busy} onClick={()=>void act('/marking-mode',{mode:'teacher',expectedVersion:session.version})}>O‘qituvchi baholashiga o‘tish</button>:null}<button disabled={busy} onClick={()=>void act('/reveal',{expectedVersion:session.version})}>Mark Scheme’ni ochish →</button></div></section></>:null}
    {session.status==='marking'?<><SessionProgress snapshot={snapshot}/><div className="live-marking-head"><div><span className="live-eyebrow">BAHOLASH</span><h2>{session.reviewedCount}/{session.reviewCount} ta tugadi</h2></div><div className="live-marking-actions"><button disabled={busy||Boolean(session.pausedAt)||session.reviewedCount<session.reviewCount} onClick={()=>void act('/marking/complete',{expectedVersion:session.version})}>Natijalarni ochish</button>{session.reviewedCount<session.reviewCount?<button className="live-secondary" disabled={busy||Boolean(session.pausedAt)} onClick={()=>{if(window.confirm('Tugallanmagan baholashlar 0 ball bilan yopilsinmi?'))void act('/marking/complete',{force:true,expectedVersion:session.version})}}>Kutilayotganlarsiz davom etish</button>:null}</div></div>
      {session.markingMode==='teacher'&&activeAnswer?<div className="live-teacher-marking"><nav>{snapshot.teacherAnswers.map((answer,index)=><button className={activeAnswer.id===answer.id?'is-active':''} key={answer.id} onClick={()=>setActiveAnswerId(answer.id)}><span>{index+1}</span><strong>{answer.studentName}</strong><i>{answer.reviewStatus==='assigned'?'Kutilmoqda':`${answer.score??0}/${snapshot.question?.marks}`}</i></button>)}</nav><TeacherAnswerMarker key={`${activeAnswer.id}:${activeAnswer.reviewStatus}:${activeAnswer.score}`} snapshot={snapshot} answer={activeAnswer} onDone={()=>{setActiveAnswerId('');void refresh()}}/></div>:null}
      {session.markingMode!=='teacher'?<div className="live-peer-progress"><MarkSchemeView scheme={snapshot.markScheme!}/><section><h2>{MODE_LABEL[session.markingMode]}</h2><p>O‘quvchilar mark scheme asosida baholamoqda. Ismlar faqat o‘qituvchi ekranida ko‘rinadi.</p>{snapshot.teacherAnswers.map((answer)=><div key={answer.id}><span><strong>{answer.studentName}</strong><small>{!answer.submittedAt?'Topshirmadi':answer.reviewStatus==='assigned'?'Baholamoqda':'Yakunladi'}</small></span><b>{answer.score===null?'—':`${answer.score}/${snapshot.question?.marks}`}</b></div>)}</section></div>:null}
    </>:null}
    {session.status==='review'?<><section className="live-review-summary"><div><span className="live-eyebrow">SAVOL YAKUNI</span><h2>Natijalarni ko‘rib chiqing</h2><p>{session.settings.teacherOverrideEnabled?'Peer va self baholarni kerak bo‘lsa o‘qituvchi tuzatishi mumkin.':'Peer va self baholar final; teacher override o‘chirilgan.'}</p></div><button disabled={busy||Boolean(session.pausedAt)} onClick={()=>void act('/next',{expectedVersion:session.version})}>{session.currentQuestionIndex+1<session.questionCount?'Keyingi savol →':'Sessiyani yakunlash'}</button></section><LiveExamLeaderboard sessionId={session.id} version={session.version}/><div className="live-result-table"><header><span>O‘quvchi</span><span>Baholash</span><span>Ball</span></header>{snapshot.teacherAnswers.map((answer)=><div key={answer.id}><strong>{answer.studentName}</strong><span>{answer.scoreSource?MODE_LABEL[answer.scoreSource]:'Baholanmagan'}</span><b>{answer.score??'—'} / {snapshot.question?.marks}</b></div>)}</div>{(session.markingMode==='teacher'||session.settings.teacherOverrideEnabled)&&activeAnswer?<div className="live-teacher-marking"><nav>{snapshot.teacherAnswers.map((answer,index)=><button className={activeAnswer.id===answer.id?'is-active':''} key={answer.id} onClick={()=>setActiveAnswerId(answer.id)}><span>{index+1}</span><strong>{answer.studentName}</strong><i>{answer.score===null?'—':`${answer.score}/${snapshot.question?.marks}`}</i></button>)}</nav><TeacherAnswerMarker key={`review:${activeAnswer.id}:${activeAnswer.score}`} snapshot={snapshot} answer={activeAnswer} onDone={()=>{setActiveAnswerId('');void refresh()}}/></div>:null}{snapshot.markScheme?<MarkSchemeView scheme={snapshot.markScheme}/>:null}</>:null}
    {session.status==='finished'?<section className="live-finished live-teacher-finished"><CheckCircle size={64} weight="fill"/><span className="live-eyebrow">SESSIYA YAKUNLANDI</span><h1>{session.questionCount} ta savol bajarildi</h1><p>Barcha javoblar, baholar va audit voqealari saqlandi.</p>{snapshot.report?<><strong className="live-total-score">{snapshot.report.earned} / {snapshot.report.possible} sinf ballari</strong><div className="live-report-list">{snapshot.report.rows.map((row,index)=><article key={`${row.studentId}-${row.questionPosition}-${index}`}><span>Savol {row.questionPosition+1}</span><strong>{row.studentName} · {row.displayRef}</strong><b>{row.score??'—'} / {row.marks}</b></article>)}</div></>:null}<button onClick={()=>navigate('oqitish/live')}>Sessiyalar ro‘yxati</button></section>:null}
    {session.status==='cancelled'?<section className="live-finished"><h1>Sessiya bekor qilingan</h1><button onClick={()=>navigate('oqitish/live')}>Ortga</button></section>:null}
  </div>;
}

function ProjectorRoom({sessionId}:{sessionId:string}) {
  const {snapshot,error,loading}=useLiveBoard(sessionId);
  if(loading&&!snapshot)return <p className="live-loading">Proyektor yuklanmoqda…</p>;
  if(error&&!snapshot)return <div className="live-page"><p className="live-error">{error}</p></div>;
  return snapshot?<ProjectorView snapshot={snapshot} sessionId={sessionId}/>:null;
}

function InteractiveLiveRoom({user,sessionId}:{user:User;sessionId:string}) {
  const {snapshot,error,loading,refresh}=useLiveSnapshot(sessionId);
  if(loading&&!snapshot)return <p className="live-loading">Live sessiya yuklanmoqda…</p>;
  if(error&&!snapshot)return <div className="live-page"><p className="live-error">{error}</p><button onClick={()=>navigate(`${user.role==='student'?'oquvchi':'oqitish'}/live`)}>Ortga</button></div>;
  if(!snapshot)return null;
  return user.role==='student'?<StudentRoom snapshot={snapshot} refresh={()=>refresh()}/>:<TeacherRoom snapshot={snapshot} refresh={()=>refresh()}/>;
}

function LiveRoom({user,sessionId,projector}:{user:User;sessionId:string;projector:boolean}) {
  return projector&&user.role!=='student'
    ? <ProjectorRoom sessionId={sessionId}/>
    : <InteractiveLiveRoom user={user} sessionId={sessionId}/>;
}

export function LiveExamPage({user,classes}:{user:User;classes:ClassItem[]}) {
  const route=useRoute();
  const sessionId=route.params.get('id');
  const projector=route.params.get('projector')==='1';
  return sessionId?<LiveRoom user={user} sessionId={sessionId} projector={projector}/>:<LiveLanding user={user} classes={classes}/>;
}
