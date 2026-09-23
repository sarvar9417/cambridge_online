import type { LessonPresentationBeat } from './lesson-experience-model';
import type { LessonRichBlock } from './lesson-content-hodder-types';
import './chapter13-presentation-visuals.css';
import './chapter13-presentation-density-master.css';

const focus=(reveal:number,index:number)=>reveal>=index?'is-visible':'is-upcoming';
const visible=(reveal:number,index:number)=>reveal>=index;

function SourceRibbon({beat}:{beat:LessonPresentationBeat}){
  const printed=beat.sourcePages.map(page=>page+303);
  const label=printed.length===0?'HODDER CHAPTER 13':printed.length===1?`HODDER p.${printed[0]}`:`HODDER pp.${printed.join(', ')}`;
  return <aside className="h13m-source-ribbon"><span>{label}</span><strong>{beat.eyebrow}</strong></aside>;
}

function ChapterMap({reveal}:{reveal:number}){
  const items=[
    ['13.1','USER-DEFINED TYPES','enumerated · pointer · record · set · class'],
    ['13.2','FILES + HASHING','serial · sequential · random · sequential/direct access'],
    ['13.3','FLOATING-POINT','M × 2ᴱ · conversion · normalisation · limits'],
  ];
  return <div className="h13m-roadmap" aria-label="Chapter 13 roadmap">{items.map(([code,title,detail],i)=><section className={focus(reveal,i+1)} key={code}><b>{code}</b><strong>{title}</strong><p>{detail}</p></section>)}</div>;
}

function DataTypeMap({slideId,reveal}:{slideId:string;reveal:number}){
  if(slideId==='h13-prior-131')return <div className="h13m-diagnostic"><section className={focus(reveal,1)}><small>PRIMITIVE TYPE CHECK</small><strong>name · mark · temperature · date · sold?</strong><p>Select the type and justify it from the data domain.</p></section><section className={focus(reveal,2)}><small>RECORD DESIGN CHECK</small><strong>zoo animal</strong><p>Name · Species · Date of birth · Location · Born in zoo? · Notes</p></section></div>;
  if(slideId==='h13-udt-why')return <div className="h13m-type-tree"><section className={focus(reveal,1)}><small>USER-DEFINED TYPE</small><strong>matches the problem domain</strong><p>Built from language-provided or previously defined types.</p></section><i>splits into</i><section className={focus(reveal,2)}><small>NON-COMPOSITE</small><strong>enumerated · pointer</strong><p>Definition does not reference other data types.</p></section><section className={focus(reveal,3)}><small>COMPOSITE</small><strong>record · set · class/object</strong><p>Definition refers to other data types.</p></section></div>;
  if(slideId==='h13-enum')return <div className="h13m-enum" aria-label="Enumerated type source model"><header><code>TYPE Tmonth = (January, February, March, ... , December)</code></header><main>{['January','February','March','April','…','December'].map((x,i)=><span className={focus(reveal,Math.min(i+1,4))} key={x}>{x}</span>)}</main><footer><code>thisMonth ← January</code><i>→ implied order →</i><code>nextMonth ← thisMonth + 1</code></footer><p>Enumeration values are identifiers, not quoted strings.</p></div>;
  if(slideId==='h13-pointer')return <div className="h13m-pointer" aria-label="Pointer declaration address and dereference model"><section className={focus(reveal,1)}><small>DATA VARIABLE</small><strong>thisMonth</strong><code>March</code></section><i>^thisMonth gives its address</i><section className={`pointer ${focus(reveal,2)}`}><small>POINTER VARIABLE</small><strong>monthPointer</strong><code>stores address of thisMonth</code></section><i>monthPointer^ dereferences</i><section className={focus(reveal,3)}><small>VALUE READ</small><strong>myMonth</strong><code>March</code></section><footer><code>TYPE TmonthPointer = ^Tmonth</code><code>monthPointer ← ^thisMonth</code><code>myMonth ← monthPointer^</code></footer></div>;
  if(slideId==='h13-record')return <div className="h13m-record"><header><span>COMPOSITE TYPE</span><strong>TbookRecord</strong></header>{[['title','STRING'],['author','STRING'],['publisher','STRING'],['noPages','INTEGER'],['fiction','BOOLEAN']].map(([field,type],i)=><section className={focus(reveal,i+1)} key={field}><strong>{field}</strong><code>{type}</code></section>)}<footer>One record models one structured entity; each named field keeps its own data type.</footer></div>;
  if(slideId==='h13-sets-classes')return <div className="h13m-typesplit"><section className={focus(reveal,1)}><small>SET</small><strong>{'{ a, e, i, o, u }'}</strong><p>unordered elements · base type · union/intersection</p><code>TYPE Sletter = SET OF CHAR</code></section><section className={focus(reveal,2)}><small>CLASS</small><strong>attributes + methods</strong><p>data and behaviour are defined together</p><code>object = instance of class</code></section></div>;
  if(slideId==='h13-activity-13c')return <div className="h13m-choice-grid"><header>Choose by what the problem must represent</header>{[['Fixed colour choices','ENUMERATED'],['Property with several fields','RECORD'],['Addresses of INTEGER data','POINTER']].map(([need,type],i)=><section className={focus(reveal,i+1)} key={need}><span>{need}</span><strong>{type}</strong></section>)}</div>;
  return <ChapterMap reveal={reveal}/>;
}

