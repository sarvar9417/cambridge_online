import { useEffect } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { ArrowsOut } from '@phosphor-icons/react/ArrowsOut';
import { FileArrowDown } from '@phosphor-icons/react/FileArrowDown';
import { List } from '@phosphor-icons/react/List';
import { X } from '@phosphor-icons/react/X';
import type { RealSlideDeck } from './real-slide-decks';
import './real-slide-deck.css';

type Props={
  deck:RealSlideDeck;
  index:number;
  outlineOpen:boolean;
  onOutlineChange:(open:boolean)=>void;
  onOpen:(index:number)=>void;
  onExit:()=>void;
  onFullscreen:()=>void;
};

export function RealSlideDeckPresentation({deck,index,outlineOpen,onOutlineChange,onOpen,onExit,onFullscreen}:Props){
  const slide=deck.slides[index]??deck.slides[0];
  useEffect(()=>{
    const next=deck.slides[index+1];
    if(!next)return;
    const image=new Image();
    image.src=next.image;
  },[deck,index]);
  if(!slide)return null;
  return <section className="real-deck" aria-label={deck.title}>
    <header className="real-deck-bar">
      <button type="button" onClick={()=>onOutlineChange(!outlineOpen)} aria-expanded={outlineOpen}><List size={22}/><span>Slides</span></button>
      <div><span>9618 · CHAPTER 3 · {deck.topicCode}</span><strong>{deck.title}</strong></div>
      <span>{index+1} / {deck.slides.length}</span>
      <a href={deck.pptxDriveUrl} target="_blank" rel="noreferrer" title="Open the editable PPTX in Google Drive"><FileArrowDown size={21}/><span>PPTX</span></a>
      <button type="button" onClick={onFullscreen}><ArrowsOut size={21}/><span>Full screen</span></button>
      <button type="button" onClick={onExit}><X size={22}/><span>Exit</span></button>
    </header>

    {outlineOpen?<aside className="real-deck-outline">
      <header><div><span>REAL SLIDE DECK</span><strong>{deck.subtitle}</strong></div><button type="button" aria-label="Close slide list" onClick={()=>onOutlineChange(false)}><X size={20}/></button></header>
      <nav>{deck.slides.map((item,itemIndex)=><button type="button" className={itemIndex===index?'is-active':''} aria-current={itemIndex===index?'step':undefined} onClick={()=>{onOpen(itemIndex);onOutlineChange(false)}} key={item.number}>
        <img src={item.image} alt="" loading="lazy"/>
        <span>{String(item.number).padStart(2,'0')}</span>
        <strong>{item.title}</strong>
      </button>)}</nav>
    </aside>:null}

    <main className="real-deck-stage">
      <div className="real-deck-canvas">
        <img src={slide.image} alt={slide.title} draggable={false}/>
      </div>
    </main>

    <footer className="real-deck-nav">
      <button type="button" disabled={index===0} onClick={()=>onOpen(index-1)}><ArrowLeft size={24}/><span>Previous</span></button>
      <p><strong>{slide.title}</strong><span>Space / → next · ← previous</span></p>
      <button type="button" disabled={index===deck.slides.length-1} onClick={()=>onOpen(index+1)}><span>Next</span><ArrowRight size={24}/></button>
    </footer>
  </section>;
}
