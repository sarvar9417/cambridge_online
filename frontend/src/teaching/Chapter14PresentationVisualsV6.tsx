import type { LessonPresentationBeat } from './lesson-experience-model';

const shown=(reveal:number,index:number)=>reveal>=index;
const cls=(visible:boolean)=>visible?'is-visible':'';

function Diagnostic141(){
  const items=[
    ['IP + TCP','Explain both terms and how they differ.'],
    ['Protocols','Why do communicating devices need agreed rules?'],
    ['Peer-to-peer','How does P2P work? What are its pros and cons?'],
    ['Stack + queue','Recall the two data structures and typical uses.'],
    ['Ethernet + DNS + HTTP','Recall local networking, name resolution and web transfer.'],
  ];
  return <div className="h14v6-diagnostic">{items.map(([title,note],i)=><section key={title}><span>{String(i+1).padStart(2,'0')}</span><strong>{title}</strong><small>{note}</small></section>)}</div>;
}

function Objectives({items,reveal}:{items:string[];reveal:number}){
  return <div className="h14v6-objectives">{items.map((item,i)=><section className={cls(shown(reveal,i+1))} key={item}><span>{i+1}</span><p>{item}</p></section>)}</div>;
}

function ProtocolNeed({reveal}:{reveal:number}){
  return <div className="h14v6-protocol-need">
    <div className="h14v6-host-card"><span>HOST A</span><strong>EVEN PARITY</strong></div>
    <div className={`h14v6-rule ${cls(shown(reveal,1))}`}><b>AGREED PROTOCOL</b><i>same rule set</i></div>
    <div className="h14v6-host-card"><span>HOST B</span><strong>EVEN PARITY</strong></div>
    <footer className={cls(shown(reveal,1))}><b>Protocol</b><span>a set of rules governing communication; sender and recipient agree the rules.</span></footer>
  </div>;
}

function TcpIpStack({reveal}:{reveal:number}){
  const layers=[
    ['4','APPLICATION','programs + application protocols','DATA'],
    ['3','TRANSPORT','host-to-host delivery · sequence · acknowledgement','SEGMENT'],
    ['2','INTERNET','IP addressing · routing between networks','DATAGRAM'],
    ['1','LINK','local frame delivery · MAC addressing','FRAME'],
  ];
  return <div className="h14v6-stack">
    <aside><span>SENDING</span><b>↓</b><small>4 → 1</small></aside>
    <div>{layers.map(([n,name,note,unit],i)=><section className={cls(shown(reveal,i+1))} key={name}><i>{n}</i><strong>{name}</strong><small>{note}</small><b>{unit}</b><em/></section>)}</div>
    <aside className="receive"><small>1 → 4</small><b>↑</b><span>RECEIVING</span></aside>
    {shown(reveal,4)?<footer>Layers decompose communication into manageable software modules with their own functionality.</footer>:null}
  </div>;
}

function Encapsulation({reveal}:{reveal:number}){
  const stages=[
    ['APPLICATION DATA',['DATA']],
    ['SEGMENT',['TCP HEADER','DATA']],
    ['DATAGRAM',['IP HEADER','TCP HEADER','DATA']],
    ['FRAME',['LINK HEADER','IP DATAGRAM','TRAILER']],
  ];
  return <div className="h14v6-encap">{stages.map(([name,parts],i)=><section className={cls(shown(reveal,i+1))} key={name as string}><strong>{name as string}</strong><div>{(parts as string[]).map((part,j)=><span data-part={j} key={part}>{part}</span>)}</div>{i<stages.length-1?<i>↓ add control information</i>:null}</section>)}</div>;
}

function ProtocolMap({reveal}:{reveal:number}){
  const groups=[
    ['WEB','HTTP','transfer web-page files/resources'],
    ['FILES','FTP','transfer files between devices'],
    ['SEND MAIL','SMTP','send email'],
    ['RECEIVE MAIL','POP3/4 · IMAP','receive / synchronise email'],
    ['LOOKUP','DNS','domain name → IP address'],
    ['ROUTING INFO','RIP','routers exchange routing information'],
    ['MANAGEMENT','SNMP','network-management information'],
  ];
  return <div className="h14v6-protocol-map">{groups.map(([tag,name,note],i)=><section className={cls(shown(reveal,Math.ceil((i+1)/2)))} key={name}><span>{tag}</span><strong>{name}</strong><small>{note}</small></section>)}</div>;
}

function Ftp({reveal}:{reveal:number}){
  const steps=[
    ['CONNECT','ftp://username@ftp.example.gov/'],
    ['ANONYMOUS','331 Anonymous access allowed'],
    ['COMMANDS','delete · close · rename · cd · lcd'],
    ['SESSION','host_name → user id → password'],
  ];
  return <div className="h14v6-ftp">{steps.map(([title,value],i)=><section className={cls(shown(reveal,i+1))} key={title}><span>{i+1}</span><strong>{title}</strong><code>{value}</code>{i===2?<small>cd = remote directory · lcd = local directory</small>:null}</section>)}</div>;
}

