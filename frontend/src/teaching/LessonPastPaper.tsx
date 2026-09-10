import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { CheckCircle } from '@phosphor-icons/react/CheckCircle';
import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { Printer } from '@phosphor-icons/react/Printer';
import { api } from '../lib/api';
import type { LessonAudience } from './lesson-experience-model';
import type { LessonTopic } from './lesson-topic-plan';
import { chapterPastPaperScope } from './lesson-chapter-past-paper-scope';

type ExamAsset = {id:string;kind:string;url:string|null;contentMd:string|null;altText:string;sourcePage:number|null};
type ExamContextBlock = {id:string;displayRef:string;contextMd:string|null;assets:ExamAsset[]};
type ExamDependency = {id:string;displayRef:string;stem:string;contextMd:string|null;assets:ExamAsset[]};
type MarkPoint = {code:string;text:string;marks:number};
type ExamQuestion = {
  id:string;
  displayRef:string;
  stem:string;
  contextMd:string|null;
  commandWord:string|null;
  marks:number;
  year:number;
  series:string;
  variant:number;
  component:number;
  hasDiagram:boolean;
  hasDependency:boolean;
  contextBlocks:ExamContextBlock[];
  dependencies:ExamDependency[];
  markSchemePoints:MarkPoint[];
};
type CheckpointResponse = {data:ExamQuestion[];yearFrom:number;yearTo:number;syllabusCode:string};

function assetComplete(asset:ExamAsset){return Boolean(asset.url||asset.contentMd);}
function isVisualAsset(asset:ExamAsset){return ['diagram','image'].includes(asset.kind.toLowerCase());}
function questionComplete(question:ExamQuestion){
  const assets=[...question.contextBlocks.flatMap(block=>block.assets),...question.dependencies.flatMap(item=>item.assets)];
  if(question.hasDiagram&&!assets.some(asset=>isVisualAsset(asset)&&assetComplete(asset)))return false;
  if(question.hasDependency&&!question.dependencies.length)return false;
  return assets.every(assetComplete);
}

