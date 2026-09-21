import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter16-system-software-visuals.css';

export const CHAPTER_16_SYSTEM_SOFTWARE_VISUAL_IDS = [
  'h16-1611-resource-management',
  'h16-1611-dma-kernel',
  'h16-1612-multitasking',
  'h16-1612-low-level-scheduling',
  'h16-1613-process-states',
  'h16-1613-context-fcfs',
  'h16-1613-sjf-srtf',
  'h16-1613-round-robin',
  'h16-1613-interrupt-kernel',
  'h16-1614-paging',
  'h16-1614-segmentation',
  'h16-1614-paging-vs-segmentation',
  'h16-1615-virtual-memory',
  'h16-1615-thrashing-translation',
  'h16-1616-page-replacement',
  'h16-1621-vm-features',
  'h16-1622-vm-benefits-limitations',
  'h16-1631-interpreter-compiler',
  'h16-1632-lexical-analysis',
  'h16-1632-syntax-codegen',
  'h16-1632-optimisation',
  'h16-1633-syntax-diagrams',
  'h16-1633-bnf',
  'h16-1634-rpn-stack',
] as const;

export function hasChapter16SystemSoftwareVisual(beat:LessonPresentationBeat){
  return CHAPTER_16_SYSTEM_SOFTWARE_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function ResourceManagement({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-resource" aria-label="Operating system resource management">
    <div className={`h16ss-core ${state(reveal,1)}`}><b>OPERATING SYSTEM</b><span>kernel coordinates shared resources</span></div>
    <div className="h16ss-resource-grid">
      <section className={state(reveal,2)}><b>CPU</b><span>scheduling</span></section>
      <section className={state(reveal,2)}><b>MEMORY</b><span>allocation + translation</span></section>
      <section className={state(reveal,3)}><b>I/O</b><span>drivers + controllers</span></section>
      <section className={state(reveal,3)}><b>PROCESSES</b><span>state + priority</span></section>
    </div>
    <footer className={state(reveal,3)}>BOOTSTRAP loads the operating system into RAM; the kernel then manages hardware on behalf of applications.</footer>
  </div>;
}

function DmaKernel({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-flow" aria-label="DMA transfer and kernel services">
    <section className={state(reveal,1)}><b>I/O DEVICE</b><span>slow transfer request</span></section><i>→</i>
    <section className={state(reveal,2)}><b>DMA CONTROLLER</b><span>moves data independently</span></section><i>→</i>
    <section className={state(reveal,2)}><b>RAM</b><span>data arrives</span></section><i>→</i>
    <section className={state(reveal,3)}><b>INTERRUPT CPU</b><span>transfer complete</span></section>
    <footer className={state(reveal,3)}>KERNEL: process management · device management · memory management · interrupts · I/O communication.</footer>
  </div>;
}

function ProcessStates({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-states" aria-label="Ready running and blocked process states">
    <div className={`h16ss-state ready ${state(reveal,1)}`}><b>READY</b><span>waiting for CPU</span></div>
    <div className="h16ss-state-arrows"><span className={state(reveal,2)}>scheduler →</span><span className={state(reveal,2)}>← time slice ends</span></div>
    <div className={`h16ss-state running ${state(reveal,2)}`}><b>RUNNING</b><span>using CPU</span></div>
    <div className="h16ss-state-arrows"><span className={state(reveal,3)}>wait for I/O →</span><span className={state(reveal,3)}>← event complete</span></div>
    <div className={`h16ss-state blocked ${state(reveal,3)}`}><b>BLOCKED</b><span>waiting for event</span></div>
  </div>;
}

function Scheduling({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-scheduling" aria-label="FCFS SJF SRTF scheduling comparison">
    <section className={state(reveal,1)}><b>FCFS</b><span>FIFO · non-preemptive</span><small>source average wait: 21.5 ms</small></section>
    <section className={state(reveal,2)}><b>SJF</b><span>shortest burst first</span><small>6.5 ms</small></section>
    <section className={state(reveal,2)}><b>SRTF</b><span>shortest remaining time</span><small>preemptive · 6.25 ms</small></section>
    <footer className={state(reveal,3)}>Scheduler choice changes waiting time, responsiveness and preemption behaviour.</footer>
  </div>;
}

function RoundRobin({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-round" aria-label="Round robin scheduling with fixed time quantum">
    <div className={`h16ss-quantum ${state(reveal,1)}`}><b>TIME QUANTUM</b><span>5 ms</span></div>
    <div className="h16ss-round-row">
      {['P1','P2','P3','P4','P1','P3'].map((p,i)=><section key={`${p}-${i}`} className={state(reveal,i<2?1:i<4?2:3)}><b>{p}</b><span>{i===1||i===3?'finishes':'runs / returns'}</span></section>)}
    </div>
    <footer className={state(reveal,3)}>Unfinished process → save context in PCB → return to ready queue → resume on a later turn.</footer>
  </div>;
}

function Interrupts({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-interrupt" aria-label="Kernel interrupt handling and priority">
    <section className={state(reveal,1)}><b>INTERRUPT</b><span>device · exception · software trap</span></section><i>→</i>
    <section className={state(reveal,2)}><b>SAVE STATE</b><span>kernel stack / PCB</span></section><i>→</i>
    <section className={state(reveal,2)}><b>IDT + IPL</b><span>dispatch + priority</span></section><i>→</i>
    <section className={state(reveal,3)}><b>SERVICE ROUTINE</b><span>handle event</span></section><i>→</i>
    <section className={state(reveal,3)}><b>RESTORE</b><span>continue process</span></section>
  </div>;
}

function Paging({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-memory" aria-label="Paging maps logical pages to physical frames">
    <section className={state(reveal,1)}><b>LOGICAL PAGES</b><span>P0 · P1 · P2 · P3</span></section><i>→</i>
    <div className={`h16ss-table ${state(reveal,2)}`}><b>PAGE TABLE</b><span>P0 → F5</span><span>P1 → F1</span><span>P2 → disk</span><span>P3 → F7</span></div><i>→</i>
    <section className={state(reveal,3)}><b>PHYSICAL FRAMES</b><span>fixed-size blocks in RAM</span></section>
    <footer className={state(reveal,3)}>TLB caches recent translations · present/dirty/access flags support memory management.</footer>
  </div>;
}

function Segmentation({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-memory" aria-label="Segmentation maps logical variable size segments">
    <section className={state(reveal,1)}><b>LOGICAL PROGRAM</b><span>code · data · stack</span></section><i>→</i>
    <div className={`h16ss-table ${state(reveal,2)}`}><b>SEGMENT MAP TABLE</b><span>segment + base + size</span></div><i>→</i>
    <section className={state(reveal,3)}><b>PHYSICAL MEMORY</b><span>variable-size regions</span></section>
    <footer className={state(reveal,3)}>PAGING = fixed blocks + possible internal fragmentation · SEGMENTATION = logical variable blocks + possible external fragmentation.</footer>
  </div>;
}

function VirtualMemory({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-vm-memory" aria-label="Virtual memory and page fault path">
    <div className={`h16ss-address ${state(reveal,1)}`}><b>VIRTUAL ADDRESS</b></div><i>→</i>
    <section className={state(reveal,2)}><b>PAGE PRESENT?</b><span>yes → translate to physical frame</span><span>no → PAGE FAULT</span></section><i>→</i>
    <section className={state(reveal,3)}><b>SWAP SPACE</b><span>load required page from secondary storage</span></section><i>→</i>
    <div className={`h16ss-address ${state(reveal,3)}`}><b>RAM</b></div>
    <footer className={state(reveal,3)}>Too much page movement can cause DISK THRASHING.</footer>
  </div>;
}

function Replacement({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-replace" aria-label="Page replacement algorithm comparison">
    <section className={state(reveal,1)}><b>FIFO</b><span>replace oldest loaded page</span></section>
    <section className={state(reveal,2)}><b>OPTIMAL</b><span>replace page needed furthest in future</span></section>
    <section className={state(reveal,2)}><b>LRU</b><span>replace least recently used</span></section>
    <section className={state(reveal,3)}><b>CLOCK / SECOND-CHANCE</b><span>use reference bit and circular pointer</span></section>
    <footer className={state(reveal,3)}>BELADY anomaly: increasing frames can sometimes increase page faults under FIFO.</footer>
  </div>;
}

function VmFeatures({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-machine" aria-label="Virtual machine host guest and hypervisor layers">
    <div className={`h16ss-layer app ${state(reveal,3)}`}>GUEST APPLICATIONS</div>
    <div className={`h16ss-layer guest ${state(reveal,2)}`}>GUEST OS</div>
    <div className={`h16ss-layer hyper ${state(reveal,2)}`}>HYPERVISOR / VMM</div>
    <div className={`h16ss-layer host ${state(reveal,1)}`}>HOST OS / HOST PLATFORM</div>
    <div className={`h16ss-layer hardware ${state(reveal,1)}`}>PHYSICAL HARDWARE</div>
    <footer className={state(reveal,3)}>One physical computer can provide isolated virtual environments with different guest operating systems.</footer>
  </div>;
}

function Lexical({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-compiler" aria-label="Lexical analysis tokenisation and symbol table">
    <section className={state(reveal,1)}><b>SOURCE CODE</b><code>Total = Price + Tax</code></section><i>→</i>
    <section className={state(reveal,2)}><b>LEXICAL ANALYSIS</b><span>remove irrelevant whitespace/comments</span><span>TOKENISATION</span></section><i>→</i>
    <section className={state(reveal,3)}><b>TOKENS + SYMBOL TABLE</b><code>ID = ID + ID</code><span>identifiers recorded with attributes</span></section>
  </div>;
}

function SyntaxCodegen({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-compiler" aria-label="Compiler syntax analysis code generation and optimisation stages">
    <section className={state(reveal,1)}><b>TOKENS</b></section><i>→</i>
    <section className={state(reveal,1)}><b>SYNTAX ANALYSIS</b><span>grammar check + parse structure</span></section><i>→</i>
    <section className={state(reveal,2)}><b>CODE GENERATION</b><span>target / intermediate code</span></section><i>→</i>
    <section className={state(reveal,3)}><b>OPTIMISATION</b><span>improve efficiency without changing meaning</span></section>
  </div>;
}

function Bnf({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-grammar" aria-label="Syntax diagram and Backus Naur Form representation">
    <section className={state(reveal,1)}><b>SYNTAX DIAGRAM</b><span>visual paths show valid sequences</span></section><i>⇄</i>
    <section className={state(reveal,2)}><b>BACKUS–NAUR FORM</b><code>&lt;digit&gt; ::= 0 | 1 | … | 9</code><code>&lt;number&gt; ::= &lt;digit&gt; | &lt;digit&gt;&lt;number&gt;</code></section>
    <footer className={state(reveal,3)}>Both representations define legal language constructs precisely rather than relying on informal description.</footer>
  </div>;
}

function Rpn({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-rpn" aria-label="Reverse Polish notation evaluated with a stack">
    <section className={state(reveal,1)}><b>INFIX</b><code>(3 + 4) × 5</code></section><i>→</i>
    <section className={state(reveal,2)}><b>RPN</b><code>3 4 + 5 ×</code></section><i>→</i>
    <div className={`h16ss-stack ${state(reveal,3)}`}><b>STACK</b><span>push 3</span><span>push 4</span><span>pop, add → 7</span><span>push 5</span><span>pop, multiply → 35</span></div>
  </div>;
}


function Multitasking({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-multitask" aria-label="Preemptive and non-preemptive multitasking comparison">
    <div className={'h16ss-multitask-core '+state(reveal,1)}><b>MULTITASKING</b><span>kernel shares hardware resources between processes</span></div>
    <section className={state(reveal,2)}><b>PREEMPTIVE</b><span>running process can be interrupted after limited CPU allocation</span><small>flexible response · context switching needed</small></section>
    <section className={state(reveal,2)}><b>NON-PREEMPTIVE</b><span>process keeps resources until burst completes or waits for an event</span><small>simpler · starvation/response trade-offs</small></section>
    <footer className={state(reveal,3)}>PROCESS = a program that has started execution · scheduling creates the appearance of simultaneous work.</footer>
  </div>;
}

function LowLevelScheduling({reveal}:{reveal:number}){
  const priorities=['workload category','CPU-bound / I/O-bound','resource needs','deadline','CPU time','wait time','memory'];
  return <div className="h16ss h16ss-low-schedule" aria-label="Low level scheduling priorities and process control block">
    <section className={state(reveal,1)}><b>SCHEDULER GOALS</b><span>maximise throughput</span><span>acceptable response time</span><span>stable competition for resources</span></section>
    <div className={'h16ss-priority-grid '+state(reveal,2)}>{priorities.map(x=><span key={x}>{x}</span>)}</div>
    <section className={state(reveal,3)}><b>PROCESS CONTROL BLOCK</b><span>state · privileges · registers · priority · schedule data · required CPU time · process ID</span></section>
    <footer className={state(reveal,3)}>source states: RUNNING · READY · BLOCKED</footer>
  </div>;
}

function ContextFcfs({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-context-fcfs" aria-label="Context switching and FCFS scheduling baseline">
    <section className={state(reveal,1)}><b>TIME QUANTUM ENDS</b><span>save register contents to PCB</span></section><i>→</i>
    <section className={state(reveal,2)}><b>CONTEXT SWITCH</b><span>restore saved state when process returns to CPU</span></section>
    <div className={'h16ss-fcfs-queue '+state(reveal,3)}><b>FCFS · FIFO · NON-PREEMPTIVE</b><span>P1 23 ms</span><span>P2 4 ms</span><span>P3 9 ms</span><span>P4 3 ms</span><strong>source average wait = 21.5 ms</strong></div>
  </div>;
}

function PagingVsSegmentation({reveal}:{reveal:number}){
  const rows=[
    ['BLOCK SIZE','fixed pages','variable logical segments'],
    ['FRAGMENTATION','internal possible','external possible'],
    ['VISIBILITY','largely invisible to programmer','logical structure visible'],
    ['MAPPING','PAGE TABLE','SEGMENT MAP TABLE'],
    ['TYPICAL SIZE','pages usually smaller','segments usually larger'],
  ] as const;
  return <div className="h16ss h16ss-page-seg" aria-label="Paging versus segmentation source comparison">
    <header className={state(reveal,1)}><span>FEATURE</span><b>PAGING</b><b>SEGMENTATION</b></header>
    {rows.map((r,index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={r[0]}><span>{r[0]}</span><span>{r[1]}</span><span>{r[2]}</span></section>)}
  </div>;
}

function ThrashingTranslation({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-thrash" aria-label="Disk thrashing and virtual to physical address translation">
    <section className={state(reveal,1)}><b>VIRTUAL ADDRESS</b><span>translate using memory map</span></section><i>→</i>
    <section className={state(reveal,2)}><b>PAGE PRESENT?</b><span>yes → physical address</span><span>no → load from disk + update map</span></section><i>→</i>
    <section className={state(reveal,2)}><b>PHYSICAL ADDRESS</b><span>RAM location used by CPU</span></section>
    <footer className={state(reveal,3)}><b>DISK THRASHING</b><span>page movement dominates useful processing near the thrash point · source remedies: more RAM, fewer simultaneous programs, smaller swap file</span></footer>
  </div>;
}

function VmBenefits({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-vm-benefits" aria-label="Virtual machine benefits and limitations">
    <section className={state(reveal,1)}><header>BENEFITS</header><span>guest failure need not crash host</span><span>run incompatible/legacy software</span><span>safe OS/application testing</span><span>preserve older environments on newer hardware</span></section>
    <section className={state(reveal,2)}><header>LIMITATIONS</header><span>guest slower than native/original system</span><span>large VM estates are costly</span><span>management and maintenance complexity</span></section>
    <footer className={state(reveal,3)}>isolation and compatibility are gained at the cost of performance and administration overhead.</footer>
  </div>;
}

function InterpreterCompiler({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-interpreter-compiler" aria-label="Interpreter and compiler translation flow comparison">
    <section className={state(reveal,1)}><header>COMPILER</header><span>SOURCE PROGRAM</span><i>→</i><b>COMPILER</b><i>→</i><span>OBJECT CODE / ERRORS</span><small>object program can execute later without recompilation</small></section>
    <section className={state(reveal,2)}><header>INTERPRETER</header><span>SOURCE STATEMENT</span><i>→</i><b>CHECK + EXECUTE</b><i>→</i><span>OUTPUT / ERROR</span><small>no complete object program; returns for next statement</small></section>
    <footer className={state(reveal,3)}>both approaches construct a SYMBOL TABLE.</footer>
  </div>;
}

function Optimisation({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-optimisation" aria-label="Compiler optimisation source example">
    <section className={state(reveal,1)}><b>BEFORE</b><code>w ← x + y</code><code>z ← x + y + 5</code><span>x + y calculated twice</span></section>
    <i>→</i>
    <section className={state(reveal,2)}><b>AFTER OPTIMISATION</b><code>w ← x + y</code><code>z ← w + 5</code><span>reuse existing result</span></section>
    <footer className={state(reveal,3)}>goal: reduce execution time / storage / memory / CPU use without changing required result · not every compiler optimises every pattern.</footer>
  </div>;
}

function SyntaxDiagrams({reveal}:{reveal:number}){
  return <div className="h16ss h16ss-syntax-diagrams" aria-label="Syntax diagram sequence alternatives and repetition">
    <section className={state(reveal,1)}><b>SEQUENCE</b><div className="h16ss-rail"><span>START</span><i>→</i><span>LETTER</span><i>→</i><span>DIGIT</span><i>→</i><span>END</span></div></section>
    <section className={state(reveal,2)}><b>ALTERNATIVE</b><span>branch chooses one valid path</span><b>REPETITION</b><span>loop permits repeated legal elements</span></section>
    <footer className={state(reveal,3)}>a string is valid only when one complete path exists from start to finish · Activities 16C–16D apply the rule to variables and assignment statements.</footer>
  </div>;
}

export function Chapter16SystemSoftwareVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h16-1611-resource-management': return <ResourceManagement reveal={reveal}/>;
    case 'h16-1611-dma-kernel': return <DmaKernel reveal={reveal}/>;
    case 'h16-1612-multitasking': return <Multitasking reveal={reveal}/>;
    case 'h16-1612-low-level-scheduling': return <LowLevelScheduling reveal={reveal}/>;
    case 'h16-1613-process-states': return <ProcessStates reveal={reveal}/>;
    case 'h16-1613-context-fcfs': return <ContextFcfs reveal={reveal}/>;
    case 'h16-1613-sjf-srtf': return <Scheduling reveal={reveal}/>;
    case 'h16-1613-round-robin': return <RoundRobin reveal={reveal}/>;
    case 'h16-1613-interrupt-kernel': return <Interrupts reveal={reveal}/>;
    case 'h16-1614-paging': return <Paging reveal={reveal}/>;
    case 'h16-1614-segmentation': return <Segmentation reveal={reveal}/>;
    case 'h16-1614-paging-vs-segmentation': return <PagingVsSegmentation reveal={reveal}/>;
    case 'h16-1615-virtual-memory': return <VirtualMemory reveal={reveal}/>;
    case 'h16-1615-thrashing-translation': return <ThrashingTranslation reveal={reveal}/>;
    case 'h16-1616-page-replacement': return <Replacement reveal={reveal}/>;
    case 'h16-1621-vm-features': return <VmFeatures reveal={reveal}/>;
    case 'h16-1622-vm-benefits-limitations': return <VmBenefits reveal={reveal}/>;
    case 'h16-1631-interpreter-compiler': return <InterpreterCompiler reveal={reveal}/>;
    case 'h16-1632-lexical-analysis': return <Lexical reveal={reveal}/>;
    case 'h16-1632-syntax-codegen': return <SyntaxCodegen reveal={reveal}/>;
    case 'h16-1632-optimisation': return <Optimisation reveal={reveal}/>;
    case 'h16-1633-syntax-diagrams': return <SyntaxDiagrams reveal={reveal}/>;
    case 'h16-1633-bnf': return <Bnf reveal={reveal}/>;
    case 'h16-1634-rpn-stack': return <Rpn reveal={reveal}/>;
    default: return null;
  }
}
