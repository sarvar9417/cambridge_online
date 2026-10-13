import { randomId } from '../lib/random-id';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowsClockwise, Broadcast, CaretDown, CaretUp, CheckCircle, Copy, Monitor, Trash, UsersThree } from '@phosphor-icons/react';
import {
  api,
  apiBlob,
  ApiError,
  type ClassItem,
  type LiveExamAnswer,
  type LiveExamMarkingMode,
  type LiveExamPortableQuestion,
  type LiveExamQuestion,
  type LiveExamSnapshot,
  type LiveExamStatus,
  type LiveExamSummary,
  type LiveMarkScheme,
  type LivePointFeedback,
  type User,
} from '../lib/api';
import { navigate, useRoute } from '../lib/router';
import { LatexQuestionText } from '../lib/latex-question-text';
import {
  materializePortableSourceAssets,
  portableAssetsForContent,
  portableAssetUrl,
} from '../lib/portable-source-assets';
import { AttemptContext } from '../AttemptContext';
import { StructuredQuestionView } from '../student/StructuredQuestionView';
import { LiveExamLeaderboard } from './LiveExamLeaderboard';
import {
  moveLiveQuestionTimeOverride,
  serializeLiveQuestionTimeOverrides,
  setLiveQuestionTimeOverride,
  type LiveQuestionTimeOverrides,
} from './live-question-timing';
import './live-exam.css';

type FilterOptions = {
  topics: Array<{
    syllabus_code:string;topic_id:string;topic_number:number;topic_title:string;
    subtopic_id:string;code:string;subtopic_title:string;component:number|null;
  }>;
  coursebookSections: Array<{
    syllabus_code:string;chapter_number:number;chapter_title:string;
    section_code:string;section_title:string;mapping_kind:'direct_subtopic'|'learning_objective_bridge';
  }>;
};
type EligibleQuestion = {
  id:string;displayRef:string;marks:number;commandWord:string|null;stem:string;hasAssets:boolean;dependencyCount:number;
  year:number;series:string;component:number;difficulty:'easy'|'medium'|'hard';
};
type EligibleQuestionCounts = {database:number;liveReady:number;available:number};
type EligibleQuestionResponse = {data:EligibleQuestion[];total:number;counts?:EligibleQuestionCounts};
type SelectionPreview = {
  selected:EligibleQuestion[];dependencies:EligibleQuestion[];
  requestedCount:number;expandedCount:number;dependencyCount:number;requestedMarks:number;expandedMarks:number;
};
type LiveDetailedReport = {
  session:{id:string;title:string;className:string;status:'finished'};
  aggregate:{studentCount:number;totalEarned:number;totalPossible:number;averageScore:number;averagePossible:number;averagePercentage:number};
  students:Array<{studentId:string;studentName:string;earned:number;possible:number;percentage:number}>;
  questions:Array<{sessionQuestionId:string;questionPosition:number;displayRef:string;marks:number;earned:number;possible:number;attempts:number;percentage:number;subtopics:Array<{subtopicId:string;subtopicCode:string;subtopicTitle:string;topicNumber:number;topicTitle:string}>}>;
  subtopics:Array<{subtopicId:string;subtopicCode:string;subtopicTitle:string;topicNumber:number;topicTitle:string;earned:number;possible:number;attempts:number;percentage:number}>;
  mostMissedPoints:Array<{questionPosition:number;displayRef:string;pointId:string;code:string;text:string;marks:number;assessedCount:number;missedCount:number;missRate:number}>;
  reteachRecommendations:Array<{subtopicId:string;code:string;title:string;topicNumber:number;topicTitle:string;percentage:number;attempts:number;marksEarned:number;marksPossible:number;reason:string}>;
};

const EMPTY_OPTIONS:FilterOptions = { topics:[],coursebookSections:[] };
const DEADLINE_DRAFT_FLUSH_SECONDS=new Set([5,3,1,0]);
const LIVE_DRAFT_VERSION=1;

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

function liveDraftKey(userId:string,sessionId:string,questionId:string) {
  return `campath:live-draft:v${LIVE_DRAFT_VERSION}:${userId}:${sessionId}:${questionId}`;
}

function readLiveDraft(key:string) {
  try {
    const raw=localStorage.getItem(key);
    if(!raw)return null;
    const draft=JSON.parse(raw) as {version?:unknown;text?:unknown;updatedAt?:unknown;tabId?:unknown};
    if(draft.version!==LIVE_DRAFT_VERSION||typeof draft.text!=='string'||typeof draft.updatedAt!=='number'
      ||Date.now()-draft.updatedAt>86_400_000){
      localStorage.removeItem(key);return null
    }
    return {text:draft.text,updatedAt:draft.updatedAt,tabId:typeof draft.tabId==='string'?draft.tabId:null};
  }catch{return null}
}

