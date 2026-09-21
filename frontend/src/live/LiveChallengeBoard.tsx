import { useEffect, useMemo, useState } from 'react';
import { Broadcast, CheckCircle, UsersThree } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { LatexQuestionText } from '../lib/latex-question-text';
import { LiveExamLeaderboard } from './LiveExamLeaderboard';
import './live-exam.css';

type BoardAsset={
  kind:string|null;url:string|null;contentMd:string|null;altText:string|null;sortOrder:number|null;sourcePage:number|null;
};
type BoardStructuredBlock=Record<string,unknown>&{type:string};
type BoardQuestion={
  position:number|null;marks:number|null;sourceRef:string|null;
  leaf:{
    label:string|null;path:string|null;displayRef:string|null;stem:string|null;stemLatex:string|null;bodyFormat:string|null;
    contentJson:null;structuredBlocks:BoardStructuredBlock[]|null;commandWord:string|null;marks:number|null;answerKind:string|null;answerLines:number|null;
  };
  contextBlocks:Array<{label:string|null;displayRef:string|null;depth:number|null;context:string|null;contextLatex:string|null;assets:BoardAsset[]}>;
};
type BoardMarkScheme={
  schemeType:string|null;maxMarks:number|null;guidanceMd:string|null;
  points:Array<{code:string|null;text:string|null;marks:number|null;accept:unknown;reject:unknown;isBod:boolean|null}>;
  groups:Array<{label:string|null;nRequired:number|null;marksPerPoint:number|null;maxMarks:number|null;awardMode:string|null}>;
};
type BoardSnapshot={
  session:{
    title:string|null;className:string|null;status:string|null;currentQuestionIndex:number|null;questionCount:number|null;
    participantCount:number|null;submittedCount:number|null;reviewCount:number|null;reviewedCount:number|null;
    deadline:string|null;serverNow:string|null;joinCode:string|null;
  };
  question:BoardQuestion|null;
  markScheme:BoardMarkScheme|null;
};

function boardMessage(error:unknown){return error instanceof Error?error.message:'Proyektor holati yuklanmadi.';}
function formatClock(seconds:number|null){
  if(seconds===null)return '—';
  const safe=Math.max(0,seconds),minutes=Math.floor(safe/60),rest=safe%60;
  return `${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`;
}
function useBoardCountdown(deadline:string|null,serverNow:string|null,status:string|null){
  const [remaining,setRemaining]=useState<number|null>(null);
  useEffect(()=>{
    if(!deadline||status==='paused'){setRemaining(null);return;}
    const offset=serverNow?new Date(serverNow).getTime()-Date.now():0;
    const update=()=>setRemaining(Math.max(0,Math.ceil((new Date(deadline).getTime()-(Date.now()+offset))/1000)));
    update();const timer=window.setInterval(update,1000);return()=>window.clearInterval(timer);
  },[deadline,serverNow,status]);
  return remaining;
}
function notes(value:unknown):string[]{
  if(typeof value==='string')return value.trim()?[value.trim()]:[];
  if(Array.isArray(value))return value.flatMap(notes).slice(0,8);
  if(value&&typeof value==='object')return Object.values(value).flatMap(notes).slice(0,8);
  return [];
}

function BoardAssetView({asset}:{asset:BoardAsset}){
  return <figure className="live-asset">
    {asset.url?<img src={asset.url} alt={asset.altText||'Cambridge source diagram'}/>:asset.contentMd?<pre>{asset.contentMd}</pre>:<div>Diagramma yuklanmadi.</div>}
    {asset.altText?<figcaption>{asset.altText}</figcaption>:null}
  </figure>;
}

