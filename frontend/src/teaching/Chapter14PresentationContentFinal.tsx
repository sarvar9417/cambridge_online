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
  {label:'P3',packet:3,nodes:['CA','A','R2','R1','R3','R4','B','CB'],display:'router A → R2 → R1 → R3 → R4 → router B'},
  {label:'P4',packet:4,nodes:['CA','A','R6','R5','R3','R7','R10','B','CB'],display:'router A → R6 → R5 → R3 → R7 → R10 → router B'},
];
const circuitRoute:NetworkNode[]=['CA','A','R2','R5','R8','R7','R10','B','CB'];
const points=(route:NetworkNode[])=>route.map(name=>nodes[name].join(',')).join(' ');

function Edges(){return <>{edges.map(([a,b])=><line key={`${a}-${b}`} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} className="source-base"/>)}</>}
function NodeLabels({mode}:{mode:'circuit'|'packet'}){return <>{(Object.entries(nodes) as [NetworkNode,readonly [number,number]][]).map(([name,[x,y]])=>{
  const endpoint=name==='CA'||name==='CB';
  const label=name==='CA'?(mode==='circuit'?'device A':'computer A'):name==='CB'?(mode==='circuit'?'device B':'computer B'):name==='A'?'router A':name==='B'?'router B':name;
  return <g key={name} transform={`translate(${x} ${y})`} className={endpoint?'endpoint':'router'}>{endpoint?<rect x="-38" y="-17" width="76" height="34" rx="7"/>:<circle r={name==='A'||name==='B'?25:20}/>}<text y="5">{label}</text></g>;
})}</>}

