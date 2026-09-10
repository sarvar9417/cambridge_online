import type { LessonPresentationBeat } from './lesson-experience-model';

const vis=(reveal:number,step:number)=>reveal>=step?'is-visible':'';

type Props={beat:LessonPresentationBeat;reveal:number};
type Pair=[string,string];

function Flow({items,reveal,label}:{items:Pair[];reveal:number;label:string}){
  return <div className="h14m-content-v2 h14c-flow" aria-label={label}>{items.map(([title,text],index)=><section key={title} className={vis(reveal,index+1)}><b>{String(index+1).padStart(2,'0')}</b><div><strong>{title}</strong><p>{text}</p></div>{index<items.length-1?<i aria-hidden="true">↓</i>:null}</section>)}</div>;
}

function Definition({term,definition,example}:{term:string;definition:string;example:string}){
  return <div className="h14m-content-v2 h14c-definition"><span>COURSEBOOK MEANING</span><strong>{term}</strong><p>{definition}</p><div><b>WHY IT MATTERS</b><p>{example}</p></div></div>;
}

function ProtocolAgreement(){return <div className="h14m-content-v2 h14c-agreement"><section><span>SENDER</span><strong>Parity rule</strong><p>Uses one agreed rule before sending.</p></section><div><b>EVEN or ODD?</b><i>⇄</i><p>The protocol must be the same at both ends.</p></div><section><span>RECEIVER</span><strong>Parity rule</strong><p>Interprets the check using the agreed rule.</p></section><footer>Without agreement, parity checking cannot reliably decide whether transmission was correct.</footer></div>}

function Objectives({part,reveal}:{part:'14.1'|'14.2';reveal:number}){
  const items=part==='14.1'?
  [['PROTOCOLS','why agreed rules are required'],['TCP/IP','four layers, direction and functions'],['APPLICATION','HTTP · FTP · SMTP · POP · IMAP'],['LOCAL + P2P','Ethernet · wireless · BitTorrent']]:
  [['SWITCHING','circuit vs packet'],['ROUTES','dedicated path vs independent packets'],['PACKET CONTROL','hop · checksum · priority'],['ROUTING','header + routing table + router']];
  return <div className="h14m-content-v2 h14c-roadmap">{items.map(([a,b],i)=><section className={vis(reveal,Math.min(i+1,3))} key={a}><span>{String(i+1).padStart(2,'0')}</span><strong>{a}</strong><small>{b}</small></section>)}</div>
}

function TcpIpStack({reveal}:{reveal:number}){
  const layers=[
    ['4','APPLICATION','Programs exchange data; defines application protocols such as HTTP, SMTP, POP/IMAP, DNS and FTP.'],
    ['3','TRANSPORT','Regulates connections; breaks data into packets; sequencing, acknowledgement and retransmission.'],
    ['2','INTERNET','IP identifies intended network/host, adds source/destination IP addresses and supports routing.'],
    ['1','LINK','Moves traffic across local segments; encapsulates IP datagrams into frames and maps IP to MAC.'],
  ];
  return <div className="h14m-content-v2 h14c-stack"><aside><b>↓</b><span>SENDING<br/>4 → 1</span></aside><main>{layers.map(([n,name,text],i)=><section className={vis(reveal,i+1)} key={name}><i>{n}</i><div><strong>{name}</strong><p>{text}</p></div></section>)}</main><aside><span>RECEIVING<br/>1 → 4</span><b>↑</b></aside><footer>Layering is decomposition: manageable self-contained software modules make development and compatibility easier.</footer></div>
}

function Encapsulation({reveal}:{reveal:number}){
  const rows=[
    ['APPLICATION DATA',['DATA']],
    ['SEGMENT',['TCP HEADER','DATA']],
    ['DATAGRAM',['IP HEADER','TCP HEADER','DATA']],
    ['FRAME',['LINK HEADER','IP HEADER','TCP HEADER','DATA','FRAME CHECK']],
  ];
  return <div className="h14m-content-v2 h14c-encapsulation">{rows.map(([name,parts],i)=><section className={vis(reveal,i+1)} key={name as string}><strong>{name as string}</strong><div>{(parts as string[]).map(part=><span key={part} data-data={part==='DATA'}>{part}</span>)}</div><small>{i===0?'original application data':'each lower layer adds its own control information/header'}</small></section>)}</div>
}

