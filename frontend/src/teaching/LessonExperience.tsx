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
  auditBullets,
  courseCode,
  displayPageTitle,
  firstStudyPage,
  learnerSlidesForPage,
  practicePage,
  topicLabel,
  type LessonAudience,
  type LessonExperienceChapter,
  type LessonMode,
} from './lesson-experience-model';
import {
  LESSON_COURSE_CATALOG,
  lessonCatalogChapter,
  presentationBeatsForCatalogTopic,
} from './lesson-course-catalog';
import { LessonPresentationScreen, LessonStudySlide, revealCountForBeat } from './LessonContent';
import { LessonPastPaper, type LessonSelfAssessment } from './LessonPastPaper';
import { RealSlideDeckPresentation } from './RealSlideDeckPresentation';
import { realSlideDeckFor } from './real-slide-decks';
import './lesson-experience.css';
import './presentation-hodder-benchmark.css';

type LessonExperienceProps = {audience:LessonAudience;userId:string};
type LessonCourseCode = '9618' | '0478';

const modeLabel:Record<LessonMode,string>={study:'Study',present:'Presentation',exam:'Past Papers'};

function lessonUrl(audience:LessonAudience,course:LessonCourseCode,chapter:number,topic:string,pageIndex:number,mode:LessonMode,beat=0){
  const params=new URLSearchParams({course,chapter:String(chapter),topic,page:String(pageIndex+1),mode});
  if(mode==='present')params.set('beat',String(beat+1));
  return `${audience==='student'?'oquvchi':'oqitish'}/darslar?${params}`;
}

function chapterUrl(audience:LessonAudience,course:LessonCourseCode,chapter:number){
  const params=new URLSearchParams({course,chapter:String(chapter)});
  return (audience==='student'?'oquvchi':'oqitish')+'/darslar?'+params.toString();
}


function safeStorageSet(key:string,value:string){try{window.localStorage.setItem(key,value);}catch{/* Persistence is optional. */}}

function mergeProgress(current:LessonProgress[],saved:LessonProgress[]){
  const keys=new Set(saved.map(item=>item.courseCode+':'+item.chapterNo+':'+item.slideId));
  return [...saved,...current.filter(item=>!keys.has(item.courseCode+':'+item.chapterNo+':'+item.slideId))];
}

function pageSlideIds(page:TopicPage){return [...new Set(page.slides.map(slide=>slide.id))];}

