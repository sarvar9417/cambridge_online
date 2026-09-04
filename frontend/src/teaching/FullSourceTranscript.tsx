import { useEffect, useMemo, useState } from 'react';
import {
  loadSourceTranscript,
  sourcePageToPrintedPage,
  type SourceTranscriptChapter,
} from './source-transcript-bundles';
import type { SourcePageTranscriptCollection } from './source-page-transcript-types';
import './source-transcript.css';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export function FullSourceTranscript({
  chapter,
  sourcePages,
}: {
  chapter: SourceTranscriptChapter;
  sourcePages: number[];
}) {
  const [state,setState]=useState<LoadState>('idle');
  const [collection,setCollection]=useState<SourcePageTranscriptCollection|null>(null);
  const [error,setError]=useState('');
  const printedPages=useMemo(
    ()=>[...new Set(sourcePages.map(page=>sourcePageToPrintedPage(chapter,page)))].sort((a,b)=>a-b),
    [chapter,sourcePages.join('|')],
  );

  useEffect(()=>{
    setState('idle');
    setCollection(null);
    setError('');
  },[chapter,printedPages.join('|')]);

  if(!printedPages.length)return null;

  const load=async()=>{
    if(state==='loading'||state==='ready')return;
    setState('loading');
    setError('');
    try{
      setCollection(await loadSourceTranscript(chapter));
      setState('ready');
    }catch(cause){
      setState('error');
      setError(cause instanceof Error?cause.message:'Full source transcript could not be loaded');
    }
  };

  const pages=collection?.pages.filter(page=>printedPages.includes(page.printedPage))??[];
  return <details className="lesson-full-source" onToggle={event=>{if(event.currentTarget.open)void load()}}>
    <summary><span>FULL SOURCE PAGE</span><strong>Exact uploaded-PDF transcript · {printedPages.map(page=>`p.${page}`).join(' · ')}</strong></summary>
    <div className="lesson-full-source-body">
      {state==='idle'&&<p>Open this source page to load the exact text layer from the supplied PDF.</p>}
      {state==='loading'&&<p>Loading exact source page…</p>}
      {state==='error'&&<p className="lesson-full-source-error">{error}</p>}
      {state==='ready'&&pages.length===0&&<p className="lesson-full-source-error">The mapped page was not found in the locked source bundle.</p>}
      {pages.map(page=><article key={page.printedPage}>
        <header><strong>Textbook page {page.printedPage}</strong><span>PDF page {page.pdfPage} · sha256 {page.sha256.slice(0,12)}…</span></header>
        <pre>{page.text}</pre>
      </article>)}
    </div>
  </details>;
}
