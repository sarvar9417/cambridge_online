type Props={reveal:number};
const visible=(reveal:number,step:number)=>reveal>=step?'is-visible':'';

/** Hodder pp.332–333, Figures 14.3 and 14.4. The full route is always visible;
 * reveal changes emphasis only so the projector never shows an empty diagram. */
export function Chapter14EmailSourceComplete({reveal}:Props){
  const stages=[
    ['CLIENT','sender'],
    ["CLIENT'S ISP EMAIL SERVER",'uses SMTP/MIME protocol'],
    ['INTERNET','mail transfer'],
    ["RECIPIENT'S DOMAIN EMAIL SERVER",'uses POP/IMAP protocol'],
    ['RECIPIENT','client'],
  ] as const;
  return <div className="h14m-content-v2 h14email-source" aria-label="Hodder Figures 14.3 and 14.4 email protocol setup">
    <header><span>HODDER pp.332–333 · FIGURES 14.3 + 14.4</span><strong>One email: overview first, then the detailed protocol route</strong></header>
    <section className="h14email-overview" aria-label="Figure 14.3 overview">
      <div><b>SMTP</b><small>send email</small></div><i aria-hidden="true">→</i><div className="mail-server"><strong>EMAIL SERVER</strong><small>stores/transfers mail</small></div><i aria-hidden="true">→</i><div><b>POP / IMAP</b><small>receive email</small></div>
    </section>
    <main aria-label="Figure 14.4 detailed route">
      {stages.map(([title,note],i)=><section className={visible(reveal,Math.min(i+1,5))} key={title}>
        <b>{String(i+1).padStart(2,'0')}</b><div><strong>{title}</strong><small>{note}</small></div>{i<stages.length-1?<i aria-hidden="true">→</i>:null}
      </section>)}
    </main>
    <footer>
      <section className={visible(reveal,6)}><b>SENDING</b><p>SMTP is text-based, connection-based and a push protocol. MIME is required by the source for media/binary attachments; its header helps the client select the required media player.</p></section>
      <section className={visible(reveal,6)}><b>RECEIVING</b><p>POP3/4 and IMAP are pull protocols. POP3/4 does not keep server and client synchronised; IMAP keeps them synchronised and leaves the original on the server until manually deleted.</p></section>
    </footer>
  </div>;
}
