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
  if(slideId==='h1-bcd-uses')return <div className="h1pv-bcd-correction"><section><small>7 + 4</small><code>0111 + 0100 = 1011</code></section><i>invalid BCD digit</i><section><small>ADD 6</small><code>1011 + 0110 = 1 0001</code></section><i>carry</i><section className="answer"><strong>$0.37 + $0.94 → 1.31</strong></section></div>;
  return <div className="h1pv-bcd">{[['3','0011'],['1','0001'],['6','0110'],['5','0101']].map(([d,b])=><section key={d}><strong>{d}</strong><code>{b}</code></section>)}<footer>3165₁₀ → 0011 0001 0110 0101 (BCD)</footer></div>;
}

function CharacterVisual({slideId}:{slideId:string}){
  if(slideId==='h1-115-unicode')return <div className="h1pv-unicode"><section><span>ASCII OVERLAP</span><strong>0–127</strong><small>first 128 characters retained</small></section><i>→</i><section className="world"><span>UNICODE</span><strong>GLOBAL SCRIPTS</strong><small>coursebook: up to four bytes per character</small></section></div>;
  const chars=[['0','48','30'],['A','65','41'],['Z','90','5A'],['a','97','61'],['z','122','7A']];
  return <div className="h1pv-ascii"><header><span>CHARACTER</span><span>DENARY</span><span>HEX</span></header>{chars.map(([c,d,h])=><section key={c}><strong>{c}</strong><code>{d}</code><code>{h}</code></section>)}<footer>standard ASCII = 7-bit codes 0–127 · control codes occupy 0–31</footer></div>;
}

function BitmapVisual({slideId}:{slideId:string}){
  if(slideId==='h1-bitmap-resolution')return <div className="h1pv-pixelation"><div className="wheel-grid">{[2,3,4,6,8].map((n,i)=><section key={n} data-step={i}><span style={{gridTemplateColumns:`repeat(${n},1fr)`}}>{Array.from({length:n*n},(_,j)=><i key={j}/>)}</span><b>{String.fromCharCode(65+i)}</b></section>)}</div><footer>1920 × 1080 on 5.5 in → ≈ 401 ppi · enlarge the same pixels → density falls → pixelation becomes visible</footer></div>;
  if(slideId==='h1-bitmap-size')return <div className="h1pv-image-size"><section><small>WIDTH × HEIGHT</small><strong>1920 × 1080</strong></section><i>×</i><section><small>BIT DEPTH</small><strong>24</strong></section><i>=</i><section className="answer"><strong>49,766,400 bits</strong><small>÷ 8 → 6,220,800 bytes</small></section></div>;
  return <div className="h1pv-bitmap"><div className="pixels">{Array.from({length:64},(_,i)=><i key={i} data-tone={(i*7)%5}/>)}</div><aside><span>PIXEL</span><strong>2D MATRIX</strong><small>colour depth → possible colours</small><small>resolution → number of pixels</small><small>header → dimensions · bit depth · compression</small></aside></div>;
}

function VectorVisual({slideId}:{slideId:string}){
  if(slideId==='h1-bitmap-vector-choice')return <div className="h1pv-format-choice"><section><span>LOGO / DRAWING</span><strong>VECTOR</strong><small>objects · attributes · scale cleanly</small></section><section><span>PHOTOGRAPH</span><strong>BITMAP</strong><small>pixels · realistic tonal detail</small></section></div>;
  return <div className="h1pv-vector"><svg viewBox="0 0 620 220" aria-hidden="true"><rect x="75" y="55" width="140" height="105" rx="18"/><circle cx="145" cy="108" r="28"/><path d="M215 108 L340 55 L500 108 L340 165 Z"/><circle cx="500" cy="108" r="34"/></svg><aside><code>DRAW rectangle</code><code>SET line colour</code><code>SET fill colour</code><code>STORE relative position</code><code>STORE line thickness/style</code></aside></div>;
}

