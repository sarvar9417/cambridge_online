import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { ArrowsOut } from '@phosphor-icons/react/ArrowsOut';
import { BookOpenText } from '@phosphor-icons/react/BookOpenText';
import { ChalkboardTeacher } from '@phosphor-icons/react/ChalkboardTeacher';
import { CheckCircle } from '@phosphor-icons/react/CheckCircle';
import { FileText } from '@phosphor-icons/react/FileText';
import { List } from '@phosphor-icons/react/List';
import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { X } from '@phosphor-icons/react/X';
import { api, type LessonProgress } from '../lib/api';
import { navigate, useRoute } from '../lib/router';
import { buildTopicPlan, type LessonTopic, type TopicPage } from './lesson-topic-plan';
import {
  LESSON_EXPERIENCE_CHAPTERS,
  auditBullets,
  courseCode,
  courseName,
  displayPageTitle,
  firstStudyPage,
  learnerSlidesForPage,
  practicePage,
  presentationBeatsForTopic,
  topicLabel,
  type LessonAudience,
  type LessonExperienceChapter,
  type LessonMode,
} from './lesson-experience-model';
import { LessonPresentationScreen, LessonStudySlide, revealCountForBeat } from './LessonContent';
import { LessonPastPaper } from './LessonPastPaper';
import './lesson-experience.css';

type LessonExperienceProps = {audience:LessonAudience};

const modeLabel:Record<LessonMode,string>={study:'O‘qish',present:'Taqdimot',exam:'Past Papers'};

function lessonUrl(audience:LessonAudience,chapter:number,topic:string,pageIndex:number,mode:LessonMode,beat=0){
  const params=new URLSearchParams({chapter:String(chapter),topic,page:String(pageIndex+1),mode});
  if(mode==='present')params.set('beat',String(beat+1));
  return `${audience==='student'?'oquvchi':'oqitish'}/darslar?${params}`;
}

function safeStorageGet(key:string){try{return window.localStorage.getItem(key);}catch{return null;}}
function safeStorageSet(key:string,value:string){try{window.localStorage.setItem(key,value);}catch{/* Persistence is optional. */}}

function mergeProgress(current:LessonProgress[],saved:LessonProgress[]){
  const keys=new Set(saved.map(item=>`${item.chapterNo}:${item.slideId}`));
  return [...saved,...current.filter(item=>!keys.has(`${item.chapterNo}:${item.slideId}`))];
}

function pageSlideIds(page:TopicPage){return [...new Set(page.slides.map(slide=>slide.id))];}

function completedPageIds(progress:LessonProgress[],chapter:LessonExperienceChapter){
  const complete=new Set(progress.filter(item=>item.chapterNo===chapter.number&&item.completedAt).map(item=>item.slideId));
  const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
  return new Set(topics.flatMap(topic=>topic.pages).filter(page=>page.kind==='study'&&pageSlideIds(page).every(id=>complete.has(id))).map(page=>page.id));
}

function chapterStats(chapter:LessonExperienceChapter){
  const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
  const studyPages=topics.flatMap(topic=>topic.pages).filter(page=>page.kind==='study');
  return {topics,studyPages};
}

function firstTopicWithPractice(topics:LessonTopic[]){return topics.find(topic=>practicePage(topic))??topics[0]??null;}

