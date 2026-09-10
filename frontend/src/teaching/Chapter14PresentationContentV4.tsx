import type { LessonPresentationBeat } from './lesson-experience-model';
import { Chapter14PresentationContentV3 } from './Chapter14PresentationContentV3';

type Props={beat:LessonPresentationBeat;reveal:number};
type Detail=[string,string];
const visible=(reveal:number,step:number)=>reveal>=step?'is-visible':'';

function DeepStrip({page,title,items}:{page:string;title:string;items:Detail[]}){
  return <aside className="h14f-source-strip h14d-source-strip" aria-label={`${title} deep source detail`}>
    <header><span>{page}</span><strong>{title}</strong></header>
    <div>{items.map(([label,text])=><section key={label}><b>{label}</b><p>{text}</p></section>)}</div>
  </aside>;
}

function ChapterObjectivesExact(){
  const items=[
    ['01','WHY PROTOCOLS','Explain why agreed protocols are needed during communication.'],
    ['02','STACK IMPLEMENTATION','Understand protocols implemented as a stack of layers.'],
    ['03','TCP/IP','Know Application, Transport, Internet and Link; explain each layer and how a message moves host-to-host across the internet.'],
    ['04','APPLICATION PROTOCOLS','Explain HTTP, FTP, POP3/4, IMAP, SMTP and BitTorrent, including peer-to-peer file sharing.'],
    ['05','CIRCUIT SWITCHING','Explain circuit switching and its benefits and drawbacks.'],
    ['06','PACKET SWITCHING','Explain the benefits and drawbacks of packet switching.'],
    ['07','ROUTER','Explain the function of a router in packet switching.'],
    ['08','NETWORK DELIVERY','Explain how packet switching passes messages across a network, including the internet.'],
  ];
  return <div className="h14m-content-v2 h14d-objectives" aria-label="Hodder Chapter 14 learning objectives">
    <header><span>HODDER p.328 · IN THIS CHAPTER, YOU WILL LEARN ABOUT</span><strong>The complete Chapter 14 learning map</strong></header>
    <main>{items.map(([n,title,text])=><section key={n}><b>{n}</b><div><strong>{title}</strong><p>{text}</p></div></section>)}</main>
  </div>;
}

function ApplicationProtocolsExact(){
  const rows=[
    ['HTTP','Hypertext transfer protocol','Correct transfer of files that make up web pages on the World Wide Web.'],
    ['SMTP','Simple mail transfer protocol','Handles the sending of emails.'],
    ['POP3/4','Post office protocol','Handles the receiving of emails.'],
    ['IMAP','Internet message access protocol','Handles the receiving of emails.'],
    ['DNS','Domain name service','Used to find an IP address; the source gives sending email as an example.'],
    ['FTP','File transfer protocol','Table 14.1 says transferring messages and attachments; the following FTP section describes its task as file transfer over a network.'],
    ['RIP','Routing information protocol','Routers use it to exchange routing information over an IP network.'],
    ['SNMP','Simple network management protocol','Exchanges network-management information between management software and devices such as routers and servers.'],
  ];
  return <div className="h14m-content-v2 h14d-app-protocols" aria-label="Table 14.1 application layer protocols">
    <header><span>HODDER p.330 · TABLE 14.1</span><strong>Protocol</strong><b>Full name</b><b>Coursebook purpose</b></header>
    {rows.map(([protocol,name,purpose])=><section key={protocol}><strong>{protocol}</strong><span>{name}</span><p>{purpose}</p></section>)}
    <footer>The application layer contains programs such as browsers/server software, sends files to the transport layer, gives applications access to services used in other layers and defines the protocols used for data exchange.</footer>
  </div>;
}

