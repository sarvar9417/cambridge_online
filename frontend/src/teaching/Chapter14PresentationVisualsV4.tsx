import type { LessonPresentationBeat } from './lesson-experience-model';
import { Chapter14PresentationVisualV5, hasChapter14PresentationVisualV5 } from './Chapter14PresentationVisualsV5';

const shown=(reveal:number,index:number)=>reveal>=index;

function TcpIpAnimated({reveal}:{reveal:number}){
  const layers=[
    ['APPLICATION','HTTP · SMTP · DNS · FTP','DATA'],
    ['TRANSPORT','TCP · sequence · acknowledgement','SEGMENT'],
    ['INTERNET','IP · addressing · routing','DATAGRAM'],
    ['LINK','MAC · Ethernet · local delivery','FRAME'],
  ];
  return <div className="h14v4-stack" role="img" aria-label="Animated four-layer TCP IP stack">
    <aside className="h14v4-stack-direction"><span>SENDING</span><b>↓</b><small>headers are added</small></aside>
    <div className="h14v4-stack-layers">
      {layers.map(([name,note,unit],index)=><section className={shown(reveal,index+1)?'is-visible':''} data-layer={index+1} key={name}>
        <div><span>{4-index}</span><strong>{name}</strong><small>{note}</small></div>
        <b>{unit}</b>
        {shown(reveal,index+1)?<i className="h14v4-data-pulse" aria-hidden="true"/>:null}
      </section>)}
    </div>
    <aside className="h14v4-stack-direction h14v4-stack-direction--up"><small>headers are removed</small><b>↑</b><span>RECEIVING</span></aside>
    {shown(reveal,4)?<footer><strong>Send:</strong> Application → Transport → Internet → Link <i/> <strong>Receive:</strong> Link → Internet → Transport → Application</footer>:null}
  </div>;
}

function HttpAnimated({reveal}:{reveal:number}){
  return <div className="h14v4-http" role="img" aria-label="Animated HTTP request journey from browser through DNS and TCP to a web server">
    <div className="h14v4-browser">
      <header><i/><i/><i/><code>https://example.com</code></header>
      <section><span>🌐</span><strong>BROWSER</strong><small>User enters URL</small></section>
    </div>
    <svg viewBox="0 0 1040 390" aria-hidden="true">
      <defs><marker id="h14v4-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z"/></marker></defs>
      <path className="h14v4-http-backbone" d="M170 200 C260 105 330 105 420 190 S600 275 690 190 S860 105 950 200"/>
      <g className={`h14v4-http-node ${shown(reveal,2)?'is-visible':''}`} transform="translate(300 118)"><rect x="-70" y="-35" width="140" height="70" rx="16"/><text y="-2">DNS</text><text y="19" className="note">domain → IP</text></g>
      <g className={`h14v4-http-node ${shown(reveal,3)?'is-visible':''}`} transform="translate(500 245)"><rect x="-78" y="-35" width="156" height="70" rx="16"/><text y="-2">TCP</text><text y="19" className="note">transport</text></g>
      <g className={`h14v4-http-node ${shown(reveal,4)?'is-visible':''}`} transform="translate(700 118)"><rect x="-82" y="-35" width="164" height="70" rx="16"/><text y="-2">INTERNET</text><text y="19" className="note">route packets</text></g>
      <g className={`h14v4-http-node ${shown(reveal,5)?'is-visible':''}`} transform="translate(910 245)"><rect x="-82" y="-42" width="164" height="84" rx="16"/><text y="-5">WEB SERVER</text><text y="19" className="note">HTML + resources</text></g>
      {shown(reveal,2)?<circle className="h14v4-http-packet h14v4-http-packet--request" r="11"><animateMotion dur="4.4s" repeatCount="indefinite" path="M170 200 C260 105 330 105 420 190 S600 275 690 190 S860 105 950 200"/></circle>:null}
      {shown(reveal,5)?<circle className="h14v4-http-packet h14v4-http-packet--response" r="11"><animateMotion dur="4.4s" begin="1.8s" repeatCount="indefinite" path="M950 200 C860 105 790 105 700 190 S520 275 430 190 S260 105 170 200"/></circle>:null}
    </svg>
    <div className="h14v4-http-steps">
      <span className={shown(reveal,1)?'is-visible':''}><b>1</b> URL entered</span>
      <span className={shown(reveal,2)?'is-visible':''}><b>2</b> DNS resolves name</span>
      <span className={shown(reveal,3)?'is-visible':''}><b>3</b> TCP prepares delivery</span>
      <span className={shown(reveal,4)?'is-visible':''}><b>4</b> IP routes across networks</span>
      <span className={shown(reveal,5)?'is-visible':''}><b>5</b> server returns resources</span>
      <span className={shown(reveal,6)?'is-visible':''}><b>6</b> browser renders page</span>
    </div>
  </div>;
}

