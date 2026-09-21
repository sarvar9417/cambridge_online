import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle, Plus, Shuffle, Trash } from '@phosphor-icons/react';
import { api, type LiveExamMarkingMode, type User } from '../lib/api';
import { navigate } from '../lib/router';
import './live-exam.css';

type BuilderSettings = {
  questionOrder:'fixed'|'shuffled';
  timingMode:'teacher'|'per_question';
  defaultTimeLimitSeconds:number|null;
  allowLateJoin:boolean;
  autoCloseWhenAllSubmitted:boolean;
  peerMarkingEnabled:boolean;
  teacherOverrideEnabled:boolean;
  displayNameMode:'first_name'|'full_name'|'anonymous';
};

type BuilderOptions = {
  syllabi:Array<{id:string;code:string;subject:string}>;
  selectedSyllabusId:string|null;
  topics:Array<{id:string;number:number;title:string;subtopics:Array<{id:string;code:string;title:string}>}>;
  classes:Array<{id:string;name:string;grade:number|null;level:string;academicYear:string;syllabusId:string;syllabusCode:string}>;
  defaultSettings:BuilderSettings;
};

type BuilderDraft = {
  id:string;
  classId:string;
  className:string;
  syllabusId:string;
  syllabusCode:string;
  title:string;
  status:'draft';
  markingMode:LiveExamMarkingMode;
  version:number;
  settings:Record<string,unknown>;
  questions:Array<{id:string;position:number;marks:number;displayRef:string}>;
};

type EligibleQuestion = {
  id:string;displayRef:string;stem:string;commandWord:string|null;marks:number;answerKind:string;
  ao:string|null;year:number;series:string;variant:number;component:number;dependencyCount:number;
};

function errorMessage(error:unknown,fallback:string){return error instanceof Error?error.message:fallback;}
function firstSettingId(settings:Record<string,unknown>,key:string){
  const value=settings[key];
  return Array.isArray(value)&&typeof value[0]==='string'?value[0]:null;
}
function booleanSetting(settings:Record<string,unknown>,key:string,fallback:boolean){
  return typeof settings[key]==='boolean'?Boolean(settings[key]):fallback;
}
function stringSetting<T extends string>(settings:Record<string,unknown>,key:string,allowed:readonly T[],fallback:T){
  const value=settings[key];
  return typeof value==='string'&&allowed.includes(value as T)?value as T:fallback;
}