const serial=['8','2','4','7','3','1'];
const sequential=['1','2','3','4','5','7','8'];
function FileMap({slideId,reveal}:{slideId:string;reveal:number}){
  if(slideId==='h13-prior-132')return <div className="h13m-file-prior"><section className={focus(reveal,1)}><b>01</b><strong>FILE MODES</strong><p>Describe three ways a text file can be opened.</p></section><section className={focus(reveal,2)}><b>02</b><strong>FILE OPERATIONS</strong><p>Create → write → read → append.</p></section><section className={focus(reveal,3)}><b>03</b><strong>IMPLEMENT</strong><p>Turn the pseudocode into a working program and test it.</p></section></div>;
  if(slideId==='h13-file-terms')return <div className="h13m-file-foundation"><section className={focus(reveal,1)}><small>FILE ORGANISATION</small><strong>How records are physically arranged</strong><div><span>SERIAL</span><span>SEQUENTIAL</span><span>RANDOM</span></div></section><i>paired with</i><section className={focus(reveal,2)}><small>FILE ACCESS</small><strong>How a required record is physically found</strong><div><span>SEQUENTIAL</span><span>DIRECT</span></div></section></div>;
  if(slideId==='h13-serial')return <div className="h13m-file-single"><header><span>FIGURE 13.1</span><strong>SERIAL · arrival order</strong></header><main>{serial.map((x,i)=><b className={focus(reveal,i+1)} key={`${x}-${i}`}>{x}</b>)}<i>→ append new record</i></main><footer>Records are physically stored one after another in the order they were added; useful for temporary transaction files such as meter readings.</footer></div>;
  if(slideId==='h13-sequential')return <div className="h13m-sequential"><section><small>BEFORE INSERT</small><div>{['1','2','3','4','7','8'].map((x,i)=><b className={focus(reveal,Math.min(i+1,2))} key={x}>{x}</b>)}</div></section><i>insert customer 5 in key order ↓</i><section className="after"><small>AFTER INSERT</small><div>{sequential.map((x,i)=><b className={x==='5'?focus(reveal,3):focus(reveal,2)} key={x}>{x}</b>)}</div></section><footer>Sequential organisation physically preserves a selected order, commonly record-key order.</footer></div>;
  if(slideId==='h13-random')return <div className="h13m-random"><header><strong>RANDOM ORGANISATION</strong><span>available physical positions</span></header><main>{serial.map((x,i)=><b className={focus(reveal,Math.min(i+1,3))} key={`${x}-r-${i}`}>{x}</b>)}</main><footer><span>KEY</span><i>→ hashing algorithm →</i><span>HOME ADDRESS</span><p>The physical order need not match the key order.</p></footer></div>;
  if(slideId==='h13-seq-access')return <div className="h13m-access"><header>SEQUENTIAL ACCESS</header>{['START','record 1','record 2','…','TARGET / STOP'].map((x,i)=><section className={focus(reveal,Math.min(i+1,4))} key={x}><b>{x}</b>{i<4?<i>→</i>:null}</section>)}<footer><p>Serial file: stop at match or end-of-file.</p><p>Ordered sequential file: if current key passes target, target is absent.</p></footer></div>;
  if(slideId==='h13-direct-access')return <div className="h13m-direct"><section className={focus(reveal,1)}><small>SEQUENTIAL FILE</small><strong>KEY</strong><i>→ index →</i><strong>PHYSICAL ADDRESS</strong></section><section className={focus(reveal,2)}><small>RANDOM FILE</small><strong>KEY</strong><i>→ hash →</i><strong>HOME ADDRESS</strong></section><footer>Direct access avoids physically reading every earlier record; it suits low-hit-rate retrieval/update work.</footer></div>;
  if(slideId==='h13-org-access-choice')return <div className="h13m-choice-table"><header><strong>WORKLOAD</strong><strong>BEST-FIT REASONING</strong></header>{[['Append transactions as they arrive','Serial organisation'],['Process almost every record in key order','Sequential organisation + sequential access'],['Retrieve/update one keyed record quickly','Direct access with index or hash'],['Store records in hash-selected slots','Random organisation + direct access']].map(([a,b],i)=><section className={focus(reveal,i+1)} key={a}><p>{a}</p><strong>{b}</strong></section>)}</div>;
  return <div className="h13m-file-foundation"><section><small>ORGANISATION</small><strong>where records are stored</strong></section><section><small>ACCESS</small><strong>how records are found</strong></section></div>;
}

