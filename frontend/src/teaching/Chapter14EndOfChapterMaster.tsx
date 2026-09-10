import type { LessonPresentationBeat } from './lesson-experience-model';

const visible=(reveal:number,step:number)=>reveal>=step?'is-visible':'';
type Props={beat:LessonPresentationBeat;reveal:number};

export function Chapter14EndOfChapterMaster({beat,reveal}:Props){
  if(beat.id!=='h14p-142-practice')return null;
  const groups=[
    {
      label:'Q1 · p.344',
      marks:'12 marks',
      title:'Peer-to-peer + TCP/IP + email protocols',
      tasks:[
        'Match lurker, leech, seed, tracker and BitTorrent to the correct descriptions. [5]',
        'Complete the four-layer TCP/IP diagram. [3]',
        'Describe the protocols used when sending and receiving emails. [4]',
      ],
    },
    {
      label:'Q2 · p.344',
      marks:'9 marks',
      title:'Ethernet frame + metadata + BitTorrent',
      tasks:[
        'Complete the Ethernet-data section by supplying the four missing items. [4]',
        'State what is meant by metadata. [1]',
        'Describe how files can be shared using the BitTorrent protocol. [4]',
      ],
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
    },
    {
      label:'Q4 · p.345',
      marks:'14 marks',
      title:'Switching comparison + hop/checksum + routing',
      tasks:[
        'Classify five statements as true/false for circuit switching and packet switching. [5]',
        'Explain hop number/hopping and why it is used. [2]',
        'Explain checksum and why it is used. [2]',
        'Describe how headers and routing tables route packets efficiently from sender to recipient. [5]',
      ],
    },
  ];
  return <div className="h14eoc h14eoc--source" aria-label="Chapter 14 end-of-chapter Questions 1 to 4">
    <div className="h14eoc-spine" aria-hidden="true"/>
    {groups.map((group,index)=><section key={group.label} className={visible(reveal,index+1)}>
      <header><span>{group.label}</span><small>{group.marks}</small></header>
      <strong>{group.title}</strong>
      <ol>{group.tasks.map(task=><li key={task}>{task}</li>)}</ol>
    </section>)}
    <footer className={visible(reveal,4)}><b>EXAM CONNECTION</b><span>Q4 deliberately joins switching, packet control and routing. Students must connect concepts, not memorise isolated definitions.</span></footer>
  </div>;
}