export function LiveChallengeBuilder({draftId,user}:{draftId:string;user:User}) {
  const creating=draftId==='new';
  const [options,setOptions]=useState<BuilderOptions|null>(null);
  const [draft,setDraft]=useState<BuilderDraft|null>(null);
  const [eligible,setEligible]=useState<EligibleQuestion[]>([]);
  const [classId,setClassId]=useState('');
  const [title,setTitle]=useState('');
  const [topicId,setTopicId]=useState('');
  const [subtopicId,setSubtopicId]=useState('');
  const [markingMode,setMarkingMode]=useState<LiveExamMarkingMode>('teacher');
  const [questionOrder,setQuestionOrder]=useState<BuilderSettings['questionOrder']>('fixed');
  const [timingMode,setTimingMode]=useState<BuilderSettings['timingMode']>('teacher');
  const [timeLimit,setTimeLimit]=useState(300);
  const [allowLateJoin,setAllowLateJoin]=useState(false);
  const [autoClose,setAutoClose]=useState(true);
  const [teacherOverrideEnabled,setTeacherOverrideEnabled]=useState(true);
  const [displayNameMode,setDisplayNameMode]=useState<BuilderSettings['displayNameMode']>('first_name');
  const [autoCount,setAutoCount]=useState(5);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const loadOptions=async(syllabusId?:string)=>{
    const suffix=syllabusId?`?syllabusId=${encodeURIComponent(syllabusId)}`:'';
    const result=await api<{data:BuilderOptions}>(`/live-exams/builder-options${suffix}`);
    setOptions(result.data);
    return result.data;
  };

  const loadEligible=async(value:BuilderDraft)=>{
    const selectedTopic=firstSettingId(value.settings,'topicIds');
    const selectedSubtopic=firstSettingId(value.settings,'subtopicIds');
    if(!selectedTopic){setEligible([]);return;}
    const query=new URLSearchParams({syllabusId:value.syllabusId,topicId:selectedTopic,limit:'200'});
    if(selectedSubtopic)query.set('subtopicId',selectedSubtopic);
    const result=await api<{data:EligibleQuestion[]}>(`/live-exams/eligible-questions?${query.toString()}`);
    setEligible(result.data);
  };

  const applyDraftSettings=(value:BuilderDraft)=>{
    setTitle(value.title);
    setMarkingMode(value.markingMode);
    setQuestionOrder(stringSetting(value.settings,'questionOrder',['fixed','shuffled'] as const,'fixed'));
    setTimingMode(stringSetting(value.settings,'timingMode',['teacher','per_question'] as const,'teacher'));
    setTimeLimit(typeof value.settings.defaultTimeLimitSeconds==='number'?value.settings.defaultTimeLimitSeconds:300);
    setAllowLateJoin(booleanSetting(value.settings,'allowLateJoin',false));
    setAutoClose(booleanSetting(value.settings,'autoCloseWhenAllSubmitted',true));
    setTeacherOverrideEnabled(booleanSetting(value.settings,'teacherOverrideEnabled',true));
    setDisplayNameMode(stringSetting(value.settings,'displayNameMode',['first_name','full_name','anonymous'] as const,'first_name'));
  };

  const loadDraft=async()=>{
    if(creating)return null;
    const result=await api<{data:BuilderDraft}>(`/live-exams/${draftId}/builder`);
    setDraft(result.data);
    applyDraftSettings(result.data);
    await Promise.all([loadOptions(result.data.syllabusId),loadEligible(result.data)]);
    return result.data;
  };

  useEffect(()=>{
    let cancelled=false;
    const run=async()=>{
      setLoading(true);setError('');
      try{
        if(user.role==='student')throw new Error('Builder faqat o‘qituvchi uchun mavjud.');
        if(creating){
          const loaded=await loadOptions();
          if(cancelled)return;
          const firstClass=loaded.classes[0];
          if(firstClass){
            setClassId(firstClass.id);
            if(loaded.selectedSyllabusId!==firstClass.syllabusId)await loadOptions(firstClass.syllabusId);
          }
          const firstTopic=loaded.topics[0];
          if(firstTopic)setTopicId(firstTopic.id);
          setQuestionOrder(loaded.defaultSettings.questionOrder);
          setTimingMode(loaded.defaultSettings.timingMode);
          setTimeLimit(loaded.defaultSettings.defaultTimeLimitSeconds??300);
          setAllowLateJoin(loaded.defaultSettings.allowLateJoin);
          setAutoClose(loaded.defaultSettings.autoCloseWhenAllSubmitted);
          setTeacherOverrideEnabled(loaded.defaultSettings.teacherOverrideEnabled);
          setDisplayNameMode(loaded.defaultSettings.displayNameMode);
        }else await loadDraft();
      }catch(cause){if(!cancelled)setError(errorMessage(cause,'Builder yuklanmadi.'));}
      finally{if(!cancelled)setLoading(false);}
    };
    void run();return()=>{cancelled=true};
  },[draftId,user.role]);

  const selectedClass=options?.classes.find((item)=>item.id===classId)??null;
  const selectedTopic=options?.topics.find((item)=>item.id===topicId)??null;
  const selectedIds=draft?.questions.map((item)=>item.id)??[];
  const eligibleMap=useMemo(()=>new Map(eligible.map((item)=>[item.id,item])),[eligible]);

  const changeClass=async(next:string)=>{
    setClassId(next);setTopicId('');setSubtopicId('');
    const target=options?.classes.find((item)=>item.id===next);
    if(!target)return;
    try{
      const loaded=await loadOptions(target.syllabusId);
      setTopicId(loaded.topics[0]?.id??'');
    }catch(cause){setError(errorMessage(cause,'Syllabus yuklanmadi.'));}
  };

  const createDraft=async(event:FormEvent)=>{
    event.preventDefault();
    if(!classId||!topicId||!title.trim())return;
    setBusy(true);setError('');
    try{
      const result=await api<{data:{id:string}}>(`/live-exams/drafts`,{
        method:'POST',body:JSON.stringify({
          classId,title:title.trim(),topicId,subtopicId:subtopicId||undefined,markingMode,
          settings:{
            questionOrder,timingMode,defaultTimeLimitSeconds:timingMode==='per_question'?timeLimit:null,
            allowLateJoin,autoCloseWhenAllSubmitted:autoClose,peerMarkingEnabled:markingMode==='peer',
            teacherOverrideEnabled,displayNameMode,
          },
        }),
      });
      navigate(`oqitish/live?builder=${result.data.id}`);
    }catch(cause){setError(errorMessage(cause,'Qoralama yaratilmadi.'));}
    finally{setBusy(false);}
  };

  const replaceQuestions=async(nextIds:string[])=>{
    if(!draft||busy)return;
    setBusy(true);setError('');
    try{
      await api(`/live-exams/${draft.id}/questions`,{
        method:'PUT',body:JSON.stringify({questionIds:nextIds,expectedVersion:draft.version}),
      });
      await loadDraft();
    }catch(cause){setError(errorMessage(cause,'Savollar yangilanmadi.'));await loadDraft().catch(()=>{});}
    finally{setBusy(false);}
  };

  const addQuestion=(questionId:string)=>{
    if(selectedIds.includes(questionId)||selectedIds.length>=20)return;
    void replaceQuestions([...selectedIds,questionId]);
  };
  const removeQuestion=(questionId:string)=>void replaceQuestions(selectedIds.filter((id)=>id!==questionId));
  const moveQuestion=(index:number,direction:-1|1)=>{
    const target=index+direction;if(target<0||target>=selectedIds.length)return;
    const next=[...selectedIds];[next[index],next[target]]=[next[target]!,next[index]!];
    void replaceQuestions(next);
  };

  const autoSelect=async()=>{
    if(!draft||busy)return;setBusy(true);setError('');
    try{
      await api(`/live-exams/${draft.id}/questions/auto`,{
        method:'POST',body:JSON.stringify({count:autoCount,expectedVersion:draft.version}),
      });
      await loadDraft();
    }catch(cause){setError(errorMessage(cause,'Avtomatik tanlov bajarilmadi.'));await loadDraft().catch(()=>{});}
    finally{setBusy(false);}
  };

  const saveDraftSettings=async()=>{
    if(!draft||busy||title.trim().length<3)return;
    setBusy(true);setError('');
    try{
      await api(`/live-exams/${draft.id}/builder`,{
        method:'PATCH',
        body:JSON.stringify({
          title:title.trim(),
          markingMode,
          settings:{
            questionOrder,timingMode,defaultTimeLimitSeconds:timingMode==='per_question'?timeLimit:null,
            allowLateJoin,autoCloseWhenAllSubmitted:autoClose,peerMarkingEnabled:markingMode==='peer',
            teacherOverrideEnabled,displayNameMode,
          },
          expectedVersion:draft.version,
        }),
      });
      await loadDraft();
    }catch(cause){setError(errorMessage(cause,'Challenge qoidalari saqlanmadi.'));await loadDraft().catch(()=>{});}
    finally{setBusy(false);}
  };
  const publish=async()=>{
    if(!draft||!draft.questions.length||busy)return;setBusy(true);setError('');
    try{
      await api(`/live-exams/${draft.id}/publish`,{
        method:'POST',body:JSON.stringify({expectedVersion:draft.version}),
      });
      navigate(`oqitish/live?id=${draft.id}`);
    }catch(cause){setError(errorMessage(cause,'Challenge nashr qilinmadi.'));await loadDraft().catch(()=>{});}
    finally{setBusy(false);}
  };

  if(loading)return <p className="live-loading">Live Challenge builder yuklanmoqda…</p>;

  if(creating)return <div className="live-page live-landing">
    <header className="live-page-head"><div><button className="live-icon-button" onClick={()=>navigate('oqitish/live')} aria-label="Ortga"><ArrowLeft/></button><span className="live-eyebrow">CAMBRIDGE LIVE CHALLENGE</span><h1>Yangi challenge</h1><p>Avval qoralama yarating. Xona kodi faqat publish bosqichidan keyin beriladi.</p></div></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    <form className="live-create" onSubmit={createDraft}>
      <section className="live-create-main"><span className="live-step">1</span><div><h2>Scope</h2><p>Sinf va canonical Cambridge topic’ni tanlang.</p></div>
        <label>Sinf<select value={classId} onChange={(event)=>void changeClass(event.target.value)} required>{options?.classes.map((item)=><option key={item.id} value={item.id}>{item.name} · {item.syllabusCode} · {item.level}</option>)}</select></label>
        <label>Challenge nomi<input value={title} onChange={(event)=>setTitle(event.target.value)} minLength={3} maxLength={120} placeholder="Chapter 14 revision" required/></label>
        <label>Topic<select value={topicId} onChange={(event)=>{setTopicId(event.target.value);setSubtopicId('')}} required><option value="">Tanlang</option>{options?.topics.map((item)=><option key={item.id} value={item.id}>{item.number}. {item.title}</option>)}</select></label>
        <label>Subtopic<select value={subtopicId} onChange={(event)=>setSubtopicId(event.target.value)}><option value="">Butun topic</option>{selectedTopic?.subtopics.map((item)=><option key={item.id} value={item.id}>{item.code} {item.title}</option>)}</select></label>
        {selectedClass?<small>{selectedClass.syllabusCode} · {selectedClass.academicYear}</small>:null}
      </section>
      <aside className="live-create-side"><span className="live-step">2</span><h2>O‘yin qoidalari</h2>
        <label>Baholash<select value={markingMode} onChange={(event)=>setMarkingMode(event.target.value as LiveExamMarkingMode)}><option value="teacher">O‘qituvchi baholaydi</option><option value="peer">Anonim peer marking</option><option value="self">Self marking</option></select></label>
        <label>Savollar tartibi<select value={questionOrder} onChange={(event)=>setQuestionOrder(event.target.value as BuilderSettings['questionOrder'])}><option value="fixed">Tanlangan tartib</option><option value="shuffled">Publish vaqtida aralashtirish</option></select></label>
        <label>Vaqt boshqaruvi<select value={timingMode} onChange={(event)=>setTimingMode(event.target.value as BuilderSettings['timingMode'])}><option value="teacher">O‘qituvchi boshqaradi</option><option value="per_question">Har savolga vaqt</option></select></label>
        <label>Har savol vaqti<select value={timeLimit} disabled={timingMode!=='per_question'} onChange={(event)=>setTimeLimit(Number(event.target.value))}><option value={120}>2 daqiqa</option><option value={180}>3 daqiqa</option><option value={300}>5 daqiqa</option><option value={600}>10 daqiqa</option><option value={900}>15 daqiqa</option></select></label>
        <label>Board ismlari<select value={displayNameMode} onChange={(event)=>setDisplayNameMode(event.target.value as BuilderSettings['displayNameMode'])}><option value="first_name">Faqat ism</option><option value="full_name">To‘liq ism</option><option value="anonymous">Anonim Learner N</option></select></label>
        <label className="live-check"><input type="checkbox" checked={allowLateJoin} onChange={(event)=>setAllowLateJoin(event.target.checked)}/><span>O‘yin boshlanganidan keyin late join</span></label>
        <label className="live-check"><input type="checkbox" checked={autoClose} onChange={(event)=>setAutoClose(event.target.checked)}/><span>Barcha javob topshirganda javoblarni avtomatik yopish</span></label>
        <label className="live-check"><input type="checkbox" checked={teacherOverrideEnabled} onChange={(event)=>setTeacherOverrideEnabled(event.target.checked)}/><span>Teacher override ruxsat etilsin</span></label>
        <button disabled={busy||!classId||!topicId||title.trim().length<3}>{busy?'Yaratilmoqda…':'Qoralama yaratish'}</button>
      </aside>
    </form>
  </div>;

  if(!draft)return <div className="live-page"><p className="live-error">{error||'Qoralama topilmadi.'}</p><button onClick={()=>navigate('oqitish/live')}>Ortga</button></div>;

  return <div className="live-page live-landing">
    <header className="live-page-head"><div><button className="live-icon-button" onClick={()=>navigate('oqitish/live')} aria-label="Ortga"><ArrowLeft/></button><span className="live-eyebrow">DRAFT · v{draft.version}</span><h1>{draft.title}</h1><p>{draft.className} · {draft.syllabusCode} · savollarni canonical tartibda tayyorlang.</p></div><button className="live-start" disabled={busy||!draft.questions.length} onClick={()=>void publish()}><CheckCircle/> Publish</button></header>
    {error?<p className="live-error" role="alert">{error}</p>:null}
    <div className="live-create">
      <section className="live-create-main"><span className="live-step">1</span><div><h2>Tanlangan savollar</h2><p>Bu tartib classroom round tartibi bo‘ladi.</p></div>
        {!draft.questions.length?<p className="live-empty">Hali savol tanlanmagan.</p>:<div className="live-session-list">{draft.questions.map((question,index)=>{
          const details=eligibleMap.get(question.id);
          return <article key={question.id} className="live-answer-box"><header><span>#{index+1}</span><strong>{question.displayRef}</strong><b>{question.marks} ball</b></header><p>{details?.stem??'Canonical savol snapshotga tayyor.'}</p><div className="live-room-actions"><button type="button" className="live-secondary" disabled={busy||questionOrder==='shuffled'||index===0} onClick={()=>moveQuestion(index,-1)}><ArrowUp/> Yuqoriga</button><button type="button" className="live-secondary" disabled={busy||questionOrder==='shuffled'||index===draft.questions.length-1} onClick={()=>moveQuestion(index,1)}><ArrowDown/> Pastga</button><button type="button" className="live-danger" disabled={busy} onClick={()=>removeQuestion(question.id)}><Trash/> Olib tashlash</button></div></article>;
        })}</div>}
      </section>
      <aside className="live-create-side"><span className="live-step">2</span><h2>Auto selection</h2><p>Draft ID seed’i bilan deterministic tanlov.</p><label>Savollar soni<input type="number" min={1} max={20} value={autoCount} onChange={(event)=>setAutoCount(Number(event.target.value))}/></label><button type="button" disabled={busy} onClick={()=>void autoSelect()}><Shuffle/> Avtomatik tanlash</button><small>Auto selection mavjud manual tanlovni almashtiradi.</small></aside>
    </div>
    <section className="live-history"><header><h2>Eligible Cambridge questions</h2><span>{eligible.length}</span></header>
      {!eligible.length?<p className="live-empty">Bu scope uchun eligible savol topilmadi.</p>:<div className="live-session-list">{eligible.map((question)=>{
        const selected=selectedIds.includes(question.id);
        return <button type="button" disabled={busy||selected||selectedIds.length>=20} key={question.id} onClick={()=>addQuestion(question.id)}><span className="live-state">{question.year} {question.series}</span><strong>{question.displayRef}</strong><small>{question.commandWord??question.answerKind} · {question.marks} ball · Component {question.component}{question.dependencyCount?` · +${question.dependencyCount} majburiy oldingi qism`:''}</small><i>{selected?'✓':<Plus/>}</i></button>;
      })}</div>}
    </section>
  </div>;
}