function completedPageIds(progress:LessonProgress[],chapter:LessonExperienceChapter){
  const complete=new Set(progress.filter(item=>item.courseCode===courseCode(chapter)&&item.chapterNo===chapter.number&&item.completedAt).map(item=>item.slideId));
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
  const filtered=LESSON_COURSE_CATALOG.filter(chapter=>{
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
    const syllabus=courseCode(chapter);
    if(mode==='study'){navigate(chapterUrl(audience,syllabus,chapter.number));return;}
    const page=firstStudyPage(topic);
    navigate(lessonUrl(audience,syllabus,chapter.number,topic.code,Math.max(0,topic.pages.indexOf(page!)),mode));
  };
  const totalSections=LESSON_COURSE_CATALOG.reduce((sum,chapter)=>sum+chapterStats(chapter).studyPages.length,0);
  const completedSections=LESSON_COURSE_CATALOG.reduce((sum,chapter)=>sum+completedPageIds(progress,chapter).size,0);
  const startedChapters=LESSON_COURSE_CATALOG.filter(chapter=>progress.some(item=>item.courseCode===courseCode(chapter)&&item.chapterNo===chapter.number)).length;
  const overallPercent=totalSections?Math.round((completedSections/totalSections)*100):0;

  return <section className="lx-library" aria-labelledby="lx-library-title">
    <header className="lx-library-head"><div><span>LESSONS</span><h1 id="lx-library-title">A clear route through the course</h1><p>Choose a chapter, study the complete content or open the classroom presentation.</p></div><div className="lx-library-tools"><label><MagnifyingGlass size={19} aria-hidden="true"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search chapters or topics" aria-label="Search chapters or topics"/></label><div role="group" aria-label="Course filter"><button type="button" className={course==='all'?'is-active':''} onClick={()=>setCourse('all')}>All</button><button type="button" className={course==='9618'?'is-active':''} onClick={()=>setCourse('9618')}>9618</button><button type="button" className={course==='0478'?'is-active':''} onClick={()=>setCourse('0478')}>0478</button></div></div></header>
    {audience==='student'?<section className="lx-learning-stats" aria-label="Darslar progressi">
      <article><strong>{completedSections} / {totalSections}</strong><span>Tugallangan bo‘lim</span></article>
      <article><strong>{overallPercent}%</strong><span>Umumiy progress</span></article>
      <article><strong>{startedChapters} / {LESSON_COURSE_CATALOG.length}</strong><span>Boshlangan chapter</span></article>
    </section>:null}
    {groups.map(group=>{
      const chapters=filtered.filter(chapter=>courseCode(chapter)===group.code);
      if(!chapters.length)return null;
      return <section className="lx-course-group" key={group.code}><header><span>{group.code}</span><div><h2>{group.title}</h2><p>{group.code==='9618'?'AS and A Level lessons':'IGCSE and O Level lessons'}</p></div></header><div className="lx-chapter-list">{chapters.map(chapter=>{
        const {topics,studyPages}=chapterStats(chapter);
        const complete=completedPageIds(progress,chapter).size;
        const percent=studyPages.length?Math.round((complete/studyPages.length)*100):0;
        return <article className="lx-chapter-row" key={`${group.code}-${chapter.number}`}><div className="lx-chapter-number"><span>CHAPTER</span><strong>{String(chapter.number).padStart(2,'0')}</strong></div><div className="lx-chapter-copy"><div><span>{chapter.level}</span><span>{topics.filter(topic=>topic.code!=='overview').length} topics</span><span>{studyPages.length} study sections</span></div><h3>{chapter.title}</h3><p>{chapter.subtopics.join(' · ')}</p>{audience==='student'?<div className="lx-card-progress"><span><i style={{width:`${percent}%`}}/></span><small>{complete}/{studyPages.length} sections completed</small></div>:null}</div><div className="lx-chapter-actions"><button type="button" className="lx-primary" onClick={()=>open(chapter,'study')}><BookOpenText size={20}/>{audience==='student'&&complete?'Continue':'Study'}</button>{audience==='teacher'?<button type="button" onClick={()=>open(chapter,'present')}><ChalkboardTeacher size={20}/>Present</button>:null}<button type="button" onClick={()=>open(chapter,'exam')}><FileText size={20}/>Past Papers</button></div></article>;
      })}</div></section>;
    })}
    {!filtered.length?<div className="lx-empty"><strong>No lessons found.</strong><p>Change the search term or course filter.</p></div>:null}
  </section>;
}

function ChapterOverview({audience,chapter,progress}:{audience:LessonAudience;chapter:LessonExperienceChapter;progress:LessonProgress[]}) {
  const syllabus=courseCode(chapter);
  const topics=buildTopicPlan(chapter.slides,chapter.subtopics);
  const completedPages=completedPageIds(progress,chapter);
  const studyPages=topics.flatMap(topic=>topic.pages.filter(page=>page.kind==='study'));
  const percent=studyPages.length?Math.round((completedPages.size/studyPages.length)*100):0;
  const openTopic=(topic:LessonTopic)=>{
    const pages=topic.pages.filter(page=>page.kind==='study');
    const page=pages.find(item=>!completedPages.has(item.id))??pages[0];
    if(page)navigate(lessonUrl(audience,syllabus,chapter.number,topic.code,pages.indexOf(page),'study'));
  };
  const practiceTopic=firstTopicWithPractice(topics);
  const firstTopic=topics.find(topic=>firstStudyPage(topic))??null;
  return <section className="lx-module-overview">
    <button type="button" className="lx-module-back" onClick={()=>navigate((audience==='student'?'oquvchi':'oqitish')+'/darslar')}><ArrowLeft size={18}/>Darslarga qaytish</button>
    <header className="lx-module-hero">
      <div><span>{syllabus} · {chapter.level} · CHAPTER {String(chapter.number).padStart(2,'0')}</span><h1>{chapter.title}</h1><p>{chapter.subtitle}</p><div className="lx-module-track" aria-label={'Chapter progressi '+percent+'%'}><i style={{width:percent+'%'}}/></div></div>
      <aside>{audience==='student'?<><strong>{percent}%</strong><span>{completedPages.size} / {studyPages.length} bo‘lim</span></>:<><strong>{studyPages.length}</strong><span>study bo‘lim</span></>}{practiceTopic?<button type="button" onClick={()=>{const page=practicePage(practiceTopic);if(page)navigate(lessonUrl(audience,syllabus,chapter.number,practiceTopic.code,0,'exam'))}}><FileText size={18}/>Bilimni tekshirish</button>:null}{audience==='teacher'&&firstTopic?<button type="button" onClick={()=>{const page=firstStudyPage(firstTopic);if(page)navigate(lessonUrl(audience,syllabus,chapter.number,firstTopic.code,0,'present'))}}><ChalkboardTeacher size={18}/>Present chapter</button>:null}</aside>
    </header>
    <section className="lx-module-topics"><header><div><h2>Mavzular</h2><p>Nazariya → bilimni tekshirish → natija</p></div><span>{topics.length} mavzu</span></header>
      <div>{topics.map((topic,index)=>{
        const pages=topic.pages.filter(page=>page.kind==='study');
        if(!pages.length)return null;
        const done=pages.filter(page=>completedPages.has(page.id)).length;
        const topicPercent=Math.round((done/pages.length)*100);
        const complete=done===pages.length;
        return <article key={topic.code}><div className={complete?'is-complete':''}>{complete?<CheckCircle size={19}/>:<span>{String(index+1).padStart(2,'0')}</span>}</div><div><span>{topicLabel(topic)}</span><h3>{topic.title}</h3><p>{done} / {pages.length} bo‘lim · {topicPercent}%</p><div className="lx-topic-track"><i style={{width:topicPercent+'%'}}/></div></div><button type="button" onClick={()=>openTopic(topic)}>{complete?'Ko‘rish':done?'Davom ettirish':'O‘rganish'}<ArrowRight size={17}/></button></article>;
      })}</div>
    </section>
  </section>;
}

function LearnerStageBar({phase,checkReady,resultReady,onStudy,onCheck,onResult}:{phase:'study'|'check'|'result';checkReady:boolean;resultReady:boolean;onStudy:()=>void;onCheck:()=>void;onResult:()=>void}) {
  const stages=[
    {key:'study' as const,label:'O‘rganish',ready:true,action:onStudy},
    {key:'check' as const,label:'Bilimni tekshirish',ready:checkReady,action:onCheck},
    {key:'result' as const,label:'Natija',ready:resultReady,action:onResult},
  ];
  const current=stages.findIndex(stage=>stage.key===phase);
  return <nav className="lx-learning-stages" aria-label="Dars bosqichlari">{stages.map((stage,index)=>{
    const active=stage.key===phase;
    const complete=index<current||(stage.key==='study'&&phase!=='study');
    return <button type="button" disabled={!stage.ready} aria-current={active?'step':undefined} className={active?'is-active':complete?'is-complete':''} onClick={stage.action} key={stage.key}><span>{complete?<CheckCircle size={17}/>:index+1}</span><strong>{stage.label}</strong></button>;
  })}</nav>;
}

function LearnerResult({result,onRetry,onStudy}:{result:LessonSelfAssessment;onRetry:()=>void;onStudy:()=>void}) {
  const needsReview=result.questions.filter(item=>item.earned<item.possible);
  return <main className="lx-learner-result"><section><span>SELF-ASSESSMENT RESULT</span><h1>{result.percentage}%</h1><p>{result.earned} / {result.possible} ball · {result.assessedQuestions} ta Past Paper savoli baholandi</p><div className="lx-result-track"><i style={{width:result.percentage+'%'}}/></div>
    {result.questions.length?<div className="lx-result-breakdown" aria-label="Savollar bo‘yicha natija">{result.questions.map(item=><article className={item.earned===item.possible?'is-strong':'needs-review'} key={item.id}><div><strong>{item.displayRef}</strong>{item.commandWord?<span>{item.commandWord}</span>:null}</div><b>{item.earned}/{item.possible}</b></article>)}</div>:null}
    {needsReview.length?<p className="lx-result-next"><strong>Qayta ko‘rish:</strong> {needsReview.map(item=>item.displayRef).join(', ')}. Nazariyaga qaytib shu savollarda yo‘qotilgan mark pointlarni mustahkamlang.</p>:<p className="lx-result-next is-strong"><strong>Yaxshi:</strong> baholangan savollarda barcha tanlangan mark pointlar to‘liq qoplandi.</p>}
    <aside>Bu natija official mark scheme bo‘yicha o‘zingiz belgilagan mark pointlardan hisoblandi. Bu teacher grade yoki yakuniy mastery bahosi emas.</aside><div><button type="button" onClick={onRetry}><FileText size={18}/>Past Paperga qaytish</button><button type="button" onClick={onStudy}><BookOpenText size={18}/>Nazariyani qayta ko‘rish</button></div></section></main>;
}

function ModeTabs({audience,mode,onChange}:{audience:LessonAudience;mode:LessonMode;onChange:(mode:LessonMode)=>void}){
  const modes:LessonMode[]=audience==='teacher'?['study','present','exam']:['study','exam'];
  return <div className="lx-mode-tabs" role="tablist" aria-label="Lesson mode">{modes.map(item=><button type="button" role="tab" aria-selected={mode===item} className={mode===item?'is-active':''} onClick={()=>onChange(item)} key={item}>{item==='study'?<BookOpenText size={19}/>:item==='present'?<ChalkboardTeacher size={19}/>:<FileText size={19}/>}<span>{modeLabel[item]}</span></button>)}</div>;
}

function TopicOutline({topics,activeTopic,activePage,mode,onOpen,onClose}:{topics:LessonTopic[];activeTopic:LessonTopic;activePage:TopicPage|null;mode:LessonMode;onOpen:(topic:LessonTopic,page:TopicPage)=>void;onClose:()=>void}){
  return <aside className="lx-outline" aria-label="Lesson contents"><header><div><span>CONTENTS</span><strong>Chapter topics</strong></div><button type="button" aria-label="Close contents" onClick={onClose}><X size={20}/></button></header><nav>{topics.map(topic=>{
    const pages=mode==='exam'?(practicePage(topic)?[practicePage(topic)!]:[]):topic.pages.filter(page=>page.kind==='study');
    return <section className={topic.code===activeTopic.code?'is-active':''} key={topic.code}><button type="button" className="lx-topic-button" onClick={()=>pages[0]&&onOpen(topic,pages[0])}><span>{topicLabel(topic)}</span><strong>{topic.title}</strong><small>{pages.length}</small></button>{topic.code===activeTopic.code&&mode==='study'?<div className="lx-page-links">{pages.map((page,index)=><button type="button" aria-current={page.id===activePage?.id?'page':undefined} className={page.id===activePage?.id?'is-current':''} onClick={()=>onOpen(topic,page)} key={page.id}><span>{String(index+1).padStart(2,'0')}</span><strong>{displayPageTitle(page,topic)}</strong></button>)}</div>:null}</section>;
  })}</nav></aside>;
}

function TopicSectionNav({pages,activeIndex,completed,onOpen,onOutline}:{pages:TopicPage[];activeIndex:number;completed:Set<string>;onOpen:(page:TopicPage)=>void;onOutline:()=>void}) {
  if(pages.length<=1)return null;
  const current=pages[Math.max(0,activeIndex)]??pages[0];
  return <nav className="lx-topic-section-nav" aria-label="Mavzu bo‘limlari">
    <div className="lx-topic-section-dots" role="tablist">{pages.map((page,index)=><button type="button" role="tab" aria-selected={index===activeIndex} aria-label={(index+1)+'-bo‘lim: '+page.title} className={index===activeIndex?'is-current':completed.has(page.id)?'is-complete':''} onClick={()=>onOpen(page)} key={page.id}>{completed.has(page.id)&&index!==activeIndex?<CheckCircle size={13}/>:<span>{index+1}</span>}</button>)}</div>
    <div><strong>{Math.max(1,activeIndex+1)} / {pages.length} bo‘lim</strong><span>{current?.title??''}</span></div>
    <button type="button" onClick={onOutline}><List size={16}/>Mundarija</button>
  </nav>;
}

function SourceAudit({page}:{page:TopicPage}){
  const pages=[...new Set(page.slides.flatMap(slide=>slide.sourcePages??[]))].sort((a,b)=>a-b);
  const elements=[...new Set(page.slides.flatMap(slide=>slide.sourceElements??[]))];
  const atoms=page.slides.flatMap(slide=>slide.sourceAtomEvidence??[]);
  const bulletEvidence=page.slides.flatMap(auditBullets);
  if(!pages.length&&!elements.length&&!atoms.length&&!bulletEvidence.length)return null;
  return <details className="lx-source-audit"><summary>Teacher source audit</summary><div>{pages.length?<p><strong>Source pages:</strong> {pages.join(', ')}</p>:null}{elements.length?<section><strong>Covered elements</strong><ul>{elements.map(item=><li key={item}>{item}</li>)}</ul></section>:null}{atoms.length?<section><strong>Verified source atoms</strong><ul>{atoms.map(atom=><li key={atom.id}><span>{atom.kind}</span>{atom.sourceRef}</li>)}</ul></section>:null}{bulletEvidence.length?<section><strong>Extraction evidence</strong><ul>{bulletEvidence.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul></section>:null}</div></details>;
}

export function LessonExperience({audience,userId}:LessonExperienceProps){
  const route=useRoute();
  const rootRef=useRef<HTMLElement|null>(null);
  const chapterNumber=Number(route.params.get('chapter')||0);
  const requestedCourse=route.params.get('course');
  const course:LessonCourseCode=requestedCourse==='0478'?'0478':'9618';
  const chapter=lessonCatalogChapter(course,chapterNumber);
  const topics=useMemo(()=>chapter?buildTopicPlan(chapter.slides,chapter.subtopics):[],[chapter]);
  const topicParam=route.params.get('topic')??'';
  const activeTopic=topics.find(topic=>topic.code===topicParam)??topics[0]??null;
  const requestedMode=route.params.get('mode');
  const mode:LessonMode=requestedMode==='exam'||(requestedMode==='present'&&audience==='teacher')?requestedMode:'study';
  const studyPages=useMemo(()=>activeTopic?.pages.filter(page=>page.kind==='study')??[],[activeTopic]);
  const requestedPage=Math.max(0,Number(route.params.get('page')??1)-1);
  const activePage=studyPages[Math.min(Number.isFinite(requestedPage)?requestedPage:0,Math.max(0,studyPages.length-1))]??null;
  const [outlineOpen,setOutlineOpen]=useState(false);
  const [progress,setProgress]=useState<LessonProgress[]>([]);
  const [saving,setSaving]=useState(false);
  const beats=useMemo(()=>chapter&&activeTopic?presentationBeatsForCatalogTopic(chapter,activeTopic):[],[chapter,activeTopic]);
  const realDeck=useMemo(()=>chapter&&activeTopic?realSlideDeckFor(courseCode(chapter),chapter.number,activeTopic.code):null,[chapter,activeTopic]);
  const requestedBeat=Math.max(0,Number(route.params.get('beat')??1)-1);
  const presentationLength=realDeck?1:beats.length;
  const beatIndex=Math.min(Number.isFinite(requestedBeat)?requestedBeat:0,Math.max(0,presentationLength-1));
  const activeBeat=realDeck?null:beats[beatIndex]??null;
  const [reveal,setReveal]=useState(0);
  const [assessment,setAssessment]=useState<LessonSelfAssessment>({assessedQuestions:0,earned:0,possible:0,percentage:0,questions:[]});
  const [showResult,setShowResult]=useState(false);

  useEffect(()=>{
    setAssessment({assessedQuestions:0,earned:0,possible:0,percentage:0,questions:[]});
    setShowResult(false);
  },[course,chapterNumber,topicParam]);

  const navigateTo=useCallback((targetTopic:LessonTopic,targetPage:TopicPage,targetMode:LessonMode=mode,targetBeat=0)=>{
    if(!chapter)return;
    const index=targetTopic.pages.filter(page=>page.kind==='study').findIndex(page=>page.id===targetPage.id);
    navigate(lessonUrl(audience,courseCode(chapter),chapter.number,targetTopic.code,Math.max(0,index),targetMode,targetBeat));
    setOutlineOpen(false);
  },[audience,chapter,mode]);

  useEffect(()=>setReveal(activeBeat?Math.min(1,revealCountForBeat(activeBeat)):0),[activeBeat?.id]);
  useEffect(()=>{
    if(audience!=='student')return;
    let cancelled=false;
    void api<{data:LessonProgress[]}>('/content/lessons/progress').then(result=>{if(!cancelled)setProgress(result.data)}).catch(()=>{});
    return()=>{cancelled=true};
  },[audience]);
  useEffect(()=>{
    if(!chapter||!activeTopic||!activePage||mode!=='study')return;
    const syllabus=courseCode(chapter);
    safeStorageSet(`campath:lesson:last:${audience}:${syllabus}:${chapter.number}`,lessonUrl(audience,syllabus,chapter.number,activeTopic.code,studyPages.indexOf(activePage),'study'));
    if(audience!=='student')return;
    let cancelled=false;
    const ids=pageSlideIds(activePage);
    void Promise.all(ids.map(slideId=>api<LessonProgress>('/content/lessons/progress',{method:'PUT',body:JSON.stringify({courseCode:syllabus,chapterNo:chapter.number,slideId,completed:false})}))).then(saved=>{if(!cancelled)setProgress(current=>mergeProgress(current,saved))}).catch(()=>{});
    return()=>{cancelled=true};
  },[audience,chapter,activeTopic?.code,activePage?.id,mode,studyPages]);

  const exitPresentation=useCallback(()=>{
    if(!chapter||!activeTopic)return;
    const page=firstStudyPage(activeTopic);
    if(page)navigateTo(activeTopic,page,'study');
    if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
  },[chapter,activeTopic,navigateTo]);

  const setMode=useCallback((nextMode:LessonMode)=>{
    if(!chapter||!activeTopic)return;
    setShowResult(false);
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
    if(!chapter||!activeTopic||!activePage||index<0||index>=presentationLength)return;
    navigateTo(activeTopic,activePage,'present',index);
  },[chapter,activeTopic,activePage,presentationLength,navigateTo]);

  useEffect(()=>{
    if(mode!=='present'||(!activeBeat&&!realDeck))return;
    const onKey=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      if(target?.closest('button,input,textarea,select,[contenteditable="true"]'))return;
      if(event.key==='Escape'){event.preventDefault();exitPresentation();return;}
      if(realDeck)return;
      if(event.key==='ArrowRight'||event.key==='PageDown'){event.preventDefault();openBeat(Math.min(presentationLength-1,beatIndex+1));return;}
      if(event.key==='ArrowLeft'||event.key==='PageUp'){event.preventDefault();openBeat(Math.max(0,beatIndex-1));return;}
      if(event.key==='Home'){event.preventDefault();openBeat(0);return;}
      if(event.key==='End'){event.preventDefault();openBeat(Math.max(0,presentationLength-1));return;}
      if(event.key===' '){
        event.preventDefault();
        if(activeBeat){const total=revealCountForBeat(activeBeat);if(reveal<total)setReveal(value=>value+1);else openBeat(Math.min(presentationLength-1,beatIndex+1));}
      }
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[mode,activeBeat,realDeck,beatIndex,presentationLength,reveal,exitPresentation,openBeat]);

  if(!chapter)return <LessonLibrary audience={audience} progress={progress}/>;
  if(!topicParam&&mode==='study')return <ChapterOverview audience={audience} chapter={chapter} progress={progress}/>;
  if(!activeTopic)return <section className="lx-empty"><strong>No lesson is available for this chapter.</strong><button type="button" onClick={()=>navigate(`${audience==='student'?'oquvchi':'oqitish'}/darslar`)}>Back to lessons</button></section>;

  if(mode==='present'){
    if(realDeck)return <section ref={rootRef} className="lesson-experience lx-present real-deck-host" data-course={courseCode(chapter)} data-chapter={chapter.number}>
      <RealSlideDeckPresentation
        deck={realDeck}
        onExit={exitPresentation}
        onFullscreen={()=>void rootRef.current?.requestFullscreen?.().catch(()=>{})}
      />
    </section>;
    if(!activeBeat)return <section ref={rootRef} className="lesson-experience lx-present" data-course={courseCode(chapter)} data-chapter={chapter.number}><div className="lx-empty"><strong>No presentation screens are available for this topic.</strong><button type="button" onClick={exitPresentation}>Return to Study mode</button></div></section>;
    const totalReveal=revealCountForBeat(activeBeat);
    return <section ref={rootRef} className="lesson-experience lx-present" data-course={courseCode(chapter)} data-chapter={chapter.number}>
      <header className="lx-present-bar"><button type="button" onClick={()=>setOutlineOpen(open=>!open)} aria-expanded={outlineOpen}><List size={22}/><span>Contents</span></button><div><span>{courseCode(chapter)} · Chapter {chapter.number} · {topicLabel(activeTopic)}</span><strong>{activeTopic.title}</strong></div><span>{beatIndex+1} / {beats.length}</span><button type="button" onClick={exitPresentation}><X size={22}/><span>Exit</span></button></header>
      {outlineOpen?<aside className="lx-present-outline"><header><div><span>{topicLabel(activeTopic)}</span><strong>{activeTopic.title}</strong></div><button type="button" aria-label="Close contents" onClick={()=>setOutlineOpen(false)}><X size={22}/></button></header><nav>{beats.map((beat,index)=><button type="button" className={index===beatIndex?'is-active':''} aria-current={index===beatIndex?'step':undefined} onClick={()=>{openBeat(index);setOutlineOpen(false)}} key={beat.id}><span>{String(index+1).padStart(2,'0')}</span><strong>{beat.title}</strong><small>{beat.kind}</small></button>)}</nav></aside>:null}
      <main className="lx-present-stage"><LessonPresentationScreen beat={activeBeat} reveal={totalReveal?reveal:totalReveal}/></main>
      <footer className="lx-present-nav"><button type="button" disabled={beatIndex===0} onClick={()=>openBeat(beatIndex-1)}><ArrowLeft size={24}/><span>Previous</span></button><p>{totalReveal>reveal?'Space · reveal the next point':'Space or → · next screen'}</p><button type="button" disabled={beatIndex===beats.length-1} onClick={()=>openBeat(beatIndex+1)}><span>Next</span><ArrowRight size={24}/></button></footer>
    </section>;
  }

  const flatStudy=topics.flatMap(topic=>topic.pages.filter(page=>page.kind==='study').map(page=>({topic,page})));
  const flatIndex=activePage?flatStudy.findIndex(item=>item.page.id===activePage.id):-1;
  const topicPageIndex=activePage?studyPages.findIndex(page=>page.id===activePage.id):-1;
  const previous=audience==='student'
    ?(topicPageIndex>0?{topic:activeTopic,page:studyPages[topicPageIndex-1]!}:null)
    :(flatIndex>0?flatStudy[flatIndex-1]:null);
  const next=audience==='student'
    ?(topicPageIndex>=0&&topicPageIndex<studyPages.length-1?{topic:activeTopic,page:studyPages[topicPageIndex+1]!}:null)
    :(flatIndex>=0&&flatIndex<flatStudy.length-1?flatStudy[flatIndex+1]:null);
  const currentIds=activePage?pageSlideIds(activePage):[];
  const completedSlides=new Set(progress.filter(item=>item.courseCode===courseCode(chapter)&&item.chapterNo===chapter.number&&item.completedAt).map(item=>item.slideId));
  const pageComplete=Boolean(currentIds.length&&currentIds.every(id=>completedSlides.has(id)));
  const completedPages=completedPageIds(progress,chapter);
  const completedInChapter=completedPages.size;
  const totalInChapter=flatStudy.length;
  const markComplete=async()=>{
    if(audience!=='student'||!activePage||saving||pageComplete)return;
    setSaving(true);
    try{
      const saved=await Promise.all(currentIds.map(slideId=>api<LessonProgress>('/content/lessons/progress',{method:'PUT',body:JSON.stringify({courseCode:courseCode(chapter),chapterNo:chapter.number,slideId,completed:true})})));
      setProgress(current=>mergeProgress(current,saved));
    }finally{setSaving(false);}
  };
  const openOutlinePage=(topic:LessonTopic,page:TopicPage)=>navigateTo(topic,page,mode);
  const examPage=practicePage(activeTopic);

  const learnerPhase:'study'|'check'|'result'=showResult?'result':mode==='exam'?'check':'study';
  const openResult=()=>{if(assessment.assessedQuestions>0)setShowResult(true)};

  return <section ref={rootRef} className={'lesson-experience lx-reader'+(mode==='exam'?' lx-reader--exam':'')}>
    <header className="lx-chapter-bar"><button type="button" className="lx-back" onClick={()=>navigate(chapterUrl(audience,courseCode(chapter),chapter.number))}><ArrowLeft size={20}/><span>Chapter</span></button><div className="lx-chapter-title"><span>{courseCode(chapter)} · {chapter.level} · Chapter {chapter.number}</span><strong>{chapter.title}</strong></div>{audience==='teacher'?<ModeTabs audience={audience} mode={mode} onChange={setMode}/>:null}<button type="button" className="lx-mobile-outline" aria-expanded={outlineOpen} onClick={()=>setOutlineOpen(open=>!open)}><List size={21}/><span>Contents</span></button></header>
    <div className="lx-reading-progress" aria-label={'Chapter progressi '+completedInChapter+'/'+totalInChapter}><span style={{width:(totalInChapter?(completedInChapter/totalInChapter)*100:0)+'%'}}/></div>
    {audience==='student'?<LearnerStageBar phase={learnerPhase} checkReady={Boolean(examPage)} resultReady={assessment.assessedQuestions>0} onStudy={()=>setMode('study')} onCheck={()=>setMode('exam')} onResult={openResult}/>:null}
    <div className={'lx-layout'+(outlineOpen?' is-outline-open':'')}>
      <TopicOutline topics={topics} activeTopic={activeTopic} activePage={mode==='study'?activePage:examPage} mode={mode} onOpen={openOutlinePage} onClose={()=>setOutlineOpen(false)}/>
      {outlineOpen?<button type="button" className="lx-outline-scrim" aria-label="Close contents" onClick={()=>setOutlineOpen(false)}/>:null}
      {mode==='study'?<main className="lx-reader-main">
        {audience==='student'?<TopicSectionNav pages={studyPages} activeIndex={topicPageIndex} completed={completedPages} onOpen={page=>navigateTo(activeTopic,page,'study')} onOutline={()=>setOutlineOpen(true)}/>:null}
        {activePage?<><header className="lx-page-head"><div><span>{topicLabel(activeTopic)} · {studyPages.indexOf(activePage)+1}/{studyPages.length}</span><h1>{displayPageTitle(activePage,activeTopic)}</h1><p>{activeTopic.title}</p></div>{audience==='student'?<button type="button" className={pageComplete?'is-complete':''} disabled={pageComplete||saving} onClick={markComplete}><CheckCircle size={21}/>{pageComplete?'Tugallangan':saving?'Saqlanmoqda…':'Darsni tugallash'}</button>:null}</header><div className="lx-study-content">{learnerSlidesForPage(activePage).map(slide=><LessonStudySlide sourceSlide={slide} pageTitle={displayPageTitle(activePage,activeTopic)} key={slide.id}/>)}</div>{audience==='teacher'?<SourceAudit page={activePage}/>:null}</>:<div className="lx-empty"><strong>No study section is available for this topic.</strong></div>}
        <footer className="lx-reader-nav"><button type="button" disabled={!previous} onClick={()=>previous&&navigateTo(previous.topic,previous.page,'study')}><ArrowLeft size={20}/><span>Oldingi bo‘lim</span></button><div><span>{Math.max(0,topicPageIndex+1)} / {studyPages.length}</span><small>{activeTopic.title}</small></div>{next?<button type="button" onClick={()=>navigateTo(next.topic,next.page,'study')}><span>Keyingi bo‘lim</span><ArrowRight size={20}/></button>:audience==='student'&&examPage?<button type="button" className="lx-check-cta" onClick={()=>setMode('exam')}><span>Bilimni tekshirish</span><ArrowRight size={20}/></button>:<button type="button" disabled><span>Mavzu tugadi</span><CheckCircle size={20}/></button>}</footer>
      </main>:showResult&&audience==='student'?<LearnerResult result={assessment} onRetry={()=>setShowResult(false)} onStudy={()=>setMode('study')}/>:<main className="lx-exam-shell"><header className="lx-exam-topic-head"><div><span>{courseCode(chapter)} · {topicLabel(activeTopic)} · CAMBRIDGE PAST PAPERS</span><h1>{activeTopic.title}</h1><p>Avval savolga mustaqil javob yozing. Keyin official mark scheme’ni ochib, faqat javobingizda mavjud mark pointlarni belgilang.</p></div>{audience==='teacher'?<button type="button" onClick={()=>void rootRef.current?.requestFullscreen?.().catch(()=>{})}><ArrowsOut size={20}/>Full screen</button>:null}</header><LessonPastPaper page={examPage} topic={activeTopic} audience={audience} userId={userId} onAssessmentChange={audience==='student'?setAssessment:undefined}/></main>}
    </div>
  </section>;
}