function ExamAssetView({asset}:{asset:ExamAsset}) {
  if(asset.url)return <figure className="lx-exam-asset"><img src={asset.url} alt={asset.altText||'Question diagram'}/>{asset.sourcePage?<figcaption>Source page {asset.sourcePage}</figcaption>:null}</figure>;
  if(!asset.contentMd)return null;
  if(/^\s*<svg[\s>]/i.test(asset.contentMd)){
    const src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.contentMd)}`;
    return <figure className="lx-exam-asset"><img src={src} alt={asset.altText||'Question diagram'}/>{asset.sourcePage?<figcaption>Source page {asset.sourcePage}</figcaption>:null}</figure>;
  }
  return <figure className="lx-exam-asset lx-exam-asset--text"><figcaption>{asset.altText||asset.kind}</figcaption><pre>{asset.contentMd}</pre></figure>;
}

function QuestionContext({question}:{question:ExamQuestion}) {
  return <>
    {question.dependencies.map(dependency=><section className="lx-required-context" key={dependency.id}><span>REQUIRED PREVIOUS PART · {dependency.displayRef}</span>{dependency.contextMd?<p>{dependency.contextMd}</p>:null}{dependency.assets.map(asset=><ExamAssetView asset={asset} key={asset.id}/>)}{dependency.stem?<p>{dependency.stem}</p>:null}</section>)}
    {question.contextBlocks.map(block=><section className="lx-question-context" key={block.id}>{block.contextMd?<p>{block.contextMd}</p>:null}{block.assets.map(asset=><ExamAssetView asset={asset} key={asset.id}/>)}</section>)}
    {!question.contextBlocks.length&&question.contextMd?<section className="lx-question-context"><p>{question.contextMd}</p></section>:null}
  </>;
}

function answerStorageKey(questionId:string){return `campath:past-paper-answer:${questionId}`;}

function ExamQuestionView({question,audience}:{question:ExamQuestion;audience:LessonAudience}) {
  const [answer,setAnswer]=useState(()=>{
    try{return window.localStorage.getItem(answerStorageKey(question.id))??'';}catch{return '';}
  });
  const [schemeOpen,setSchemeOpen]=useState(false);
  useEffect(()=>{
    try{window.localStorage.setItem(answerStorageKey(question.id),answer);}catch{/* Local persistence is optional. */}
  },[answer,question.id]);
  useEffect(()=>setSchemeOpen(false),[question.id]);
  return <article className="lx-question-paper">
    <header className="lx-question-meta"><div><span>{question.displayRef}</span><small>{question.year} · {question.series} · Paper {question.component} · Variant {question.variant}</small></div><strong>{question.marks} mark</strong></header>
    <div className="lx-question-body"><QuestionContext question={question}/><p className="lx-question-stem">{question.stem}</p>{question.commandWord?<span className="lx-command-word">Command word · {question.commandWord}</span>:null}</div>
    <label className="lx-answer"><span>{audience==='teacher'?'Class answer or teacher notes':'Your answer'}</span><textarea value={answer} rows={Math.max(5,Math.min(12,question.marks*2))} onChange={event=>setAnswer(event.target.value)} placeholder="Write your answer here…"/></label>
    <div className="lx-scheme-actions"><button type="button" aria-expanded={schemeOpen} onClick={()=>setSchemeOpen(open=>!open)}><CheckCircle size={20} aria-hidden="true"/>{schemeOpen?'Hide mark scheme':'Reveal mark scheme'}</button></div>
    {schemeOpen?<section className="lx-mark-scheme"><header><span>MARK SCHEME</span><strong>{question.marks} marks available</strong></header>{question.markSchemePoints?.length?<ol>{question.markSchemePoints.map((point,index)=><li key={`${point.code}-${index}`}><span>{point.code||`MP${index+1}`}</span><p>{point.text}</p><strong>+{point.marks}</strong></li>)}</ol>:<p className="lx-no-scheme">Approved mark points for this question are not yet available in the checkpoint database.</p>}</section>:null}
  </article>;
}

export function LessonPastPaper({topics,chapterTitle,audience}:{topics:LessonTopic[];chapterTitle:string;audience:LessonAudience}) {
  const scope=useMemo(()=>chapterPastPaperScope(topics),[topics]);
  const codes=scope.learningObjectiveCodes;
  const codeKey=codes.join('|');
  const syllabuses=scope.syllabusCodes;
  const syllabusCode=syllabuses[0]??'9618';
  const yearFrom=scope.yearFrom;
  const yearTo=scope.yearTo;
  const [questions,setQuestions]=useState<ExamQuestion[]>([]);
  const [loading,setLoading]=useState(Boolean(codes.length));
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const [selectedId,setSelectedId]=useState('');
  const [query,setQuery]=useState('');
  const [year,setYear]=useState('all');

  useEffect(()=>{
    let cancelled=false;
    if(!codes.length||syllabuses.length>1){setQuestions([]);setLoading(false);setError(syllabuses.length>1?'The checkpoint course codes in this chapter do not match.':'');return()=>{cancelled=true};}
    setLoading(true);setError('');
    const params=new URLSearchParams({yearFrom:String(yearFrom),yearTo:String(yearTo),syllabusCode});
    codes.forEach(code=>params.append('loCodes',code));
    void api<CheckpointResponse>(`/lesson-checkpoints?${params}`)
      .then(result=>{if(cancelled)return;const unique=[...new Map(result.data.map(item=>[item.id,item] as const)).values()].filter(questionComplete);setQuestions(unique);setSelectedId(current=>unique.some(item=>item.id===current)?current:(unique[0]?.id??''));})
      .catch(()=>{if(!cancelled)setError('Questions could not be loaded. Check the connection and login state, then try again.');})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true};
  },[codeKey,syllabusCode,yearFrom,yearTo,retry,syllabuses.length]);

  const years=useMemo(()=>[...new Set(questions.map(question=>question.year))].sort((a,b)=>b-a),[questions]);
  const filtered=useMemo(()=>questions.filter(question=>{
    if(year!=='all'&&question.year!==Number(year))return false;
    const term=query.trim().toLowerCase();
    return !term||`${question.displayRef} ${question.stem} ${question.commandWord??''}`.toLowerCase().includes(term);
  }),[questions,query,year]);
  const selected=filtered.find(question=>question.id===selectedId)??filtered[0]??null;
  const selectedIndex=selected?filtered.findIndex(question=>question.id===selected.id):-1;

  if(!codes.length)return <div className="lx-exam-state"><strong>Past Paper practice is not yet available for this chapter.</strong><p>The chapter does not yet have a live Cambridge learning-objective checkpoint map.</p></div>;
  if(loading)return <div className="lx-exam-state" aria-live="polite"><strong>Loading Past Paper questions…</strong><p>Preparing approved Cambridge questions for {chapterTitle}.</p></div>;
  if(error)return <div className="lx-exam-state lx-exam-state--error" role="alert"><strong>Questions could not be loaded</strong><p>{error}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>Try again</button></div>;
  if(!questions.length)return <div className="lx-exam-state"><strong>No exact question match was found.</strong><p>A weakly related question has not been inserted. The approved corpus for this chapter needs to be expanded.</p></div>;

  return <div className="lx-exam-workspace">
    <aside className="lx-exam-list"><header><span>CHAPTER PAST PAPERS</span><strong>{questions.length} questions</strong></header><div className="lx-exam-filters"><label><MagnifyingGlass size={18} aria-hidden="true"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search questions" aria-label="Search questions"/></label><select value={year} onChange={event=>setYear(event.target.value)} aria-label="Year"><option value="all">All years</option>{years.map(item=><option value={item} key={item}>{item}</option>)}</select></div><div className="lx-exam-items">{filtered.map((question,index)=><button type="button" className={question.id===selected?.id?'is-active':''} aria-current={question.id===selected?.id?'true':undefined} onClick={()=>setSelectedId(question.id)} key={question.id}><span>{String(index+1).padStart(2,'0')}</span><strong>{question.displayRef}</strong><small>{question.commandWord??'Question'} · {question.marks} mark</small></button>)}</div></aside>
    <main className="lx-exam-main">{selected?<><div className="lx-exam-main-actions"><span>{selectedIndex+1}/{filtered.length}</span><button type="button" aria-label="Previous question" disabled={selectedIndex<=0} onClick={()=>setSelectedId(filtered[selectedIndex-1]!.id)}><ArrowLeft size={20}/></button><button type="button" aria-label="Next question" disabled={selectedIndex<0||selectedIndex>=filtered.length-1} onClick={()=>setSelectedId(filtered[selectedIndex+1]!.id)}><ArrowRight size={20}/></button><button type="button" onClick={()=>window.print()}><Printer size={20}/> Print</button></div><ExamQuestionView question={selected} audience={audience}/></>:<div className="lx-exam-state"><strong>No question matches the current filters.</strong><p>Change the search term or year filter.</p></div>}</main>
  </div>;
}
