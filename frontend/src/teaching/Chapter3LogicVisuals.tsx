import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter3-logic-visuals.css';

export const CHAPTER_3_LOGIC_VISUAL_IDS = [
  'h3-322-truth-table-not','h3-323-and-or-nand-nor','h3-323-xor-example31','h3-324-example31-parts12','h3-324-example31-part3-activity3b',
  'h3-324-example32','h3-324-example32-truth-activity3c','h3-324-example33-stage1','h3-324-example33-truth-activity3d','h3-325-real-world-design',
  'h3-325-nand-building-blocks','h3-326-multi-input-and','h3-326-four-input-and-or','h3-326-four-input-or-activity3f','h3-end-questions-1-3','h3-end-questions-4-5','h3-end-questions-5c-6',
] as const;

export function hasChapter3LogicVisual(beat: LessonPresentationBeat) {
  return CHAPTER_3_LOGIC_VISUAL_IDS.includes(beat.slideId as never);
}

const show = (reveal: number, step: number) => ({ opacity: reveal >= step ? 1 : 0.14, transform: reveal >= step ? 'translateY(0)' : 'translateY(12px)', transition: '220ms ease' });

function CombinationNot({reveal}:{reveal:number}) {
  return <div className="h3lv combos" aria-label="Hodder Table 3.9 and NOT gate truth table">{[1,2,3,4].map((n,i)=><section key={n} style={show(reveal,i+1)}><b>{n} input{n>1?'s':''}</b><strong>2<sup>{n}</sup> = {2**n}</strong><span>combinations</span>{n===1&&<small>NOT: 0→1 · 1→0</small>}</section>)}</div>;
}

function FourGateGroup({reveal}:{reveal:number}) {
  const gates = [['AND','both inputs 1'],['OR','at least one input 1'],['NAND','NOT AND'],['NOR','NOT OR']];
  return <div className="h3lv gate-group" aria-label="Hodder Figures 3.24 to 3.27 gate comparison">{gates.map((g,i)=><section key={g[0]} style={show(reveal,i+1)}><span className="wire">A ─</span><b>{g[0]}</b><span className="wire">─ B</span><i>→ X</i><small>{g[1]}</small></section>)}</div>;
}

function XorCircuit({reveal}:{reveal:number}) {
  return <div className="h3lv gate-group" aria-label="Hodder Figure 3.28 and Example 3.1 circuit flow"><section style={show(reveal,1)}><span>A,B</span><b>XOR</b><i>→ X</i><small>inputs differ → 1</small></section><section style={show(reveal,2)}><span>A,B</span><b>AND → P</b><span>B,C</span><b>NOR → Q</b></section><section style={show(reveal,3)}><span>P,Q</span><b>OR → R</b><span>R,C</span><b>XOR → X</b></section></div>;
}

const part1 = [['0','0','0','0','1'],['0','0','1','0','0'],['0','1','0','0','0'],['0','1','1','0','0'],['1','0','0','0','1'],['1','0','1','0','0'],['1','1','0','1','0'],['1','1','1','1','0']];
const finalRows = [['0','0','0','0','1','1','1'],['0','0','1','0','0','0','1'],['0','1','0','0','0','0','0'],['0','1','1','0','0','0','1'],['1','0','0','0','1','1','1'],['1','0','1','0','0','0','1'],['1','1','0','1','0','1','1'],['1','1','1','1','0','1','0']];

function TraceParts({reveal}:{reveal:number}) { const fiveColumns = {gridTemplateColumns:'repeat(5,1fr)'}; return <div className="h3lv truth-compare" aria-label="Hodder Example 3.1 Parts 1 and 2"><header style={fiveColumns}><b>A</b><b>B</b><b>C</b><b>P</b><b>Q</b></header>{part1.map((r,i)=><section key={i} style={{...show(reveal,Math.floor(i/2)+1),...fiveColumns}}>{r.map((v,j)=><span key={j}>{v}</span>)}</section>)}</div>; }
function FinalTrace({reveal}:{reveal:number}) { return <div className="h3lv truth-compare" aria-label="Hodder Example 3.1 final truth table"><header><b>A</b><b>B</b><b>C</b><b>P</b><b>Q</b><b>R</b><b>X</b></header>{finalRows.map((r,i)=><section key={i} style={show(reveal,Math.floor(i/2)+1)}>{r.map((v,j)=><span key={j}>{v}</span>)}</section>)}</div>; }

function Example32({reveal}:{reveal:number}) {
  const parts=[['A','AND','NOT B'],['B','AND','NOT C']];
  return <div className="h3lv gate-group" aria-label="Hodder Example 3.2 safety-system logic circuit">{parts.map((p,i)=><section key={i} style={show(reveal,i+1)}><span>{p[0]}</span><b>{p[1]}</b><span>{p[2]}</span></section>)}<section style={show(reveal,3)}><b>OR</b><i>→ X</i><small>(A.B̅) + (B.C̅)</small></section></div>;
}

function Example32Truth({reveal}:{reveal:number}) {
  const rows=[['000','0'],['001','0'],['010','1'],['011','0'],['100','1'],['101','1'],['110','1'],['111','0']];
  return <div className="h3lv truth-compare" aria-label="Hodder Example 3.2 output truth table"><header style={{gridTemplateColumns:'2fr 1fr'}}><b>A B C</b><b>X</b></header>{rows.map((r,i)=><section key={r[0]} style={{...show(reveal,Math.floor(i/2)+1),gridTemplateColumns:'2fr 1fr'}}><span>{r[0]}</span><span>{r[1]}</span></section>)}</div>;
}