function Http({reveal}:{reveal:number}){
  const steps=[
    ['URL','user enters the website address'],
    ['HTTP(S)','request moves from application layer towards TCP'],
    ['TCP','creates packets / supports acknowledgement'],
    ['DNS','domain name is matched to the website IP address'],
    ['SERVER','web server returns HTML/resources'],
    ['BROWSER','interprets and displays the response'],
  ];
  return <div className="h14v6-http">
    <div className="browser"><header><i/><i/><i/><code>https://example.com</code></header><main><b>WEB BROWSER</b><small>client request</small></main></div>
    <svg viewBox="0 0 1040 350" aria-hidden="true">
      <path className="backbone" d="M150 190 C260 70 365 75 465 185 S680 295 790 175 S915 95 970 180"/>
      {steps.slice(1,5).map(([name,note],i)=>{const pts=[[310,105],[500,245],[705,105],[915,230]][i];return <g className={`node ${cls(shown(reveal,i+2))}`} transform={`translate(${pts[0]} ${pts[1]})`} key={name}><rect x="-78" y="-34" width="156" height="68" rx="15"/><text y="-3">{name}</text><text className="note" y="18">{note}</text></g>})}
      {shown(reveal,2)?<circle cx="150" cy="190" r="10" className="packet request"><animateMotion className="h14v6-smil" dur="4.6s" repeatCount="indefinite" path="M150 190 C260 70 365 75 465 185 S680 295 790 175 S915 95 970 180"/></circle>:null}
      {shown(reveal,5)?<circle cx="970" cy="180" r="10" className="packet response"><animateMotion className="h14v6-smil" dur="4.6s" begin="1.2s" repeatCount="indefinite" path="M970 180 C915 95 790 70 705 175 S500 295 420 185 S250 70 150 190"/></circle>:null}
    </svg>
    <div className="steps">{steps.map(([name,note],i)=><span className={cls(shown(reveal,i+1))} key={name}><b>{i+1}</b><strong>{name}</strong><small>{note}</small></span>)}</div>
  </div>;
}

function EmailJourney({reveal}:{reveal:number}){
  const nodes=[['SENDER','client'],['SMTP + MIME','send'],['ISP MAIL SERVER','sender'],['INTERNET','transfer'],['DOMAIN MAIL SERVER','recipient'],['POP / IMAP','receive'],['RECIPIENT','client']];
  return <div className="h14v6-email"><div className="flow">{nodes.map(([name,note],i)=><section className={cls(shown(reveal,Math.min(6,i+1)))} data-role={i===1?'push':i===5?'pull':i===3?'internet':'node'} key={`${name}-${i}`}><span>{i+1}</span><strong>{name}</strong><small>{note}</small>{i<nodes.length-1?<i>→</i>:null}</section>)}</div>{shown(reveal,2)?<div className="mail-pulse out">MAIL</div>:null}{shown(reveal,5)?<div className="mail-pulse in">MAIL</div>:null}</div>;
}

function EmailMechanics({reveal}:{reveal:number}){
  const items=[
    ['SMTP · PUSH','text-based + connection-based; client keeps the connection active then uploads email'],
    ['MIME','supports media/binary attachments; MIME header identifies the attachment/media type'],
    ['POP / IMAP · PULL','client periodically connects, checks/downloads mail, then closes the connection'],
    ['COURSEBOOK NOTE','the source notes increased HTTP use; SMTP remains used between email servers'],
  ];
  return <div className="h14v6-mechanics">{items.map(([title,note],i)=><section className={cls(shown(reveal,i+1))} key={title}><span>{String(i+1).padStart(2,'0')}</span><strong>{title}</strong><p>{note}</p></section>)}</div>;
}

function PopImap({reveal}:{reveal:number}){
  return <div className="h14v6-popimap">
    <section className={cls(shown(reveal,1))}><header>POP3/4</header><div className="server">SERVER <b>MAIL</b><b>MAIL</b><b>MAIL</b></div><i>↓ download</i><div className="device">CLIENT</div><p>Coursebook model: server and client are not kept synchronised; downloaded mail is removed from the server.</p></section>
    <section className={cls(shown(reveal,2))}><header>IMAP</header><div className="server">SERVER <b>MAIL</b><b>MAIL</b><b>MAIL</b></div><i>⇅ synchronise</i><div className="devices"><b>CLIENT 1</b><b>CLIENT 2</b></div><p>A copy is downloaded; the original stays on the server until manually deleted.</p></section>
  </div>;
}

