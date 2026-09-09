import type { LessonPresentationBeat } from './lesson-experience-model';
import type { LessonRichBlock } from './lesson-content-hodder-types';
import './chapter13-presentation-visuals.css';

const visible=(reveal:number,index:number)=>reveal>=index;

function DataTypeMap({slideId}:{slideId:string}){
  if(slideId==='h13-enum')return <div className="h13pv-enum" aria-label="Enumerated type model"><span>TYPE Tmonth</span><div>{['January','February','March','…','December'].map(x=><b key={x}>{x}</b>)}</div><footer>finite list · implied order · identifiers are not strings</footer></div>;
  if(slideId==='h13-pointer')return <div className="h13pv-pointer" aria-label="Pointer and dereferencing model"><section><small>VARIABLE</small><strong>thisMonth</strong><code>March</code></section><i>address of ↑</i><section className="pointer"><small>POINTER</small><strong>monthPointer</strong><code>0x…42A0</code></section><i>dereference →</i><section><small>VALUE READ</small><strong>monthPointer^</strong><code>March</code></section></div>;
  if(slideId==='h13-record')return <div className="h13pv-record"><header>TbookRecord</header>{[['title','STRING'],['author','STRING'],['publisher','STRING'],['noPages','INTEGER'],['fiction','BOOLEAN']].map(([a,b])=><div key={a}><strong>{a}</strong><code>{b}</code></div>)}</div>;
  if(slideId==='h13-sets-classes')return <div className="h13pv-typesplit"><section><small>SET</small><strong>{'{ a, e, i, o, u }'}</strong><p>unordered elements · union · intersection</p></section><section><small>CLASS</small><strong>attributes + methods</strong><p>objects are instances of the class</p></section></div>;
  return <div className="h13pv-typesplit"><section><small>NON-COMPOSITE</small><strong>enumerated · pointer</strong></section><section><small>COMPOSITE</small><strong>record · set · class/object</strong></section></div>;
}

function FileMap({slideId}:{slideId:string}){
  const serial=['8','2','4','7','3','1'];
  const sequential=['1','2','3','4','5','7','8'];
  if(slideId==='h13-serial'||slideId==='h13-sequential'||slideId==='h13-random'||slideId==='h13-file-terms')return <div className="h13pv-filemap"><section><small>SERIAL</small><div>{serial.map((x,i)=><b key={`${x}-${i}`}>{x}</b>)}</div><p>arrival order</p></section><section><small>SEQUENTIAL</small><div>{sequential.map(x=><b key={x}>{x}</b>)}</div><p>physical key order</p></section><section><small>RANDOM</small><div>{serial.map((x,i)=><b key={`${x}-r-${i}`}>{x}</b>)}</div><p>hash selects home address</p></section></div>;
  if(slideId==='h13-seq-access')return <div className="h13pv-access"><b>START</b><i>→</i><span>record 1</span><i>→</i><span>record 2</span><i>→</i><span>…</span><i>→</i><strong>TARGET / STOP</strong></div>;
  if(slideId==='h13-direct-access'||slideId==='h13-org-access-choice')return <div className="h13pv-direct"><section><strong>KEY</strong><code>3024</code></section><i>→ index / hash →</i><section><strong>ADDRESS</strong><code>1024</code></section><i>→</i><section><strong>RECORD</strong><code>key check</code></section></div>;
  return <div className="h13pv-filemap"><section><small>ORGANISATION</small><strong>where records are stored</strong></section><section><small>ACCESS</small><strong>how records are found</strong></section></div>;
}

function HashMap({slideId}:{slideId:string}){
  if(slideId==='h13-hash-collision')return <div className="h13pv-collision"><section><code>3024 mod 2000</code><strong>1024</strong></section><section><code>5024 mod 2000</code><strong>1024</strong></section><i>COLLISION</i><footer><span>open hashing → next free file location</span><span>closed hashing → overflow area</span></footer></div>;
  return <div className="h13pv-hash"><section><small>RECORD KEY</small><strong>3024</strong></section><i>mod 2000</i><section><small>REMAINDER</small><strong>1024</strong></section><i>+</i><section><small>FILE START</small><strong>0</strong></section><i>=</i><section className="answer"><small>HOME ADDRESS</small><strong>1024</strong></section></div>;
}

