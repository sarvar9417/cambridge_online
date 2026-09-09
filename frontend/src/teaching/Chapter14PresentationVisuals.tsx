import type { LessonPresentationBeat } from './lesson-experience-model';

const shown = (reveal:number,index:number) => reveal >= index;

function Diagnostic({items}:{items:string[]}){
  return <div className="h14v-diagnostic">{items.map((item,index)=><section key={item}><span>{String(index+1).padStart(2,'0')}</span><p>{item}</p></section>)}</div>;
}

function ProtocolMap({reveal}:{reveal:number}){
  const protocols=[
    ['HTTP','web-page resources'],['SMTP','send email'],['POP3/4 · IMAP','receive email'],['DNS','domain name → IP'],
    ['FTP','file transfer'],['RIP','routers exchange routing information'],['SNMP','network-management information'],['MIME','media/binary email attachments'],
  ];
  return <div className="h14v-protocol-map">
    <div className="h14v-protocol-grid">{protocols.map(([name,note],index)=><section className={shown(reveal,Math.min(6,index+1))?'is-visible':''} key={name}><strong>{name}</strong><small>{note}</small></section>)}</div>
    <aside className={`h14v-source-spotlight ${shown(reveal,6)?'is-visible':''}`}><span>FTP · SOURCE DETAIL</span><strong>Anonymous access and server commands</strong><p><code>331 Anonymous access allowed</code> is the coursebook example. FTP commands include delete, close, rename, <code>cd</code> and <code>lcd</code>; a session uses the FTP host name, user ID and password.</p></aside>
  </div>;
}

function LayerStack({reveal}:{reveal:number}){
  const layers=[
    ['APPLICATION','Programs + HTTP · SMTP · POP/IMAP · DNS · FTP · RIP · SNMP'],
    ['TRANSPORT','TCP · host-to-host · sequence · acknowledgement'],
    ['INTERNET','IP · source/destination addressing · routing'],
    ['LINK','frame · MAC · local-network protocol'],
  ];
  return <div className="h14v-stack" aria-label="TCP/IP four layer stack">
    <div className="h14v-stack-arrow h14v-stack-arrow--down"><span>SENDING</span><b>↓</b></div>
    <div className="h14v-stack-layers">{layers.map(([name,note],index)=><div className={`h14v-layer ${shown(reveal,index+1)?'is-visible':''}`} key={name}><strong>{name}</strong><small>{note}</small></div>)}</div>
    <div className="h14v-stack-arrow h14v-stack-arrow--up"><b>↑</b><span>RECEIVING</span></div>
  </div>;
}

function Encapsulation({reveal}:{reveal:number}){
  const stages=[
    {name:'DATA',parts:['Application data']},
    {name:'SEGMENT',parts:['Transport header','Data']},
    {name:'DATAGRAM',parts:['IP header','Transport header','Data']},
    {name:'FRAME',parts:['Link header','IP datagram','Trailer']},
  ];
  return <div className="h14v-encapsulation">{stages.map((stage,index)=><section className={shown(reveal,index+1)?'is-visible':''} key={stage.name}><span>{stage.name}</span><div>{stage.parts.map(part=><b key={part}>{part}</b>)}</div></section>)}</div>;
}

function HttpJourney({reveal}:{reveal:number}){
  const steps=[
    ['Browser','URL entered'],['HTTP(S)','request web resource'],['DNS','domain → IP'],['TCP','prepare transport'],['Internet','route towards server'],['Web server','return HTML/resources'],
  ];
  return <div className="h14v-journey"><div className="h14v-browser-window"><span/><span/><span/><strong>https://example.com</strong></div><div className="h14v-journey-flow">{steps.map(([title,note],index)=><div className={`h14v-node ${shown(reveal,index+1)?'is-visible':''}`} key={`${title}-${index}`}><i>{index+1}</i><strong>{title}</strong><small>{note}</small>{index<steps.length-1?<b aria-hidden="true">→</b>:null}</div>)}</div></div>;
}