function TransportFamily({reveal}:{reveal:number}){
  const items=[['TCP','considered in detail'],['UDP','named by the source'],['SCTP','named by the source'],['PAR','positive acknowledgement with retransmission']];
  return <div className="h14v6-transport">{items.map(([name,note],i)=><section className={cls(shown(reveal,i+1))} data-main={name==='TCP'||name==='PAR'?'true':'false'} key={name}><strong>{name}</strong><small>{note}</small>{name==='PAR'?<div><span>packet sent</span><i>→</i><span>no positive ACK</span><i>→</i><b>RE-SEND</b></div>:null}</section>)}</div>;
}

function Handshake({reveal}:{reveal:number}){
  const steps=[
    ['X → Y','synchronisation sequence bits'],
    ['Y → X','acknowledgement + own synchronisation sequence bits'],
    ['X → Y','acknowledgement received'],
    ['X ⇄ Y','data transmission can now take place'],
  ];
  return <div className="h14v6-handshake"><header><section><span>HOST X</span><b>X</b></section><section><span>HOST Y</span><b>Y</b></section></header><main><i/><i/>{steps.map(([direction,label],i)=><div className={`message ${cls(shown(reveal,i+1))}`} data-direction={i===1?'left':i===3?'both':'right'} style={{top:`${12+i*22}%`}} key={label}><strong>{direction}</strong><span>{label}</span></div>)}</main>{shown(reveal,4)?<footer><b>HOST-TO-HOST</b><span>TCP is connection-orientated and uses acknowledgement/retransmission for safe delivery.</span></footer>:null}</div>;
}

function IpLink({reveal}:{reveal:number}){
  const rows=[
    ['IDENTITY','intended network + host','local segment / hardware'],
    ['ADDRESSING','adds source + destination IP','maps IP to MAC / physical addressing'],
    ['UNIT','IP datagram','frame'],
    ['JOB','route between networks','move traffic locally'],
  ];
  return <div className="h14v6-iplink"><header><span>INTERNET LAYER · IP</span><span>LINK / DATA-LINK LAYER</span></header>{rows.map(([label,left,right],i)=><div className={cls(shown(reveal,i+1))} key={label}><b>{label}</b><p>{left}</p><p>{right}</p></div>)}</div>;
}

function EthernetFrame({reveal}:{reveal:number}){
  const fields=[['PRE-AMBLE','8 B'],['START','1 B'],['DESTINATION','6 B'],['SOURCE','6 B'],['TYPE / LENGTH','2 B'],['MESSAGE','46–1500 B'],['FRAME CHECK','4 B'],['INTERPACKET GAP','12 B']];
  return <div className="h14v6-frame"><div>{fields.map(([name,size],i)=><section className={cls(shown(reveal,i+1))} key={name}><strong>{name}</strong><small>{size}</small></section>)}{shown(reveal,1)?<i className="pulse"/>:null}</div>{shown(reveal,8)?<footer>Ethernet data: 64–1518 bytes in the source figure; the interpacket gap sits outside the Ethernet data block.</footer>:null}</div>;
}

function EthernetDetail({reveal}:{reveal:number}){
  const items=[
    ['BROADCAST','FF:FF:FF:FF:FF:FF','targets every device on the LAN'],
    ['TYPE / LENGTH','≤ 1539 = length','> 1539 = Ethernet type such as IPv4/IPv6 in the source example'],
    ['FRAME CHECK','checksum','checks data integrity after transmission'],
    ['VLAN','1539 B → around 9000 B','coursebook source detail'],
  ];
  return <div className="h14v6-ethernet-detail">{items.map(([title,value,note],i)=><section className={cls(shown(reveal,i+1))} key={title}><span>{title}</span><strong>{value}</strong><small>{note}</small>{title==='BROADCAST'?<div className="lan"><b>SWITCH</b><i>→ D1</i><i>→ D2</i><i>→ D3</i></div>:null}</section>)}</div>;
}

function Wireless({reveal}:{reveal:number}){
  const items=[
    ['WiFi','IEEE 802.11','CSMA/CA + DCF','free channel → transmit → acknowledgement; no ACK → random wait → retry'],
    ['Bluetooth','IEEE 802.15','short range','short-range data transmission / communication'],
    ['WiMax','IEEE 802.16','wireless MAN','802.16-2004 fixed · 802.16-2005 mobile'],
  ];
  return <div className="h14v6-wireless">{items.map(([name,standard,tag,note],i)=><section className={cls(shown(reveal,i+1))} key={name}><span>{tag}</span><strong>{name}</strong><code>{standard}</code><p>{note}</p>{name==='WiFi'?<div className="wifi"><b>DEVICE</b><i>)))</i><b>ACCESS POINT</b></div>:null}</section>)}</div>;
}