function LessonLibrary({audience,progress}:{audience:LessonAudience;progress:LessonProgress[]}){
  const [query,setQuery]=useState('');
  const [course,setCourse]=useState<'all'|'9618'|'0478'>('all');
  const filtered=LESSON_EXPERIENCE_CHAPTERS.filter(chapter=>{
    if(course!=='all'&&courseCode(chapter)!==course)return false;
    const term=query.trim().toLowerCase();
    return !term||`${chapter.number} ${chapter.title} ${chapter.subtopics.join(' ')}`.toLowerCase().includes(term);
  });
  const groups=[
    {code:'9618' as const,title:'Cambridge International AS & A Level Computer Science'},
    {code:'0478' as const,title:'Cambridge IGCSE / O Level Computer Science'},
  ];
  const open=(chapter:LessonExperienceChapter,mode:LessonMode)=>{
    const {topics}=chapterStats(chapter);
    const topic=mode==='exam'?firstTopicWithPractice(topics):topics[0];
    if(!topic)return;
    const remembered=mode==='study'?safeStorageGet(`campath:lesson:last:${audience}:${chapter.number}`):null;
    if(remembered){navigate(remembered);return;}
    const page=firstStudyPage(topic);
    navigate(lessonUrl(audience,chapter.number,topic.code,Math.max(0,topic.pages.indexOf(page!)),mode));
  };
  return <section className="lx-library" aria-labelledby="lx-library-title">
    <header className="lx-library-head"><div><span>DARSLAR</span><h1 id="lx-library-title">O‘rganish uchun aniq yo‘l</h1><p>Bobni tanlang, to‘liq mazmunni o‘qing yoki sinf taqdimotini boshlang.</p></div><div className="lx-library-tools"><label><MagnifyingGlass size={19} aria-hidden="true"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Chapter yoki mavzuni qidiring" aria-label="Chapter yoki mavzuni qidiring"/></label><div role="group" aria-label="Kurs filtri"><button type="button" className={course==='all'?'is-active':''} onClick={()=>setCourse('all')}>Barchasi</button><button type="button" className={course==='9618'?'is-active':''} onClick={()=>setCourse('9618')}>9618</button><button type="button" className={course==='0478'?'is-active':''} onClick={()=>setCourse('0478')}>0478</button></div></div></header>
    {groups.map(group=>{
      const chapters=filtered.filter(chapter=>courseCode(chapter)===group.code);
      if(!chapters.length)return null;
      return <section className="lx-course-group" key={group.code}><header><span>{group.code}</span><div><h2>{group.title}</h2><p>{group.code==='9618'?'AS va A Level darslari':'IGCSE va O Level darslari'}</p></div></header><div className="lx-chapter-list">{chapters.map(chapter=>{
        const {topics,studyPages}=chapterStats(chapter);
        const complete=completedPageIds(progress,chapter).size;
        const percent=studyPages.length?Math.round((complete/studyPages.length)*100):0;
        return <article className="lx-chapter-row" key={chapter.number}><div className="lx-chapter-number"><span>CHAPTER</span><strong>{String(chapter.number).padStart(2,'0')}</strong></div><div className="lx-chapter-copy"><div><span>{chapter.level}</span><span>{topics.filter(topic=>topic.code!=='overview').length} topic</span><span>{studyPages.length} dars qismi</span></div><h3>{chapter.title}</h3><p>{chapter.subtopics.join(' · ')}</p>{audience==='student'?<div className="lx-card-progress"><span><i style={{width:`${percent}%`}}/></span><small>{complete}/{studyPages.length} qism tugallangan</small></div>:null}</div><div className="lx-chapter-actions"><button type="button" className="lx-primary" onClick={()=>open(chapter,'study')}><BookOpenText size={20}/>{audience==='student'&&complete?'Davom ettirish':'O‘qish'}</button>{audience==='teacher'?<button type="button" onClick={()=>open(chapter,'present')}><ChalkboardTeacher size={20}/>Taqdimot</button>:null}<button type="button" onClick={()=>open(chapter,'exam')}><FileText size={20}/>Past Papers</button></div></article>;
      })}</div></section>;
    })}
    {!filtered.length?<div className="lx-empty"><strong>Hech narsa topilmadi.</strong><p>Qidiruv so‘zini yoki kurs filtrini o‘zgartiring.</p></div>:null}
  </section>;
}

function ModeTabs({audience,mode,onChange}:{audience:LessonAudience;mode:LessonMode;onChange:(mode:LessonMode)=>void}){
  const modes:LessonMode[]=audience==='teacher'?['study','present','exam']:['study','exam'];
  return <div className="lx-mode-tabs" role="tablist" aria-label="Dars rejimi">{modes.map(item=><button type="button" role="tab" aria-selected={mode===item} className={mode===item?'is-active':''} onClick={()=>onChange(item)} key={item}>{item==='study'?<BookOpenText size={19}/>:item==='present'?<ChalkboardTeacher size={19}/>:<FileText size={19}/>}<span>{modeLabel[item]}</span></button>)}</div>;
}

