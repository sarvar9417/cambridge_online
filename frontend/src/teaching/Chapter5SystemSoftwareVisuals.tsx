import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter5-system-software-visuals.css';

export const CHAPTER_5_SYSTEM_SOFTWARE_VISUAL_IDS = [
  'h5-512-process-hardware-file',
  'h5-512-printer-management',
  'h5-513-defragmentation',
  'h5-514-static-dynamic',
  'h5-521-compiler-interpreter',
  'h5-523-bytecode',
  'h5-524-ide-overview',
  'h5-524-debugger',
] as const;

export function hasChapter5SystemSoftwareVisual(beat: LessonPresentationBeat) {
  return CHAPTER_5_SYSTEM_SOFTWARE_VISUAL_IDS.includes(beat.slideId as never);
}

const revealClass=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function ResourceManagement({reveal}:{reveal:number}){
  return <div className="h5sys h5sys-resource" aria-label="Operating system process hardware and file management visual">
    <div className={`h5sys-core ${revealClass(reveal,1)}`}><strong>OPERATING SYSTEM</strong><span>coordinates resources</span></div>
    <section className={revealClass(reveal,1)}><b>PROCESS</b><span>scheduling</span><span>queues</span><span>resource sharing</span></section>
    <section className={revealClass(reveal,2)}><b>HARDWARE</b><span>device drivers</span><span>priorities</span><span>release resources</span></section>
    <section className={revealClass(reveal,3)}><b>FILES</b><span>create · open · close</span><span>directories</span><span>permissions</span></section>
  </div>;
}

function PrinterManagement({reveal}:{reveal:number}){
  const stages=[
    ['APPLICATION','print job'],
    ['DRIVER','device commands'],
    ['BUFFER','hold output data'],
    ['QUEUE','wait / priority'],
    ['PRINTER','process job'],
  ] as const;
  return <div className="h5sys h5sys-printer" aria-label="Printer driver buffer queue and interrupt sequence">
    <div className="h5sys-flow">
      {stages.map(([title,note],index)=><div className={`h5sys-node ${revealClass(reveal,index<2?1:index<4?2:3)}`} key={title}>
        <b>{title}</b><span>{note}</span>{index<stages.length-1?<i aria-hidden="true">→</i>:null}
      </div>)}
    </div>
    <aside className={revealClass(reveal,3)}><b>INTERRUPT ↩</b><span>paper / ink / hardware error returns control information to the system</span></aside>
  </div>;
}

const fragmented=['A','·','B','A','C','·','B','A','C','B','·','C'];
const contiguous=['A','A','A','B','B','B','C','C','C','·','·','·'];
function Defragmentation({reveal}:{reveal:number}){
  const row=(label:string,cells:string[],step:number)=><section className={revealClass(reveal,step)}>
    <b>{label}</b><div className="h5sys-disk">{cells.map((cell,index)=><span data-file={cell} key={`${cell}-${index}`}>{cell==='·'?'FREE':cell}</span>)}</div>
  </section>;
  return <div className="h5sys h5sys-defrag" aria-label="Fragmented and defragmented hard disk block visual">
    {row('BEFORE · fragmented',fragmented,1)}
    <div className={`h5sys-defrag-arrow ${revealClass(reveal,2)}`}>reorganise blocks ↓</div>
    {row('AFTER · contiguous where possible',contiguous,2)}
    <aside className={revealClass(reveal,3)}>HDD benefit: fewer read/write-head movements · SSD has no moving read/write head.</aside>
  </div>;
}

function StaticDynamic({reveal}:{reveal:number}){
  return <div className="h5sys h5sys-linking" aria-label="Static library and dynamic link library comparison visual">
    <section className={revealClass(reveal,1)}><header><b>STATIC LIBRARY</b><span>compile time</span></header><div className="h5sys-link-flow"><span>source</span><i>+</i><span>library routine</span><i>→</i><strong>EXECUTABLE<br/><small>routine embedded</small></strong></div></section>
    <section className={revealClass(reveal,2)}><header><b>DYNAMIC LINK LIBRARY</b><span>run time</span></header><div className="h5sys-link-flow"><strong>EXECUTABLE</strong><i>⇄</i><span>DLL<br/><small>separate shared file</small></span></div><footer>smaller main executable · one DLL can serve several applications</footer></section>
    <aside className={revealClass(reveal,3)}>DLL must be available and trustworthy at run time; a changed or corrupted DLL can cause failures.</aside>
  </div>;
}