function HashMap({slideId,reveal}:{slideId:string;reveal:number}){
  if(slideId==='h13-hash-collision')return <div className="h13m-collision"><main><section className={focus(reveal,1)}><code>3024 MOD 2000</code><strong>1024</strong></section><section className={focus(reveal,2)}><code>5024 MOD 2000</code><strong>1024</strong></section><i className={focus(reveal,3)}>COLLISION</i></main><footer><section className={focus(reveal,4)}><strong>OPEN HASHING</strong><p>Use the next available file location.</p></section><section className={focus(reveal,5)}><strong>CLOSED HASHING</strong><p>Use a separate overflow area.</p></section></footer></div>;
  return <div className="h13m-hash"><header><span>TABLE 13.1 SOURCE EXAMPLE</span><strong>2000 record slots · key 3024</strong></header><main><section className={focus(reveal,1)}><small>KEY</small><strong>3024</strong></section><i>MOD 2000</i><section className={focus(reveal,2)}><small>SLOT / REMAINDER</small><strong>1024</strong></section><i>address calculation</i><section className={focus(reveal,3)}><small>HOME ADDRESS</small><strong>0 + 1 × 1024 = 1024</strong></section></main><footer>Hashing maps a record key to a physical location. The chapter also notes that more complex hashing algorithms are used in data encryption.</footer></div>;
}

function BitWord({bits,label}:{bits:string;label:string}){
  return <section className="h13m-bitword"><small>{label}</small><div>{bits.split('').map((b,i)=><b key={`${b}-${i}`}>{b}</b>)}</div></section>;
}

function FloatFormat({reveal}:{reveal:number}){
  return <div className="h13m-floatformat"><section className={focus(reveal,1)}><BitWord bits="Smmmmmmm" label="8-bit mantissa"/><p>two’s-complement fraction · binary point after sign bit</p></section><strong>× 2</strong><section className={focus(reveal,2)}><BitWord bits="Seeeeeee" label="8-bit exponent"/><p>two’s-complement integer</p></section><footer>M × 2ᴱ</footer></div>;
}

function FloatToDenary({reveal}:{reveal:number}){
  const rows=[
    ['13.1','01011010','00000100','M = 45/64 · E = 4','11.25'],
    ['13.2','00101000','00000011','M = 5/16 · E = 3','2.5'],
    ['13.3','11001100','00001100','M = −13/32 · E = 12','−1664'],
    ['13.4','11001100','11111100','M = −13/32 · E = −4','−0.025390625'],
  ];
  return <div className="h13m-worked-table"><header><span>EXAMPLE</span><span>MANTISSA</span><span>EXPONENT</span><span>INTERPRET</span><span>DENARY</span></header>{rows.map((row,i)=><section className={focus(reveal,i+1)} key={row[0]}>{row.map((cell,j)=>j===4?<strong key={cell}>{cell}</strong>:<code key={cell}>{cell}</code>)}</section>)}</div>;
}