function TopicOutline({topics,activeTopic,activePage,mode,onOpen,onClose}:{topics:LessonTopic[];activeTopic:LessonTopic;activePage:TopicPage|null;mode:LessonMode;onOpen:(topic:LessonTopic,page:TopicPage)=>void;onClose:()=>void}){
  return <aside className="lx-outline" aria-label="Dars mundarijasi"><header><div><span>MUNDARIJA</span><strong>Chapter mavzulari</strong></div><button type="button" aria-label="Mundarijani yopish" onClick={onClose}><X size={20}/></button></header><nav>{topics.map(topic=>{
    const pages=mode==='exam'?(practicePage(topic)?[practicePage(topic)!]:[]):topic.pages.filter(page=>page.kind==='study');
    return <section className={topic.code===activeTopic.code?'is-active':''} key={topic.code}><button type="button" className="lx-topic-button" onClick={()=>pages[0]&&onOpen(topic,pages[0])}><span>{topicLabel(topic)}</span><strong>{topic.title}</strong><small>{pages.length}</small></button>{topic.code===activeTopic.code&&mode==='study'?<div className="lx-page-links">{pages.map((page,index)=><button type="button" aria-current={page.id===activePage?.id?'page':undefined} className={page.id===activePage?.id?'is-current':''} onClick={()=>onOpen(topic,page)} key={page.id}><span>{String(index+1).padStart(2,'0')}</span><strong>{displayPageTitle(page,topic)}</strong></button>)}</div>:null}</section>;
  })}</nav></aside>;
}

