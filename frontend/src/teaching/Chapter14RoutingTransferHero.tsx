import { revealStyle } from './Chapter14VisualPrimitives';

/** Hodder p.343, Example 14.2. The complete web-page packet-switching journey. */
export function Chapter14WebPageTransferHero({reveal}:{reveal:number}){
  const steps=[
    ['1','SPLIT','Divide the web page into data packets.'],
    ['2','ADDRESS','Put the destination IP address in every packet header.'],
    ['3','LOOK UP','At a router, compare the header with the routing table.'],
    ['4','NEXT HOP','Determine which router the packet must be sent to next.'],
    ['5','MAC','Add the next router MAC address to the packet header.'],
    ['6','HOP CHECK','Check whether the hop value has reached zero.'],
    ['7','ROUTE','Different packets may travel by different routes.'],
    ['8','REASSEMBLE','Destination computer rebuilds the final web page.'],
  ] as const;
  const current=Math.max(1,reveal);
  const [n,title,text]=steps[current-1];
  return <div className="h14m-content-v2" aria-label="Example 14.2 web page transfer using packet switching" style={{display:'grid',gap:16,minHeight:420,alignContent:'center'}}>
    <div style={{display:'grid',gridTemplateColumns:'155px 1fr 215px 1fr 170px',gap:12,alignItems:'center'}}>
      <section style={{...revealStyle(reveal,1),minHeight:190,padding:18,border:'1px solid var(--h14-blue)',background:'rgba(84,166,255,.06)',display:'grid',placeItems:'center',textAlign:'center',gap:10}}><b style={{color:'var(--h14-cyan)',font:'900 13px var(--font-mono)'}}>WEB SERVER</b><div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>{['P1','P2','P3','P4'].map(p=><span key={p} style={{padding:'10px 12px',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',font:'900 13px var(--font-mono)'}}>{p}</span>)}</div><small style={{color:'var(--h14-muted)',fontSize:13}}>page split into packets</small></section>
      <div style={{...revealStyle(reveal,2),display:'grid',gap:7}}>{['P1 · destination IP','P2 · destination IP','P3 · destination IP','P4 · destination IP'].map(p=><span key={p} style={{padding:'9px 10px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',font:'800 12px var(--font-mono)',color:'var(--h14-muted)'}}>{p}</span>)}</div>
      <section style={{...revealStyle(reveal,3),minHeight:230,padding:18,border:'2px solid var(--h14-cyan)',borderRadius:16,background:'rgba(82,224,210,.05)',display:'grid',alignContent:'center',gap:12,textAlign:'center'}}><strong style={{fontSize:29}}>ROUTER</strong><b style={{color:'var(--h14-amber)',font:'900 12px var(--font-mono)'}}>HEADER ⇄ ROUTING TABLE</b><span style={{fontSize:14,color:'var(--h14-muted)',lineHeight:1.5}}>choose next hop<br/>add next-router MAC<br/>check hop value</span></section>
      <div style={{...revealStyle(reveal,7),display:'grid',gap:8,font:'800 12px var(--font-mono)'}}><span style={{padding:'9px 10px',borderTop:'2px solid var(--h14-blue)',color:'var(--h14-blue)'}}>P1 ─ route A ─→</span><span style={{padding:'9px 10px',borderTop:'2px solid var(--h14-cyan)',color:'var(--h14-cyan)'}}>P2 ─ route B ─→</span><span style={{padding:'9px 10px',borderTop:'2px solid var(--h14-red)',color:'var(--h14-red)'}}>P3 ─ route C ─→</span><span style={{padding:'9px 10px',borderTop:'2px solid var(--h14-amber)',color:'var(--h14-amber)'}}>P4 ─ route D ─→</span></div>
      <section style={{...revealStyle(reveal,8),minHeight:190,padding:18,border:'1px solid var(--h14-cyan)',background:'rgba(82,224,210,.05)',display:'grid',placeItems:'center',textAlign:'center',gap:10}}><b style={{color:'var(--h14-cyan)',font:'900 13px var(--font-mono)'}}>DESTINATION</b><div style={{padding:'14px 18px',border:'1px solid var(--h14-line)',background:'rgba(8,21,36,.55)',fontSize:15}}>FINAL WEB PAGE</div><small style={{color:'var(--h14-muted)',fontSize:13}}>reassemble packets</small></section>
    </div>
    <section style={{padding:'13px 16px',display:'grid',gridTemplateColumns:'56px 150px 1fr',gap:14,alignItems:'center',borderTop:'2px solid var(--h14-cyan)',background:'rgba(84,166,255,.04)'}}><b style={{display:'grid',placeItems:'center',width:44,height:44,borderRadius:'50%',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',font:'900 13px var(--font-mono)'}}>{n}</b><strong style={{color:'var(--h14-cyan)',font:'900 14px var(--font-mono)'}}>{title}</strong><p style={{margin:0,fontSize:16,lineHeight:1.42,color:'var(--h14-muted)'}}>{text}</p></section>
  </div>;
}

/** Hodder pp.341–343 + Activity 14A 4(b). A concise exam-answer chain. */
export function Chapter14RoutingExamBuilder({reveal}:{reveal:number}){
  const answer=[
    ['READ','destination IP / routing information from the packet header'],
    ['COMPARE','that destination/network information with entries in the routing table'],
    ['SELECT','the best/shortest available next hop using route information such as hops/metrics'],
    ['UPDATE','the packet with the next-router MAC address and choose the interface'],
    ['FORWARD','the packet to that router; repeat the process at later routers'],
    ['STOP / ARRIVE','delete if no route or hop = 0; otherwise continue until the destination'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="Cambridge style routing answer builder" style={{display:'grid',gridTemplateColumns:'1.05fr 2fr',gap:22,minHeight:420,alignItems:'center'}}>
    <aside style={{padding:'24px 22px',borderLeft:'4px solid var(--h14-amber)',background:'linear-gradient(90deg,rgba(255,200,87,.07),rgba(8,21,36,.15))',display:'grid',gap:14}}><b style={{color:'var(--h14-amber)',font:'900 13px var(--font-mono)'}}>CAMBRIDGE-STYLE PROMPT</b><strong style={{fontSize:27,lineHeight:1.25}}>Describe how a packet header and routing table are used to route a packet.</strong><p style={{margin:0,fontSize:15,lineHeight:1.5,color:'var(--h14-muted)'}}>Build the answer as a decision loop. Every sentence should explain what the router reads, compares, changes or does next.</p><div style={{padding:'11px 12px',borderTop:'1px solid var(--h14-line)',color:'var(--h14-cyan)',font:'800 12px var(--font-mono)'}}>HEADER → TABLE → NEXT HOP → MAC → FORWARD</div></aside>
    <main style={{display:'grid',gap:8}}>{answer.map(([verb,text],i)=><section key={verb} style={{...revealStyle(reveal,i+1),display:'grid',gridTemplateColumns:'46px 122px 1fr',gap:12,alignItems:'center',padding:'10px 13px',borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(90deg,rgba(84,166,255,.06),transparent)'}}><b style={{display:'grid',placeItems:'center',width:38,height:38,border:'1px solid var(--h14-cyan)',borderRadius:'50%',color:'var(--h14-cyan)',font:'900 11px var(--font-mono)'}}>{i+1}</b><strong style={{color:i===5?'var(--h14-amber)':'var(--h14-cyan)',font:'900 12px var(--font-mono)'}}>{verb}</strong><p style={{margin:0,fontSize:14.5,lineHeight:1.4,color:'var(--h14-muted)'}}>{text}</p></section>)}</main>
    <footer style={{gridColumn:'1 / -1',display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderTop:'1px solid var(--h14-line)'}}><span style={{padding:'10px 12px',fontSize:13.5,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Sequence number:</b> restore packet order.</span><span style={{padding:'10px 12px',fontSize:13.5,color:'var(--h14-muted)',borderInline:'1px solid var(--h14-line)'}}><b style={{color:'var(--h14-ink)'}}>Hop number:</b> stop indefinite circulation.</span><span style={{padding:'10px 12px',fontSize:13.5,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Checksum:</b> detect transmission error.</span></footer>
  </div>;
}
