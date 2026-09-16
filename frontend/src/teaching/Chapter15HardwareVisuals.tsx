import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter15-hardware-visuals.css';

export const CHAPTER_15_HARDWARE_VISUAL_IDS = [
  'h15-1511-risc-cisc',
  'h15-1511-comparison-pipeline',
  'h15-1511-pipeline-interrupt',
  'h15-1512-sisd-simd',
  'h15-1512-misd-mimd',
  'h15-1512-cluster-massive',
  'h15-1521-laws',
  'h15-1521-half-adder',
  'h15-1522-full-adder-build',
  'h15-1523-sr',
  'h15-1523-jk-uses',
  'h15-1524-circuit-expression',
  'h15-1525-kmap-rules',
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

export function Chapter15HardwareVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h15-1511-risc-cisc': return <RiscCisc reveal={reveal}/>;
    case 'h15-1511-comparison-pipeline': return <PipelineStages reveal={reveal}/>;
    case 'h15-1511-pipeline-interrupt': return <PipelineOverlap reveal={reveal}/>;
    case 'h15-1512-sisd-simd': return <SisdSimd reveal={reveal}/>;
    case 'h15-1512-misd-mimd': return <MisdMimd reveal={reveal}/>;
    case 'h15-1512-cluster-massive': return <ClusterMassive reveal={reveal}/>;
    case 'h15-1521-laws': return <DeMorgan reveal={reveal}/>;
    case 'h15-1521-half-adder': return <HalfAdder reveal={reveal}/>;
    case 'h15-1522-full-adder-build': return <FullAdder reveal={reveal}/>;
    case 'h15-1523-sr': return <SrFlipFlop reveal={reveal}/>;
    case 'h15-1523-jk-uses': return <Jk reveal={reveal}/>;
    case 'h15-1524-circuit-expression': return <Sop reveal={reveal}/>;
    case 'h15-1525-kmap-rules': return <Kmap reveal={reveal}/>;
    default: return null;
  }
}