function EmailAnimated({reveal}:{reveal:number}){
  const nodes=[
    ['SENDER','compose'],['SMTP + MIME','push + attachment'],['MAIL SERVER','sender ISP'],['INTERNET','server transfer'],['MAIL SERVER','recipient domain'],['POP / IMAP','pull / sync'],['RECIPIENT','read mail'],
  ];
  return <div className="h14v4-email" role="img" aria-label="Animated email journey using SMTP MIME POP and IMAP">
    <div className="h14v4-email-flow">{nodes.map(([name,note],index)=>{
      const threshold=Math.min(6,index+1);
      return <section className={shown(reveal,threshold)?'is-visible':''} data-kind={index===1?'send':index===5?'receive':index===3?'internet':'node'} key={`${name}-${index}`}>
        <span>{index===0||index===6?'✉':index===3?'☁':'▣'}</span><strong>{name}</strong><small>{note}</small>{index<nodes.length-1?<i>→</i>:null}
      </section>;
    })}</div>
    {shown(reveal,2)?<div className="h14v4-envelope h14v4-envelope--out" aria-hidden="true">✉</div>:null}
    {shown(reveal,5)?<div className="h14v4-envelope h14v4-envelope--in" aria-hidden="true">✉</div>:null}
    <div className="h14v4-email-legend">
      <p className={shown(reveal,2)?'is-visible':''}><b>SMTP</b> sends email; <b>MIME</b> enables media/binary attachments.</p>
      <p className={shown(reveal,6)?'is-visible':''}><b>POP / IMAP</b> retrieve mail; IMAP keeps the server and clients synchronised.</p>
    </div>
  </div>;
}

function TcpHandshakeAnimated({reveal}:{reveal:number}){
  const steps=[
    ['X → Y','SYN / synchronisation','h14v4-syn'],
    ['Y → X','ACK + synchronisation','h14v4-synack'],
    ['X → Y','ACK','h14v4-ack'],
    ['X ⇄ Y','DATA TRANSFER','h14v4-data'],
  ];
  return <div className="h14v4-handshake" role="img" aria-label="Animated TCP host to host handshake">
    <header><section><span>HOST X</span><b>💻</b></section><section><span>HOST Y</span><b>🖥</b></section></header>
    <div className="h14v4-handshake-lanes"><i/><i/>{steps.map(([direction,label,kind],index)=><div className={`h14v4-handshake-message ${kind} ${shown(reveal,index+1)?'is-visible':''}`} data-direction={index===1?'left':index===3?'both':'right'} style={{top:`${18+index*20}%`}} key={label}><strong>{direction}</strong><span>{label}</span></div>)}</div>
    {shown(reveal,4)?<footer><b>PAR</b><span>positive acknowledgement with retransmission</span><small>No positive acknowledgement? → retransmit.</small></footer>:null}
  </div>;
}

const routers=[
  ['A',90,190],['R1',240,82],['R2',240,190],['R3',240,302],['R4',430,82],['R5',430,190],['R6',430,302],['R7',620,82],['R8',620,190],['R9',620,302],['B',830,190],
] as const;

function NetworkNodes(){
  return <>{routers.map(([label,x,y])=><g className="h14v4-router" transform={`translate(${x} ${y})`} key={label}><circle r={label==='A'||label==='B'?31:23}/><text dy="6" textAnchor="middle">{label}</text></g>)}</>;
}

function CircuitAnimated({reveal}:{reveal:number}){
  return <div className="h14v4-network-wrap" role="img" aria-label="Animated circuit switching dedicated route">
    <svg viewBox="0 0 920 385" aria-hidden="true">
      <g className="h14v4-network-links"><path d="M90 190 L240 82 L430 82 L620 82 L830 190"/><path d="M90 190 L240 190 L430 190 L620 190 L830 190"/><path d="M90 190 L240 302 L430 302 L620 302 L830 190"/><path d="M240 82 L430 190 L620 82"/><path d="M240 302 L430 190 L620 302"/></g>
      <NetworkNodes/>
      {shown(reveal,1)?<path className="h14v4-circuit-path" d="M90 190 L240 190 L430 190 L620 190 L830 190"/>:null}
      {shown(reveal,2)?<circle className="h14v4-circuit-pulse" r="10"><animateMotion dur="2.8s" repeatCount="indefinite" path="M90 190 L240 190 L430 190 L620 190 L830 190"/></circle>:null}
      {shown(reveal,3)?<circle className="h14v4-circuit-pulse h14v4-circuit-pulse--back" r="10"><animateMotion dur="2.8s" begin="1.4s" repeatCount="indefinite" path="M830 190 L620 190 L430 190 L240 190 L90 190"/></circle>:null}
    </svg>
    <div className="h14v4-network-callouts"><span className={shown(reveal,1)?'is-visible':''}><b>ESTABLISH</b> reserve one route</span><span className={shown(reveal,2)?'is-visible':''}><b>TRANSFER</b> all frames use that route</span><span className={shown(reveal,3)?'is-visible':''}><b>FULL CHANNEL</b> bandwidth stays dedicated</span><span className={shown(reveal,6)?'is-visible':''}><b>TERMINATE</b> release the circuit</span></div>
  </div>;
}

