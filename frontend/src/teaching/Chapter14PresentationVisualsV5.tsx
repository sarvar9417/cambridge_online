import type { LessonPresentationBeat } from './lesson-experience-model';

const shown=(reveal:number,index:number)=>reveal>=index;

function EthernetFrameAnimated({reveal}:{reveal:number}){
  const fields=[
    ['PRE-AMBLE','8 B'],['START','1 B'],['DESTINATION','6 B'],['SOURCE','6 B'],['TYPE / LENGTH','2 B'],['MESSAGE','46–1500 B'],['FRAME CHECK','4 B'],['GAP','12 B'],
  ];
  return <div className="h14v5-ethernet" role="img" aria-label="Ethernet frame assembled field by field">
    <div className="h14v5-frame-track">
      {fields.map(([name,size],index)=><section className={shown(reveal,index+1)?'is-visible':''} data-field={index} key={name}><strong>{name}</strong><small>{size}</small></section>)}
      {shown(reveal,1)?<i className="h14v5-frame-pulse" aria-hidden="true"/>:null}
    </div>
    <div className="h14v5-frame-caption">
      <span className={shown(reveal,3)?'is-visible':''}>MAC addresses identify source and destination on the local network.</span>
      <span className={shown(reveal,7)?'is-visible':''}>Frame check sequence supports integrity checking.</span>
    </div>
  </div>;
}

function EthernetDetailsAnimated({reveal}:{reveal:number}){
  return <div className="h14v5-ethernet-details">
    <section className={shown(reveal,1)?'is-visible':''}><span>BROADCAST</span><code>FF:FF:FF:FF:FF:FF</code><div className="h14v5-lan"><b>SWITCH</b><i>→ PC 1</i><i>→ PC 2</i><i>→ PC 3</i></div></section>
    <section className={shown(reveal,2)?'is-visible':''}><span>TYPE / LENGTH</span><div className="h14v5-threshold"><b>≤ 1539</b><i>frame length</i><strong>› 1539</strong><i>Ethernet type, e.g. IPv4 / IPv6</i></div></section>
    <section className={shown(reveal,3)?'is-visible':''}><span>FRAME CHECK</span><div className="h14v5-check"><b>DATA</b><i>→ checksum →</i><strong>COMPARE</strong><em>✓ integrity</em></div></section>
    <section className={shown(reveal,4)?'is-visible':''}><span>VLAN SOURCE DETAIL</span><div className="h14v5-vlan"><b>1539 B</b><i>→</i><strong>around 9000 B</strong></div></section>
  </div>;
}

function BitTorrentAnimated({reveal}:{reveal:number}){
  const peers=[['SEED',130,90],['PEER',350,55],['LEECH',570,92],['PEER',700,230],['NEW',420,310],['SEED',160,280]] as const;
  return <div className="h14v5-torrent" role="img" aria-label="BitTorrent tracker and peers exchanging file pieces">
    <svg viewBox="0 0 840 380" aria-hidden="true">
      <g className="h14v5-swarm-links">{peers.map(([,x,y])=><line x1="420" y1="180" x2={x} y2={y} key={`${x}-${y}`}/>)}</g>
      {shown(reveal,2)?<g className="h14v5-tracker" transform="translate(420 180)"><circle r="58"/><text y="-3" textAnchor="middle">TRACKER</text><text y="18" textAnchor="middle">peer details</text></g>:null}
      {peers.map(([label,x,y],index)=>shown(reveal,Math.min(5,index+1))?<g className="h14v5-peer" data-role={label.toLowerCase()} transform={`translate(${x} ${y})`} key={`${label}-${index}`}><circle r="38"/><text y="5" textAnchor="middle">{label}</text></g>:null)}
      {shown(reveal,3)?<circle className="h14v5-piece h14v5-piece--1" r="9"><animateMotion dur="3.4s" repeatCount="indefinite" path="M130 90 Q275 30 350 55"/></circle>:null}
      {shown(reveal,3)?<circle className="h14v5-piece h14v5-piece--2" r="9"><animateMotion dur="4s" begin=".6s" repeatCount="indefinite" path="M350 55 Q470 20 570 92"/></circle>:null}
      {shown(reveal,4)?<circle className="h14v5-piece h14v5-piece--3" r="9"><animateMotion dur="3.7s" begin="1s" repeatCount="indefinite" path="M160 280 Q290 350 420 310"/></circle>:null}
      {shown(reveal,4)?<circle className="h14v5-piece h14v5-piece--4" r="9"><animateMotion dur="4.3s" begin=".2s" repeatCount="indefinite" path="M700 230 Q580 330 420 310"/></circle>:null}
    </svg>
    <div className="h14v5-torrent-flow">
      <span className={shown(reveal,1)?'is-visible':''}><b>1</b>.torrent metadata</span>
      <span className={shown(reveal,2)?'is-visible':''}><b>2</b>tracker returns peers</span>
      <span className={shown(reveal,3)?'is-visible':''}><b>3</b>pieces download in parallel</span>
      <span className={shown(reveal,4)?'is-visible':''}><b>4</b>peers also upload pieces</span>
      <span className={shown(reveal,5)?'is-visible':''}><b>5</b>reassemble final file</span>
    </div>
  </div>;
}