function BitTorrent({reveal}:{reveal:number}){
  const peers=[['SEED',120,85],['PEER',340,55],['LEECH',570,90],['SEED',715,230],['NEW',430,315],['SEED',150,285]] as const;
  return <div className="h14v6-torrent"><svg viewBox="0 0 850 390" aria-hidden="true"><g className="links">{peers.map(([,x,y])=><line x1="425" y1="190" x2={x} y2={y} key={`${x}-${y}`}/>)}</g>{shown(reveal,2)?<g className="tracker" transform="translate(425 190)"><circle r="58"/><text y="-4" textAnchor="middle">TRACKER</text><text className="note" y="18" textAnchor="middle">peer details</text></g>:null}{peers.map(([name,x,y],i)=>shown(reveal,Math.min(5,i+1))?<g className="peer" data-role={name.toLowerCase()} transform={`translate(${x} ${y})`} key={`${name}-${i}`}><circle r="36"/><text y="5" textAnchor="middle">{name}</text></g>:null)}{shown(reveal,3)?<circle cx="120" cy="85" r="9" className="piece p1"><animateMotion className="h14v6-smil" dur="3.4s" repeatCount="indefinite" path="M120 85 Q230 20 340 55"/></circle>:null}{shown(reveal,3)?<circle cx="340" cy="55" r="9" className="piece p2"><animateMotion className="h14v6-smil" dur="4s" begin=".6s" repeatCount="indefinite" path="M340 55 Q455 20 570 90"/></circle>:null}{shown(reveal,4)?<circle cx="715" cy="230" r="9" className="piece p3"><animateMotion className="h14v6-smil" dur="4.2s" repeatCount="indefinite" path="M715 230 Q590 345 430 315"/></circle>:null}</svg><footer>{['torrent metadata','contact tracker','parallel pieces','peers become sources','reassemble final file'].map((x,i)=><span className={cls(shown(reveal,i+1))} key={x}><b>{i+1}</b>{x}</span>)}</footer></div>;
}

function BitTorrentTerms({reveal}:{reveal:number}){
  const terms=[['SWARM','connected peers sharing the torrent/tracker'],['AVAILABILITY','number of complete copies distributed across the swarm'],['SEED','peer making downloaded file/pieces available'],['TRACKER','central server storing peer details/IP addresses'],['LEECH','poor share ratio; downloads much more than uploads'],['LURKER','downloads but supplies no new content to the community']];
  return <div className="h14v6-torrent-terms"><div>{terms.map(([term,note],i)=><section className={cls(shown(reveal,i+1))} key={term}><strong>{term}</strong><small>{note}</small></section>)}</div>{shown(reveal,5)?<footer><span>SHARE RATIO</span><code>uploaded ÷ downloaded</code><b>&gt; 1 positive</b><strong>&lt; 1 negative</strong></footer>:null}</div>;
}

function QuickCheck({reveal}:{reveal:number}){
  return <div className="h14v6-check"><section><span>01</span><strong>WHY PROTOCOLS?</strong><p>Both sides need agreed communication rules.</p></section><section><span>02</span><strong>SENDING ORDER?</strong><p>Application → Transport → Internet → Link</p></section>{shown(reveal,1)?<footer>Say both answers without notes, then explain one protocol example.</footer>:null}</div>;
}

function Diagnostic142(){
  return <div className="h14v6-diagnostic h14v6-diagnostic--142"><section><span>01</span><strong>PSTN</strong><small>How does a telephone call use a dedicated connection?</small></section><section><span>02</span><strong>VoIP</strong><small>How can a video call travel over the internet?</small></section><section><span>03</span><strong>3 PACKETS</strong><small>Sketch three possible routes from computer A to B.</small></section></div>;
}

function CircuitStages({reveal}:{reveal:number}){
  const stages=[['ESTABLISH','create a dedicated circuit/channel'],['TRANSFER','data travels bi-directionally on the reserved route'],['TERMINATE','release the circuit after communication ends']];
  return <div className="h14v6-circuit-stages">{stages.map(([name,note],i)=><section className={cls(shown(reveal,i+1))} key={name}><span>{i+1}</span><strong>{name}</strong><p>{note}</p>{i<2?<i>→</i>:null}</section>)}</div>;
}

const topo=[['A',65,190],['R1',190,75],['R2',190,190],['R3',190,305],['R4',330,70],['R5',330,190],['R6',330,310],['R8',480,190],['R7',620,120],['R9',620,300],['R10',755,190],['B',860,190]] as const;
function TopologyNodes(){return <>{topo.map(([name,x,y])=><g className="router" transform={`translate(${x} ${y})`} key={name}><circle r={name==='A'||name==='B'?30:22}/><text dy="5" textAnchor="middle">{name}</text></g>)}</>}
function BaseTopology(){return <g className="network-lines"><path d="M65 190 L190 75 L330 70 L480 190 L620 120 L755 190 L860 190"/><path d="M65 190 L190 190 L330 190 L480 190 L620 120 L755 190"/><path d="M65 190 L190 305 L330 310 L480 190 L620 300 L755 190 L860 190"/><path d="M190 75 L330 190 L190 305"/><path d="M330 70 L480 190 L330 310"/><path d="M620 120 L620 300"/></g>}

