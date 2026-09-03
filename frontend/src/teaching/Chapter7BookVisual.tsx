import type { LessonSlide } from './lesson-content-full';
import './chapter7-book.css';

type Props = { slide: LessonSlide; revealed: boolean };

const Box = ({ children, className='' }: { children: React.ReactNode; className?: string }) => <div className={`ch7b-box ${className}`}>{children}</div>;

function MapsVisual() {
  return <div className="ch7b-maps">
    <Box className="road"><b>ROAD MAP</b><span>roads</span><span>junctions</span><span>turns</span><span>destinations</span></Box>
    <div className="ch7b-vs">same place<br/><strong>different purpose</strong></div>
    <Box className="rail"><b>RAIL MAP</b><span>stations</span><span>lines</span><span>connections</span><span>changes</span></Box>
  </div>;
}

function IposVisual() {
  return <div className="ch7b-ipos">
    <Box><b>INPUT</b><span>data entered</span></Box><i>→</i>
    <Box><b>PROCESS</b><span>work performed</span></Box><i>→</i>
    <Box><b>OUTPUT</b><span>information shown</span></Box>
    <div className="ch7b-storage"><b>STORAGE</b><span>data kept for later</span><i>↕</i></div>
  </div>;
}

function AlarmTree() {
  return <div className="ch7b-tree">
    <Box className="root"><b>Alarm app</b></Box>
    <div className="branches">
      <Box><b>Set alarm</b><span>set time</span><span>turn on/off</span></Box>
      <Box><b>Check time</b><span>get time</span><span>compare time</span><span>wait / trigger</span></Box>
      <Box><b>Sound alarm</b><span>play sound</span><span>snooze / stop</span></Box>
    </div>
  </div>;
}

function FlowSymbols() {
  return <div className="ch7b-flow-symbols">
    <article><span className="terminator">START</span><b>Begin / End</b></article>
    <article><span className="process">Total ← Total + X</span><b>Process</b></article>
    <article><span className="io">INPUT X</span><b>Input / Output</b></article>
    <article><span className="decision">X &gt; B?</span><b>Decision</b></article>
  </div>;
}

function AlarmFlow() {
  return <div className="ch7b-flow-col">
    <span className="terminator">START</span><i>↓</i><span className="process">Get Time</span><i>↓</i><span className="decision">Time = Alarm Time?</span>
    <div className="ch7b-split"><Box><b>YES</b><span>Sound Alarm</span><span>STOP</span></Box><Box><b>NO</b><span>Wait 30 seconds</span><span>Check again ↺</span></Box></div>
  </div>;
}

function TicketBands() {
  return <div className="ch7b-bands">
    <Box><b>1–9 tickets</b><strong>0%</strong><span>discount</span></Box>
    <Box><b>10–19 tickets</b><strong>10%</strong><span>discount</span></Box>
    <Box><b>20–25 tickets</b><strong>20%</strong><span>discount</span></Box>
    <div className="rule">valid input: 1–25 · price: $20 each</div>
  </div>;
}

function OperatorTable({ comparison=false }: { comparison?: boolean }) {
  const rows = comparison
    ? [['>','greater than'],['<','less than'],['=','equal'],['>=','greater/equal'],['<=','less/equal'],['<>','not equal'],['AND','both'],['OR','either'],['NOT','not']]
    : [['+','add'],['−','subtract'],['*','multiply'],['/','divide'],['^','power'],['( )','group']];
  return <div className="ch7b-table"><div className="head"><b>Operator</b><b>Meaning</b></div>{rows.map(([a,b])=><div key={a}><code>{a}</code><span>{b}</span></div>)}</div>;
}

function LoopCards() {
  return <div className="ch7b-loopcards">
    <Box><b>FOR … NEXT</b><span>number of repeats known</span><code>1 → 10</code></Box>
    <Box><b>REPEAT … UNTIL</b><span>runs at least once</span><code>test at end</code></Box>
    <Box><b>WHILE … ENDWHILE</b><span>may run zero times</span><code>test at start</code></Box>
  </div>;
}

function MethodsVisual() {
  return <div className="ch7b-methods">
    {['Σ Totalling','# Counting','↑↓ Max / Min','÷ Average','⌕ Linear search','⇄ Bubble sort'].map(x=><Box key={x}><b>{x}</b></Box>)}
  </div>;
}

function ValidationVisual() {
  return <div className="ch7b-validation">
    {['Range','Length','Type','Presence','Format','Check digit'].map(x=><span key={x}>{x}</span>)}
    <div className="ch7b-vsplit"><Box><b>VALIDATION</b><span>reasonable?</span></Box><Box><b>VERIFICATION</b><span>copied accurately?</span></Box></div>
  </div>;
}

