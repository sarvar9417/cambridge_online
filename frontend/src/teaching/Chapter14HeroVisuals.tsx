import { HardDrives, Laptop } from '@phosphor-icons/react';
import { revealStyle } from './Chapter14VisualPrimitives';

/**
 * Hodder pp.329–330. A large projector-first master model keeps send 4→1 and
 * receive 1→4 visible together while the individual layers reveal one at a time.
 */
export function Chapter14TcpIpJourney({reveal}:{reveal:number}){
  const layers=[
    ['4','APPLICATION','Programs and application protocols exchange data.'],
    ['3','TRANSPORT','Regulates connections; sequencing, acknowledgement and retransmission.'],
    ['2','INTERNET','IP addressing and routing between networks.'],
    ['1','LINK','Local frames, link addressing and IP-to-MAC mapping.'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="TCP IP four layer send and receive journey" style={{display:'grid',gridTemplateColumns:'190px minmax(0,1fr) 190px',gap:22,minHeight:420,alignItems:'center'}}>
    <aside style={{display:'grid',placeItems:'center',gap:14,textAlign:'center'}}>
      <div style={{width:132,height:104,border:'2px solid var(--h14-blue)',borderRadius:14,background:'rgba(84,166,255,.06)',display:'grid',placeItems:'center'}}><Laptop size={62} weight="duotone" color="var(--h14-cyan)"/><b style={{fontSize:14}}>SENDER</b></div>
      <strong style={{fontSize:30,color:'var(--h14-cyan)'}}>SEND · 4 → 1</strong>
      <div style={{fontSize:66,lineHeight:.8,color:'var(--h14-cyan)'}}>↓</div>
      <small style={{color:'var(--h14-muted)',lineHeight:1.4,fontSize:14}}>Data moves down the stack before local transmission.</small>
    </aside>
    <main style={{display:'grid',gap:9}}>
      {layers.map(([n,name,job],i)=><section key={name} style={{...revealStyle(reveal,i+1),display:'grid',gridTemplateColumns:'60px 1fr',gap:17,alignItems:'center',minHeight:84,padding:'13px 18px',borderLeft:'5px solid var(--h14-blue)',borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(90deg,rgba(84,166,255,.10),rgba(12,27,46,.28))'}}><b style={{display:'grid',placeItems:'center',width:46,height:46,border:'1px solid var(--h14-cyan)',borderRadius:'50%',color:'var(--h14-cyan)',font:'800 15px var(--font-mono)'}}>{n}</b><div><strong style={{display:'block',fontSize:24}}>{name}</strong><p style={{margin:'4px 0 0',fontSize:15.5,lineHeight:1.35,color:'var(--h14-muted)'}}>{job}</p></div></section>)}
      <footer style={{padding:'11px 14px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:14,color:'var(--h14-muted)'}}>Layering is <b style={{color:'var(--h14-amber)'}}>decomposition</b>: communication is split into self-contained software modules, improving manageability and compatibility.</footer>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,paddingTop:2}}>{[['APP','application/service'],['PORT','transport endpoint'],['IP','network/host'],['MAC','local next hop']].map(([key,text])=><span key={key} style={{padding:'8px 9px',border:'1px solid var(--h14-line)',textAlign:'center',fontSize:13,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-cyan)',fontFamily:'var(--font-mono)'}}>{key}</b><small style={{display:'block',marginTop:3,fontSize:11.5}}>{text}</small></span>)}</div>
      <small style={{textAlign:'center',color:'var(--h14-muted)',fontSize:12.5}}>Memory aid only — not a formal protocol definition: <b style={{color:'var(--h14-ink)'}}>APP → PORT → IP → MAC</b></small>
    </main>
    <aside style={{display:'grid',placeItems:'center',gap:14,textAlign:'center'}}>
      <div style={{fontSize:66,lineHeight:.8,color:'var(--h14-cyan)'}}>↑</div>
      <strong style={{fontSize:30,color:'var(--h14-cyan)'}}>RECEIVE · 1 → 4</strong>
      <div style={{width:132,height:104,border:'2px solid var(--h14-cyan)',borderRadius:14,background:'rgba(82,224,210,.06)',display:'grid',placeItems:'center'}}><HardDrives size={58} weight="duotone" color="var(--h14-cyan)"/><b style={{fontSize:14}}>RECEIVER</b></div>
      <small style={{color:'var(--h14-muted)',lineHeight:1.4,fontSize:14}}>At the destination the same stack is processed in reverse.</small>
    </aside>
  </div>;
}

/**
 * Hodder p.331. The coursebook request sequence is kept deliberately. The final
 * reveal changes from the large journey diagram to a readable seven-step recap.
 */
export function Chapter14HttpJourney({reveal}:{reveal:number}){
  const steps=[
    ['1','URL','User enters the URL in the browser.'],
    ['2','HTTP(S)','Request moves from Application to TCP.'],
    ['3','TCP SEGMENTS','TCP prepares transport-layer segments; the source sequence names port 80.'],
    ['4','DNS','Domain name is matched to the website IP address.'],
    ['5','ACK','Server TCP sends an acknowledgement.'],
    ['6','HTML','Web server sends the page back in HTML format.'],
    ['7','DISPLAY','Browser interprets and displays the returned page.'],
  ] as const;

  if(reveal>=7){
    return <div className="h14m-content-v2" aria-label="HTTP source sequence recap" style={{display:'grid',gap:14,minHeight:410,alignContent:'center'}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',paddingBottom:11,borderBottom:'2px solid var(--h14-cyan)'}}><div><b style={{color:'var(--h14-cyan)',font:'900 14px var(--font-mono)'}}>HODDER p.331 · COURSEBOOK REQUEST SEQUENCE</b><strong style={{display:'block',marginTop:5,fontSize:30}}>FROM URL TO DISPLAYED WEB PAGE</strong></div><small style={{color:'var(--h14-muted)',fontSize:14}}>summary after the visual journey</small></header>
      <main style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{steps.map(([n,title,text],i)=><section key={n} style={{padding:'13px 15px',display:'grid',gridTemplateColumns:'44px 130px 1fr',gap:12,alignItems:'center',borderBottom:'1px solid var(--h14-line)',background:'rgba(84,166,255,.035)',gridColumn:i===6?'1 / -1':undefined}}><b style={{display:'grid',placeItems:'center',width:38,height:38,borderRadius:'50%',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',font:'900 12px var(--font-mono)'}}>{n}</b><strong style={{color:'var(--h14-cyan)',font:'900 13px var(--font-mono)'}}>{title}</strong><p style={{margin:0,fontSize:15,lineHeight:1.4,color:'var(--h14-muted)'}}>{text}</p></section>)}</main>
      <footer style={{padding:'11px 14px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',color:'var(--h14-muted)',fontSize:14.5}}>This screen follows the <b style={{color:'var(--h14-ink)'}}>coursebook teaching sequence</b>; it is not intended as a full real-world timing model of browser networking.</footer>
    </div>;
  }

  const current=Math.max(1,reveal);
  const [n,title,text]=steps[current-1];
  return <div className="h14m-content-v2" aria-label="HTTP web page request journey" style={{display:'grid',gap:13,minHeight:410,alignContent:'center'}}>
    <svg viewBox="0 0 1160 350" role="img" aria-label="Browser to HTTP to TCP segments and IP to web server, with DNS lookup and HTML response" style={{width:'100%',maxHeight:355}}>
      <defs><marker id="h14-http-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="var(--h14-cyan)"/></marker></defs>
      <path d="M170 205 H320" stroke="var(--h14-cyan)" strokeWidth="4" fill="none" markerEnd="url(#h14-http-arrow)" style={revealStyle(reveal,2)}/>
      <path d="M430 205 H575" stroke="var(--h14-cyan)" strokeWidth="4" fill="none" markerEnd="url(#h14-http-arrow)" style={revealStyle(reveal,3)}/>
      <path d="M705 205 H845" stroke="var(--h14-blue)" strokeWidth="4" fill="none" markerEnd="url(#h14-http-arrow)" style={revealStyle(reveal,4)}/>
      <path d="M945 205 H1060" stroke="var(--h14-cyan)" strokeWidth="4" fill="none" markerEnd="url(#h14-http-arrow)" style={revealStyle(reveal,5)}/>
      <path d="M625 160 V92 H495" stroke="var(--h14-cyan)" strokeWidth="3" strokeDasharray="8 7" fill="none" markerEnd="url(#h14-http-arrow)" style={revealStyle(reveal,4)}/>
      <path d="M495 115 H625 V160" stroke="var(--h14-muted)" strokeWidth="2.5" strokeDasharray="7 7" fill="none" markerEnd="url(#h14-http-arrow)" style={revealStyle(reveal,4)}/>
      <path d="M1080 270 V320 H115 V255" stroke="var(--h14-cyan)" strokeWidth="3" fill="none" markerEnd="url(#h14-http-arrow)" style={revealStyle(reveal,6)}/>
      <g><rect x="35" y="150" width="135" height="105" rx="12" fill="rgba(84,166,255,.08)" stroke="var(--h14-blue)" strokeWidth="2"/><rect x="52" y="171" width="101" height="57" rx="5" fill="#07111f" stroke="var(--h14-line)"/><text x="102" y="192" textAnchor="middle" fill="var(--h14-cyan)" fontSize="14" fontWeight="800">BROWSER</text><text x="102" y="216" textAnchor="middle" fill="var(--h14-ink)" fontSize="12">www.example.com</text></g>
      <g style={revealStyle(reveal,2)}><rect x="320" y="160" width="110" height="90" rx="12" fill="rgba(84,166,255,.08)" stroke="var(--h14-blue)" strokeWidth="2"/><text x="375" y="196" textAnchor="middle" fill="var(--h14-ink)" fontSize="19" fontWeight="900">HTTP(S)</text><text x="375" y="220" textAnchor="middle" fill="var(--h14-muted)" fontSize="12">request format</text></g>
      <g style={revealStyle(reveal,3)}>{[0,1,2].map(i=><g key={i}><rect x="575" y={166+i*28} width="130" height="21" rx="5" fill="rgba(82,224,210,.08)" stroke="var(--h14-cyan)"/><text x="640" y={181+i*28} textAnchor="middle" fill="var(--h14-ink)" fontSize="11">TCP segment {i+1}</text></g>)}<text x="640" y="270" textAnchor="middle" fill="var(--h14-amber)" fontSize="12" fontWeight="800">PORT 80 · source sequence</text></g>
      <g style={revealStyle(reveal,4)}>{[0,1,2].map(i=><rect key={i} x="410" y={45+i*22} width="85" height="17" rx="4" fill="rgba(82,224,210,.08)" stroke="var(--h14-cyan)"/>)}<text x="452" y="34" textAnchor="middle" fill="var(--h14-cyan)" fontSize="15" fontWeight="900">DNS</text><text x="505" y="83" fill="var(--h14-muted)" fontSize="12">domain → IP</text><circle cx="895" cy="205" r="54" fill="rgba(84,166,255,.05)" stroke="var(--h14-blue)" strokeWidth="2"/><circle cx="875" cy="194" r="10" fill="#0c1b2e" stroke="var(--h14-cyan)"/><circle cx="915" cy="185" r="10" fill="#0c1b2e" stroke="var(--h14-cyan)"/><circle cx="902" cy="226" r="10" fill="#0c1b2e" stroke="var(--h14-cyan)"/><line x1="885" y1="196" x2="905" y2="188" stroke="var(--h14-line)" strokeWidth="2"/><line x1="882" y1="202" x2="897" y2="218" stroke="var(--h14-line)" strokeWidth="2"/><line x1="913" y1="195" x2="905" y2="216" stroke="var(--h14-line)" strokeWidth="2"/><text x="895" y="282" textAnchor="middle" fill="var(--h14-blue)" fontSize="13" fontWeight="800">IP / INTERNET ROUTING</text></g>
      <g style={revealStyle(reveal,5)}><rect x="1060" y="145" width="70" height="125" rx="9" fill="rgba(84,166,255,.08)" stroke="var(--h14-blue)" strokeWidth="2"/>{[0,1,2,3].map(i=><rect key={i} x="1072" y={161+i*23} width="46" height="12" rx="3" fill="#0c1b2e" stroke="var(--h14-line)"/>)}<text x="1095" y="137" textAnchor="middle" fill="var(--h14-ink)" fontSize="13" fontWeight="900">WEB SERVER</text><text x="1095" y="292" textAnchor="middle" fill="var(--h14-cyan)" fontSize="11">ACK + HTML</text></g>
      <g style={revealStyle(reveal,6)}><rect x="480" y="300" width="200" height="38" rx="7" fill="rgba(255,200,87,.06)" stroke="var(--h14-amber)"/><text x="580" y="324" textAnchor="middle" fill="var(--h14-ink)" fontSize="12" fontWeight="800">HTML RESPONSE · back to browser</text></g>
    </svg>
    <section style={{padding:'13px 16px',display:'grid',gridTemplateColumns:'56px 170px 1fr',gap:14,alignItems:'center',borderTop:'2px solid var(--h14-cyan)',background:'rgba(84,166,255,.04)'}}><b style={{display:'grid',placeItems:'center',width:44,height:44,borderRadius:'50%',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',font:'900 13px var(--font-mono)'}}>{n}</b><strong style={{color:'var(--h14-cyan)',font:'900 14px var(--font-mono)'}}>{title}</strong><p style={{margin:0,fontSize:16,lineHeight:1.42,color:'var(--h14-muted)'}}>{text}</p></section>
    <footer style={{padding:'10px 13px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',color:'var(--h14-muted)',fontSize:13.5}}>Coursebook sequence: URL → HTTP(S) → TCP/port 80 → DNS lookup → acknowledgement → HTML response → browser display.</footer>
  </div>;
}

/** Hodder pp.341–342, Figure 14.10: header → routing table → next hop → forward. */
export function Chapter14RouterJourney({reveal}:{reveal:number}){
  const steps=[
    ['1','READ HEADER','Read destination IP and hop/control fields.'],
    ['2','LOOK UP','Compare destination/network information with the routing table.'],
    ['3','CHOOSE','Use hops/metrics to select the best available next hop.'],
    ['4','UPDATE','Add the next-router MAC address and choose the local interface.'],
    ['5','FORWARD','Forward; if no route exists or hop = 0, delete the data package.'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="Router decision journey" style={{display:'grid',gap:18,minHeight:410,alignContent:'center'}}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 65px 1.2fr 65px 1fr',alignItems:'center',gap:6}}>
      <section style={{...revealStyle(reveal,1),minHeight:190,padding:20,borderBlock:'2px solid var(--h14-blue)',background:'rgba(84,166,255,.05)',display:'grid',alignContent:'center',gap:12,textAlign:'center'}}><b style={{color:'var(--h14-cyan)',font:'800 14px var(--font-mono)'}}>PACKET HEADER</b><strong style={{fontSize:24}}>Destination IP</strong><span style={{color:'var(--h14-muted)',fontSize:15}}>hop number · sequence · checksum</span></section>
      <i style={{...revealStyle(reveal,2),fontStyle:'normal',fontSize:42,textAlign:'center',color:'var(--h14-cyan)'}}>→</i>
      <section style={{...revealStyle(reveal,2),minHeight:230,padding:20,border:'2px solid var(--h14-cyan)',borderRadius:18,background:'rgba(82,224,210,.05)',display:'grid',alignContent:'center',gap:14,textAlign:'center'}}><strong style={{fontSize:31}}>ROUTER</strong><div style={{padding:12,borderTop:'1px solid var(--h14-line)',borderBottom:'1px solid var(--h14-line)'}}><b style={{display:'block',color:'var(--h14-amber)',font:'800 13px var(--font-mono)',marginBottom:7}}>ROUTING TABLE</b><span style={{color:'var(--h14-muted)',fontSize:14,lineHeight:1.5}}>hops · next-router MAC · metrics · network destination<br/>gateway · netmask · interface</span></div><small style={{color:'var(--h14-cyan)',fontSize:13}}>compare → choose best next hop</small></section>
      <i style={{...revealStyle(reveal,3),fontStyle:'normal',fontSize:42,textAlign:'center',color:'var(--h14-cyan)'}}>→</i>
      <section style={{...revealStyle(reveal,4),minHeight:190,padding:20,borderBlock:'2px solid var(--h14-blue)',background:'rgba(84,166,255,.05)',display:'grid',alignContent:'center',gap:12,textAlign:'center'}}><b style={{color:'var(--h14-cyan)',font:'800 14px var(--font-mono)'}}>NEXT HOP</b><strong style={{fontSize:23}}>Next-router MAC</strong><span style={{color:'var(--h14-muted)',fontSize:15}}>selected interface → forward packet</span></section>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',borderTop:'1px solid var(--h14-line)'}}>{steps.map(([n,title,text],i)=><section key={n} style={{...revealStyle(reveal,i+1),padding:'11px 12px',borderRight:i<steps.length-1?'1px solid var(--h14-line)':'0'}}><b style={{color:i===4?'var(--h14-red)':'var(--h14-cyan)',font:'800 12px var(--font-mono)'}}>{n} · {title}</b><p style={{margin:'7px 0 0',fontSize:14,lineHeight:1.38,color:'var(--h14-muted)'}}>{text}</p></section>)}</div>
    <footer style={{padding:'10px 13px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:14,color:'var(--h14-muted)'}}>The decision repeats at each router until the destination is reached. The original sender does not pre-plan the complete route.</footer>
  </div>;
}
