import { revealStyle } from './Chapter14VisualPrimitives';

const rows=[
  ['Route set up before transmission','YES','NO'],
  ['Dedicated transmission path','YES','NO'],
  ['Each packet uses the same route','YES','NO'],
  ['Packets arrive in the correct order','YES','NO'],
  ['All channel bandwidth is required','YES','NO'],
  ['Bandwidth is wasted','YES','NO'],
] as const;

/** Hodder p.340, Table 14.5. Visual contrast above, exact six source rows below. */
export function Chapter14SwitchingCompareHero({reveal}:{reveal:number}){
  return <div className="h14m-content-v2" aria-label="Circuit switching versus packet switching source comparison" style={{display:'grid',gridTemplateRows:'225px auto',gap:13,minHeight:420,alignContent:'center'}}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 74px 1fr',gap:14,alignItems:'stretch'}}>
      <section style={{display:'grid',gridTemplateColumns:'150px 1fr',gap:18,alignItems:'center',padding:'18px 22px',borderBlock:'1px solid var(--h14-line)',background:'linear-gradient(90deg,rgba(255,200,87,.07),transparent)'}}>
        <div style={{display:'grid',placeItems:'center',gap:10}}><b style={{color:'var(--h14-amber)',font:'900 14px var(--font-mono)'}}>CIRCUIT</b><div style={{fontSize:22,color:'var(--h14-amber)',fontFamily:'var(--font-mono)',whiteSpace:'nowrap'}}>A ═══════ B</div><small style={{color:'var(--h14-muted)',textAlign:'center',fontSize:13}}>one established route</small></div>
        <div style={{display:'grid',gap:9}}>{['Dedicated circuit before data','All frames follow the same route','Bandwidth reserved for this communication','Arrival order is preserved'].map((text,i)=><p key={text} style={{...revealStyle(reveal,Math.min(i+1,4)),margin:0,padding:'9px 0',borderBottom:'1px solid var(--h14-line)',fontSize:14.5,color:'var(--h14-muted)'}}>{text}</p>)}</div>
      </section>
      <strong style={{display:'grid',placeItems:'center',color:'var(--h14-cyan)',font:'900 15px var(--font-mono)'}}>VS</strong>
      <section style={{display:'grid',gridTemplateColumns:'150px 1fr',gap:18,alignItems:'center',padding:'18px 22px',borderBlock:'1px solid var(--h14-line)',background:'linear-gradient(270deg,rgba(84,166,255,.07),transparent)'}}>
        <div style={{display:'grid',placeItems:'center',gap:8}}><b style={{color:'var(--h14-blue)',font:'900 14px var(--font-mono)'}}>PACKET</b><svg width="140" height="82" viewBox="0 0 140 82" role="img" aria-label="multiple packet routes"><circle cx="12" cy="41" r="9" fill="#0c1b2e" stroke="var(--h14-blue)"/><circle cx="128" cy="41" r="9" fill="#0c1b2e" stroke="var(--h14-blue)"/><circle cx="54" cy="16" r="7" fill="#0c1b2e" stroke="var(--h14-line)"/><circle cx="82" cy="41" r="7" fill="#0c1b2e" stroke="var(--h14-line)"/><circle cx="54" cy="67" r="7" fill="#0c1b2e" stroke="var(--h14-line)"/><path d="M21 37 L47 19 L75 37 L119 39" fill="none" stroke="var(--h14-blue)" strokeWidth="3"/><path d="M21 45 L48 64 L76 45 L119 43" fill="none" stroke="var(--h14-cyan)" strokeWidth="3"/><path d="M21 41 L75 41 L119 41" fill="none" stroke="var(--h14-red)" strokeWidth="2.5"/></svg><small style={{color:'var(--h14-muted)',textAlign:'center',fontSize:13}}>independent routes</small></div>
        <div style={{display:'grid',gap:9}}>{['No dedicated route setup first','Packets can follow different routes','Bandwidth is shared','Arrival order is not guaranteed'].map((text,i)=><p key={text} style={{...revealStyle(reveal,Math.min(i+1,4)),margin:0,padding:'9px 0',borderBottom:'1px solid var(--h14-line)',fontSize:14.5,color:'var(--h14-muted)'}}>{text}</p>)}</div>
      </section>
    </div>
    <div style={{display:'grid',gap:0,borderTop:'2px solid var(--h14-cyan)'}}>
      <header style={{display:'grid',gridTemplateColumns:'1.7fr .65fr .65fr',padding:'9px 14px',color:'var(--h14-muted)',font:'800 12px var(--font-mono)'}}><span>TABLE 14.5 · FEATURE</span><b style={{textAlign:'center'}}>CIRCUIT</b><b style={{textAlign:'center'}}>PACKET</b></header>
      {rows.map(([feature,circuit,packet],i)=><section key={feature} style={{...revealStyle(reveal,i+1),display:'grid',gridTemplateColumns:'1.7fr .65fr .65fr',padding:'9px 14px',borderTop:'1px solid var(--h14-line)',alignItems:'center'}}><span style={{fontSize:14.5}}>{feature}</span><b style={{textAlign:'center',color:'var(--h14-amber)',font:'900 13px var(--font-mono)'}}>{circuit}</b><b style={{textAlign:'center',color:'var(--h14-muted)',font:'900 13px var(--font-mono)'}}>{packet}</b></section>)}
    </div>
  </div>;
}