function ExactProsCons({kind,reveal}:{kind:'circuit'|'packet';reveal:number}){
  const circuit:Detail[]=[
    ['The circuit is dedicated to the single transmission only.','It is not very flexible: it can send empty frames and has to use one dedicated line.'],
    ['The whole of the bandwidth is available.','Nobody else can use the circuit/channel even when it is idle.'],
    ['The data transfer rate is faster than with packet switching.','The circuit is always there whether or not it is used.'],
    ['Packets/frames arrive at the destination in the same order as sent.','A failure/fault on the dedicated line leaves no alternative routing.'],
    ['A packet cannot get lost because all packets follow in sequence along the same single route.','Dedicated channels require a greater bandwidth.'],
    ['It works better than packet switching in real-time applications.','Before actual transmission, the time required to establish a link can be long.'],
  ];
  const packet:Detail[]=[
    ['No need to tie up a communication line.','Packet-switching protocols can be more complex than circuit-switching protocols.'],
    ['Failed or faulty lines can be overcome by re-routing packets.','If a packet is lost, the sender must re-send it, which wastes time.'],
    ['Traffic usage is easy to expand.','It does not work well with real-time data streams.'],
    ['Charging contrast in the source: circuit switching uses distance and duration; packet switching uses duration of connectivity.','The circuit/channel has to share its bandwidth with other packets.'],
    ['High data transmission is possible with packet switching.','There is a delay at the destination while packets are reassembled.'],
    ['Packet switching always uses digital networks, so digital data is transmitted directly to the destination.','Large amounts of RAM may be needed to handle the data.'],
  ];
  const rows=kind==='circuit'?circuit:packet;
  return <div className="h14m-content-v2 h14c-proscons h14d-exact-proscons" aria-label={`${kind} switching source pros and cons`}>
    <header><strong>BENEFIT</strong><strong>DRAWBACK</strong></header>
    {rows.map(([benefit,drawback],index)=><section className={visible(reveal,index+1)} key={benefit}><p><i>+</i>{benefit}</p><p><i>−</i>{drawback}</p></section>)}
  </div>;
}

function ExactPacketBasics({reveal}:{reveal:number}){
  const original=['P1','P2','P3','P4'];
  const arrival=['P1','P4','P3','P2'];
  return <div className="h14m-content-v2 h14d-packet-order" aria-label="Figure 14.8 packet order and reassembly">
    <header><span>HODDER p.339 · FIGURE 14.8</span><strong>Four packets can travel independently and arrive in a different order</strong><p>Packet switching breaks a message into packets that can be sent independently from start point to end point; the destination must reassemble them into the correct order.</p></header>
    <main>
      <section className={visible(reveal,1)}><b>ORIGINAL ORDER</b><div>{original.map((p,i)=><span data-packet={i+1} key={p}>{p}</span>)}</div><small>The presentation labels the four source colours P1–P4 in the source's original order.</small></section>
      <i className={visible(reveal,2)}>independent routes ↓</i>
      <section className={visible(reveal,3)}><b>ARRIVAL ORDER</b><div>{arrival.map(p=><span data-packet={Number(p.slice(1))} key={p}>{p}</span>)}</div><small>Using those teaching labels, the coloured arrival order shown is P1 → P4 → P3 → P2.</small></section>
      <i className={visible(reveal,4)}>sequence information ↓</i>
      <section className={visible(reveal,5)}><b>REASSEMBLED</b><div>{original.map((p,i)=><span data-packet={i+1} key={p}>{p}</span>)}</div><small>The destination restores the correct order.</small></section>
    </main>
    <footer>Each packet follows its own path. Routing selection depends on the number of datagram packets waiting at each node/router; the shortest path available is selected.</footer>
  </div>;
}

