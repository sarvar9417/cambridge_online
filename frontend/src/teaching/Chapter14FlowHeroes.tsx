import { revealStyle } from './Chapter14VisualPrimitives';

const chip=(label:string,tone:'blue'|'cyan'|'amber'|'muted'='blue')=>{
  const border=tone==='cyan'?'var(--h14-cyan)':tone==='amber'?'var(--h14-amber)':tone==='muted'?'var(--h14-line)':'var(--h14-blue)';
  const color=tone==='cyan'?'var(--h14-cyan)':tone==='amber'?'var(--h14-amber)':tone==='muted'?'var(--h14-muted)':'var(--h14-ink)';
  return <span key={label} style={{display:'grid',placeItems:'center',minHeight:42,padding:'8px 11px',border:`1px solid ${border}`,background:'rgba(8,21,36,.72)',color,font:'800 12px var(--font-mono)',textAlign:'center'}}>{label}</span>;
};

/** Hodder pp.329–330. One stable payload is wrapped as data moves 4 → 1. */
export function Chapter14EncapsulationHero({reveal}:{reveal:number}){
  const rows=[
    ['4 · APPLICATION','APPLICATION DATA',['DATA']],
    ['3 · TRANSPORT','SEGMENT',['TCP HEADER','DATA']],
    ['2 · INTERNET','DATAGRAM',['IP HEADER','TCP HEADER','DATA']],
    ['1 · LINK','FRAME',['LINK HEADER','IP HEADER','TCP HEADER','DATA','FRAME CHECK']],
  ] as const;
  return <div className="h14m-content-v2" aria-label="Encapsulation from application data to frame" style={{display:'grid',gridTemplateColumns:'130px 1fr 145px',gap:20,minHeight:420,alignItems:'center'}}>
    <aside style={{display:'grid',placeItems:'center',gap:14,textAlign:'center'}}><strong style={{color:'var(--h14-cyan)',fontSize:26}}>SEND</strong><span style={{fontSize:64,lineHeight:.8,color:'var(--h14-cyan)'}}>↓</span><b style={{font:'800 13px var(--font-mono)',color:'var(--h14-muted)'}}>4 → 1</b><small style={{lineHeight:1.4,color:'var(--h14-muted)',fontSize:14}}>Each lower layer adds its own header/control information.</small></aside>
    <main style={{display:'grid',gap:10}}>{rows.map(([layer,name,parts],i)=><section key={name} style={{...revealStyle(reveal,i+1),display:'grid',gridTemplateColumns:'165px 1fr',gap:18,alignItems:'center',padding:'13px 15px',borderLeft:'4px solid var(--h14-blue)',borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(90deg,rgba(84,166,255,.08),rgba(8,21,36,.28))'}}><div><b style={{display:'block',color:'var(--h14-cyan)',font:'800 12px var(--font-mono)'}}>{layer}</b><strong style={{display:'block',marginTop:5,fontSize:21}}>{name}</strong></div><div style={{display:'grid',gridTemplateColumns:`repeat(${parts.length},minmax(0,1fr))`,gap:6}}>{parts.map((part,j)=>chip(part,part==='DATA'?'amber':j===0?'cyan':'blue'))}</div></section>)}</main>
    <aside style={{display:'grid',placeItems:'center',gap:14,textAlign:'center'}}><span style={{fontSize:64,lineHeight:.8,color:'var(--h14-cyan)'}}>↑</span><strong style={{color:'var(--h14-cyan)',fontSize:23}}>RECEIVE</strong><b style={{font:'800 13px var(--font-mono)',color:'var(--h14-muted)'}}>1 → 4</b><small style={{lineHeight:1.4,color:'var(--h14-muted)',fontSize:14}}>At the receiving host the four layers are processed in the reverse order.</small></aside>
    <footer style={{gridColumn:'1 / -1',padding:'11px 14px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:15,color:'var(--h14-muted)'}}>Coursebook terminology: <b style={{color:'var(--h14-ink)'}}>application data → segment → datagram → frame</b>.</footer>
  </div>;
}

/** Hodder p.333. Source function + positive acknowledgement with retransmission. */
export function Chapter14TransportReliabilityHero({reveal}:{reveal:number}){
  const segments=['S1','S2','S3','S4'];
  return <div className="h14m-content-v2" aria-label="Transport layer reliability and positive acknowledgement with retransmission" style={{display:'grid',gap:18,minHeight:420,alignContent:'center'}}>
    <div style={{display:'grid',gridTemplateColumns:'165px 1fr 125px 1fr 175px',alignItems:'center',gap:12}}>
      <section style={{...revealStyle(reveal,1),padding:18,textAlign:'center',border:'1px solid var(--h14-blue)',background:'rgba(84,166,255,.06)'}}><b style={{color:'var(--h14-cyan)',font:'800 13px var(--font-mono)'}}>MESSAGE</b><p style={{margin:'8px 0 0',fontSize:14.5,color:'var(--h14-muted)'}}>transport layer breaks data into <b style={{color:'var(--h14-ink)'}}>segments</b></p></section>
      <div style={{...revealStyle(reveal,1),display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>{segments.map(p=><b key={p} style={{padding:'16px 8px',textAlign:'center',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',font:'900 14px var(--font-mono)'}}>{p}</b>)}</div>
      <div style={{...revealStyle(reveal,2),display:'grid',placeItems:'center',gap:6}}><strong style={{fontSize:27}}>NETWORK</strong><span style={{color:'var(--h14-red)',fontSize:32}}>× S3</span><small style={{color:'var(--h14-muted)',fontSize:13}}>lost / corrupted</small></div>
      <div style={{...revealStyle(reveal,3),display:'grid',gap:7}}><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>{['S1','S2','?','S4'].map((p,i)=><b key={`${p}-${i}`} style={{padding:'16px 8px',textAlign:'center',border:`1px solid ${p==='?'?'var(--h14-red)':'var(--h14-line)'}`,color:p==='?'?'var(--h14-red)':'var(--h14-muted)',font:'900 14px var(--font-mono)'}}>{p}</b>)}</div><span style={{textAlign:'center',color:'var(--h14-amber)',font:'800 12px var(--font-mono)'}}>NO POSITIVE ACK FOR S3</span></div>
      <section style={{...revealStyle(reveal,4),padding:18,textAlign:'center',border:'1px solid var(--h14-cyan)',background:'rgba(82,224,210,.05)'}}><b style={{color:'var(--h14-cyan)',font:'800 13px var(--font-mono)'}}>PAR</b><strong style={{display:'block',marginTop:8,fontSize:20}}>RE-SEND S3 ↺</strong><p style={{margin:'8px 0 0',fontSize:13.5,color:'var(--h14-muted)'}}>positive acknowledgement with re-transmission</p></section>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',borderTop:'1px solid var(--h14-line)'}}>{[
      ['REGULATE','Regulates network connections.'],['SPLIT','Breaks application data into transport segments.'],['SEQUENCE + ERRORS','Uses sequence/acknowledgement information for reliable delivery.'],['ACK + RETRANSMIT','Retransmits lost/corrupted data when acknowledgement fails.'],
    ].map(([title,text],i)=><section key={title} style={{...revealStyle(reveal,Math.min(i+1,4)),padding:'13px 14px',borderRight:i<3?'1px solid var(--h14-line)':'0'}}><b style={{color:'var(--h14-cyan)',font:'800 12px var(--font-mono)'}}>{title}</b><p style={{margin:'7px 0 0',fontSize:14,lineHeight:1.4,color:'var(--h14-muted)'}}>{text}</p></section>)}</div>
    <footer style={{padding:'10px 13px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:14,color:'var(--h14-muted)'}}>Transport protocols named by the source: <b style={{color:'var(--h14-ink)'}}>TCP · UDP · SCTP</b>. This chapter then considers TCP in detail.</footer>
  </div>;
}

/** Hodder pp.333–334. Three-way synchronisation dialogue before normal transfer. */
export function Chapter14TcpHandshakeHero({reveal}:{reveal:number}){
  const steps=[
    ['1','X → Y','segment containing synchronisation sequence bits'],
    ['2','Y → X','acknowledgement + Y’s own synchronisation sequence bits'],
    ['3','X → Y','acknowledgement that Y’s segment was received'],
    ['4','DATA','transmission between X and Y can now take place'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="TCP host to host connection handshake" style={{display:'grid',gridTemplateColumns:'180px 1fr 180px',gap:20,minHeight:420,alignItems:'stretch'}}>
    <section style={{display:'grid',gridTemplateRows:'75px 1fr',justifyItems:'center'}}><strong style={{alignSelf:'center',fontSize:26}}>HOST X</strong><i style={{width:2,background:'linear-gradient(var(--h14-cyan),rgba(82,224,210,.12))'}}/></section>
    <main style={{display:'grid',alignContent:'center',gap:16}}>{steps.map(([n,direction,text],i)=><section key={n} style={{...revealStyle(reveal,i+1),display:'grid',gridTemplateColumns:'48px 150px 1fr',gap:13,alignItems:'center',minHeight:70,padding:'10px 14px',borderBlock:'1px solid var(--h14-line)',background:i===3?'rgba(82,224,210,.05)':'rgba(84,166,255,.04)'}}><b style={{display:'grid',placeItems:'center',width:40,height:40,borderRadius:'50%',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',font:'900 12px var(--font-mono)'}}>{n}</b><strong style={{color:i===3?'var(--h14-cyan)':'var(--h14-ink)',font:'900 14px var(--font-mono)'}}>{direction}</strong><p style={{margin:0,fontSize:15,lineHeight:1.38,color:'var(--h14-muted)'}}>{text}</p></section>)}</main>
    <section style={{display:'grid',gridTemplateRows:'75px 1fr',justifyItems:'center'}}><strong style={{alignSelf:'center',fontSize:26}}>HOST Y</strong><i style={{width:2,background:'linear-gradient(var(--h14-cyan),rgba(82,224,210,.12))'}}/></section>
    <footer style={{gridColumn:'1 / -1',padding:'11px 14px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:14.5,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>TCP is connection-oriented and host-to-host:</b> it establishes an end-to-end connection between the two hosts using handshakes before data transmission.</footer>
  </div>;
}

/** Hodder p.332. One screen separates SMTP push, MIME attachments and POP/IMAP pull. */
export function Chapter14EmailMechanicsHero({reveal}:{reveal:number}){
  const cards=[
    ['SMTP · PUSH','CLIENT → EMAIL SERVER','text-based · connection-based','Client opens a connection, keeps it active and uploads new email.'],
    ['MIME · ATTACHMENTS','EMAIL + MIME HEADER → MEDIA','image · video · music','MIME allows media/binary attachments; the MIME header helps identify which media player is needed when the attachment is opened.'],
    ['POP / IMAP · PULL','CLIENT ← EMAIL SERVER','check · download · close','Client periodically connects, checks for and downloads new email, then closes the connection.'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="SMTP MIME POP and IMAP mechanics" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:18,minHeight:420,alignItems:'center'}}>
    {cards.map(([title,flow,keywords,text],i)=><section key={title} style={{...revealStyle(reveal,i+1),minHeight:300,padding:'22px 20px',display:'grid',gridTemplateRows:'auto 90px auto 1fr',gap:14,borderTop:`4px solid ${i===1?'var(--h14-amber)':'var(--h14-cyan)'}`,borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(180deg,rgba(84,166,255,.08),rgba(8,21,36,.18))'}}><header><b style={{color:i===1?'var(--h14-amber)':'var(--h14-cyan)',font:'900 14px var(--font-mono)'}}>{title}</b></header><div style={{display:'grid',placeItems:'center',padding:12,border:'1px solid var(--h14-line)',background:'rgba(8,21,36,.55)',font:'900 15px var(--font-mono)',textAlign:'center'}}>{flow}</div><small style={{color:'var(--h14-amber)',font:'800 12px var(--font-mono)',textTransform:'uppercase'}}>{keywords}</small><p style={{margin:0,fontSize:15,lineHeight:1.5,color:'var(--h14-muted)'}}>{text}</p></section>)}
    <footer style={{gridColumn:'1 / -1',padding:'11px 14px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:14,color:'var(--h14-muted)'}}>Coursebook note: POP3/4 and IMAP have largely been superseded by increasing HTTP use, while <b style={{color:'var(--h14-ink)'}}>SMTP is still used between email servers</b>.</footer>
  </div>;
}
