import type { LessonPresentationBeat } from './lesson-experience-model';

const shown=(reveal:number,index:number)=>reveal>=index;

function ProtocolMapCompact({reveal}:{reveal:number}){
  const protocols=[
    ['HTTP','web-page resources'],['SMTP','send email'],['POP3/4 · IMAP','receive email'],['DNS','domain name → IP'],
    ['FTP','file transfer'],['RIP','routing information'],['SNMP','network management'],['MIME','media/binary attachments'],
  ];
  return <div className="h14v3-protocol-grid">{protocols.map(([name,note],index)=><section className={shown(reveal,Math.ceil((index+1)/2))?'is-visible':''} key={name}><strong>{name}</strong><small>{note}</small></section>)}</div>;
}

function FtpDetail({reveal}:{reveal:number}){
  return <div className="h14v3-ftp">
    <section className={shown(reveal,1)?'is-visible':''}><span>01</span><strong>Connect to an FTP address</strong><code>ftp://username@ftp.example.gov/</code><small>FTP transfers files between computers/devices over a network.</small></section>
    <section className={shown(reveal,2)?'is-visible':''}><span>02</span><strong>Anonymous FTP</strong><code>331 Anonymous access allowed</code><small>Anonymous access allows files to be accessed without identifying the user to the FTP server.</small></section>
    <section className={shown(reveal,3)?'is-visible':''}><span>03</span><strong>FTP commands</strong><div className="h14v3-chip-row"><b>delete</b><b>close</b><b>rename</b><b>cd</b><b>lcd</b></div><small><b>cd</b> changes the remote directory; <b>lcd</b> changes the local directory.</small></section>
    <section className={shown(reveal,4)?'is-visible':''}><span>04</span><strong>Start a session</strong><div className="h14v3-inline-flow"><b>host_name</b><i>→</i><b>user id</b><i>→</i><b>password</b></div><small>The server stores files that users can download as required.</small></section>
  </div>;
}

function EmailFlowCompact({reveal}:{reveal:number}){
  const nodes=[['SENDER','create message'],['SMTP / MIME','send + attachments'],['MAIL SERVER','sender ISP'],['INTERNET','server transfer'],['MAIL SERVER','recipient domain'],['POP / IMAP','receive / sync'],['RECIPIENT','read mail']];
  return <div className="h14v3-flow">{nodes.map(([name,note],index)=><section className={shown(reveal,Math.min(6,index+1))?'is-visible':''} key={`${name}-${index}`}><span>{index+1}</span><strong>{name}</strong><small>{note}</small>{index<nodes.length-1?<i aria-hidden="true">→</i>:null}</section>)}</div>;
}