function FloatMap({slideId}:{slideId:string}){
  if(slideId==='h13-float-format'||slideId==='h13-prior-133')return <div className="h13pv-floatformat"><div className="mantissa"><span>S</span>{Array.from({length:7},(_,i)=><b key={i}>m{i+1}</b>)}<small>MANTISSA · two’s complement fraction</small></div><div className="times">× 2</div><div className="exponent"><span>S</span>{Array.from({length:7},(_,i)=><b key={i}>e{i+1}</b>)}<small>EXPONENT · two’s complement integer</small></div></div>;
  if(slideId==='h13-normalisation')return <div className="h13pv-normalise"><section><small>BEFORE</small><code>0.0011100 × 2⁵</code></section><i>shift mantissa left 2</i><section className="after"><small>NORMALISED</small><code>0.1110000 × 2³</code></section><footer>positive begins 0.1 · negative begins 1.0</footer></div>;
  if(slideId==='h13-precision-range')return <div className="h13pv-tradeoff"><section><strong>12 + 4</strong><span className="precision">PRECISION</span><small>high precision · smaller range</small></section><section><strong>8 + 8</strong><span>BALANCED</span><small>balanced precision / range</small></section><section><strong>4 + 12</strong><span className="range">RANGE</span><small>lower precision · very large range</small></section></div>;
  if(slideId==='h13-over-under-zero'||slideId==='h13-approximation'||slideId==='h13-rounding-program')return <div className="h13pv-limits"><span>UNDERFLOW</span><i>minimum non-zero</i><b>representable range</b><i>maximum</i><span>OVERFLOW</span><footer>finite mantissa ⇒ approximation / rounding can occur</footer></div>;
  return <div className="h13pv-convert"><section><small>MANTISSA</small><code>M</code></section><i>×</i><section><small>POWER OF TWO</small><code>2ᴱ</code></section><i>=</i><section><small>VALUE</small><code>denary ↔ binary float</code></section></div>;
}

function ContextVisual({slideId}:{slideId:string}){
  if(/enum|pointer|record|sets|udt|type-choice|activity-13c/.test(slideId))return <DataTypeMap slideId={slideId}/>;
  if(/hash/.test(slideId))return <HashMap slideId={slideId}/>;
  if(/file|serial|sequential|random|access|org-access/.test(slideId))return <FileMap slideId={slideId}/>;
  if(/float|denary|normal|precision|rounding|approx|over-under|prior-133|review/.test(slideId))return <FloatMap slideId={slideId}/>;
  return <div className="h13pv-chaptermap"><span>USER-DEFINED TYPES</span><i>→</i><span>FILE ORGANISATION + ACCESS</span><i>→</i><span>FLOATING-POINT</span></div>;
}