function BitTorrentTermsAnimated({reveal}:{reveal:number}){
  const terms=[['SEED','complete/available pieces'],['TRACKER','peer connection details'],['SWARM','peers sharing the torrent'],['AVAILABILITY','complete copies across swarm'],['LEECH','downloads more than uploads'],['LURKER','downloads but adds no new content']];
  return <div className="h14v5-torrent-terms">
    <div className="h14v5-role-grid">{terms.map(([term,note],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={term}><strong>{term}</strong><small>{note}</small></section>)}</div>
    {shown(reveal,5)?<div className="h14v5-ratio"><span>SHARE RATIO</span><code>uploaded ÷ downloaded</code><b>&gt; 1 positive</b><strong>&lt; 1 negative</strong></div>:null}
  </div>;
}

function VideoConferenceAnimated({reveal}:{reveal:number}){
  return <div className="h14v5-video" role="img" aria-label="Video conference packets arriving with different delays">
    <div className="h14v5-video-call"><section><span>👩‍💻</span><strong>CALLER A</strong></section><div className="h14v5-video-streams"><i/><i/><i/>{shown(reveal,1)?<b className="p1">P1</b>:null}{shown(reveal,2)?<b className="p2">P2</b>:null}{shown(reveal,3)?<b className="p3">P3</b>:null}</div><section><span>🧑‍💻</span><strong>CALLER B</strong></section></div>
    <div className="h14v5-video-symptoms">
      <span className={shown(reveal,1)?'is-visible':''}><b>SYNC</b>audio and picture can drift</span>
      <span className={shown(reveal,2)?'is-visible':''}><b>PAUSE</b>reassembly waits for late packets</span>
      <span className={shown(reveal,3)?'is-visible':''}><b>QUALITY</b>shared bandwidth can degrade media</span>
      <span className={shown(reveal,4)?'is-visible':''}><b>DROP-OUT</b>lost packets interrupt the stream</span>
    </div>
    {shown(reveal,5)?<aside><strong>Circuit switching may improve this</strong><span>one route · correct order · dedicated channel · full bandwidth</span></aside>:null}
  </div>;
}

function PacketControlAnimated({reveal}:{reveal:number}){
  return <div className="h14v5-control">
    <section className="h14v5-checksum">
      <header>CHECKSUM / PARITY</header>
      <div><span className="is-visible"><b>PACKET</b><code>101101…</code></span><i>→</i><span className={shown(reveal,1)?'is-visible':''}><b>CHECK VALUE</b><code>0110</code></span><i>→</i><span className={shown(reveal,1)?'is-visible':''}><b>DESTINATION</b><code className={shown(reveal,2)?'is-bad':''}>{shown(reveal,2)?'0101':'0110'}</code></span></div>
      {shown(reveal,2)?<p className="is-error">Mismatch detected → request retransmission</p>:null}
      {shown(reveal,3)?<div className="h14v5-resend"><b>RESEND</b><i>↺</i><span>fresh packet</span></div>:null}
    </section>
    <section className={`h14v5-priority ${shown(reveal,2)?'is-visible':''}`}><header>PRIORITY / QUEUE</header><div><span><b>HIGH</b>P1</span><span><b>MED</b>P2</span><span><b>LOW</b>P3</span><i>→</i><strong>QUEUE ORDER</strong></div></section>
  </div>;
}

function PacketHeaderAnimated({reveal}:{reveal:number}){
  const fields=[['SOURCE IP','32'],['DESTINATION IP','32'],['HOP','8'],['LENGTH','16'],['PACKET COUNT','16'],['SEQUENCE','16'],['CHECKSUM','16']];
  const active=Math.max(0,Math.min(fields.length-1,reveal-1));
  return <div className="h14v5-header" role="img" aria-label="Packet header fields highlighted one by one">
    <div className="h14v5-header-strip">{fields.map(([name,bits],index)=><section className={`${shown(reveal,index+1)?'is-visible':''} ${index===active?'is-active':''}`} key={name}><strong>{name}</strong><small>{bits} bits</small></section>)}<section className="h14v5-header-data is-visible"><strong>DATA</strong></section></div>
    <div className="h14v5-header-purpose">
      {shown(reveal,2)?<span><b>ADDRESSING</b>source + destination IP</span>:null}
      {shown(reveal,3)?<span><b>LIFETIME</b>hop number prevents endless circulation</span>:null}
      {shown(reveal,6)?<span><b>ORDER</b>sequence number restores the message</span>:null}
      {shown(reveal,7)?<span><b>INTEGRITY</b>checksum supports error detection</span>:null}
    </div>
  </div>;
}

function PacketHeaderExtendedAnimated({reveal}:{reveal:number}){
  const fields=[['VERSION','4 bits','IPv4 / IPv6'],['HEADER LENGTH','4 bits','header size'],['PRIORITY','8 bits','queue priority'],['DF / MF','3 bits','fragment flags'],['OFFSET','13 bits','fragment position'],['TRANSPORT','8 bits','TCP / UDP']];
  return <div className="h14v5-header-extended">{fields.map(([name,bits,note],index)=><section className={shown(reveal,index+1)?'is-visible':''} key={name}><span>{bits}</span><strong>{name}</strong><small>{note}</small></section>)}</div>;
}

function RoutingAnimated({reveal}:{reveal:number}){
  return <div className="h14v5-routing" role="img" aria-label="Router reads destination, checks routing table and selects the best next hop">
    <section className="h14v5-routing-packet"><span>PACKET HEADER</span><strong>Destination → Network B</strong></section>
    <i className={shown(reveal,1)?'is-visible':''}>↓ read destination</i>
    <section className={`h14v5-router-box ${shown(reveal,2)?'is-visible':''}`}><strong>ROUTER</strong><small>lookup Network B</small></section>
    <table className={shown(reveal,3)?'is-visible':''}><thead><tr><th>Destination</th><th>Metric</th><th>Next hop</th></tr></thead><tbody><tr><td>Network B</td><td>18</td><td>R4</td></tr><tr className={shown(reveal,4)?'is-best':''}><td>Network B</td><td>8</td><td>R7</td></tr><tr><td>Network B</td><td>14</td><td>R9</td></tr></tbody></table>
    {shown(reveal,4)?<aside><span>BEST AVAILABLE ROUTE</span><strong>FORWARD → R7</strong><i>→</i></aside>:null}
  </div>;
}

function RoutingFieldsAnimated({reveal}:{reveal:number}){
  const rows=[['Network destination','target network ID'],['Gateway','next-hop gateway'],['Netmask','generate network ID'],['Interface','local outgoing interface'],['Metric','route cost'],['Number of hops','hop count'],['Next-router MAC','link-layer next router address']];
  return <div className="h14v5-routing-fields"><div className="h14v5-routing-table-head"><span>ROUTING TABLE ENTRY</span><strong>How a router describes a path</strong></div>{rows.map(([name,note],index)=><section className={shown(reveal,Math.ceil((index+1)/2))?'is-visible':''} key={name}><strong>{name}</strong><small>{note}</small></section>)}</div>;
}

const ids=new Set([
  'h14p-141-ethernet','h14p-141-ethernet-detail','h14p-141-bittorrent','h14p-141-bittorrent-terms',
  'h14p-142-video-example','h14p-142-packet-control','h14p-142-header','h14p-142-header-extended','h14p-142-routing','h14p-142-routing-fields',
]);

export function hasChapter14PresentationVisualV5(beat:LessonPresentationBeat){return ids.has(beat.id);}

export function Chapter14PresentationVisualV5({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.id){
    case 'h14p-141-ethernet': return <EthernetFrameAnimated reveal={reveal}/>;
    case 'h14p-141-ethernet-detail': return <EthernetDetailsAnimated reveal={reveal}/>;
    case 'h14p-141-bittorrent': return <BitTorrentAnimated reveal={reveal}/>;
    case 'h14p-141-bittorrent-terms': return <BitTorrentTermsAnimated reveal={reveal}/>;
    case 'h14p-142-video-example': return <VideoConferenceAnimated reveal={reveal}/>;
    case 'h14p-142-packet-control': return <PacketControlAnimated reveal={reveal}/>;
    case 'h14p-142-header': return <PacketHeaderAnimated reveal={reveal}/>;
    case 'h14p-142-header-extended': return <PacketHeaderExtendedAnimated reveal={reveal}/>;
    case 'h14p-142-routing': return <RoutingAnimated reveal={reveal}/>;
    case 'h14p-142-routing-fields': return <RoutingFieldsAnimated reveal={reveal}/>;
    default:return null;
  }
}