type NetworkNode='CA'|'A'|'R2'|'R6'|'R1'|'R5'|'R8'|'R3'|'R7'|'R9'|'R4'|'R10'|'B'|'CB';
const sourceNodes:Record<NetworkNode,readonly [number,number]>={
  CA:[60,40],A:[60,170],R2:[205,100],R6:[205,245],R1:[340,55],R5:[365,145],R8:[365,255],R3:[535,85],R7:[560,185],R9:[700,275],R4:[735,90],R10:[835,220],B:[1010,170],CB:[1010,40],
};
const sourceEdges:[NetworkNode,NetworkNode][]=[
  ['CA','A'],['A','R2'],['A','R6'],['R2','R1'],['R2','R5'],['R2','R6'],['R6','R5'],['R6','R8'],['R1','R3'],['R5','R3'],['R5','R8'],['R3','R7'],['R3','R4'],['R8','R7'],['R8','R9'],['R7','R4'],['R7','R10'],['R7','R9'],['R9','R10'],['R4','R10'],['R4','B'],['R10','B'],['B','CB'],
];
const packetRoutes:{label:string;packet:number;nodes:NetworkNode[];display:string}[]=[
  {label:'P1',packet:1,nodes:['CA','A','R2','R5','R8','R7','R10','B','CB'],display:'router A → R2 → R5 → R8 → R7 → R10 → router B'},
  {label:'P2',packet:2,nodes:['CA','A','R6','R8','R9','R10','B','CB'],display:'router A → R6 → R8 → R9 → R10 → router B'},
  {label:'P3',packet:3,nodes:['CA','A','R2','R1','R3','R4','R10','B','CB'],display:'router A → R2 → R1 → R3 → R4 → R10 → router B'},
  {label:'P4',packet:4,nodes:['CA','A','R6','R5','R3','R7','R10','B','CB'],display:'router A → R6 → R5 → R3 → R7 → R10 → router B'},
];
const circuitRoute:NetworkNode[]=['CA','A','R2','R5','R8','R7','R10','B','CB'];
function pointsFor(nodes:NetworkNode[]){return nodes.map(name=>sourceNodes[name].join(',')).join(' ')}
function NetworkBase(){return <>{sourceEdges.map(([a,b])=><line key={`${a}-${b}`} x1={sourceNodes[a][0]} y1={sourceNodes[a][1]} x2={sourceNodes[b][0]} y2={sourceNodes[b][1]} className="source-base"/>)}{(Object.entries(sourceNodes) as [NetworkNode,readonly [number,number]][]).map(([name,[x,y]])=>{
  const endpoint=name==='CA'||name==='CB';
  const label=name==='CA'?'computer A':name==='CB'?'computer B':name==='A'?'router A':name==='B'?'router B':name;
  return <g key={name} transform={`translate(${x} ${y})`} className={endpoint?'endpoint':'router'}>{endpoint?<rect x="-38" y="-17" width="76" height="34" rx="7"/>:<circle r={name==='A'||name==='B'?25:20}/>}<text y="5">{label}</text></g>;
})}</>}

function ExactPacketNetwork({reveal}:{reveal:number}){
  return <div className="h14m-content-v2 h14d-packet-network" aria-label="Figure 14.8 reconstructed coloured routes">
    <svg viewBox="0 0 1070 330" role="img" aria-label="Four source-coloured packet routes from computer A through router A to router B and computer B">
      <NetworkBase/>
      {packetRoutes.map(route=><polyline key={route.label} points={pointsFor(route.nodes)} className={`source-packet p${route.packet} ${visible(reveal,route.packet)}`}/>)}
    </svg>
    <footer><div>{packetRoutes.map(route=><span data-packet={route.packet} key={route.label}><b>{route.label}</b>{route.display}</span>)}</div><p>The source shows four different coloured packet paths. P1–P4 are teaching labels assigned to those colours in their original order; all start at computer A/router A and finish at router B/computer B.</p></footer>
  </div>;
}

function ExactCircuitNetwork({reveal,broken=false}:{reveal:number;broken?:boolean}){
  return <div className="h14m-content-v2 h14d-packet-network h14d-circuit-network" aria-label="Figure 14.7 dedicated circuit route">
    <svg viewBox="0 0 1070 330" role="img" aria-label="Figure 14.7 source topology with dedicated route">
      <NetworkBase/>
      <polyline points={pointsFor(circuitRoute)} className={`source-circuit ${visible(reveal,1)} ${broken?'is-broken':''}`}/>
    </svg>
    <footer><div className="route-summary"><span><b>EXACT SOURCE CONNECTIONS</b>A–R2 → R2–R5 → R5–R8 → R8–R7 → R7–R10 → R10–B</span><span><b>ENDPOINTS</b>computer A → router A → dedicated route → router B → computer B</span></div><p>{broken?'A fault on the dedicated line leaves no alternative routing for this established circuit.':'All packets/frames follow the same route; communication takes place provided device B is not busy.'}</p></footer>
  </div>;
}

