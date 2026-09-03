import { useEffect, useState } from 'react';
import type { LessonSlide } from './lesson-content-full';
import './chapter7-lesson.css';

const facts = [
  'The canteen wall is yellow', 'Burger costs 20,000 UZS', 'The canteen has 8 tables', 'Pizza costs 25,000 UZS',
  'The user chooses a food item', 'The cook is called Anvar', 'The user enters the amount paid',
  'The school has 650 students', 'Sandwich costs 15,000 UZS', 'The system checks whether the payment is enough',
  'The school opened in 2019', 'The system calculates the change',
];

const steps = [
  'Defined what the system must receive, do and show',
  'Split one large job into smaller jobs',
  'Removed information that could not affect the result',
  'Organised the whole system, main parts and small actions in levels',
  'Showed the exact order and the two possible paths',
  'Redrew the sequence with standard symbols',
  'Expressed the same solution as structured text',
  'Arranged machine-readable command cards',
  'Ran several input cases and compared expected with actual results',
  'Found an error, corrected it and re-ran different cases',
];

function MenuVisual() {
  return <div className="ch7-menu">
    <div className="ch7-counter"><span>ORDER</span><b>?</b></div>
    <div className="ch7-menu-items">
      <article><span>🍔</span><strong>Burger</strong><b>20,000 UZS</b></article>
      <article><span>🍕</span><strong>Pizza</strong><b>25,000 UZS</b></article>
      <article><span>🥪</span><strong>Sandwich</strong><b>15,000 UZS</b></article>
    </div>
  </div>;
}

function ThreeColumns({ revealed }: { revealed:boolean }) {
  const values = [
    ['INPUT', 'Food choice', 'Amount paid'],
    ['PROCESS', 'Find price', 'Check payment', 'Calculate change'],
    ['OUTPUT', 'Change', 'Or warning message'],
  ];
  return <div className="ch7-three-cols">{values.map(([title,...items])=><article key={title}><strong>{title}</strong>{revealed?items.map(item=><span key={item}>{item}</span>):<span className="ch7-blank">Write your answer</span>}</article>)}</div>;
}

function Hierarchy({ revealed }: { revealed:boolean }) {
  if(!revealed) return <div className="ch7-card-pile">{['Canteen system','Food','Payment','Result','Choose food','Find price','Receive payment','Check payment','Calculate change','Show result'].map(item=><span key={item}>{item}</span>)}</div>;
  return <div className="ch7-tree">
    <strong>Canteen system</strong>
    <div className="ch7-tree-row">
      <article><b>Food</b><span>Choose food</span><span>Find price</span></article>
      <article><b>Payment</b><span>Receive payment</span><span>Check payment</span><span>Calculate change</span></article>
      <article><b>Result</b><span>Show result</span></article>
    </div>
  </div>;
}

function Sequence({ revealed, shapes=false }: { revealed:boolean; shapes?:boolean }) {
  if(!revealed) return <div className="ch7-sequence ch7-sequence-simple">
    {['Start','Choose food','Find price','Enter payment','Is payment enough?'].map((item,index)=><div key={item}><span>{item}</span>{index<4&&<b>↓</b>}</div>)}
    <em>Draw two branches from this point: YES and NO.</em>
  </div>;
  if(shapes) return <div className="ch7-flow">
    <div className="terminator">Start</div><i>↓</i>
    <div className="io">Input food</div><i>↓</i>
    <div className="process">Find price</div><i>↓</i>
    <div className="io">Input payment</div><i>↓</i>
    <div className="decision"><span>Payment enough?</span></div>
    <div className="ch7-branches"><article><b>YES</b><span>Calculate change</span><span>Output result</span></article><article><b>NO</b><span>“Not enough money”</span></article></div>
  </div>;
  return <div className="ch7-sequence">
    <div><span>Start</span><b>→</b><span>Food</span><b>→</b><span>Price</span><b>→</b><span>Payment</span><b>→</b><span>Payment enough?</span></div>
    <div className="ch7-branches"><article><b>YES</b><span>Calculate change</span><span>Show result</span></article><article><b>NO</b><span>“Not enough money”</span></article></div>
  </div>;
}

