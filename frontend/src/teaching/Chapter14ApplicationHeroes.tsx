const emphasis=(reveal:number,step:number)=>({opacity:reveal>=step?1:.32,transition:'opacity .2s ease'});
const mono={fontFamily:'var(--font-mono)'} as const;

/** Hodder p.330, Table 14.1. Application layer purpose plus every protocol named by the source. */
export function Chapter14ApplicationProtocolHero({reveal}:{reveal:number}){
  const protocols=[
    ['HTTP','web-page files/resources','WEB'],
    ['SMTP','sending email','EMAIL'],
    ['POP3/4','receiving email','EMAIL'],
    ['IMAP','receiving email + synchronisation','EMAIL'],
    ['DNS','find the IP address','LOOKUP'],
    ['FTP','file/message transfer','TRANSFER'],
    ['RIP','routers exchange routing information over an IP network','ROUTING'],
    ['SNMP','exchange network-management information','MANAGE'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="Application layer purpose and source protocol table" style={{display:'grid',gridTemplateColumns:'265px 1fr',gap:22,minHeight:430,alignItems:'center'}}>
    <section style={{...emphasis(reveal,1),minHeight:350,padding:'22px 20px',display:'grid',gridTemplateRows:'auto auto 1fr auto',gap:14,borderTop:'4px solid var(--h14-cyan)',borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(180deg,rgba(82,224,210,.08),rgba(8,21,36,.2))'}}>
      <b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>4 · APPLICATION LAYER</b>
      <strong style={{fontSize:25,lineHeight:1.1}}>Which service does the application need?</strong>
      <div style={{display:'grid',alignContent:'start',gap:9}}>{[
        'contains programs that exchange data, such as browsers or server software',
        'allows applications to access services used in the lower layers',
        'defines the protocols applications use to exchange data',
        'sends files/data to the Transport layer',
      ].map((text,i)=><div key={text} style={{...emphasis(reveal,Math.min(i+1,4)),display:'grid',gridTemplateColumns:'24px 1fr',gap:9,alignItems:'start'}}><span style={{color:'var(--h14-cyan)',...mono,fontSize:10}}>0{i+1}</span><p style={{margin:0,fontSize:11.7,lineHeight:1.42,color:'var(--h14-muted)'}}>{text}</p></div>)}</div>
      <footer style={{padding:'9px 11px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:11,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Exam rule:</b> name the protocol <em>and</em> state its exact job/context.</footer>
    </section>
    <section style={{display:'grid',gap:10}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',paddingBottom:9,borderBottom:'2px solid var(--h14-cyan)'}}><div><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>HODDER p.330 · TABLE 14.1</b><strong style={{display:'block',marginTop:4,fontSize:21}}>APPLICATION-LAYER PROTOCOLS</strong></div><small style={{color:'var(--h14-muted)'}}>task → correct protocol</small></header>
      <main style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>{protocols.map(([name,job,tag],i)=><section key={name} style={{...emphasis(reveal,Math.ceil((i+1)/2)),minHeight:75,padding:'10px 12px',display:'grid',gridTemplateColumns:'88px 1fr',gap:10,alignItems:'center',borderLeft:'3px solid var(--h14-blue)',borderBottom:'1px solid var(--h14-line)',background:'rgba(84,166,255,.035)'}}><div><strong style={{display:'block',color:'var(--h14-cyan)',...mono,fontSize:13}}>{name}</strong><small style={{color:'var(--h14-amber)',...mono,fontSize:8.5}}>{tag}</small></div><p style={{margin:0,fontSize:11.3,lineHeight:1.35,color:'var(--h14-muted)'}}>{job}</p></section>)}</main>
    </section>
  </div>;
}

/** Hodder p.332. FTP session, server, anonymous access and source-listed commands. */
export function Chapter14FtpHero({reveal}:{reveal:number}){
  const commands=[['delete','remove a remote file'],['close','close the connection/session'],['rename','rename a stored file'],['cd','change directory on remote machine'],['lcd','change directory on local machine']] as const;
  return <div className="h14m-content-v2" aria-label="FTP client server session anonymous access and commands" style={{display:'grid',gridTemplateColumns:'1fr 330px',gap:22,minHeight:430,alignItems:'center'}}>
    <section style={{display:'grid',gap:14}}>
      <header style={{paddingBottom:10,borderBottom:'2px solid var(--h14-cyan)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>FTP · FILE TRANSFER PROTOCOL</b><strong style={{display:'block',marginTop:5,fontSize:24}}>CLIENT ⇄ FTP SERVER</strong></header>
      <div style={{display:'grid',gridTemplateColumns:'1fr 100px 1fr',gap:12,alignItems:'center'}}>
        <section style={{...emphasis(reveal,1),minHeight:170,padding:'18px 16px',display:'grid',placeItems:'center',textAlign:'center',border:'1px solid var(--h14-blue)',background:'rgba(84,166,255,.05)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>CLIENT COMPUTER</b><strong style={{fontSize:19}}>ftp host_name</strong><small style={{color:'var(--h14-muted)'}}>then user ID + password</small></section>
        <div style={{...emphasis(reveal,2),display:'grid',placeItems:'center',gap:8,textAlign:'center'}}><span style={{fontSize:42,color:'var(--h14-cyan)'}}>⇄</span><b style={{...mono,color:'var(--h14-amber)',fontSize:9}}>UPLOAD / DOWNLOAD</b></div>
        <section style={{...emphasis(reveal,2),minHeight:170,padding:'18px 16px',display:'grid',placeItems:'center',textAlign:'center',border:'1px solid var(--h14-cyan)',background:'rgba(82,224,210,.045)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>FTP SERVER</b><strong style={{fontSize:19}}>STORED FILES</strong><small style={{color:'var(--h14-muted)'}}>files can be downloaded as required</small></section>
      </div>
      <div style={{...emphasis(reveal,3),display:'grid',gridTemplateColumns:'170px 1fr',gap:12,alignItems:'center',padding:'11px 13px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)'}}><b style={{...mono,color:'var(--h14-amber)',fontSize:11}}>ANONYMOUS FTP</b><p style={{margin:0,fontSize:11.5,lineHeight:1.4,color:'var(--h14-muted)'}}>Access files without identifying who the user is to the FTP server. Source example: <b style={{color:'var(--h14-ink)'}}>331 Anonymous access allowed</b>.</p></div>
    </section>
    <aside style={{...emphasis(reveal,4),padding:'18px 17px',borderTop:'4px solid var(--h14-blue)',borderBottom:'1px solid var(--h14-line)',background:'rgba(84,166,255,.04)'}}>
      <header><b style={{...mono,color:'var(--h14-cyan)',fontSize:11}}>FTP COMMANDS</b><p style={{margin:'6px 0 13px',fontSize:11,color:'var(--h14-muted)'}}>Commands can change files/directories stored on the FTP server.</p></header>
      <div style={{display:'grid',gap:7}}>{commands.map(([command,text])=><div key={command} style={{display:'grid',gridTemplateColumns:'60px 1fr',gap:10,padding:'8px 0',borderBottom:'1px solid var(--h14-line)'}}><code style={{color:'var(--h14-amber)',fontWeight:900}}>{command}</code><span style={{fontSize:10.8,color:'var(--h14-muted)'}}>{text}</span></div>)}</div>
    </aside>
  </div>;
}

/** Hodder p.333, Table 14.2. Synchronisation is the decisive POP3/4 vs IMAP difference. */
export function Chapter14PopImapHero({reveal}:{reveal:number}){
  return <div className="h14m-content-v2" aria-label="POP3 4 versus IMAP synchronisation comparison" style={{display:'grid',gridTemplateColumns:'1fr 84px 1fr',gap:18,minHeight:430,alignItems:'center'}}>
    <section style={{...emphasis(reveal,1),minHeight:340,padding:'20px 20px',display:'grid',gridTemplateRows:'auto 95px auto 1fr',gap:13,borderTop:'4px solid var(--h14-amber)',borderBottom:'1px solid var(--h14-line)',background:'rgba(255,200,87,.035)'}}>
      <header><b style={{...mono,color:'var(--h14-amber)',fontSize:12}}>POP3/4</b><strong style={{display:'block',marginTop:4,fontSize:22}}>DOWNLOAD → DELETE SERVER COPY</strong></header>
      <div style={{display:'grid',gridTemplateColumns:'1fr 60px 1fr',gap:8,alignItems:'center',textAlign:'center'}}><span style={{padding:12,border:'1px solid var(--h14-line)'}}>MAIL SERVER</span><b style={{fontSize:30,color:'var(--h14-amber)'}}>→</b><span style={{padding:12,border:'1px solid var(--h14-amber)'}}>CLIENT</span></div>
      <div style={{...emphasis(reveal,2),padding:'9px 10px',textAlign:'center',border:'1px solid var(--h14-red)',color:'var(--h14-red)',...mono,fontSize:10}}>NOT KEPT IN SYNCHRONISATION</div>
      <p style={{margin:0,fontSize:12,lineHeight:1.48,color:'var(--h14-muted)'}}>When emails are downloaded by the client, the coursebook model says they are then deleted from the server, so the server is not further updated.</p>
    </section>
    <strong style={{display:'grid',placeItems:'center',color:'var(--h14-cyan)',...mono,fontSize:12}}>VS</strong>
    <section style={{...emphasis(reveal,2),minHeight:340,padding:'20px 20px',display:'grid',gridTemplateRows:'auto 95px auto 1fr',gap:13,borderTop:'4px solid var(--h14-cyan)',borderBottom:'1px solid var(--h14-line)',background:'rgba(82,224,210,.035)'}}>
      <header><b style={{...mono,color:'var(--h14-cyan)',fontSize:12}}>IMAP</b><strong style={{display:'block',marginTop:4,fontSize:22}}>COPY ⇄ SYNCHRONISE</strong></header>
      <div style={{display:'grid',gridTemplateColumns:'1fr 60px 1fr',gap:8,alignItems:'center',textAlign:'center'}}><span style={{padding:12,border:'1px solid var(--h14-cyan)'}}>MAIL SERVER</span><b style={{fontSize:30,color:'var(--h14-cyan)'}}>⇄</b><span style={{padding:12,border:'1px solid var(--h14-cyan)'}}>CLIENT</span></div>
      <div style={{...emphasis(reveal,3),padding:'9px 10px',textAlign:'center',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',...mono,fontSize:10}}>SERVER + CLIENT STAY SYNCHRONISED</div>
      <p style={{margin:0,fontSize:12,lineHeight:1.48,color:'var(--h14-muted)'}}>Only a copy is downloaded. The original remains on the server until the client manually deletes it.</p>
    </section>
    <footer style={{gridColumn:'1 / -1',...emphasis(reveal,4),padding:'10px 13px',borderLeft:'3px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:11.5,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Both are pull protocols.</b> The source’s key comparison is <b style={{color:'var(--h14-ink)'}}>synchronisation</b>.</footer>
  </div>;
}