function DenaryToFloat({reveal}:{reveal:number}){
  const rows=[
    ['13.5','+4.5','0.1001 × 2³','01001000','00000011'],
    ['13.6','+0.171875','0.1011 × 2⁻²','01011000','11111110'],
    ['13.7','−10.375','1.0101101 × 2⁴','10101101','00000100'],
  ];
  return <div className="h13m-denary-worked"><header><strong>DENARY</strong><i>→ binary fraction → shift point → encode exponent →</i><strong>8 + 8 STORED WORD</strong></header>{rows.map(([ex,input,form,m,e],i)=><section className={focus(reveal,i+1)} key={ex}><b>{ex}</b><strong>{input}</strong><code>{form}</code><span><code>{m}</code><code>{e}</code></span></section>)}<footer>Example 13.6 can first appear unnormalised as <code>00010110 00000000</code>; the normalised equivalent shown above has exponent −2.</footer></div>;
}

function Approximation({reveal}:{reveal:number}){
  return <div className="h13m-approx"><section className={focus(reveal,1)}><small>DENARY INPUT</small><strong>5.88</strong><p>.88 does not terminate exactly in binary.</p></section><i>repeated ×2 builds fraction bits</i><section className={focus(reveal,2)}><small>8-BIT MANTISSA LIMIT</small><code>0.1011100 00000011</code><strong>stored value = 5.75</strong></section><i>more mantissa bits</i><section className={focus(reveal,3)}><small>BETTER APPROXIMATION</small><strong>5.875</strong><p>The source notes that a 16-bit mantissa can get closer to 5.88.</p></section></div>;
}

function Normalisation({reveal}:{reveal:number}){
  return <div className="h13m-normalise"><header><strong>NORMALISATION = improve precision</strong><span>positive begins 0.1 · negative begins 1.0</span></header><main><section className={focus(reveal,1)}><small>BEFORE</small><code>0.0011100 × 2⁵</code></section><i>shift mantissa left 2 · reduce exponent by 2</i><section className={focus(reveal,2)}><small>NORMALISED</small><code>0.1110000 × 2³</code></section></main><footer>{['0.1000000 00000010','0.0100000 00000011','0.0010000 00000100','0.0001000 00000101'].map((x,i)=><code className={focus(reveal,Math.min(i+2,5))} key={x}>{x}</code>)}</footer></div>;
}

function PrecisionRange({reveal}:{reveal:number}){
  return <div className="h13m-tradeoff">{[['12 + 4','HIGHER PRECISION','smaller exponent range'],['8 + 8','BALANCED','reduced precision · increased range'],['4 + 12','VERY LARGE RANGE','lower precision']].map(([bits,title,text],i)=><section className={focus(reveal,i+1)} key={bits}><strong>{bits}</strong><span>{title}</span><p>{text}</p><div><b style={{flex:Number(bits.split(' ')[0])}}/><i style={{flex:Number(bits.split(' ')[2])}}/></div></section>)}</div>;
}

function Limits({slideId,reveal}:{slideId:string;reveal:number}){
  if(slideId==='h13-rounding-program')return <div className="h13m-rounding"><section className={focus(reveal,1)}><small>REPRESENTATION</small><strong>finite mantissa</strong><p>some denary fractions become approximations</p></section><i>→</i><section className={focus(reveal,2)}><small>COMPUTATION</small><strong>repeat operations</strong><p>small errors can accumulate</p></section><i>→</i><section className={focus(reveal,3)}><small>DISPLAY / DECISION</small><strong>for example 0.399999…</strong><p>round deliberately when the application requires it</p></section></div>;
  return <div className="h13m-limits"><span className={focus(reveal,1)}>UNDERFLOW</span><i>too small for allocated word</i><b>REPRESENTABLE NON-ZERO RANGE</b><i>too large for allocated word</i><span className={focus(reveal,2)}>OVERFLOW</span><footer className={focus(reveal,3)}>Zero is represented separately from tiny non-zero values; mantissa precision also controls rounding/approximation.</footer></div>;
}