function BitTorrentProcessExact({reveal}:{reveal:number}){
  const steps=[
    ['CREATE TORRENT','Computer A creates a small .torrent file; metadata is data that describes/gives information about other data, here the file to be shared.'],
    ['SPLIT INTO PIECES','The actual file is split into equal pieces; source example: 20 MiB → 20 × 1 MiB.'],
    ['OBTAIN TORRENT','A peer (a client in the peer-to-peer file-sharing community) wanting the file first obtains the torrent and connects to the appropriate tracker.'],
    ['TRACKER','The tracker stores details of connected computers, including IP addresses, so peers can locate each other.'],
    ['BECOME A SOURCE','As soon as a peer receives a piece, that peer becomes a source for that piece.'],
    ['SEED','After the full download, making the file/pieces available makes the peer a seed; more seeds make downloading faster.'],
  ];
  return <div className="h14m-content-v2 h14c-bittorrent-process h14d-bittorrent-exact">
    <div className="torrent-file">MyVideoFile.torrent<small>METADATA</small></div>
    <div className="pieces">{['01','02','03','…','20'].map(p=><span key={p}>{p}</span>)}</div>
    <div className="tracker">TRACKER<small>peer details + IP addresses</small></div>
    <div className="peers">{['A · original','peer','peer','peer'].map((p,i)=><span key={p+i}>{p}</span>)}</div>
    <ol>{steps.map(([title,text],i)=><li className={visible(reveal,Math.min(i+1,5))} key={title}><b>{i+1}</b><span><strong>{title}</strong><small>{text}</small></span></li>)}</ol>
    <footer>Peers share directly rather than through a web server. Completed peers are requested to remain online to seed until all peers have the whole file; pieces may arrive non-sequentially and are rearranged.</footer>
  </div>;
}

function BitTorrentSwarmExact({reveal}:{reveal:number}){
  const peers=[
    ['O','original','uploading file'],
    ['S1','seed','seed'],['S2','seed','seed'],['S3','seed','seed'],['S4','seed','seed'],['S5','seed','seed'],['S6','seed','seed'],
    ['L1','leech','leech'],['L2','leech','leech'],
    ['N1','new','new'],['N2','new','new'],['N3','new','new'],
  ] as const;
  const positions=[[535,35],[700,55],[825,120],[860,230],[700,290],[370,290],[235,230],[210,120],[370,55],[350,165],[720,165],[535,300]] as const;
  return <div className="h14m-content-v2 h14d-swarm" aria-label="Figure 14.6 BitTorrent swarm with 12 peers">
    <header><span>HODDER pp.336–337 · FIGURE 14.6</span><strong>12 peers connected to one tracker</strong><p>1 original uploader · 6 seeds · 2 leeches · 3 new peers requesting the file</p></header>
    <svg viewBox="0 0 1070 340" role="img" aria-label="Tracker connected to twelve BitTorrent peers">
      {peers.map(([id,role],i)=>{const [x,y]=positions[i];return <line key={`line-${id}`} x1="535" y1="170" x2={x} y2={y} className={`swarm-link ${role} ${visible(reveal,Math.min(i%5+1,5))}`}/>})}
      <g transform="translate(535 170)" className="swarm-tracker"><ellipse rx="76" ry="34"/><text y="5">TRACKER</text></g>
      {peers.map(([id,role,note],i)=>{const [x,y]=positions[i];return <g key={id} transform={`translate(${x} ${y})`} className={`swarm-peer ${role} ${visible(reveal,Math.min(i%5+1,5))}`}><circle r="22"/><text y="4">{id}</text><text y="38" className="role-label">{note}</text></g>})}
    </svg>
    <footer>
      <div className="swarm-counts"><span><b>SEED</b>downloaded file/pieces and makes them available</span><span><b>AVAILABILITY</b>complete copies of torrent contents distributed amongst the swarm</span><span><b>SHARE RATIO</b>uploaded data ÷ downloaded data; &gt;1 positive, &lt;1 negative</span><span><b>LURKER</b>downloads files but supplies no new content</span></div>
      <p><b>LEECH · THREE COURSEBOOK WORDINGS</b> p.329: peer with negative feedback from swarm members; p.336 narrative: peer who logs off once the full download is complete; p.336 summary: peer with poor share ratio / negative impact. These source variations are preserved rather than silently reconciled.</p>
      <p><b>FIGURE LEGEND</b> upload/download pieces · download file only · upload file only · request for file download. More seeds make downloading faster; peers are requested to remain online to seed.</p>
    </footer>
  </div>;
}