function CircuitRoute({reveal,failure=false}:{reveal:number;failure?:boolean}){
  const route='M65 190 L190 190 L330 190 L480 190 L620 120 L755 190 L860 190';
  return <div className="h14v6-network"><svg viewBox="0 0 920 380" aria-hidden="true"><BaseTopology/><TopologyNodes/>{shown(reveal,1)?<path className={`dedicated ${failure?'failed':''}`} d={route}/>:null}{!failure&&shown(reveal,2)?<circle cx="65" cy="190" r="10" className="flow-dot"><animateMotion className="h14v6-smil" dur="3s" repeatCount="indefinite" path={route}/></circle>:null}{failure&&shown(reveal,1)?<g className="failure" transform="translate(550 155)"><circle r="22"/><text dy="7" textAnchor="middle">×</text></g>:null}</svg><footer><b>COURSEBOOK ROUTE</b><span>A → R2 → R5 → R8 → R7 → R10 → B</span>{failure?<strong>No alternative route for this established circuit after the dedicated line fails.</strong>:null}</footer></div>;
}

function PacketBasics({reveal}:{reveal:number}){
  const items=[['SPLIT','message → packets'],['INDEPENDENT','each packet can follow its own path'],['SELECT','routing can depend on queued datagrams / shortest available path'],['REASSEMBLE','arrival order can differ; destination restores order']];
  return <div className="h14v6-packet-basics">{items.map(([name,note],i)=><section className={cls(shown(reveal,i+1))} key={name}><span>P{i+1}</span><strong>{name}</strong><small>{note}</small></section>)}</div>;
}

function PacketRoutes({reveal}:{reveal:number}){
  const routes=[
    ['P1','M65 190 L190 75 L330 70 L480 190 L620 120 L755 190 L860 190','4.8s'],
    ['P2','M65 190 L190 190 L330 190 L480 190 L620 120 L755 190 L860 190','3.4s'],
    ['P3','M65 190 L190 305 L330 310 L480 190 L620 300 L755 190 L860 190','5.3s'],
    ['P4','M65 190 L190 75 L330 190 L480 190 L620 300 L755 190 L860 190','4.1s'],
  ];
  return <div className="h14v6-network h14v6-network--packets"><svg viewBox="0 0 920 380" aria-hidden="true"><BaseTopology/><TopologyNodes/>{routes.map(([name,path,dur],i)=>shown(reveal,i+2)?<g key={name}><path className={`packet-route r${i+1}`} d={path}/><circle cx="65" cy="190" r="10" className={`moving-packet p${i+1}`}><animateMotion className="h14v6-smil" dur={dur} begin={`${i*.35}s`} repeatCount="indefinite" path={path}/></circle></g>:null)}</svg><footer className="reassembly"><span>SENT: P1 · P2 · P3 · P4</span>{shown(reveal,5)?<b>ARRIVAL MAY DIFFER</b>:null}{shown(reveal,6)?<strong>SEQUENCE NUMBER → REASSEMBLE CORRECT ORDER</strong>:null}</footer></div>;
}

function SwitchingCompare({reveal}:{reveal:number}){
  const rows=[['Route setup','required','not required'],['Dedicated path','yes','no'],['Route used','same route','packets can differ'],['Arrival order','same order','may differ'],['Bandwidth','whole channel reserved','shared'],['After route fault','no alternative for established circuit','packets can be rerouted']];
  return <div className="h14v6-compare"><header><span>FEATURE</span><strong>CIRCUIT</strong><strong>PACKET</strong></header>{rows.map(([f,c,p],i)=><div className={cls(shown(reveal,i+1))} key={f}><b>{f}</b><p>{c}</p><p>{p}</p></div>)}</div>;
}

function ProsCons({reveal,type}:{reveal:number;type:'circuit'|'packet'}){
  const data=type==='circuit'?{
    pros:['dedicated to one transmission','whole bandwidth available','faster transfer than packet switching','frames arrive in order','same route prevents route variation','works better for real-time applications'],
    cons:['inflexible / may send empty frames','idle circuit cannot be used by others','reserved whether used or not','line fault has no alternative routing','dedicated channels need greater bandwidth','link setup may take a long time'],
  }:{
    pros:['no single line tied up','failed/busy/faulty lines can be bypassed','traffic use can expand easily','source comparison charges for connectivity duration','high data-transmission rate possible','uses digital networks'],
    cons:['protocols can be complex','lost packets must be re-sent','poorer for real-time streams','bandwidth is shared','destination waits for reassembly','large data volumes can require RAM'],
  };
  return <div className="h14v6-proscons"><section><header>BENEFITS</header>{data.pros.map((x,i)=><p className={cls(shown(reveal,i+1))} key={x}><span>+</span>{x}</p>)}</section><section><header>DRAWBACKS</header>{data.cons.map((x,i)=><p className={cls(shown(reveal,i+1))} key={x}><span>−</span>{x}</p>)}</section></div>;
}