function Block({block,reveal}:{block:LessonRichBlock;reveal:number}){
  if(block.kind==='paragraph')return <p className="h13pv-paragraph">{block.text}</p>;
  if(block.kind==='bullets')return <div className="h13pv-bullets">{block.items.slice(0,reveal).map((x,i)=><p key={`${x}-${i}`}><span>{String(i+1).padStart(2,'0')}</span>{x}</p>)}</div>;
  if(block.kind==='steps')return <div className="h13pv-steps"><header>{block.title}</header>{block.items.slice(0,reveal).map((x,i)=><section key={`${x}-${i}`}><span>{i+1}</span><p>{x}</p>{i<Math.min(reveal,block.items.length)-1?<i>→</i>:null}</section>)}</div>;
  if(block.kind==='code')return <div className="h13pv-code"><header>{block.title}</header><pre>{block.lines.join('\n')}</pre></div>;
  if(block.kind==='callout')return <div className={`h13pv-callout tone-${block.tone??'info'}`}><small>{block.tone==='activity'?'ACTIVITY':block.tone==='extension'?'EXTENSION':block.tone==='warning'?'WARNING':'KEY IDEA'}</small><strong>{block.title}</strong><p>{block.text}</p></div>;
  if(block.kind==='comparison')return <div className="h13pv-comparison"><section><header>{block.leftTitle}</header>{block.rows.slice(0,reveal).map(([l],i)=><p key={`${l}-${i}`}>{l}</p>)}</section><section><header>{block.rightTitle}</header>{block.rows.slice(0,reveal).map(([,r],i)=><p key={`${r}-${i}`}>{r}</p>)}</section></div>;
  if(block.kind==='table')return <div className="h13pv-table"><header>{block.table.caption}</header><table><thead><tr>{block.table.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{block.table.rows.slice(0,reveal).map((row,i)=><tr key={i}>{row.map((c,j)=><td key={`${i}-${j}`}>{c}</td>)}</tr>)}</tbody></table></div>;
  if(block.kind==='source-note')return <div className="h13pv-callout"><small>SOURCE ACCURACY</small><strong>{block.title}</strong><p>{block.sourceText}</p><p>{block.examSafeText}</p></div>;
  return <div className="h13pv-callout"><strong>Coursebook figure</strong><p>Use the source-labelled figure with the teacher explanation for this scene.</p></div>;
}

export const CHAPTER_13_SOURCE_VISUAL_SLIDES=[
  'h13-overview','h13-prior-131','h13-udt-why','h13-enum','h13-pointer','h13-record','h13-sets-classes','h13-activity-13c','h13-prior-132','h13-file-terms','h13-serial','h13-sequential','h13-random','h13-seq-access','h13-direct-access','h13-org-access-choice','h13-hash-address','h13-hash-collision','h13-prior-133','h13-float-format','h13-float-to-denary','h13-denary-to-float','h13-approximation','h13-normalisation','h13-precision-range','h13-rounding-program','h13-over-under-zero','h13-hodder-review-1','h13-hodder-review-2',
] as const;
const ids=new Set<string>(CHAPTER_13_SOURCE_VISUAL_SLIDES);

export function hasChapter13PresentationVisual(beat:LessonPresentationBeat){return ids.has(beat.slideId);}

export function Chapter13PresentationVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  return <div className="h13pv-shell">
    <ContextVisual slideId={beat.slideId}/>
    {beat.formula?<div className="h13pv-formula">{beat.formula}</div>:null}
    {beat.bullets?<div className="h13pv-bullets">{beat.bullets.slice(0,reveal).map((x,i)=><p key={`${x}-${i}`}><span>{String(i+1).padStart(2,'0')}</span>{x}</p>)}</div>:null}
    {beat.keyTerms?<div className="h13pv-terms">{beat.keyTerms.slice(0,reveal).map(x=><section key={x.term}><strong>{x.term}</strong><p>{x.definition}</p></section>)}</div>:null}
    {beat.richBlock?<Block block={beat.richBlock} reveal={reveal}/>:null}
    {beat.example?<div className="h13pv-example"><header>{beat.example.title}</header>{beat.example.lines.slice(0,reveal).map((x,i)=><p key={`${x}-${i}`}><span>{i+1}</span>{x}</p>)}{beat.example.answer&&reveal>beat.example.lines.length?<footer>{beat.example.answer}</footer>:null}</div>:null}
    {beat.prompt?<blockquote className="h13pv-question">{beat.prompt}</blockquote>:null}
    {beat.activity?<div className="h13pv-callout tone-activity"><small>ACTIVITY</small><strong>{beat.activity.title}</strong><p>{beat.activity.prompt}</p>{beat.activity.reveal&&visible(reveal,1)?<footer>{beat.activity.reveal}</footer>:null}</div>:null}
  </div>;
}