function SoundVisual({slideId}:{slideId:string}){
  if(slideId==='h1-sampling-quality')return <div className="h1pv-sampling"><svg viewBox="0 0 760 230" aria-hidden="true"><path d="M20 120 C80 25 130 25 190 120 S300 215 360 120 S470 25 530 120 S640 215 740 120"/>{Array.from({length:20},(_,i)=>{const x=35+i*35;const y=120-Math.sin((i/19)*Math.PI*4)*75;return <g key={i}><line x1={x} y1="205" x2={x} y2={y}/><circle cx={x} cy={y} r="5"/></g>})}</svg><footer><span><b>SAMPLING RATE ↑</b> more measurements per second</span><span><b>SAMPLING RESOLUTION ↑</b> more amplitude levels</span><strong>both improve fidelity and increase file size</strong></footer></div>;
  if(slideId==='h1-sound-editing')return <div className="h1pv-edit"><div className="timeline"><span/><span/><span/><span/><span/></div><section>{['TRIM','EXTRACT','AMPLITUDE','FADE','MIX','NOISE REDUCTION','FORMAT CONVERT'].map(x=><b key={x}>{x}</b>)}</section></div>;
  if(slideId==='h1-124-video')return <div className="h1pv-video">{[1,2,3,4,5].map(n=><section key={n}><span>FRAME {n}</span><i/></section>)}<footer>light-sensitive sensor → electronic signal → compressed digital frames · frame rate = frames per second</footer></div>;
  return <div className="h1pv-wave"><svg viewBox="0 0 760 240" aria-hidden="true"><line x1="30" y1="120" x2="730" y2="120"/><path d="M30 120 C90 20 150 20 210 120 S330 220 390 120 S510 20 570 120 S690 220 730 120"/></svg><footer><span>AMPLITUDE → loudness</span><span>FREQUENCY → repetitions per second</span><span>ADC → samples at fixed intervals</span></footer></div>;
}

function CompressionVisual({slideId}:{slideId:string}){
  if(slideId==='h1-rle-text')return <div className="h1pv-rle"><code>aaaaabbbbccddddd</code><i>→</i><div><span>05 · 97</span><span>04 · 98</span><span>02 · 99</span><span>05 · 100</span></div><footer>16 original bytes → 8 encoded values in the simplified Hodder model</footer></div>;
  if(slideId==='h1-rle-images')return <div className="h1pv-rle-image"><div className="f-grid">{['11111111','10000001','10111111','10111111','10000011','10111111','10111111','10111111'].flatMap((row,r)=>[...row].map((v,c)=><i key={`${r}-${c}`} data-v={v}/>))}</div><aside><strong>8 × 8 BLACK / WHITE</strong><code>64 bytes → 30 RLE values</code><small>runs are counted row-by-row</small></aside></div>;
  if(slideId==='h1-131-mp3-jpeg')return <div className="h1pv-lossy"><section><span>MP3</span><strong>PERCEPTUAL MUSIC SHAPING</strong><small>remove frequencies outside hearing range and softer masked sounds</small><code>80–320 kbit/s</code></section><section><span>JPEG</span><strong>PHOTOGRAPHIC BITMAP</strong><small>lossy · original cannot be perfectly reconstructed</small><code>≈ 5–15× reduction in source example</code></section><section><span>MP4</span><strong>MULTIMEDIA</strong><small>music · video · photos · animation</small></section></div>;
  if(slideId==='h1-132-general')return <div className="h1pv-reduce"><section><strong>IMAGE</strong><span>crop</span><span>resolution ↓</span><span>colour depth ↓</span></section><section><strong>SOUND / VIDEO</strong><span>sampling rate ↓</span><span>sampling resolution ↓</span><span>frame rate ↓</span></section><footer>smaller source data → smaller file, but quality/information is reduced</footer></div>;
  return <div className="h1pv-compress"><section><span>LOSSLESS</span><strong>RESTORE ORIGINAL</strong><small>RLE</small></section><i>vs</i><section><span>LOSSY</span><strong>DISCARD SELECTED DETAIL</strong><small>MP3 · JPEG</small></section></div>;
}

