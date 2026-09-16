import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter11-programming-visuals.css';

export const CHAPTER_11_PROGRAMMING_VISUAL_IDS = [
  'h11-111-constants-variables',
  'h11-111-sphere-algorithm',
  'h11-111-password-functions',
  'h11-112-library-routines',
  'h11-1121-case-model',
  'h11-1122-loops',
  'h11-113-procedure-basics',
  'h11-1131-calls-parameters',
  'h11-1131-parameter-passing',
  'h11-1131-byref-functions-intro',
  'h11-1132-functions',
  'h11-1132-language-functions-review-start',
] as const;

export function hasChapter11ProgrammingVisual(beat:LessonPresentationBeat){
  return CHAPTER_11_PROGRAMMING_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function ConstantsVariables({reveal}:{reveal:number}){
  return <div className="h11pg h11pg-identifiers" aria-label="Sphere constants and variables">
    <div className={`h11pg-core ${state(reveal,1)}`}><b>SPHERE PROGRAM</b><span>declare identifiers before processing</span></div>
    <section className={state(reveal,2)}><b>VARIABLES</b><code>radius : REAL</code><code>volume : REAL</code><code>surfaceArea : REAL</code><small>values can change</small></section>
    <section className={state(reveal,3)}><b>CONSTANT</b><code>pi ← 3.142</code><small>named value does not change during execution</small></section>
  </div>;
}

function SpherePipeline({reveal}:{reveal:number}){
  const steps=[['INPUT','radius'],['VALIDATE','radius > 0'],['PROCESS','volume ← (4/3) × pi × r³'],['PROCESS','surfaceArea ← 4 × pi × r²'],['OUTPUT','volume + surface area']];
  return <div className="h11pg h11pg-pipeline" aria-label="Sphere input validation processing output pipeline">
    {steps.map(([name,note],index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={`${name}-${index}`}><b>{name}</b><span>{note}</span></section>)}
    <footer className={state(reveal,3)}>Same algorithmic intent; Python, VB.NET and Java express the syntax differently.</footer>
  </div>;
}

function StringFunctions({reveal}:{reveal:number}){
  const functions=[['LENGTH','string length'],['LEFT','characters from left'],['RIGHT','characters from right'],['MID','substring from position + length']];
  return <div className="h11pg h11pg-strings" aria-label="Password checking with string functions">
    <section className={state(reveal,1)}><b>INPUT PASSWORD</b><span>candidate string</span></section><i>→</i>
    <div className={`h11pg-string-grid ${state(reveal,2)}`}>{functions.map(([fn,note])=><span key={fn}><b>{fn}</b><small>{note}</small></span>)}</div><i>→</i>
    <section className={state(reveal,3)}><b>NESTED IF</b><span>length matches?</span><span>first + last characters match?</span><small>accept / reject</small></section>
  </div>;
}

function LibraryRoutines({reveal}:{reveal:number}){
  return <div className="h11pg h11pg-library" aria-label="Standard library routines">
    <div className={`h11pg-library-box ${state(reveal,1)}`}><b>STANDARD LIBRARY</b><span>tested reusable routines supplied by the language / development system</span></div>
    <section className={state(reveal,2)}><b>STRING ROUTINES</b><span>length · substring · character operations</span></section>
    <section className={state(reveal,2)}><b>INPUT / OUTPUT</b><span>common ready-to-use services</span></section>
    <section className={state(reveal,3)}><b>PROGRAM</b><span>call routine instead of rewriting it</span><small>less new code to design and test</small></section>
  </div>;
}

function CaseModel({reveal}:{reveal:number}){
  return <div className="h11pg h11pg-case" aria-label="CASE menu model with exact values ranges and otherwise">
    <div className={`h11pg-case-input ${state(reveal,1)}`}><b>choice</b></div>
    <div className="h11pg-case-grid"><span className={state(reveal,2)}>1 → Routine 1</span><span className={state(reveal,2)}>2 → Routine 2</span><span className={state(reveal,2)}>3 → Routine 3</span><span className={state(reveal,3)}>4…6 → grouped action</span><span className={state(reveal,3)}>10 → Exit</span><span className={state(reveal,3)}>OTHERWISE → error</span></div>
    <footer className={state(reveal,3)}>CASE is clearer when one identifier selects among several distinct alternatives.</footer>
  </div>;
}

function Loops({reveal}:{reveal:number}){
  return <div className="h11pg h11pg-loops" aria-label="FOR REPEAT UNTIL and WHILE loop selection">
    <section className={state(reveal,1)}><b>FOR … NEXT</b><strong>COUNT-CONTROLLED</strong><span>repetition count known</span><div>1 → 2 → 3 → …</div></section>
    <section className={state(reveal,2)}><b>REPEAT … UNTIL</b><strong>POST-CONDITION</strong><span>body runs at least once</span><div>BODY → TEST ↺</div></section>
    <section className={state(reveal,3)}><b>WHILE … DO</b><strong>PRE-CONDITION</strong><span>body may run zero times</span><div>TEST → BODY ↺</div></section>
  </div>;
}

function ProcedureBasics({reveal}:{reveal:number}){
  return <div className="h11pg h11pg-procedure" aria-label="Procedure definition and call">
    <section className={state(reveal,1)}><b>DEFINE ONCE</b><code>PROCEDURE stars</code><code>  &lt;statements&gt;</code><code>ENDPROCEDURE</code></section>
    <i>→</i>
    <div className={`h11pg-procedure-core ${state(reveal,2)}`}><b>REUSABLE ROUTINE</b><span>named block of statements</span></div>
    <i>→</i>
    <section className={state(reveal,3)}><b>CALL MANY TIMES</b><code>CALL stars</code><code>CALL stars</code><code>CALL stars</code></section>
  </div>;
}

function CallsParameters({reveal}:{reveal:number}){
  return <div className="h11pg h11pg-params" aria-label="Procedure parameter and argument matching">
    <section className={state(reveal,1)}><b>DEFINITION HEADER</b><code>PROCEDURE stars(Number : INTEGER)</code><span>Number = parameter</span></section>
    <i>⇄</i>
    <section className={state(reveal,2)}><b>CALL</b><code>CALL stars(12)</code><span>12 = argument</span></section>
    <footer className={state(reveal,3)}>Arguments must match parameters by count, position and compatible type.</footer>
  </div>;
}

function Passing({reveal}:{reveal:number}){
  return <div className="h11pg h11pg-passing" aria-label="By value and by reference parameter passing comparison">
    <section className={state(reveal,1)}><b>BY VALUE</b><div className="h11pg-memory"><span>caller x = 5</span><i>→ copy →</i><span>parameter = 5</span></div><small>changing the parameter does not change caller x through that parameter</small></section>
    <section className={state(reveal,2)}><b>BY REFERENCE</b><div className="h11pg-memory"><span>caller x</span><i>↔ reference ↔</i><span>parameter</span></div><small>routine can change the caller's variable</small></section>
    <footer className={state(reveal,3)}>The interface looks similar; the effect on the caller's state is different.</footer>
  </div>;
}

function ByRefToFunction({reveal}:{reveal:number}){
  return <div className="h11pg h11pg-byref" aria-label="BYREF Celsius procedure compared with a function">
    <section className={state(reveal,1)}><b>PROCEDURE + BYREF</b><code>celsius(BYREF temperature)</code><span>modifies the supplied variable</span></section>
    <i>vs</i>
    <section className={state(reveal,2)}><b>FUNCTION</b><code>celsius(temperature) RETURNS REAL</code><span>returns a value</span></section>
    <footer className={state(reveal,3)}><code>CALL celsius(myTemp)</code><span>versus</span><code>myTemp ← celsius(myTemp)</code></footer>
  </div>;
}

function Functions({reveal}:{reveal:number}){
  return <div className="h11pg h11pg-function" aria-label="Function definition return value and expression call">
    <section className={state(reveal,1)}><b>HEADER</b><code>FUNCTION celsius(temperature : REAL) RETURNS REAL</code></section>
    <section className={state(reveal,2)}><b>PROCESS + RETURN</b><code>RETURN (temperature - 32) / 1.8</code></section>
    <section className={state(reveal,3)}><b>USE IN EXPRESSION</b><code>myTemp ← celsius(myTemp)</code><small>function call produces a value</small></section>
  </div>;
}

function ProcedureFunctionCompare({reveal}:{reveal:number}){
  return <div className="h11pg h11pg-compare" aria-label="Procedure and function call comparison">
    <section className={state(reveal,1)}><b>PROCEDURE</b><strong>CALL AS A STATEMENT</strong><code>CALL displayStars(12)</code><span>performs action / may change state</span></section>
    <section className={state(reveal,2)}><b>FUNCTION</b><strong>USE AS AN EXPRESSION</strong><code>answer ← celsius(value)</code><span>always returns a value</span></section>
    <footer className={state(reveal,3)}>Choose the structure that matches the job: perform an action or calculate and return a value.</footer>
  </div>;
}

export function Chapter11ProgrammingVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h11-111-constants-variables': return <ConstantsVariables reveal={reveal}/>;
    case 'h11-111-sphere-algorithm': return <SpherePipeline reveal={reveal}/>;
    case 'h11-111-password-functions': return <StringFunctions reveal={reveal}/>;
    case 'h11-112-library-routines': return <LibraryRoutines reveal={reveal}/>;
    case 'h11-1121-case-model': return <CaseModel reveal={reveal}/>;
    case 'h11-1122-loops': return <Loops reveal={reveal}/>;
    case 'h11-113-procedure-basics': return <ProcedureBasics reveal={reveal}/>;
    case 'h11-1131-calls-parameters': return <CallsParameters reveal={reveal}/>;
    case 'h11-1131-parameter-passing': return <Passing reveal={reveal}/>;
    case 'h11-1131-byref-functions-intro': return <ByRefToFunction reveal={reveal}/>;
    case 'h11-1132-functions': return <Functions reveal={reveal}/>;
    case 'h11-1132-language-functions-review-start': return <ProcedureFunctionCompare reveal={reveal}/>;
    default: return null;
  }
}
