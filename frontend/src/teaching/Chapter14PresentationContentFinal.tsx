import type { LessonPresentationBeat } from './lesson-experience-model';
import { Chapter14PresentationContentV4 } from './Chapter14PresentationContentV4';

type Props={beat:LessonPresentationBeat;reveal:number};
const visible=(reveal:number,step:number)=>reveal>=step?'is-visible':'';

type NetworkNode='CA'|'A'|'R2'|'R6'|'R1'|'R5'|'R8'|'R3'|'R7'|'R9'|'R4'|'R10'|'B'|'CB';
const nodes:Record<NetworkNode,readonly [number,number]>={
  CA:[60,40],A:[60,170],R2:[205,100],R6:[205,245],R1:[340,55],R5:[365,145],R8:[365,255],R3:[535,85],R7:[560,185],R9:[700,275],R4:[735,90],R10:[835,220],B:[1010,170],CB:[1010,40],
};
const edges:[NetworkNode,NetworkNode][]=[
  ['CA','A'],['A','R2'],['A','R6'],['R2','R1'],['R2','R5'],['R2','R6'],['R6','R5'],['R6','R8'],['R1','R3'],['R5','R3'],['R5','R8'],['R3','R7'],['R3','R4'],['R8','R7'],['R8','R9'],['R7','R4'],['R7','R10'],['R7','R9'],['R9','R10'],['R4','R10'],['R4','B'],['R10','B'],['B','CB'],
];
const packetRoutes:{label:string;packet:number;nodes:NetworkNode[];display:string}[]=[
  {label:'P1',packet:1,nodes:['CA','A','R2','R5','R8','R7','R10','B','CB'],display:'router A → R2 → R5 → R8 → R7 → R10 → router B'},
  {label:'P2',packet:2,nodes:['CA','A','R6','R8','R9','R10','B','CB'],display:'router A → R6 → R8 → R9 → R10 → router B'},
  {label:'P3',packet:3,nodes:['CA','A','R2','R1','R3','R4','R10','B','CB'],display:'router A → R2 → R1 → R3 → R4 → R10 → router B'},
  {label:'P4',packet:4,nodes:['CA','A','R6','R5','R3','R7','R10','B','CB'],display:'router A → R6 → R5 → R3 → R7 → R10 → router B'},
];
const circuitRoute:NetworkNode[]=['CA','A','R2','R5','R8','R7','R10','B','CB'];
const points=(route:NetworkNode[])=>route.map(name=>nodes[name].join(',')).join(' ');

function Edges(){return <>{edges.map(([a,b])=><line key={`${a}-${b}`} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} className="source-base"/>)}</>}
function NodeLabels(){return <>{(Object.entries(nodes) as [NetworkNode,readonly [number,number]][]).map(([name,[x,y]])=>{
  const endpoint=name==='CA'||name==='CB';
  const label=name==='CA'?'computer A':name==='CB'?'computer B':name==='A'?'router A':name==='B'?'router B':name;
  return <g key={name} transform={`translate(${x} ${y})`} className={endpoint?'endpoint':'router'}>{endpoint?<rect x="-38" y="-17" width="76" height="34" rx="7"/>:<circle r={name==='A'||name==='B'?25:20}/>}<text y="5">{label}</text></g>;
})}</>}

function SourceNetwork({mode,reveal,broken=false}:{mode:'circuit'|'packet';reveal:number;broken?:boolean}){
  return <div className={`h14m-content-v2 h14d-packet-network h14final-network h14final-network--${mode}`} aria-label={mode==='circuit'?'Figure 14.7 dedicated circuit':'Figure 14.8 packet switching'}>
    <svg viewBox="0 0 1070 330" role="img">
      <Edges/>
      {mode==='circuit'?<polyline points={points(circuitRoute)} className={`source-circuit ${visible(reveal,1)} ${broken?'is-broken':''}`}/>:packetRoutes.map(route=><polyline key={route.label} points={points(route.nodes)} className={`source-packet p${route.packet} ${visible(reveal,route.packet)}`}/>)}
      <NodeLabels/>
    </svg>
    {mode==='circuit'?<footer className="h14final-circuit-footer">
      <div><b>EXACT SOURCE CONNECTIONS</b><span>A–R2 → R2–R5 → R5–R8 → R8–R7 → R7–R10 → R10–B</span></div>
      <div><b>ENDPOINTS</b><span>computer A → router A → dedicated route → router B → computer B</span></div>
      <div><b>MAIN USES</b><span>Public telephone networks, private telephone networks and private data networks.</span></div>
      <p>{broken?'A failure/fault on the dedicated line leaves no alternative routing for the established circuit.':'All packets/frames follow this single route and communication takes place provided device B is not busy.'}</p>
    </footer>:<footer>
      <div>{packetRoutes.map(route=><span data-packet={route.packet} key={route.label}><b>{route.label}</b>{route.display}</span>)}</div>
      <p>Each packet follows its own path. Routing selection depends on the number of datagram packets waiting to be processed at each node/router; the shortest path available is selected. Packets may arrive in a different order and are reassembled at the destination.</p>
    </footer>}
  </div>;
}

function TransportSourceComplete({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  return <div className="h14final-transport">
    <Chapter14PresentationContentV4 beat={beat} reveal={reveal}/>
    <aside className="h14f-source-strip h14d-source-strip">
      <header><span>HODDER p.333</span><strong>TRANSPORT LAYER · COMPLETE SOURCE FUNCTION</strong></header>
      <div>
        <section><b>REGULATE</b><p>The transport layer regulates network connections and breaks data into packets before they are sent to the internet/network layer.</p></section>
        <section><b>SEQUENCE + ERRORS</b><p>It ensures packets arrive in sequence and without errors by exchanging acknowledgements and retransmitting packets if they become lost or corrupted.</p></section>
        <section><b>PROTOCOL FAMILY</b><p>The source names TCP, UDP and SCTP, then states that this chapter considers TCP in detail.</p></section>
        <section><b>TCP / PAR</b><p>TCP provides safe delivery; positive acknowledgement with re-transmission automatically re-sends a packet when a positive acknowledgement is not received.</p></section>
      </div>
    </aside>
  </div>;
}

export function Chapter14PresentationContentFinal({beat,reveal}:Props){
  if(beat.id==='h14p-141-transport-family')return <TransportSourceComplete beat={beat} reveal={reveal}/>;
  if(beat.id==='h14p-142-circuit-route')return <SourceNetwork mode="circuit" reveal={reveal}/>;
  if(beat.id==='h14p-142-circuit-failure')return <SourceNetwork mode="circuit" reveal={Math.max(1,reveal)} broken/>;
  if(beat.id==='h14p-142-packet-route')return <SourceNetwork mode="packet" reveal={reveal}/>;
  return <Chapter14PresentationContentV4 beat={beat} reveal={reveal}/>;
}