function ReviewVisual({slideId}:{slideId:string}){
  return <div className="h1pv-review"><section><strong>{slideId==='h1-activity-1i'?'ACTIVITY 1I':'END-OF-CHAPTER'}</strong><small>retrieval · calculation · explanation · representation choice</small></section><div>{['NUMBER SYSTEMS','CHARACTERS','BITMAP / VECTOR','SOUND','COMPRESSION'].map(x=><span key={x}>{x}</span>)}</div></div>;
}

function ContextVisual({slideId}:{slideId:string}){
  if(slideId==='h1-113-hex'||slideId==='h1-hex-uses')return <HexVisual slideId={slideId}/>;
  if(slideId==='h1-114-bcd'||slideId==='h1-bcd-uses')return <BcdVisual slideId={slideId}/>;
  if(slideId==='h1-115-ascii'||slideId==='h1-115-unicode')return <CharacterVisual slideId={slideId}/>;
  if(['h1-121-bitmap-basics','h1-bitmap-resolution','h1-bitmap-size'].includes(slideId))return <BitmapVisual slideId={slideId}/>;
  if(slideId==='h1-122-vector'||slideId==='h1-bitmap-vector-choice')return <VectorVisual slideId={slideId}/>;
  if(['h1-123-sound-wave','h1-sampling-quality','h1-sound-editing','h1-124-video'].includes(slideId))return <SoundVisual slideId={slideId}/>;
  if(['h1-13-need','h1-131-mp3-jpeg','h1-rle-text','h1-rle-images','h1-132-general'].includes(slideId))return <CompressionVisual slideId={slideId}/>;
  if(slideId==='h1-activity-1i'||slideId==='h1-hodder-review')return <ReviewVisual slideId={slideId}/>;
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
  'h1-overview','h1-prior','h1-111-number-systems','h1-112-convert','h1-112-signed','h1-112-arithmetic','h1-memory-units','h1-113-hex','h1-hex-uses','h1-114-bcd','h1-bcd-uses','h1-115-ascii','h1-115-unicode','h1-121-bitmap-basics','h1-bitmap-resolution','h1-bitmap-size','h1-122-vector','h1-bitmap-vector-choice','h1-123-sound-wave','h1-sampling-quality','h1-sound-editing','h1-124-video','h1-13-need','h1-131-mp3-jpeg','h1-rle-text','h1-rle-images','h1-132-general','h1-activity-1i','h1-hodder-review',
] as const;
const ids=new Set<string>(CHAPTER_1_SOURCE_VISUAL_SLIDES);
export function hasChapter1PresentationVisual(beat:LessonPresentationBeat){return ids.has(beat.slideId);}

export function Chapter1PresentationVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  return <div className="h1pv-shell"><ContextVisual slideId={beat.slideId}/>{beat.formula?<div className="h1pv-formula">{beat.formula}</div>:null}{beat.bullets?<div className="h1pv-bullets">{beat.bullets.slice(0,reveal).map((x,i)=><p key={`${x}-${i}`}><span>{String(i+1).padStart(2,'0')}</span>{x}</p>)}</div>:null}{beat.keyTerms?<div className="h1pv-terms">{beat.keyTerms.slice(0,reveal).map(x=><section key={x.term}><strong>{x.term}</strong><p>{x.definition}</p></section>)}</div>:null}{beat.richBlock?<Block block={beat.richBlock} reveal={reveal}/>:null}{beat.example?<div className="h1pv-example"><header>{beat.example.title}</header>{beat.example.lines.slice(0,reveal).map((x,i)=><p key={`${x}-${i}`}><span>{i+1}</span>{x}</p>)}{beat.example.answer&&reveal>beat.example.lines.length?<footer>{beat.example.answer}</footer>:null}</div>:null}</div>;
}