function TestDataVisual() {
  return <div className="ch7b-testdata">
    <Box><b>NORMAL</b><span>should be accepted</span><strong>50</strong></Box>
    <Box><b>ABNORMAL</b><span>should be rejected</span><strong>-12</strong></Box>
    <Box><b>EXTREME</b><span>smallest/largest accepted</span><strong>0 · 100</strong></Box>
    <Box><b>BOUNDARY</b><span>accepted + adjacent rejected</span><strong>-1/0 · 100/101</strong></Box>
  </div>;
}

function TraceTable({ revealed }: { revealed:boolean }) {
  const rows = revealed
    ? [['0','0','100','',''],['1','9','9','9',''],['2','','7','7',''],['3','','3','3',''],['4','12','','12',''],['7','15','','15',''],['8','','2','2',''],['10','','','5','15, 2']]
    : [['0','0','100','',''],['1','','','',''],['2','','','',''],['3','','','',''],['4','','','',''],['…','','','',''],['10','','','',''],['OUT','','','','?']];
  return <div className="ch7b-trace"><div className="head">{['A','B','C','X','OUTPUT'].map(x=><b key={x}>{x}</b>)}</div>{rows.map((r,i)=><div key={i}>{r.map((x,j)=><span key={j}>{x}</span>)}</div>)}</div>;
}

function MaxMinVisual() {
  return <div className="ch7b-maxmin">
    <Box className="root"><b>MAX AND MIN</b></Box>
    <div className="branches"><Box><b>Enter values</b></Box><Box><b>Check all values</b><span>check Max</span><span>check Min</span></Box><Box><b>Output</b><span>Max and Min</span></Box></div>
    <div className="firstvalue">first input → Maximum AND Minimum</div>
  </div>;
}

function StackQueueVisual() {
  return <div className="ch7b-stackqueue">
    <div><b>STACK · LIFO</b><div className="stack">{['79 ← Top','82','34','27 ← Base'].map(x=><span key={x}>{x}</span>)}</div><small>PUSH ↑ · POP ↓</small></div>
    <div><b>QUEUE · FIFO</b><div className="queue">{['27 ← Front','34','82','79 ← End'].map(x=><span key={x}>{x}</span>)}</div><small>DEQUEUE → · ENQUEUE →</small></div>
  </div>;
}

function SourceCoverageVisual() {
  return <div className="ch7b-coverage">
    <strong>CHAPTER 7</strong>
    <span>7.1</span><span>7.2</span><span>7.3</span><span>7.4</span><span>7.5</span><span>7.6</span><span>7.7</span><span>7.8</span><span>7.9</span>
    <small>20 activities · 22 figures · 6 tables · 9 exam-style questions</small>
  </div>;
}

function ExamVisual() {
  return <div className="ch7b-exam"><span>0478</span><strong>EXAM PRACTICE</strong><div><b>READ</b><i>→</i><b>PLAN</b><i>→</i><b>ANSWER</b><i>→</i><b>CHECK</b></div></div>;
}

export function Chapter7BookVisual({ slide, revealed }: Props) {
  const id=slide.id;
  if(id==='ch7-book-00-route') return <SourceCoverageVisual/>;
  if(id.includes('abstraction-maps')) return <MapsVisual/>;
  if(id.includes('ipos')||id.includes('alarm-ipos')) return <IposVisual/>;
  if(id.includes('structure-basic')||id.includes('alarm-tree')||id.includes('teeth')) return <AlarmTree/>;
  if(id.includes('flow-symbols')) return <FlowSymbols/>;
  if(id.includes('flow-purpose')) return <AlarmFlow/>;
  if(id.includes('ticket-flow')||id.includes('79-example1')) return <TicketBands/>;
  if(id.includes('operators')) return <OperatorTable/>;
  if(id.includes('comparison')) return <OperatorTable comparison/>;
  if(id.includes('loops')||id.includes('loop-examples')) return <LoopCards/>;
  if(id.includes('74-overview')||id.includes('total-count')||id.includes('max-min')||id.includes('average')||id.includes('linear-search')||id.includes('bubble')) return <MethodsVisual/>;
  if(id.includes('75-')) return <ValidationVisual/>;
  if(id.includes('76-')) return <TestDataVisual/>;
  if(id.includes('77-')||id.includes('78-activity71314')) return <TraceTable revealed={revealed}/>;
  if(id.includes('78-')||id.includes('79-eight')||id.includes('79-fig')) return <MaxMinVisual/>;
  if(id.includes('ext-')) return <StackQueueVisual/>;
  if(id.includes('exam-')) return <ExamVisual/>;
  if(slide.example) return <div className="ch7b-code"><span>{slide.example.title}</span><pre>{slide.example.lines.join('\n')}</pre>{slide.example.answer&&<strong>{slide.example.answer}</strong>}</div>;
  if(slide.keyTerms) return <div className="ch7b-termwall">{slide.keyTerms.map(x=><span key={x.term}>{x.term}</span>)}</div>;
  return <SourceCoverageVisual/>;
}
