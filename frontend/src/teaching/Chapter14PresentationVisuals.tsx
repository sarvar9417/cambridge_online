import type { LessonPresentationBeat } from './lesson-experience-model';

const shown = (reveal:number,index:number) => reveal >= index;

function LayerStack({reveal}:{reveal:number}){
  const layers=[
    ['APPLICATION','HTTP · FTP · SMTP · DNS'],
    ['TRANSPORT','TCP · sequence · acknowledgement'],
    ['INTERNET','IP · addressing · routing'],
    ['LINK','frame · MAC · local network'],
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
    {name:'SEGMENT',parts:['TCP header','Data']},
    {name:'DATAGRAM',parts:['IP header','TCP header','Data']},
    {name:'FRAME',parts:['Link header','IP header','TCP header','Data','Trailer']},
  ];
  return <div className="h14v-encapsulation">{stages.map((stage,index)=><section className={shown(reveal,index+1)?'is-visible':''} key={stage.name}><span>{stage.name}</span><div>{stage.parts.map(part=><b key={part}>{part}</b>)}</div></section>)}</div>;
}

function HttpJourney({reveal}:{reveal:number}){
  const steps=[
    ['Browser','URL entered'],
    ['DNS','domain → IP'],
    ['TCP','prepare reliable delivery'],
    ['Routers','forward towards server'],
    ['Web server','return HTML/resources'],
    ['Browser','render page'],
  ];
  return <div className="h14v-journey"><div className="h14v-browser-window"><span/><span/><span/><strong>https://example.com</strong></div><div className="h14v-journey-flow">{steps.map(([title,note],index)=><div className={`h14v-node ${shown(reveal,index+1)?'is-visible':''}`} key={`${title}-${index}`}><i>{index+1}</i><strong>{title}</strong><small>{note}</small>{index<steps.length-1?<b aria-hidden="true">→</b>:null}</div>)}</div></div>;
}

function EmailFlow({reveal}:{reveal:number}){
  const stages=[['SENDER','creates message'],['SMTP + MIME','send + attachments'],['MAIL SERVER','sender side'],['INTERNET','transfer'],['MAIL SERVER','recipient side'],['POP / IMAP','retrieve / sync'],['RECIPIENT','reads message']];
  return <div className="h14v-email">{stages.map(([title,note],index)=><div className={`h14v-mail-node ${shown(reveal,index+1)?'is-visible':''}`} key={`${title}-${index}`}><span>{index===0||index===6?'✉':'●'}</span><strong>{title}</strong><small>{note}</small>{index<stages.length-1?<b>→</b>:null}</div>)}</div>;
}

function PopImap({reveal}:{reveal:number}){
  return <div className="h14v-popimap">
    <section className={shown(reveal,1)?'is-visible':''}><h3>POP3/4</h3><div className="h14v-server">SERVER <span>✉ ✉ ✉</span></div><b>↓ download</b><div className="h14v-device">💻</div><p>Client va server sinxron qolmaydi.</p></section>
    <section className={shown(reveal,2)?'is-visible':''}><h3>IMAP</h3><div className="h14v-server">SERVER <span>✉ ✉ ✉</span></div><div className="h14v-sync"><b>↙ sync</b><b>sync ↘</b></div><div className="h14v-devices"><span>💻</span><span>📱</span></div><p>Server va qurilmalar sinxron holatda qoladi.</p></section>
  </div>;
}

function TcpHandshake({reveal}:{reveal:number}){
  const arrows=[['X → Y','SYN / sequence'],['Y → X','ACK + SYN'],['X → Y','ACK'],['X ⇄ Y','DATA']];
  return <div className="h14v-handshake"><div className="h14v-host"><span>HOST X</span><b>💻</b></div><div className="h14v-handshake-lines">{arrows.map(([direction,label],index)=><div className={`h14v-handshake-step ${shown(reveal,index+1)?'is-visible':''}`} key={label}><strong>{direction}</strong><span>{label}</span></div>)}</div><div className="h14v-host"><span>HOST Y</span><b>🖥️</b></div></div>;
}