function IpLinkExact(){
  return <div className="h14m-content-v2 h14d-iplink-exact" aria-label="Internet network data-link and physical network layers">
    <section><header>INTERNET / NETWORK LAYER · IP</header><ul><li>Identifies the intended network and host; the common protocol is IP.</li><li>Ensures correct routing of packets over the internet/network.</li><li>Is responsible for protocols when communicating between networks.</li><li>Takes a packet from transport and adds a header containing sender and recipient IP addresses.</li><li>Sends the IP packet/datagram to the data-link layer.</li></ul></section>
    <section><header>NETWORK / DATA-LINK LAYER</header><ul><li>Identifies and moves traffic across local segments.</li><li>Encapsulates IP packets/datagrams into frames for transmission.</li><li>Maps IP addresses to MAC (physical) addresses.</li><li>Ensures correct protocols are followed.</li><li>Identifies network protocols in the packet header and delivers packets to the network.</li></ul></section>
    <footer><b>PHYSICAL NETWORK LAYER</b><span>Specifies the requirements of the hardware to be used for the network.</span><strong>Ethernet is local; communication with external devices requires IP above Ethernet.</strong></footer>
  </div>;
}

function Activity14AExact({reveal}:{reveal:number}){
  const tasks=[
    ['1 · TCP/IP + EMAIL','a) Name the four TCP/IP layers. b) Name one protocol associated with each layer. c-i) Describe protocols used when sending/receiving email. c-ii) Explain the difference between SMTP and MIME when sending email.'],
    ['2 · ETHERNET','a) Define Ethernet. b) Describe the contents of an Ethernet frame. c) Explain how external devices can be communicated with when Ethernet itself does not provide communication outside a LAN.'],
    ['3 · BITTORRENT','a) Explain peer, swarm, tracker, leech and seed. b) Explain how it could be possible to deal with peers acting as leeches.'],
    ['4 · ROUTING','a) Describe the difference between a packet header and a routing table. b) Explain how the header and routing table are used to route a package.'],
    ['5 · VoIP','Explain how packet switching could be used for a video call and describe problems that might occur.'],
  ];
  return <div className="h14m-content-v2 h14d-activity14a" aria-label="Activity 14A complete task map"><header><span>HODDER p.343 · ACTIVITY 14A</span><strong>Five-part consolidation task</strong></header>{tasks.map(([label,text],i)=><section className={visible(reveal,i+1)} key={label}><b>{label}</b><p>{text}</p></section>)}</div>;
}

