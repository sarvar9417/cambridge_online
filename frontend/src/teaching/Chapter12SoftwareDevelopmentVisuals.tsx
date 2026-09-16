import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter12-software-development-visuals.css';

export const CHAPTER_12_SOFTWARE_DEVELOPMENT_VISUAL_IDS = [
  'h12-121-purpose-stages',
  'h12-121-waterfall',
  'h12-121-iterative-rad-intro',
  'h12-121-rad',
  'h12-1221-structure-chart',
  'h12-1221-repetition-sphere',
  'h12-1221-whole-sphere',
  'h12-1222-fsm-table',
  'h12-1232-syntax-logic',
  'h12-1233-dry-run',
  'h12-1233-walkthrough-testdata',
  'h12-1233-testing-levels-maintenance',
] as const;

export function hasChapter12SoftwareDevelopmentVisual(beat:LessonPresentationBeat){
  return CHAPTER_12_SOFTWARE_DEVELOPMENT_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function Lifecycle({reveal}:{reveal:number}){
  const stages=['ANALYSIS','DESIGN','CODING','TESTING','MAINTENANCE'];
  return <div className="h12sd h12sd-life" aria-label="Five stage program development lifecycle">
    <div className="h12sd-life-row">{stages.map((stage,index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={stage}><b>{stage}</b></section>)}</div>
    <footer className={state(reveal,3)}>Requirements → documented design → implementation → evidence from tests → correction / improvement / adaptation.</footer>
  </div>;
}

function Waterfall({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-waterfall" aria-label="Waterfall sequential development model">
    <section className={state(reveal,1)}>ANALYSIS</section><i>↓</i><section className={state(reveal,1)}>DESIGN</section><i>↓</i><section className={state(reveal,2)}>CODING</section><i>↓</i><section className={state(reveal,2)}>TESTING</section><i>↓</i><section className={state(reveal,3)}>MAINTENANCE</section>
    <aside className={state(reveal,3)}><b>BEST FIT</b><span>stable known requirements · clear stage sign-off</span><small>late change is difficult; working software appears late</small></aside>
  </div>;
}

function Iterative({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-iterative" aria-label="Iterative software development cycles">
    <div className={`h12sd-cycle ${state(reveal,1)}`}><b>ITERATION 1</b><span>small working subset</span></div>
    <i>→</i><div className={`h12sd-cycle ${state(reveal,2)}`}><b>ITERATION 2</b><span>expand + improve</span></div>
    <i>→</i><div className={`h12sd-cycle ${state(reveal,3)}`}><b>ITERATION 3</b><span>further functionality</span></div>
    <footer className={state(reveal,3)}>Working software and customer feedback appear earlier, but overall planning is still required.</footer>
  </div>;
}

function Rad({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-rad" aria-label="Rapid application development parallel teams and prototypes">
    <div className={`h12sd-rad-start ${state(reveal,1)}`}><b>REQUIREMENTS</b></div>
    <div className="h12sd-rad-lines"><section className={state(reveal,2)}><b>TEAM A</b><span>part A + prototype</span></section><section className={state(reveal,2)}><b>TEAM B</b><span>part B + prototype</span></section><section className={state(reveal,2)}><b>TEAM C</b><span>part C + prototype</span></section></div>
    <div className={`h12sd-rad-feedback ${state(reveal,3)}`}><b>CUSTOMER FEEDBACK</b><span>rapid revision while parallel work continues</span></div>
  </div>;
}

function StructureChart({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-structure" aria-label="Temperature conversion structure chart with parameters">
    <div className={`h12sd-structure-root ${state(reveal,1)}`}><b>CONVERT TEMPERATURE</b></div>
    <div className="h12sd-structure-row"><section className={state(reveal,2)}><b>INPUT TEMP</b><small>temperature ↑</small></section><section className={state(reveal,2)}><b>CONVERT</b><small>temperature ↓ result ↑</small></section><section className={state(reveal,2)}><b>OUTPUT TEMP</b><small>result ↓</small></section></div>
    <footer className={state(reveal,3)}>Boxes = modules · hierarchy = decomposition · labelled arrows = parameter/data flow.</footer>
  </div>;
}

function RepetitionSphere({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-sphere" aria-label="Sphere structure chart with selection and repetition">
    <div className={`h12sd-sphere-root ${state(reveal,1)}`}><b>SPHERE CALCULATOR</b><span>repeat until radius = 0</span></div>
    <div className="h12sd-sphere-row"><section className={state(reveal,2)}><b>INPUT RADIUS</b></section><section className={state(reveal,2)}><b>CHOOSE</b><span>V or S</span></section><section className={state(reveal,3)}><b>CALCULATE</b><span>volume / surface area</span></section><section className={state(reveal,3)}><b>OUTPUT</b></section></div>
    <footer className={state(reveal,3)}>Selection chooses a module; repetition returns to input until the sentinel is entered.</footer>
  </div>;
}

function WholeSphere({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-control" aria-label="Whole sphere pseudocode control flow">
    <section className={state(reveal,1)}><b>CALL inputRadius</b></section><i>→</i>
    <div className={`h12sd-condition ${state(reveal,2)}`}><b>radius ≠ 0?</b></div><i>→</i>
    <section className={state(reveal,2)}><b>IF choice = V</b><span>calculateVolume(radius)</span><b>ELSE</b><span>calculateSurfaceArea(radius)</span></section><i>→</i>
    <section className={state(reveal,3)}><b>CALL outputAnswer</b><span>then input radius again</span></section>
    <footer className={state(reveal,3)}>Structure chart modules become procedures/functions inside one top-level loop.</footer>
  </div>;
}

function Fsm({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-fsm" aria-label="Door code 259 finite state machine">
    <div className={`h12sd-state start ${state(reveal,1)}`}>S0<br/><small>initial</small></div><span className={state(reveal,1)}>2 →</span>
    <div className={`h12sd-state ${state(reveal,2)}`}>S1</div><span className={state(reveal,2)}>5 →</span>
    <div className={`h12sd-state ${state(reveal,2)}`}>S2</div><span className={state(reveal,3)}>9 →</span>
    <div className={`h12sd-state stop ${state(reveal,3)}`}>OPEN</div>
    <footer className={state(reveal,3)}>Incorrect digit → return to initial state · node = state · arrow = transition · label = event.</footer>
  </div>;
}

function ErrorTypes({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-errors" aria-label="Syntax logic and run-time error comparison">
    <section className={state(reveal,1)}><b>SYNTAX ERROR</b><span>language grammar is broken</span><small>compiler / interpreter / IDE can expose it</small></section>
    <section className={state(reveal,2)}><b>LOGIC ERROR</b><span>program runs but behaviour/result is wrong</span><small>trace table · dry run · single stepping</small></section>
    <section className={state(reveal,3)}><b>RUN-TIME ERROR</b><span>fault appears during execution</span><small>example: division by zero</small></section>
  </div>;
}

function DryRun({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-dry" aria-label="Dry run and trace table">
    <section className={state(reveal,1)}><b>PSEUDOCODE</b><code>read values</code><code>apply operator</code><code>store answer</code></section>
    <i>→</i>
    <div className={`h12sd-trace ${state(reveal,2)}`}><b>TRACE TABLE</b><div><span>x</span><span>operator</span><span>answer</span></div><div><span>8</span><span>-</span><span>?</span></div><div><span>4</span><span>/ 0</span><span>undefined</span></div></div>
    <i>→</i><section className={state(reveal,3)}><b>COMPARE EXPECTED</b><span>wrong subtraction / zero-division path becomes visible</span></section>
  </div>;
}

function TestData({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-testdata" aria-label="Normal abnormal extreme and boundary test data for range 12 to 32">
    <div className={`h12sd-range ${state(reveal,1)}`}><span>11</span><b>12</b><span>… accepted range …</span><b>32</b><span>33</span></div>
    <div className="h12sd-test-grid"><section className={state(reveal,2)}><b>NORMAL</b><span>clearly inside</span></section><section className={state(reveal,2)}><b>ABNORMAL</b><span>unsuitable / invalid</span></section><section className={state(reveal,3)}><b>EXTREME</b><span>12 or 32</span></section><section className={state(reveal,3)}><b>BOUNDARY</b><span>11, 12, 32, 33</span></section></div>
  </div>;
}

function TestingMaintenance({reveal}:{reveal:number}){
  return <div className="h12sd h12sd-testing" aria-label="Testing levels and maintenance categories">
    <div className="h12sd-test-levels"><section className={state(reveal,1)}><b>WHITE-BOX</b><span>internal paths</span></section><section className={state(reveal,1)}><b>BLACK-BOX</b><span>inputs / outputs</span></section><section className={state(reveal,2)}><b>INTEGRATION</b><span>modules + stubs</span></section><section className={state(reveal,2)}><b>ALPHA</b><span>in-house</span></section><section className={state(reveal,3)}><b>BETA</b><span>small user group</span></section><section className={state(reveal,3)}><b>ACCEPTANCE</b><span>customer / target environment</span></section></div>
    <footer className={state(reveal,3)}><span><b>CORRECTIVE</b> fix errors</span><span><b>PERFECTIVE</b> improve behaviour/performance</span><span><b>ADAPTIVE</b> change for new tasks</span></footer>
  </div>;
}

export function Chapter12SoftwareDevelopmentVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h12-121-purpose-stages': return <Lifecycle reveal={reveal}/>;
    case 'h12-121-waterfall': return <Waterfall reveal={reveal}/>;
    case 'h12-121-iterative-rad-intro': return <Iterative reveal={reveal}/>;
    case 'h12-121-rad': return <Rad reveal={reveal}/>;
    case 'h12-1221-structure-chart': return <StructureChart reveal={reveal}/>;
    case 'h12-1221-repetition-sphere': return <RepetitionSphere reveal={reveal}/>;
    case 'h12-1221-whole-sphere': return <WholeSphere reveal={reveal}/>;
    case 'h12-1222-fsm-table': return <Fsm reveal={reveal}/>;
    case 'h12-1232-syntax-logic': return <ErrorTypes reveal={reveal}/>;
    case 'h12-1233-dry-run': return <DryRun reveal={reveal}/>;
    case 'h12-1233-walkthrough-testdata': return <TestData reveal={reveal}/>;
    case 'h12-1233-testing-levels-maintenance': return <TestingMaintenance reveal={reveal}/>;
    default: return null;
  }
}