function ProtocolMap({reveal}:{reveal:number}){
  const items=[['HTTP','web-page files/resources'],['SMTP','sending email'],['POP3/4','receiving email'],['IMAP','receiving + synchronisation'],['DNS','domain name → IP address'],['FTP','file transfer'],['RIP','routers exchange routing information'],['SNMP','network-management information']];
  return <div className="h14m-content-v2 h14c-protocol-map"><div className="core"><span>APPLICATION</span><strong>Which task?</strong><small>Choose the protocol that matches the service.</small></div>{items.map(([p,use],i)=><section className={vis(reveal,Math.ceil((i+1)/2))} key={p}><strong>{p}</strong><span>{use}</span></section>)}</div>
}

function Ftp({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-terminal"><div className="screen"><header>FTP SESSION</header><code className={vis(reveal,1)}>ftp host_name</code><code className={vis(reveal,2)}>user id → password</code><code className={vis(reveal,3)}>331 Anonymous access allowed</code><code className={vis(reveal,4)}>delete · close · rename · cd · lcd</code></div><aside><strong>FTP SERVER</strong><span>stores files available for download</span><i>⇄</i><p>FTP's application task is file transfer over a network.</p></aside></div>}

function Http({reveal}:{reveal:number}){
  const steps=[
    ['1','BROWSER','User enters a URL.'],['2','HTTP(S)','Request moves from application layer to TCP.'],['3','TCP','Coursebook sequence: TCP creates packets and sends via port 80.'],['4','DNS','Domain name is matched to the website IP address.'],['5','SERVER TCP','Acknowledgement is sent back.'],['6','WEB SERVER','HTML/resources return; browser displays them or passes media to a player.']
  ];
  return <div className="h14m-content-v2 h14c-http"><div className="browser"><header><i/><i/><i/><span>https://website</span></header><main><b>PAGE</b><span>text</span><span>images</span><span>video links</span><span>advert links</span></main></div><div className="http-spine">{steps.map(([n,a,b],i)=><section className={vis(reveal,i+1)} key={n}><b>{n}</b><div><strong>{a}</strong><p>{b}</p></div></section>)}</div><aside><div>WEB SERVER</div><div>VIDEO SERVER</div><div>ADVERTS SERVER</div><small>Figure 14.2 idea: one web page can reference resources from multiple servers.</small></aside></div>
}

function EmailJourney({reveal}:{reveal:number}){
  const nodes=[['SENDER','client'],['SMTP / MIME','send + attachments'],['CLIENT ISP','email server'],['INTERNET','transfer'],['RECIPIENT DOMAIN','email server'],['POP / IMAP','receive'],['RECIPIENT','client']];
  return <div className="h14m-content-v2 h14c-email-journey">{nodes.map(([a,b],i)=><section className={vis(reveal,Math.min(i+1,6))} key={a}><strong>{a}</strong><small>{b}</small>{i<nodes.length-1?<i aria-hidden="true">→</i>:null}</section>)}</div>
}

function EmailMechanics({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-email-mechanics"><section className={vis(reveal,1)}><header>SMTP · PUSH</header><div><span>CLIENT</span><i>→→→</i><span>SERVER</span></div><p>Text-based and connection-based. The client opens a connection, keeps it active and uploads new email.</p></section><section className={vis(reveal,2)}><header>MIME · ATTACHMENT SUPPORT</header><div><span>EMAIL</span><b>+ MIME HEADER</b><span>IMAGE / VIDEO / MUSIC</span></div><p>SMTP alone is text-based; MIME allows media/binary attachments and the header identifies how the attachment should be handled.</p></section><section className={vis(reveal,3)}><header>POP / IMAP · PULL</header><div><span>CLIENT</span><i>← check/download ←</i><span>SERVER</span></div><p>The client periodically connects, checks/downloads mail, then closes the connection.</p></section><footer className={vis(reveal,4)}>Coursebook note: POP/IMAP use has increasingly been superseded by HTTP, while SMTP remains used between email servers.</footer></div>}

function PopImap({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-popimap"><section><header>POP3/4</header><div className="server">SERVER MAILBOX</div><i className={vis(reveal,1)}>↓ download</i><div className={`client ${vis(reveal,1)}`}>CLIENT COPY</div><div className={`delete ${vis(reveal,2)}`}>server copy deleted</div><p className={vis(reveal,3)}>Server and client are not kept in synchronisation in the coursebook model.</p></section><section><header>IMAP</header><div className="server">SERVER MAILBOX</div><i className={vis(reveal,1)}>⇅ synchronise</i><div className={`client ${vis(reveal,1)}`}>CLIENT COPY</div><div className={`keep ${vis(reveal,2)}`}>original remains on server</div><p className={vis(reveal,3)}>The original stays until the client manually deletes it; server and client remain synchronised.</p></section></div>}

function Transport({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-transport"><section className={vis(reveal,1)}><span>MESSAGE</span><i>→</i><div><b>P1</b><b>P2</b><b>P3</b><b>P4</b></div><p>Transport layer breaks data into packets.</p></section><section className={vis(reveal,2)}><div><b>P1</b><b>P2</b><b className="lost">P3</b><b>P4</b></div><i>→</i><span>DESTINATION</span><p>Sequence and error control matter.</p></section><section className={vis(reveal,3)}><span>ACK?</span><i>↺</i><b>P3 re-sent</b><p>TCP uses acknowledgement and retransmission; PAR automatically retransmits without positive acknowledgement.</p></section><footer className={vis(reveal,4)}><strong>Transport protocols named by the source:</strong> TCP · UDP · SCTP <small>The chapter considers TCP in detail.</small></footer></div>}

function Handshake({reveal}:{reveal:number}){const msgs=[['X → Y','segment with synchronisation sequence bits'],['Y → X','acknowledgement + Y’s own synchronisation sequence bits'],['X → Y','acknowledgement that Y’s segment was received'],['DATA','transmission can now take place']];return <div className="h14m-content-v2 h14c-handshake"><header><strong>HOST X</strong><strong>HOST Y</strong></header><main><i/><i/>{msgs.map(([a,b],i)=><section className={`${vis(reveal,i+1)} ${i%2?'right':'left'}`} key={a+i}><b>{a}</b><span>{b}</span><em>→</em></section>)}</main><footer>TCP is connection-oriented and host-to-host: the end-to-end connection is established before normal data transfer.</footer></div>}

function IpLink({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-iplink"><section className={vis(reveal,1)}><header>INTERNET LAYER · IP</header><div className="packet"><span>IP HEADER</span><b>TRANSPORT PACKET</b></div><p>Adds sender + recipient IP addresses and supports routing between networks.</p></section><i className={vis(reveal,2)}>↓ DATAGRAM</i><section className={vis(reveal,2)}><header>DATA-LINK / LINK</header><div className="packet frame"><span>MAC / LINK INFO</span><b>IP DATAGRAM</b><span>CHECK</span></div><p>Encapsulates the IP datagram into a frame for the local segment and maps IP addresses to MAC addresses.</p></section><footer className={vis(reveal,3)}>Ethernet is local. Communication with external devices requires IP above Ethernet.</footer></div>}

function EthernetFrame({reveal}:{reveal:number}){const fields=[['Pre-amble','8 bytes',1],['Start frame','1 byte',1],['Destination','6 bytes',2],['Source','6 bytes',2],['Ethernet type/length','2 bytes',3],['Actual message','46–1500 bytes',4],['Frame check sequence','4 bytes',5],['Interpacket gap','12 bytes',6]];return <div className="h14m-content-v2 h14c-ethernet"><div className="ether-strip">{fields.map(([a,b,s])=><section key={a as string} className={vis(reveal,s as number)} data-message={a==='Actual message'}><strong>{a}</strong><small>{b}</small></section>)}</div><div className="ether-data"><b>Ethernet data</b><span>64–1518 bytes</span><p>Figure 14.5 separates the 12-byte interpacket gap from the Ethernet data block.</p></div></div>}

function EthernetDetails({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-ether-details"><section className={vis(reveal,1)}><header>DESTINATION</header><strong>FF:FF:FF:FF:FF:FF</strong><p>Broadcast address targets every device, for example when the destination MAC is unknown.</p></section><section className={vis(reveal,2)}><header>TYPE / LENGTH</header><div className="threshold"><span>frame length ≤ 1539</span><b>LENGTH</b><i>|</i><span>frame length &gt; 1539</span><b>ETHERNET TYPE</b></div><p>The source gives IPv4/IPv6 as type examples.</p></section><section className={vis(reveal,3)}><header>FRAME CHECK</header><div className="checksum">sent checksum <i>⇄</i> integrity check after transmission</div></section><footer className={vis(reveal,4)}>Source note: with VLAN, the book states Ethernet data size increases from 1539 bytes to around 9000 bytes per frame.</footer></div>}

function Wireless({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-wireless"><section className="wifi"><header>WiFi · IEEE 802.11</header><div className={vis(reveal,1)}><b>1</b><span>Sense channel</span></div><div className={vis(reveal,1)}><b>2</b><span>DCF allows transmit only when channel is free</span></div><div className={vis(reveal,2)}><b>3</b><span>Transmit</span></div><div className={vis(reveal,2)}><b>4</b><span>Wait for acknowledgement</span></div><div className={vis(reveal,3)}><b>5</b><span>No acknowledgement → assume collision risk → random wait → try again</span></div></section><aside><div className={vis(reveal,2)}><strong>Bluetooth</strong><span>IEEE 802.15</span><small>short-range communication</small></div><div className={vis(reveal,3)}><strong>WiMax</strong><span>IEEE 802.16</span><small>fixed 802.16-2004 · mobile 802.16-2005</small></div></aside></div>}

function BitTorrentProcess({reveal}:{reveal:number}){const steps=[['A creates torrent','metadata describes the file'],['File becomes pieces','example in source: 20 MiB → 20 × 1 MiB'],['Peers obtain torrent','then connect to tracker'],['Tracker identifies peers','stores details/IP addresses so peers can locate each other'],['Pieces move peer-to-peer','a peer becomes a source for any piece it receives'],['Complete peer can seed','pieces may arrive non-sequentially and are rearranged into the final file']];return <div className="h14m-content-v2 h14c-bittorrent-process"><div className="torrent-file">MyVideoFile.torrent<small>METADATA</small></div><div className="pieces">{['01','02','03','…','20'].map(p=><span key={p}>{p}</span>)}</div><div className="tracker">TRACKER<small>who has which pieces?</small></div><div className="peers">{['A · original','peer','peer','peer'].map((p,i)=><span key={p+i}>{p}</span>)}</div><ol>{steps.map(([a,b],i)=><li className={vis(reveal,Math.min(i+1,5))} key={a}><b>{i+1}</b><span><strong>{a}</strong><small>{b}</small></span></li>)}</ol></div>}

function BitTorrentTerms({reveal}:{reveal:number}){const peers=[['ORIGINAL','uploads file'],['SEED × 6','complete/pieces available'],['LEECH × 2','poor share ratio / negative impact'],['NEW × 3','requesting download']];return <div className="h14m-content-v2 h14c-swarm"><div className="tracker">TRACKER<span>12 peers connected</span></div>{peers.map(([a,b],i)=><section className={vis(reveal,Math.min(i+1,4))} key={a}><strong>{a}</strong><small>{b}</small></section>)}<footer className={vis(reveal,5)}><div><b>Availability</b><span>number of complete copies of torrent contents distributed across the swarm</span></div><div><b>Share ratio</b><span>uploaded ÷ downloaded · &gt;1 positive impact · &lt;1 negative impact</span></div><div><b>Lurker</b><span>downloads files but supplies no new content to the community</span></div></footer></div>}

function Check141({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-check"><section><span>01</span><p>Why must sender and receiver agree a protocol?</p></section><section><span>02</span><p>Write TCP/IP sending order.</p></section><section className={vis(reveal,1)}><b>MODEL</b><p>Agreed rules are required so both sides interpret communication in the same way. Sending: Application → Transport → Internet → Link.</p></section></div>}

function SwitchingHook(){return <div className="h14m-content-v2 h14c-switch-hook"><section><span>PHONE / DEDICATED</span><div className="single">A ━━━━━━━ B</div><p>One circuit lasts for the communication.</p></section><strong>OR</strong><section><span>WEB / PACKETS</span><div className="multi">A <i>╱</i><i>━</i><i>╲</i> P1 P2 P3 P4 <i>╲</i><i>━</i><i>╱</i> B</div><p>Packets may travel independently.</p></section></div>}

function CircuitStages({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-circuit-stages"><div className={`phase ${vis(reveal,1)}`}><span>1</span><strong>ESTABLISH</strong><p>Create a dedicated channel between sender and receiver.</p></div><div className={`line ${vis(reveal,1)}`}>A ═════════════════════ B</div><div className={`phase ${vis(reveal,2)}`}><span>2</span><strong>TRANSFER</strong><p>Analogue or digital data moves, usually bi-directionally, while the circuit is tied up.</p></div><div className={`phase ${vis(reveal,3)}`}><span>3</span><strong>TERMINATE</strong><p>Release the circuit after data transfer completes.</p></div></div>}

const networkNodes=[['A',60,170],['R2',205,95],['R6',205,245],['R1',335,55],['R5',365,125],['R8',365,245],['R3',535,75],['R7',560,180],['R9',690,275],['R4',735,75],['R10',830,205],['B',1010,170]] as const;
const baseEdges=[[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[4,7],[5,7],[5,8],[6,9],[7,9],[7,10],[8,10],[9,11],[10,11]] as const;
function Network({mode,reveal,broken=false}:{mode:'circuit'|'packet';reveal:number;broken?:boolean}){
 const circuit=[0,1,4,5,7,10,11];
 const packetPaths=['M60 170 L205 95 L365 125 L535 75 L735 75 L1010 170','M60 170 L205 245 L365 245 L560 180 L830 205 L1010 170','M60 170 L205 95 L335 55 L535 75 L560 180 L830 205 L1010 170','M60 170 L205 245 L365 125 L560 180 L690 275 L830 205 L1010 170'];
 return <div className="h14m-content-v2 h14c-network"><svg viewBox="0 0 1070 330" role="img" aria-label={mode==='circuit'?'Coursebook circuit switching topology':'Packet switching topology'}>{baseEdges.map(([a,b],i)=><line key={i} x1={networkNodes[a][1]} y1={networkNodes[a][2]} x2={networkNodes[b][1]} y2={networkNodes[b][2]} className="base"/>)}{mode==='circuit'&&circuit.slice(0,-1).map((a,i)=>{const b=circuit[i+1];return <line key={'c'+i} x1={networkNodes[a][1]} y1={networkNodes[a][2]} x2={networkNodes[b][1]} y2={networkNodes[b][2]} className={`circuit ${vis(reveal,Math.min(i+1,6))} ${broken&&i===3?'broken':''}`}/>})}{mode==='packet'&&packetPaths.map((d,i)=><path key={d} d={d} className={`packet p${i+1} ${vis(reveal,i+1)}`}/>)}{networkNodes.map(([name,x,y])=><g key={name} transform={`translate(${x} ${y})`}><circle r={name==='A'||name==='B'?27:20}/><text y="5">{name}</text></g>)}</svg>{mode==='circuit'?<footer><strong>A → R2 → R5 → R8 → R7 → R10 → B</strong><span>{broken?'A fault on the established route leaves no alternative routing for that circuit.':'Every frame follows this single route; communication proceeds provided B is not busy.'}</span></footer>:<footer><strong>4 packets</strong><span>Each packet can use its own available path; packets may arrive in a different order and must be reassembled.</span></footer>}</div>
}

function PacketBasics({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-packet-basics"><section className={vis(reveal,1)}><header>ORIGINAL MESSAGE</header><div className="message">P1 P2 P3 P4</div></section><i className={vis(reveal,2)}>split ↓</i><section className={`packets ${vis(reveal,2)}`}>{['P1','P2','P3','P4'].map(p=><b key={p}>{p}</b>)}</section><div className={`routes ${vis(reveal,3)}`}><span>route A</span><span>route B</span><span>route C</span><span>route D</span></div><i className={vis(reveal,4)}>↓ arrive independently</i><section className={`arrival ${vis(reveal,4)}`}><header>DESTINATION</header><div>P3 · P1 · P4 · P2</div><small>possible different arrival order</small></section><section className={`reassembly ${vis(reveal,5)}`}><b>REASSEMBLY</b><span>P1 · P2 · P3 · P4</span></section></div>}

function SwitchCompare({reveal}:{reveal:number}){const rows=[['Route setup before transmission','YES','NO'],['Dedicated path','YES','NO'],['Same route for every packet/frame','YES','NO'],['Arrival order guaranteed','YES','NO'],['All channel bandwidth reserved','YES','NO'],['Alternative routing after fault','NO','YES']];return <div className="h14m-content-v2 h14c-compare"><header><strong>FEATURE</strong><strong>CIRCUIT</strong><strong>PACKET</strong></header>{rows.map((r,i)=><section className={vis(reveal,i+1)} key={r[0]}><span>{r[0]}</span><b>{r[1]}</b><b>{r[2]}</b></section>)}</div>}

function ProsCons({kind,reveal}:{kind:'circuit'|'packet';reveal:number}){const circuit=[['Dedicated to one transmission','Not flexible; single dedicated line'],['Whole bandwidth available','Nobody else can use it even when idle'],['Faster transfer rate than packet switching','Circuit remains reserved whether used or not'],['Frames arrive in same order','No alternative routing after line fault'],['A data packet cannot get lost by taking another route','Dedicated channels require greater bandwidth'],['Works better for real-time applications','Link establishment can take time']];const packet=[['No need to tie up a communication line','Protocols can be more complex'],['Faulty lines can be bypassed by rerouting','Lost packet must be resent'],['Traffic usage can be expanded easily','Poor for real-time data streams'],['Users charged for connectivity duration in source comparison','Bandwidth is shared with other packets'],['High data transmission possible','Delay while destination reassembles packets'],['Uses digital networks','Large amounts of RAM may be needed']];const rows=kind==='circuit'?circuit:packet;return <div className="h14m-content-v2 h14c-proscons"><header><strong>BENEFIT</strong><strong>DRAWBACK</strong></header>{rows.map(([a,b],i)=><section className={vis(reveal,i+1)} key={a}><p><i>+</i>{a}</p><p><i>−</i>{b}</p></section>)}</div>}

function VideoExample({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-video"><section className="packet-side"><header>PACKET SWITCHING</header><div className="av"><div><span>VIDEO</span><b>█ █ ░ █ ░ █</b></div><div><span>AUDIO</span><b>█ ░ █ █ ░ █</b></div></div><ul><li className={vis(reveal,1)}>picture/sound may lose synchronisation</li><li className={vis(reveal,2)}>reassembly delay can cause pauses</li><li className={vis(reveal,3)}>competing traffic can degrade quality</li><li className={vis(reveal,4)}>different routes can contribute to packet loss/drop-out</li></ul></section><section className={`circuit-side ${vis(reveal,4)}`}><header>CIRCUIT SWITCHING CAN HELP</header><div>A ═════════════════ B</div><p>One route + correct order + dedicated channel + full bandwidth → no loss of synchronisation in the coursebook solution.</p></section></div>}

function Hop({reveal}:{reveal:number}){const hops=[4,3,2,1,0];return <div className="h14m-content-v2 h14c-hop">{hops.map((h,i)=><section className={vis(reveal,Math.min(i+1,5))} key={h}><span>{i===0?'START':`ROUTER ${i}`}</span><b>{h}</b><small>hop number</small>{i<hops.length-1?<i>→ −1</i>:null}</section>)}<footer className={vis(reveal,5)}>If the destination has not been reached and hop number = 0, the packet is deleted at the next router. This prevents lost packets clogging the network.</footer></div>}

function PacketControl({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-control"><section className={vis(reveal,1)}><header>CHECKSUM / PARITY</header><div><span>SENT</span><b>checksum in header</b><i>→</i><span>DESTINATION</span><b>recalculate</b></div><p>Different checksum values → request the packet to be re-sent.</p></section><section className={vis(reveal,2)}><header>PRIORITY</header><div className="queues"><span>HIGH PRIORITY → QUEUE A</span><span>OTHER PACKETS → OTHER QUEUES</span></div><p>A priority value in the header can indicate which packet queue should be used.</p></section></div>}

function HeaderCore({reveal}:{reveal:number}){const groups=[['ADDRESS',['Source IP · 32 bits','Destination IP · 32 bits']],['LIFETIME',['Current hop number · 8 bits']],['MESSAGE STRUCTURE',['Length · 16 bits','Number of packets · 16 bits','Sequence number · 16 bits']],['INTEGRITY',['Header checksum · 16 bits']]];return <div className="h14m-content-v2 h14c-header-purpose">{groups.map(([name,items],i)=><section className={vis(reveal,Math.min(i+1,4))} key={name as string}><header>{name as string}</header><div>{(items as string[]).map(x=><span key={x}>{x}</span>)}</div><p>{i===0?'Where from and where to.':i===1?'Stop endless circulation.':i===2?'Know packet size/count and restore order.':'Detect corruption in the header.'}</p></section>)}</div>}

function HeaderExtended({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-fragment"><section className={vis(reveal,1)}><header>VERSION + HEADER LENGTH</header><div><span>VERSION · 4 bits</span><span>HEADER LENGTH · 4 bits</span><b>value 6 → 6 × 4 = 24 bytes</b></div></section><section className={vis(reveal,2)}><header>PRIORITY</header><div><span>8 bits</span><b>select packet queue</b></div></section><section className={vis(reveal,3)}><header>FRAGMENTATION</header><div className="flags"><span>0</span><span>DF</span><span>MF</span><i>+</i><b>fragment offset · 13 bits</b></div><p>DF = do not fragment. MF = more fragments follow. Offset identifies fragment position in the original packet.</p></section><section className={vis(reveal,4)}><header>TRANSPORT PROTOCOL</header><div><span>8 bits</span><b>TCP or UDP</b></div></section></div>}

function RoutingDecision({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-routing-decision"><section className={vis(reveal,1)}><header>1 · READ HEADER</header><div>destination IP<br/>hop number</div></section><i className={vis(reveal,2)}>→</i><section className={vis(reveal,2)}><header>2 · COMPARE ROUTING TABLE</header><div>destination/network ID<br/>metrics · hops · gateway</div></section><i className={vis(reveal,3)}>→</i><section className={vis(reveal,3)}><header>3 · CHOOSE NEXT ROUTER</header><div>shortest / best route<br/>next-router MAC + interface</div></section><i className={vis(reveal,4)}>→</i><section className={vis(reveal,4)}><header>4 · FORWARD OR DELETE</header><div>forward packet<br/><b>no route / hop=0 → delete</b></div></section></div>}

function RoutingFields({reveal}:{reveal:number}){const fields=[['NUMBER OF HOPS','route distance indicator'],['NEXT-ROUTER MAC','where the packet is forwarded next'],['METRICS','cost assigned to available routes'],['NETWORK DESTINATION','network ID / pathway'],['GATEWAY','next hop through which target network is reached'],['NETMASK','used to generate network ID'],['INTERFACE','local interface used to reach the gateway']];return <div className="h14m-content-v2 h14c-routing-table"><header><strong>FIELD</strong><strong>WHAT THE ROUTER USES IT FOR</strong></header>{fields.map(([a,b],i)=><section className={vis(reveal,Math.ceil((i+1)/2))} key={a}><b>{a}</b><span>{b}</span></section>)}</div>}

function WebExample({reveal}:{reveal:number}){const items=[['WEB PAGE','divide into data packets'],['HEADER','put destination IP in each packet'],['ROUTER','compare packet header with routing table'],['NEXT HOP','determine next router and add its MAC address'],['HOP CHECK','check whether hop value equals zero'],['INTERNET','packets may use different routes'],['DESTINATION','reassemble packets to rebuild the page']];return <div className="h14m-content-v2 h14c-web-example"><div className="webpage">WEB<br/>PAGE</div><div className="chain">{items.map(([a,b],i)=><section className={vis(reveal,i+1)} key={a}><strong>{a}</strong><small>{b}</small>{i<items.length-1?<i>→</i>:null}</section>)}</div></div>}

function ExamRouting({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-exam-routing"><section><header>PACKET HEADER</header><p>destination IP</p><p>hop number</p></section><strong>+</strong><section><header>ROUTING TABLE</header><p>route/metrics</p><p>next hop / interface</p></section><strong>=</strong><section className={vis(reveal,1)}><header>EXAM-SAFE EXPLANATION</header><p>Router reads the destination in the header → compares it with routing-table entries/metrics → selects the best available next hop/interface → forwards the packet. Repeat until destination; no route or hop 0 means deletion.</p></section></div>}

function Activity14A({reveal}:{reveal:number}){const tasks=[['1','TCP/IP + EMAIL','name four layers; one protocol per layer; sending/receiving email; SMTP vs MIME'],['2','ETHERNET','define Ethernet; describe frame; explain external communication using IP'],['3','BITTORRENT','peer · swarm · tracker · leech · seed; how to deal with leeches'],['4','ROUTING','packet header vs routing table; how they route a packet'],['5','VoIP','how packet switching is used and what problems may occur']];return <div className="h14m-content-v2 h14c-activity">{tasks.map(([n,a,b],i)=><section className={vis(reveal,i+1)} key={n}><b>{n}</b><div><strong>{a}</strong><p>{b}</p></div></section>)}</div>}

function FinalMap({reveal}:{reveal:number}){return <div className="h14m-content-v2 h14c-final-map"><section className={vis(reveal,1)}><strong>APPLICATION</strong><span>HTTP · FTP · SMTP · POP/IMAP · DNS</span></section><i>↓</i><section className={vis(reveal,2)}><strong>TRANSPORT</strong><span>TCP · packetisation · sequence · acknowledgement · retransmission</span></section><i>↓</i><section className={vis(reveal,3)}><strong>INTERNET + LINK</strong><span>IP addressing/routing → Ethernet/wireless frame on local segment</span></section><i>↓</i><section className={vis(reveal,4)}><strong>NETWORK DELIVERY</strong><span>circuit switching OR packet switching; router + header + routing table move data</span></section><footer className={vis(reveal,5)}>Chapter 14 is one connected story: protocols define how data is prepared, carried, checked, routed and finally reconstructed.</footer></div>}

export function Chapter14PresentationContentV2({beat,reveal}:Props){
  switch(beat.id){
    case 'h14p-141-hook':return <ProtocolAgreement/>;
    case 'h14p-141-objectives':return <Objectives part="14.1" reveal={reveal}/>;
    case 'h14p-141-protocol':return <Definition term="Protocol" definition="A set of rules governing communication across a network; the rules are agreed by both sender and recipient." example="Parity checking is only meaningful if both sides agree whether even or odd parity is being used."/>;
    case 'h14p-141-stack':return <TcpIpStack reveal={reveal}/>;
    case 'h14p-141-units':return <Encapsulation reveal={reveal}/>;
    case 'h14p-141-protocol-map':return <ProtocolMap reveal={reveal}/>;
    case 'h14p-141-ftp-detail':return <Ftp reveal={reveal}/>;
    case 'h14p-141-http':return <Http reveal={reveal}/>;
    case 'h14p-141-email':return <EmailJourney reveal={reveal}/>;
    case 'h14p-141-email-mechanics':return <EmailMechanics reveal={reveal}/>;
    case 'h14p-141-pop-imap':return <PopImap reveal={reveal}/>;
    case 'h14p-141-transport-family':return <Transport reveal={reveal}/>;
    case 'h14p-141-tcp':return <Handshake reveal={reveal}/>;
    case 'h14p-141-ip-link':return <IpLink reveal={reveal}/>;
    case 'h14p-141-ethernet':return <EthernetFrame reveal={reveal}/>;
    case 'h14p-141-ethernet-detail':return <EthernetDetails reveal={reveal}/>;
    case 'h14p-141-wireless':return <Wireless reveal={reveal}/>;
    case 'h14p-141-bittorrent':return <BitTorrentProcess reveal={reveal}/>;
    case 'h14p-141-bittorrent-terms':return <BitTorrentTerms reveal={reveal}/>;
    case 'h14p-141-check':return <Check141 reveal={reveal}/>;
    case 'h14p-142-hook':return <SwitchingHook/>;
    case 'h14p-142-objectives':return <Objectives part="14.2" reveal={reveal}/>;
    case 'h14p-142-circuit-stages':return <CircuitStages reveal={reveal}/>;
    case 'h14p-142-circuit-route':return <Network mode="circuit" reveal={reveal}/>;
    case 'h14p-142-circuit-failure':return <Network mode="circuit" reveal={Math.max(reveal,4)} broken/>;
    case 'h14p-142-packet-basics':return <PacketBasics reveal={reveal}/>;
    case 'h14p-142-packet-route':return <Network mode="packet" reveal={reveal}/>;
    case 'h14p-142-compare':return <SwitchCompare reveal={reveal}/>;
    case 'h14p-142-circuit-pros-cons':return <ProsCons kind="circuit" reveal={reveal}/>;
    case 'h14p-142-packet-pros-cons':return <ProsCons kind="packet" reveal={reveal}/>;
    case 'h14p-142-video-example':return <VideoExample reveal={reveal}/>;
    case 'h14p-142-hop':return <Hop reveal={reveal}/>;
    case 'h14p-142-packet-control':return <PacketControl reveal={reveal}/>;
    case 'h14p-142-header':return <HeaderCore reveal={reveal}/>;
    case 'h14p-142-header-extended':return <HeaderExtended reveal={reveal}/>;
    case 'h14p-142-routing':return <RoutingDecision reveal={reveal}/>;
    case 'h14p-142-routing-fields':return <RoutingFields reveal={reveal}/>;
    case 'h14p-142-web-page':return <WebExample reveal={reveal}/>;
    case 'h14p-142-exam':return <ExamRouting reveal={reveal}/>;
    case 'h14p-142-activity14a':return <Activity14A reveal={reveal}/>;
    case 'h14p-142-recap':return <FinalMap reveal={reveal}/>;
    default:return null;
  }
}