function ReviewMap({slideId,reveal}:{slideId:string;reveal:number}){
  if(slideId==='h13-hodder-review-1')return <div className="h13m-review"><section className={focus(reveal,1)}><b>Q1</b><strong>24-bit floating-point word</strong><p>values · normalisation · accuracy/range · zero</p></section><section className={focus(reveal,2)}><b>Q2</b><strong>12-bit mantissa + 6-bit exponent</strong><p>011100100000 000111 · 101001110000 111100 · +4.75 · −8.375</p></section><section className={focus(reveal,3)}><b>Q3</b><strong>8 + 8 two’s complement</strong><p>represent +3.5 and −3.5</p></section><section className={focus(reveal,4)}><b>Q4a</b><strong>Tseason + TJournalRecord</strong><p>identify enumerated/composite/non-composite/user-defined types</p></section></div>;
  return <div className="h13m-review"><section className={focus(reveal,1)}><b>Q4b</b><strong>file organisation/access</strong><p>select and justify methods from the scenario</p></section><section className={focus(reveal,2)}><b>Q4c</b><strong>hashing</strong><p>calculate address and resolve collision</p></section><section className={focus(reveal,3)}><b>Q5</b><strong>floating-point reasoning</strong><p>precision · range · overflow · underflow · approximation</p></section></div>;
}

function FloatMap({slideId,reveal}:{slideId:string;reveal:number}){
  if(slideId==='h13-prior-133')return <div className="h13m-float-prior">{['binary ↔ denary','two’s complement','binary arithmetic','standard form','binary fractions'].map((x,i)=><section className={focus(reveal,i+1)} key={x}><b>{String(i+1).padStart(2,'0')}</b><strong>{x}</strong></section>)}</div>;
  if(slideId==='h13-float-format')return <FloatFormat reveal={reveal}/>;
  if(slideId==='h13-float-to-denary')return <FloatToDenary reveal={reveal}/>;
  if(slideId==='h13-denary-to-float')return <DenaryToFloat reveal={reveal}/>;
  if(slideId==='h13-approximation')return <Approximation reveal={reveal}/>;
  if(slideId==='h13-normalisation')return <Normalisation reveal={reveal}/>;
  if(slideId==='h13-precision-range')return <PrecisionRange reveal={reveal}/>;
  if(slideId==='h13-rounding-program'||slideId==='h13-over-under-zero')return <Limits slideId={slideId} reveal={reveal}/>;
  if(slideId==='h13-hodder-review-1'||slideId==='h13-hodder-review-2')return <ReviewMap slideId={slideId} reveal={reveal}/>;
  return <FloatFormat reveal={reveal}/>;
}

function ContextVisual({slideId,reveal}:{slideId:string;reveal:number}){
  if(slideId==='h13-overview')return <ChapterMap reveal={reveal}/>;
  if(/enum|pointer|record|sets|udt|type-choice|activity-13c|prior-131/.test(slideId))return <DataTypeMap slideId={slideId} reveal={reveal}/>;
  if(/hash/.test(slideId))return <HashMap slideId={slideId} reveal={reveal}/>;
  if(/file|serial|sequential|random|access|org-access|prior-132/.test(slideId))return <FileMap slideId={slideId} reveal={reveal}/>;
  if(/float|denary|normal|precision|rounding|approx|over-under|prior-133|review/.test(slideId))return <FloatMap slideId={slideId} reveal={reveal}/>;
  return <ChapterMap reveal={reveal}/>;
}