function Translators({reveal}:{reveal:number}){
  const routes=[
    ['ASSEMBLY','ASSEMBLER','MACHINE CODE','stored / loaded'],
    ['HIGH-LEVEL','COMPILER','OBJECT CODE','stored / run again'],
    ['HIGH-LEVEL','INTERPRETER','EXECUTION','source handled again'],
  ] as const;
  return <div className="h5sys h5sys-translators" aria-label="Assembler compiler interpreter comparison visual">
    {routes.map((route,index)=><section className={revealClass(reveal,index+1)} key={route[1]}>
      <span>{route[0]}</span><i>→</i><b>{route[1]}</b><i>→</i><strong>{route[2]}</strong><small>{route[3]}</small>
    </section>)}
  </div>;
}

function Bytecode({reveal}:{reveal:number}){
  return <div className="h5sys h5sys-bytecode" aria-label="Partial compilation bytecode and virtual machine pipeline">
    <section className={revealClass(reveal,1)}><b>HIGH-LEVEL SOURCE</b></section><i>→</i>
    <section className={revealClass(reveal,1)}><b>COMPILER</b></section><i>→</i>
    <section className={`h5sys-bytecode-centre ${revealClass(reveal,2)}`}><b>BYTECODE</b><span>machine-independent intermediate code</span></section><i>→</i>
    <section className={revealClass(reveal,3)}><b>VIRTUAL MACHINE / RUN TIME</b><span>interpret or further compile</span></section><i>→</i>
    <section className={revealClass(reveal,3)}><b>EXECUTION</b></section>
    <footer className={revealClass(reveal,3)}>Portability comes from moving the intermediate code to a system with a suitable virtual machine or run time.</footer>
  </div>;
}

function IdeOverview({reveal}:{reveal:number}){
  const tools=[
    ['EDITOR','write · format · syntax help'],
    ['TRANSLATOR','compiler / interpreter'],
    ['RUN TIME + DEBUGGER','execute · inspect state'],
    ['AUTO-DOCUMENTER','quick code / library help'],
  ] as const;
  return <div className="h5sys h5sys-ide" aria-label="Integrated development environment facilities visual">
    <div className={`h5sys-ide-core ${revealClass(reveal,1)}`}><b>IDE</b><span>one integrated development environment</span></div>
    <div className="h5sys-ide-tools">{tools.map(([title,note],index)=><section className={revealClass(reveal,index<2?1:index<3?2:3)} key={title}><b>{title}</b><span>{note}</span></section>)}</div>
  </div>;
}

function Debugger({reveal}:{reveal:number}){
  return <div className="h5sys h5sys-debugger" aria-label="Debugger breakpoint single stepping and report window visual">
    <section className={`h5sys-code-panel ${revealClass(reveal,1)}`}>
      <header>PROGRAM</header>
      <code><span>01 total ← 0</span><span>02 FOR item ← 1 TO 4</span><span className="breakpoint">● 03 total ← total + item</span><span>04 NEXT item</span></code>
      <footer><b>SINGLE STEP</b><span>execute one statement at a time</span></footer>
    </section>
    <i className={revealClass(reveal,2)}>⇄</i>
    <section className={`h5sys-report ${revealClass(reveal,2)}`}>
      <header>REPORT WINDOW</header>
      <div><span>item</span><b>2</b></div><div><span>total</span><b>3</b></div><div><span>total × 2</span><b>6</b></div>
      <footer>compare observed state with expected state</footer>
    </section>
    <aside className={revealClass(reveal,3)}><b>BREAKPOINT</b><span>pause execution at a chosen point to inspect variables and expressions.</span></aside>
  </div>;
}

export function Chapter5SystemSoftwareVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h5-512-process-hardware-file': return <ResourceManagement reveal={reveal}/>;
    case 'h5-512-printer-management': return <PrinterManagement reveal={reveal}/>;
    case 'h5-513-defragmentation': return <Defragmentation reveal={reveal}/>;
    case 'h5-514-static-dynamic': return <StaticDynamic reveal={reveal}/>;
    case 'h5-521-compiler-interpreter': return <Translators reveal={reveal}/>;
    case 'h5-523-bytecode': return <Bytecode reveal={reveal}/>;
    case 'h5-524-ide-overview': return <IdeOverview reveal={reveal}/>;
    case 'h5-524-debugger': return <Debugger reveal={reveal}/>;
    default: return null;
  }
}