function deepSupplement(beatId:string){
  switch(beatId){
    case 'h14p-141-stack':return <DeepStrip page="HODDER pp.329–330" title="STACK IMPLEMENTATION" items={[
      ['DARPA','The source labels the four levels as DARPA (Defense Advanced Research Projects Agency) layers.'],
      ['STACK','The protocol set is implemented as a stack structure with several layers.'],
      ['SOFTWARE','Each of the four layers is implemented using software.'],
      ['DECOMPOSITION','Self-contained modules make development and hardware/software compatibility easier.'],
    ]}/>;
    case 'h14p-141-units':return <DeepStrip page="HODDER p.330" title="PACKET / ROUTER SOURCE NOTES" items={[
      ['ROUTER','A router connects to many other routers and decides where an arriving packet should be sent next.'],
      ['FRAME WARNING','Do not confuse data-link frames here with frames used for paging memory management in Chapter 16.'],
    ]}/>;
    case 'h14p-141-pop-imap':return <DeepStrip page="HODDER pp.332–333" title="EMAIL CONTEXT" items={[
      ['IMAP AGE','The coursebook describes IMAP as a more recent protocol than POP3/4.'],
      ['HTTP NOTE','It says POP3/4 and IMAP have really been superseded by increasing use of HTTP protocols.'],
      ['SMTP','SMTP remains used when transferring email between email servers.'],
    ]}/>;
    case 'h14p-141-tcp':return <DeepStrip page="HODDER pp.333–334" title="TCP / PAR / HOST" items={[
      ['SAFE DELIVERY','TCP is responsible for safe delivery by creating sufficient packets for transmission.'],
      ['PAR','Positive acknowledgement with re-transmission: automatically re-send when no positive acknowledgement is received.'],
      ['HOST-TO-HOST','TCP is connection-orientated and establishes an end-to-end connection between hosts using handshakes.'],
      ['HOSTS','Hosts can include clients and servers that send/receive data and provide services or apps.'],
    ]}/>;
    case 'h14p-141-ethernet-detail':return <DeepStrip page="HODDER pp.334–335" title="ETHERNET SOURCE DETAILS" items={[
      ['BROADCAST MAC','FF:FF:FF:FF:FF:FF can target every device, for example to advertise services, or be used if the destination MAC is unknown.'],
      ['SOURCE MAC','The source field contains the source computer MAC address in the usual 6-byte format.'],
      ['LOCAL CONTROL','Ethernet controls frame movement and avoids two or more devices transmitting simultaneously; external communication requires IP above Ethernet.'],
    ]}/>;
    case 'h14p-141-wireless':return <DeepStrip page="HODDER p.335" title="WIRELESS SCOPE + PURPOSE" items={[
      ['CSMA/CA ≠ CSMA/CD','The coursebook explicitly says CSMA/CA is a totally different concept from CSMA/CD.'],
      ['DCF','A WiFi device transmits only when a free channel is available; if acknowledgement is missing it assumes a collision will occur, waits a random time and tries again.'],
      ['WLAN NOTE','The source links this DCF/acknowledgement behaviour to security and integrity of data sent over a WLAN.'],
      ['BLUETOOTH','IEEE 802.15; numerous additional Bluetooth protocols are stated to be outside the scope of the textbook.'],
      ['WIMAX / WMAN','IEEE 802.16 was designed originally for wireless MANs (WMAN); fixed 802.16-2004, mobile 802.16-2005.'],
    ]}/>;
    case 'h14p-142-hop':return <DeepStrip page="HODDER p.340" title="WHY HOPPING EXISTS" items={[
      ['BOUNCING','Without a limit, lost packets can keep bouncing from router to router and clog the system.'],
      ['FINITE LIMIT','The finite hop allowance is determined by the network protocol and routing table being used.'],
      ['DECREMENT','Every router decreases the hop number by 1.'],
      ['DELETE','If the destination has not been reached and hop number = 0, delete at the next router.'],
    ]}/>;
    case 'h14p-142-packet-control':return <DeepStrip page="HODDER p.340" title="ERROR CHECK + PRIORITY" items={[
      ['CHECKSUM OR PARITY','Each packet contains an error-checking technique such as a checksum or parity check.'],
      ['CHECKSUM','Calculate and add to header; recalculate at destination; different values cause a re-send request.'],
      ['PRIORITY','A high priority value indicates which packet queue should be used.'],
    ]}/>;
    case 'h14p-142-header-extended':return <DeepStrip page="HODDER p.341" title="HEADER PRECISION" items={[
      ['VERSION · 4 BITS','Identifies protocol version; IPv4 and IPv6 are source examples.'],
      ['HEADER LENGTH · 4 BITS','Stored in multiples of four; value 6 → 6 × 4 = 24 bytes.'],
      ['PRIORITY · 8 BITS','Represents packet priority.'],
      ['PACKET LENGTH · 16 BITS','Identifies the length of the packet in bytes.'],
      ['FRAGMENTATION · 3 + 13 BITS','DF = do not fragment, MF = more fragments; 13-bit offset locates the fragment in the original packet.'],
      ['HOP · 8 BITS','Stores the current hop number.'],
      ['COUNT + SEQUENCE · 16 BITS EACH','Stores number of packets in the message and packet sequence number.'],
      ['TRANSPORT · 8 BITS','The source gives TCP and UDP as examples.'],
      ['CHECKSUM · 16 BITS','Stores the header checksum value.'],
      ['SOURCE + DESTINATION · 32 BITS EACH','Stores source IP address and destination IP address.'],
    ]}/>;
    case 'h14p-142-routing':return <DeepStrip page="HODDER pp.341–342" title="FIGURE 14.10 ROUTER DECISION" items={[
      ['COMPARE','Packet header is examined and compared with the routing table.'],
      ['NEXT ROUTER','The next router in the path is determined.'],
      ['NEW MAC','Once established, a new MAC address is added to the packet header.'],
      ['DELETE','If no route can be found or hop number = 0, the router deletes the data package.'],
    ]}/>;
    case 'h14p-142-routing-fields':return <DeepStrip page="HODDER p.341" title="ROUTING TABLE FIELD MEANING" items={[
      ['NUMBER OF HOPS','A route-distance/hop value used by the router.'],
      ['NEXT-ROUTER MAC','MAC address of the next router to which the packet is forwarded/hopped.'],
      ['METRICS','A cost is assigned to each available route so the most efficient route/path is found.'],
      ['NETWORK DESTINATION','Network ID or pathway.'],
      ['GATEWAY','Same information as the next hop; points to the gateway through which the target network can be reached.'],
      ['NETMASK','Used to generate the network ID.'],
      ['INTERFACE','The locally available interface responsible for reaching the gateway.'],
    ]}/>;
    default:return null;
  }
}

