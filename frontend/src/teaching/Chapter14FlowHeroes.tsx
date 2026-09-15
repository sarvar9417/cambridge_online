const emphasis=(reveal:number,step:number)=>({opacity:reveal>=step?1:.34,transition:'opacity .2s ease'});

const chip=(label:string,tone:'blue'|'cyan'|'amber'|'muted'='blue')=>{
  const border=tone==='cyan'?'var(--h14-cyan)':tone==='amber'?'var(--h14-amber)':tone==='muted'?'var(--h14-line)':'var(--h14-blue)';
  const color=tone==='cyan'?'var(--h14-cyan)':tone==='amber'?'var(--h14-amber)':tone==='muted'?'var(--h14-muted)':'var(--h14-ink)';
  return <span key={label} style={{display:'grid',placeItems:'center',minHeight:40,padding:'7px 10px',border:`1px solid ${border}`,background:'rgba(8,21,36,.72)',color,font:'800 10px var(--font-mono)',textAlign:'center'}}>{label}</span>;
};

/** Hodder pp.329–330. One stable payload is wrapped as data moves 4 → 1. */
export function Chapter14EncapsulationHero({reveal}:{reveal:number}){
  const rows=[
    ['4 · APPLICATION','APPLICATION DATA',['DATA']],
    ['3 · TRANSPORT','SEGMENT',['TCP HEADER','DATA']],
    ['2 · INTERNET','DATAGRAM',['IP HEADER','TCP HEADER','DATA']],
    ['1 · LINK','FRAME',['LINK HEADER','IP HEADER','TCP HEADER','DATA','FRAME CHECK']],
  ] as const;
  return <div className="h14m-content-v2" aria-label="Encapsulation from application data to frame" style={{display:'grid',gridTemplateColumns:'120px 1fr 135px',gap:18,minHeight:420,alignItems:'center'}}>
    <aside style={{display:'grid',placeItems:'center',gap:14,textAlign:'center'}}><strong style={{color:'var(--h14-cyan)',fontSize:24}}>SEND</strong><span style={{fontSize:64,lineHeight:.8,color:'var(--h14-cyan)'}}>↓</span><b style={{font:'800 11px var(--font-mono)',color:'var(--h14-muted)'}}>4 → 1</b><small style={{lineHeight:1.4,color:'var(--h14-muted)'}}>Each lower layer adds its own header/control information.</small></aside>
    <main style={{display:'grid',gap:10}}>{rows.map(([layer,name,parts],i)=><section key={name} style={{...emphasis(reveal,i+1),display:'grid',gridTemplateColumns:'145px 1fr',gap:16,alignItems:'center',padding:'12px 14px',borderLeft:'4px solid var(--h14-blue)',borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(90deg,rgba(84,166,255,.08),rgba(8,21,36,.28))'}}><div><b style={{display:'block',color:'var(--h14-cyan)',font:'800 10px var(--font-mono)'}}>{layer}</b><strong style={{display:'block',marginTop:5,fontSize:18}}>{name}</strong></div><div style={{display:'grid',gridTemplateColumns:`repeat(${parts.length},minmax(0,1fr))`,gap:5}}>{parts.map((part,j)=>chip(part,part==='DATA'?'amber':j===0?'cyan':'blue'))}</div></section>)}</main>
    <aside style={{display:'grid',placeItems:'center',gap:14,textAlign:'center'}}><span style={{fontSize:64,lineHeight:.8,color:'var(--h14-cyan)'}}>↑</span><strong style={{color:'var(--h14-cyan)',fontSize:21}}>RECEIVE</strong><b style={{font:'800 11px var(--font-mono)',color:'var(--h14-muted)'}}>1 → 4</b><small style={{lineHeight:1.4,color:'var(--h14-muted)'}}>At the receiving host the four layers are processed in the reverse order.</small></aside>
    <footer style={{gridColumn:'1 / -1',padding:'10px 14px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:12,color:'var(--h14-muted)'}}>Coursebook terminology: <b style={{color:'var(--h14-ink)'}}>application data → segment → datagram → frame</b>.</footer>
  </div>;
}

/** Hodder p.333. Source function + positive acknowledgement with retransmission. */
export function Chapter14TransportReliabilityHero({reveal}:{reveal:number}){
  const packets=['P1','P2','P3','P4'];
  return <div className="h14m-content-v2" aria-label="Transport layer reliability and positive acknowledgement with retransmission" style={{display:'grid',gap:18,minHeight:420,alignContent:'center'}}>
    <div style={{display:'grid',gridTemplateColumns:'160px 1fr 120px 1fr 170px',alignItems:'center',gap:12}}>
      <section style={{...emphasis(reveal,1),padding:18,textAlign:'center',border:'1px solid var(--h14-blue)',background:'rgba(84,166,255,.06)'}}><b style={{color:'var(--h14-cyan)',font:'800 11px var(--font-mono)'}}>MESSAGE</b><p style={{margin:'8px 0 0',fontSize:12,color:'var(--h14-muted)'}}>transport layer breaks data into packets</p></section>
      <div style={{...emphasis(reveal,1),display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>{packets.map(p=><b key={p} style={{padding:'15px 8px',textAlign:'center',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',font:'900 12px var(--font-mono)'}}>{p}</b>)}</div>
      <div style={{...emphasis(reveal,2),display:'grid',placeItems:'center',gap:6}}><strong style={{fontSize:26}}>NETWORK</strong><span style={{color:'var(--h14-red)',fontSize:32}}>× P3</span><small style={{color:'var(--h14-muted)'}}>lost / corrupted</small></div>
      <div style={{...emphasis(reveal,3),display:'grid',gap:7}}><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>{['P1','P2','?','P4'].map((p,i)=><b key={`${p}-${i}`} style={{padding:'15px 8px',textAlign:'center',border:`1px solid ${p==='?'?'var(--h14-red)':'var(--h14-line)'}`,color:p==='?'?'var(--h14-red)':'var(--h14-muted)',font:'900 12px var(--font-mono)'}}>{p}</b>)}</div><span style={{textAlign:'center',color:'var(--h14-amber)',font:'800 11px var(--font-mono)'}}>NO POSITIVE ACK FOR P3</span></div>
      <section style={{...emphasis(reveal,4),padding:18,textAlign:'center',border:'1px solid var(--h14-cyan)',background:'rgba(82,224,210,.05)'}}><b style={{color:'var(--h14-cyan)',font:'800 11px var(--font-mono)'}}>PAR</b><strong style={{display:'block',marginTop:8,fontSize:18}}>RE-SEND P3 ↺</strong><p style={{margin:'8px 0 0',fontSize:11.5,color:'var(--h14-muted)'}}>positive acknowledgement with re-transmission</p></section>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',borderTop:'1px solid var(--h14-line)'}}>{[
      ['REGULATE','Regulates network connections.'],['SPLIT','Breaks data into packets before the internet/network layer.'],['SEQUENCE + ERRORS','Ensures packets arrive in sequence and without errors.'],['ACK + RETRANSMIT','Swaps acknowledgements and retransmits lost/corrupted packets.'],
    ].map(([title,text],i)=><section key={title} style={{...emphasis(reveal,Math.min(i+1,4)),padding:'12px 14px',borderRight:i<3?'1px solid var(--h14-line)':'0'}}><b style={{color:'var(--h14-cyan)',font:'800 10px var(--font-mono)'}}>{title}</b><p style={{margin:'7px 0 0',fontSize:11.5,lineHeight:1.4,color:'var(--h14-muted)'}}>{text}</p></section>)}</div>
    <footer style={{padding:'9px 12px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:11.5,color:'var(--h14-muted)'}}>Transport protocols named by the source: <b style={{color:'var(--h14-ink)'}}>TCP · UDP · SCTP</b>. This chapter then considers TCP in detail.</footer>
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
    <section style={{display:'grid',gridTemplateRows:'75px 1fr',justifyItems:'center'}}><strong style={{alignSelf:'center',fontSize:24}}>HOST X</strong><i style={{width:2,background:'linear-gradient(var(--h14-cyan),rgba(82,224,210,.12))'}}/></section>
    <main style={{display:'grid',alignContent:'center',gap:16}}>{steps.map(([n,direction,text],i)=><section key={n} style={{...emphasis(reveal,i+1),display:'grid',gridTemplateColumns:'46px 145px 1fr',gap:12,alignItems:'center',minHeight:68,padding:'9px 13px',borderBlock:'1px solid var(--h14-line)',background:i===3?'rgba(82,224,210,.05)':'rgba(84,166,255,.04)'}}><b style={{display:'grid',placeItems:'center',width:38,height:38,borderRadius:'50%',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',font:'900 11px var(--font-mono)'}}>{n}</b><strong style={{color:i===3?'var(--h14-cyan)':'var(--h14-ink)',font:'900 12px var(--font-mono)'}}>{direction}</strong><p style={{margin:0,fontSize:12,lineHeight:1.35,color:'var(--h14-muted)'}}>{text}</p></section>)}</main>
    <section style={{display:'grid',gridTemplateRows:'75px 1fr',justifyItems:'center'}}><strong style={{alignSelf:'center',fontSize:24}}>HOST Y</strong><i style={{width:2,background:'linear-gradient(var(--h14-cyan),rgba(82,224,210,.12))'}}/></section>
    <footer style={{gridColumn:'1 / -1',padding:'10px 14px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:12,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>TCP is connection-oriented and host-to-host:</b> it establishes an end-to-end connection between the two hosts using handshakes before data transmission.</footer>
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
    {cards.map(([title,flow,keywords,text],i)=><section key={title} style={{...emphasis(reveal,i+1),minHeight:300,padding:'22px 20px',display:'grid',gridTemplateRows:'auto 90px auto 1fr',gap:14,borderTop:`4px solid ${i===1?'var(--h14-amber)':'var(--h14-cyan)'}`,borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(180deg,rgba(84,166,255,.08),rgba(8,21,36,.18))'}}><header><b style={{color:i===1?'var(--h14-amber)':'var(--h14-cyan)',font:'900 12px var(--font-mono)'}}>{title}</b></header><div style={{display:'grid',placeItems:'center',padding:12,border:'1px solid var(--h14-line)',background:'rgba(8,21,36,.55)',font:'900 13px var(--font-mono)',textAlign:'center'}}>{flow}</div><small style={{color:'var(--h14-amber)',font:'800 10px var(--font-mono)',textTransform:'uppercase'}}>{keywords}</small><p style={{margin:0,fontSize:12.5,lineHeight:1.5,color:'var(--h14-muted)'}}>{text}</p></section>)}
    <footer style={{gridColumn:'1 / -1',padding:'10px 14px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:11.5,color:'var(--h14-muted)'}}>Coursebook note: POP3/4 and IMAP have largely been superseded by increasing HTTP use, while <b style={{color:'var(--h14-ink)'}}>SMTP is still used between email servers</b>.</footer>
  </div>;
}
