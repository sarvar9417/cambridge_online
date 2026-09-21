import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { ArrowsOut } from '@phosphor-icons/react/ArrowsOut';
import { FileArrowDown } from '@phosphor-icons/react/FileArrowDown';
import { HardDrives } from '@phosphor-icons/react/HardDrives';
import { X } from '@phosphor-icons/react/X';
import type { RealSlideDeck } from './real-slide-decks';
import './real-slide-deck.css';

type Props={
  deck:RealSlideDeck;
  onExit:()=>void;
  onFullscreen:()=>void;
};

export function RealSlideDeckPresentation({deck,onExit,onFullscreen}:Props){
  const [index,setIndex]=useState(0);
  const slide=deck.slides[index]!;
  const total=deck.slides.length;
  const previous=()=>setIndex(value=>Math.max(0,value-1));
  const next=()=>setIndex(value=>Math.min(total-1,value+1));

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      if(target?.closest('a,button,input,textarea,select,[contenteditable="true"]'))return;
      if(event.key==='Escape'){event.preventDefault();onExit();return;}
      if(event.key==='ArrowRight'||event.key==='PageDown'||event.key===' '){event.preventDefault();next();return;}
      if(event.key==='ArrowLeft'||event.key==='PageUp'){event.preventDefault();previous();return;}
      if(event.key==='Home'){event.preventDefault();setIndex(0);return;}
      if(event.key==='End'){event.preventDefault();setIndex(total-1);}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[onExit,total]);

  useEffect(()=>{
    for(const target of [index-1,index+1]){
      const url=deck.slides[target]?.imageUrl;
      if(url){const image=new Image();image.src=url;}
    }
  },[deck.slides,index]);

  const sourceLabel=useMemo(()=>{
    const pages=slide.sourcePages;
    if(!pages?.length)return '';
    return pages.length===1?`Hodder p.${pages[0]}`:`Hodder pp.${pages[0]}–${pages.at(-1)}`;
  },[slide.sourcePages]);

  return <section className="real-deck" aria-label={deck.title}>
    <header className="real-deck-bar">
      <div><span>9618 · CHAPTER 3 · REAL DECK</span><strong>{deck.title}</strong></div>
      <span>{index+1} / {total}</span>
      <a href={deck.pptxDriveUrl} target="_blank" rel="noreferrer" title="Open the editable full-quality PPTX in Google Drive"><FileArrowDown size={21}/><span>Drive PPTX</span></a>
      <a href={deck.projectPptxUrl} download={deck.projectPptxFileName} title="Download the project mirror PPTX"><HardDrives size={21}/><span>Project PPTX</span></a>
      <button type="button" onClick={onFullscreen}><ArrowsOut size={21}/><span>Full screen</span></button>
      <button type="button" onClick={onExit}><X size={22}/><span>Exit</span></button>
    </header>
    <main className="real-deck-stage">
      <figure className="real-deck-slide">
        <img src={slide.imageUrl} alt={`Slide ${slide.number}: ${slide.title}`} draggable={false}/>
      </figure>
    </main>
    <footer className="real-deck-nav">
      <button type="button" disabled={index===0} onClick={previous}><ArrowLeft size={23}/><span>Previous</span></button>
      <p><strong>{slide.title}</strong><span>{sourceLabel||'Real Chapter 3 slide'} · ← / → or Space</span></p>
      <button type="button" disabled={index===total-1} onClick={next}><span>Next</span><ArrowRight size={23}/></button>
    </footer>
  </section>;
}