function SourceNetwork({mode,reveal,broken=false}:{mode:'circuit'|'packet';reveal:number;broken?:boolean}){
  return <div className={`h14m-content-v2 h14d-packet-network h14final-network h14final-network--${mode}`} aria-label={mode==='circuit'?'Figure 14.7 dedicated circuit':'Figure 14.8 packet switching'}>
    <svg viewBox="0 0 1070 330" role="img">
      <Edges/>
      {mode==='circuit'?<polyline points={points(circuitRoute)} className={`source-circuit ${visible(reveal,1)} ${broken?'is-broken':''}`}/>:packetRoutes.map(route=><polyline key={route.label} points={points(route.nodes)} className={`source-packet p${route.packet} ${visible(reveal,route.packet)}`}/>)}
      <NodeLabels mode={mode}/>
    </svg>
    {mode==='circuit'?<footer className="h14final-circuit-footer">
      <div><b>EXACT SOURCE CONNECTIONS</b><span>A–R2 → R2–R5 → R5–R8 → R8–R7 → R7–R10 → R10–B</span></div>
      <div><b>ENDPOINTS</b><span>device A → router A → dedicated route → router B → device B</span></div>
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

const ethernetDataFields=[
  ['Destination','6 bytes','destination MAC address'],
  ['Source','6 bytes','source MAC address'],
  ['Ethernet type / length','2 bytes','length when frame length ≤ 1539; otherwise Ethernet type'],
  ['Actual message','46–1500 bytes','payload'],
  ['Frame check sequence','4 bytes','includes checksum for integrity checking'],
] as const;
function EthernetFrameSourceComplete({reveal}:{reveal:number}){
  return <div className="h14m-content-v2 h14final-ethernet" aria-label="Figure 14.5 source-complete Ethernet frame">
    <header><span>HODDER pp.334–335 · FIGURE 14.5</span><strong>Ethernet frame: outer transmission structure and the nested Ethernet data block</strong></header>
    <main>
      <section className={`outer preamble ${visible(reveal,1)}`}><b>PRE-AMBLE</b><span>8 bytes</span></section>
      <section className={`outer start ${visible(reveal,1)}`}><b>START FRAME</b><span>1 byte</span></section>
      <section className={`ethernet-data ${visible(reveal,2)}`}><header><b>ETHERNET DATA</b><span>64–1518 bytes</span></header><div>{ethernetDataFields.map(([name,size,purpose],i)=><section className={visible(reveal,Math.min(i+2,5))} key={name}><strong>{name}</strong><b>{size}</b><small>{purpose}</small></section>)}</div></section>
      <section className={`outer gap ${visible(reveal,5)}`}><b>INTERPACKET GAP</b><span>12 bytes</span></section>
    </main>
    <footer><span>Broadcast destination: <b>FF:FF:FF:FF:FF:FF</b>.</span><span>Source note: VLAN wording says the Ethernet data size increases from 1539 bytes to around 9000 bytes per frame.</span></footer>
  </div>;
}

const coreHeaderFields=[
  ['SOURCE IP','32 bits','Where the packet came from.'],['DESTINATION IP','32 bits','Where the packet must go.'],['HOP NUMBER','8 bits','Limits how long a lost packet can circulate.'],['PACKET LENGTH','16 bits','Length of the packet in bytes.'],['NUMBER OF PACKETS','16 bits','How many packets make up the message.'],['SEQUENCE NUMBER','16 bits','Allows correct reassembly order.'],['HEADER CHECKSUM','16 bits','Checks header integrity.'],
] as const;
function PacketHeaderCoreExact({reveal}:{reveal:number}){
  return <div className="h14m-content-v2 h14final-header-core" aria-label="Figure 14.9 TCP IP packet header">
    <header><span>HODDER p.341 · FIGURE 14.9</span><strong>TCP/IP packet header: the fields the source highlights for routing and reassembly</strong></header>
    <main>{coreHeaderFields.map(([field,bits,purpose],i)=><section className={visible(reveal,Math.ceil((i+1)/2))} key={field}><b>{field}</b><strong>{bits}</strong><p>{purpose}</p></section>)}</main>
    <footer>The packet header travels with the message data. Routers examine destination information; the destination uses sequence/count information to rebuild the message.</footer>
  </div>;
}

const extendedHeaderFields=[
  ['PROTOCOL VERSION','4 bits','IPv4 / IPv6'],['HEADER LENGTH','4 bits','multiples of four; 6 → 24 bytes'],['PRIORITY','8 bits','selects packet priority / queue'],['PACKET LENGTH','16 bits','packet length in bytes'],['FRAGMENT FLAGS','3 bits','includes DF and MF'],['FRAGMENT OFFSET','13 bits','position in original packet'],['CURRENT HOP','8 bits','decremented at each router'],['PACKET COUNT','16 bits','number of packets in message'],['SEQUENCE','16 bits','reassembly order'],['TRANSPORT PROTOCOL','8 bits','TCP or UDP'],['HEADER CHECKSUM','16 bits','error-check value'],['SOURCE IP','32 bits','source address'],['DESTINATION IP','32 bits','destination address'],
] as const;
function PacketHeaderExtendedExact({reveal}:{reveal:number}){
  return <div className="h14m-content-v2 h14final-header-extended" aria-label="General packet header fields and bit lengths">
    <header><span>HODDER p.341 · GENERAL HEADER</span><strong>Every source-listed header field, bit length and purpose</strong></header>
    <main>{extendedHeaderFields.map(([field,bits,purpose],i)=><section className={visible(reveal,Math.ceil((i+1)/3))} key={field}><b>{field}</b><strong>{bits}</strong><small>{purpose}</small></section>)}</main>
    <footer><b>Fragmentation:</b> DF = do not fragment; MF = more fragments follow. <b>Header-length example:</b> value 6 means 6 × 4 = 24 bytes.</footer>
  </div>;
}

function Check141SourceComplete({reveal}:{reveal:number}){
  const checks=[
    ['PROTOCOL','Why must sender and receiver agree the same protocol?','They need agreed rules so both sides interpret communication correctly; parity even/odd is the source example.'],
    ['TCP/IP STACK','Give sending and receiving orders.','Send: Application → Transport → Internet → Link. Receive: Link → Internet → Transport → Application.'],
    ['HTTP','Explain the request journey.','URL → HTTP(S) → TCP / port 80 in the source sequence → DNS lookup → acknowledgement → HTML/resources → browser display.'],
    ['EMAIL','Distinguish SMTP/MIME from POP/IMAP.','SMTP pushes outgoing mail; MIME supports media/binary attachments; POP/IMAP pull incoming mail.'],
    ['ETHERNET','Why is IP still needed?','Ethernet is a local LAN protocol; external communication requires IP above Ethernet.'],
    ['BITTORRENT','How do pieces become distributed?','Torrent metadata + tracker locate peers; received pieces make peers sources; complete peers can seed.'],
  ] as const;
  return <div className="h14m-content-v2 h14final-check141"><header><span>14.1 · RETRIEVAL</span><strong>Six questions that cover the complete protocol section</strong></header><main>{checks.map(([topic,q,a],i)=><section className={visible(reveal,i+1)} key={topic}><b>{topic}</b><p>{q}</p><small>{a}</small></section>)}</main></div>;
}

function FinalChapterMap({reveal}:{reveal:number}){
  const items=[
    ['1','AGREEMENT','Protocols define shared communication rules.'],['2','LAYERS','TCP/IP decomposes communication into Application, Transport, Internet and Link.'],['3','APPLICATION','HTTP/FTP/email protocols match different communication tasks.'],['4','LOCAL DELIVERY','IP provides internetwork addressing/routing; Ethernet frames handle local delivery.'],['5','P2P','BitTorrent distributes pieces through peers, trackers, swarms and seeds.'],['6','SWITCHING','Circuit reserves one route; packet switching sends independent packets.'],['7','CONTROL','Hop, checksum/parity and priority protect/manage packet delivery.'],['8','ROUTING','Header + routing table determine next hop; destination reassembles the message.'],
  ] as const;
  return <div className="h14m-content-v2 h14final-recap"><header><span>CHAPTER 14 · COMPLETE MAP</span><strong>From agreed protocol to a reconstructed message</strong></header><main>{items.map(([n,title,text],i)=><section className={visible(reveal,Math.ceil((i+1)/2))} key={title}><b>{n}</b><div><strong>{title}</strong><p>{text}</p></div></section>)}</main></div>;
}

function FinalRoutingRetrieval({reveal}:{reveal:number}){
  const steps=[
    ['HEADER','Read destination IP, hop number and control fields.'],['ROUTING TABLE','Compare destination/network information with hops, metrics, gateway, netmask and interface.'],['NEXT ROUTER','Select the shortest/best available route and determine the next router.'],['MAC UPDATE','Add the next-router MAC address to the packet header.'],['FORWARD / DELETE','Forward; if no route is found or hop number = 0, delete the data package.'],['DESTINATION','Packets may arrive out of order; sequence information is used to reassemble them correctly.'],
  ] as const;
  return <div className="h14m-content-v2 h14final-routing-retrieval"><header><span>FINAL ROUTING RETRIEVAL · p.345 CONNECTION</span><strong>Explain the complete packet-routing journey without notes</strong></header><main>{steps.map(([title,text],i)=><section className={visible(reveal,i+1)} key={title}><b>{i+1}</b><div><strong>{title}</strong><p>{text}</p></div></section>)}</main><footer><span><b>WHY SEQUENCE?</b> Restore the original message order.</span><span><b>WHY HOP NUMBER?</b> Stop lost packets bouncing indefinitely and clogging the network.</span><span><b>WHY CHECKSUM?</b> Detect transmission errors and trigger re-send when values differ.</span></footer></div>;
}

export function Chapter14PresentationContentFinal({beat,reveal}:Props){
  if(beat.id==='h14p-141-transport-family')return <TransportSourceComplete beat={beat} reveal={reveal}/>;
  if(beat.id==='h14p-141-ethernet')return <EthernetFrameSourceComplete reveal={reveal}/>;
  if(beat.id==='h14p-141-check')return <Check141SourceComplete reveal={reveal}/>;
  if(beat.id==='h14p-142-circuit-route')return <SourceNetwork mode="circuit" reveal={reveal}/>;
  if(beat.id==='h14p-142-circuit-failure')return <SourceNetwork mode="circuit" reveal={Math.max(1,reveal)} broken/>;
  if(beat.id==='h14p-142-packet-route')return <SourceNetwork mode="packet" reveal={reveal}/>;
  if(beat.id==='h14p-142-header')return <PacketHeaderCoreExact reveal={reveal}/>;
  if(beat.id==='h14p-142-header-extended')return <PacketHeaderExtendedExact reveal={reveal}/>;
  if(beat.id==='h14p-142-recap')return <FinalChapterMap reveal={reveal}/>;
  if(beat.id==='h14p-142-recap-routing')return <FinalRoutingRetrieval reveal={reveal}/>;
  return <Chapter14PresentationContentV4 beat={beat} reveal={reveal}/>;
}