function VideoExample({reveal}:{reveal:number}){
  const symptoms=[['SYNC','picture and sound may not stay synchronised'],['PAUSE','destination waits while packets are reassembled'],['QUALITY','competing traffic can degrade sound/video'],['DROP-OUT','packets on different routes can be lost']];
  return <div className="h14v6-video"><div className="call"><section><b>CALLER A</b></section><main>{[1,2,3,4].map((n,i)=><div className={cls(shown(reveal,i+1))} key={n}><span>P{n}</span><i style={{animationDuration:`${2.2+i*.7}s`}}/></div>)}</main><section><b>CALLER B</b></section></div><div className="symptoms">{symptoms.map(([name,note],i)=><span className={cls(shown(reveal,i+1))} key={name}><b>{name}</b>{note}</span>)}</div>{shown(reveal,4)?<footer><strong>CIRCUIT SWITCHING MAY IMPROVE IT</strong><span>one route · correct order · dedicated channel · full bandwidth · no synchronisation loss in the source example</span></footer>:null}</div>;
}

function Hop({reveal}:{reveal:number}){
  const hops=[4,3,2,1,0];
  return <div className="h14v6-hop">{hops.map((hop,i)=><section className={`${cls(shown(reveal,i+1))} ${hop===0?'zero':''}`} key={hop}><small>{i===0?'PACKET':`ROUTER ${i}`}</small><strong>HOP {hop}</strong>{i<hops.length-1?<i>→</i>:null}</section>)}{shown(reveal,5)?<footer>Destination not reached when hop = 0 → packet is deleted at the next router.</footer>:null}</div>;
}

function PacketControl({reveal}:{reveal:number}){
  return <div className="h14v6-control"><section><header>CHECKSUM / PARITY</header><div><span><b>PACKET</b><code>101101…</code></span><i>→</i><span className={cls(shown(reveal,1))}><b>CHECK</b><code>0110</code></span><i>→</i><span className={cls(shown(reveal,2))}><b>DESTINATION</b><code className="bad">0101</code></span></div>{shown(reveal,2)?<p>MISMATCH → request re-send</p>:null}{shown(reveal,3)?<aside><b>RE-SEND</b><span>fresh packet</span></aside>:null}</section><section className={cls(shown(reveal,3))}><header>PRIORITY / QUEUE</header><div className="queue"><b>HIGH · P1</b><span>MED · P2</span><span>LOW · P3</span><i>→ QUEUE ORDER</i></div></section></div>;
}

function HeaderCore({reveal}:{reveal:number}){
  const fields=[['SOURCE IP','32'],['DESTINATION IP','32'],['HOP','8'],['LENGTH','16'],['PACKET COUNT','16'],['SEQUENCE','16'],['CHECKSUM','16']];
  return <div className="h14v6-header"><div>{fields.map(([name,bits],i)=><section className={`${cls(shown(reveal,i+1))} ${reveal===i+1?'active':''}`} key={name}><strong>{name}</strong><small>{bits} bits</small></section>)}<section className="data is-visible"><strong>DATA</strong></section></div><footer>{shown(reveal,2)?<span><b>ADDRESSING</b> source + destination IP</span>:null}{shown(reveal,3)?<span><b>LIFETIME</b> hop number</span>:null}{shown(reveal,6)?<span><b>ORDER</b> sequence number</span>:null}{shown(reveal,7)?<span><b>INTEGRITY</b> checksum</span>:null}</footer></div>;
}

function HeaderExtended({reveal}:{reveal:number}){
  const fields=[['PROTOCOL VERSION','4 bits','IPv4 / IPv6'],['HEADER LENGTH','4 bits','multiples of four bytes'],['PRIORITY','8 bits','packet priority'],['FRAGMENT FLAGS','3 bits','0 · DF · MF'],['FRAGMENT OFFSET','13 bits','position in original packet'],['TRANSPORT PROTOCOL','8 bits','TCP / UDP']];
  return <div className="h14v6-extended">{fields.map(([name,bits,note],i)=><section className={cls(shown(reveal,i+1))} key={name}><span>{bits}</span><strong>{name}</strong><small>{note}</small></section>)}</div>;
}

