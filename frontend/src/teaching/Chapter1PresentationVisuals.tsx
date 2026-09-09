import type { LessonPresentationBeat } from './lesson-experience-model';
import type { LessonRichBlock } from './lesson-content-hodder-types';
import './chapter1-presentation-visuals.css';

function NumberSystemVisual({slideId}:{slideId:string}){
  if(slideId==='h1-112-convert')return <div className="h1pv-convert"><section><small>BINARY</small><code>11101110₂</code></section><i>column weights</i><section><small>ADD 1-BIT WEIGHTS</small><code>128+64+32+8+4+2</code></section><i>=</i><section className="answer"><small>DENARY</small><strong>238₁₀</strong></section></div>;
  if(slideId==='h1-112-signed')return <div className="h1pv-signed"><section><small>POSITIVE</small><code>01011010</code></section><i>invert</i><section><code>10100101</code></section><i>+ 1</i><section className="answer"><small>TWO'S COMPLEMENT</small><code>10100110</code></section></div>;
  if(slideId==='h1-112-arithmetic')return <div className="h1pv-arithmetic"><section><small>37 + 58</small><code>00100101 + 00111010</code><strong>95 ✓</strong></section><section className="warn"><small>82 + 69</small><code>01010010 + 01000101</code><strong>OUT OF 8-BIT SIGNED RANGE</strong></section><section><small>95 − 68</small><code>95 + (two's complement of 68)</code><strong>27 ✓</strong></section></div>;
  if(slideId==='h1-memory-units')return <div className="h1pv-prefix"><section><span>SI</span><strong>kB</strong><code>10³ = 1,000 bytes</code></section><i>≠</i><section><span>IEC</span><strong>KiB</strong><code>2¹⁰ = 1,024 bytes</code></section></div>;
  return <div className="h1pv-bases"><section><span>DENARY</span><strong>10</strong><small>powers of 10</small></section><section><span>BINARY</span><strong>2</strong><small>0 · 1</small></section><section><span>HEXADECIMAL</span><strong>16</strong><small>0–9 · A–F</small></section></div>;
}

function HexVisual({slideId}:{slideId:string}){
  if(slideId==='h1-hex-uses')return <div className="h1pv-dump"><header><span>ADDRESS</span><span>HEX BYTES</span></header><code>00990F60</code><code>54 68 69 73 20 69 73 20 ...</code><code>00990F77</code><code>61 20 6D 65 6D 6F 72 79 ...</code><footer>compact human-readable view of binary memory contents</footer></div>;
  return <div className="h1pv-hex"><section><code>1011</code><strong>B</strong></section><section><code>1110</code><strong>E</strong></section><section><code>0001</code><strong>1</strong></section><i>→</i><b>BE1₁₆</b><footer>1 hexadecimal digit ↔ exactly 4 binary bits</footer></div>;
}

function BcdVisual({slideId}:{slideId:string}){
  if(slideId==='h1-bcd-uses')return <div className="h1pv-bcd-correction"><section><small>7 + 4</small><code>0111 + 0100 = 1011</code></section><i>invalid BCD digit</i><section><small>ADD 6</small><code>1011 + 0110 = 1 0001</code></section><i>carry</i><section className="answer"><strong>decimal correction</strong></section></div>;
  return <div className="h1pv-bcd">{[['3','0011'],['1','0001'],['6','0110'],['5','0101']].map(([d,b])=><section key={d}><strong>{d}</strong><code>{b}</code></section>)}<footer>3165₁₀ → 0011 0001 0110 0101 (BCD)</footer></div>;
}

function ContextVisual({slideId}:{slideId:string}){
  if(slideId==='h1-113-hex'||slideId==='h1-hex-uses')return <HexVisual slideId={slideId}/>;
  if(slideId==='h1-114-bcd'||slideId==='h1-bcd-uses')return <BcdVisual slideId={slideId}/>;
  if(['h1-111-number-systems','h1-112-convert','h1-112-signed','h1-112-arithmetic','h1-memory-units'].includes(slideId))return <NumberSystemVisual slideId={slideId}/>;
  return <div className="h1pv-route"><span>NUMBER SYSTEMS</span><i>→</i><span>MULTIMEDIA</span><i>→</i><span>COMPRESSION</span></div>;
}

function Block({block,reveal}:{block:LessonRichBlock;reveal:number}){
  if(block.kind==='paragraph')return <p className="h1pv-paragraph">{block.text}</p>;
  if(block.kind==='bullets')return <div className="h1pv-bullets">{block.items.slice(0,reveal).map((x,i)=><p key={`${x}-${i}`}><span>{String(i+1).padStart(2,'0')}</span>{x}</p>)}</div>;
  if(block.kind==='steps')return <div className="h1pv-steps"><header>{block.title}</header>{block.items.slice(0,reveal).map((x,i)=><section key={`${x}-${i}`}><span>{i+1}</span><p>{x}</p></section>)}</div>;
  if(block.kind==='table')return <div className="h1pv-table"><header>{block.table.caption}</header><table><thead><tr>{block.table.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{block.table.rows.slice(0,reveal).map((row,i)=><tr key={i}>{row.map((c,j)=><td key={`${i}-${j}`}>{c}</td>)}</tr>)}</tbody></table></div>;
  if(block.kind==='code')return <div className="h1pv-code"><header>{block.title}</header><pre>{block.lines.join('\n')}</pre></div>;
  if(block.kind==='callout')return <aside className={`h1pv-callout tone-${block.tone??'info'}`}><small>{block.tone==='activity'?'ACTIVITY':block.tone==='warning'?'WARNING':block.tone==='extension'?'EXTENSION':'KEY IDEA'}</small><strong>{block.title}</strong><p>{block.text}</p></aside>;
  if(block.kind==='comparison')return <div className="h1pv-comparison"><section><header>{block.leftTitle}</header>{block.rows.slice(0,reveal).map(([l],i)=><p key={`${l}-${i}`}>{l}</p>)}</section><section><header>{block.rightTitle}</header>{block.rows.slice(0,reveal).map(([,r],i)=><p key={`${r}-${i}`}>{r}</p>)}</section></div>;
  if(block.kind==='source-note')return <aside className="h1pv-callout"><strong>{block.title}</strong><p>{block.sourceText}</p><p>{block.examSafeText}</p></aside>;
  return null;
}

export const CHAPTER_1_SOURCE_VISUAL_SLIDES=[
  'h1-overview','h1-prior','h1-111-number-systems','h1-112-convert','h1-112-signed','h1-112-arithmetic','h1-memory-units','h1-113-hex','h1-hex-uses','h1-114-bcd','h1-bcd-uses',
] as const;
const ids=new Set<string>(CHAPTER_1_SOURCE_VISUAL_SLIDES);
export function hasChapter1PresentationVisual(beat:LessonPresentationBeat){return ids.has(beat.slideId);}

export function Chapter1PresentationVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  return <div className="h1pv-shell"><ContextVisual slideId={beat.slideId}/>{beat.formula?<div className="h1pv-formula">{beat.formula}</div>:null}{beat.bullets?<div className="h1pv-bullets">{beat.bullets.slice(0,reveal).map((x,i)=><p key={`${x}-${i}`}><span>{String(i+1).padStart(2,'0')}</span>{x}</p>)}</div>:null}{beat.keyTerms?<div className="h1pv-terms">{beat.keyTerms.slice(0,reveal).map(x=><section key={x.term}><strong>{x.term}</strong><p>{x.definition}</p></section>)}</div>:null}{beat.richBlock?<Block block={beat.richBlock} reveal={reveal}/>:null}{beat.example?<div className="h1pv-example"><header>{beat.example.title}</header>{beat.example.lines.slice(0,reveal).map((x,i)=><p key={`${x}-${i}`}><span>{i+1}</span>{x}</p>)}{beat.example.answer&&reveal>beat.example.lines.length?<footer>{beat.example.answer}</footer>:null}</div>:null}</div>;
}