function writeLiveDraft(key:string,text:string,tabId:string) {
  try{localStorage.setItem(key,JSON.stringify({version:LIVE_DRAFT_VERSION,text,updatedAt:Date.now(),tabId}))}catch{/* Storage may be disabled or full. */}
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

function useLiveSnapshot(sessionId:string,projector=false) {
  const [snapshot,setSnapshot]=useState<LiveExamSnapshot|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [unavailable,setUnavailable]=useState(false);
  const request=useRef<Promise<void>|null>(null);
  const status=snapshot?.session.status;
  const terminal=status==='finished'||status==='cancelled'||unavailable;
  const refresh=useCallback(async(silent=false)=>{
    // A user action needs a snapshot taken after its mutation. An older poll
    // can still be in flight, so wait for it before requesting the fresh state.
    while(request.current){
      if(silent)return;
      await request.current;
    }
    const pending=(async()=>{try{
      const next=await api<LiveExamSnapshot>(`/live-exams/${sessionId}${projector?'/projector':''}`);
      // Presence changes do not increment the session version, so retain the
      // complete server snapshot on every poll instead of only state changes.
      setSnapshot(next);
      setError('');
    }catch(cause){
      if(cause instanceof ApiError&&(cause.status===403||cause.status===404)){
        setUnavailable(true);
        setSnapshot(null);
        setError('Live sessiya topilmadi yoki unda qatnashish huquqingiz yo‘q.');
      }else if(!silent)setError(message(cause,'Live sessiya yuklanmadi.'));
    }
    finally{setLoading(false)}})();
    request.current=pending;
    try{await pending}finally{if(request.current===pending)request.current=null}
  },[projector,sessionId]);
  useEffect(()=>{
    if(terminal)return;
    void refresh();
    const timer=window.setInterval(()=>void refresh(true),1500);
    const visible=()=>{if(document.visibilityState==='visible')void refresh(true)};
    document.addEventListener('visibilitychange',visible);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
  },[refresh,terminal]);
  useEffect(()=>{
    if(!status||terminal)return;
    const beat=()=>void api(`/live-exams/${sessionId}/heartbeat`,{method:'POST'}).catch(()=>{});
    beat();const timer=window.setInterval(beat,15000);return()=>window.clearInterval(timer);
  },[sessionId,Boolean(status),terminal]);
  return{snapshot,error,loading,refresh};
}

function QuestionAsset({asset}:{asset:LiveExamPortableQuestion['contextBlocks'][number]['assets'][number]}) {
  const url=portableAssetUrl(asset);
  const semanticText=asset.contentMd?.trim();
  const canShowAsText=asset.kind==='code'||asset.kind==='pseudocode'||asset.kind==='table';
  return <figure className="live-asset">
    {url?<img src={url} alt={asset.altText||'Cambridge source diagram'} />:
      semanticText&&canShowAsText?<pre>{semanticText}</pre>:
        <div className="live-asset-missing" role="alert">
          {asset.altText||'Original Cambridge diagrammasi yuklanmadi.'}
        </div>}
    {asset.altText?<figcaption>{asset.altText}</figcaption>:null}
  </figure>;
}

function LiveQuestionView({question}:{question:LiveExamQuestion}) {
  const portable=question.portable;
  const assets=useMemo(()=>portable.contextBlocks.flatMap((block)=>block.assets),[portable]);
  const content=useMemo(()=>portable.leaf.contentJson
    ?materializePortableSourceAssets(portable.leaf.contentJson,assets)
    :null,[assets,portable.leaf.contentJson]);
  const assetUrls=useMemo(()=>portableAssetsForContent(assets),[assets]);
  const hasCanonicalContent=Boolean(portable.leaf.contentJson);
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
    {hasCanonicalContent&&content?<StructuredQuestionView content={content} assetUrls={assetUrls}/>:<>
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

function ReviewQuestionContext({question}:{question:LiveExamQuestion|null|undefined}) {
  if(!question)return null;
  return <section className="live-review-question" aria-label="Tekshirilayotgan savol">
    <header><span className="live-eyebrow">TEKSHIRILAYOTGAN SAVOL</span><strong>Savol javob va mark scheme bilan birga ko‘rinadi</strong></header>
    <LiveQuestionView question={question}/>
  </section>;
}

function MarkSchemeView({scheme,selected,onToggle,interactive=false}:{
  scheme:LiveMarkScheme;selected?:Set<string>;onToggle?:(id:string)=>void;interactive?:boolean;
}) {
  const oneMarkPerPoint=scheme.points.length>0&&scheme.points.every((point)=>point.marks===1);
  const compactRule=scheme.groups.length===1&&oneMarkPerPoint
    ?`Har bir to‘g‘ri band uchun 1 ball · Maksimum ${scheme.groups[0]!.maxMarks} ball`
    :null;
  return <section className="live-scheme">
    <header><div><span>OFFICIAL MARK SCHEME</span><h2>Baholash mezoni</h2></div><strong>{scheme.maxMarks} ball</strong></header>
    {compactRule?<div className="live-scheme-rule"><span>{compactRule}</span></div>:
      scheme.groups.length?<div className="live-scheme-groups">{scheme.groups.map((group)=><span key={group.id}>
        {group.label&&group.label!=='main'?`${group.label}: `:''}{group.nRequired} ta band · maksimum {group.maxMarks} ball
      </span>)}</div>:null}
    {scheme.levels.length?<div className="live-scheme-levels"><h3>Levels of response</h3>{scheme.levels.map((level)=><article key={level.id}><header><strong>Level {level.levelNumber}</strong><b>{level.minMarks}–{level.maxMarks} ball</b></header><p>{level.descriptorMd}</p>{level.indicativeContentMd?<small>{level.indicativeContentMd}</small>:null}</article>)}</div>:null}
    <div className="live-scheme-points">
      {scheme.points.map((point,index)=><label className={selected?.has(point.id)?'is-selected':''} key={point.id}>
        {interactive?<input type="checkbox" checked={selected?.has(point.id)??false} onChange={()=>onToggle?.(point.id)}/>:<b>{index+1}</b>}
        <span><strong>{point.code}</strong>{point.text}{markSchemeNotes(point.accept).map((note,noteIndex)=><small className="live-ms-note is-accept" key={`a-${noteIndex}`}>Accept: {note}</small>)}{markSchemeNotes(point.reject).map((note,noteIndex)=><small className="live-ms-note is-reject" key={`r-${noteIndex}`}>Reject: {note}</small>)}</span><i>{point.marks}</i>
      </label>)}
      {!scheme.points.length?<p>Bu savol umumiy ball bilan baholanadi.</p>:null}
    </div>
    {scheme.guidanceMd?<details className="live-scheme-original">
      <summary>Original Cambridge mark scheme’ni ko‘rish</summary>
      <p>{scheme.guidanceMd}</p>
    </details>:null}
  </section>;
}


function ReleasedPointFeedbackView({feedback}:{feedback?:LivePointFeedback|null}) {
  if(!feedback)return null;
  if(feedback.status==='unavailable'){
    const description=feedback.reason==='teacher_override'
      ?'O‘qituvchi yakuniy ballni qo‘lda tuzatgan. Oldingi tekshiruvdagi point belgilari bu yakuniy bahoni aks ettirmaydi.'
      :feedback.reason==='manual_scoring'
        ?'Ushbu savol umumiy mezon yoki level bo‘yicha baholangan; individual pointlar uchun ball alohida hisoblanmagan.'
        :'Yakuniy ball mavjud, ammo pointlar bo‘yicha ishonchli baholash tafsiloti qayd etilmagan.';
    return <section className="live-point-feedback" aria-label="Mark Point natijalari">
      <h2>Mark Point natijalari</h2><p role="note">{description}</p>
    </section>;
  }
  const earned=feedback.points.filter((point)=>point.credited).length;
  return <section className="live-point-feedback" aria-label="Sizning Mark Point natijalaringiz">
    <header><div><span className="live-eyebrow">SIZNING BAHOLASHINGIZ</span><h2>Qaysi Mark Pointlar hisobga olindi?</h2></div><strong>{earned} / {feedback.points.length} ta mezon</strong></header>
    <p className="live-point-feedback-note">Belgilangan mezonlar haqiqiy Mark Scheme asosida tekshirilgan. Ayrim savollarda maksimal ball yoki guruh cheklovi sabab bajarilgan mezonlar soni umumiy ballga teng bo‘lmaydi.</p>
    <ul>{feedback.points.map((point)=><li className={point.credited?'is-credited':point.matched?'is-matched':'is-missed'} key={point.id}>
      <span className="live-point-feedback-icon" aria-hidden="true">{point.credited?'✓':point.matched?'•':'×'}</span>
      <div><strong>{point.code}</strong><p>{point.text}</p><small>{point.credited?'Ballga hisoblangan':point.matched?'Mezon bajarilgan, lekin qo‘shimcha ball hisoblanmagan':'Ball berilmagan'}</small></div>
    </li>)}</ul>
  </section>;
}

function SessionProgress({snapshot}:{snapshot:LiveExamSnapshot}) {
  const {session}=snapshot;
  return <div className="live-progress" role="progressbar" aria-label="Savollar bo‘yicha progress" aria-valuemin={1} aria-valuemax={Math.max(1,session.questionCount)} aria-valuenow={session.currentQuestionIndex+1} aria-valuetext={`Savol ${session.currentQuestionIndex+1}, jami ${session.questionCount}`}>
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
  const [deletingSessionId,setDeletingSessionId]=useState('');
  const [code,setCode]=useState('');
  const [selectedClassId,setSelectedClassId]=useState(()=>classes[0]?.id??'');
  const [coursebookSectionCodes,setCoursebookSectionCodes]=useState<string[]>([]);
  const [selectionMode,setSelectionMode]=useState<'auto'|'manual'>('auto');
  const [questionOrder,setQuestionOrder]=useState<'fixed'|'shuffled'>('shuffled');
  const [includeDiagrams,setIncludeDiagrams]=useState(true);
  const [excludeSeen,setExcludeSeen]=useState(true);
  const [difficulty,setDifficulty]=useState<''|'easy'|'medium'|'hard'>('');
  const [marksMin,setMarksMin]=useState('');
  const [marksMax,setMarksMax]=useState('');
  const [yearFrom,setYearFrom]=useState('');
  const [yearTo,setYearTo]=useState('');
  const [series,setSeries]=useState<string[]>([]);
  const [components,setComponents]=useState<number[]>([]);
  const [poolSearch,setPoolSearch]=useState('');
  const [poolPage,setPoolPage]=useState(0);
  const [poolTotal,setPoolTotal]=useState<number|null>(null);
  const [questionPool,setQuestionPool]=useState<EligibleQuestion[]>([]);
  const [selectedQuestionIds,setSelectedQuestionIds]=useState<string[]>([]);
  const [questionTimeLimits,setQuestionTimeLimits]=useState<LiveQuestionTimeOverrides>({});
  const [selectionPreview,setSelectionPreview]=useState<SelectionPreview|null>(null);
  const [replacingQuestionId,setReplacingQuestionId]=useState('');
  const [draggedQuestionId,setDraggedQuestionId]=useState('');
  const [eligibleTotal,setEligibleTotal]=useState<number|null>(null);
  const [eligibleCounts,setEligibleCounts]=useState<EligibleQuestionCounts|null>(null);
  const [eligibleLoading,setEligibleLoading]=useState(false);
  const [questionCount,setQuestionCount]=useState(5);
  const createAttempt=useRef<{body:string;key:string}|null>(null);

  useEffect(()=>{
    const requests:Promise<unknown>[]=[api<{data:LiveExamSummary[]}>('/live-exams').then((r)=>setSessions(r.data))];
    if(user.role!=='student')requests.push(api<FilterOptions>('/questions/filter-options').then(setOptions));
    Promise.all(requests).catch((cause)=>setError(message(cause,'Ma’lumotlar yuklanmadi.'))).finally(()=>setLoading(false));
  },[user.role]);
  useEffect(()=>{if(!selectedClassId&&classes[0])setSelectedClassId(classes[0].id)},[classes,selectedClassId]);

  // Live Challenge follows the Hodder coursebook chapter structure teachers see
  // in lessons. Assessment/mastery still resolve through the official 9618
  // syllabus taxonomy on the server, so textbook 16.2/16.3 do not rewrite
  // Cambridge syllabus rows.
  const coursebookSections=(options.coursebookSections??[]).filter((item)=>item.syllabus_code==='9618');
  const chapters=[...new Map(coursebookSections.map((item)=>[
    item.chapter_number,
    {chapter_number:item.chapter_number,chapter_title:item.chapter_title},
  ])).values()];
  const selectedChapterNumbers=[...new Set(coursebookSections
    .filter((item)=>coursebookSectionCodes.includes(item.section_code))
    .map((item)=>item.chapter_number))];
  const visibleCoursebookSections=coursebookSections.filter((item)=>
    !selectedChapterNumbers.length||selectedChapterNumbers.includes(item.chapter_number)
  );
  const clearManualPool=()=>{
    setQuestionPool([]);setSelectedQuestionIds([]);setQuestionTimeLimits({});setSelectionPreview(null);setReplacingQuestionId('');setPoolPage(0);setPoolTotal(null);
  };
  const resetPoolPage=()=>{setPoolPage(0);setQuestionPool([])};
  const toggleCoursebookSection=(code:string)=>{
    setCoursebookSectionCodes((current)=>current.includes(code)?current.filter((item)=>item!==code):[...current,code]);
    clearManualPool();
  };
  const toggleChapter=(chapterNumber:number)=>{
    const chapterCodes=coursebookSections.filter((item)=>item.chapter_number===chapterNumber).map((item)=>item.section_code);
    setCoursebookSectionCodes((current)=>{
      const allSelected=chapterCodes.length>0&&chapterCodes.every((code)=>current.includes(code));
      return allSelected
        ?current.filter((code)=>!chapterCodes.includes(code))
        :[...new Set([...current,...chapterCodes])];
    });
    clearManualPool();
  };
  const toggleSelectedQuestion=(questionId:string)=>setSelectedQuestionIds((current)=>{
    if(replacingQuestionId&&questionId!==replacingQuestionId){
      const replaceIndex=current.indexOf(replacingQuestionId);
      if(replaceIndex<0){setReplacingQuestionId('');return current}
      const withoutCandidate=current.filter((id)=>id!==questionId);
      const next=withoutCandidate.filter((id)=>id!==replacingQuestionId);
      next.splice(Math.min(replaceIndex,next.length),0,questionId);
      setQuestionTimeLimits((timings)=>moveLiveQuestionTimeOverride(timings,replacingQuestionId,questionId));
      setReplacingQuestionId('');
      return next;
    }
    if(current.includes(questionId)){
      setQuestionTimeLimits((timings)=>setLiveQuestionTimeOverride(timings,questionId,undefined));
      return current.filter((id)=>id!==questionId);
    }
    return [...current,questionId];
  });
  const moveSelectedQuestion=(index:number,direction:-1|1)=>setSelectedQuestionIds((current)=>{
    const target=index+direction;
    if(target<0||target>=current.length)return current;
    const next=[...current];[next[index],next[target]]=[next[target]!,next[index]!];return next;
  });
  const dropSelectedQuestion=(targetId:string)=>setSelectedQuestionIds((current)=>{
    const sourceIndex=current.indexOf(draggedQuestionId),targetIndex=current.indexOf(targetId);
    if(sourceIndex<0||targetIndex<0||sourceIndex===targetIndex)return current;
    const next=[...current];const [moved]=next.splice(sourceIndex,1);next.splice(targetIndex,0,moved!);return next;
  });
  const toggleSeries=(value:string)=>{setSeries((current)=>current.includes(value)?current.filter((item)=>item!==value):[...current,value]);clearManualPool()};
  const toggleComponent=(value:number)=>{setComponents((current)=>current.includes(value)?current.filter((item)=>item!==value):[...current,value]);clearManualPool()};

  const eligibleParams=(limit:number,includeData=true,includeCounts=true,offset=0,search='')=>{
    const params=new URLSearchParams({
      classId:selectedClassId,
      topicIds:'',
      subtopicIds:'',
      coursebookSectionCodes:coursebookSectionCodes.join(','),
      includeDiagrams:String(includeDiagrams),
      excludeSeen:String(excludeSeen),
      series:series.join(','),
      components:components.join(','),
      q:search,
      offset:String(Math.max(0,offset)),
      limit:String(Math.max(1,limit)),
      includeData:String(includeData),
      includeCounts:String(includeCounts),
    });
    if(difficulty)params.set('difficulty',difficulty);
    if(marksMin)params.set('marksMin',marksMin);
    if(marksMax)params.set('marksMax',marksMax);
    if(yearFrom)params.set('yearFrom',yearFrom);
    if(yearTo)params.set('yearTo',yearTo);
    return params;
  };

  useEffect(()=>{
    if(!selectedClassId||!coursebookSectionCodes.length){
      setEligibleTotal(null);setEligibleCounts(null);setEligibleLoading(false);return;
    }
    let cancelled=false;
    setEligibleLoading(true);
    setEligibleTotal(null);
    setEligibleCounts(null);
    const timer=window.setTimeout(()=>{
      void api<EligibleQuestionResponse>(`/live-exams/eligible-questions?${eligibleParams(1,false,false)}`)
        .then((result)=>{
          if(cancelled)return;
          setEligibleTotal(result.total);
          setEligibleCounts(result.counts??null);
          setQuestionCount((current)=>result.total>0?Math.min(Math.max(1,current),result.total):1);
        })
        .catch((cause)=>{if(!cancelled)setError(message(cause,'Mos savollar soni aniqlanmadi.'))})
        .finally(()=>{if(!cancelled)setEligibleLoading(false)});
    },350);
    return()=>{cancelled=true;window.clearTimeout(timer)};
  },[selectedClassId,coursebookSectionCodes,includeDiagrams,excludeSeen,difficulty,marksMin,marksMax,yearFrom,yearTo,series,components]);

  const loadQuestionPool=async(page=poolPage,search=poolSearch)=>{
    setBusy(true);setError('');
    try{
      let total=eligibleTotal;
      if(total===null){
        const summary=await api<EligibleQuestionResponse>(`/live-exams/eligible-questions?${eligibleParams(1,false,false)}`);
        total=summary.total;setEligibleTotal(total);
        setEligibleCounts(summary.counts??null);
      }
      if(total===0){setQuestionPool([]);setSelectedQuestionIds([]);setSelectionPreview(null);return}
      const pageSize=20;
      const result=await api<EligibleQuestionResponse>(`/live-exams/eligible-questions?${eligibleParams(pageSize,true,false,page*pageSize,search)}`);
      const maxPage=Math.max(0,Math.ceil(result.total/pageSize)-1);
      if(page>maxPage){setPoolPage(maxPage);return void loadQuestionPool(maxPage,search)}
      setPoolPage(page);
      setPoolTotal(result.total);
      setEligibleCounts(result.counts??null);
      setQuestionPool(result.data);
    }catch(cause){setError(message(cause,'Savollar havzasi yuklanmadi.'))}finally{setBusy(false)}
  };

  useEffect(()=>{
    if(selectionMode!=='manual'||!selectedQuestionIds.length||!selectedClassId||!coursebookSectionCodes.length){
      setSelectionPreview(null);return;
    }
    let cancelled=false;
    const timer=window.setTimeout(()=>{
      const body={
        classId:selectedClassId,topicIds:[],subtopicIds:[],coursebookSectionCodes,
        includeDiagrams,excludeSeen,difficulty:difficulty||undefined,
        marksMin:marksMin?Number(marksMin):undefined,marksMax:marksMax?Number(marksMax):undefined,
        yearFrom:yearFrom?Number(yearFrom):undefined,yearTo:yearTo?Number(yearTo):undefined,
        series,components,questionIds:selectedQuestionIds,questionOrder:'fixed' as const,
      };
      void api<SelectionPreview>('/live-exams/selection-preview',{method:'POST',body:JSON.stringify(body)})
        .then((result)=>{if(!cancelled)setSelectionPreview(result)})
        .catch((cause)=>{if(!cancelled){setSelectionPreview(null);setError(message(cause,'Tanlangan savollar preview’i tayyorlanmadi.'))}});
    },250);
    return()=>{cancelled=true;window.clearTimeout(timer)};
  },[
    selectionMode,selectedQuestionIds,selectedClassId,coursebookSectionCodes,includeDiagrams,excludeSeen,
    difficulty,marksMin,marksMax,yearFrom,yearTo,series,components,
  ]);

  const create=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setBusy(true);setError('');
    const data=new FormData(event.currentTarget);
    try{
      const body=JSON.stringify({
        classId:data.get('classId'),title:data.get('title'),topicIds:[],subtopicIds:[],coursebookSectionCodes,
        questionCount:selectionMode==='manual'?selectedQuestionIds.length:questionCount,questionTimeLimitS:data.get('timeLimit')?Number(data.get('timeLimit'))*60:undefined,
        markingMode:data.get('markingMode'),includeDiagrams,excludeSeen,
        difficulty:difficulty||undefined,marksMin:marksMin?Number(marksMin):undefined,marksMax:marksMax?Number(marksMax):undefined,
        yearFrom:yearFrom?Number(yearFrom):undefined,yearTo:yearTo?Number(yearTo):undefined,series,components,
        questionIds:selectionMode==='manual'?selectedQuestionIds:undefined,questionOrder,
        questionTimeLimits:selectionMode==='manual'
          ?serializeLiveQuestionTimeOverrides(selectedQuestionIds,questionTimeLimits)
          :{},
        allowLateJoin:data.get('allowLateJoin')==='on',autoCloseWhenAllSubmitted:data.get('autoCloseWhenAllSubmitted')==='on',
        teacherOverrideEnabled:data.get('teacherOverrideEnabled')==='on',leaderboardMode:data.get('leaderboardMode'),
        displayNameMode:data.get('displayNameMode'),
        peerCalibrationPercent:Number(data.get('peerCalibrationPercent')??0),
        peerDisagreementThreshold:Number(data.get('peerDisagreementThreshold')??1),
      });
      const key=createAttempt.current?.body===body?createAttempt.current.key:randomId();
      createAttempt.current={body,key};
      const created=await api<{id:string}>('/live-exams',{method:'POST',headers:{'Idempotency-Key':key},body});
      navigate(`oqitish/live?id=${created.id}`);
    }catch(cause){setError(message(cause,'Live Challenge yaratilmadi.'));setBusy(false)}
  };

  const join=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setError('');
    try{const result=await api<{sessionId:string}>('/live-exams/join',{method:'POST',body:JSON.stringify({code})});navigate(`oquvchi/live?id=${result.sessionId}`)}
    catch(cause){setError(message(cause,'Xonaga qo‘shilib bo‘lmadi.'));setBusy(false)}
  };

  const deleteHistorySession=async(session:LiveExamSummary)=>{
    if(!['finished','cancelled'].includes(session.status))return;
    if(!window.confirm(`"${session.title}" sessiyasi tarixdan o‘chirilsinmi? Natija va mastery evidence xavfsizlik uchun saqlanadi.`))return;
    setDeletingSessionId(session.id);setError('');
    try{
      await api(`/live-exams/${session.id}`,{
        method:'DELETE',
        headers:{'Idempotency-Key':`live-archive-${session.id}-v${session.version}`},
        body:JSON.stringify({expectedVersion:session.version}),
      });
      setSessions((current)=>current.filter((item)=>item.id!==session.id));
    }catch(cause){setError(message(cause,'Sessiyani tarixdan o‘chirib bo‘lmadi.'))}
    finally{setDeletingSessionId('')}
  };

  return <div className="live-page live-landing">
    <header className="live-page-head"><div><span className="live-eyebrow"><Broadcast size={18}/> CAMBRIDGE 9618</span><h1>Live Challenge</h1><p>Past-paper savolini bir vaqtda ishlang, so‘ng official mark scheme bilan baholang.</p></div></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    {user.role==='student'?<section className="live-join-card">
      <div><span className="live-eyebrow">XONAGA KIRISH</span><h2>O‘qituvchi bergan 6 xonali kodni kiriting</h2></div>
      <form onSubmit={join}><input aria-label="Xona kodi" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000"/><button disabled={busy||code.length!==6}>Qo‘shilish</button></form>
    </section>:<form className="live-create" onSubmit={create}>
      <section className="live-create-main"><span className="live-step">1</span><div><h2>Sessiya</h2><p>Sinf va savollar ko‘lamini tanlang.</p></div>
        <label>Sinf<select name="classId" required value={selectedClassId} onChange={(event)=>{setSelectedClassId(event.target.value);clearManualPool()}}>{classes.map((item)=><option key={item.id} value={item.id}>{item.name} · {item.level}</option>)}</select></label>
        <label>Sessiya nomi<input name="title" required minLength={3} maxLength={120} placeholder="Chapter 14 revision"/></label>
        <div className="live-topic-grid"><fieldset><legend>Chapter</legend>{chapters.map((chapter)=>{const chapterCodes=coursebookSections.filter((item)=>item.chapter_number===chapter.chapter_number).map((item)=>item.section_code);const checked=chapterCodes.length>0&&chapterCodes.every((code)=>coursebookSectionCodes.includes(code));return <label key={chapter.chapter_number}><input type="checkbox" checked={checked} onChange={()=>toggleChapter(chapter.chapter_number)}/><span>{chapter.chapter_number}. {chapter.chapter_title}</span></label>})}</fieldset>
          <fieldset><legend>Chapter section</legend>{visibleCoursebookSections.map((section)=><label key={section.section_code}><input type="checkbox" checked={coursebookSectionCodes.includes(section.section_code)} onChange={()=>toggleCoursebookSection(section.section_code)}/><span>{section.section_code} {section.section_title}</span></label>)}</fieldset></div>
        <section className="live-builder-filters">
          <header><div><h3>Advanced filters</h3><p>Source va marks bo‘yicha poolni toraytiring.</p></div></header>
          <div className="live-builder-filter-grid">
            <label>Murakkablik
              <select value={difficulty} onChange={(event)=>{setDifficulty(event.target.value as ''|'easy'|'medium'|'hard');clearManualPool()}}>
                <option value="">Barchasi</option><option value="easy">Easy · 1–2 ball</option><option value="medium">Medium · 3–4 ball</option><option value="hard">Hard · 5+ ball</option>
              </select><small>Difficulty hozir Cambridge metadata emas, marks bandi asosida.</small>
            </label>
            <label>Minimum ball<input type="number" min="1" max="100" value={marksMin} onChange={(event)=>{setMarksMin(event.target.value);clearManualPool()}} placeholder="1"/></label>
            <label>Maximum ball<input type="number" min="1" max="100" value={marksMax} onChange={(event)=>{setMarksMax(event.target.value);clearManualPool()}} placeholder="20"/></label>
            <label>Yildan<input type="number" min="2000" max="2100" value={yearFrom} onChange={(event)=>{setYearFrom(event.target.value);clearManualPool()}} placeholder="2021"/></label>
            <label>Yilgacha<input type="number" min="2000" max="2100" value={yearTo} onChange={(event)=>{setYearTo(event.target.value);clearManualPool()}} placeholder="2026"/></label>
          </div>
          <div className="live-builder-filter-options">
            <fieldset><legend>Session</legend>{['FM','MJ','ON'].map((value)=><label key={value}><input type="checkbox" checked={series.includes(value)} onChange={()=>toggleSeries(value)}/><span>{value}</span></label>)}</fieldset>
            <fieldset><legend>Paper</legend>{[1,2,3,4].map((value)=><label key={value}><input type="checkbox" checked={components.includes(value)} onChange={()=>toggleComponent(value)}/><span>Paper {value}</span></label>)}</fieldset>
          </div>
        </section>
        <section className="live-question-picker">
          <header><div><h3>Savol tanlash</h3><p>Automatic pool yoki source-ready savollarni qo‘lda tanlang.</p><strong className="live-eligible-total">{eligibleLoading?'Mos savollar hisoblanmoqda…':eligibleCounts?`Jami bazada: ${eligibleCounts.database} · Live-ready: ${eligibleCounts.liveReady} · Hozir tanlash mumkin: ${eligibleCounts.available}`:eligibleTotal!==null?`Hozir tanlash mumkin: ${eligibleTotal}`:'Chapter yoki Chapter section tanlang'}</strong></div><select aria-label="Savol tanlash usuli" value={selectionMode} onChange={(event)=>{const mode=event.target.value as 'auto'|'manual';setSelectionMode(mode);setQuestionOrder(mode==='manual'?'fixed':'shuffled');setReplacingQuestionId('')}}><option value="auto">Automatic</option><option value="manual">Manual</option></select></header>
          {selectionMode==='manual'?<>
            <div className="live-pool-toolbar">
              <input aria-label="Savollarni qidirish" value={poolSearch} onChange={(event)=>setPoolSearch(event.target.value)} onKeyDown={(event)=>{if(event.key==='Enter'){event.preventDefault();void loadQuestionPool(0,poolSearch)}}} placeholder="Ref yoki savol matni bo‘yicha qidirish"/>
              <button type="button" className="live-secondary" disabled={busy||!selectedClassId||!coursebookSectionCodes.length} onClick={()=>void loadQuestionPool(0,poolSearch)}>Savollarni ko‘rsatish</button>
            </div>
            <p className="live-selection-summary">{selectionPreview
              ?<><strong>{selectionPreview.requestedCount} tanlangan · {selectionPreview.requestedMarks} ball</strong><span>Dependencies bilan: {selectionPreview.expandedCount} savol · {selectionPreview.expandedMarks} ball{selectionPreview.dependencyCount?` · +${selectionPreview.dependencyCount} majburiy qism`:''}</span></>
              :selectedQuestionIds.length?<span>Dependency preview hisoblanmoqda…</span>:<span>Hali savol tanlanmagan.</span>}</p>
            {replacingQuestionId?<p className="live-warning" role="status">Almashtirish rejimi: pooldan yangi savolni tanlang. <button type="button" className="live-link-button" onClick={()=>setReplacingQuestionId('')}>Bekor qilish</button></p>:null}
            {selectionPreview?.selected.length?<div className="live-selected-preview"><header><strong>Tanlangan savollar tartibi</strong><small>Drag-and-drop yoki yuqoriga/pastga tugmalaridan foydalaning.</small></header>{selectionPreview.selected.map((question,index)=><article
              key={question.id}
              draggable
              onDragStart={()=>setDraggedQuestionId(question.id)}
              onDragOver={(event)=>event.preventDefault()}
              onDrop={()=>{dropSelectedQuestion(question.id);setDraggedQuestionId('')}}
              className={draggedQuestionId===question.id?'is-dragging':''}
            ><span>{index+1}</span><div><strong>{question.displayRef}</strong><small>{question.year} {question.series} · Paper {question.component} · {question.marks} ball · {question.stem}</small></div><label className="live-question-time-profile">Vaqt<select aria-label={`${question.displayRef} uchun vaqt`} value={Object.prototype.hasOwnProperty.call(questionTimeLimits,question.id)?questionTimeLimits[question.id]===null?'0':String(questionTimeLimits[question.id]):''} onChange={(event)=>{const value=event.target.value;setQuestionTimeLimits((current)=>setLiveQuestionTimeOverride(current,question.id,value===''?undefined:value==='0'?null:Number(value)))}}><option value="">Umumiy</option><option value="0">Cheklanmagan</option><option value="30">30 soniya</option><option value="60">1 daqiqa</option><option value="90">1.5 daqiqa</option><option value="120">2 daqiqa</option><option value="180">3 daqiqa</option><option value="300">5 daqiqa</option><option value="600">10 daqiqa</option></select></label><button type="button" aria-label={`${question.displayRef} yuqoriga`} title="Yuqoriga" disabled={index===0} onClick={()=>moveSelectedQuestion(index,-1)}><CaretUp/></button><button type="button" aria-label={`${question.displayRef} pastga`} title="Pastga" disabled={index===selectedQuestionIds.length-1} onClick={()=>moveSelectedQuestion(index,1)}><CaretDown/></button><button type="button" className="live-secondary" onClick={()=>setReplacingQuestionId(question.id)}>Almashtirish</button><button type="button" className="live-link-button" onClick={()=>toggleSelectedQuestion(question.id)}>Olib tashlash</button></article>)}</div>:null}
            {selectionPreview?.dependencies.length?<details className="live-dependency-preview"><summary>Majburiy oldingi qismlar ({selectionPreview.dependencies.length})</summary>{selectionPreview.dependencies.map((question)=><p key={question.id}><strong>{question.displayRef}</strong> · {question.marks} ball · {question.stem}</p>)}</details>:null}
            <div className="live-question-pool">{questionPool.map((question)=><label key={question.id} className={selectedQuestionIds.includes(question.id)?'is-selected':''}><input type="checkbox" checked={selectedQuestionIds.includes(question.id)} onChange={()=>toggleSelectedQuestion(question.id)}/><span><strong>{question.displayRef}</strong><small>{question.year} {question.series} · Paper {question.component} · {question.commandWord??'—'} · {question.marks} ball · {question.difficulty}{question.hasAssets?' · visual':''}{question.dependencyCount?` · +${question.dependencyCount} direct dependency`:''}</small><em>{question.stem}</em></span></label>)}</div>
            {poolTotal!==null?<nav className="live-pool-pages" aria-label="Savol pool sahifalari"><button type="button" className="live-secondary" disabled={busy||poolPage===0} onClick={()=>void loadQuestionPool(Math.max(0,poolPage-1),poolSearch)}>← Oldingi</button><span>{poolTotal?poolPage+1:0} / {Math.max(1,Math.ceil(poolTotal/20))} · {poolTotal} natija</span><button type="button" className="live-secondary" disabled={busy||(poolPage+1)*20>=poolTotal} onClick={()=>void loadQuestionPool(poolPage+1,poolSearch)}>Keyingi →</button></nav>:null}
          </>:null}
        </section>
      </section>
      <aside className="live-create-side"><span className="live-step">2</span><h2>O‘yin qoidalari</h2>
        <label>Savollar soni<input name="questionCount" type="number" min={1} max={eligibleTotal??undefined} value={questionCount} disabled={selectionMode==='manual'||eligibleLoading||eligibleTotal===null||eligibleTotal===0} onChange={(event)=>setQuestionCount(Math.max(1,Math.min(Number(event.target.value)||1,eligibleTotal??Number.MAX_SAFE_INTEGER)))}/><small>{eligibleLoading?'Hisoblanmoqda…':eligibleTotal!==null?`Maximum: ${eligibleTotal}`:'Mavzu tanlang'}</small></label>
        <label>Tartib<select name="questionOrder" value={questionOrder} onChange={(event)=>setQuestionOrder(event.target.value as 'fixed'|'shuffled')}><option value="shuffled">Aralashtirilgan</option><option value="fixed">Tanlangan tartib</option></select></label>
        <label>Har savol uchun vaqt<select name="timeLimit" defaultValue="5"><option value="">Cheklanmagan</option><option value="2">2 daqiqa</option><option value="3">3 daqiqa</option><option value="5">5 daqiqa</option><option value="10">10 daqiqa</option><option value="15">15 daqiqa</option></select></label>
        <label>Baholash<select name="markingMode" defaultValue="teacher"><option value="teacher">O‘qituvchi baholaydi</option><option value="peer">Anonim o‘zaro baholash</option><option value="self">O‘zini baholash</option></select></label>
        <label>Peer calibration
          <select name="peerCalibrationPercent" defaultValue="0">
            <option value="0">O‘chirilgan</option><option value="10">10% teacher check</option><option value="20">20% teacher check</option><option value="50">50% teacher check</option><option value="100">100% double check</option>
          </select><small>Faqat peer rejimida: tanlangan javoblarni o‘qituvchi ham mustaqil tekshiradi.</small>
        </label>
        <label>Peer farq chegarasi<input name="peerDisagreementThreshold" type="number" min="0" max="20" step="0.5" defaultValue="1"/><small>Peer va teacher balli bundan ko‘p farq qilsa quality queue’da ko‘rinadi.</small></label>
        <label>Leaderboard<select name="leaderboardMode" defaultValue="marks"><option value="marks">Faqat Cambridge ballari</option><option value="marks_speed_tiebreak">Ball, teng bo‘lsa tezlik</option></select></label>
        <label>Proyektorda ism<select name="displayNameMode" defaultValue="anonymous_alias"><option value="anonymous_alias">Anonim: Ishtirokchi 1</option><option value="initials">Faqat initsiallar</option><option value="first_name">Faqat ism</option><option value="full">To‘liq ism</option></select><small>Anonim rejim maxfiylik uchun tavsiya etiladi.</small></label>
        <label className="live-check"><input name="includeDiagrams" type="checkbox" checked={includeDiagrams} onChange={(event)=>{setIncludeDiagrams(event.target.checked);clearManualPool()}}/><span>Diagramma va jadvallarni qo‘shish</span></label>
        <label className="live-check"><input name="excludeSeen" type="checkbox" checked={excludeSeen} onChange={(event)=>{setExcludeSeen(event.target.checked);clearManualPool()}}/><span>Oldin ishlatilgan savollarni olmaslik</span></label>
        <label className="live-check"><input name="allowLateJoin" type="checkbox" defaultChecked/><span>Boshlanganidan keyin qo‘shilishga ruxsat</span></label>
        <label className="live-check"><input name="autoCloseWhenAllSubmitted" type="checkbox"/><span>Barcha javob berganda avtomatik yopish</span></label>
        <label className="live-check"><input name="teacherOverrideEnabled" type="checkbox" defaultChecked/><span>Peer/self bahoni o‘qituvchi tuzata oladi</span></label>
        <button disabled={busy||!coursebookSectionCodes.length||!classes.length||(selectionMode==='manual'&&!selectedQuestionIds.length)||(selectionMode==='auto'&&(eligibleLoading||eligibleTotal===null||eligibleTotal===0))}>{busy?'Yaratilmoqda…':'Xonani yaratish'}</button>
        <small className="live-create-semantics">Draft saqlanmaydi: “Xonani yaratish” darhol lobby ochadi; o‘quvchilar faqat siz Start bosgandan keyin savolni ko‘radi.</small>
        {!classes.length?<small className="live-warning">Avval kamida bitta sinf yarating.</small>:null}
      </aside>
    </form>}
    <section className="live-history"><header><h2>{user.role==='student'?'Sessiyalarim':'Oxirgi sessiyalar'}</h2><span>{sessions.length}</span></header>
      {loading?<p className="live-empty">Yuklanmoqda…</p>:!sessions.length?<p className="live-empty">Hali live sessiya yo‘q.</p>:<div className="live-session-list">{sessions.map((session)=><article className="live-session-row" key={session.id}><button className="live-session-open" onClick={()=>navigate(`${user.role==='student'?'oquvchi':'oqitish'}/live?id=${session.id}`)}><span className={`live-state live-state--${session.status}`}>{STATUS_LABEL[session.status]}</span><strong>{session.title}</strong><small>{session.className} · {session.questionCount} savol · {session.participantCount} o‘quvchi</small><i>→</i></button>{user.role!=='student'&&['finished','cancelled'].includes(session.status)?<button type="button" className="live-session-delete" disabled={deletingSessionId===session.id} aria-label={`${session.title} sessiyasini tarixdan o‘chirish`} title="Tarixdan o‘chirish" onClick={()=>void deleteHistorySession(session)}><Trash/>{deletingSessionId===session.id?'O‘chirilmoqda…':'O‘chirish'}</button>:null}</article>)}</div>}
    </section>
  </div>;
}

function SessionJoinCode({session}:{session:LiveExamSnapshot['session']}) {
  if (!['question_open','marking','review'].includes(session.status)) return null;
  return <section className="live-projector-join" aria-label="Sessiyaga kirish kodi">
    <span>Kirish kodi</span><strong>{session.joinCode}</strong>
    <small>{session.settings.allowLateJoin?'Kechikib qo‘shilish yoqilgan':'Kechikib qo‘shilish o‘chirilgan'}</small>
  </section>;
}

function ProjectorView({snapshot,sessionId}:{snapshot:LiveExamSnapshot;sessionId:string}) {
  const {session}=snapshot;
  const remaining=useCountdown(session.deadline,session.serverNow);
  return <div className="live-projector-overlay">
    <header><div className="live-projector-brand"><span/><strong>CamPath</strong><small>LIVE</small></div><div>{session.title}<small>{session.className}</small></div><div className="live-projector-session-info"><SessionJoinCode session={session}/><time className={remaining!==null&&remaining<30?'is-urgent':''}>{formatClock(remaining)}</time></div></header>
    <main className={session.pausedAt?'is-paused':''}>
      {session.pausedAt?<section className="live-paused-card"><Broadcast size={56}/><span>CHALLENGE PAUZADA</span><h1>O‘qituvchi davom ettirishi kutilmoqda</h1></section>:null}
      {!session.pausedAt?<>
      {session.status==='lobby'?<section className="live-projector-lobby"><span>JOIN CODE</span><strong>{session.joinCode}</strong><p>{session.participantCount} o‘quvchi qo‘shildi</p></section>:null}
      {session.status==='question_open'&&snapshot.question?<><LiveQuestionView question={snapshot.question}/><div className="live-projector-count"><UsersThree size={32}/><strong>{session.submittedCount}/{session.participantCount}</strong><span>javob topshirdi</span></div></>:null}
      {session.status==='marking'&&snapshot.markScheme?<><MarkSchemeView scheme={snapshot.markScheme}/><div className="live-projector-count"><CheckCircle size={32}/><strong>{session.reviewedCount}/{session.reviewCount}</strong><span>baholash tugadi</span></div></>:null}
      {session.status==='review'?<LiveExamLeaderboard sessionId={sessionId} version={session.version} variant="projector"/>:null}
      {session.status==='finished'?<section className="live-projector-result"><CheckCircle size={72} weight="fill"/><h1>Sessiya yakunlandi</h1><p>{session.questionCount} ta Cambridge savoli bajarildi.</p></section>:null}
      {session.status==='cancelled'?<section className="live-projector-result"><h1>Sessiya bekor qilindi</h1></section>:null}
      </>:null}
    </main>
    {session.status!=='lobby'?<SessionProgress snapshot={snapshot}/>:null}
  </div>;
}

function StudentRoom({snapshot,refresh,userId}:{snapshot:LiveExamSnapshot;refresh:()=>Promise<void>;userId:string}) {
  const {session}=snapshot;
  const [answer,setAnswer]=useState('');
  const [dirty,setDirty]=useState(false);
  const [saving,setSaving]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [draftConflict,setDraftConflict]=useState(false);
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [manualScore,setManualScore]=useState(0);
  const [levelNumber,setLevelNumber]=useState<number|undefined>();
  const [feedback,setFeedback]=useState('');
  const saveTimer=useRef<number|undefined>(undefined);
  const retryTimer=useRef<number|undefined>(undefined);
  const pendingSave=useRef<string|null>(null);
  const saveInFlight=useRef(false);
  const submitting=useRef(false);
  const latestAnswer=useRef('');
  const answerKey=useRef('');
  const deadlineFlushSecond=useRef<number|null>(null);
  const autoSubmittedKey=useRef('');
  const autoSubmitAttempts=useRef(0);
  const [hydratedKey,setHydratedKey]=useState('');
  const tabId=useRef(`tab-${Math.random().toString(36).slice(2)}`);
  const draftConflictRef=useRef(false);
  const conflictingDraft=useRef<string|null>(null);
  const remaining=useCountdown(session.deadline,session.serverNow);
  const leave=async()=>{
    setBusy(true);setError('');
    try{await api(`/live-exams/${session.id}/leave`,{method:'POST'});navigate('oquvchi/live')}
    catch(cause){setError(message(cause,'Xonadan chiqib bo‘lmadi.'));setBusy(false)}
  };

  useEffect(()=>{
    const key=snapshot.question?.id??snapshot.ownAnswer?.id??'';
    if(key===answerKey.current)return;
    answerKey.current=key;
    deadlineFlushSecond.current=null;
    autoSubmittedKey.current='';
    autoSubmitAttempts.current=0;
    draftConflictRef.current=false;
    conflictingDraft.current=null;
    setDraftConflict(false);
    setHydratedKey('');
    const serverText=snapshot.ownAnswer?.text??'';
    const serverUpdatedAt=snapshot.ownAnswer?.updatedAt?new Date(snapshot.ownAnswer.updatedAt).getTime():0;
    const localDraft=key?readLiveDraft(liveDraftKey(userId,session.id,key)):null;
    const useLocal=Boolean(localDraft&&localDraft.updatedAt>serverUpdatedAt&&localDraft.text!==serverText);
    const initial=useLocal?localDraft!.text:serverText;
    latestAnswer.current=initial;
    pendingSave.current=useLocal?initial:null;
    setAnswer(initial);
    setDirty(useLocal);
    setHydratedKey(key);
  },[session.id,userId,snapshot.ownAnswer?.id,snapshot.ownAnswer?.text,snapshot.ownAnswer?.updatedAt,snapshot.question?.id]);
  const draftKey=snapshot.question?.id??snapshot.ownAnswer?.id??'';
  useEffect(()=>{
    if(!draftKey||hydratedKey!==draftKey||snapshot.ownAnswer?.submittedAt)return;
    writeLiveDraft(liveDraftKey(userId,session.id,draftKey),answer,tabId.current);
  },[answer,draftKey,hydratedKey,session.id,userId,snapshot.ownAnswer?.submittedAt]);
  useEffect(()=>{
    if(!draftKey||snapshot.ownAnswer?.submittedAt)return;
    const key=liveDraftKey(userId,session.id,draftKey);
    const onStorage=(event:StorageEvent)=>{
      if(event.key!==key||!event.newValue)return;
      try{
        const incoming=JSON.parse(event.newValue) as {version?:unknown;text?:unknown;updatedAt?:unknown;tabId?:unknown};
        if(incoming.version!==LIVE_DRAFT_VERSION||incoming.tabId===tabId.current
          ||typeof incoming.text!=='string'||typeof incoming.updatedAt!=='number')return;
        if(dirty&&incoming.text!==answer){
          draftConflictRef.current=true;
          conflictingDraft.current=incoming.text;
          pendingSave.current=null;
          window.clearTimeout(saveTimer.current);
          window.clearTimeout(retryTimer.current);
          setDraftConflict(true);
          setError('Boshqa tabda shu javob o‘zgartirildi. Qaysi versiyani davom ettirishni tanlang; avtomatik saqlash vaqtincha to‘xtatildi.');
          return
        }
        latestAnswer.current=incoming.text;
        pendingSave.current=incoming.text;
        setAnswer(incoming.text);setDirty(true);
      }catch{/* Ignore malformed storage entries. */}
    };
    window.addEventListener('storage',onStorage);
    return()=>window.removeEventListener('storage',onStorage);
  },[answer,dirty,draftKey,session.id,userId,snapshot.ownAnswer?.submittedAt]);
  useEffect(()=>{setSelected(new Set());setManualScore(0);setLevelNumber(undefined);setFeedback('')},[snapshot.review?.id]);
  const flushAnswer=async(text=latestAnswer.current,attempt=0)=>{
    if(draftConflictRef.current||session.status!=='question_open'||session.pausedAt||snapshot.ownAnswer?.submittedAt||submitting.current)return;
    pendingSave.current=text;
    if(saveInFlight.current)return;
    const outgoing=pendingSave.current??'';
    pendingSave.current=null;
    saveInFlight.current=true;
    setSaving(true);
    let retryScheduled=false;
    try{
      await api(`/live-exams/${session.id}/answer`,{method:'PUT',body:JSON.stringify({text:outgoing})});
      if(latestAnswer.current===outgoing){setDirty(false);setError('')}
      else pendingSave.current=latestAnswer.current;
    }catch(cause){
      if(draftConflictRef.current){
        pendingSave.current=null;
      }else{
        pendingSave.current=latestAnswer.current;
        setError(message(cause,'Javob saqlanmadi. Ulanish tiklanganda qayta uriniladi.'));
        if(attempt<4){
          retryScheduled=true;
          window.clearTimeout(retryTimer.current);
          retryTimer.current=window.setTimeout(()=>{
            const pending=pendingSave.current;
            if(!draftConflictRef.current&&pending!==null)void flushAnswer(pending,attempt+1);
          },2**attempt*1000);
        }
      }
    }finally{
      saveInFlight.current=false;
      setSaving(false);
      if(!draftConflictRef.current&&!retryScheduled&&!submitting.current&&pendingSave.current!==null){
        const pending=pendingSave.current;
        void flushAnswer(pending);
      }
    }
  };
  useEffect(()=>{
    if(draftConflict||!dirty||session.status!=='question_open'||session.pausedAt||snapshot.ownAnswer?.submittedAt)return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current=window.setTimeout(()=>void flushAnswer(latestAnswer.current),700);
    return()=>window.clearTimeout(saveTimer.current);
  },[answer,dirty,draftConflict,session.id,session.pausedAt,session.status,snapshot.ownAnswer?.submittedAt]);
  useEffect(()=>{
    if(remaining===null||!DEADLINE_DRAFT_FLUSH_SECONDS.has(remaining)||deadlineFlushSecond.current===remaining)return;
    deadlineFlushSecond.current=remaining;
    if(session.status!=='question_open'||session.pausedAt||snapshot.ownAnswer?.submittedAt)return;
    const pending=pendingSave.current??(dirty?latestAnswer.current:null);
    if(pending===null)return;
    window.clearTimeout(saveTimer.current);
    void flushAnswer(pending);
  },[remaining,dirty,session.pausedAt,session.status,snapshot.ownAnswer?.submittedAt]);
  useEffect(()=>{
    const retry=()=>{if(!draftConflictRef.current&&pendingSave.current!==null)void flushAnswer(pendingSave.current)};
    const flush=()=>{if(!draftConflictRef.current&&dirty){const pending=pendingSave.current??latestAnswer.current;void flushAnswer(pending)}};
    window.addEventListener('online',retry);
    window.addEventListener('visibilitychange',flush);
    window.addEventListener('pagehide',flush);
    return()=>{window.removeEventListener('online',retry);window.removeEventListener('visibilitychange',flush);window.removeEventListener('pagehide',flush);window.clearTimeout(retryTimer.current)};
  },[dirty]);

  const resolveDraftConflict=(useIncoming:boolean)=>{
    const next=useIncoming?(conflictingDraft.current??latestAnswer.current):latestAnswer.current;
    window.clearTimeout(saveTimer.current);
    window.clearTimeout(retryTimer.current);
    draftConflictRef.current=false;
    conflictingDraft.current=null;
    setDraftConflict(false);
    latestAnswer.current=next;
    pendingSave.current=next;
    setAnswer(next);
    setDirty(true);
    setError('');
    if(draftKey)writeLiveDraft(liveDraftKey(userId,session.id,draftKey),next,tabId.current);
    const flushChosenDraft=()=>{
      if(draftConflictRef.current||submitting.current)return;
      if(saveInFlight.current){
        retryTimer.current=window.setTimeout(flushChosenDraft,50);
        return;
      }
      const pending=pendingSave.current;
      if(pending!==null)void flushAnswer(pending);
    };
    retryTimer.current=window.setTimeout(flushChosenDraft,0);
  };
  const submitAnswer=async(automatic=false)=>{
    if(draftConflictRef.current||submitting.current||snapshot.ownAnswer?.submittedAt)return;
    if(automatic)autoSubmitAttempts.current+=1;
    setBusy(true);setError('');
    submitting.current=true;
    window.clearTimeout(saveTimer.current);
    window.clearTimeout(retryTimer.current);
    pendingSave.current=null;
    try{await api(`/live-exams/${session.id}/answer/submit`,{method:'POST',body:JSON.stringify({text:latestAnswer.current})});if(draftKey)removeLiveDraft(liveDraftKey(userId,session.id,draftKey));setDirty(false);await refresh()}
    catch(cause){
      pendingSave.current=latestAnswer.current;
      setError(message(cause,automatic?'Vaqt tugadi. Avtomatik yuborish tekshirilmoqda; serverdagi oxirgi saqlangan javob himoyalangan.':'Javob topshirilmadi.'));
      if(automatic&&autoSubmitAttempts.current<4&&answerKey.current===draftKey){
        window.clearTimeout(retryTimer.current);
        retryTimer.current=window.setTimeout(()=>{
          if(answerKey.current===draftKey&&!submitting.current)void submitAnswer(true);
        },2000);
      }
    }
    finally{submitting.current=false;setBusy(false)}
  };
  useEffect(()=>{
    if(remaining!==0||session.status!=='question_open'||session.pausedAt
      ||snapshot.ownAnswer?.submittedAt||!draftKey||hydratedKey!==draftKey
      ||autoSubmittedKey.current===draftKey)return;
    autoSubmittedKey.current=draftKey;
    void submitAnswer(true);
  },[remaining,session.status,session.pausedAt,snapshot.ownAnswer?.submittedAt,draftKey,hydratedKey]);
  const submitReview=async()=>{
    if(!snapshot.review)return;setBusy(true);setError('');
    try{await api(`/live-exams/${session.id}/reviews/${snapshot.review.id}/submit`,{method:'POST',body:JSON.stringify({matchedPointIds:[...selected],score:manualScore,levelNumber,feedback:feedback||undefined})});await refresh()}
    catch(cause){setError(message(cause,'Baholash yuborilmadi.'))}finally{setBusy(false)}
  };

  if(session.status==='lobby')return <section className="live-wait" aria-labelledby="live-wait-title"><div className="live-pulse" aria-hidden="true"><Broadcast size={42}/></div><span>XONAGA QO‘SHILDINGIZ</span><h1 id="live-wait-title">{session.title}</h1><p role="status" aria-live="polite">O‘qituvchi o‘yinni boshlashi kutilmoqda. {session.participantCount} o‘quvchi tayyor.</p>{error?<p className="live-error" role="alert">{error}</p>:null}<button className="live-secondary" disabled={busy} onClick={()=>void leave()}>Xonadan chiqish</button></section>;
  if(session.pausedAt)return <section className="live-wait" aria-labelledby="live-paused-title"><div className="live-pulse" aria-hidden="true"><Broadcast size={42}/></div><span>CHALLENGE PAUZADA</span><h1 id="live-paused-title">{session.title}</h1><p role="status" aria-live="assertive">Javob va baholash vaqtincha to‘xtatildi. O‘qituvchi davom ettirishi kutilmoqda.</p></section>;
  if(session.status==='question_open'&&snapshot.question)return <div className="live-student-workspace">
    <header><button className="live-icon-button" onClick={()=>navigate('oquvchi/live')} aria-label="Sessiyalarga qaytish"><ArrowLeft/></button><div><strong>{session.title}</strong><small className="live-save-status" role="status" aria-live="polite" aria-atomic="true">{saving?'Saqlanmoqda…':dirty?'O‘zgarish bor':'✓ Sinxronlandi'}</small></div><time aria-label={remaining===null?'Vaqt cheklanmagan':`Qolgan vaqt ${formatClock(remaining)}`} className={remaining!==null&&remaining<30?'is-urgent':''}>{formatClock(remaining)}</time></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}{draftConflict?<section className="live-draft-conflict" role="alert"><strong>Ikki tabdagi javob farq qiladi</strong><p>Avtomatik saqlash to‘xtatildi. Bu tabdagi matnni saqlash yoki boshqa tabdagi so‘nggi matnni olishni tanlang.</p><div><button type="button" className="live-secondary" onClick={()=>resolveDraftConflict(false)}>Bu tabdagi javobni saqlash</button><button type="button" className="live-secondary" onClick={()=>resolveDraftConflict(true)}>Boshqa tabdagi javobni olish</button></div></section>:null}<SessionProgress snapshot={snapshot}/>{session.joinedLate?<section className="live-late-join-notice" role="status"><strong>Kech qo‘shildingiz</strong><span>Bu savol uchun alohida vaqt qo‘shilmaydi: yuqoridagi qolgan vaqt siz uchun ham amal qiladi. Ball odatdagi Cambridge mark scheme bo‘yicha hisoblanadi.</span></section>:null}<LiveQuestionView question={snapshot.question}/>
    <section className="live-answer-box"><header><label htmlFor="live-answer">Javobingiz</label><span>{answer.trim()?answer.trim().split(/\s+/).length:0} so‘z</span></header><textarea id="live-answer" aria-describedby="live-answer-help" value={answer} disabled={Boolean(snapshot.ownAnswer?.submittedAt)||remaining===0||Boolean(session.pausedAt)} onChange={(event)=>{const value=event.target.value;latestAnswer.current=value;pendingSave.current=value;setAnswer(value);setDirty(true)}} placeholder="Javobingizni shu yerga yozing…"/><small id="live-answer-help" className="live-answer-help">Javob avtomatik saqlanadi. “Javobni topshirish” bosilgach tahrirlash yopiladi.</small><button disabled={draftConflict||busy||remaining===0||Boolean(snapshot.ownAnswer?.submittedAt)||Boolean(session.pausedAt)} onClick={()=>void submitAnswer()}>{snapshot.ownAnswer?.submittedAt?'Topshirildi ✓':draftConflict?'Tablar ziddiyatini hal qiling':busy?'Yuborilmoqda…':remaining===0?'Avtomatik topshirilmoqda…':'Javobni topshirish'}</button></section>
  </div>;
  if(session.status==='marking'&&snapshot.markScheme)return <div className="live-review-workspace">
    <ReviewQuestionContext question={snapshot.question}/>
    <div className="live-marking-layout"><div><MarkSchemeView scheme={snapshot.markScheme}/></div><aside className="live-review-card">
      {!snapshot.review?<><h2>Baholash kutilmoqda</h2><p>{session.markingMode==='peer'?'Anonim tekshiruv yakunlanmoqda. Agar peer tekshiruvni tugata olmasa, o‘qituvchi davom ettiradi.':'O‘qituvchi sizga javob biriktirmoqda.'}</p></>:snapshot.review.status!=='assigned'?<><CheckCircle size={54} weight="fill"/><h2>Baholash yuborildi</h2><p>{snapshot.review.kind==='peer'?'Anonim javobga bergan bahoingiz yuborildi. Bu sizning natijangiz emas.':snapshot.review.kind==='self'?'O‘z-o‘zini baholash yuborildi. Yakuniy natija o‘qituvchi natijalarni ochganda ko‘rinadi.':'Baholash yuborildi. Natijalar ochilishi kutilmoqda.'}</p></>:<><span className="live-eyebrow">{snapshot.review.kind==='peer'?'ANONIM JAVOB':snapshot.review.kind==='self'?'O‘Z JAVOBINGIZ':'JAVOB'}</span><h2>Mark scheme asosida tekshiring</h2><blockquote>{snapshot.review.answerText||'Javob yozilmagan'}</blockquote><MarkSchemeView scheme={{...snapshot.markScheme,points:snapshot.review.points}} interactive selected={selected} onToggle={(id)=>setSelected((current)=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}/>{snapshot.markScheme.levels.length?<label>Rasmiy band<select value={levelNumber??''} onChange={(e)=>{const level=snapshot.markScheme?.levels.find((item)=>item.levelNumber===Number(e.target.value));setLevelNumber(level?.levelNumber);if(level)setManualScore(level.minMarks)}}><option value="">Bandni tanlang</option>{snapshot.markScheme.levels.map((level)=><option key={level.id} value={level.levelNumber}>Level {level.levelNumber}: {level.minMarks}–{level.maxMarks} ball</option>)}</select></label>:null}{schemeNeedsManualScore(snapshot.markScheme)?<label>Ball<input type="number" min={snapshot.markScheme.levels.find((level)=>level.levelNumber===levelNumber)?.minMarks??0} max={snapshot.markScheme.levels.find((level)=>level.levelNumber===levelNumber)?.maxMarks??snapshot.question?.marks??0} value={manualScore} onChange={(e)=>setManualScore(Number(e.target.value))}/></label>:null}<label>Qisqa izoh<textarea value={feedback} maxLength={5000} onChange={(e)=>setFeedback(e.target.value)} placeholder="Nima uchun shu ballni berdingiz?"/></label>{error?<p className="live-error" role="alert">{error}</p>:null}<button disabled={busy} onClick={submitReview}>{busy?'Yuborilmoqda…':'Baholashni yuborish'}</button></>}
    </aside></div>
  </div>;
  if(session.status==='review'&&!snapshot.ownAnswer)return <section className="live-wait"><h2>Joriy savol yakunlangan</h2><p>Siz ushbu savolning baholash bosqichida qo‘shildingiz. Keyingi savol ochilishini kuting.</p></section>;
  if(session.status==='review')return <section className="live-student-result"><ReviewQuestionContext question={snapshot.question}/><span className="live-eyebrow">SAVOL NATIJASI</span><h1>{snapshot.ownAnswer?.score??'—'} <small>/ {snapshot.question?.marks}</small></h1><p>{snapshot.ownAnswer?.feedback||'Mark scheme pointlari asosida baholandi.'}</p><div><h2>Sizning javobingiz</h2><blockquote>{snapshot.ownAnswer?.text||'Javob yozilmagan'}</blockquote></div><ReleasedPointFeedbackView feedback={snapshot.ownPointFeedback}/>{snapshot.markScheme?<details className="live-complete-scheme"><summary>To‘liq Cambridge Mark Scheme</summary><MarkSchemeView scheme={snapshot.markScheme}/></details>:null}<p className="live-wait-note">O‘qituvchi keyingi savolni ochishi kutilmoqda.</p></section>;
  if(session.status==='finished')return <section className="live-student-result live-finished"><CheckCircle size={64} weight="fill"/><span className="live-eyebrow">SESSIYA YAKUNLANDI</span><h1>{session.title}</h1><p>{session.questionCount} ta savol bajarildi. Natijalar saqlandi.</p>{snapshot.report?<><strong className="live-total-score">{snapshot.report.earned} / {snapshot.report.possible}</strong><div className="live-report-list">{snapshot.report.rows.map((row)=><article key={`${row.questionPosition}-${row.displayRef}`}><span>Savol {row.questionPosition+1}</span><strong>{row.displayRef}</strong><b>{row.score??'—'} / {row.marks}</b><div className="live-personal-answer"><strong>Sizning javobingiz</strong><p>{row.answerText||'Javob yozilmagan'}</p>{row.feedback?<small>Izoh: {row.feedback}</small>:null}<ReleasedPointFeedbackView feedback={row.pointFeedback}/></div></article>)}</div></>:null}<button onClick={()=>navigate('oquvchi/live')}>Sessiyalarimga qaytish</button></section>;
  return <section className="live-wait"><h1>Sessiya bekor qilindi</h1><button onClick={()=>navigate('oquvchi/live')}>Ortga</button></section>;
}

function TeacherAnswerMarker({snapshot,answer,onDone}:{snapshot:LiveExamSnapshot;answer:LiveExamAnswer&{studentName:string;reviewId:string|null;reviewStatus:string|null;reviewKind:LiveExamMarkingMode|null;reviewMatchedPointIds?:string[]};onDone:()=>Promise<void>}) {
  const [selected,setSelected]=useState<Set<string>>(new Set(answer.reviewMatchedPointIds??[]));
  const [score,setScore]=useState(answer.score??answer.provisionalScore??0);
  const [levelNumber,setLevelNumber]=useState<number|undefined>();
  const [feedback,setFeedback]=useState(answer.feedback??answer.provisionalFeedback??'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const mutationAttempt=useRef<{fingerprint:string;key:string}|null>(null);
  const teacherOwnsReview=answer.reviewStatus==='assigned'&&Boolean(answer.reviewId)&&answer.reviewKind==='teacher';
  const canOverride=snapshot.session.markingMode==='teacher'||snapshot.session.settings.teacherOverrideEnabled;
  const submit=async()=>{
    setBusy(true);setError('');
    try{
      const path=teacherOwnsReview
        ?`/live-exams/${snapshot.session.id}/reviews/${answer.reviewId}/submit`
        :`/live-exams/${snapshot.session.id}/answers/${answer.id}/moderate`;
      const method=teacherOwnsReview?'POST':'PUT';
      const payload=teacherOwnsReview
        ?{matchedPointIds:[...selected],score,levelNumber,feedback:feedback||undefined,expectedVersion:snapshot.session.version}
        :{score,feedback:feedback||undefined,levelNumber,expectedVersion:snapshot.session.version};
      const fingerprint=`${method}:${path}:${JSON.stringify(payload)}`;
      const key=mutationAttempt.current?.fingerprint===fingerprint?mutationAttempt.current.key:randomId();
      mutationAttempt.current={fingerprint,key};
      await api(path,{method,headers:{'Idempotency-Key':key},body:JSON.stringify(payload)});
      await onDone();
    }catch(cause){setError(message(cause,'Baho saqlanmadi.'))}finally{setBusy(false)}
  };
  const scheme=snapshot.markScheme;
  return <article className="live-teacher-marker"><header><div><span>O‘QUVCHI JAVOBI</span><h2>{answer.studentName}</h2></div><strong>{answer.score??answer.provisionalScore??'—'}/{snapshot.question?.marks}</strong></header><blockquote>{answer.text||'Javob yozilmagan'}</blockquote>
    {scheme?<MarkSchemeView scheme={scheme} interactive={teacherOwnsReview} selected={selected} onToggle={(id)=>setSelected((current)=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}/>:null}
    {scheme?.levels.length?<label>Rasmiy band<select disabled={!teacherOwnsReview&&!canOverride} value={levelNumber??''} onChange={(e)=>{const level=scheme.levels.find((item)=>item.levelNumber===Number(e.target.value));setLevelNumber(level?.levelNumber);if(level)setScore(level.minMarks)}}><option value="">Bandni tanlang</option>{scheme.levels.map((level)=><option key={level.id} value={level.levelNumber}>Level {level.levelNumber}: {level.minMarks}–{level.maxMarks} ball</option>)}</select></label>:null}
    {(schemeNeedsManualScore(scheme)||!teacherOwnsReview)?<label>Ball<input disabled={!teacherOwnsReview&&!canOverride} type="number" min={scheme?.levels.find((level)=>level.levelNumber===levelNumber)?.minMarks??0} max={scheme?.levels.find((level)=>level.levelNumber===levelNumber)?.maxMarks??snapshot.question?.marks??0} value={score} onChange={(e)=>setScore(Number(e.target.value))}/></label>:null}
    <label>Izoh<textarea disabled={!teacherOwnsReview&&!canOverride} value={feedback} onChange={(e)=>setFeedback(e.target.value)} maxLength={5000}/></label>{error?<p className="live-error">{error}</p>:null}<button disabled={busy||Boolean(snapshot.session.pausedAt)||(!teacherOwnsReview&&!canOverride)} onClick={submit}>{busy?'Saqlanmoqda…':teacherOwnsReview?'Bahoni tasdiqlash':canOverride?'Bahoni yangilash':'Teacher override o‘chirilgan'}</button>
  </article>;
}

function LiveDetailedReportPanel({sessionId}:{sessionId:string}) {
  const [report,setReport]=useState<LiveDetailedReport|null>(null);
  const [error,setError]=useState('');
  const [downloading,setDownloading]=useState(false);
  const [pdfBusy,setPdfBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    setError('');
    void api<LiveDetailedReport>(`/live-exams/${sessionId}/report`)
      .then((value)=>{if(active)setReport(value)})
      .catch((cause)=>{if(active)setError(message(cause,'Batafsil hisobot yuklanmadi.'))});
    return()=>{active=false};
  },[sessionId]);
  const downloadCsv=async()=>{
    setDownloading(true);setError('');
    try{
      const blob=await apiBlob(`/live-exams/${sessionId}/report.csv`);
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download=`live-report-${sessionId}.csv`;anchor.click();
      URL.revokeObjectURL(url);
    }catch(cause){setError(message(cause,'CSV hisobot yuklanmadi.'))}
    finally{setDownloading(false)}
  };
  const downloadPdf=async()=>{
    setPdfBusy(true);setError('');
    try{
      const exp=await api<{id:string;status:'queued'|'running'|'succeeded'|'failed';error:string|null}>('/exports',{
        method:'POST',
        headers:{'Idempotency-Key':randomId()},
        body:JSON.stringify({kind:'feedback',refTable:'live_exam_sessions',refId:sessionId,format:'pdf',title:report?.session.title}),
      });
      await api('/jobs/run-once',{method:'POST',body:JSON.stringify({exportId:exp.id})}).catch(()=>null);
      let complete=exp;
      for(let attempt=0;attempt<30&&complete.status!=='succeeded';attempt+=1){
        if(complete.status==='failed')throw new Error(complete.error??'PDF hisobot yaratilmadi.');
        await new Promise(resolve=>window.setTimeout(resolve,1000));
        complete=await api<typeof exp>(`/exports/${exp.id}`);
      }
      if(complete.status!=='succeeded')throw new Error('PDF hisobot navbatda qoldi. Exportlar bo‘limidan holatini tekshiring.');
      const blob=await apiBlob(`/exports/${exp.id}/file`);
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download=`live-report-${sessionId}.pdf`;anchor.click();
      URL.revokeObjectURL(url);
    }catch(cause){setError(message(cause,'PDF hisobot yaratilmadi.'))}
    finally{setPdfBusy(false)}
  };
  if(error&&!report)return <p className="live-error" role="alert">{error}</p>;
  if(!report)return <p className="live-empty">Batafsil hisobot tayyorlanmoqda…</p>;
  return <section className="live-detailed-report" aria-label="Batafsil Live Challenge hisoboti">
    <header><div><span className="live-eyebrow">BATAFSIL HISOBOT</span><h2>{report.session.className}</h2><p>Class total, o‘rtacha natija, savol/subtopic kesimi va mark-point xatolari.</p></div><div className="live-report-actions"><button type="button" className="live-secondary" disabled={downloading||pdfBusy} onClick={()=>void downloadCsv()}>{downloading?'CSV tayyorlanmoqda…':'CSV yuklash'}</button><button type="button" disabled={pdfBusy||downloading} onClick={()=>void downloadPdf()}>{pdfBusy?'PDF tayyorlanmoqda…':'PDF hisobot'}</button></div></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    <div className="live-report-kpis">
      <article><span>O‘quvchi</span><strong>{report.aggregate.studentCount}</strong></article>
      <article><span>Sinf jami</span><strong>{report.aggregate.totalEarned} / {report.aggregate.totalPossible}</strong><small>Barcha o‘quvchilar ballari yig‘indisi</small></article>
      <article><span>O‘rtacha</span><strong>{report.aggregate.averageScore.toFixed(1)} / {report.aggregate.averagePossible.toFixed(1)}</strong><small>{Math.round(report.aggregate.averagePercentage*100)}%</small></article>
    </div>
    <div className="live-report-grid">
      <section><h3>O‘quvchilar</h3>{report.students.map((row)=><div className="live-report-metric-row" key={row.studentId}><span>{row.studentName}</span><strong>{row.earned}/{row.possible} · {Math.round(row.percentage*100)}%</strong></div>)}</section>
      <section><h3>Savollar</h3>{report.questions.map((row)=><div className="live-report-metric-row" key={row.sessionQuestionId}><span>Q{row.questionPosition+1} · {row.displayRef}<small>{row.subtopics.map((item)=>item.subtopicCode).join(', ')||'Subtopic evidence yo‘q'}</small></span><strong>{row.earned}/{row.possible} · {Math.round(row.percentage*100)}%</strong></div>)}</section>
    </div>
    <div className="live-report-grid">
      <section><h3>Subtopic natijalari</h3>{report.subtopics.length?report.subtopics.map((row)=><div className="live-report-metric-row" key={row.subtopicId}><span>{row.subtopicCode} · {row.subtopicTitle}<small>{row.attempts} evidence</small></span><strong>{row.earned}/{row.possible} · {Math.round(row.percentage*100)}%</strong></div>):<p className="live-empty">Subtopic evidence topilmadi.</p>}</section>
      <section><h3>Eng ko‘p yo‘qotilgan mark pointlar</h3>{report.mostMissedPoints.length?report.mostMissedPoints.slice(0,10).map((row)=><div className="live-report-metric-row" key={row.pointId}><span>{row.displayRef} · {row.code}<small>{row.text}</small></span><strong>{row.missedCount}/{row.assessedCount} · {Math.round(row.missRate*100)}%</strong></div>):<p className="live-empty">Qayd etilgan mark-point xatosi yo‘q.</p>}</section>
    </div>
    <section className="live-reteach"><h3>Qayta o‘qitish tavsiyasi</h3>{report.reteachRecommendations.length?report.reteachRecommendations.map((row)=><article key={row.subtopicId}><strong>{row.code} · {row.title}</strong><p>{row.reason}</p></article>):<p>Sinfda 60% dan past evidence-backed subtopic topilmadi.</p>}</section>
  </section>;
}

function TeacherRoom({snapshot,refresh}:{snapshot:LiveExamSnapshot;refresh:()=>Promise<void>}) {
  const {session}=snapshot;
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [activeAnswerId,setActiveAnswerId]=useState('');
  const mutationAttempt=useRef<{fingerprint:string;key:string}|null>(null);
  const remaining=useCountdown(session.deadline,session.serverNow);
  const teacherCalibrationAnswers=snapshot.teacherAnswers.filter((item)=>item.reviewStatus==='assigned'&&item.reviewKind==='teacher'&&item.reviewPurpose==='calibration');
  const teacherFallbackAnswers=snapshot.teacherAnswers.filter((item)=>item.reviewStatus==='assigned'&&item.reviewKind==='teacher'&&item.reviewPurpose!=='calibration');
  const teacherAssignedAnswers=[...teacherCalibrationAnswers,...teacherFallbackAnswers];
  const activeAnswer=snapshot.teacherAnswers.find((item)=>item.id===activeAnswerId)
    ??teacherAssignedAnswers[0]
    ??snapshot.teacherAnswers.find((item)=>item.reviewStatus==='assigned')
    ??snapshot.teacherAnswers[0];
  const act=async(path:string,body?:Record<string, unknown>)=>{
    setBusy(true);setError('');
    try{
      const payload={...(body??{})};
      if(!('expectedVersion' in payload))payload.expectedVersion=session.version;
      const requestPath=`/live-exams/${session.id}${path}`;
      const fingerprint=`POST:${requestPath}:${JSON.stringify(payload)}`;
      const key=mutationAttempt.current?.fingerprint===fingerprint?mutationAttempt.current.key:randomId();
      mutationAttempt.current={fingerprint,key};
      await api(requestPath,{method:'POST',headers:{'Idempotency-Key':key},body:JSON.stringify(payload)});
      await refresh();
    }catch(cause){setError(message(cause,'Amal bajarilmadi.'))}finally{setBusy(false)}
  };
  const removeParticipant=async(studentId:string,fullName:string)=>{
    if(!window.confirm(`${fullName} xonadan chiqarilsinmi?`))return;
    await act(`/participants/${studentId}/remove`,{expectedVersion:session.version});
  };
  const copyCode=()=>void navigator.clipboard?.writeText(session.joinCode);
  const openProjector=()=>window.open(`${window.location.href.split('#')[0]}#oqitish/live?id=${session.id}&projector=1`,'campath-projector','noopener,noreferrer');

  return <div className="live-page live-room"><header className="live-room-head"><button className="live-icon-button" onClick={()=>navigate('oqitish/live')} aria-label="Live sessiyalarga qaytish"><ArrowLeft/></button><div><span className={`live-state live-state--${session.status}`}>{session.pausedAt?'Pauzada':STATUS_LABEL[session.status]}</span><h1>{session.title}</h1><p>{session.className} · {MODE_LABEL[session.markingMode]}</p></div><div className="live-room-actions"><button className="live-secondary" onClick={openProjector}><Monitor/> Proyektor</button><button className="live-secondary" onClick={()=>void refresh()}><ArrowsClockwise/> Yangilash</button>{['question_open','marking','review'].includes(session.status)?<button className="live-secondary" disabled={busy} onClick={()=>void act(session.pausedAt?'/resume':'/pause',{expectedVersion:session.version})}>{session.pausedAt?'Davom ettirish':'Pauza'}</button>:null}{!['finished','cancelled'].includes(session.status)?<button className="live-danger" disabled={busy} onClick={()=>{if(window.confirm('Live sessiyani bekor qilmoqchimisiz? Bu amalni ortga qaytarib bo‘lmaydi.'))void act('/cancel')}}>Bekor qilish</button>:null}</div></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    {['question_open','marking','review'].includes(session.status)?<section className="live-active-join" aria-label="Challenge kirish kodi"><div><span>KIRISH KODI · JOIN CODE</span><strong>{session.joinCode}</strong><small>{session.settings.allowLateJoin?'Kechikkan o‘quvchilar qo‘shilishi mumkin':'Kechikib kirish o‘chirilgan'}</small></div><button type="button" className="live-secondary" onClick={copyCode}><Copy/> Nusxalash</button><label className="live-active-join-toggle"><input type="checkbox" checked={session.settings.allowLateJoin} disabled={busy} onChange={(e)=>void act('/late-join',{allowLateJoin:e.target.checked,expectedVersion:session.version})}/> Kechikib qo‘shilish</label></section>:null}
    {session.pausedAt?<section className="live-paused-banner"><strong>Challenge pauzada</strong><span>Student javobi va baholash bloklangan; timer muzlatilgan.</span></section>:null}
    {session.status==='lobby'?<div className="live-lobby-layout"><section className="live-code-card"><span>JOIN CODE</span><strong>{session.joinCode}</strong><button onClick={copyCode}><Copy/> Kodni nusxalash</button><p>O‘quvchilar akkauntiga kirib, “Live Challenge” bo‘limida kodni kiritadi.</p><button className="live-start" disabled={busy||session.participantCount<1} onClick={()=>void act('/start')}>{busy?'Boshlanmoqda…':'O‘yinni boshlash'}</button></section><LobbyParticipants snapshot={snapshot} busy={busy} onRemove={(studentId,fullName)=>void removeParticipant(studentId,fullName)}/></div>:null}
    {session.status==='question_open'&&snapshot.question?<><SessionProgress snapshot={snapshot}/><div className="live-teacher-question"><div><LiveQuestionView question={snapshot.question}/></div><aside><div className="live-timer-card"><span>QOLGAN VAQT</span><strong className={remaining!==null&&remaining<30?'is-urgent':''}>{session.pausedAt?formatClock(session.pauseRemainingS):formatClock(remaining)}</strong></div><div className="live-submit-stat"><strong>{session.submittedCount}</strong><span>/ {session.participantCount} topshirdi</span><progress max={Math.max(1,session.participantCount)} value={session.submittedCount}/></div><ul className="live-submit-list">{snapshot.participants.map((person)=><li key={person.id}><span>{person.fullName}</span><b className={person.submitted?'is-done':''}>{person.submitted?'Topshirdi':'Yozmoqda'}</b></li>)}</ul><button disabled={busy||Boolean(session.pausedAt)} onClick={()=>void act('/reveal')}>Javoblarni yopish va MSni ochish</button><small>Topshirmagan javoblar bo‘sh holatda avtomatik yopiladi.</small></aside></div></>:null}
    {session.status==='marking'?<><SessionProgress snapshot={snapshot}/><ReviewQuestionContext question={snapshot.question}/><div className="live-marking-head"><div><span className="live-eyebrow">BAHOLASH</span><h2>{session.reviewedCount}/{session.reviewCount} ta tugadi</h2></div><div className="live-marking-actions"><button disabled={busy||Boolean(session.pausedAt)||session.reviewedCount<session.reviewCount} onClick={()=>void act('/marking/complete')}>Natijalarni ochish</button>{session.markingMode!=='teacher'&&session.reviewedCount<session.reviewCount?<button className="live-secondary" disabled={busy||Boolean(session.pausedAt)} onClick={()=>{if(window.confirm('Tugallanmagan peer/self baholashlarni o‘qituvchiga biriktirishni xohlaysizmi? Hech kimga avtomatik 0 ball berilmaydi.'))void act('/marking/complete',{force:true})}}>Kutilayotganlarni o‘qituvchiga olish</button>:null}</div></div>
      {session.markingMode==='teacher'&&activeAnswer?<div className="live-teacher-marking"><nav>{snapshot.teacherAnswers.map((answer,index)=><button className={activeAnswer.id===answer.id?'is-active':''} key={answer.id} onClick={()=>setActiveAnswerId(answer.id)}><span>{index+1}</span><strong>{answer.studentName}</strong><i>{answer.reviewStatus==='assigned'?'Kutilmoqda':`${answer.score??0}/${snapshot.question?.marks}`}</i></button>)}</nav><TeacherAnswerMarker key={`${activeAnswer.id}:${activeAnswer.reviewStatus}:${activeAnswer.score}`} snapshot={snapshot} answer={activeAnswer} onDone={()=>{setActiveAnswerId('');return refresh()}}/></div>:null}
      {session.markingMode!=='teacher'?<><div className="live-peer-progress"><MarkSchemeView scheme={snapshot.markScheme!}/><section><h2>{MODE_LABEL[session.markingMode]}</h2><p>Peer/self bergan ball marking davomida vaqtinchalik hisoblanadi. Yakuniy ball faqat natijalar ochilganda release qilinadi.</p>{snapshot.teacherAnswers.map((answer)=><div key={answer.id}><span><strong>{answer.studentName}</strong><small>{answer.reviewStatus==='assigned'?(answer.reviewKind==='teacher'?(answer.reviewPurpose==='calibration'?'Teacher calibration':'O‘qituvchi tekshiradi'):'Baholamoqda'):'Tekshiruv tugadi'}</small></span><b>{answer.score!==null?`${answer.score}/${snapshot.question?.marks}`:answer.provisionalScore!==null&&answer.provisionalScore!==undefined?`${answer.provisionalScore}/${snapshot.question?.marks} · vaqtinchalik`:'—'}</b></div>)}</section></div>
      {(snapshot.peerQualityQueue??[]).length?<section className="live-review-override" aria-label="Peer marking quality queue"><header><span className="live-eyebrow">PEER QUALITY</span><h2>Teacher ko‘rishi kerak bo‘lgan farqlar</h2><p>Calibration sample’da peer va teacher ballari belgilangan chegaradan ko‘p farq qildi.</p></header><div className="live-report-list">{(snapshot.peerQualityQueue??[]).map((item)=><article key={item.answerId}><span>{item.studentName}</span><strong>Peer {item.peerScore} · Teacher {item.teacherScore}</strong><b>Δ {item.disagreement}</b></article>)}</div></section>:null}
      {teacherAssignedAnswers.length&&activeAnswer?.reviewKind==='teacher'&&activeAnswer.reviewStatus==='assigned'?<section className="live-review-override"><header><span className="live-eyebrow">{activeAnswer.reviewPurpose==='calibration'?'TEACHER CALIBRATION':'TEACHER FALLBACK'}</span><h2>{activeAnswer.reviewPurpose==='calibration'?'Peer bahoni mustaqil tekshirish':'Tugallanmagan anonim tekshiruvlar'}</h2><p>{activeAnswer.reviewPurpose==='calibration'?'Peer reviewer natijasini ko‘rmasdan Cambridge mark scheme bo‘yicha mustaqil baholang.':'Bu javoblar peer/self tomonidan yakunlanmagan. O‘qituvchi ularni tekshiradi; avtomatik 0 ball berilmaydi.'}</p></header><div className="live-teacher-marking"><nav>{teacherAssignedAnswers.map((answer,index)=><button className={activeAnswer.id===answer.id?'is-active':''} key={answer.id} onClick={()=>setActiveAnswerId(answer.id)}><span>{index+1}</span><strong>{answer.studentName}</strong><i>{answer.reviewPurpose==='calibration'?'Calibration':'O‘qituvchi'}</i></button>)}</nav><TeacherAnswerMarker key={`teacher-review:${activeAnswer.id}:${activeAnswer.reviewStatus}:${activeAnswer.score}`} snapshot={snapshot} answer={activeAnswer} onDone={()=>{setActiveAnswerId('');return refresh()}}/></div></section>:null}</>:null}
    </>:null}
    {session.status==='review'?<><ReviewQuestionContext question={snapshot.question}/><section className="live-review-summary"><div><span className="live-eyebrow">SAVOL YAKUNI</span><h2>Natijalarni ko‘rib chiqing</h2><p>{session.markingMode==='teacher'||session.settings.teacherOverrideEnabled?'Baholarni keyingi savolga o‘tishdan oldin o‘qituvchi tuzatishi mumkin.':'Peer va self baholar final; teacher override o‘chirilgan.'}</p></div><button disabled={busy||Boolean(session.pausedAt)} onClick={()=>void act('/next')}>{session.currentQuestionIndex+1<session.questionCount?'Keyingi savol →':'Sessiyani yakunlash'}</button></section><LiveExamLeaderboard sessionId={session.id} version={session.version}/><div className="live-result-table"><header><span>O‘quvchi</span><span>Baholash</span><span>Ball</span></header>{snapshot.teacherAnswers.map((answer)=><div key={answer.id}><strong>{answer.studentName}</strong><span>{answer.scoreSource?MODE_LABEL[answer.scoreSource]:'Baholanmagan'}</span><b>{answer.score??'—'} / {snapshot.question?.marks}</b></div>)}</div>{(session.markingMode==='teacher'||session.settings.teacherOverrideEnabled)&&activeAnswer?<section className="live-review-override"><header><span className="live-eyebrow">BAHONI TUZATISH</span><h2>Teacher override</h2></header><div className="live-teacher-marking"><nav>{snapshot.teacherAnswers.map((answer,index)=><button className={activeAnswer.id===answer.id?'is-active':''} key={answer.id} onClick={()=>setActiveAnswerId(answer.id)}><span>{index+1}</span><strong>{answer.studentName}</strong><i>{answer.score??0}/{snapshot.question?.marks}</i></button>)}</nav><TeacherAnswerMarker key={`review:${activeAnswer.id}:${activeAnswer.reviewStatus}:${activeAnswer.score}`} snapshot={snapshot} answer={activeAnswer} onDone={()=>refresh()}/></div></section>:null}{snapshot.markScheme?<MarkSchemeView scheme={snapshot.markScheme}/>:null}</>:null}
    {session.status==='finished'?<><section className="live-finished live-teacher-finished"><CheckCircle size={64} weight="fill"/><span className="live-eyebrow">SESSIYA YAKUNLANDI</span><h1>{session.questionCount} ta savol bajarildi</h1><p>Barcha javoblar, baholar va audit voqealari saqlandi.</p>{snapshot.report?<><strong className="live-total-score">{snapshot.report.earned} / {snapshot.report.possible} sinf ballari</strong><div className="live-report-list">{snapshot.report.rows.map((row,index)=><article key={`${row.studentId}-${row.questionPosition}-${index}`}><span>Savol {row.questionPosition+1}</span><strong>{row.studentName} · {row.displayRef}</strong><b>{row.score??'—'} / {row.marks}</b></article>)}</div></>:null}<button onClick={()=>navigate('oqitish/live')}>Sessiyalar ro‘yxati</button></section><LiveDetailedReportPanel sessionId={session.id}/></>:null}
    {session.status==='cancelled'?<section className="live-finished"><h1>Sessiya bekor qilingan</h1><button onClick={()=>navigate('oqitish/live')}>Ortga</button></section>:null}
  </div>;
}

function LiveRoom({user,sessionId,projector}:{user:User;sessionId:string;projector:boolean}) {
  const projectorView=projector&&user.role!=='student';
  const {snapshot,error,loading,refresh}=useLiveSnapshot(sessionId,projectorView);
  if(loading&&!snapshot)return <p className="live-loading">Live sessiya yuklanmoqda…</p>;
  if(error&&!snapshot)return <div className="live-page"><p className="live-error" role="alert">{error}</p><button onClick={()=>navigate(`${user.role==='student'?'oquvchi':'oqitish'}/live`)}>Ortga</button></div>;
  if(!snapshot)return null;
  if(projectorView)return <ProjectorView snapshot={snapshot} sessionId={sessionId}/>;
  return user.role==='student'?<StudentRoom snapshot={snapshot} refresh={()=>refresh()} userId={user.id}/>:<TeacherRoom snapshot={snapshot} refresh={()=>refresh()}/>;
}

export function LiveExamPage({user,classes}:{user:User;classes:ClassItem[]}) {
  const route=useRoute();
  const sessionId=route.params.get('id');
  const projector=route.params.get('projector')==='1';
  return sessionId?<LiveRoom key={`${sessionId}:${projector}`} user={user} sessionId={sessionId} projector={projector}/>:<LiveLanding user={user} classes={classes}/>;
}