function Routing({reveal}:{reveal:number}){
  return <div className="h14v6-routing"><section className="packet"><span>PACKET HEADER</span><strong>Destination → Network B</strong></section><i className={cls(shown(reveal,1))}>↓ examine destination</i><section className={`router-box ${cls(shown(reveal,2))}`}><strong>ROUTER</strong><small>compare header with routing table</small></section><table className={cls(shown(reveal,3))}><thead><tr><th>Destination</th><th>Metric</th><th>Next hop</th></tr></thead><tbody><tr><td>Network B</td><td>18</td><td>R4</td></tr><tr className={shown(reveal,4)?'best':''}><td>Network B</td><td>8</td><td>R7</td></tr><tr><td>Network B</td><td>14</td><td>R9</td></tr></tbody></table>{shown(reveal,4)?<aside><span>BEST AVAILABLE ROUTE</span><strong>FORWARD → R7</strong><small>new next-router MAC can be added to the packet header</small></aside>:null}</div>;
}

function RoutingFields({reveal}:{reveal:number}){
  const fields=[['NUMBER OF HOPS','hop count'],['NEXT-ROUTER MAC','address of the next router'],['METRICS','cost for route efficiency'],['NETWORK DESTINATION','network ID / pathway'],['GATEWAY','next-hop gateway'],['NETMASK','used to generate network ID'],['INTERFACE','local interface used to reach gateway']];
  return <div className="h14v6-routing-fields">{fields.map(([name,note],i)=><section className={cls(shown(reveal,Math.ceil((i+1)/2)))} key={name}><strong>{name}</strong><small>{note}</small></section>)}</div>;
}

function WebPageExample({reveal}:{reveal:number}){
  const steps=[['1','DIVIDE','web page → packets'],['2','HEADER','destination IP + control data'],['3','LOOKUP','router compares header with routing table'],['4','NEXT HOP','determine next router + add its MAC'],['5','HOP CHECK','delete if hop reaches 0 before destination'],['6','ROUTE','different packets may take different paths'],['7','REASSEMBLE','destination rebuilds the page']];
  return <div className="h14v6-web-example">{steps.map(([n,name,note],i)=><section className={cls(shown(reveal,i+1))} key={n}><span>{n}</span><strong>{name}</strong><small>{note}</small>{i<steps.length-1?<i>→</i>:null}</section>)}</div>;
}

function ExamCheck({reveal}:{reveal:number}){
  return <div className="h14v6-exam"><header>CAMBRIDGE-STYLE RESPONSE</header><blockquote>How are a packet header and routing table used to route a packet efficiently?</blockquote>{shown(reveal,1)?<div><span>READ destination from header</span><i>→</i><span>COMPARE with routing table</span><i>→</i><span>USE metrics / route information</span><i>→</i><strong>FORWARD to best next hop / interface</strong></div>:null}</div>;
}

function Activity14A({reveal}:{reveal:number}){
  const groups=[['1','TCP/IP + EMAIL','layers, one protocol per layer, SMTP vs MIME'],['2','ETHERNET','definition, frame contents, external communication via IP'],['3','BITTORRENT','peer, swarm, tracker, leech, seed + leech behaviour'],['4','ROUTING','packet header vs routing table + routing process'],['5','VoIP','packet switching process + possible problems']];
  return <div className="h14v6-activity">{groups.map(([n,title,note],i)=><section className={cls(shown(reveal,i+1))} key={n}><span>{n}</span><strong>{title}</strong><small>{note}</small></section>)}</div>;
}

function Practice({reveal}:{reveal:number}){
  const qs=[['Q1','P2P terminology · TCP/IP layers · email protocols'],['Q2','Ethernet frame · metadata · BitTorrent'],['Q3','Circuit/packet switching · hop number · checksum · routing']];
  return <div className="h14v6-practice">{qs.map(([q,note],i)=><section className={cls(shown(reveal,i+1))} key={q}><strong>{q}</strong><p>{note}</p><span>ATTEMPT → CHECK → IMPROVE</span></section>)}</div>;
}

function Recap({items,reveal}:{items:string[];reveal:number}){
  return <div className="h14v6-recap"><div className="core"><span>CHAPTER 14</span><strong>COMMUNICATION + INTERNET TECHNOLOGIES</strong></div>{items.map((x,i)=><section className={cls(shown(reveal,i+1))} key={x}><span>{i+1}</span><p>{x}</p></section>)}</div>;
}