function EmailFlow({reveal}:{reveal:number}){
  const stages=[['SENDER','creates message'],['SMTP','text-based push protocol'],['MIME','media/binary attachment header'],['MAIL SERVER','sender side'],['INTERNET','server-to-server transfer'],['POP / IMAP','pull / receive'],['RECIPIENT','reads or synchronises mail']];
  return <div className="h14v-email-wrap">
    <div className="h14v-email">{stages.map(([title,note],index)=><div className={`h14v-mail-node ${shown(reveal,Math.min(6,index+1))?'is-visible':''}`} key={`${title}-${index}`}><span>{index===0||index===6?'✉':'●'}</span><strong>{title}</strong><small>{note}</small>{index<stages.length-1?<b>→</b>:null}</div>)}</div>
    <div className={`h14v-email-notes ${shown(reveal,6)?'is-visible':''}`}><p><b>Push:</b> SMTP client opens and keeps a server connection active while uploading mail.</p><p><b>Pull:</b> POP/IMAP client periodically connects, checks/downloads mail, then closes the connection.</p><p><b>Coursebook note:</b> HTTP use has increasingly superseded POP3/4 and IMAP, while SMTP remains used between email servers.</p></div>
  </div>;
}

function PopImap({reveal}:{reveal:number}){
  return <div className="h14v-popimap">
    <section className={shown(reveal,1)?'is-visible':''}><h3>POP3/4</h3><div className="h14v-server">SERVER <span>✉ ✉ ✉</span></div><b>↓ download</b><div className="h14v-device">💻</div><p>Coursebook model: downloaded mail becomes local; client and server are not kept synchronised.</p></section>
    <section className={shown(reveal,2)?'is-visible':''}><h3>IMAP</h3><div className="h14v-server">SERVER <span>✉ ✉ ✉</span></div><div className="h14v-sync"><b>↙ sync</b><b>sync ↘</b></div><div className="h14v-devices"><span>💻</span><span>📱</span></div><p>A copy is downloaded while the server mailbox remains the synchronised reference.</p></section>
  </div>;
}

function TcpHandshake({reveal}:{reveal:number}){
  const arrows=[['X → Y','synchronisation / sequence'],['Y → X','acknowledgement + synchronisation'],['X → Y','acknowledgement'],['X ⇄ Y','data transfer + PAR']];
  return <div className="h14v-tcp-wrap"><div className="h14v-transport-family"><span>TRANSPORT-LAYER PROTOCOLS</span><b>TCP</b><b>UDP</b><b>SCTP</b><small>The coursebook then concentrates on TCP.</small></div><div className="h14v-handshake"><div className="h14v-host"><span>HOST X</span><b>💻</b></div><div className="h14v-handshake-lines">{arrows.map(([direction,label],index)=><div className={`h14v-handshake-step ${shown(reveal,index+1)?'is-visible':''}`} key={label}><strong>{direction}</strong><span>{label}</span></div>)}</div><div className="h14v-host"><span>HOST Y</span><b>🖥️</b></div></div>{shown(reveal,4)?<aside className="h14v-par"><strong>PAR · positive acknowledgement with retransmission</strong><span>If positive acknowledgement is not received, TCP retransmits.</span></aside>:null}</div>;
}