function BitTorrent({reveal}:{reveal:number}){
  const peers=[['SEED','seed'],['PEER','peer'],['PEER','peer'],['LEECH','leech'],['NEW','new'],['SEED','seed']];
  return <div className="h14v-swarm"><div className={`h14v-tracker ${shown(reveal,3)?'is-visible':''}`}><strong>TRACKER</strong><small>peer IP/details</small></div>{peers.map(([label,type],index)=><div className={`h14v-peer h14v-peer--${index+1} ${shown(reveal,Math.min(5,index+1))?'is-visible':''}`} data-type={type} key={`${label}-${index}`}><span>💻</span><strong>{label}</strong><i/></div>)}<div className={`h14v-piece ${shown(reveal,4)?'is-visible':''}`}>PIECES ⇄</div></div>;
}

function NetworkBase({packets=false,failure=false,reveal=99}:{packets?:boolean;failure?:boolean;reveal?:number}){
  return <svg className="h14v-network" viewBox="0 0 920 390" role="img" aria-label={packets?'Packet switching routes':'Circuit switching route'}>
    <g className="h14v-links">
      <path d="M100 195 L250 90 L430 80 L610 105 L820 195"/>
      <path d="M100 195 L250 195 L430 195 L610 195 L820 195"/>
      <path d="M100 195 L250 305 L430 300 L610 285 L820 195"/>
      <path d="M250 90 L430 195 L610 105"/><path d="M250 305 L430 195 L610 285"/>
    </g>
    {!packets?<path className={`h14v-dedicated ${failure?'is-failed':''}`} d="M100 195 L250 195 L430 195 L610 195 L820 195"/>:null}
    {[['A',100,195],['R1',250,90],['R2',250,195],['R3',250,305],['R4',430,80],['R5',430,195],['R6',430,300],['R7',610,105],['R8',610,195],['R9',610,285],['B',820,195]].map(([label,x,y])=><g className="h14v-router" transform={`translate(${x} ${y})`} key={String(label)}><circle r={label==='A'||label==='B'?34:25}/><text textAnchor="middle" dy="6">{label}</text></g>)}
    {failure?<g className={`h14v-failure ${shown(reveal,1)?'is-visible':''}`} transform="translate(520 195)"><circle r="24"/><text textAnchor="middle" dy="8">×</text></g>:null}
    {packets&&shown(reveal,2)?<circle className="h14v-packet h14v-packet--1" r="11"><animateMotion dur="4.2s" repeatCount="indefinite" path="M100 195 L250 90 L430 80 L610 105 L820 195"/></circle>:null}
    {packets&&shown(reveal,3)?<circle className="h14v-packet h14v-packet--2" r="11"><animateMotion dur="3.4s" repeatCount="indefinite" path="M100 195 L250 195 L430 195 L610 195 L820 195"/></circle>:null}
    {packets&&shown(reveal,4)?<circle className="h14v-packet h14v-packet--3" r="11"><animateMotion dur="4.8s" repeatCount="indefinite" path="M100 195 L250 305 L430 300 L610 285 L820 195"/></circle>:null}
  </svg>;
}

function CircuitRoute({reveal,failure=false}:{reveal:number;failure?:boolean}){return <div className="h14v-network-wrap"><NetworkBase failure={failure} reveal={reveal}/><div className="h14v-network-caption"><span>A</span><b>{failure?'Dedicated link failure: no alternative route for this circuit':'One dedicated path stays reserved for the whole communication'}</b><span>B</span></div></div>}

function PacketRoutes({reveal}:{reveal:number}){return <div className="h14v-network-wrap"><NetworkBase packets reveal={reveal}/><div className="h14v-packet-key"><span>P1 · upper route</span><span>P2 · middle route</span><span>P3 · lower route</span></div><p className={`h14v-reassembly ${shown(reveal,5)?'is-visible':''}`}>Arrival can be out of order → <strong>sequence number reassembles the original message</strong></p></div>}