function ShapeLegend() {
  return <div className="ch7-shapes">
    <article><span className="shape oval">Start</span><b>start / end</b></article>
    <article><span className="shape rect">Action</span><b>system action</b></article>
    <article><span className="shape para">Data</span><b>input / output</b></article>
    <article><span className="shape diamond">?</span><b>two-path question</b></article>
  </div>;
}

function StructuredText({ revealed }: { revealed:boolean }) {
  return <div className="ch7-code-wrap">
    <div className="ch7-keywords">{['START','INPUT','IF','THEN','ELSE','OUTPUT','END'].map(k=><span key={k}>{k}</span>)}</div>
    {revealed&&<pre>{`START\nINPUT food\nfind price\nINPUT money\nIF money >= price THEN\n    calculate change\n    OUTPUT change\nELSE\n    OUTPUT "Not enough money"\nEND`}</pre>}
  </div>;
}

function CommandCards({ revealed }: { revealed:boolean }) {
  const unordered = ['SAY change','ASK food','ELSE','SET change TO money - price','ASK money','END IF','IF money >= price','SAY "Not enough money"','SET price TO ...'];
  const ordered = ['ASK food','SET price TO ...','ASK money','IF money >= price','SET change TO money - price','SAY change','ELSE','SAY "Not enough money"','END IF'];
  return <div className={`ch7-command-cards${revealed?' ordered':''}`}>{(revealed?ordered:unordered).map((item,index)=><span key={`${item}-${index}`}>{revealed&&<i>{index+1}</i>}{item}</span>)}</div>;
}

function HumanComputer({ revealed }: { revealed:boolean }) {
  const cases = [['Pizza','30,000 UZS','5,000 UZS change'],['Burger','20,000 UZS','0 UZS change'],['Sandwich','10,000 UZS','Not enough money']];
  return <div className="ch7-sim">{cases.map(([food,money,result],i)=><article key={food}><span>CASE {i+1}</span><strong>{food}</strong><b>{money}</b>{revealed?<em>{result}</em>:<em>Result: ?</em>}</article>)}</div>;
}

function TestTable({ revealed }: { revealed:boolean }) {
  const rows = [['Pizza','30,000','5,000'],['Burger','20,000','0'],['Sandwich','10,000','Not enough money'],['Pizza','25,000','0'],['Burger','15,000','Not enough money']];
  return <div className="ch7-test-table"><div className="head"><b>Food</b><b>Payment</b><b>Expected</b><b>Actual</b><b>Match?</b></div>{rows.map(([food,money,result])=><div key={`${food}-${money}`}><span>{food}</span><span>{money}</span><span>{revealed?result:'?'}</span><span>{revealed?result:'?'}</span><span>{revealed?'YES':'?'}</span></div>)}</div>;
}

function BugVisual({ revealed }: { revealed:boolean }) {
  return <div className="ch7-bug">
    <pre>IF money <mark>&gt;</mark> price</pre>
    <div><span>Burger price</span><b>20,000</b><span>Payment</span><b>20,000</b></div>
    {revealed?<p>Correction: <code>money &gt;= price</code><br/>Re-run equal, greater and smaller payment cases.</p>:<p>Expected: 0 change<br/>Actual: “Not enough money”<br/><strong>Which symbol is wrong?</strong></p>}
  </div>;
}

function RecapVisual() {
  return <ol className="ch7-recap-list">{steps.map((item,index)=><li key={item}><span>{index+1}</span>{item}</li>)}</ol>;
}

function RevealMap() {
  const rows = [
    ['Identified the problem and requirements','Analysis'],
    ['Split the large job into smaller parts','Decomposition'],
    ['Removed unnecessary detail','Abstraction'],
    ['Planned the solution before implementation','Design'],
    ['Showed the hierarchy of system parts','Structure diagram'],
    ['Showed the sequence with standard symbols','Flowchart'],
    ['Expressed the algorithm as structured text','Pseudocode'],
    ['Implemented instructions in a programming language','Coding'],
    ['Compared expected and actual results','Testing'],
  ];
  return <div className="ch7-reveal-map">{rows.map(([what,name])=><article key={name}><span>{what}</span><b>{name}</b></article>)}</div>;
}

