import { chapter14Mono as mono, revealStyle } from './Chapter14VisualPrimitives';

/** Hodder p.330, Table 14.1. Purpose first, then the protocol map so one projector screen carries one teaching idea at a time. */
export function Chapter14ApplicationProtocolHero({reveal}:{reveal:number}){
  const protocols=[
    ['HTTP','web-page files/resources','WEB'],
    ['SMTP','sending email','EMAIL'],
    ['POP3/4','receiving email','EMAIL'],
    ['IMAP','receiving email + synchronisation','EMAIL'],
    ['DNS','find the IP address','LOOKUP'],
    ['FTP','file transfer','TRANSFER'],
    ['RIP','routers exchange routing information over an IP network','ROUTING'],
    ['SNMP','exchange network-management information','MANAGE'],
  ] as const;

  if(reveal===0){
    const purposes=[
      'Contains programs that exchange data, such as browsers or server software.',
      'Allows applications to access services used in the lower TCP/IP layers.',
      'Defines the protocols applications use to exchange data.',
      'Passes files/data down to the Transport layer.',
    ];
    return <div className="h14m-content-v2" aria-label="Application layer purpose" style={{display:'grid',gridTemplateColumns:'320px 1fr',gap:30,minHeight:420,alignItems:'center'}}>
      <section style={{minHeight:320,padding:'30px 26px',display:'grid',placeItems:'center',textAlign:'center',borderTop:'5px solid var(--h14-cyan)',borderBottom:'1px solid var(--h14-line)',background:'linear-gradient(180deg,rgba(82,224,210,.09),rgba(8,21,36,.2))'}}>
        <div><b style={{...mono,color:'var(--h14-cyan)',fontSize:15}}>4 · APPLICATION LAYER</b><strong style={{display:'block',marginTop:16,fontSize:34,lineHeight:1.08}}>Which service does the application need?</strong></div>
      </section>
      <main style={{display:'grid',gap:12}}>{purposes.map((text,i)=><section key={text} style={{display:'grid',gridTemplateColumns:'52px 1fr',gap:16,alignItems:'center',padding:'14px 16px',borderBottom:'1px solid var(--h14-line)',background:'rgba(84,166,255,.035)'}}><b style={{display:'grid',placeItems:'center',width:44,height:44,border:'1px solid var(--h14-cyan)',borderRadius:'50%',color:'var(--h14-cyan)',...mono,fontSize:13}}>{i+1}</b><p style={{margin:0,fontSize:17,lineHeight:1.42,color:'var(--h14-muted)'}}>{text}</p></section>)}</main>
      <footer style={{gridColumn:'1 / -1',padding:'12px 15px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:15,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Teaching sequence:</b> understand the layer first; then reveal the protocols that provide its services.</footer>
    </div>;
  }

  return <div className="h14m-content-v2" aria-label="Application layer source protocol table" style={{display:'grid',gap:14,minHeight:420,alignContent:'center'}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',paddingBottom:12,borderBottom:'2px solid var(--h14-cyan)'}}><div><b style={{...mono,color:'var(--h14-cyan)',fontSize:14}}>HODDER p.330 · TABLE 14.1</b><strong style={{display:'block',marginTop:5,fontSize:30}}>APPLICATION-LAYER PROTOCOLS</strong></div><span style={{padding:'8px 11px',border:'1px solid var(--h14-line)',color:'var(--h14-muted)',fontSize:14}}>task → correct protocol</span></header>
    <main style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:11}}>{protocols.map(([name,job,tag],i)=><section key={name} style={{...revealStyle(reveal,Math.ceil((i+1)/2)),minHeight:84,padding:'13px 15px',display:'grid',gridTemplateColumns:'108px 1fr',gap:14,alignItems:'center',borderLeft:'4px solid var(--h14-blue)',borderBottom:'1px solid var(--h14-line)',background:'rgba(84,166,255,.035)'}}><div><strong style={{display:'block',color:'var(--h14-cyan)',...mono,fontSize:16}}>{name}</strong><small style={{color:'var(--h14-amber)',...mono,fontSize:12}}>{tag}</small></div><p style={{margin:0,fontSize:15.5,lineHeight:1.38,color:'var(--h14-muted)'}}>{job}</p></section>)}</main>
    <footer style={{padding:'11px 14px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:14.5,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Exam rule:</b> name the protocol and state its exact job/context.</footer>
  </div>;
}

/** Hodder p.332. FTP session, server, anonymous access and source-listed commands. */
export function Chapter14FtpHero({reveal}:{reveal:number}){
  const commands=[['delete','remove a remote file'],['close','close the connection/session'],['rename','rename a stored file'],['cd','change directory on remote machine'],['lcd','change directory on local machine']] as const;
  return <div className="h14m-content-v2" aria-label="FTP client server session anonymous access and commands" style={{display:'grid',gridTemplateColumns:'1fr 350px',gap:24,minHeight:420,alignItems:'center'}}>
    <section style={{display:'grid',gap:15}}>
      <header style={{paddingBottom:11,borderBottom:'2px solid var(--h14-cyan)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:14}}>FTP · FILE TRANSFER PROTOCOL</b><strong style={{display:'block',marginTop:5,fontSize:30}}>CLIENT ⇄ FTP SERVER</strong></header>
      <div style={{display:'grid',gridTemplateColumns:'1fr 110px 1fr',gap:14,alignItems:'center'}}>
        <section style={{...revealStyle(reveal,1),minHeight:170,padding:'18px 16px',display:'grid',placeItems:'center',textAlign:'center',border:'1px solid var(--h14-blue)',background:'rgba(84,166,255,.05)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:14}}>CLIENT COMPUTER</b><strong style={{fontSize:23}}>ftp host_name</strong><small style={{color:'var(--h14-muted)',fontSize:14}}>then user ID + password</small></section>
        <div style={{...revealStyle(reveal,2),display:'grid',placeItems:'center',gap:8,textAlign:'center'}}><span style={{fontSize:46,color:'var(--h14-cyan)'}}>⇄</span><b style={{...mono,color:'var(--h14-amber)',fontSize:12}}>UPLOAD / DOWNLOAD</b></div>
        <section style={{...revealStyle(reveal,2),minHeight:170,padding:'18px 16px',display:'grid',placeItems:'center',textAlign:'center',border:'1px solid var(--h14-cyan)',background:'rgba(82,224,210,.045)'}}><b style={{...mono,color:'var(--h14-cyan)',fontSize:14}}>FTP SERVER</b><strong style={{fontSize:23}}>STORED FILES</strong><small style={{color:'var(--h14-muted)',fontSize:14}}>files can be downloaded as required</small></section>
      </div>
      <div style={{...revealStyle(reveal,3),display:'grid',gridTemplateColumns:'190px 1fr',gap:14,alignItems:'center',padding:'12px 14px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)'}}><b style={{...mono,color:'var(--h14-amber)',fontSize:14}}>ANONYMOUS FTP</b><p style={{margin:0,fontSize:14.5,lineHeight:1.42,color:'var(--h14-muted)'}}>Access files without identifying who the user is to the FTP server. Source example: <b style={{color:'var(--h14-ink)'}}>331 Anonymous access allowed</b>.</p></div>
    </section>
    <aside style={{...revealStyle(reveal,4),padding:'18px 18px',borderTop:'4px solid var(--h14-blue)',borderBottom:'1px solid var(--h14-line)',background:'rgba(84,166,255,.04)'}}>
      <header><b style={{...mono,color:'var(--h14-cyan)',fontSize:14}}>FTP COMMANDS</b><p style={{margin:'7px 0 14px',fontSize:14,color:'var(--h14-muted)'}}>Commands can change files/directories stored on the FTP server.</p></header>
      <div style={{display:'grid',gap:8}}>{commands.map(([command,text])=><div key={command} style={{display:'grid',gridTemplateColumns:'72px 1fr',gap:10,padding:'8px 0',borderBottom:'1px solid var(--h14-line)'}}><code style={{color:'var(--h14-amber)',fontWeight:900,fontSize:14}}>{command}</code><span style={{fontSize:14,color:'var(--h14-muted)'}}>{text}</span></div>)}</div>
    </aside>
    <footer style={{gridColumn:'1 / -1',padding:'11px 14px',borderLeft:'4px solid var(--h14-cyan)',background:'rgba(82,224,210,.035)',fontSize:14,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Source clarification:</b> Table 14.1 uses broader wording, but the detailed FTP section defines FTP’s task as <b style={{color:'var(--h14-cyan)'}}>file transfer</b>. Use that wording in an exam answer.</footer>
  </div>;
}

/** Hodder p.333, Table 14.2. Synchronisation is the decisive POP3/4 vs IMAP difference. */
export function Chapter14PopImapHero({reveal}:{reveal:number}){
  return <div className="h14m-content-v2" aria-label="POP3 4 versus IMAP synchronisation comparison" style={{display:'grid',gridTemplateColumns:'1fr 84px 1fr',gap:18,minHeight:420,alignItems:'center'}}>
    <section style={{...revealStyle(reveal,1),minHeight:330,padding:'22px 22px',display:'grid',gridTemplateRows:'auto 95px auto 1fr',gap:13,borderTop:'4px solid var(--h14-amber)',borderBottom:'1px solid var(--h14-line)',background:'rgba(255,200,87,.035)'}}>
      <header><b style={{...mono,color:'var(--h14-amber)',fontSize:15}}>POP3/4</b><strong style={{display:'block',marginTop:4,fontSize:25}}>DOWNLOAD → DELETE SERVER COPY</strong></header>
      <div style={{display:'grid',gridTemplateColumns:'1fr 60px 1fr',gap:8,alignItems:'center',textAlign:'center'}}><span style={{padding:12,border:'1px solid var(--h14-line)',fontSize:14}}>MAIL SERVER</span><b style={{fontSize:30,color:'var(--h14-amber)'}}>→</b><span style={{padding:12,border:'1px solid var(--h14-amber)',fontSize:14}}>CLIENT</span></div>
      <div style={{...revealStyle(reveal,2),padding:'10px 10px',textAlign:'center',border:'1px solid var(--h14-red)',color:'var(--h14-red)',...mono,fontSize:13}}>NOT KEPT IN SYNCHRONISATION</div>
      <p style={{margin:0,fontSize:15,lineHeight:1.48,color:'var(--h14-muted)'}}>When emails are downloaded by the client, the coursebook model says they are then deleted from the server, so the server is not further updated.</p>
    </section>
    <strong style={{display:'grid',placeItems:'center',color:'var(--h14-cyan)',...mono,fontSize:14}}>VS</strong>
    <section style={{...revealStyle(reveal,2),minHeight:330,padding:'22px 22px',display:'grid',gridTemplateRows:'auto 95px auto 1fr',gap:13,borderTop:'4px solid var(--h14-cyan)',borderBottom:'1px solid var(--h14-line)',background:'rgba(82,224,210,.035)'}}>
      <header><b style={{...mono,color:'var(--h14-cyan)',fontSize:15}}>IMAP</b><strong style={{display:'block',marginTop:4,fontSize:25}}>COPY ⇄ SYNCHRONISE</strong></header>
      <div style={{display:'grid',gridTemplateColumns:'1fr 60px 1fr',gap:8,alignItems:'center',textAlign:'center'}}><span style={{padding:12,border:'1px solid var(--h14-cyan)',fontSize:14}}>MAIL SERVER</span><b style={{fontSize:30,color:'var(--h14-cyan)'}}>⇄</b><span style={{padding:12,border:'1px solid var(--h14-cyan)',fontSize:14}}>CLIENT</span></div>
      <div style={{...revealStyle(reveal,3),padding:'10px 10px',textAlign:'center',border:'1px solid var(--h14-cyan)',color:'var(--h14-cyan)',...mono,fontSize:13}}>SERVER + CLIENT STAY SYNCHRONISED</div>
      <p style={{margin:0,fontSize:15,lineHeight:1.48,color:'var(--h14-muted)'}}>Only a copy is downloaded. The original remains on the server until the client manually deletes it.</p>
    </section>
    <footer style={{gridColumn:'1 / -1',...revealStyle(reveal,4),padding:'11px 14px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:14.5,color:'var(--h14-muted)'}}><b style={{color:'var(--h14-ink)'}}>Both are pull protocols.</b> The source’s key comparison is <b style={{color:'var(--h14-ink)'}}>synchronisation</b>.</footer>
  </div>;
}