function SourceAudit({page}:{page:TopicPage}){
  const pages=[...new Set(page.slides.flatMap(slide=>slide.sourcePages??[]))].sort((a,b)=>a-b);
  const elements=[...new Set(page.slides.flatMap(slide=>slide.sourceElements??[]))];
  const atoms=page.slides.flatMap(slide=>slide.sourceAtomEvidence??[]);
  const bulletEvidence=page.slides.flatMap(auditBullets);
  if(!pages.length&&!elements.length&&!atoms.length&&!bulletEvidence.length)return null;
  return <details className="lx-source-audit"><summary>O‘qituvchi uchun manba auditi</summary><div>{pages.length?<p><strong>Manba sahifalari:</strong> {pages.join(', ')}</p>:null}{elements.length?<section><strong>Qamrab olingan elementlar</strong><ul>{elements.map(item=><li key={item}>{item}</li>)}</ul></section>:null}{atoms.length?<section><strong>Tekshirilgan source atomlar</strong><ul>{atoms.map(atom=><li key={atom.id}><span>{atom.kind}</span>{atom.sourceRef}</li>)}</ul></section>:null}{bulletEvidence.length?<section><strong>Extraction dalillari</strong><ul>{bulletEvidence.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul></section>:null}</div></details>;
}

export function LessonExperience({audience}:LessonExperienceProps){
  const route=useRoute();
  const rootRef=useRef<HTMLElement|null>(null);
  const chapterNumber=Number(route.params.get('chapter')||0);
  const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===chapterNumber)??null;
  const topics=useMemo(()=>chapter?buildTopicPlan(chapter.slides,chapter.subtopics):[],[chapter]);
  const activeTopic=topics.find(topic=>topic.code===(route.params.get('topic')??''))??topics[0]??null;
  const requestedMode=route.params.get('mode');
  const mode:LessonMode=requestedMode==='exam'||(requestedMode==='present'&&audience==='teacher')?requestedMode:'study';
  const studyPages=activeTopic?.pages.filter(page=>page.kind==='study')??[];
  const requestedPage=Math.max(0,Number(route.params.get('page')??1)-1);
  const activePage=studyPages[Math.min(Number.isFinite(requestedPage)?requestedPage:0,Math.max(0,studyPages.length-1))]??null;
  const [outlineOpen,setOutlineOpen]=useState(false);
  const [progress,setProgress]=useState<LessonProgress[]>([]);
  const [saving,setSaving]=useState(false);
  const beats=useMemo(()=>activeTopic?presentationBeatsForTopic(activeTopic):[],[activeTopic]);
  const requestedBeat=Math.max(0,Number(route.params.get('beat')??1)-1);
  const beatIndex=Math.min(Number.isFinite(requestedBeat)?requestedBeat:0,Math.max(0,beats.length-1));
  const activeBeat=beats[beatIndex]??null;
  const [reveal,setReveal]=useState(0);

  const navigateTo=useCallback((targetTopic:LessonTopic,targetPage:TopicPage,targetMode:LessonMode=mode,targetBeat=0)=>{
    const index=targetTopic.pages.filter(page=>page.kind==='study').findIndex(page=>page.id===targetPage.id);
    navigate(lessonUrl(audience,chapterNumber,targetTopic.code,Math.max(0,index),targetMode,targetBeat));
    setOutlineOpen(false);
  },[audience,chapterNumber,mode]);

  useEffect(()=>setReveal(activeBeat?Math.min(1,revealCountForBeat(activeBeat)):0),[activeBeat?.id]);
  useEffect(()=>{
    if(audience!=='student')return;
    let cancelled=false;
    void api<{data:LessonProgress[]}>('/content/lessons/progress').then(result=>{if(!cancelled)setProgress(result.data)}).catch(()=>{});
    return()=>{cancelled=true};
  },[audience]);
  useEffect(()=>{
    if(!chapter||!activeTopic||!activePage||mode!=='study')return;
    safeStorageSet(`campath:lesson:last:${audience}:${chapter.number}`,lessonUrl(audience,chapter.number,activeTopic.code,studyPages.indexOf(activePage),'study'));
    if(audience!=='student')return;
    let cancelled=false;
    const ids=pageSlideIds(activePage);
    void Promise.all(ids.map(slideId=>api<LessonProgress>('/content/lessons/progress',{method:'PUT',body:JSON.stringify({chapterNo:chapter.number,slideId,completed:false})}))).then(saved=>{if(!cancelled)setProgress(current=>mergeProgress(current,saved))}).catch(()=>{});
    return()=>{cancelled=true};
  },[audience,chapter?.number,activeTopic?.code,activePage?.id,mode]);

  const exitPresentation=useCallback(()=>{
    if(!chapter||!activeTopic)return;
    const page=firstStudyPage(activeTopic);
    if(page)navigateTo(activeTopic,page,'study');
    if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
  },[chapter,activeTopic,navigateTo]);

  const setMode=useCallback((nextMode:LessonMode)=>{
    if(!chapter||!activeTopic)return;
    if(nextMode==='exam'){
      const topic=practicePage(activeTopic)?activeTopic:firstTopicWithPractice(topics);
      const page=topic?practicePage(topic):null;
      if(topic&&page)navigateTo(topic,page,'exam');
      return;
    }
    const page=activePage??firstStudyPage(activeTopic);
    if(!page)return;
    navigateTo(activeTopic,page,nextMode,0);
    if(nextMode==='present')void rootRef.current?.requestFullscreen?.().catch(()=>{});
  },[chapter,activeTopic,activePage,topics,navigateTo]);

  const openBeat=useCallback((index:number)=>{
    if(!chapter||!activeTopic||!activePage||index<0||index>=beats.length)return;
    navigateTo(activeTopic,activePage,'present',index);
  },[chapter,activeTopic,activePage,beats.length,navigateTo]);

  useEffect(()=>{
    if(mode!=='present'||!activeBeat)return;
    const onKey=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      if(target?.closest('button,input,textarea,select,[contenteditable="true"]'))return;
      if(event.key==='Escape'){event.preventDefault();exitPresentation();return;}
      if(event.key==='ArrowRight'||event.key==='PageDown'){event.preventDefault();openBeat(Math.min(beats.length-1,beatIndex+1));return;}
      if(event.key==='ArrowLeft'||event.key==='PageUp'){event.preventDefault();openBeat(Math.max(0,beatIndex-1));return;}
      if(event.key===' '){event.preventDefault();const total=revealCountForBeat(activeBeat);if(reveal<total)setReveal(value=>value+1);else openBeat(Math.min(beats.length-1,beatIndex+1));}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[mode,activeBeat,beatIndex,beats.length,reveal,exitPresentation,openBeat]);

  if(!chapter)return <LessonLibrary audience={audience} progress={progress}/>;
  if(!activeTopic)return <section className="lx-empty"><strong>Bu chapter uchun dars topilmadi.</strong><button type="button" onClick={()=>navigate(`${audience==='student'?'oquvchi':'oqitish'}/darslar`)}>Darslarga qaytish</button></section>;

  if(mode==='present'){
    if(!activeBeat)return <section ref={rootRef} className="lesson-experience lx-present"><div className="lx-empty"><strong>Bu topic uchun taqdimot ekranlari topilmadi.</strong><button type="button" onClick={exitPresentation}>O‘qish rejimiga qaytish</button></div></section>;
    const totalReveal=revealCountForBeat(activeBeat);
    return <section ref={rootRef} className="lesson-experience lx-present">
      <header className="lx-present-bar"><button type="button" onClick={()=>setOutlineOpen(open=>!open)} aria-expanded={outlineOpen}><List size={22}/><span>Mundarija</span></button><div><span>{courseCode(chapter)} · Chapter {chapter.number} · {topicLabel(activeTopic)}</span><strong>{activeTopic.title}</strong></div><span>{beatIndex+1} / {beats.length}</span><button type="button" onClick={exitPresentation}><X size={22}/><span>Chiqish</span></button></header>
      {outlineOpen?<aside className="lx-present-outline"><header><div><span>{topicLabel(activeTopic)}</span><strong>{activeTopic.title}</strong></div><button type="button" aria-label="Mundarijani yopish" onClick={()=>setOutlineOpen(false)}><X size={22}/></button></header><nav>{beats.map((beat,index)=><button type="button" className={index===beatIndex?'is-active':''} aria-current={index===beatIndex?'step':undefined} onClick={()=>{openBeat(index);setOutlineOpen(false)}} key={beat.id}><span>{String(index+1).padStart(2,'0')}</span><strong>{beat.title}</strong><small>{beat.kind}</small></button>)}</nav></aside>:null}
      <main className="lx-present-stage"><LessonPresentationScreen beat={activeBeat} reveal={totalReveal?reveal:totalReveal}/></main>
      <footer className="lx-present-nav"><button type="button" disabled={beatIndex===0} onClick={()=>openBeat(beatIndex-1)}><ArrowLeft size={24}/><span>Oldingi</span></button><p>{totalReveal>reveal?'Space · keyingi qismni ochish':'Space yoki → · keyingi ekran'}</p><button type="button" disabled={beatIndex===beats.length-1} onClick={()=>openBeat(beatIndex+1)}><span>Keyingi</span><ArrowRight size={24}/></button></footer>
    </section>;
  }

  const flatStudy=topics.flatMap(topic=>topic.pages.filter(page=>page.kind==='study').map(page=>({topic,page})));
  const flatIndex=activePage?flatStudy.findIndex(item=>item.page.id===activePage.id):-1;
  const previous=flatIndex>0?flatStudy[flatIndex-1]:null;
  const next=flatIndex>=0&&flatIndex<flatStudy.length-1?flatStudy[flatIndex+1]:null;
  const currentIds=activePage?pageSlideIds(activePage):[];
  const completedSlides=new Set(progress.filter(item=>item.chapterNo===chapter.number&&item.completedAt).map(item=>item.slideId));
  const pageComplete=Boolean(currentIds.length&&currentIds.every(id=>completedSlides.has(id)));
  const completedInChapter=completedPageIds(progress,chapter).size;
  const totalInChapter=flatStudy.length;
  const markComplete=async()=>{
    if(audience!=='student'||!activePage||saving||pageComplete)return;
    setSaving(true);
    try{
      const saved=await Promise.all(currentIds.map(slideId=>api<LessonProgress>('/content/lessons/progress',{method:'PUT',body:JSON.stringify({chapterNo:chapter.number,slideId,completed:true})})));
      setProgress(current=>mergeProgress(current,saved));
    }finally{setSaving(false);}
  };
  const openOutlinePage=(topic:LessonTopic,page:TopicPage)=>navigateTo(topic,page,mode);
  const examPage=practicePage(activeTopic);

  return <section ref={rootRef} className={`lesson-experience lx-reader${mode==='exam'?' lx-reader--exam':''}`}>
    <header className="lx-chapter-bar"><button type="button" className="lx-back" onClick={()=>navigate(`${audience==='student'?'oquvchi':'oqitish'}/darslar`)}><ArrowLeft size={20}/><span>Darslar</span></button><div className="lx-chapter-title"><span>{courseCode(chapter)} · {chapter.level} · Chapter {chapter.number}</span><strong>{chapter.title}</strong></div><ModeTabs audience={audience} mode={mode} onChange={setMode}/><button type="button" className="lx-mobile-outline" aria-expanded={outlineOpen} onClick={()=>setOutlineOpen(open=>!open)}><List size={21}/><span>Mundarija</span></button></header>
    <div className="lx-reading-progress" aria-label={`Chapter progressi ${completedInChapter}/${totalInChapter}`}><span style={{width:`${totalInChapter?(completedInChapter/totalInChapter)*100:0}%`}}/></div>
    <div className={`lx-layout${outlineOpen?' is-outline-open':''}`}>
      <TopicOutline topics={topics} activeTopic={activeTopic} activePage={mode==='study'?activePage:examPage} mode={mode} onOpen={openOutlinePage} onClose={()=>setOutlineOpen(false)}/>
      {outlineOpen?<button type="button" className="lx-outline-scrim" aria-label="Mundarijani yopish" onClick={()=>setOutlineOpen(false)}/>:null}
      {mode==='study'?<main className="lx-reader-main">
        {activePage?<><header className="lx-page-head"><div><span>{topicLabel(activeTopic)} · {studyPages.indexOf(activePage)+1}/{studyPages.length}</span><h1>{displayPageTitle(activePage,activeTopic)}</h1><p>{activeTopic.title}</p></div>{audience==='student'?<button type="button" className={pageComplete?'is-complete':''} disabled={pageComplete||saving} onClick={markComplete}><CheckCircle size={21}/>{pageComplete?'Tugallangan':saving?'Saqlanmoqda…':'Darsni tugatdim'}</button>:null}</header><div className="lx-study-content">{learnerSlidesForPage(activePage).map(slide=><LessonStudySlide sourceSlide={slide} pageTitle={displayPageTitle(activePage,activeTopic)} key={slide.id}/>)}</div>{audience==='teacher'?<SourceAudit page={activePage}/>:null}</>:<div className="lx-empty"><strong>Bu topic uchun o‘qish qismi topilmadi.</strong></div>}
        <footer className="lx-reader-nav"><button type="button" disabled={!previous} onClick={()=>previous&&navigateTo(previous.topic,previous.page,'study')}><ArrowLeft size={20}/><span>Oldingi dars</span></button><div><span>{Math.max(0,flatIndex+1)} / {flatStudy.length}</span><small>Chapter bo‘yicha</small></div><button type="button" disabled={!next} onClick={()=>next&&navigateTo(next.topic,next.page,'study')}><span>Keyingi dars</span><ArrowRight size={20}/></button></footer>
      </main>:<main className="lx-exam-shell"><header className="lx-exam-topic-head"><div><span>{topicLabel(activeTopic)} · EXAM PRACTICE</span><h1>{activeTopic.title}</h1><p>Bitta savolga e’tibor qarating, javob yozing va keyin mark scheme bilan tekshiring.</p></div>{audience==='teacher'?<button type="button" onClick={()=>void rootRef.current?.requestFullscreen?.().catch(()=>{})}><ArrowsOut size={20}/>To‘liq ekran</button>:null}</header><LessonPastPaper page={examPage} topic={activeTopic} audience={audience}/></main>}
    </div>
  </section>;
}
