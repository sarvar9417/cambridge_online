import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter19-algorithms-visuals.css';

export const CHAPTER_19_ALGORITHM_VISUAL_IDS = [
  'h19-1911-linear-search','h19-1911-binary-search','h19-1912-bubble-sort','h19-1912-insertion-sort',
  'h19-1913-stack','h19-1913-queue','h19-1913-linked-list-find','h19-1913-linked-list-insert',
  'h19-1913-linked-list-delete','h19-1913-binary-tree-model','h19-1913-binary-tree-find','h19-1913-graphs',
  'h19-1914-dictionary','h19-1915-big-o-time','h19-1921-recursion-basics','h19-1921-factorial-trace','h19-1922-compiler-stack',
] as const;

export function hasChapter19AlgorithmVisual(beat:LessonPresentationBeat){return CHAPTER_19_ALGORITHM_VISUAL_IDS.includes(beat.slideId as never);}
const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function Search({reveal,binary=false}:{reveal:number;binary?:boolean}){
  const values=[12,19,27,36,42,55,67];
  return <div className="h19alg h19alg-search" aria-label={binary?'Binary search':'Linear search'}>
    <div className="h19alg-array">{values.map((v,i)=><span key={v} className={state(reveal,binary?(i===3?1:i>3?2:3):(i<3?1:i<5?2:3))}>{v}<small>{i}</small></span>)}</div>
    <footer className={state(reveal,3)}>{binary?'BINARY SEARCH: sorted data · compare middle · discard half · O(log n)':'LINEAR SEARCH: inspect in sequence until match/end · O(n)'}</footer>
  </div>;
}

function Sort({reveal,insertion=false}:{reveal:number;insertion?:boolean}){
  return <div className="h19alg h19alg-sort" aria-label={insertion?'Insertion sort':'Bubble sort'}>
    <section className={state(reveal,1)}><b>START</b><span>27 · 19 · 36 · 16</span></section><i>→</i>
    <section className={state(reveal,2)}><b>{insertion?'BUILD SORTED LEFT PART':'COMPARE ADJACENT'}</b><span>{insertion?'insert current item into correct position':'swap when left > right'}</span></section><i>→</i>
    <section className={state(reveal,3)}><b>SORTED</b><span>16 · 19 · 27 · 36</span></section>
  </div>;
}

function Stack({reveal}:{reveal:number}){return <div className="h19alg h19alg-stack" aria-label="Stack LIFO push pop"><div className={`h19alg-stackbox ${state(reveal,1)}`}><span>TOP → 42</span><span>27</span><span>19</span><span>BASE → 12</span></div><section className={state(reveal,2)}><b>PUSH</b><span>add at top</span></section><section className={state(reveal,3)}><b>POP</b><span>remove top</span><small>LIFO</small></section></div>}
function Queue({reveal}:{reveal:number}){return <div className="h19alg h19alg-queue" aria-label="Circular queue FIFO"><section className={state(reveal,1)}><b>FRONT POINTER</b><span>oldest item</span></section><div className={`h19alg-queue-ring ${state(reveal,2)}`}>12 → 19 → 27 → 36 ↺</div><section className={state(reveal,3)}><b>REAR POINTER</b><span>newest item</span></section><footer className={state(reveal,3)}>ENQUEUE at rear · DEQUEUE at front · CIRCULAR QUEUE reuses freed array positions · FIFO</footer></div>}

function Linked({reveal,mode}:{reveal:number;mode:'find'|'insert'|'delete'}){
  return <div className="h19alg h19alg-linked" aria-label={`Linked list ${mode}`}>
    <div className={`h19alg-pointer ${state(reveal,1)}`}><b>startPointer</b><span>→ 3</span></div>
    <div className="h19alg-nodes"><section className={state(reveal,1)}><b>[3] 19</b><span>next → 7</span></section><section className={state(reveal,2)}><b>[7] 27</b><span>next → 1</span></section><section className={state(reveal,2)}><b>[1] 42</b><span>next → nullPointer</span></section></div>
    <footer className={state(reveal,3)}>{mode==='find'?'FIND: follow next pointers until item or nullPointer.':mode==='insert'?'INSERT: take node from heapStartPointer, adjust links, update startPointer when needed.':'DELETE: bypass target node, return released location to free-list heap.'}</footer>
  </div>;
}

function Tree({reveal,find=false}:{reveal:number;find?:boolean}){
  return <div className="h19alg h19alg-tree" aria-label={find?'Binary tree find':'Binary tree model'}>
    <div className={`h19alg-tree-node root ${state(reveal,1)}`}>42<br/><small>ROOT</small></div>
    <div className="h19alg-tree-row"><div className={`h19alg-tree-node ${state(reveal,2)}`}>19</div><div className={`h19alg-tree-node ${state(reveal,2)}`}>67</div></div>
    <div className="h19alg-tree-row leaves"><div className={`h19alg-tree-node ${state(reveal,3)}`}>12</div><div className={`h19alg-tree-node ${state(reveal,3)}`}>27</div><div className={`h19alg-tree-node ${state(reveal,3)}`}>55</div><div className={`h19alg-tree-node ${state(reveal,3)}`}>89</div></div>
    <footer className={state(reveal,3)}>{find?'FIND: target < node → left; target > node → right; stop at match or null pointer.':'ROOT at top · LEAF has no children · left subtree values are smaller, right subtree values larger.'}</footer>
  </div>;
}

