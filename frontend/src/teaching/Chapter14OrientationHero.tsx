import { chapter14Mono as mono } from './Chapter14VisualPrimitives';

/**
 * Orientation screen inspired by the benchmark deck's road-map slide while keeping
 * the source objectives visible. This is navigation/pedagogy, not extra syllabus content.
 */
export function Chapter14OrientationHero(){
  const outcomes=[
    'Explain why agreed protocols are required and describe the four TCP/IP layers.',
    'Apply HTTP, FTP, email, Ethernet and BitTorrent terminology to communication scenarios.',
    'Explain circuit switching, packet switching, routers, packet headers and routing tables.',
  ];
  const roadmap=[
    ['A','PROTOCOLS','agreed communication rules'],
    ['B','TCP/IP','four layers + encapsulation'],
    ['C','APPLICATION','HTTP · FTP · email · DNS'],
    ['D','BITTORRENT','tracker · peers · pieces · seed'],
    ['E','SWITCHING','circuit vs packet'],
    ['F','ROUTERS','headers · tables · next hop'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="Chapter 14 learning outcomes and road map" style={{display:'grid',gridTemplateColumns:'1fr 1.55fr',gap:28,minHeight:420,alignItems:'center'}}>
    <section style={{display:'grid',gap:14,padding:'22px 22px',borderTop:'4px solid var(--h14-cyan)',borderBottom:'1px solid var(--h14-line)',background:'rgba(82,224,210,.035)'}}>
      <header><b style={{...mono,color:'var(--h14-cyan)',fontSize:14}}>CHAPTER 14 · LEARNING OUTCOMES</b><strong style={{display:'block',marginTop:6,fontSize:30}}>By the end, you should be able to…</strong></header>
      <div style={{display:'grid',gap:11}}>{outcomes.map((text,i)=><div key={text} style={{display:'grid',gridTemplateColumns:'46px 1fr',gap:13,alignItems:'start',padding:'11px 0',borderBottom:'1px solid var(--h14-line)'}}><b style={{display:'grid',placeItems:'center',width:38,height:38,borderRadius:'50%',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',...mono,fontSize:12}}>{i+1}</b><p style={{margin:0,fontSize:16,lineHeight:1.45,color:'var(--h14-muted)'}}>{text}</p></div>)}</div>
    </section>
    <section style={{display:'grid',gap:12}}>
      <header style={{paddingBottom:10,borderBottom:'2px solid var(--h14-cyan)'}}><b style={{...mono,color:'var(--h14-amber)',fontSize:14}}>ROAD MAP</b><strong style={{display:'block',marginTop:5,fontSize:30}}>ONE COMMUNICATION STORY</strong></header>
      <main style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{roadmap.map(([letter,title,note],i)=><section key={letter} style={{minHeight:104,padding:'13px 14px',display:'grid',gridTemplateColumns:'48px 1fr',gap:13,alignItems:'center',borderLeft:`4px solid ${i<3?'var(--h14-cyan)':'var(--h14-blue)'}`,borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(90deg,rgba(84,166,255,.055),transparent)'}}><b style={{display:'grid',placeItems:'center',width:42,height:42,border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',...mono,fontSize:14}}>{letter}</b><div><strong style={{display:'block',fontSize:17}}>{title}</strong><small style={{display:'block',marginTop:5,fontSize:14,color:'var(--h14-muted)'}}>{note}</small></div></section>)}</main>
      <footer style={{padding:'11px 14px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:14,color:'var(--h14-muted)'}}>Keep asking the same question: <b style={{color:'var(--h14-ink)'}}>what information is added, who reads it, and what happens next?</b></footer>
    </section>
  </div>;
}