function EmailMechanics({reveal}:{reveal:number}){
  const items=[
    ['SMTP · PUSH','Text-based and connection-based. The client opens a connection, keeps it active, then uploads new email to the server.'],
    ['MIME · ATTACHMENTS','SMTP alone is text-based. MIME allows media/binary attachments; its header can identify the media type needed by the client.'],
    ['POP / IMAP · PULL','The client periodically connects, checks/downloads new email, then closes the connection.'],
    ['COURSEBOOK NOTE','The source notes increasing HTTP use has superseded POP3/4 and IMAP in many cases, while SMTP remains used between email servers.'],
  ];
  return <div className="h14v3-detail-cards">{items.map(([title,text],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={title}><span>{String(index+1).padStart(2,'0')}</span><strong>{title}</strong><p>{text}</p></section>)}</div>;
}

function TransportFamily({reveal}:{reveal:number}){
  const items=[
    ['TCP','Safe, connection-orientated delivery; sequence, acknowledgement and retransmission.'],
    ['UDP','Named by the source as another transport-layer protocol.'],
    ['SCTP','Named by the source as another transport-layer protocol.'],
    ['PAR','Positive acknowledgement with retransmission: TCP resends when positive acknowledgement is not received.'],
  ];
  return <div className="h14v3-transport">{items.map(([title,text],index)=><section className={shown(reveal,index+1)?'is-visible':''} data-primary={index===0||index===3?'true':'false'} key={title}><strong>{title}</strong><p>{text}</p></section>)}</div>;
}

function EthernetFrameCompact({reveal}:{reveal:number}){
  const fields=[['PRE-AMBLE','8 B'],['START','1 B'],['DESTINATION','6 B'],['SOURCE','6 B'],['TYPE / LENGTH','2 B'],['MESSAGE','46–1500 B'],['FRAME CHECK','4 B'],['INTERPACKET GAP','12 B']];
  return <div className="h14v3-frame">{fields.map(([name,size],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={name}><strong>{name}</strong><small>{size}</small></section>)}</div>;
}

function EthernetDetails({reveal}:{reveal:number}){
  const details=[
    ['Broadcast destination','FF:FF:FF:FF:FF:FF can target every device on the LAN.'],
    ['Ethernet type / length','If frame length ≤ 1539, the value is the frame length; if >1539, it identifies Ethernet type such as IPv4/IPv6 in the source example.'],
    ['Frame check','Includes a checksum used to check data integrity after transmission.'],
    ['VLAN source detail','The coursebook notes Ethernet data can increase from 1539 bytes to around 9000 bytes per frame when VLAN is used.'],
  ];
  return <div className="h14v3-detail-cards h14v3-detail-cards--2">{details.map(([title,text],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={title}><span>{String(index+1).padStart(2,'0')}</span><strong>{title}</strong><p>{text}</p></section>)}</div>;
}

function BitTorrentSwarmCompact({reveal}:{reveal:number}){
  const peers=[['SEED','seed'],['PEER','peer'],['NEW','new'],['LEECH','leech'],['PEER','peer'],['SEED','seed']];
  return <div className="h14v3-swarm">
    <div className={`h14v3-tracker ${shown(reveal,2)?'is-visible':''}`}><strong>TRACKER</strong><small>peer connection details</small></div>
    {peers.map(([label,type],index)=><div className={`h14v3-peer h14v3-peer--${index+1} ${shown(reveal,Math.min(5,index+1))?'is-visible':''}`} data-type={type} key={`${label}-${index}`}><span>●</span><strong>{label}</strong></div>)}
    <div className={`h14v3-pieces ${shown(reveal,3)?'is-visible':''}`}>PIECES ⇄</div>
    <p className={shown(reveal,5)?'is-visible':''}>Pieces may arrive non-sequentially; BitTorrent rearranges them to rebuild the final file.</p>
  </div>;
}

function BitTorrentTerms({reveal}:{reveal:number}){
  const terms=[
    ['Swarm','Connected peers sharing the torrent/tracker.'],
    ['Availability','Number of complete copies of the torrent contents distributed amongst the swarm.'],
    ['Seed','A peer that has downloaded a file or pieces and makes them available to others.'],
    ['Tracker','Central server storing details/IP information about peers in the swarm.'],
    ['Leech','A peer with poor share ratio; downloading much more than uploading.'],
    ['Lurker','Downloads files but supplies no new content to the community.'],
  ];
  return <div className="h14v3-term-grid">{terms.map(([term,definition],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={term}><strong>{term}</strong><p>{definition}</p>{term==='Leech'?<code>share ratio = uploaded ÷ downloaded</code>:null}</section>)}</div>;
}

function SwitchingSummary({reveal}:{reveal:number}){
  const rows=[
    ['Route setup','Required before transmission','Not required'],
    ['Dedicated path','Yes','No'],
    ['Route per packet','Same route','Can differ'],
    ['Arrival order','Correct order','May be out of order'],
    ['Bandwidth','Whole channel reserved','Shared'],
    ['Fault handling','No alternative for established circuit','Packets can be rerouted'],
  ];
  return <div className="h14v3-compare"><header><span>FEATURE</span><strong>CIRCUIT</strong><strong>PACKET</strong></header>{rows.map(([feature,circuit,packet],index)=><div className={shown(reveal,index+1)?'is-visible':''} key={feature}><b>{feature}</b><p>{circuit}</p><p>{packet}</p></div>)}</div>;
}

function ProsCons({reveal,kind}:{reveal:number;kind:'circuit'|'packet'}){
  const data=kind==='circuit'?{
    pros:['Dedicated to one transmission','Whole bandwidth available','Faster data transfer than packet switching','Frames arrive in the same order','Packets cannot get lost through varying routes','Works better for real-time applications'],
    cons:['Inflexible; uses one dedicated line','Nobody else can use the idle circuit/channel','Circuit remains reserved even when unused','No alternative routing after a line fault','Dedicated channels require greater bandwidth','Link establishment can take time'],
  }:{
    pros:['No need to tie up a communication line','Failed/faulty lines can be bypassed by rerouting','Traffic usage is easy to expand','Source comparison charges only for connectivity duration','High data transmission is possible','Uses digital networks'],
    cons:['Protocols can be more complex','Lost packet must be re-sent','Does not work well with real-time streams','Channel bandwidth is shared','Destination waits while packets are reassembled','Large amounts of RAM may be needed'],
  };
  return <div className="h14v3-proscons"><section><header>BENEFITS</header>{data.pros.map((item,index)=><p className={shown(reveal,index+1)?'is-visible':''} key={item}><span>+</span>{item}</p>)}</section><section><header>DRAWBACKS</header>{data.cons.map((item,index)=><p className={shown(reveal,index+1)?'is-visible':''} key={item}><span>−</span>{item}</p>)}</section></div>;
}

function VideoConferenceExample({reveal}:{reveal:number}){
  const packetIssues=[['Sync','Picture and sound may not stay synchronised because packets arrive at different times.'],['Pauses','Reassembly delay can interrupt continuous video.'],['Quality','Competing traffic can degrade sound/video quality.'],['Drop-out','Different routes mean packets can be lost.']];
  return <div className="h14v3-video"><section><span>PACKET SWITCHING · POSSIBLE PROBLEMS</span>{packetIssues.map(([title,text],index)=><p className={shown(reveal,index+1)?'is-visible':''} key={title}><strong>{title}</strong>{text}</p>)}</section><aside className={shown(reveal,4)?'is-visible':''}><span>WHY CIRCUIT SWITCHING MAY IMPROVE IT</span><b>one route</b><b>correct order</b><b>dedicated channel</b><b>full bandwidth</b><b>less synchronisation loss</b></aside></div>;
}

function HopCompact({reveal}:{reveal:number}){
  const hops=[4,3,2,1,0];
  return <div className="h14v3-hop">{hops.map((hop,index)=><section className={`${shown(reveal,index+1)?'is-visible':''} ${hop===0?'is-zero':''}`} key={hop}><small>{index===0?'PACKET':`ROUTER ${index}`}</small><strong>HOP {hop}</strong>{index<hops.length-1?<i>→</i>:null}</section>)}{shown(reveal,5)?<p>Not at destination when hop = 0 → <strong>delete the packet at the next router</strong></p>:null}</div>;
}

function PacketControl({reveal}:{reveal:number}){
  const controls=[
    ['Checksum / parity','A check value is added to the header. The destination recalculates it; a mismatch causes a request to re-send the packet.'],
    ['Priority','A priority value can be placed in the header.'],
    ['Packet queue','A high priority value can determine which packet queue should be used.'],
  ];
  return <div className="h14v3-detail-cards">{controls.map(([title,text],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={title}><span>{String(index+1).padStart(2,'0')}</span><strong>{title}</strong><p>{text}</p></section>)}</div>;
}

function PacketHeaderCore({reveal}:{reveal:number}){
  const fields=[['SOURCE IP','32 bits'],['DESTINATION IP','32 bits'],['HOP','8 bits'],['PACKET LENGTH','16 bits'],['PACKET COUNT','16 bits'],['SEQUENCE','16 bits'],['CHECKSUM','16 bits']];
  return <div className="h14v3-header-core">{fields.map(([name,bits],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={name}><strong>{name}</strong><span>{bits}</span></section>)}<div className="h14v3-payload">DATA</div></div>;
}

function PacketHeaderExtended({reveal}:{reveal:number}){
  const fields=[
    ['Protocol version','4 bits','IPv4 / IPv6'],
    ['Header length','4 bits','multiples of four bytes'],
    ['Priority','8 bits','packet priority'],
    ['Fragmentation flags','3 bits','DF / MF'],
    ['Fragment offset','13 bits','position in original packet'],
    ['Transport protocol','8 bits','TCP / UDP'],
  ];
  return <div className="h14v3-term-grid h14v3-term-grid--header">{fields.map(([name,bits,note],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={name}><strong>{name}</strong><code>{bits}</code><p>{note}</p></section>)}</div>;
}

function RoutingDecisionCompact({reveal}:{reveal:number}){
  return <div className="h14v3-routing-flow">
    <section className="is-visible"><small>PACKET HEADER</small><strong>Destination: Network B</strong></section>
    <i className={shown(reveal,1)?'is-visible':''}>↓</i>
    <section className={shown(reveal,2)?'is-visible':''}><small>ROUTER</small><strong>Read destination</strong></section>
    <i className={shown(reveal,2)?'is-visible':''}>↓</i>
    <table className={shown(reveal,3)?'is-visible':''}><thead><tr><th>Route</th><th>Metric</th><th>Next hop</th></tr></thead><tbody><tr><td>Network B</td><td>18</td><td>R4</td></tr><tr className="is-best"><td>Network B</td><td>8</td><td>R7 ✓</td></tr><tr><td>Network B</td><td>14</td><td>R9</td></tr></tbody></table>
    {shown(reveal,4)?<strong className="h14v3-route-result">FORWARD → R7</strong>:null}
  </div>;
}

function RoutingTableFields({reveal}:{reveal:number}){
  const fields=[
    ['Number of hops','How many router hops are associated with the route.'],
    ['Next-router MAC','MAC address of the next router to which the packet is forwarded.'],
    ['Metrics','Cost assigned to available routes to help find an efficient route/path.'],
    ['Network destination','Network ID or pathway.'],
    ['Gateway','Next-hop information pointing to the gateway through which the target network can be reached.'],
    ['Netmask','Used to generate the network ID.'],
    ['Interface','Local interface responsible for reaching the gateway.'],
  ];
  return <div className="h14v3-routing-fields">{fields.map(([title,text],index)=><section className={shown(reveal,Math.ceil((index+1)/2))?'is-visible':''} key={title}><strong>{title}</strong><small>{text}</small></section>)}</div>;
}

function Activity14A({reveal}:{reveal:number}){
  const groups=[
    ['1 · TCP/IP + email','Name four layers; give one protocol per layer; describe sending/receiving email; distinguish SMTP and MIME.'],
    ['2 · Ethernet','Define Ethernet; describe Ethernet frame contents; explain how external devices are reached when Ethernet itself is local.'],
    ['3 · BitTorrent','Explain peer, swarm, tracker, leech and seed; consider how leech behaviour could be handled.'],
    ['4 · Routing','Distinguish a packet header from a routing table; explain how both are used to route a packet.'],
    ['5 · VoIP','Explain how packet switching is used for a video call and describe problems that might occur.'],
  ];
  return <div className="h14v3-activity">{groups.map(([title,text],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={title}><strong>{title}</strong><p>{text}</p></section>)}</div>;
}

function EndChapterPractice({reveal}:{reveal:number}){
  const blocks=[
    ['Q1','Match peer-to-peer terms; complete TCP/IP layer diagram; describe email protocols.'],
    ['Q2','Complete Ethernet frame; define metadata; describe BitTorrent file sharing.'],
    ['Q3','Explain circuit switching; justify circuit switching for video conferencing; explain web-page transfer using packet switching.'],
  ];
  return <div className="h14v3-practice">{blocks.map(([q,text],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={q}><span>{q}</span><p>{text}</p></section>)}</div>;
}

const ids=new Set([
  'h14p-141-protocol-map','h14p-141-ftp-detail','h14p-141-email','h14p-141-email-mechanics','h14p-141-transport-family','h14p-141-ethernet','h14p-141-ethernet-detail','h14p-141-bittorrent','h14p-141-bittorrent-terms',
  'h14p-142-compare','h14p-142-circuit-pros-cons','h14p-142-packet-pros-cons','h14p-142-video-example','h14p-142-hop','h14p-142-packet-control','h14p-142-header','h14p-142-header-extended','h14p-142-routing','h14p-142-routing-fields','h14p-142-activity14a','h14p-142-practice',
]);

export function hasChapter14PresentationVisualV3(beat:LessonPresentationBeat){return ids.has(beat.id);}

export function Chapter14PresentationVisualV3({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.id){
    case 'h14p-141-protocol-map': return <ProtocolMapCompact reveal={reveal}/>;
    case 'h14p-141-ftp-detail': return <FtpDetail reveal={reveal}/>;
    case 'h14p-141-email': return <EmailFlowCompact reveal={reveal}/>;
    case 'h14p-141-email-mechanics': return <EmailMechanics reveal={reveal}/>;
    case 'h14p-141-transport-family': return <TransportFamily reveal={reveal}/>;
    case 'h14p-141-ethernet': return <EthernetFrameCompact reveal={reveal}/>;
    case 'h14p-141-ethernet-detail': return <EthernetDetails reveal={reveal}/>;
    case 'h14p-141-bittorrent': return <BitTorrentSwarmCompact reveal={reveal}/>;
    case 'h14p-141-bittorrent-terms': return <BitTorrentTerms reveal={reveal}/>;
    case 'h14p-142-compare': return <SwitchingSummary reveal={reveal}/>;
    case 'h14p-142-circuit-pros-cons': return <ProsCons reveal={reveal} kind="circuit"/>;
    case 'h14p-142-packet-pros-cons': return <ProsCons reveal={reveal} kind="packet"/>;
    case 'h14p-142-video-example': return <VideoConferenceExample reveal={reveal}/>;
    case 'h14p-142-hop': return <HopCompact reveal={reveal}/>;
    case 'h14p-142-packet-control': return <PacketControl reveal={reveal}/>;
    case 'h14p-142-header': return <PacketHeaderCore reveal={reveal}/>;
    case 'h14p-142-header-extended': return <PacketHeaderExtended reveal={reveal}/>;
    case 'h14p-142-routing': return <RoutingDecisionCompact reveal={reveal}/>;
    case 'h14p-142-routing-fields': return <RoutingTableFields reveal={reveal}/>;
    case 'h14p-142-activity14a': return <Activity14A reveal={reveal}/>;
    case 'h14p-142-practice': return <EndChapterPractice reveal={reveal}/>;
    default:return null;
  }
}
