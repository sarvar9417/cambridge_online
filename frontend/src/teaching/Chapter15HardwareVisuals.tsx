import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter15-hardware-visuals.css';

export const CHAPTER_15_HARDWARE_VISUAL_IDS = [
  'h15-1511-risc-cisc',
  'h15-1511-comparison-pipeline',
  'h15-1511-pipeline-interrupt',
  'h15-1512-sisd-simd',
  'h15-1512-misd-mimd',
  'h15-1512-cluster-massive',
  'h15-151-activity',
  'h15-1521-boolean-intro',
  'h15-1521-laws',
  'h15-1521-half-adder',
  'h15-1522-full-adder-build',
  'h15-1522-full-adder-truth',
  'h15-1523-sr',
  'h15-1523-jk-intro',
  'h15-1523-jk-uses',
  'h15-1524-circuit-expression',
  'h15-1525-kmap-intro',
  'h15-1525-kmap-3var',
  'h15-1525-kmap-4var',
  'h15-1525-kmap-wrap',
  'h15-1525-kmap-rules',
  'h15-activity-15e',
] as const;

export function hasChapter15HardwareVisual(beat:LessonPresentationBeat){
  return CHAPTER_15_HARDWARE_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function RiscCisc({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-compare" aria-label="RISC and CISC processor comparison">
    <section className={state(reveal,1)}><b>CISC</b><span>complex instruction set</span><small>more formats · complex multi-cycle work</small><code>ADD A,B</code></section>
    <section className={state(reveal,2)}><b>RISC</b><span>smaller optimised instruction set</span><small>simpler instructions · execution-speed emphasis</small><code>LOAD → LOAD → ADD → STORE</code></section>
    <footer className={state(reveal,3)}>The source contrasts one complex instruction with a sequence of simpler instructions.</footer>
  </div>;
}

function PipelineStages({reveal}:{reveal:number}){
  const stages=['FETCH','DECODE','OPERAND FETCH','EXECUTE','WRITEBACK'];
  return <div className="h15hw h15hw-pipeline" aria-label="Five processor pipeline stages">
    {stages.map((stage,index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={stage}><b>{stage}</b></section>)}
    <footer className={state(reveal,3)}>Fixed/simple instruction forms make pipelining easier to organise.</footer>
  </div>;
}

function PipelineOverlap({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-overlap" aria-label="Overlapped instruction pipeline and interrupt consideration">
    <div className={state(reveal,1)}><b>CLOCK 1</b><span>I1 · FETCH</span></div>
    <div className={state(reveal,1)}><b>CLOCK 2</b><span>I1 · DECODE</span><span>I2 · FETCH</span></div>
    <div className={state(reveal,2)}><b>CLOCK 3+</b><span>several instructions in different stages</span></div>
    <aside className={state(reveal,3)}><b>SOURCE EXAMPLE</b><span>6 five-stage instructions → 10 clock cycles</span><small>sequential route → 30 cycles</small></aside>
    <footer className={state(reveal,3)}>Interrupt handling must account for instructions already inside the pipeline.</footer>
  </div>;
}

function SisdSimd({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-streams" aria-label="SISD and SIMD instruction data streams">
    <section className={state(reveal,1)}><b>SISD</b><div className="h15hw-node">1 processor</div><span>one instruction stream</span><span>one data source</span></section>
    <section className={state(reveal,2)}><b>SIMD</b><div className="h15hw-row"><i>P1</i><i>P2</i><i>P3</i><i>P4</i></div><span>same instruction · different data</span><small>source example: independent pixel brightness</small></section>
  </div>;
}

function MisdMimd({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-streams" aria-label="MISD and MIMD architectures">
    <section className={state(reveal,1)}><b>MISD</b><span>different instructions</span><span>shared data</span><small>uncommon</small></section>
    <section className={state(reveal,2)}><b>MIMD</b><span>independent instructions</span><span>independent data</span><small>multicore systems · supercomputers</small></section>
    <footer className={state(reveal,3)}>Parallel systems need processor communication and software that can divide work.</footer>
  </div>;
}

function ClusterMassive({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-cluster" aria-label="Cluster and massively parallel computer comparison">
    <section className={state(reveal,1)}><b>CLUSTER</b><div className="h15hw-row"><i>PC</i><i>PC</i><i>PC</i></div><span>networked computers remain largely independent</span></section>
    <i>↔</i>
    <section className={state(reveal,2)}><b>MASSIVELY PARALLEL</b><div className="h15hw-row"><i>P</i><i>P</i><i>P</i><i>P</i><i>P</i></div><span>many processors cooperate as one large machine</span><small>interconnected data pathways</small></section>
  </div>;
}

function DeMorgan({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-demorgan" aria-label="De Morgan Boolean laws">
    <section className={state(reveal,1)}><b>NOT(A AND B)</b><span>=</span><strong>(NOT A) OR (NOT B)</strong></section>
    <section className={state(reveal,2)}><b>NOT(A OR B)</b><span>=</span><strong>(NOT A) AND (NOT B)</strong></section>
    <footer className={state(reveal,3)}>Equivalent truth-table output columns prove the identities.</footer>
  </div>;
}

function HalfAdder({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-adder" aria-label="Half adder sum and carry logic">
    <div className={state(reveal,1)}><b>A</b><b>B</b></div><i>→</i>
    <section className={state(reveal,2)}><b>HALF ADDER</b><span>two input bits</span></section><i>→</i>
    <div className={state(reveal,3)}><b>S · SUM</b><b>C · CARRY</b><small>1 + 1 → S=0, C=1</small></div>
  </div>;
}

function FullAdder({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-fulladder" aria-label="Full adder built from two half adders and OR">
    <div className={state(reveal,1)}><b>A</b><b>B</b></div><i>→</i><section className={state(reveal,1)}><b>HALF ADDER 1</b></section>
    <div className={`h15hw-cin ${state(reveal,2)}`}><b>Carry-in</b></div><i>→</i><section className={state(reveal,2)}><b>HALF ADDER 2</b></section>
    <div className={`h15hw-or ${state(reveal,3)}`}><b>OR</b><span>carry paths</span></div><i>→</i><div className={state(reveal,3)}><b>SUM</b><b>Carry-out</b></div>
  </div>;
}

function SrFlipFlop({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-flip" aria-label="SR flip-flop memory states">
    <section className={state(reveal,1)}><b>S · SET</b><span>cross-coupled NOR gates</span></section>
    <div className={`h15hw-memory ${state(reveal,2)}`}><b>1-BIT STATE</b><span>Q</span><span>NOT Q</span></div>
    <section className={state(reveal,2)}><b>R · RESET</b><span>positive feedback</span></section>
    <footer className={state(reveal,3)}>S=0,R=0 keeps the remembered state · S=1,R=1 is the invalid SR condition.</footer>
  </div>;
}

function Jk({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-jk" aria-label="JK flip-flop states and uses">
    <div className="h15hw-jk-grid"><section className={state(reveal,1)}><b>J=0 K=0</b><span>no change</span></section><section className={state(reveal,1)}><b>J=1 K=0</b><span>set</span></section><section className={state(reveal,2)}><b>J=0 K=1</b><span>reset</span></section><section className={state(reveal,2)}><b>J=1 K=1</b><span>toggle after clock pulse</span></section></div>
    <footer className={state(reveal,3)}><span>SHIFT REGISTER</span><span>BINARY COUNTER</span></footer>
  </div>;
}

function Sop({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-sop" aria-label="Circuit or truth table to sum of products">
    <section className={state(reveal,1)}><b>CIRCUIT</b><span>label intermediate gate results</span></section><i>→</i>
    <section className={state(reveal,2)}><b>OUTPUT = 1 ROWS</b><span>write one AND product per selected row</span></section><i>→</i>
    <section className={state(reveal,3)}><b>SUM OF PRODUCTS</b><span>OR product terms</span><small>then simplify</small></section>
  </div>;
}

function Kmap({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-kmap" aria-label="Karnaugh map grouping rules">
    <div className={`h15hw-map ${state(reveal,1)}`}><span>1</span><span>1</span><span>0</span><span>1</span><span>1</span><span>1</span><span>0</span><span>1</span></div>
    <section className={state(reveal,2)}><b>GRAY-CODE ORDER</b><span>group only 1s</span><span>use largest valid groups</span></section>
    <section className={state(reveal,3)}><b>GROUPING</b><span>overlap allowed</span><span>edge wrap allowed</span><span>keep variables constant in the group</span></section>
  </div>;
}


function PipelineActivity({reveal}:{reveal:number}){
  const instructions=['LOAD A','LOAD B','LOAD C','ADD A,B,C','STORE D','OUT D'];
  return <div className="h15hw h15hw-pipeline-activity" aria-label="Activity 15A six instruction pipeline trace">
    <div className="h15hw-instruction-row">{instructions.map((item,index)=><span className={state(reveal,index<2?1:index<4?2:3)} key={item}>{item}</span>)}</div>
    <section className={state(reveal,2)}><b>PIPELINED</b><span>overlap fetch/decode/operand fetch/execute/writeback across instructions</span><strong>6 instructions · 10 cycles in the source example</strong></section>
    <section className={state(reveal,3)}><b>SEQUENTIAL</b><span>finish all 5 stages before the next instruction</span><strong>6 × 5 = 30 cycles</strong></section>
    <footer className={state(reveal,3)}>ACTIVITY 15A · compare pipeline tracing with sequential execution; Extension 15B revisits the Von Neumann bottleneck and parallel systems.</footer>
  </div>;
}

function BooleanIntro({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-boolean-intro" aria-label="Boolean algebra combination sequential sum of products Gray code and Karnaugh map overview">
    <div className={'h15hw-boolean-core '+state(reveal,1)}><b>BOOLEAN ALGEBRA</b><span>TRUE = 1 · FALSE = 0</span></div>
    <div className="h15hw-boolean-grid">
      <section className={state(reveal,1)}><b>COMBINATIONAL</b><span>output depends on current inputs</span></section>
      <section className={state(reveal,2)}><b>SEQUENTIAL</b><span>state / memory affects output</span></section>
      <section className={state(reveal,2)}><b>SUM OF PRODUCTS</b><span>AND product terms combined by OR</span></section>
      <section className={state(reveal,3)}><b>GRAY CODE</b><span>adjacent values differ by one bit</span></section>
      <section className={state(reveal,3)}><b>KARNAUGH MAP</b><span>Gray-code-based visual simplification</span></section>
    </div>
  </div>;
}

function FullAdderTruth({reveal}:{reveal:number}){
  const rows=[
    ['0','0','0','0','0'],['0','0','1','1','0'],['0','1','0','1','0'],['0','1','1','0','1'],
    ['1','0','0','1','0'],['1','0','1','0','1'],['1','1','0','0','1'],['1','1','1','1','1'],
  ];
  return <div className="h15hw h15hw-fulladder-truth" aria-label="Full adder truth table and four bit chain">
    <section className={state(reveal,1)}><header>A · B · Cin → SUM · Cout</header><div className="h15hw-truth-grid">{rows.map((row,index)=><span key={index}>{row.join('  ')}</span>)}</div></section>
    <section className={state(reveal,2)}><b>4-BIT ADDITION</b><div className="h15hw-adder-chain"><span>FA0</span><i>→</i><span>FA1</span><i>→</i><span>FA2</span><i>→</i><span>FA3</span></div><small>carry-out from one stage becomes carry-in to the next</small></section>
    <footer className={state(reveal,3)}>ACTIVITY 15C · rebuild half and full adders using NAND gates only and verify the truth tables.</footer>
  </div>;
}

function JkIntro({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-jk-intro" aria-label="SR invalid state and clocked JK transition">
    <section className={state(reveal,1)}><b>SR FLIP-FLOP</b><span>stores one bit</span><span>S=1, R=1 → INVALID</span><small>can contribute to RAM storage</small></section>
    <i>→</i>
    <section className={state(reveal,2)}><b>JK FLIP-FLOP</b><span>adds clocked control + extra gates</span><span>J=0,K=0 → no change</span><span>J=1,K=1 → toggle</span></section>
    <footer className={state(reveal,3)}>state changes are synchronised by the clock pulse.</footer>
  </div>;
}

const gray2=['00','01','11','10'];
function KmapIntro({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-kmap-intro" aria-label="NAND truth table to Gray code Karnaugh map">
    <section className={state(reveal,1)}><b>NAND TRUTH TABLE</b><div className="h15hw-mini-truth"><span>00 → 1</span><span>01 → 1</span><span>10 → 1</span><span>11 → 0</span></div></section>
    <i>→</i>
    <section className={state(reveal,2)}><b>GRAY-CODE MAP</b><div className="h15hw-gray-row">{gray2.map(x=><span key={x}>{x}</span>)}</div><small>adjacent positions differ by one input bit</small></section>
    <footer className={state(reveal,3)}>ACTIVITY 15D · derive simplified expressions for the source circuits before drawing efficient logic.</footer>
  </div>;
}

function KmapThree({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-kmap-example" aria-label="Three variable Karnaugh map grouping">
    <div className={'h15hw-kmap-board h15hw-kmap-board--3 '+state(reveal,1)}>{['1','1','0','1','1','0','1','1'].map((x,i)=><span key={i}>{x}</span>)}</div>
    <section className={state(reveal,2)}><b>GROUP FOUR 1-CELLS</b><span>eliminate variables that change inside each valid group</span></section>
    <footer className={state(reveal,3)}><b>SIMPLIFIED</b><code>A.C + B.C + A.B</code></footer>
  </div>;
}

function KmapFour({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-kmap-example" aria-label="Four variable Karnaugh map large groups">
    <div className={'h15hw-kmap-board h15hw-kmap-board--4 '+state(reveal,1)}>{['1','1','0','0','1','1','1','0','0','1','1','1','0','0','1','1'].map((x,i)=><span key={i}>{x}</span>)}</div>
    <section className={state(reveal,2)}><b>TWO GRAY-CODE AXES</b><span>00 · 01 · 11 · 10</span><span>choose the largest valid power-of-two groups</span></section>
    <footer className={state(reveal,3)}>larger groups remove more changing variables while remaining equivalent to the original truth table.</footer>
  </div>;
}

function KmapWrap({reveal}:{reveal:number}){
  return <div className="h15hw h15hw-wrap" aria-label="Karnaugh map edge and corner wrap around adjacency">
    <div className={'h15hw-wrap-map '+state(reveal,1)}>{Array.from({length:16},(_,i)=><span data-edge={i<4||i>11||i%4===0||i%4===3?'yes':'no'} key={i}>{[0,3,12,15].includes(i)?'1':'·'}</span>)}</div>
    <section className={state(reveal,2)}><b>OPPOSITE EDGES ARE ADJACENT</b><span>left ↔ right</span><span>top ↔ bottom</span></section>
    <section className={state(reveal,3)}><b>FOUR CORNERS</b><span>one valid group</span><span>groups may overlap</span><span>retain only constant variables</span></section>
  </div>;
}

function Activity15E({reveal}:{reveal:number}){
  const steps=['BOOLEAN EXPRESSION','TRUTH TABLE','K-MAP','SIMPLIFIED EXPRESSION','EFFICIENT CIRCUIT'];
  return <div className="h15hw h15hw-activity15e" aria-label="Activity 15E Boolean expression to efficient circuit workflow">
    {steps.map((step,index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={step}><b>{step}</b>{index<steps.length-1?<i>→</i>:null}</section>)}
    <footer className={state(reveal,3)}>ACTIVITY 15E · carry one source expression through every representation and verify equivalence.</footer>
  </div>;
}

export function Chapter15HardwareVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h15-1511-risc-cisc': return <RiscCisc reveal={reveal}/>;
    case 'h15-1511-comparison-pipeline': return <PipelineStages reveal={reveal}/>;
    case 'h15-1511-pipeline-interrupt': return <PipelineOverlap reveal={reveal}/>;
    case 'h15-1512-sisd-simd': return <SisdSimd reveal={reveal}/>;
    case 'h15-1512-misd-mimd': return <MisdMimd reveal={reveal}/>;
    case 'h15-1512-cluster-massive': return <ClusterMassive reveal={reveal}/>;
    case 'h15-151-activity': return <PipelineActivity reveal={reveal}/>;
    case 'h15-1521-boolean-intro': return <BooleanIntro reveal={reveal}/>;
    case 'h15-1521-laws': return <DeMorgan reveal={reveal}/>;
    case 'h15-1521-half-adder': return <HalfAdder reveal={reveal}/>;
    case 'h15-1522-full-adder-build': return <FullAdder reveal={reveal}/>;
    case 'h15-1522-full-adder-truth': return <FullAdderTruth reveal={reveal}/>;
    case 'h15-1523-sr': return <SrFlipFlop reveal={reveal}/>;
    case 'h15-1523-jk-intro': return <JkIntro reveal={reveal}/>;
    case 'h15-1523-jk-uses': return <Jk reveal={reveal}/>;
    case 'h15-1524-circuit-expression': return <Sop reveal={reveal}/>;
    case 'h15-1525-kmap-intro': return <KmapIntro reveal={reveal}/>;
    case 'h15-1525-kmap-3var': return <KmapThree reveal={reveal}/>;
    case 'h15-1525-kmap-4var': return <KmapFour reveal={reveal}/>;
    case 'h15-1525-kmap-wrap': return <KmapWrap reveal={reveal}/>;
    case 'h15-1525-kmap-rules': return <Kmap reveal={reveal}/>;
    case 'h15-activity-15e': return <Activity15E reveal={reveal}/>;
    default: return null;
  }
}