function HopCountdown({reveal}:{reveal:number}){
  const hops=[4,3,2,1,0];
  return <div className="h14v-hop">{hops.map((hop,index)=><div className={`h14v-hop-node ${shown(reveal,index+1)?'is-visible':''} ${hop===0?'is-zero':''}`} key={hop}><span>{index===0?'PACKET':`ROUTER ${index}`}</span><strong>HOP {hop}</strong>{index<hops.length-1?<b>→</b>:null}</div>)}{shown(reveal,5)?<p>Destinationga yetmagan bo‘lsa → <strong>PACKET DELETED</strong></p>:null}</div>;
}

function PacketHeader({reveal}:{reveal:number}){
  const fields=[['SOURCE IP','32'],['DESTINATION IP','32'],['HOP','8'],['LENGTH','16'],['PACKET COUNT','16'],['SEQUENCE','16'],['CHECKSUM','16']];
  return <div className="h14v-header"><div className="h14v-header-strip">{fields.map(([name,bits],index)=><div className={shown(reveal,index+1)?'is-visible':''} key={name}><strong>{name}</strong><span>{bits} bits</span></div>)}<div className="h14v-payload"><strong>DATA</strong></div></div><div className="h14v-header-explain">{shown(reveal,2)?<p><b>Destination IP</b> routerga qayerga yuborishni aytadi.</p>:null}{shown(reveal,6)?<p><b>Sequence</b> destinationda to‘g‘ri tartibni tiklaydi.</p>:null}{shown(reveal,7)?<p><b>Checksum</b> xatoni aniqlashga yordam beradi.</p>:null}</div></div>;
}

function RoutingDecision({reveal}:{reveal:number}){
  return <div className="h14v-routing"><section className="h14v-routing-packet"><span>PACKET HEADER</span><strong>Destination: Network B</strong></section><b className={shown(reveal,1)?'is-visible':''}>↓</b><section className={`h14v-routing-router ${shown(reveal,2)?'is-visible':''}`}><span>ROUTER</span><strong>Read destination</strong></section><b className={shown(reveal,2)?'is-visible':''}>↓</b><table className={shown(reveal,3)?'is-visible':''}><thead><tr><th>Route</th><th>Metric</th><th>Next hop</th></tr></thead><tbody><tr><td>Network B</td><td>18</td><td>R4</td></tr><tr className="is-best"><td>Network B</td><td>8</td><td>R7 ✓</td></tr><tr><td>Network B</td><td>14</td><td>R9</td></tr></tbody></table>{shown(reveal,4)?<div className="h14v-routing-result">FORWARD → <strong>R7</strong></div>:null}</div>;
}

const ids = new Set([
  'h14p-141-stack','h14p-141-units','h14p-141-http','h14p-141-email','h14p-141-pop-imap','h14p-141-tcp','h14p-141-bittorrent',
  'h14p-142-circuit-route','h14p-142-circuit-failure','h14p-142-packet-route','h14p-142-hop','h14p-142-header','h14p-142-routing',
]);

export function hasChapter14PresentationVisual(beat:LessonPresentationBeat){return ids.has(beat.id);}

export function Chapter14PresentationVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.id){
    case 'h14p-141-stack': return <LayerStack reveal={reveal}/>;
    case 'h14p-141-units': return <Encapsulation reveal={reveal}/>;
    case 'h14p-141-http': return <HttpJourney reveal={reveal}/>;
    case 'h14p-141-email': return <EmailFlow reveal={reveal}/>;
    case 'h14p-141-pop-imap': return <PopImap reveal={reveal}/>;
    case 'h14p-141-tcp': return <TcpHandshake reveal={reveal}/>;
    case 'h14p-141-bittorrent': return <BitTorrent reveal={reveal}/>;
    case 'h14p-142-circuit-route': return <CircuitRoute reveal={reveal}/>;
    case 'h14p-142-circuit-failure': return <CircuitRoute reveal={reveal} failure/>;
    case 'h14p-142-packet-route': return <PacketRoutes reveal={reveal}/>;
    case 'h14p-142-hop': return <HopCountdown reveal={reveal}/>;
    case 'h14p-142-header': return <PacketHeader reveal={reveal}/>;
    case 'h14p-142-routing': return <RoutingDecision reveal={reveal}/>;
    default: return null;
  }
}
