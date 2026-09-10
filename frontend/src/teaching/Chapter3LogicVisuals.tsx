import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter3-logic-visuals.css';

export const CHAPTER_3_LOGIC_VISUAL_IDS = [
  'h3-322-truth-table-combinations',
  'h3-323-not-and-or',
  'h3-323-nand-nor-xor',
  'h3-323-six-gate-truth-tables',
] as const;

export function hasChapter3LogicVisual(beat: LessonPresentationBeat) {
  return CHAPTER_3_LOGIC_VISUAL_IDS.includes(beat.slideId as never);
}

const show = (reveal: number, step: number) => ({ opacity: reveal >= step ? 1 : 0.14, transform: reveal >= step ? 'translateY(0)' : 'translateY(12px)', transition: '220ms ease' });

const rows = [
  ['0','0','0','0','1','1','0'], ['0','1','0','1','1','0','1'], ['1','0','0','1','1','0','1'], ['1','1','1','1','0','0','0'],
];

function CombinationVisual({reveal}:{reveal:number}) {
  return <div className="h3lv combos" aria-label="Hodder Table 3.9 truth-table combinations">
    {[1,2,3,4].map((n,i)=><section key={n} style={show(reveal,i+1)}><b>{n} input{n>1?'s':''}</b><strong>2<sup>{n}</sup> = {2**n}</strong><span>combinations</span></section>)}
  </div>;
}

function GateGroup({reveal,second=false}:{reveal:number;second?:boolean}) {
  const gates = second ? [['NAND','NOT AND'],['NOR','NOT OR'],['XOR','inputs differ']] : [['NOT','invert A'],['AND','both 1'],['OR','at least one 1']];
  return <div className="h3lv gate-group" aria-label="Hodder logic gate comparison">
    {gates.map((g,i)=><section key={g[0]} style={show(reveal,i+1)}><span className="wire">A ─</span><b>{g[0]}</b>{g[0]!=='NOT'&&<span className="wire">─ B</span>}<i>→ X</i><small>{g[1]}</small></section>)}
  </div>;
}

function TruthCompare({reveal}:{reveal:number}) {
  return <div className="h3lv truth-compare" aria-label="Six gate truth-table comparison">
    <header><b>A</b><b>B</b><b>AND</b><b>OR</b><b>NAND</b><b>NOR</b><b>XOR</b></header>
    {rows.map((r,i)=><section key={i} style={show(reveal,i+1)}>{r.map((v,j)=><span key={j}>{v}</span>)}</section>)}
  </div>;
}

export function Chapter3LogicVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}) {
  switch(beat.slideId){
    case 'h3-322-truth-table-combinations': return <CombinationVisual reveal={reveal}/>;
    case 'h3-323-not-and-or': return <GateGroup reveal={reveal}/>;
    case 'h3-323-nand-nor-xor': return <GateGroup reveal={reveal} second/>;
    case 'h3-323-six-gate-truth-tables': return <TruthCompare reveal={reveal}/>;
    default: return null;
  }
}
