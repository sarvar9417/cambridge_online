const emphasis=(reveal:number,step:number)=>({opacity:reveal>=step?1:.32,transition:'opacity .2s ease'});

const mono={fontFamily:'var(--font-mono)'} as const;

function Arrow({label}:{label:string}){
  return <div style={{display:'grid',placeItems:'center',gap:5,minWidth:78}}><span style={{fontSize:30,lineHeight:1,color:'var(--h14-cyan)'}}>→</span><small style={{...mono,color:'var(--h14-muted)',fontSize:9,textAlign:'center'}}>{label}</small></div>;
}

/** Hodder pp.334–335. Internet/IP supplies internetwork addressing/routing; Link wraps the datagram for local delivery. */
export function Chapter14IpLinkHero({reveal}:{reveal:number}){
  return <div className="h14m-content-v2" aria-label="Internet and link layer relationship" style={{display:'grid',gap:20,minHeight:430,alignContent:'center'}}>
    <div style={{display:'grid',gridTemplateColumns:'150px 82px 1fr 82px 1fr 82px 150px',alignItems:'center',gap:8}}>
      <section style={{...emphasis(reveal,1),padding:'18px 12px',textAlign:'center',border:'1px solid var(--h14-line)',background:'rgba(84,166,255,.04)'}}><b style={{...mono,color:'var(--h14-muted)',fontSize:10}}>FROM TRANSPORT</b><strong style={{display:'block',marginTop:8,fontSize:20}}>PACKET</strong></section>
      <Arrow label="to layer 2"/>
      <section style={{...emphasis(reveal,1),minHeight:230,padding:'18px 20px',borderTop:'4px solid var(--h14-blue)',borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(180deg,rgba(84,166,255,.09),rgba(8,21,36,.22))'}}>
        <header><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>2 · INTERNET LAYER · IP</b></header>
        <div style={{display:'grid',gap:10,marginTop:18}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><span style={{padding:10,border:'1px solid var(--h14-cyan)',textAlign:'center',fontSize:11}}>SOURCE IP</span><span style={{padding:10,border:'1px solid var(--h14-cyan)',textAlign:'center',fontSize:11}}>DESTINATION IP</span></div>
          <p style={{margin:0,fontSize:12.5,lineHeight:1.45,color:'var(--h14-muted)'}}>Adds sender and recipient IP information and supports routing between networks.</p>
          <strong style={{...emphasis(reveal,2),display:'block',padding:'9px 10px',textAlign:'center',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)'}}>PACKET + IP HEADER = DATAGRAM</strong>
        </div>
      </section>
      <Arrow label="encapsulate"/>
      <section style={{...emphasis(reveal,3),minHeight:230,padding:'18px 20px',borderTop:'4px solid var(--h14-cyan)',borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(180deg,rgba(82,224,210,.08),rgba(8,21,36,.22))'}}>
        <header><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>1 · LINK LAYER</b></header>
        <div style={{display:'grid',gap:10,marginTop:18}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><span style={{padding:10,border:'1px solid var(--h14-line)',textAlign:'center',fontSize:11}}>IP → MAC</span><span style={{padding:10,border:'1px solid var(--h14-line)',textAlign:'center',fontSize:11}}>LOCAL SEGMENT</span></div>
          <p style={{margin:0,fontSize:12.5,lineHeight:1.45,color:'var(--h14-muted)'}}>Maps IP addressing to MAC addressing for the local segment and encapsulates the IP datagram inside a frame.</p>
          <strong style={{...emphasis(reveal,4),display:'block',padding:'9px 10px',textAlign:'center',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)'}}>LINK HEADER + IP DATAGRAM + CHECK = FRAME</strong>
        </div>
      </section>
      <Arrow label="local delivery"/>
      <section style={{...emphasis(reveal,4),padding:'18px 12px',textAlign:'center',border:'1px solid var(--h14-cyan)',background:'rgba(82,224,210,.05)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:10}}>ON THE MEDIUM</b><strong style={{display:'block',marginTop:8,fontSize:20}}>FRAME</strong><small style={{display:'block',marginTop:7,color:'var(--h14-muted)'}}>Ethernet / Wi-Fi</small></section>
    </div>
    <footer style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <span style={{...emphasis(reveal,4),padding:'10px 13px',borderLeft:'3px solid var(--h14-blue)',background:'rgba(84,166,255,.04)',fontSize:11.5,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>IP answers:</b> which network/host and which route?</span>
      <span style={{...emphasis(reveal,4),padding:'10px 13px',borderLeft:'3px solid var(--h14-cyan)',background:'rgba(82,224,210,.04)',fontSize:11.5,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Link answers:</b> how is this datagram delivered on the current local segment?</span>
    </footer>
    <div style={{padding:'9px 12px',borderLeft:'3px solid var(--h14-amber)',fontSize:11.5,color:'var(--h14-muted)'}}>Coursebook relationship: <b style={{color:'var(--h14-ink)'}}>Ethernet is local; communication with external devices requires IP above Ethernet.</b></div>
  </div>;
}

/** Hodder pp.335–336. IEEE 802.11 uses collision avoidance/DCF; Bluetooth and WiMax identifiers are kept visible. */
export function Chapter14WirelessHero({reveal}:{reveal:number}){
  const steps=[
    ['1','SENSE CHANNEL','The device checks whether the wireless channel is free.'],
    ['2','DCF DECISION','Distributed Coordination Function permits transmission only when the channel is free.'],
    ['3','TRANSMIT','The frame is sent over the wireless medium.'],
    ['4','WAIT FOR ACK','Successful delivery is confirmed by acknowledgement.'],
    ['5','NO ACK?','Assume collision risk, wait a random time, then try again.'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="WiFi CSMA CA DCF process with Bluetooth and WiMax identifiers" style={{display:'grid',gridTemplateColumns:'1.7fr .8fr',gap:20,minHeight:430,alignItems:'center'}}>
    <section style={{display:'grid',gap:10}}>
      <header style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',paddingBottom:10,borderBottom:'2px solid var(--h14-cyan)'}}><div><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>Wi-Fi · IEEE 802.11</b><strong style={{display:'block',marginTop:5,fontSize:24}}>CSMA/CA + DCF</strong></div><small style={{color:'var(--h14-muted)'}}>collision avoidance</small></header>
      <main style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:8}}>{steps.map(([n,title,text],i)=><section key={n} style={{...emphasis(reveal,i+1),minHeight:235,padding:'14px 12px',display:'grid',gridTemplateRows:'42px auto 1fr',gap:9,borderTop:`3px solid ${i===4?'var(--h14-amber)':'var(--h14-cyan)'}`,borderBottom:'1px solid var(--h14-line)',background:'rgba(84,166,255,.04)'}}><b style={{display:'grid',placeItems:'center',width:38,height:38,borderRadius:'50%',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',...mono,fontSize:11}}>{n}</b><strong style={{fontSize:12.5}}>{title}</strong><p style={{margin:0,fontSize:11.2,lineHeight:1.45,color:'var(--h14-muted)'}}>{text}</p></section>)}</main>
      <footer style={{...emphasis(reveal,5),padding:'10px 13px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:11.5,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Key idea:</b> wireless Ethernet cannot detect a collision while transmitting, so the protocol tries to avoid collisions before sending.</footer>
    </section>
    <aside style={{display:'grid',gap:14}}>
      <section style={{...emphasis(reveal,2),padding:'20px 18px',border:'1px solid var(--h14-blue)',background:'rgba(84,166,255,.05)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>BLUETOOTH</b><strong style={{display:'block',marginTop:9,fontSize:26}}>IEEE 802.15</strong><p style={{margin:'8px 0 0',fontSize:11.5,color:'var(--h14-muted)'}}>short-range wireless communication</p></section>
      <section style={{...emphasis(reveal,3),padding:'20px 18px',border:'1px solid var(--h14-blue)',background:'rgba(84,166,255,.05)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>WiMAX</b><strong style={{display:'block',marginTop:9,fontSize:26}}>IEEE 802.16</strong><p style={{margin:'8px 0 0',fontSize:11.5,color:'var(--h14-muted)'}}>802.16-2004 fixed · 802.16-2005 mobile</p></section>
    </aside>
  </div>;
}

const coreFields:[string,string,string,string][]=[
  ['SOURCE IP','32 bits','ROUTE','where the packet came from'],
  ['DESTINATION IP','32 bits','ROUTE','where the packet must go'],
  ['HOP NUMBER','8 bits','LIFETIME','prevents indefinite circulation'],
  ['PACKET LENGTH','16 bits','SIZE','length of the packet in bytes'],
  ['NUMBER OF PACKETS','16 bits','REASSEMBLY','how many packets form the message'],
  ['SEQUENCE NUMBER','16 bits','REASSEMBLY','restores the original order'],
  ['HEADER CHECKSUM','16 bits','INTEGRITY','checks the header for transmission errors'],
];

/** Hodder p.341, Figure 14.9. Exact core fields retained, but grouped by what the receiver/router needs them for. */
export function Chapter14PacketHeaderHero({reveal}:{reveal:number}){
  return <div className="h14m-content-v2" aria-label="TCP IP packet header core fields and purposes" style={{display:'grid',gridTemplateColumns:'1.45fr .85fr',gap:20,minHeight:430,alignItems:'center'}}>
    <section style={{display:'grid',gap:8}}>
      <header style={{paddingBottom:9,borderBottom:'2px solid var(--h14-cyan)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>HODDER p.341 · FIGURE 14.9</b><strong style={{display:'block',marginTop:5,fontSize:24}}>TCP/IP PACKET HEADER</strong></header>
      <main style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>{coreFields.map(([field,bits,group,purpose],i)=><section key={field} style={{...emphasis(reveal,Math.ceil((i+1)/2)),padding:'11px 12px',display:'grid',gridTemplateColumns:'1fr auto',gap:5,borderLeft:`3px solid ${group==='ROUTE'?'var(--h14-cyan)':group==='REASSEMBLY'?'var(--h14-amber)':'var(--h14-blue)'}`,borderBottom:'1px solid var(--h14-line)',background:'rgba(8,21,36,.32)'}}><b style={{...mono,fontSize:10.5,color:'var(--h14-ink)'}}>{field}</b><strong style={{...mono,fontSize:10,color:'var(--h14-cyan)'}}>{bits}</strong><small style={{gridColumn:'1 / -1',color:'var(--h14-muted)',fontSize:10.5,lineHeight:1.35}}>{purpose}</small></section>)}</main>
    </section>
    <aside style={{display:'grid',gap:10}}>
      {[
        ['ROUTER','Read destination IP → choose next hop.','var(--h14-cyan)'],
        ['LIFETIME','Hop number stops a lost packet circulating forever.','var(--h14-blue)'],
        ['DESTINATION','Packet count + sequence number rebuild the message.','var(--h14-amber)'],
        ['CHECK','Header checksum helps detect transmission errors.','var(--h14-blue)'],
      ].map(([title,text,color],i)=><section key={title} style={{...emphasis(reveal,i+1),padding:'14px 15px',borderLeft:`4px solid ${color}`,background:'rgba(84,166,255,.04)'}}><b style={{...mono,fontSize:10.5,color}}>{title}</b><p style={{margin:'6px 0 0',fontSize:11.5,lineHeight:1.45,color:'var(--h14-muted)'}}>{text}</p></section>)}
      <footer style={{padding:'10px 12px',borderTop:'1px solid var(--h14-line)',fontSize:11,color:'var(--h14-muted)'}}>The header travels with the message data: <b style={{color:'var(--h14-ink)'}}>routing + lifetime + reassembly + integrity</b>.</footer>
    </aside>
  </div>;
}

const extendedGroups:{title:string;fields:[string,string,string][]}[]=[
  {title:'FORMAT + PRIORITY',fields:[['PROTOCOL VERSION','4 bits','IPv4 / IPv6'],['HEADER LENGTH','4 bits','multiples of four'],['PRIORITY','8 bits','selects packet priority / queue'],['PACKET LENGTH','16 bits','packet length in bytes']]},
  {title:'FRAGMENTATION',fields:[['FRAGMENT FLAGS','3 bits','includes DF and MF'],['FRAGMENT OFFSET','13 bits','position in original packet']]},
  {title:'DELIVERY CONTROL',fields:[['CURRENT HOP','8 bits','decremented at each router'],['PACKET COUNT','16 bits','number of packets in message'],['SEQUENCE','16 bits','reassembly order'],['TRANSPORT PROTOCOL','8 bits','TCP or UDP'],['HEADER CHECKSUM','16 bits','error-check value']]},
  {title:'ADDRESSING',fields:[['SOURCE IP','32 bits','source address'],['DESTINATION IP','32 bits','destination address']]},
];

/** Hodder p.341 general packet header. Every source-listed field and bit length remains visible. */
export function Chapter14PacketHeaderExtendedHero({reveal}:{reveal:number}){
  return <div className="h14m-content-v2" aria-label="General packet header fields grouped by function" style={{display:'grid',gap:13,minHeight:430,alignContent:'center'}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',paddingBottom:9,borderBottom:'2px solid var(--h14-cyan)'}}><div><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>HODDER p.341 · GENERAL HEADER</b><strong style={{display:'block',marginTop:4,fontSize:22}}>EVERY SOURCE-LISTED HEADER FIELD</strong></div><small style={{color:'var(--h14-muted)'}}>grouped by purpose, not reduced</small></header>
    <main style={{display:'grid',gridTemplateColumns:'1.05fr .72fr 1.3fr .78fr',gap:10}}>{extendedGroups.map((group,gi)=><section key={group.title} style={{...emphasis(reveal,gi+1),padding:'13px 12px',borderTop:`3px solid ${gi===1?'var(--h14-amber)':'var(--h14-cyan)'}`,borderBottom:'1px solid var(--h14-line)',background:'rgba(84,166,255,.04)'}}><b style={{...mono,color:gi===1?'var(--h14-amber)':'var(--h14-cyan)',fontSize:10.5}}>{group.title}</b><div style={{display:'grid',gap:8,marginTop:12}}>{group.fields.map(([field,bits,purpose])=><div key={field} style={{paddingBottom:7,borderBottom:'1px solid var(--h14-line)'}}><strong style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:10.8}}><span>{field}</span><span style={{...mono,color:'var(--h14-cyan)',fontSize:9.5}}>{bits}</span></strong><small style={{display:'block',marginTop:3,color:'var(--h14-muted)',fontSize:9.8,lineHeight:1.3}}>{purpose}</small></div>)}</div></section>)}</main>
    <footer style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><span style={{...emphasis(reveal,4),padding:'9px 12px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:10.8,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Fragmentation:</b> DF = do not fragment; MF = more fragments follow.</span><span style={{...emphasis(reveal,4),padding:'9px 12px',borderLeft:'3px solid var(--h14-cyan)',background:'rgba(82,224,210,.04)',fontSize:10.8,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Header-length example:</b> value 6 means 6 × 4 = 24 bytes.</span></footer>
  </div>;
}

/** Chapter 14 recap. One visual story from shared rules to a reconstructed message. */
export function Chapter14RecapHero({reveal}:{reveal:number}){
  const stages=[
    ['1','PROTOCOL','Sender + receiver agree the communication rules.'],
    ['2','APPLICATION','HTTP · FTP · SMTP/POP/IMAP · DNS · BitTorrent choose the service/task.'],
    ['3','TRANSPORT','Break data into packets/segments; sequence, acknowledge and retransmit when required.'],
    ['4','INTERNET','Add IP addressing and choose routes between networks.'],
    ['5','LINK','Wrap the datagram in a local frame and use MAC addressing on the current segment.'],
    ['6','SWITCHING','Circuit = one dedicated route; packet = independent packets and possible different routes.'],
    ['7','ROUTER','Read header → routing table → next hop → next-router MAC → forward or delete.'],
    ['8','DESTINATION','Use sequence/count information to reconstruct the original message.'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="Chapter 14 complete communication journey recap" style={{display:'grid',gap:14,minHeight:430,alignContent:'center'}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',paddingBottom:10,borderBottom:'2px solid var(--h14-cyan)'}}><div><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>CHAPTER 14 · COMPLETE MAP</b><strong style={{display:'block',marginTop:4,fontSize:24}}>FROM AGREED RULES TO A RECONSTRUCTED MESSAGE</strong></div><small style={{color:'var(--h14-muted)'}}>8 exam-ready ideas</small></header>
    <main style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:9}}>{stages.map(([n,title,text],i)=><section key={n} style={{...emphasis(reveal,Math.ceil((i+1)/2)),minHeight:145,padding:'13px 12px',display:'grid',gridTemplateRows:'34px auto 1fr',gap:6,borderTop:`3px solid ${i===7?'var(--h14-amber)':'var(--h14-cyan)'}`,borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(180deg,rgba(84,166,255,.06),rgba(8,21,36,.2))'}}><b style={{display:'grid',placeItems:'center',width:32,height:32,borderRadius:'50%',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',...mono,fontSize:10}}>{n}</b><strong style={{fontSize:12.5}}>{title}</strong><p style={{margin:0,fontSize:10.7,lineHeight:1.42,color:'var(--h14-muted)'}}>{text}</p></section>)}</main>
    <footer style={{padding:'10px 13px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:11.5,color:'var(--h14-muted)'}}>Exam transfer: explain communication as a chain — <b style={{color:'var(--h14-ink)'}}>rules → layers → headers → routes → local frames → router decisions → reassembly</b>.</footer>
  </div>;
}
