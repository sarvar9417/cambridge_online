import type { LessonPresentationBeat } from './lesson-experience-model';
import './source-first-presentation.css';

const visible=(reveal:number,index:number)=>reveal>=index;

function Cards({items,reveal}:{items:string[];reveal:number}){
  return <div className="sfp-cards">{items.map((item,index)=><section className={visible(reveal,index+1)?'is-visible':''} key={`${item}-${index}`}><b>{String(index+1).padStart(2,'0')}</b><p>{item}</p></section>)}</div>;
}

function Terms({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  return <div className="sfp-terms">{(beat.keyTerms??[]).map((item,index)=><section className={visible(reveal,index+1)?'is-visible':''} key={item.term}><span>KEY TERM</span><strong>{item.term}</strong><p>{item.definition}</p></section>)}</div>;
}

function CodeFlow({lines,reveal}:{lines:string[];reveal:number}){
  return <div className="sfp-code-flow">{lines.map((line,index)=><div className={visible(reveal,index+1)?'is-visible':''} key={`${line}-${index}`}><span>{index+1}</span><code>{line}</code></div>)}</div>;
}

export function SourceFirstPresentationVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  if(beat.keyTerms?.length)return <Terms beat={beat} reveal={reveal}/>;
  if(beat.bullets?.length)return <Cards items={beat.bullets} reveal={reveal}/>;
  const block=beat.richBlock;
  if(block?.kind==='bullets')return <Cards items={block.items} reveal={reveal}/>;
  if(block?.kind==='steps')return <div className="sfp-process">{block.items.map((item,index)=><section className={visible(reveal,index+1)?'is-visible':''} key={`${item}-${index}`}><b>{index+1}</b><p>{item}</p>{index<block.items.length-1?<i>→</i>:null}</section>)}</div>;
  if(block?.kind==='code')return <CodeFlow lines={block.lines} reveal={reveal}/>;
  if(block?.kind==='comparison')return <div className="sfp-compare"><header><strong>{block.leftTitle}</strong><strong>{block.rightTitle}</strong></header>{block.rows.map(([left,right],index)=><div className={visible(reveal,index+1)?'is-visible':''} key={`${left}-${right}`}><span>{left}</span><span>{right}</span></div>)}</div>;
  if(block?.kind==='table')return <div className="sfp-table"><strong>{block.table.caption}</strong><div className="sfp-table-head">{block.table.headers.map(item=><b key={item}>{item}</b>)}</div>{block.table.rows.map((row,index)=><div className={visible(reveal,index+1)?'is-visible':''} key={index}>{row.map((cell,i)=><span key={`${cell}-${i}`}>{cell}</span>)}</div>)}</div>;
  if(block?.kind==='callout')return <div className="sfp-callout"><span>{block.tone==='activity'?'ACTIVITY':block.tone==='extension'?'EXTENSION':'KEY IDEA'}</span><strong>{block.title}</strong><p>{block.text}</p></div>;
  if(block?.kind==='paragraph')return <div className="sfp-focus"><span>CONCEPT</span><p>{block.text}</p></div>;
  if(beat.example)return <div className="sfp-example"><strong>{beat.example.title}</strong>{beat.example.lines.map((line,index)=><div className={visible(reveal,index+1)?'is-visible':''} key={`${line}-${index}`}><b>{index+1}</b><p>{line}</p></div>)}</div>;
  return null;
}