function PacketAnimated({reveal}:{reveal:number}){
  return <div className="h14v4-network-wrap h14v4-network-wrap--packets" role="img" aria-label="Animated packet switching using different network routes and reassembly">
    <svg viewBox="0 0 920 385" aria-hidden="true">
      <g className="h14v4-network-links"><path d="M90 190 L240 82 L430 82 L620 82 L830 190"/><path d="M90 190 L240 190 L430 190 L620 190 L830 190"/><path d="M90 190 L240 302 L430 302 L620 302 L830 190"/><path d="M240 82 L430 190 L620 82"/><path d="M240 302 L430 190 L620 302"/></g>
      <NetworkNodes/>
      {shown(reveal,2)?<g><path className="h14v4-route h14v4-route--1" d="M90 190 L240 82 L430 82 L620 82 L830 190"/><circle className="h14v4-packet h14v4-packet--1" r="12"><animateMotion dur="4.5s" repeatCount="indefinite" path="M90 190 L240 82 L430 82 L620 82 L830 190"/></circle><text className="h14v4-packet-label" x="124" y="143">P1</text></g>:null}
      {shown(reveal,3)?<g><path className="h14v4-route h14v4-route--2" d="M90 190 L240 190 L430 190 L620 190 L830 190"/><circle className="h14v4-packet h14v4-packet--2" r="12"><animateMotion dur="3.2s" begin=".4s" repeatCount="indefinite" path="M90 190 L240 190 L430 190 L620 190 L830 190"/></circle><text className="h14v4-packet-label" x="124" y="181">P2</text></g>:null}
      {shown(reveal,4)?<g><path className="h14v4-route h14v4-route--3" d="M90 190 L240 302 L430 302 L620 302 L830 190"/><circle className="h14v4-packet h14v4-packet--3" r="12"><animateMotion dur="5.2s" begin=".8s" repeatCount="indefinite" path="M90 190 L240 302 L430 302 L620 302 L830 190"/></circle><text className="h14v4-packet-label" x="124" y="240">P3</text></g>:null}
    </svg>
    <div className="h14v4-reassembly">
      <span className={shown(reveal,2)?'is-visible':''}>P2</span><span className={shown(reveal,3)?'is-visible':''}>P1</span><span className={shown(reveal,4)?'is-visible':''}>P3</span><i>→</i><strong className={shown(reveal,6)?'is-visible':''}>P1 · P2 · P3</strong>
      {shown(reveal,6)?<small>Sequence numbers restore the original order at the destination.</small>:null}
    </div>
  </div>;
}

const ids=new Set([
  'h14p-141-stack','h14p-141-http','h14p-141-email','h14p-141-tcp','h14p-142-circuit-route','h14p-142-packet-route',
]);

export function hasChapter14PresentationVisualV4(beat:LessonPresentationBeat){return ids.has(beat.id)||hasChapter14PresentationVisualV5(beat);}

export function Chapter14PresentationVisualV4({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  if(hasChapter14PresentationVisualV5(beat))return <Chapter14PresentationVisualV5 beat={beat} reveal={reveal}/>;
  switch(beat.id){
    case 'h14p-141-stack': return <TcpIpAnimated reveal={reveal}/>;
    case 'h14p-141-http': return <HttpAnimated reveal={reveal}/>;
    case 'h14p-141-email': return <EmailAnimated reveal={reveal}/>;
    case 'h14p-141-tcp': return <TcpHandshakeAnimated reveal={reveal}/>;
    case 'h14p-142-circuit-route': return <CircuitAnimated reveal={reveal}/>;
    case 'h14p-142-packet-route': return <PacketAnimated reveal={reveal}/>;
    default: return null;
  }
}