export function Chapter14PresentationContentV4({beat,reveal}:Props){
  if(beat.id==='h14p-141-objectives')return <ChapterObjectivesExact/>;
  if(beat.id==='h14p-141-protocol-map')return <ApplicationProtocolsExact/>;
  if(beat.id==='h14p-141-ip-link')return <IpLinkExact/>;
  if(beat.id==='h14p-141-bittorrent')return <BitTorrentProcessExact reveal={reveal}/>;
  if(beat.id==='h14p-141-bittorrent-terms')return <BitTorrentSwarmExact reveal={reveal}/>;
  if(beat.id==='h14p-142-circuit-route')return <ExactCircuitNetwork reveal={reveal}/>;
  if(beat.id==='h14p-142-circuit-failure')return <ExactCircuitNetwork reveal={Math.max(reveal,1)} broken/>;
  if(beat.id==='h14p-142-circuit-pros-cons')return <ExactProsCons kind="circuit" reveal={reveal}/>;
  if(beat.id==='h14p-142-packet-basics')return <ExactPacketBasics reveal={reveal}/>;
  if(beat.id==='h14p-142-packet-route')return <ExactPacketNetwork reveal={reveal}/>;
  if(beat.id==='h14p-142-packet-pros-cons')return <ExactProsCons kind="packet" reveal={reveal}/>;
  if(beat.id==='h14p-142-activity14a')return <Activity14AExact reveal={reveal}/>;

  const extra=deepSupplement(beat.id);
  const core=<Chapter14PresentationContentV3 beat={beat} reveal={reveal}/>;
  if(!extra)return core;
  return <div className="h14d-composite" data-beat={beat.id}><div className="h14d-core">{core}</div>{extra}</div>;
}
