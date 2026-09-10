import type { LessonPresentationBeat } from './lesson-experience-model';

const visible=(reveal:number,step:number)=>reveal>=step?'is-visible':'';
type Props={beat:LessonPresentationBeat;reveal:number};
type EocGroup={label:string;marks:string;title:string;tasks:string[];sourceLines?:string[];origin?:string};

export function Chapter14EndOfChapterMaster({beat,reveal}:Props){
  if(beat.id!=='h14p-142-practice')return null;
  const groups:EocGroup[]=[
    {
      label:'Q1 · p.344',
      marks:'12 marks',
      title:'Peer-to-peer + TCP/IP + email protocols',
      tasks:[
        'Match lurker, leech, seed, tracker and BitTorrent to the five source descriptions. [5]',
        'Complete the four-layer TCP/IP diagram; Internet (network) layer is already shown. [3]',
        'Describe the protocols used when sending and receiving emails. [4]',
      ],
      sourceLines:[
        'central server storing details of computers in a peer-to-peer swarm',
        'peer that uploads files for other peers to download',
        'peer with negative feedback from other peers',
        'protocol used to share files between peers',
        'peer that downloads files but supplies no new content',
      ],
    },
    {
      label:'Q2 · p.344',
      marks:'9 marks',
      title:'Ethernet frame + metadata + BitTorrent',
      tasks:[
        'Complete the Ethernet-data section by supplying the four missing items around the given Ethernet type field. [4]',
        'State what is meant by metadata. [1]',
        'Describe how files can be shared using the BitTorrent protocol. [4]',
      ],
      sourceLines:['Ethernet data prompt: destination · source · Ethernet type · actual message · frame check sequence'],
    },
    {
      label:'Q3 · p.344',
      marks:'11 marks',
      title:'Circuit switching + video conferencing + packet switching',
      tasks:[
        'Explain what is meant by circuit switching. [2]',
        'Explain why circuit switching can be preferable for video conferencing. [6]',
        'Explain how a web page is transferred using packet switching. [3]',
      ],
      origin:'Cambridge International AS & A Level Computer Science 9608 · Paper 32 Q3 · November 2015',
    },
    {
      label:'Q4 · p.345',
      marks:'14 marks',
      title:'Switching comparison + hop/checksum + routing',
      tasks:[
        'For each source statement below, decide true/false for circuit switching and packet switching. [5]',
        'Explain hop number/hopping and why it is used. [2]',
        'Explain checksum and why it is used. [2]',
        'Describe how headers and routing tables route packets efficiently from sender to recipient. [5]',
      ],
      sourceLines:[
        'a dedicated circuit/path is needed at all times',
        'the same route/circuit is used for every packet in the message',
        'bandwidth is shared with other packets of data',
        'none of the bandwidth available is wasted during transmission',
        'packets arrive at the destination in the correct order',
      ],
    },
  ];
  return <div className="h14eoc h14eoc--source h14eoc--deep" aria-label="Chapter 14 end-of-chapter Questions 1 to 4">
    <div className="h14eoc-spine" aria-hidden="true"/>
    {groups.map((group,index)=><section key={group.label} className={visible(reveal,index+1)}>
      <header><span>{group.label}</span><small>{group.marks}</small></header>
      <strong>{group.title}</strong>
      <ol>{group.tasks.map(task=><li key={task}>{task}</li>)}</ol>
      {group.sourceLines?<ul className="h14eoc-source-lines">{group.sourceLines.map(line=><li key={line}>{line}</li>)}</ul>:null}
      {group.origin?<small className="h14eoc-origin">{group.origin}</small>:null}
    </section>)}
    <footer className={visible(reveal,4)}><b>EXAM CONNECTION</b><span>Q1–Q4 cover terminology, protocol stacks, email, Ethernet, BitTorrent, switching, hopping, checksum and routing. Q4 deliberately joins packet control and routing rather than testing isolated definitions.</span></footer>
  </div>;
}