function BoardStructuredBlocks({blocks}:{blocks:BoardStructuredBlock[]}){
  return <div className="live-context">{blocks.map((block,index)=>{
    const key=`${String(block.type)}-${index}`;
    if(block.type==='text')return <p key={key}>{typeof block.text==='string'?block.text:''}</p>;
    if(block.type==='math')return <LatexQuestionText key={key} latex={typeof block.latex==='string'?block.latex:null} fallback={typeof block.latex==='string'?block.latex:''}/>;
    if(block.type==='code')return <pre key={key}>{typeof block.text==='string'?block.text:''}</pre>;
    if(block.type==='list')return <ul key={key}>{Array.isArray(block.items)?block.items.map((item,itemIndex)=><li key={itemIndex}>{String(item)}</li>):null}</ul>;
    if(block.type==='table'){
      const headers=Array.isArray(block.headers)?block.headers:[];
      const rows=Array.isArray(block.rows)?block.rows:[];
      return <table key={key}><thead>{headers.length?<tr>{headers.map((item,itemIndex)=><th key={itemIndex}>{String(item)}</th>)}</tr>:null}</thead><tbody>{rows.map((row,rowIndex)=><tr key={rowIndex}>{Array.isArray(row)?row.map((cell,cellIndex)=><td key={cellIndex}>{cell===null?'':String(cell)}</td>):null}</tr>)}</tbody></table>;
    }
    if(block.type==='matching'){
      const left=Array.isArray(block.left)?block.left:[],right=Array.isArray(block.right)?block.right:[];
      return <div className="live-topic-grid" key={key}><div>{left.map((item,index)=><p key={index}>{typeof item==='object'&&item&&'text'in item?String((item as {text:unknown}).text):''}</p>)}</div><div>{right.map((item,index)=><p key={index}>{typeof item==='object'&&item&&'text'in item?String((item as {text:unknown}).text):''}</p>)}</div></div>;
    }
    if(block.type==='asset'){
      const asset:BoardAsset={
        kind:typeof block.kind==='string'?block.kind:null,url:typeof block.url==='string'?block.url:null,
        contentMd:typeof block.contentMd==='string'?block.contentMd:null,altText:typeof block.altText==='string'?block.altText:null,
        sortOrder:null,sourcePage:typeof block.sourcePage==='number'?block.sourcePage:null,
      };
      return <BoardAssetView key={key} asset={asset}/>;
    }
    if(block.type==='answer_area'){
      const lines=typeof block.lines==='number'?Math.min(8,Math.max(1,block.lines)):3;
      return <div key={key} aria-label="Answer area">{Array.from({length:lines},(_,line)=><hr key={line}/>)}</div>;
    }
    return null;
  })}</div>;
}

function BoardQuestionView({question}:{question:BoardQuestion}){
  const structured=question.leaf.structuredBlocks;
  return <article className="live-question-card">
    <header><div><span>Savol {(question.position??0)+1}</span><strong>{question.sourceRef}</strong></div><b>{question.marks??question.leaf.marks??0} ball</b></header>
    {question.leaf.commandWord?<span className="live-command">{question.leaf.commandWord}</span>:null}
    {structured?.length?<BoardStructuredBlocks blocks={structured}/>:<>
      {question.contextBlocks.map((block,index)=><section className="live-context" key={`${block.displayRef??'context'}-${index}`}>
        {block.contextLatex||block.context?<LatexQuestionText latex={block.contextLatex} fallback={block.context??''}/>:null}
        {block.assets.map((asset,assetIndex)=><BoardAssetView key={assetIndex} asset={asset}/>)}
      </section>)}
      {question.leaf.stem?<LatexQuestionText latex={question.leaf.bodyFormat==='latex'?question.leaf.stemLatex:null} fallback={question.leaf.stem}/>:null}
    </>}
  </article>;
}

function BoardMarkSchemeView({scheme}:{scheme:BoardMarkScheme}){
  return <section className="live-scheme">
    <header><div><span>OFFICIAL MARK SCHEME</span><h2>Baholash mezoni</h2></div><strong>{scheme.maxMarks??0} ball</strong></header>
    {scheme.guidanceMd?<p className="live-scheme-guidance">{scheme.guidanceMd}</p>:null}
    {scheme.groups.length?<div className="live-scheme-groups">{scheme.groups.map((group,index)=><span key={index}>{group.label||'Mark group'} · {group.nRequired??0} ta talab · maksimum {group.maxMarks??0}</span>)}</div>:null}
    <div className="live-scheme-points">{scheme.points.map((point,index)=><label key={index}><b>{index+1}</b><span><strong>{point.code}</strong>{point.text}{notes(point.accept).map((note,n)=><small className="live-ms-note is-accept" key={`a-${n}`}>Accept: {note}</small>)}{notes(point.reject).map((note,n)=><small className="live-ms-note is-reject" key={`r-${n}`}>Reject: {note}</small>)}</span><i>{point.marks??0}</i></label>)}</div>
  </section>;
}

