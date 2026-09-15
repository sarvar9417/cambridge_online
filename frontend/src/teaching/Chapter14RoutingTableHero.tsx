import { chapter14Mono as mono, revealStyle } from './Chapter14VisualPrimitives';

/** Hodder pp.341–342. All routing-table fields plus the Figure 14.10 decision loop. */
export function Chapter14RoutingTableHero({reveal}:{reveal:number}){
  const fields=[
    ['NUMBER OF HOPS','distance / hop information used when selecting a route'],
    ['NEXT ROUTER MAC','MAC address of the next router to which the packet is forwarded'],
    ['METRICS / COST','cost assigned to routes so the most efficient route/path can be found'],
    ['NETWORK DESTINATION','network ID or pathway being matched'],
    ['GATEWAY','same next-hop idea: points to the gateway through which the target network is reached'],
    ['NETMASK','used to generate the network ID'],
    ['INTERFACE','locally available interface responsible for reaching the gateway'],
  ] as const;
  const decisions=[
    ['1','READ','Examine the packet header.'],
    ['2','COMPARE','Compare destination/network information with the routing table.'],
    ['3','CHOOSE','Determine the shortest/best available next router.'],
    ['4','UPDATE','Add the new next-router MAC address to the packet header.'],
    ['5','FORWARD','Send the packet to that router and repeat.'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="Routing table fields and router decision loop" style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:22,minHeight:430,alignItems:'center'}}>
    <section style={{display:'grid',gap:9}}>
      <header style={{paddingBottom:9,borderBottom:'2px solid var(--h14-cyan)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:13}}>HODDER pp.341–342 · ROUTING TABLE</b><strong style={{display:'block',marginTop:5,fontSize:28}}>WHAT THE ROUTER KNOWS</strong></header>
      <main style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>{fields.map(([field,text],i)=><section key={field} style={{...revealStyle(reveal,Math.ceil((i+1)/2)),minHeight:88,padding:'11px 12px',borderLeft:'3px solid var(--h14-cyan)',borderBottom:'1px solid var(--h14-line)',background:'rgba(84,166,255,.04)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:12.5}}>{field}</b><p style={{margin:'6px 0 0',fontSize:13.5,lineHeight:1.4,color:'var(--h14-muted)'}}>{text}</p></section>)}</main>
    </section>
    <section style={{display:'grid',gap:10}}>
      <header style={{paddingBottom:9,borderBottom:'2px solid var(--h14-amber)'}}><b style={{...mono,color:'var(--h14-amber)',fontSize:13}}>FIGURE 14.10 · DECISION LOOP</b><strong style={{display:'block',marginTop:5,fontSize:28}}>HEADER → TABLE → NEXT HOP</strong></header>
      <main style={{display:'grid',gap:7}}>{decisions.map(([n,verb,text],i)=><section key={n} style={{...revealStyle(reveal,i+1),display:'grid',gridTemplateColumns:'40px 98px 1fr',gap:10,alignItems:'center',padding:'9px 11px',borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(90deg,rgba(255,200,87,.04),transparent)'}}><b style={{display:'grid',placeItems:'center',width:34,height:34,borderRadius:'50%',border:'1px solid var(--h14-amber)',color:'var(--h14-amber)',...mono,fontSize:11}}>{n}</b><strong style={{...mono,color:'var(--h14-cyan)',fontSize:12}}>{verb}</strong><p style={{margin:0,fontSize:14,lineHeight:1.35,color:'var(--h14-muted)'}}>{text}</p></section>)}</main>
      <footer style={{...revealStyle(reveal,5),padding:'11px 13px',borderLeft:'4px solid var(--h14-red)',background:'rgba(255,100,100,.04)',fontSize:14,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>DELETE CONDITION:</b> if no route can be found or <b style={{color:'var(--h14-red)'}}>hop number = 0</b>, the router deletes the data package.</footer>
    </section>
  </div>;
}

/** Hodder p.342, Example 14.1. Each real-time symptom is tied to its packet-switching cause and circuit-switching remedy. */
export function Chapter14VideoConferenceHero({reveal}:{reveal:number}){
  const problems=[
    ['OUT OF SYNC','picture and sound may not be synchronised','packets can arrive at different times'],
    ['PAUSES / FREEZES','video may not be continuous','time is needed to reassemble packets'],
    ['DEGRADED QUALITY','sound/video quality may fall','traffic can compete for communication-line bandwidth'],
    ['DROP-OUT','parts of the call may disappear','different routes make packet loss possible'],
  ] as const;
  const improvements=[
    ['ONE ROUTE','all frames/packets follow the established circuit'],
    ['CORRECT ORDER','data arrives in the same sequence in which it was sent'],
    ['DEDICATED CHANNEL','the communication channel is reserved for this transmission'],
    ['FULL BANDWIDTH','the whole channel bandwidth is available to the call'],
    ['SYNCHRONISATION','predictable route/order helps sound and picture stay aligned'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="Example 14.1 video conferencing packet switching problems and circuit switching improvements" style={{display:'grid',gridTemplateColumns:'1.28fr .92fr',gap:22,minHeight:430,alignItems:'center'}}>
    <section style={{display:'grid',gap:9}}>
      <header style={{paddingBottom:10,borderBottom:'2px solid var(--h14-red)'}}><b style={{...mono,color:'var(--h14-red)',fontSize:13}}>PACKET SWITCHING · POOR REAL-TIME PERFORMANCE</b><strong style={{display:'block',marginTop:5,fontSize:27}}>SYMPTOM → NETWORK REASON</strong></header>
      <main style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:9}}>{problems.map(([title,symptom,reason],i)=><section key={title} style={{...revealStyle(reveal,i+1),minHeight:145,padding:'13px 14px',borderTop:'3px solid var(--h14-red)',borderBottom:'1px solid var(--h14-line)',background:'rgba(255,100,100,.035)'}}><b style={{...mono,color:'var(--h14-red)',fontSize:12.5}}>{title}</b><p style={{margin:'8px 0 0',fontSize:14.5,lineHeight:1.42,color:'var(--h14-ink)'}}>{symptom}</p><div style={{marginTop:8,paddingTop:7,borderTop:'1px solid var(--h14-line)',fontSize:13.5,lineHeight:1.38,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-amber)'}}>WHY:</b> {reason}</div></section>)}</main>
    </section>
    <section style={{display:'grid',gap:9}}>
      <header style={{paddingBottom:10,borderBottom:'2px solid var(--h14-cyan)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:13}}>WHY CIRCUIT SWITCHING CAN HELP</b><strong style={{display:'block',marginTop:5,fontSize:27}}>MORE PREDICTABLE DELIVERY</strong></header>
      <main style={{display:'grid',gap:7}}>{improvements.map(([title,text],i)=><section key={title} style={{...revealStyle(reveal,Math.min(i+1,5)),padding:'10px 12px',borderLeft:'3px solid var(--h14-cyan)',background:'rgba(82,224,210,.04)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:12}}>{title}</b><p style={{margin:'5px 0 0',fontSize:14,lineHeight:1.38,color:'var(--h14-muted)'}}>{text}</p></section>)}</main>
      <footer style={{...revealStyle(reveal,5),padding:'10px 13px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:14,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Exam link:</b> real-time communication benefits from predictable timing, order and dedicated bandwidth.</footer>
    </section>
  </div>;
}