function WindTurbine({reveal,final=false}:{reveal:number;final?:boolean}) {
  const blocks=final ? [['①','¬S ∧ T'],['②','S ∧ W'],['③','¬T ∧ W'],['④','① OR ②'],['X','③ OR ④']] : [['①','S ≤1000 & T >80'],['②','S >1000 & W >120'],['③','T ≤80 & W >120'],['JOIN','OR + OR']];
  return <div className="h3lv gate-group" aria-label="Hodder Example 3.3 wind-turbine safety logic">{blocks.map((b,i)=><section key={b[0]} style={show(reveal,i+1)}><b>{b[0]}</b><small>{b[1]}</small></section>)}</div>;
}

function RealWorld({reveal}:{reveal:number}) {
  const items=[['COST','components'],['BUILD','fabrication'],['TIME','constraints'],['SPACE','simplify / satellites']];
  return <div className="h3lv combos" aria-label="Hodder real-world logic circuit design considerations">{items.map((x,i)=><section key={x[0]} style={show(reveal,i+1)}><b>{x[0]}</b><small>{x[1]}</small></section>)}</div>;
}

function NandBlocks({reveal}:{reveal:number}) {
  return <div className="h3lv gate-group" aria-label="Hodder Figures 3.29 to 3.31 NAND building blocks"><section style={show(reveal,1)}><b>NAND → NAND</b><i>AND</i></section><section style={show(reveal,2)}><b>NAND inputs inverted</b><i>OR</i></section><section style={show(reveal,3)}><b>NAND(A,A)</b><i>NOT</i></section><section style={show(reveal,4)}><b>Activity 3E</b><small>prove with truth tables</small></section></div>;
}

function MultiInput({reveal,orMode=false}:{reveal:number;orMode?:boolean}) {
  const items=orMode ? [['4-input AND','A.B.C.D','1111 → 1'],['3-input OR','A+B+C','000 → 0']] : [['SIMPLIFY','fewer components'],['RELIABILITY','easier fault tracing'],['3-input AND','A.B.C'],['AS LEVEL','extension only']];
  return <div className="h3lv combos" aria-label="Hodder multi-input gate equivalence">{items.map((x,i)=><section key={x[0]} style={show(reveal,i+1)}><b>{x[0]}</b><strong>{x[1]}</strong>{x[2]&&<small>{x[2]}</small>}</section>)}</div>;
}

function FourInputOr({reveal}:{reveal:number}) {
  return <div className="h3lv gate-group" aria-label="Hodder Figure 3.35 four-input OR and Activity 3F"><section style={show(reveal,1)}><span>A B C D</span><b>OR</b><i>A+B+C+D</i></section><section style={show(reveal,2)}><b>same truth table</b><small>single gate ↔ cascaded 2-input OR</small></section><section style={show(reveal,3)}><b>Activity 3F</b><small>NAND / NOR equivalence</small></section></div>;
}

function ReviewMap({reveal,group}:{reveal:number;group:number}) {
  const sets = group===1 ? [['Q1','OLED'],['Q2','ROM · EPROM · RAM · USB · 3D'],['Q3','monitoring · control · sensors']] : group===2 ? [['Q4','inkjet sequence A–I'],['Q5a','DRAM ↔ SRAM'],['Q5b','RAM ↔ ROM']] : [['Q5c','DVD-RAM ↔ flash'],['Q6a','sensor logic circuit'],['Q6b','truth table'],['Q6c','logic statement']];
  return <div className="h3lv combos" aria-label="Hodder Chapter 3 end-of-chapter question map">{sets.map((x,i)=><section key={x[0]} style={show(reveal,i+1)}><b>{x[0]}</b><small>{x[1]}</small></section>)}</div>;
}

export function Chapter3LogicVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}) {
  switch(beat.slideId){
    case 'h3-322-truth-table-not': return <CombinationNot reveal={reveal}/>;
    case 'h3-323-and-or-nand-nor': return <FourGateGroup reveal={reveal}/>;
    case 'h3-323-xor-example31': return <XorCircuit reveal={reveal}/>;
    case 'h3-324-example31-parts12': return <TraceParts reveal={reveal}/>;
    case 'h3-324-example31-part3-activity3b': return <FinalTrace reveal={reveal}/>;
    case 'h3-324-example32': return <Example32 reveal={reveal}/>;
    case 'h3-324-example32-truth-activity3c': return <Example32Truth reveal={reveal}/>;
    case 'h3-324-example33-stage1': return <WindTurbine reveal={reveal}/>;
    case 'h3-324-example33-truth-activity3d': return <WindTurbine reveal={reveal} final/>;
    case 'h3-325-real-world-design': return <RealWorld reveal={reveal}/>;
    case 'h3-325-nand-building-blocks': return <NandBlocks reveal={reveal}/>;
    case 'h3-326-multi-input-and': return <MultiInput reveal={reveal}/>;
    case 'h3-326-four-input-and-or': return <MultiInput reveal={reveal} orMode/>;
    case 'h3-326-four-input-or-activity3f': return <FourInputOr reveal={reveal}/>;
    case 'h3-end-questions-1-3': return <ReviewMap reveal={reveal} group={1}/>;
    case 'h3-end-questions-4-5': return <ReviewMap reveal={reveal} group={2}/>;
    case 'h3-end-questions-5c-6': return <ReviewMap reveal={reveal} group={3}/>;
    default: return null;
  }
}
