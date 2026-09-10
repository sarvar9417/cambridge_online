import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter3-logic-visuals.css';

export const CHAPTER_3_LOGIC_VISUAL_IDS = [
  'h3-322-truth-table-not',
  'h3-323-and-or-nand-nor',
  'h3-323-xor-example31',
  'h3-324-example31-parts12',
  'h3-324-example31-part3-activity3b',
] as const;

export function hasChapter3LogicVisual(beat: LessonPresentationBeat) {
  return CHAPTER_3_LOGIC_VISUAL_IDS.includes(beat.slideId as never);
}

const show = (reveal: number, step: number) => ({ opacity: reveal >= step ? 1 : 0.14, transform: reveal >= step ? 'translateY(0)' : 'translateY(12px)', transition: '220ms ease' });

function CombinationNot({reveal}:{reveal:number}) {
  return <div className="h3lv combos" aria-label="Hodder Table 3.9 and NOT gate truth table">
    {[1,2,3,4].map((n,i)=><section key={n} style={show(reveal,i+1)}><b>{n} input{n>1?'s':''}</b><strong>2<sup>{n}</sup> = {2**n}</strong><span>combinations</span>{n===1&&<small>NOT: 0→1 · 1→0</small>}</section>)}
  </div>;
}

function FourGateGroup({reveal}:{reveal:number}) {
  const gates = [['AND','both inputs 1'],['OR','at least one input 1'],['NAND','NOT AND'],['NOR','NOT OR']];
  return <div className="h3lv gate-group" aria-label="Hodder Figures 3.24 to 3.27 gate comparison">
    {gates.map((g,i)=><section key={g[0]} style={show(reveal,i+1)}><span className="wire">A ─</span><b>{g[0]}</b><span className="wire">─ B</span><i>→ X</i><small>{g[1]}</small></section>)}
  </div>;
}

function XorCircuit({reveal}:{reveal:number}) {
  return <div className="h3lv gate-group" aria-label="Hodder Figure 3.28 and Example 3.1 circuit flow">
    <section style={show(reveal,1)}><span>A,B</span><b>XOR</b><i>→ X</i><small>inputs differ → 1</small></section>
    <section style={show(reveal,2)}><span>A,B</span><b>AND → P</b><span>B,C</span><b>NOR → Q</b></section>
    <section style={show(reveal,3)}><span>P,Q</span><b>OR → R</b><span>R,C</span><b>XOR → X</b></section>
  </div>;
}

const part1 = [['0','0','0','0','1'],['0','0','1','0','0'],['0','1','0','0','0'],['0','1','1','0','0'],['1','0','0','0','1'],['1','0','1','0','0'],['1','1','0','1','0'],['1','1','1','1','0']];
const finalRows = [['0','0','0','0','1','1','1'],['0','0','1','0','0','0','1'],['0','1','0','0','0','0','0'],['0','1','1','0','0','0','1'],['1','0','0','0','1','1','1'],['1','0','1','0','0','0','1'],['1','1','0','1','0','1','1'],['1','1','1','1','0','1','0']];

function TraceParts({reveal}:{reveal:number}) {
  const fiveColumns = {gridTemplateColumns:'repeat(5,1fr)'};
  return <div className="h3lv truth-compare" aria-label="Hodder Example 3.1 Parts 1 and 2">
    <header style={fiveColumns}><b>A</b><b>B</b><b>C</b><b>P</b><b>Q</b></header>
    {part1.map((r,i)=><section key={i} style={{...show(reveal,Math.floor(i/2)+1),...fiveColumns}}>{r.map((v,j)=><span key={j}>{v}</span>)}</section>)}
  </div>;
}

function FinalTrace({reveal}:{reveal:number}) {
  return <div className="h3lv truth-compare" aria-label="Hodder Example 3.1 final truth table">
    <header><b>A</b><b>B</b><b>C</b><b>P</b><b>Q</b><b>R</b><b>X</b></header>
    {finalRows.map((r,i)=><section key={i} style={show(reveal,Math.floor(i/2)+1)}>{r.map((v,j)=><span key={j}>{v}</span>)}</section>)}
  </div>;
}

export function Chapter3LogicVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}) {
  switch(beat.slideId){
    case 'h3-322-truth-table-not': return <CombinationNot reveal={reveal}/>;
    case 'h3-323-and-or-nand-nor': return <FourGateGroup reveal={reveal}/>;
    case 'h3-323-xor-example31': return <XorCircuit reveal={reveal}/>;
    case 'h3-324-example31-parts12': return <TraceParts reveal={reveal}/>;
    case 'h3-324-example31-part3-activity3b': return <FinalTrace reveal={reveal}/>;
    default: return null;
  }
}
