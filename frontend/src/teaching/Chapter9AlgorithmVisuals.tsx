import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter9-algorithm-visuals.css';

export const CHAPTER_9_ALGORITHM_VISUAL_IDS = [
  'h9-911-abstraction',
  'h9-912-decomposition',
  'h9-921-three-representations',
  'h9-921-average-flowchart',
  'h9-922-identifiers-io-assignment',
  'h9-922-selection',
  'h9-922-selection-languages',
  'h9-922-iteration',
  'h9-922-loop-languages-logic',
  'h9-922-validation-average',
  'h9-923-password-and-structured-english',
  'h9-923-marathon-identifiers',
  'h9-923-marathon-process',
  'h9-924-flowchart-symbols',
  'h9-924-nested-selection-refinement',
  'h9-925-repeat-grade-activity',
  'h9-925-detailed-refinement',
] as const;

export function hasChapter9AlgorithmVisual(beat:LessonPresentationBeat){
  return CHAPTER_9_ALGORITHM_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function Abstraction({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-abstraction" aria-label="Abstraction keeps essential route information and removes irrelevant detail">
    <section className={state(reveal,1)}><b>REAL WORLD</b><span>roads</span><span>terrain</span><span>buildings</span><span>vegetation</span><span>towns</span></section>
    <i>→</i>
    <div className={`h9alg-filter ${state(reveal,2)}`}><b>ABSTRACTION</b><span>purpose: plan a road journey</span></div>
    <i>→</i>
    <section className={state(reveal,3)}><b>ROAD MAP MODEL</b><span>roads</span><span>road numbers</span><span>towns</span><small>irrelevant detail omitted</small></section>
  </div>;
}

function Decomposition({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-decomp" aria-label="Program decomposition into modules and submodules">
    <div className={`h9alg-root ${state(reveal,1)}`}><b>PROGRAM</b></div>
    <div className="h9alg-level h9alg-level-1"><span className={state(reveal,2)}>MODULE A</span><span className={state(reveal,2)}>MODULE B</span><span className={state(reveal,2)}>MODULE C</span></div>
    <div className="h9alg-level h9alg-level-2"><span className={state(reveal,3)}>SUB-MODULE</span><span className={state(reveal,3)}>SUB-MODULE</span><span className={state(reveal,3)}>REUSABLE PROCEDURE</span><span className={state(reveal,3)}>REUSABLE FUNCTION</span></div>
    <footer className={state(reveal,3)}>Decompose until each part is understandable; recognise patterns so tested solutions can be reused.</footer>
  </div>;
}

function Representations({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-represent" aria-label="Three representations of the same algorithm">
    <section className={state(reveal,1)}><b>STRUCTURED ENGLISH</b><span>controlled logical wording</span><small>human-readable sequence</small></section>
    <i>↔</i>
    <section className={state(reveal,2)}><b>FLOWCHART</b><div className="h9alg-mini-flow"><em>START</em><i>↓</i><em>PROCESS</em><i>↓</i><em>OUTPUT</em></div></section>
    <i>↔</i>
    <section className={state(reveal,3)}><b>PSEUDOCODE</b><code>INPUT Value</code><code>Total ← Total + Value</code><code>OUTPUT Total</code></section>
    <footer className={state(reveal,3)}>Different representation; same underlying solution logic.</footer>
  </div>;
}

function AverageFlow({reveal}:{reveal:number}){
  const steps=[['INIT','Total ← 0\nCounter ← 1'],['INPUT','Number'],['INPUT','Value'],['PROCESS','Total ← Total + Value\nCounter ← Counter + 1'],['DECISION','Counter > Number?'],['PROCESS','Average ← Total / Number'],['OUTPUT','Average']];
  return <div className="h9alg h9alg-average" aria-label="Average algorithm flowchart sequence">
    <div className="h9alg-average-track">{steps.map(([label,text],index)=><section className={state(reveal,index<2?1:index<5?2:3)} key={`${label}-${index}`}><b>{label}</b>{text.split('\n').map(line=><code key={line}>{line}</code>)}</section>)}</div>
    <div className={`h9alg-loop ${state(reveal,2)}`}>NO → loop back to Value input</div>
  </div>;
}

function Identifiers({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-identifiers" aria-label="Identifiers input output and assignment model">
    <section className={state(reveal,1)}><b>IDENTIFIER TABLE</b><span>StudentName</span><span>Counter</span><span>StudentMark</span></section>
    <div className={`h9alg-io ${state(reveal,2)}`}><b>INPUT</b><code>INPUT StudentName</code><i>→</i><b>STORE</b><code>Counter ← 1</code></div>
    <div className={`h9alg-io ${state(reveal,3)}`}><b>PROCESS</b><code>Counter ← Counter + 1</code><i>→</i><b>OUTPUT</b><code>OUTPUT StudentName</code></div>
    <footer className={state(reveal,3)}>Assignment changes stored data; comparison asks a question about data.</footer>
  </div>;
}

function Selection({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-selection" aria-label="IF and CASE selection structures">
    <section className={state(reveal,1)}><b>IF</b><div className="h9alg-diamond">condition?</div><span>TRUE → one path</span><span>FALSE → alternative path</span></section>
    <section className={state(reveal,2)}><b>CASE</b><div className="h9alg-case-grid"><span>N</span><span>S</span><span>E</span><span>W</span><span>OTHERWISE</span></div><small>choose one of several branches</small></section>
    <footer className={state(reveal,3)}>Conditions use relational operators such as =, &lt;&gt;, &gt;, &lt;, &gt;= and &lt;=.</footer>
  </div>;
}

function Iteration({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-iteration" aria-label="FOR REPEAT UNTIL and WHILE iteration comparison">
    <section className={state(reveal,1)}><b>FOR</b><strong>FIXED COUNT</strong><span>repeat a known number of times</span><div className="h9alg-loop-ring">1 → 2 → 3 → …</div></section>
    <section className={state(reveal,2)}><b>REPEAT–UNTIL</b><strong>POST-CONDITION</strong><span>body runs at least once</span><div className="h9alg-loop-ring">BODY → TEST ↺</div></section>
    <section className={state(reveal,3)}><b>WHILE</b><strong>PRE-CONDITION</strong><span>body may run zero times</span><div className="h9alg-loop-ring">TEST → BODY ↺</div></section>
  </div>;
}

function Validation({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-validation" aria-label="Validated average input loop">
    <section className={state(reveal,1)}><b>INPUT Number</b><span>candidate count</span></section><i>→</i>
    <div className={`h9alg-diamond ${state(reveal,2)}`}><b>VALID?</b><span>Number &gt; 0</span><span>Number = INT(Number)</span></div>
    <div className={`h9alg-valid-result ${state(reveal,2)}`}><span>NO ↺ re-input</span><span>YES ↓</span></div>
    <section className={state(reveal,3)}><b>FOR EACH VALUE</b><span>input integer</span><span>accumulate Total</span></section>
    <footer className={state(reveal,3)}>Validation belongs inside the algorithm before a value is accepted for processing.</footer>
  </div>;
}

function Marathon({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-marathon" aria-label="Marathon structured English identifiers and time conversion">
    <section className={state(reveal,1)}><b>INPUT</b><span>MarathonHours</span><span>MarathonMinutes</span><span>MarathonSeconds</span></section>
    <i>→</i>
    <section className={state(reveal,2)}><b>PROCESS</b><code>(Hours × 3600)</code><code>+ (Minutes × 60)</code><code>+ Seconds</code></section>
    <i>→</i>
    <section className={state(reveal,3)}><b>OUTPUT</b><span>TotalMarathonTimeSeconds</span></section>
  </div>;
}

function FlowSymbols({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-symbols" aria-label="Flowchart symbol to pseudocode mapping">
    <section className={state(reveal,1)}><div className="h9alg-parallelogram">INPUT / OUTPUT</div><code>INPUT · OUTPUT</code></section>
    <section className={state(reveal,2)}><div className="h9alg-diamond">DECISION</div><code>IF · CASE · loop condition</code></section>
    <section className={state(reveal,2)}><div className="h9alg-rectangle">PROCESS</div><code>assignment · calculation</code></section>
    <section className={state(reveal,3)}><div className="h9alg-loop-symbol">↺ LOOP</div><code>FOR · REPEAT · WHILE</code></section>
  </div>;
}

function NestedRefinement({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-nested" aria-label="Nested selection and first stepwise refinement">
    <section className={state(reveal,1)}><b>NESTED IF</b><div className="h9alg-indent"><code>IF mark &lt; boundary</code><code>  ELSE</code><code>    IF mark &lt; next boundary</code><code>      ELSE …</code></div></section>
    <i>→</i>
    <section className={state(reveal,2)}><b>BROAD STEP</b><span>Enter marathon time</span></section>
    <i>→</i>
    <section className={state(reveal,3)}><b>REFINED STEPS</b><span>1.1 enter hours</span><span>1.2 enter minutes</span><span>1.3 enter seconds</span></section>
  </div>;
}

function DetailedRefinement({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-refine" aria-label="Stepwise refinement with validation and reinput">
    <div className={`h9alg-refine-root ${state(reveal,1)}`}><b>ENTER SECONDS</b></div>
    <div className="h9alg-refine-grid">
      <section className={state(reveal,2)}><b>INPUT</b><span>Value</span></section>
      <section className={state(reveal,2)}><b>RANGE</b><span>0 ≤ Value ≤ 59</span></section>
      <section className={state(reveal,3)}><b>WHOLE NUMBER</b><span>Value = INT(Value)</span></section>
      <section className={state(reveal,3)}><b>ACCEPT / REJECT</b><span>invalid → repeat</span><span>valid → store</span></section>
    </div>
    <footer className={state(reveal,3)}>Refine until every step is precise enough to translate directly into code.</footer>
  </div>;
}


function SelectionLanguages({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-language-compare" aria-label="Same IF logic across pseudocode Python VB.NET and Java">
    <div className={'h9alg-language-core '+state(reveal,1)}><b>MyValue &gt; YourValue</b><span>same logical condition</span></div>
    <section className={state(reveal,1)}><b>PSEUDOCODE</b><span>IF … THEN … ENDIF</span></section>
    <section className={state(reveal,2)}><b>PYTHON</b><span>colon + indentation</span></section>
    <section className={state(reveal,2)}><b>VB.NET</b><span>THEN + END IF</span></section>
    <section className={state(reveal,3)}><b>JAVA</b><span>parentheses + braces</span></section>
    <footer className={state(reveal,3)}>syntax changes; algorithmic meaning does not</footer>
  </div>;
}

function LoopLanguagesLogic({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-loop-logic" aria-label="Loop syntax and Boolean logic across languages">
    <div className="h9alg-loop-language-grid">
      <section className={state(reveal,1)}><b>PYTHON FOR</b><span>range-based iteration</span></section>
      <section className={state(reveal,1)}><b>VB.NET FOR</b><span>FOR … TO … STEP … NEXT</span></section>
      <section className={state(reveal,2)}><b>JAVA FOR</b><span>initialise ; test ; update</span></section>
    </div>
    <div className={'h9alg-logic-bar '+state(reveal,3)}><span><b>AND</b> both conditions true</span><span><b>OR</b> at least one true</span><span><b>NOT</b> invert truth value</span></div>
    <footer className={state(reveal,3)}>WHILE, REPEAT and IF conditions ultimately evaluate comparisons to TRUE or FALSE.</footer>
  </div>;
}

function StructuredEnglish({reveal}:{reveal:number}){
  const clues=[['ENTER / READ','INPUT'],['PRINT / WRITE','OUTPUT'],['IF / THEN / CHOOSE','SELECTION'],['LOOP / REPEAT','ITERATION'],['SET / CALCULATE','PROCESSING']] as const;
  return <div className="h9alg h9alg-structured-english" aria-label="Structured English clues mapped to pseudocode constructs">
    <section className={state(reveal,1)}><b>STRUCTURED ENGLISH</b><span>unambiguous problem steps</span></section>
    <i>→</i>
    <div className="h9alg-clue-grid">{clues.map(([words,kind],index)=><span className={state(reveal,index<2?1:index<4?2:3)} key={words}><b>{words}</b><small>{kind}</small></span>)}</div>
    <aside className={state(reveal,3)}><b>ACTIVITY 9F</b><span>set password twice → allow three attempts → complete identifier table</span></aside>
  </div>;
}

function MarathonProcess({reveal}:{reveal:number}){
  return <div className="h9alg h9alg-marathon-process" aria-label="Marathon time process and personal best extension visual">
    <section className={state(reveal,1)}><b>INPUT</b><span>MarathonHours · MarathonMinutes · MarathonSeconds</span></section><i>→</i>
    <section className={state(reveal,2)}><b>PROCESS</b><span>TotalMarathonTimeSeconds ← (Hours × 3600 + Minutes) × 60 + Seconds</span></section><i>→</i>
    <section className={state(reveal,2)}><b>OUTPUT</b><span>Time for marathon in seconds</span></section>
    <footer className={state(reveal,3)}><b>ACTIVITY 9G</b><span>input PersonalBest → compare → replace when new time is shorter → output result</span></footer>
  </div>;
}

function RepeatGrade({reveal}:{reveal:number}){
  const steps=['INPUT mark','CLASSIFY grade','OUTPUT grade','ASK another?','INPUT Reply'] as const;
  return <div className="h9alg h9alg-repeat-grade" aria-label="Repeated grade processing control flow visual">
    <div className="h9alg-repeat-route">{steps.map((step,index)=><span className={state(reveal,index<2?1:index<4?2:3)} key={step}>{step}</span>)}</div>
    <div className={'h9alg-repeat-decision '+state(reveal,3)}><b>Reply = "Y" ?</b><span>YES → return to mark input</span><span>NO → END</span></div>
    <footer className={state(reveal,3)}>ACTIVITY 9H extends a one-mark solution into repeated processing.</footer>
  </div>;
}

export function Chapter9AlgorithmVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h9-911-abstraction': return <Abstraction reveal={reveal}/>;
    case 'h9-912-decomposition': return <Decomposition reveal={reveal}/>;
    case 'h9-921-three-representations': return <Representations reveal={reveal}/>;
    case 'h9-921-average-flowchart': return <AverageFlow reveal={reveal}/>;
    case 'h9-922-identifiers-io-assignment': return <Identifiers reveal={reveal}/>;
    case 'h9-922-selection': return <Selection reveal={reveal}/>;
    case 'h9-922-selection-languages': return <SelectionLanguages reveal={reveal}/>;
    case 'h9-922-iteration': return <Iteration reveal={reveal}/>;
    case 'h9-922-loop-languages-logic': return <LoopLanguagesLogic reveal={reveal}/>;
    case 'h9-922-validation-average': return <Validation reveal={reveal}/>;
    case 'h9-923-password-and-structured-english': return <StructuredEnglish reveal={reveal}/>;
    case 'h9-923-marathon-identifiers': return <Marathon reveal={reveal}/>;
    case 'h9-923-marathon-process': return <MarathonProcess reveal={reveal}/>;
    case 'h9-924-flowchart-symbols': return <FlowSymbols reveal={reveal}/>;
    case 'h9-924-nested-selection-refinement': return <NestedRefinement reveal={reveal}/>;
    case 'h9-925-repeat-grade-activity': return <RepeatGrade reveal={reveal}/>;
    case 'h9-925-detailed-refinement': return <DetailedRefinement reveal={reveal}/>;
    default: return null;
  }
}