function Block({block,reveal}:{block:LessonRichBlock;reveal:number}){
  if(block.kind==='paragraph')return <p className="h13pv-paragraph">{block.text}</p>;
  if(block.kind==='bullets')return <div className="h13pv-bullets">{block.items.map((x,i)=><p className={focus(reveal,i+1)} key={`${x}-${i}`}><span>{String(i+1).padStart(2,'0')}</span>{x}</p>)}</div>;
  if(block.kind==='steps')return <div className="h13pv-steps"><header>{block.title}</header>{block.items.map((x,i)=><section className={focus(reveal,i+1)} key={`${x}-${i}`}><span>{i+1}</span><p>{x}</p>{i<block.items.length-1?<i>→</i>:null}</section>)}</div>;
  if(block.kind==='code')return <div className="h13pv-code"><header>{block.title}</header><pre>{block.lines.join('\n')}</pre></div>;
  if(block.kind==='callout')return <div className={`h13pv-callout tone-${block.tone??'info'}`}><small>{block.tone==='activity'?'ACTIVITY':block.tone==='extension'?'EXTENSION':block.tone==='warning'?'WARNING':'KEY IDEA'}</small><strong>{block.title}</strong><p>{block.text}</p></div>;
  if(block.kind==='comparison')return <div className="h13pv-comparison"><section><header>{block.leftTitle}</header>{block.rows.map(([l],i)=><p className={focus(reveal,i+1)} key={`${l}-${i}`}>{l}</p>)}</section><section><header>{block.rightTitle}</header>{block.rows.map(([,r],i)=><p className={focus(reveal,i+1)} key={`${r}-${i}`}>{r}</p>)}</section></div>;
  if(block.kind==='table')return <div className="h13pv-table"><header>{block.table.caption}</header><table><thead><tr>{block.table.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{block.table.rows.map((row,i)=><tr className={focus(reveal,i+1)} key={i}>{row.map((c,j)=><td key={`${i}-${j}`}>{c}</td>)}</tr>)}</tbody></table></div>;
  if(block.kind==='source-note')return <div className="h13pv-callout"><small>SOURCE ACCURACY</small><strong>{block.title}</strong><p>{block.sourceText}</p><p>{block.examSafeText}</p></div>;
  return <div className="h13pv-callout"><strong>Coursebook figure</strong><p>Use the source-labelled figure together with the teacher explanation for this scene.</p></div>;
}

export const CHAPTER_13_SOURCE_VISUAL_SLIDES=[
  'h13-overview','h13-prior-131','h13-udt-why','h13-enum','h13-pointer','h13-record','h13-sets-classes','h13-activity-13c','h13-prior-132','h13-file-terms','h13-serial','h13-sequential','h13-random','h13-seq-access','h13-direct-access','h13-org-access-choice','h13-hash-address','h13-hash-collision','h13-prior-133','h13-float-format','h13-float-to-denary','h13-denary-to-float','h13-approximation','h13-normalisation','h13-precision-range','h13-rounding-program','h13-over-under-zero','h13-hodder-review-1','h13-hodder-review-2',
] as const;
const ids=new Set<string>(CHAPTER_13_SOURCE_VISUAL_SLIDES);

export function hasChapter13PresentationVisual(beat:LessonPresentationBeat){return ids.has(beat.slideId);}

export function Chapter13PresentationVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  return <div className="h13pv-shell h13m-master" data-slide={beat.slideId}>
    <SourceRibbon beat={beat}/>
    <ContextVisual slideId={beat.slideId} reveal={reveal}/>
    {beat.formula?<div className="h13pv-formula">{beat.formula}</div>:null}
    {beat.bullets?<div className="h13pv-bullets">{beat.bullets.map((x,i)=><p className={focus(reveal,i+1)} key={`${x}-${i}`}><span>{String(i+1).padStart(2,'0')}</span>{x}</p>)}</div>:null}
    {beat.keyTerms?<div className="h13pv-terms">{beat.keyTerms.map((x,i)=><section className={focus(reveal,i+1)} key={x.term}><strong>{x.term}</strong><p>{x.definition}</p></section>)}</div>:null}
    {beat.richBlock?<Block block={beat.richBlock} reveal={reveal}/>:null}
    {beat.example?<div className="h13pv-example"><header>{beat.example.title}</header>{beat.example.lines.map((x,i)=><p className={focus(reveal,i+1)} key={`${x}-${i}`}><span>{i+1}</span>{x}</p>)}{beat.example.answer?<footer className={focus(reveal,beat.example.lines.length+1)}>{beat.example.answer}</footer>:null}</div>:null}
    {beat.prompt?<blockquote className="h13pv-question">{beat.prompt}</blockquote>:null}
    {beat.activity?<div className="h13pv-callout tone-activity"><small>ACTIVITY</small><strong>{beat.activity.title}</strong><p>{beat.activity.prompt}</p>{beat.activity.reveal?<footer className={focus(reveal,1)}>{beat.activity.reveal}</footer>:null}</div>:null}
    <div className="h13m-reveal-status" aria-hidden="true"><span>{reveal===0?'STRUCTURE VISIBLE':`FOCUS ${reveal}`}</span>{visible(reveal,1)?<b>Space = emphasis, not disclosure</b>:<b>Press Space to move the teaching focus</b>}</div>
  </div>;
}