function EthernetDetail({reveal}:{reveal:number}){
  const fields=[['PRE-AMBLE','8 bytes'],['START','1 byte'],['DESTINATION MAC','6 bytes'],['SOURCE MAC','6 bytes'],['TYPE / LENGTH','2 bytes'],['MESSAGE','46–1500 bytes'],['FRAME CHECK','4 bytes']];
  return <div className="h14v-ethernet"><div className="h14v-ethernet-frame">{fields.map(([name,size],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={name}><strong>{name}</strong><small>{size}</small></section>)}</div><div className="h14v-ethernet-notes">{shown(reveal,3)?<p><b>Broadcast destination:</b> <code>FF:FF:FF:FF:FF:FF</code> targets every device on the LAN.</p>:null}{shown(reveal,5)?<p><b>Type / length:</b> ≤1539 means frame length; above 1539 identifies Ethernet type such as IPv4/IPv6 in the source example.</p>:null}{shown(reveal,7)?<p><b>Integrity:</b> frame check includes a checksum. The coursebook also notes VLAN frames may grow to around 9000 bytes.</p>:null}</div></div>;
}

function WirelessDetail({reveal}:{reveal:number}){
  return <div className="h14v-wireless">{shown(reveal,1)?<section><span>WiFi</span><strong>IEEE 802.11</strong><p>CSMA/CA uses DCF. A device transmits only on a free channel; transmissions are acknowledged and a missing acknowledgement causes a random wait before retrying.</p></section>:null}{shown(reveal,2)?<section><span>Bluetooth</span><strong>IEEE 802.15</strong><p>Short-range data transmission / communication.</p></section>:null}{shown(reveal,3)?<section><span>WiMax</span><strong>IEEE 802.16</strong><p><b>802.16-2004</b> fixed WiMax · <b>802.16-2005</b> mobile WiMax.</p></section>:null}</div>;
}

function BitTorrent({reveal}:{reveal:number}){
  const peers=[['SEED','seed'],['PEER','peer'],['PEER','peer'],['LEECH','leech'],['NEW','new'],['SEED','seed']];
  return <div className="h14v-bittorrent-wrap"><div className="h14v-swarm"><div className={`h14v-tracker ${shown(reveal,3)?'is-visible':''}`}><strong>TRACKER</strong><small>peer IP/details</small></div>{peers.map(([label,type],index)=><div className={`h14v-peer h14v-peer--${index+1} ${shown(reveal,Math.min(5,index+1))?'is-visible':''}`} data-type={type} key={`${label}-${index}`}><span>💻</span><strong>{label}</strong><i/></div>)}<div className={`h14v-piece ${shown(reveal,4)?'is-visible':''}`}>PIECES ⇄</div></div>{shown(reveal,5)?<div className="h14v-bittorrent-notes"><section><strong>Availability</strong><p>Number of complete copies of torrent contents distributed across the swarm.</p></section><section><strong>Share ratio</strong><p><code>uploaded ÷ downloaded</code>; &gt;1 positive impact, &lt;1 negative impact.</p></section><section><strong>Lurker</strong><p>Downloads many files but contributes no new content to the community.</p></section><section><strong>Order</strong><p>Pieces may arrive non-sequentially and must be rearranged to create the final file.</p></section><small>Coursebook-era context: BitTorrent ≈12% of video-file sharing; YouTube ≈50% at the time of writing.</small></div>:null}</div>;
}

function NetworkBase({packets=false,failure=false,reveal=99}:{packets?:boolean;failure?:boolean;reveal?:number}){
  return <svg className="h14v-network" viewBox="0 0 920 390" role="img" aria-label={packets?'Packet switching routes':'Circuit switching route'}>
    <g className="h14v-links"><path d="M100 195 L250 90 L430 80 L610 105 L820 195"/><path d="M100 195 L250 195 L430 195 L610 195 L820 195"/><path d="M100 195 L250 305 L430 300 L610 285 L820 195"/><path d="M250 90 L430 195 L610 105"/><path d="M250 305 L430 195 L610 285"/></g>
    {!packets?<path className={`h14v-dedicated ${failure?'is-failed':''}`} d="M100 195 L250 195 L430 195 L610 195 L820 195"/>:null}
    {[['A',100,195],['R1',250,90],['R2',250,195],['R3',250,305],['R4',430,80],['R5',430,195],['R6',430,300],['R7',610,105],['R8',610,195],['R9',610,285],['B',820,195]].map(([label,x,y])=><g className="h14v-router" transform={`translate(${x} ${y})`} key={String(label)}><circle r={label==='A'||label==='B'?34:25}/><text textAnchor="middle" dy="6">{label}</text></g>)}
    {failure?<g className={`h14v-failure ${shown(reveal,1)?'is-visible':''}`} transform="translate(520 195)"><circle r="24"/><text textAnchor="middle" dy="8">×</text></g>:null}
    {packets&&shown(reveal,2)?<circle className="h14v-packet h14v-packet--1" r="11"><animateMotion dur="4.2s" repeatCount="indefinite" path="M100 195 L250 90 L430 80 L610 105 L820 195"/></circle>:null}
    {packets&&shown(reveal,3)?<circle className="h14v-packet h14v-packet--2" r="11"><animateMotion dur="3.4s" repeatCount="indefinite" path="M100 195 L250 195 L430 195 L610 195 L820 195"/></circle>:null}
    {packets&&shown(reveal,4)?<circle className="h14v-packet h14v-packet--3" r="11"><animateMotion dur="4.8s" repeatCount="indefinite" path="M100 195 L250 305 L430 300 L610 285 L820 195"/></circle>:null}
  </svg>;
}

function CircuitRoute({reveal,failure=false}:{reveal:number;failure?:boolean}){return <div className="h14v-network-wrap"><NetworkBase failure={failure} reveal={reveal}/><div className="h14v-network-caption"><span>A</span><b>{failure?'Dedicated link failure: no alternative route for this established circuit':'One dedicated path stays reserved for the whole communication'}</b><span>B</span></div></div>}

function PacketRoutes({reveal}:{reveal:number}){return <div className="h14v-network-wrap"><NetworkBase packets reveal={reveal}/><div className="h14v-packet-key"><span>P1 · upper route</span><span>P2 · middle route</span><span>P3 · lower route</span></div><p className={`h14v-reassembly ${shown(reveal,5)?'is-visible':''}`}>Arrival can be out of order → <strong>sequence number reassembles the original message</strong></p></div>}

function SwitchingComparison({reveal}:{reveal:number}){
  const circuitPros=['Dedicated transmission','Whole bandwidth available','Faster transfer rate','Frames arrive in order','Single route prevents route variation','Better for real-time applications'];
  const circuitCons=['Inflexible; may send empty frames','Others cannot use an idle reserved circuit','Circuit remains reserved while unused','No alternative route after line failure','Dedicated channels need greater bandwidth','Link setup can take time'];
  const packetPros=['No communication line tied up','Faulty lines can be bypassed by rerouting','Traffic use can expand easily','Charging only for connectivity duration in the source comparison','High data transmission possible','Uses digital networks'];
  const packetCons=['Protocols can be more complex','Lost packets must be resent','Poorer fit for real-time streams','Bandwidth is shared','Destination waits for reassembly','Large data volumes require RAM'];
  return <div className="h14v-switch-compare"><section><header><span>CIRCUIT SWITCHING</span><strong>Dedicated route</strong></header><div><ul>{circuitPros.slice(0,Math.min(6,reveal)).map(x=><li className="is-pro" key={x}>+ {x}</li>)}</ul><ul>{circuitCons.slice(0,Math.min(6,reveal)).map(x=><li className="is-con" key={x}>− {x}</li>)}</ul></div></section><section><header><span>PACKET SWITCHING</span><strong>Independent routes</strong></header><div><ul>{packetPros.slice(0,Math.min(6,reveal)).map(x=><li className="is-pro" key={x}>+ {x}</li>)}</ul><ul>{packetCons.slice(0,Math.min(6,reveal)).map(x=><li className="is-con" key={x}>− {x}</li>)}</ul></div></section>{shown(reveal,6)?<aside><strong>Worked context · video conferencing</strong><p>Packet switching can produce pauses, synchronisation problems and degraded audio/video when packets are delayed, lost or compete for shared capacity. The source example links circuit switching improvements to a fixed route, correct order and full reserved bandwidth.</p></aside>:null}</div>;
}

function HopCountdown({reveal}:{reveal:number}){
  const hops=[4,3,2,1,0];
  return <div className="h14v-hop-wrap"><div className="h14v-hop">{hops.map((hop,index)=><div className={`h14v-hop-node ${shown(reveal,index+1)?'is-visible':''} ${hop===0?'is-zero':''}`} key={hop}><span>{index===0?'PACKET':`ROUTER ${index}`}</span><strong>HOP {hop}</strong>{index<hops.length-1?<b>→</b>:null}</div>)}{shown(reveal,5)?<p>Destinationga yetmagan bo‘lsa → <strong>PACKET DELETED</strong></p>:null}</div>{shown(reveal,3)?<div className="h14v-packet-control"><section><strong>CHECKSUM / PARITY</strong><p>Destination recalculates the check. A mismatch causes a resend request.</p></section>{shown(reveal,4)?<section><strong>PRIORITY</strong><p>A priority value can identify which packet queue should be used.</p></section>:null}</div>:null}</div>;
}

function PacketHeader({reveal}:{reveal:number}){
  const headline=[['SOURCE IP','32'],['DESTINATION IP','32'],['HOP','8'],['LENGTH','16'],['PACKET COUNT','16'],['SEQUENCE','16'],['CHECKSUM','16']];
  return <div className="h14v-header"><div className="h14v-header-strip">{headline.map(([name,bits],index)=><div className={shown(reveal,index+1)?'is-visible':''} key={name}><strong>{name}</strong><span>{bits} bits</span></div>)}<div className="h14v-payload"><strong>DATA</strong></div></div>{shown(reveal,4)?<div className="h14v-header-detail"><section><b>VERSION</b><span>4 bits · IPv4/IPv6</span></section><section><b>HEADER LENGTH</b><span>4 bits · multiples of four bytes</span></section><section><b>PRIORITY</b><span>8 bits</span></section><section><b>FRAGMENT FLAGS</b><span>3 bits · DF / MF</span></section><section><b>FRAGMENT OFFSET</b><span>13 bits</span></section><section><b>TRANSPORT</b><span>8 bits · TCP / UDP</span></section></div>:null}<div className="h14v-header-explain">{shown(reveal,2)?<p><b>Destination IP</b> tells routers where the packet is heading.</p>:null}{shown(reveal,6)?<p><b>Sequence</b> restores the original order at the destination.</p>:null}{shown(reveal,7)?<p><b>Checksum</b> supports header error detection.</p>:null}</div></div>;
}

function RoutingDecision({reveal}:{reveal:number}){
  const fields=['Number of hops','Next-router MAC address','Metrics / route cost','Network destination / network ID','Gateway / next hop','Netmask','Interface'];
  return <div className="h14v-routing"><section className="h14v-routing-packet"><span>PACKET HEADER</span><strong>Destination: Network B</strong></section><b className={shown(reveal,1)?'is-visible':''}>↓</b><section className={`h14v-routing-router ${shown(reveal,2)?'is-visible':''}`}><span>ROUTER</span><strong>Read destination</strong></section><b className={shown(reveal,2)?'is-visible':''}>↓</b><table className={shown(reveal,3)?'is-visible':''}><thead><tr><th>Route</th><th>Metric</th><th>Next hop</th></tr></thead><tbody><tr><td>Network B</td><td>18</td><td>R4</td></tr><tr className="is-best"><td>Network B</td><td>8</td><td>R7 ✓</td></tr><tr><td>Network B</td><td>14</td><td>R9</td></tr></tbody></table>{shown(reveal,4)?<><div className="h14v-routing-result">FORWARD → <strong>R7</strong></div><div className="h14v-routing-fields">{fields.map(field=><span key={field}>{field}</span>)}</div></>:null}</div>;
}

function ChapterReview({reveal}:{reveal:number}){
  if(!shown(reveal,5))return null;
  return <div className="h14v-review-board"><section><span>ACTIVITY 14A · COVERAGE</span><p>TCP/IP layers · email protocols · Ethernet · BitTorrent terminology · packet header and routing table · VoIP/packet switching.</p></section><section><span>END-OF-CHAPTER PRACTICE</span><p>Peer-to-peer terms · layer diagram · email · Ethernet frame · metadata/BitTorrent · switching · hop/checksum · packet routing.</p></section></div>;
}

const ids = new Set([
  'h14p-141-hook','h14p-141-stack','h14p-141-units','h14p-141-protocol-map','h14p-141-http','h14p-141-email','h14p-141-pop-imap','h14p-141-tcp','h14p-141-ethernet','h14p-141-wireless','h14p-141-bittorrent',
  'h14p-142-hook','h14p-142-circuit-route','h14p-142-circuit-failure','h14p-142-packet-route','h14p-142-compare','h14p-142-hop','h14p-142-header','h14p-142-routing','h14p-142-recap',
]);

export function hasChapter14PresentationVisual(beat:LessonPresentationBeat){return ids.has(beat.id);}

export function Chapter14PresentationVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.id){
    case 'h14p-141-hook': return <Diagnostic items={['Explain IP and TCP; then explain why protocols are used.','Explain how peer-to-peer networks operate and give pros/cons.','Explain stack and queue, including example uses.','Explain Ethernet and an IP-address conflict, including how it may be resolved.','State the roles of DNS, HTTP and status flags.']}/>;
    case 'h14p-141-protocol-map': return <ProtocolMap reveal={reveal}/>;
    case 'h14p-141-stack': return <LayerStack reveal={reveal}/>;
    case 'h14p-141-units': return <Encapsulation reveal={reveal}/>;
    case 'h14p-141-http': return <HttpJourney reveal={reveal}/>;
    case 'h14p-141-email': return <EmailFlow reveal={reveal}/>;
    case 'h14p-141-pop-imap': return <PopImap reveal={reveal}/>;
    case 'h14p-141-tcp': return <TcpHandshake reveal={reveal}/>;
    case 'h14p-141-ethernet': return <EthernetDetail reveal={reveal}/>;
    case 'h14p-141-wireless': return <WirelessDetail reveal={reveal}/>;
    case 'h14p-141-bittorrent': return <BitTorrent reveal={reveal}/>;
    case 'h14p-142-hook': return <Diagnostic items={['Explain how PSTN is used when making a phone call.','Explain how VoIP can be used to make a video call over the internet.','Sketch how a three-packet message could be routed from computer A to computer B.']}/>;
    case 'h14p-142-circuit-route': return <CircuitRoute reveal={reveal}/>;
    case 'h14p-142-circuit-failure': return <CircuitRoute reveal={reveal} failure/>;
    case 'h14p-142-packet-route': return <PacketRoutes reveal={reveal}/>;
    case 'h14p-142-compare': return <SwitchingComparison reveal={reveal}/>;
    case 'h14p-142-hop': return <HopCountdown reveal={reveal}/>;
    case 'h14p-142-header': return <PacketHeader reveal={reveal}/>;
    case 'h14p-142-routing': return <RoutingDecision reveal={reveal}/>;
    case 'h14p-142-recap': return <ChapterReview reveal={reveal}/>;
    default: return null;
  }
}