function BoardProgress({current,total}:{current:number|null;total:number|null}){
  const count=Math.max(0,total??0),active=Math.max(0,current??0);
  return <div className="live-progress" aria-label={`Savol ${active+1}, jami ${count}`}>{Array.from({length:count},(_,index)=><i key={index} className={index<active?'is-done':index===active?'is-current':''}/>)}</div>;
}

export function LiveChallengeBoard({sessionId}:{sessionId:string}){
  const [snapshot,setSnapshot]=useState<BoardSnapshot|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      try{
        const result=await api<{data:BoardSnapshot}>(`/live-exams/${sessionId}/board`);
        if(!cancelled){setSnapshot(result.data);setError('');}
      }catch(cause){if(!cancelled)setError(boardMessage(cause));}
    };
    void load();const timer=window.setInterval(()=>void load(),1500);
    const visible=()=>{if(document.visibilityState==='visible')void load()};
    document.addEventListener('visibilitychange',visible);
    return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
  },[sessionId]);

  const session=snapshot?.session;
  const remaining=useBoardCountdown(session?.deadline??null,session?.serverNow??null,session?.status??null);
  const status=session?.status??null;
  const progress=useMemo(()=>({current:session?.currentQuestionIndex??0,total:session?.questionCount??0}),[session?.currentQuestionIndex,session?.questionCount]);

  if(!snapshot)return <div className="live-projector-overlay"><main><section className="live-projector-result"><Broadcast size={64}/><h1>{error||'Cambridge Live Challenge yuklanmoqda…'}</h1></section></main></div>;

  return <div className="live-projector-overlay">
    <header><div className="live-projector-brand"><span/><strong>CamPath</strong><small>LIVE CHALLENGE</small></div><div>{session?.title}<small>{session?.className}</small></div><time className={remaining!==null&&remaining<30?'is-urgent':''}>{status==='paused'?'PAUZA':remaining===null?'—':formatClock(remaining)}</time></header>
    <main>
      {error?<p className="live-error" role="alert">{error}</p>:null}
      {status==='lobby'?<section className="live-projector-lobby"><span>JOIN CODE</span><strong>{session?.joinCode??'------'}</strong><p>{session?.participantCount??0} o‘quvchi qo‘shildi</p></section>:null}
      {status==='question_open'&&snapshot.question?<><BoardQuestionView question={snapshot.question}/><div className="live-projector-count"><UsersThree size={32}/><strong>{session?.submittedCount??0}/{session?.participantCount??0}</strong><span>javob topshirdi</span></div></>:null}
      {status==='answers_locked'?<section className="live-projector-result"><CheckCircle size={64}/><h1>Javoblar yopildi</h1><p>Official Mark Scheme ochilishi kutilmoqda.</p></section>:null}
      {status==='paused'?<section className="live-projector-result"><Broadcast size={64}/><h1>Sessiya pauzada</h1><p>O‘qituvchi davom ettirganda ayni bosqich tiklanadi.</p></section>:null}
      {status==='marking'&&snapshot.markScheme?<><BoardMarkSchemeView scheme={snapshot.markScheme}/><div className="live-projector-count"><CheckCircle size={32}/><strong>{session?.reviewedCount??0}/{session?.reviewCount??0}</strong><span>baholash tugadi</span></div></>:null}
      {status==='review'?<LiveExamLeaderboard sessionId={sessionId} version={0} variant="projector"/>:null}
      {status==='finished'?<section className="live-projector-result"><CheckCircle size={72} weight="fill"/><h1>Live Challenge yakunlandi</h1><p>{session?.questionCount??0} ta Cambridge savoli bajarildi.</p></section>:null}
      {status==='cancelled'?<section className="live-projector-result"><h1>Live Challenge bekor qilindi</h1></section>:null}
      {status==='draft'||status==='published'?<section className="live-projector-result"><Broadcast size={64}/><h1>Xona hali ochilmagan</h1></section>:null}
    </main>
    {!['draft','published','lobby'].includes(status??'')?<BoardProgress current={progress.current} total={progress.total}/>:null}
  </div>;
}