function Graph({reveal}:{reveal:number}){return <div className="h19alg h19alg-graph" aria-label="Graph vertices edges paths cycles"><div className={`h19alg-vertex ${state(reveal,1)}`}>A</div><span className={state(reveal,1)}>EDGE</span><div className={`h19alg-vertex ${state(reveal,2)}`}>B</div><span className={state(reveal,2)}>EDGE</span><div className={`h19alg-vertex ${state(reveal,3)}`}>C</div><footer className={state(reveal,3)}>GRAPH = vertices + edges · PATH = sequence of connected vertices · CYCLE returns to its starting vertex.</footer></div>}
function Dictionary({reveal}:{reveal:number}){return <div className="h19alg h19alg-dict" aria-label="Dictionary key value pairs"><section className={state(reveal,1)}><b>KEY</b><span>"Uzbekistan"</span></section><i>→</i><section className={state(reveal,2)}><b>VALUE</b><span>"Tashkent"</span></section><footer className={state(reveal,3)}>DICTIONARY operations use a unique KEY to store, retrieve, update or remove its associated VALUE.</footer></div>}

function BigO({reveal}:{reveal:number}){return <div className="h19alg h19alg-bigo" aria-label="Big O time complexity growth"><section className={state(reveal,1)}><b>O(1)</b><span>constant</span></section><section className={state(reveal,1)}><b>O(log n)</b><span>binary search</span></section><section className={state(reveal,2)}><b>O(n)</b><span>linear growth</span></section><section className={state(reveal,3)}><b>O(n²)</b><span>nested / quadratic growth</span></section><footer className={state(reveal,3)}>BIG O compares how TIME or SPACE requirements grow as input size n increases.</footer></div>}

function Recursion({reveal}:{reveal:number}){return <div className="h19alg h19alg-rec" aria-label="Recursion base case general case winding unwinding"><section className={state(reveal,1)}><b>GENERAL CASE</b><span>function calls itself with a smaller problem</span></section><i>→</i><section className={state(reveal,2)}><b>BASE CASE</b><span>stops further recursive calls</span></section><i>→</i><section className={state(reveal,3)}><b>UNWINDING</b><span>return values flow back through saved calls</span></section><footer className={state(reveal,3)}>WINDING builds pending calls; missing/incorrect base case risks STACK OVERFLOW.</footer></div>}
function Factorial({reveal}:{reveal:number}){return <div className="h19alg h19alg-factorial" aria-label="Recursive factorial trace"><section className={state(reveal,1)}><code>fact(4)</code><span>4 × fact(3)</span></section><section className={state(reveal,1)}><code>fact(3)</code><span>3 × fact(2)</span></section><section className={state(reveal,2)}><code>fact(2)</code><span>2 × fact(1)</span></section><section className={state(reveal,2)}><code>fact(1)</code><span>BASE CASE → 1</span></section><footer className={state(reveal,3)}>UNWIND: 1 → 2 → 6 → 24. The same recursion ideas also apply to examples such as FIBONACCI.</footer></div>}
function CompilerStack({reveal}:{reveal:number}){return <div className="h19alg h19alg-callstack" aria-label="Compiler recursion call stack return addresses"><div className={`h19alg-stackbox ${state(reveal,1)}`}><span>fact(1) · return address</span><span>fact(2) · local n=2</span><span>fact(3) · local n=3</span><span>fact(4) · local n=4</span></div><section className={state(reveal,2)}><b>CALL STACK</b><span>stores parameters, local variables and RETURN ADDRESSES</span></section><footer className={state(reveal,3)}>Each recursive call gets its own stack frame; returns remove frames during unwinding.</footer></div>}

export function Chapter19AlgorithmVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h19-1911-linear-search': return <Search reveal={reveal}/>; case 'h19-1911-binary-search': return <Search reveal={reveal} binary/>;
    case 'h19-1912-bubble-sort': return <Sort reveal={reveal}/>; case 'h19-1912-insertion-sort': return <Sort reveal={reveal} insertion/>;
    case 'h19-1913-stack': return <Stack reveal={reveal}/>; case 'h19-1913-queue': return <Queue reveal={reveal}/>;
    case 'h19-1913-linked-list-find': return <Linked reveal={reveal} mode="find"/>; case 'h19-1913-linked-list-insert': return <Linked reveal={reveal} mode="insert"/>; case 'h19-1913-linked-list-delete': return <Linked reveal={reveal} mode="delete"/>;
    case 'h19-1913-binary-tree-model': return <Tree reveal={reveal}/>; case 'h19-1913-binary-tree-find': return <Tree reveal={reveal} find/>;
    case 'h19-1913-graphs': return <Graph reveal={reveal}/>; case 'h19-1914-dictionary': return <Dictionary reveal={reveal}/>;
    case 'h19-1915-big-o-time': return <BigO reveal={reveal}/>; case 'h19-1921-recursion-basics': return <Recursion reveal={reveal}/>;
    case 'h19-1921-factorial-trace': return <Factorial reveal={reveal}/>; case 'h19-1922-compiler-stack': return <CompilerStack reveal={reveal}/>;
    default:return null;
  }
}