function VisualForSlide({ id, revealed }: { id:string; revealed:boolean }) {
  if(id==='ch7-01-challenge') return <MenuVisual/>;
  if(id==='ch7-02-understand') return <ThreeColumns revealed={revealed}/>;
  if(id==='ch7-03-small-jobs') return <div className="ch7-card-pile jobs">{(revealed?['Choose food','Find price','Receive payment','Check payment','Calculate change','Show result']:['Small job 1','Small job 2','Small job 3','Small job 4','Small job 5','Small job 6']).map(x=><span key={x}>{x}</span>)}</div>;
  if(id==='ch7-04-filter') return <div className="ch7-facts">{facts.map((fact,i)=><span className={revealed?(i===1||i===3||i===4||i===6||i===8||i===9||i===11?'keep':'drop'):''} key={fact}>{fact}</span>)}</div>;
  if(id==='ch7-05-hierarchy') return <Hierarchy revealed={revealed}/>;
  if(id==='ch7-06-sequence') return <Sequence revealed={revealed}/>;
  if(id==='ch7-07-shapes') return revealed?<Sequence revealed shapes/>:<ShapeLegend/>;
  if(id==='ch7-08-structured-text') return <StructuredText revealed={revealed}/>;
  if(id==='ch7-09-command-cards') return <CommandCards revealed={revealed}/>;
  if(id==='ch7-10-human-computer') return <HumanComputer revealed={revealed}/>;
  if(id==='ch7-11-predict-check') return <TestTable revealed={revealed}/>;
  if(id==='ch7-12-bug') return <BugVisual revealed={revealed}/>;
  if(id==='ch7-13-recap') return <RecapVisual/>;
  if(id==='ch7-14-reveal') return <RevealMap/>;
  return null;
}

export function Chapter7SlideBody({ slide }: { slide:LessonSlide }) {
  const [revealed,setRevealed]=useState(false);
  useEffect(()=>setRevealed(false),[slide.id]);
  const hasReveal=Boolean(slide.activity?.reveal)||['ch7-02-understand','ch7-03-small-jobs','ch7-04-filter','ch7-05-hierarchy','ch7-06-sequence','ch7-07-shapes','ch7-08-structured-text','ch7-09-command-cards','ch7-10-human-computer','ch7-11-predict-check','ch7-12-bug'].includes(slide.id);
  return <div className="ch7-slide-body">
    <div className="ch7-copy">
      <p className="lesson-eyebrow">{slide.eyebrow}</p>
      <h1>{slide.title}</h1>
      <p className="ch7-lead">{slide.lead}</p>
      {slide.bullets&&<ul>{slide.bullets.map(item=><li key={item}>{item}</li>)}</ul>}
      {slide.keyTerms&&<div className="ch7-terms">{slide.keyTerms.map(item=><article key={item.term}><strong>{item.term}</strong><span>{item.definition}</span></article>)}</div>}
      {slide.teacherPrompt&&<div className="ch7-question"><span>INSTRUCTION</span><p>{slide.teacherPrompt}</p></div>}
      {slide.activity&&<div className="ch7-task"><span>YOUR TASK</span><strong>{slide.activity.title}</strong><p>{slide.activity.prompt}</p></div>}
      {hasReveal&&<button type="button" className="ch7-reveal-button" onClick={()=>setRevealed(value=>!value)}>{revealed?'Hide answer':'Show answer / example'}</button>}
      {revealed&&slide.activity?.reveal&&<div className="ch7-answer"><b>EXAMPLE</b><p>{slide.activity.reveal}</p></div>}
    </div>
    <div className="ch7-visual-panel"><VisualForSlide id={slide.id} revealed={revealed}/></div>
  </div>;
}
