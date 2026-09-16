import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter10-data-structure-visuals.css';

export const CHAPTER_10_DATA_STRUCTURE_VISUAL_IDS = [
  'h10-1011-basic-types',
  'h10-1012-records',
  'h10-1021-1d-arrays',
  'h10-1022-2d-arrays',
  'h10-1023-linear-search-core',
  'h10-1024-bubble-algorithm',
  'h10-103-files',
  'h10-104-pointers',
  'h10-1041-stack',
  'h10-1042-queue-circular',
  'h10-1043-linked-list-start',
  'h10-1043-add-first-two',
] as const;

export function hasChapter10DataStructureVisual(beat:LessonPresentationBeat){
  return CHAPTER_10_DATA_STRUCTURE_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function BasicTypes({reveal}:{reveal:number}){
  const types=[['BOOLEAN','TRUE / FALSE'],['CHAR','single character'],['DATE','date value'],['INTEGER','whole number'],['REAL','decimal number'],['STRING','character sequence']];
  return <div className="h10ds h10ds-types" aria-label="Basic data types">
    <div className={`h10ds-core ${state(reveal,1)}`}><b>DATA TYPE</b><span>allowed values + meaningful operations</span></div>
    <div className="h10ds-type-grid">{types.map(([name,note],index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={name}><b>{name}</b><span>{note}</span></section>)}</div>
    <footer className={state(reveal,3)}><code>DECLARE identifier : data type</code></footer>
  </div>;
}

function Records({reveal}:{reveal:number}){
  return <div className="h10ds h10ds-record" aria-label="TbookRecord composite data type">
    <div className={`h10ds-record-shell ${state(reveal,1)}`}><b>TbookRecord</b>
      <span><em>title</em><code>STRING</code></span><span><em>author</em><code>STRING</code></span><span><em>publisher</em><code>STRING</code></span><span><em>noPages</em><code>INTEGER</code></span><span><em>fiction</em><code>BOOLEAN</code></span>
    </div>
    <section className={state(reveal,2)}><b>DECLARE</b><code>Book : TbookRecord</code></section>
    <section className={state(reveal,3)}><b>FIELD ACCESS</b><code>Book.author ← "David Watson"</code></section>
  </div>;
}

function OneDimensional({reveal}:{reveal:number}){
  const values=[27,19,36,42,16,89,21,16,55];
  return <div className="h10ds h10ds-array" aria-label="Figure 10.1 one dimensional array myList">
    <header className={state(reveal,1)}><b>myList</b><code>ARRAY[0:8] OF INTEGER</code></header>
    <div className="h10ds-array-row">{values.map((value,index)=><span className={state(reveal,index<3?1:index<6?2:3)} key={`${index}-${value}`}><small>{index}</small><b>{value}</b></span>)}</div>
    <footer className={state(reveal,3)}><code>myList[7] ← 16</code><span>one identifier · same data type · index selects element</span></footer>
  </div>;
}

function TwoDimensional({reveal}:{reveal:number}){
  const rows=[[27,4,6],[19,8,11],[36,13,9],[42,7,18],[16,3,20],[89,5,12],[21,14,2],[16,10,17],[55,1,15]];
  return <div className="h10ds h10ds-matrix" aria-label="Two dimensional array row and column addressing">
    <header className={state(reveal,1)}><b>myArray</b><code>ARRAY[0:8,0:2] OF INTEGER</code></header>
    <div className="h10ds-matrix-grid">{rows.flatMap((row,r)=>row.map((value,c)=><span className={state(reveal,r<3?1:r<6?2:3)} key={`${r}-${c}`}><small>[{r},{c}]</small><b>{value}</b></span>))}</div>
    <footer className={state(reveal,3)}><span>first index = row · second index = column</span><code>myArray[7,0] ← 16</code></footer>
  </div>;
}

function LinearSearch({reveal}:{reveal:number}){
  return <div className="h10ds h10ds-search" aria-label="Linear search pointer and found flag">
    <section className={state(reveal,1)}><b>START</b><span>index ← lowerBound</span><span>found ← FALSE</span></section><i>→</i>
    <div className={`h10ds-decision ${state(reveal,2)}`}><b>myList[index] = item?</b></div>
    <div className="h10ds-search-results"><span className={state(reveal,2)}>YES → found ← TRUE</span><span className={state(reveal,3)}>NO → index ← index + 1</span></div>
    <footer className={state(reveal,3)}><code>UNTIL (found = TRUE) OR (index &gt; upperBound)</code></footer>
  </div>;
}

function BubbleSort({reveal}:{reveal:number}){
  const start=[27,19,36,42,16,89,21,16,55];
  const after=[19,27,36,16,42,21,16,55,89];
  return <div className="h10ds h10ds-bubble" aria-label="Bubble sort adjacent comparison and shrinking top">
    <header className={state(reveal,1)}><b>PASS 1</b><span>compare adjacent elements from lowerBound to top - 1</span></header>
    <div className="h10ds-bubble-row">{start.map((value,index)=><span className={state(reveal,1)} key={`a-${index}`}>{value}</span>)}</div>
    <div className={`h10ds-swap-note ${state(reveal,2)}`}><b>IF left &gt; right → SWAP</b><span>use temp while exchanging values</span></div>
    <div className="h10ds-bubble-row">{after.map((value,index)=><span className={state(reveal,index===8?3:2)} key={`b-${index}`}>{value}</span>)}</div>
    <footer className={state(reveal,3)}><span>89 has reached its final position</span><code>top ← top - 1</code></footer>
  </div>;
}

function Files({reveal}:{reveal:number}){
  return <div className="h10ds h10ds-files" aria-label="Text file read write append processing">
    <section className={state(reveal,1)}><b>WRITE</b><code>OPEN file FOR WRITE</code><code>WRITEFILE</code><small>existing data overwritten</small></section>
    <section className={state(reveal,2)}><b>APPEND</b><code>OPEN file FOR APPEND</code><code>WRITEFILE</code><small>add at end</small></section>
    <section className={state(reveal,2)}><b>READ</b><code>OPEN file FOR READ</code><code>READFILE</code><small>process one line at a time</small></section>
    <footer className={state(reveal,3)}><code>EOF(file)</code><span>controls read loop</span><code>CLOSEFILE file</code></footer>
  </div>;
}

function Pointers({reveal}:{reveal:number}){
  return <div className="h10ds h10ds-pointers" aria-label="Pointer roles for stack queue and linked list">
    <section className={state(reveal,1)}><b>STACK</b><div className="h10ds-stack-mini"><span>topPointer</span><i>↓</i><em>item</em><em>item</em><em>base</em></div><small>basePointer · topPointer</small></section>
    <section className={state(reveal,2)}><b>QUEUE</b><div className="h10ds-queue-mini"><span>frontPointer →</span><em>A</em><em>B</em><em>C</em><span>← rearPointer</span></div><small>frontPointer · rearPointer</small></section>
    <section className={state(reveal,3)}><b>LINKED LIST</b><div className="h10ds-list-mini"><em>A | →</em><em>B | →</em><em>C | NULL</em></div><small>startPointer + next-node pointers</small></section>
  </div>;
}

function Stack({reveal}:{reveal:number}){
  return <div className="h10ds h10ds-stack" aria-label="Stack push and pop operations">
    <div className="h10ds-stack-column"><span className={state(reveal,3)}>92</span><span className={state(reveal,2)}>67</span><span className={state(reveal,1)}>existing item</span><span className={state(reveal,1)}>base item</span></div>
    <div className="h10ds-stack-controls"><section className={state(reveal,1)}><b>PUSH</b><span>check capacity</span><span>increment topPointer</span><span>store item</span></section><section className={state(reveal,2)}><b>POP</b><span>check empty</span><span>copy top item</span><span>decrement topPointer</span></section></div>
    <footer className={state(reveal,3)}>LIFO · basePointer stays fixed · topPointer moves</footer>
  </div>;
}

function CircularQueue({reveal}:{reveal:number}){
  const cells=['A','B','C','','','','D','E','F','G'];
  return <div className="h10ds h10ds-cqueue" aria-label="Circular queue front and rear pointer wrap around">
    <div className="h10ds-ring">{cells.map((value,index)=><span className={state(reveal,index<4?1:index<7?2:3)} key={index}><small>{index+1}</small><b>{value||'·'}</b></span>)}</div>
    <section className={state(reveal,2)}><b>DEQUEUE</b><span>read front item</span><span>advance / wrap frontPointer</span><span>queueLength - 1</span></section>
    <section className={state(reveal,3)}><b>ENQUEUE</b><span>advance / wrap rearPointer</span><span>store item</span><span>queueLength + 1</span></section>
    <footer className={state(reveal,3)}>FIFO · wrap-around reuses free array positions without shifting all items.</footer>
  </div>;
}

function LinkedListStart({reveal}:{reveal:number}){
  return <div className="h10ds h10ds-linked" aria-label="Empty linked list and free list heap">
    <section className={state(reveal,1)}><b>USED LIST</b><span>startPointer = -1</span><small>empty</small></section>
    <section className={state(reveal,2)}><b>FREE-LIST HEAP</b><div className="h10ds-free-chain"><span>0 → 1</span><span>1 → 2</span><span>2 → 3</span><span>…</span><span>11 → -1</span></div><small>heapPointer = 0</small></section>
    <footer className={state(reveal,3)}>The pointer array can link used nodes or free nodes depending on each location's current role.</footer>
  </div>;
}

function LinkedInsert({reveal}:{reveal:number}){
  return <div className="h10ds h10ds-insert" aria-label="Linked list front insertion using heap pointer">
    <section className={state(reveal,1)}><b>BEFORE</b><div><em>startPointer</em><span>→ 37 → NULL</span></div><small>heapPointer points to next free location</small></section>
    <i>→</i>
    <section className={state(reveal,2)}><b>TAKE FREE NODE</b><span>store 45</span><span>new node points to old start</span><span>advance heapPointer</span></section>
    <i>→</i>
    <section className={state(reveal,3)}><b>AFTER</b><div><em>startPointer</em><span>→ 45 → 37 → NULL</span></div></section>
  </div>;
}

export function Chapter10DataStructureVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h10-1011-basic-types': return <BasicTypes reveal={reveal}/>;
    case 'h10-1012-records': return <Records reveal={reveal}/>;
    case 'h10-1021-1d-arrays': return <OneDimensional reveal={reveal}/>;
    case 'h10-1022-2d-arrays': return <TwoDimensional reveal={reveal}/>;
    case 'h10-1023-linear-search-core': return <LinearSearch reveal={reveal}/>;
    case 'h10-1024-bubble-algorithm': return <BubbleSort reveal={reveal}/>;
    case 'h10-103-files': return <Files reveal={reveal}/>;
    case 'h10-104-pointers': return <Pointers reveal={reveal}/>;
    case 'h10-1041-stack': return <Stack reveal={reveal}/>;
    case 'h10-1042-queue-circular': return <CircularQueue reveal={reveal}/>;
    case 'h10-1043-linked-list-start': return <LinkedListStart reveal={reveal}/>;
    case 'h10-1043-add-first-two': return <LinkedInsert reveal={reveal}/>;
    default: return null;
  }
}
