import { revealStyle } from './Chapter14VisualPrimitives';

const peers=[
  {id:'A',label:'ORIGINAL PEER',x:170,y:82,pieces:6,step:1},
  {id:'P1',label:'PEER',x:925,y:72,pieces:3,step:3},
  {id:'P2',label:'PEER',x:1020,y:230,pieces:4,step:4},
  {id:'P3',label:'PEER',x:825,y:330,pieces:2,step:4},
  {id:'P4',label:'PEER',x:330,y:330,pieces:4,step:5},
  {id:'P5',label:'PEER',x:120,y:245,pieces:2,step:5},
] as const;

const pieceColours=['var(--h14-blue)','var(--h14-cyan)','var(--h14-amber)','var(--h14-red)','#b991ff','#7ddc91'];

function PieceStrip({x,y,count}:{x:number;y:number;count:number}){
  return <>{Array.from({length:6},(_,i)=><rect key={i} x={x+i*13} y={y} width="10" height="10" rx="2" fill={i<count?pieceColours[i]:'transparent'} stroke={i<count?pieceColours[i]:'var(--h14-line)'} strokeWidth="1"/>)}</>;
}

/**
 * Hodder pp.335–337. The tracker is a directory of connected peers, not the file
 * store. Dashed links are discovery; solid arrows are direct piece transfer.
 */
export function Chapter14BitTorrentHero({reveal}:{reveal:number}){
  const steps=[
    ['1','TORRENT','Original peer creates a small .torrent file containing metadata about the file.'],
    ['2','PIECES','The actual file is split into equal pieces.'],
    ['3','TRACKER','A peer obtains the torrent and connects to the tracker, which stores connected-computer details/IP addresses.'],
    ['4','PEER-TO-PEER','Peers obtain missing pieces directly from other peers; once a peer has a piece it becomes a source for that piece.'],
    ['5','SEED + REASSEMBLY','A completed peer can remain online as a seed; pieces may arrive non-sequentially and are rearranged into the final file.'],
  ] as const;
  return <div className="h14m-content-v2" aria-label="BitTorrent peer to peer file sharing swarm" style={{display:'grid',gap:10,minHeight:430,alignContent:'center'}}>
    <svg viewBox="0 0 1140 390" role="img" aria-label="Tracker connected to a swarm of peers exchanging file pieces" style={{width:'100%',maxHeight:390}}>
      <defs><marker id="h14-bt-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--h14-ink)"/></marker></defs>
      {peers.map(peer=><line key={`tracker-${peer.id}`} x1="570" y1="190" x2={peer.x} y2={peer.y} stroke="var(--h14-cyan)" strokeWidth="2" strokeDasharray="7 7" style={revealStyle(reveal,peer.step)}/>)}
      <path d="M210 112 Q410 225 355 315" fill="none" stroke="var(--h14-ink)" strokeWidth="2.5" markerEnd="url(#h14-bt-arrow)" style={revealStyle(reveal,4)}/>
      <path d="M872 104 Q915 150 991 211" fill="none" stroke="var(--h14-ink)" strokeWidth="2.5" markerEnd="url(#h14-bt-arrow)" style={revealStyle(reveal,4)}/>
      <path d="M985 260 Q925 315 855 325" fill="none" stroke="var(--h14-ink)" strokeWidth="2.5" markerEnd="url(#h14-bt-arrow)" style={revealStyle(reveal,5)}/>
      <path d="M790 328 Q590 350 380 330" fill="none" stroke="var(--h14-ink)" strokeWidth="2.5" markerEnd="url(#h14-bt-arrow)" style={revealStyle(reveal,5)}/>
      <g style={revealStyle(reveal,2)}><rect x="475" y="20" width="190" height="64" rx="11" fill="rgba(255,200,87,.055)" stroke="var(--h14-amber)" strokeWidth="2"/><text x="570" y="43" textAnchor="middle" fill="var(--h14-amber)" fontSize="14" fontWeight="900">FILE SPLIT INTO PIECES</text><PieceStrip x={528} y={56} count={6}/></g>
      <g style={revealStyle(reveal,3)}><rect x="485" y="142" width="170" height="96" rx="17" fill="rgba(82,224,210,.07)" stroke="var(--h14-cyan)" strokeWidth="3"/><text x="570" y="174" textAnchor="middle" fill="var(--h14-ink)" fontSize="24" fontWeight="900">TRACKER</text><text x="570" y="198" textAnchor="middle" fill="var(--h14-muted)" fontSize="13">connected peer details</text><text x="570" y="216" textAnchor="middle" fill="var(--h14-muted)" fontSize="13">including IP addresses</text><text x="570" y="252" textAnchor="middle" fill="var(--h14-cyan)" fontSize="12">directory / discovery — not the shared file store</text></g>
      {peers.map(peer=><g key={peer.id} transform={`translate(${peer.x} ${peer.y})`} style={revealStyle(reveal,peer.step)}><rect x="-64" y="-36" width="128" height="72" rx="10" fill="rgba(84,166,255,.055)" stroke={peer.id==='A'?'var(--h14-amber)':'var(--h14-blue)'} strokeWidth="2"/><text x="0" y="-13" textAnchor="middle" fill={peer.id==='A'?'var(--h14-amber)':'var(--h14-cyan)'} fontSize="12" fontWeight="900">{peer.label}</text><text x="0" y="5" textAnchor="middle" fill="var(--h14-ink)" fontSize="15" fontWeight="800">{peer.id}</text><PieceStrip x={-36} y={17} count={peer.pieces}/></g>)}
      <g style={revealStyle(reveal,5)}><rect x="675" y="278" width="108" height="48" rx="9" fill="rgba(82,224,210,.06)" stroke="var(--h14-cyan)"/><text x="729" y="297" textAnchor="middle" fill="var(--h14-cyan)" fontSize="12" fontWeight="900">SEED</text><text x="729" y="314" textAnchor="middle" fill="var(--h14-muted)" fontSize="11">complete peer shares</text></g>
    </svg>
    <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',borderTop:'1px solid var(--h14-line)'}}>{steps.map(([n,title,text],i)=><section key={n} style={{...revealStyle(reveal,i+1),padding:'11px 12px',borderRight:i<steps.length-1?'1px solid var(--h14-line)':'0',minHeight:100}}><b style={{color:'var(--h14-cyan)',font:'800 12px var(--font-mono)'}}>{n} · {title}</b><p style={{margin:'7px 0 0',fontSize:13.5,lineHeight:1.38,color:'var(--h14-muted)'}}>{text}</p></section>)}</div>
    <footer style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,padding:'10px 13px',borderLeft:'4px solid var(--h14-amber)',background:'rgba(255,200,87,.04)',fontSize:13.5,color:'var(--h14-muted)'}}><span><b style={{color:'var(--h14-amber)'}}>DASHED LINKS</b> peer ↔ tracker discovery/details</span><span><b style={{color:'var(--h14-amber)'}}>SOLID ARROWS</b> file-piece transfer directly between peers</span></footer>
  </div>;
}