const ALL_IDS=[
  'h14p-141-hook','h14p-141-objectives','h14p-141-protocol','h14p-141-stack','h14p-141-units','h14p-141-protocol-map','h14p-141-ftp-detail','h14p-141-http','h14p-141-email','h14p-141-email-mechanics','h14p-141-pop-imap','h14p-141-transport-family','h14p-141-tcp','h14p-141-ip-link','h14p-141-ethernet','h14p-141-ethernet-detail','h14p-141-wireless','h14p-141-bittorrent','h14p-141-bittorrent-terms','h14p-141-check',
  'h14p-142-hook','h14p-142-objectives','h14p-142-circuit-stages','h14p-142-circuit-route','h14p-142-circuit-failure','h14p-142-packet-basics','h14p-142-packet-route','h14p-142-compare','h14p-142-circuit-pros-cons','h14p-142-packet-pros-cons','h14p-142-video-example','h14p-142-hop','h14p-142-packet-control','h14p-142-header','h14p-142-header-extended','h14p-142-routing','h14p-142-routing-fields','h14p-142-web-page','h14p-142-exam','h14p-142-activity14a','h14p-142-practice','h14p-142-recap','h14p-142-recap-routing',
] as const;
const ids=new Set<string>(ALL_IDS);

export const CHAPTER_14_V6_VISUAL_IDS=ALL_IDS;
export function hasChapter14PresentationVisualV6(beat:LessonPresentationBeat){return ids.has(beat.id);}

export function Chapter14PresentationVisualV6({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.id){
    case 'h14p-141-hook':return <Diagnostic141/>;
    case 'h14p-141-objectives':return <Objectives items={beat.bullets??[]} reveal={reveal}/>;
    case 'h14p-141-protocol':return <ProtocolNeed reveal={reveal}/>;
    case 'h14p-141-stack':return <TcpIpStack reveal={reveal}/>;
    case 'h14p-141-units':return <Encapsulation reveal={reveal}/>;
    case 'h14p-141-protocol-map':return <ProtocolMap reveal={reveal}/>;
    case 'h14p-141-ftp-detail':return <Ftp reveal={reveal}/>;
    case 'h14p-141-http':return <Http reveal={reveal}/>;
    case 'h14p-141-email':return <EmailJourney reveal={reveal}/>;
    case 'h14p-141-email-mechanics':return <EmailMechanics reveal={reveal}/>;
    case 'h14p-141-pop-imap':return <PopImap reveal={reveal}/>;
    case 'h14p-141-transport-family':return <TransportFamily reveal={reveal}/>;
    case 'h14p-141-tcp':return <Handshake reveal={reveal}/>;
    case 'h14p-141-ip-link':return <IpLink reveal={reveal}/>;
    case 'h14p-141-ethernet':return <EthernetFrame reveal={reveal}/>;
    case 'h14p-141-ethernet-detail':return <EthernetDetail reveal={reveal}/>;
    case 'h14p-141-wireless':return <Wireless reveal={reveal}/>;
    case 'h14p-141-bittorrent':return <BitTorrent reveal={reveal}/>;
    case 'h14p-141-bittorrent-terms':return <BitTorrentTerms reveal={reveal}/>;
    case 'h14p-141-check':return <QuickCheck reveal={reveal}/>;
    case 'h14p-142-hook':return <Diagnostic142/>;
    case 'h14p-142-objectives':return <Objectives items={beat.bullets??[]} reveal={reveal}/>;
    case 'h14p-142-circuit-stages':return <CircuitStages reveal={reveal}/>;
    case 'h14p-142-circuit-route':return <CircuitRoute reveal={reveal}/>;
    case 'h14p-142-circuit-failure':return <CircuitRoute reveal={reveal} failure/>;
    case 'h14p-142-packet-basics':return <PacketBasics reveal={reveal}/>;
    case 'h14p-142-packet-route':return <PacketRoutes reveal={reveal}/>;
    case 'h14p-142-compare':return <SwitchingCompare reveal={reveal}/>;
    case 'h14p-142-circuit-pros-cons':return <ProsCons reveal={reveal} type="circuit"/>;
    case 'h14p-142-packet-pros-cons':return <ProsCons reveal={reveal} type="packet"/>;
    case 'h14p-142-video-example':return <VideoExample reveal={reveal}/>;
    case 'h14p-142-hop':return <Hop reveal={reveal}/>;
    case 'h14p-142-packet-control':return <PacketControl reveal={reveal}/>;
    case 'h14p-142-header':return <HeaderCore reveal={reveal}/>;
    case 'h14p-142-header-extended':return <HeaderExtended reveal={reveal}/>;
    case 'h14p-142-routing':return <Routing reveal={reveal}/>;
    case 'h14p-142-routing-fields':return <RoutingFields reveal={reveal}/>;
    case 'h14p-142-web-page':return <WebPageExample reveal={reveal}/>;
    case 'h14p-142-exam':return <ExamCheck reveal={reveal}/>;
    case 'h14p-142-activity14a':return <Activity14A reveal={reveal}/>;
    case 'h14p-142-practice':return <Practice reveal={reveal}/>;
    case 'h14p-142-recap':
    case 'h14p-142-recap-routing':return <Recap items={beat.bullets??[]} reveal={reveal}/>;
    default:return null;
  }
}
