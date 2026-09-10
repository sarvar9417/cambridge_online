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
    <header><span>HODDER p.339 · FIGURE 14.8</span><strong>Four packets can arrive in a different order</strong></header>
    <main>
      <section className={visible(reveal,1)}><b>ORIGINAL ORDER</b><div>{original.map((p,i)=><span data-packet={i+1} key={p}>{p}</span>)}</div><small>The presentation labels the four source colours P1–P4 in the source's original order.</small></section>
      <i className={visible(reveal,2)}>independent routes ↓</i>
      <section className={visible(reveal,3)}><b>ARRIVAL ORDER</b><div>{arrival.map(p=><span data-packet={Number(p.slice(1))} key={p}>{p}</span>)}</div><small>Using those teaching labels, the coloured arrival order shown is P1 → P4 → P3 → P2.</small></section>
      <i className={visible(reveal,4)}>sequence information ↓</i>
      <section className={visible(reveal,5)}><b>REASSEMBLED</b><div>{original.map((p,i)=><span data-packet={i+1} key={p}>{p}</span>)}</div><small>The destination restores the correct order.</small></section>
    </main>
    <footer>Routing selection depends on the number of datagram packets waiting at each node/router; the shortest path available is selected.</footer>
  </div>;
}

const packetNodes={A:[60,170],R2:[205,100],R6:[205,245],R1:[340,55],R5:[365,145],R8:[365,255],R3:[535,85],R7:[560,185],R9:[700,275],R4:[735,90],R10:[835,220],B:[1010,170]} as const;
type PacketNode=keyof typeof packetNodes;
const packetRoutes:{label:string;packet:number;nodes:PacketNode[];display:string}[]=[
  {label:'P1',packet:1,nodes:['A','R2','R5','R8','R7','R10','B'],display:'A → R2 → R5 → R8 → R7 → R10 → B'},
  {label:'P2',packet:2,nodes:['A','R6','R8','R9','R10','B'],display:'A → R6 → R8 → R9 → R10 → B'},
  {label:'P3',packet:3,nodes:['A','R2','R1','R3','R4','R10','B'],display:'A → R2 → R1 → R3 → R4 → R10 → B'},
  {label:'P4',packet:4,nodes:['A','R6','R5','R3','R7','R10','B'],display:'A → R6 → R5 → R3 → R7 → R10 → B'},
];
function pointsFor(nodes:PacketNode[]){return nodes.map(name=>packetNodes[name].join(',')).join(' ')}
function ExactPacketNetwork({reveal}:{reveal:number}){
  return <div className="h14m-content-v2 h14d-packet-network" aria-label="Figure 14.8 reconstructed coloured routes">
    <svg viewBox="0 0 1070 330" role="img" aria-label="Four source-coloured packet routes from Figure 14.8">
      {packetRoutes.map(route=><polyline key={route.label} points={pointsFor(route.nodes)} className={`source-packet p${route.packet} ${visible(reveal,route.packet)}`}/>)}
      {Object.entries(packetNodes).map(([name,[x,y]])=><g key={name} transform={`translate(${x} ${y})`}><circle r={name==='A'||name==='B'?28:21}/><text y="5">{name}</text></g>)}
    </svg>
    <footer><div>{packetRoutes.map(route=><span data-packet={route.packet} key={route.label}><b>{route.label}</b>{route.display}</span>)}</div><p>P1–P4 are teaching labels assigned to the source colours in their original order. Queue load affects route selection; the shortest path available is selected.</p></footer>
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
      ['WLAN NOTE','The source links DCF/acknowledgement behaviour to security and integrity of data sent over a WLAN.'],
      ['BLUETOOTH','IEEE 802.15; numerous additional Bluetooth protocols are stated to be outside the scope of the textbook.'],
      ['WIMAX / WMAN','IEEE 802.16 was designed originally for wireless MANs (WMAN); fixed 802.16-2004, mobile 802.16-2005.'],
    ]}/>;
    case 'h14p-141-bittorrent-terms':return <DeepStrip page="HODDER pp.336–337" title="BITTORRENT SOURCE WORDING" items={[
      ['SWARM','A group of connected peers sharing a torrent/tracker.'],
      ['SEED','A peer that has downloaded a file or pieces and made them available to other peers.'],
      ['AVAILABILITY','Number of complete copies of torrent contents distributed amongst the swarm.'],
      ['SOURCE WORDING · TORRENT','The process first calls .torrent a small metadata file; the later summary also says “a torrent” is the name given to a file being shared. Both source statements are retained.'],
      ['LEECH · TWO SOURCE DESCRIPTIONS','The narrative calls a peer that logs off after completing the file a leech; the summary defines a leech by poor share ratio / negative impact.'],
      ['SHARE RATIO','uploaded data ÷ downloaded data; >1 positive impact, <1 negative effect.'],
      ['LURKER','A peer that downloads files but supplies no new content to the community.'],
      ['FIGURE 14.6 LEGEND','Upload/download pieces · download file only · upload file only · request for file download.'],
      ['HISTORICAL SNAPSHOT','At the time of writing: about 12% BitTorrent video-file sharing versus about 50% YouTube.'],
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
      ['HEADER LENGTH','4 bits in multiples of four; value 6 → 6 × 4 = 24 bytes.'],
      ['FRAGMENTATION','3 bits include DF = do not fragment and MF = more fragments; 13-bit offset locates the fragment.'],
      ['TRANSPORT · 8 BITS','The source gives TCP and UDP as examples.'],
    ]}/>;
    case 'h14p-142-routing':return <DeepStrip page="HODDER pp.341–342" title="FIGURE 14.10 ROUTER DECISION" items={[
      ['COMPARE','Packet header is examined and compared with the routing table.'],
      ['NEXT ROUTER','The next router in the path is determined.'],
      ['NEW MAC','Once established, a new MAC address is added to the packet header.'],
      ['DELETE','If no route can be found or hop number = 0, the router deletes the data package.'],
    ]}/>;
    case 'h14p-142-routing-fields':return <DeepStrip page="HODDER p.341" title="ROUTING TABLE FIELD MEANING" items={[
      ['METRICS','A cost is assigned to each available route so the most efficient route/path is found.'],
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
  if(beat.id==='h14p-142-circuit-pros-cons')return <ExactProsCons kind="circuit" reveal={reveal}/>;
  if(beat.id==='h14p-142-packet-pros-cons')return <ExactProsCons kind="packet" reveal={reveal}/>;
  if(beat.id==='h14p-142-packet-basics')return <ExactPacketBasics reveal={reveal}/>;
  if(beat.id==='h14p-142-packet-route')return <ExactPacketNetwork reveal={reveal}/>;
  if(beat.id==='h14p-141-bittorrent')return <BitTorrentProcessExact reveal={reveal}/>;

  const extra=deepSupplement(beat.id);
  const core=<Chapter14PresentationContentV3 beat={beat} reveal={reveal}/>;
  if(!extra)return core;
  return <div className="h14d-composite" data-beat={beat.id}><div className="h14d-core">{core}</div>{extra}</div>;
}
