import { useEffect, useState } from 'react';
import type { LessonSlide } from './lesson-content-full';
import './chapter7-lesson.css';

const facts = [
  'Oshxona devori sariq', 'Burger 20 000 so‘m', 'Oshxonada 8 ta stol bor', 'Pizza 25 000 so‘m',
  'O‘quvchi ovqat tanlaydi', 'Oshpazning ismi Anvar', 'O‘quvchi qancha pul berganini kiritadi',
  'Maktabda 650 nafar o‘quvchi bor', 'Sandwich 15 000 so‘m', 'Tizim pul yetarliligini tekshiradi',
  'Maktab 2019-yilda ochilgan', 'Tizim qaytimni hisoblaydi',
];

const steps = [
  'Muammoni tushundik', 'Kerakli narsalarni aniqladik', 'Katta ishni kichik ishlarga ajratdik',
  'Keraksiz ma’lumotlarni olib tashladik', 'Qismlar bog‘lanishini ko‘rsatdik',
  'Bajarilish ketma-ketligini chizdik', 'Yechimni tartibli matn bilan yozdik',
  'Kompyuter tushunadigan buyruqlarga aylantirdik', 'Turli holatlarda ishlatib ko‘rdik',
  'Xatoni topdik, tuzatdik va qayta tekshirdik',
];

function MenuVisual() {
  return <div className="ch7-menu">
    <div className="ch7-counter"><span>BUYURTMA</span><b>?</b></div>
    <div className="ch7-menu-items">
      <article><span>🍔</span><strong>Burger</strong><b>20 000</b></article>
      <article><span>🍕</span><strong>Pizza</strong><b>25 000</b></article>
      <article><span>🥪</span><strong>Sandwich</strong><b>15 000</b></article>
    </div>
  </div>;
}

function ThreeColumns({ revealed }: { revealed:boolean }) {
  const values = [
    ['Tizimga beramiz', 'Ovqat tanlovi', 'Berilgan pul'],
    ['Tizim bajaradi', 'Narxni aniqlaydi', 'Pulni tekshiradi', 'Qaytimni hisoblaydi'],
    ['Tizim bizga beradi', 'Narx / qaytim', 'Yoki ogohlantirish'],
  ];
  return <div className="ch7-three-cols">{values.map(([title,...items])=><article key={title}><strong>{title}</strong>{revealed?items.map(item=><span key={item}>{item}</span>):<span className="ch7-blank">Guruh javobi</span>}</article>)}</div>;
}

function Hierarchy({ revealed }: { revealed:boolean }) {
  if(!revealed) return <div className="ch7-card-pile">{['Oshxona tizimi','Ovqat','To‘lov','Natija','Ovqatni tanlash','Narxni aniqlash','Pulni olish','Pulni tekshirish','Qaytimni hisoblash','Natijani ko‘rsatish'].map(item=><span key={item}>{item}</span>)}</div>;
  return <div className="ch7-tree">
    <strong>Oshxona tizimi</strong>
    <div className="ch7-tree-row">
      <article><b>Ovqat</b><span>Ovqatni tanlash</span><span>Narxni aniqlash</span></article>
      <article><b>To‘lov</b><span>Pulni olish</span><span>Pulni tekshirish</span><span>Qaytimni hisoblash</span></article>
      <article><b>Natija</b><span>Natijani ko‘rsatish</span></article>
    </div>
  </div>;
}

function Sequence({ revealed, shapes=false }: { revealed:boolean; shapes?:boolean }) {
  if(!revealed) return <div className="ch7-sequence ch7-sequence-simple">
    {['Boshlash','Ovqatni tanlash','Narxni aniqlash','Pulni kiritish','Pul yetarlimi?'].map((item,index)=><div key={item}><span>{item}</span>{index<4&&<b>↓</b>}</div>)}
    <em>Bu yerdan nechta yo‘l chiqadi?</em>
  </div>;
  if(shapes) return <div className="ch7-flow">
    <div className="terminator">Boshlash</div><i>↓</i>
    <div className="io">Ovqatni kiritish</div><i>↓</i>
    <div className="process">Narxni aniqlash</div><i>↓</i>
    <div className="io">Pulni kiritish</div><i>↓</i>
    <div className="decision"><span>Pul yetarlimi?</span></div>
    <div className="ch7-branches"><article><b>HA</b><span>Qaytimni hisoblash</span><span>Natijani chiqarish</span></article><article><b>YO‘Q</b><span>“Pul yetarli emas”</span></article></div>
  </div>;
  return <div className="ch7-sequence">
    <div><span>Boshlash</span><b>→</b><span>Ovqat</span><b>→</b><span>Narx</span><b>→</b><span>Pul</span><b>→</b><span>Pul yetarlimi?</span></div>
    <div className="ch7-branches"><article><b>HA</b><span>Qaytimni hisobla</span><span>Natijani ko‘rsat</span></article><article><b>YO‘Q</b><span>“Pul yetarli emas”</span></article></div>
  </div>;
}

function ShapeLegend() {
  return <div className="ch7-shapes">
    <article><span className="shape oval">Boshlash</span><b>boshlash / tugash</b></article>
    <article><span className="shape rect">Ish</span><b>tizim bajaradigan ish</b></article>
    <article><span className="shape para">Ma’lumot</span><b>ma’lumot kiradi / chiqadi</b></article>
    <article><span className="shape diamond">?</span><b>ikki yo‘lga ajratadigan savol</b></article>
  </div>;
}

function StructuredText({ revealed }: { revealed:boolean }) {
  return <div className="ch7-code-wrap">
    <div className="ch7-keywords">{['BOSHLASH','KIRITISH','AGAR','UNDA','AKS HOLDA','CHIQARISH','TUGATISH'].map(k=><span key={k}>{k}</span>)}</div>
    {revealed&&<pre>{`BOSHLASH\nKIRITISH ovqat\nnarxni aniqlash\nKIRITISH pul\nAGAR pul >= narx UNDA\n    qaytimni hisoblash\n    CHIQARISH qaytim\nAKS HOLDA\n    CHIQARISH "Pul yetarli emas"\nTUGATISH`}</pre>}
  </div>;
}

function CommandCards({ revealed }: { revealed:boolean }) {
  const unordered = ['SAY change','ASK food','ELSE','SET change TO money - price','ASK money','END IF','IF money >= price','SAY "Pul yetarli emas"','SET price TO ...'];
  const ordered = ['ASK food','SET price TO ...','ASK money','IF money >= price','SET change TO money - price','SAY change','ELSE','SAY "Pul yetarli emas"','END IF'];
  return <div className={`ch7-command-cards${revealed?' ordered':''}`}>{(revealed?ordered:unordered).map((item,index)=><span key={`${item}-${index}`}>{revealed&&<i>{index+1}</i>}{item}</span>)}</div>;
}

function HumanComputer({ revealed }: { revealed:boolean }) {
  const cases = [['Pizza','30 000','5 000 qaytim'],['Burger','20 000','0 qaytim'],['Sandwich','10 000','Pul yetarli emas']];
  return <div className="ch7-sim">{cases.map(([food,money,result],i)=><article key={food}><span>HOLAT {i+1}</span><strong>{food}</strong><b>{money} so‘m</b>{revealed?<em>{result}</em>:<em>Natija: ?</em>}</article>)}</div>;
}

function TestTable({ revealed }: { revealed:boolean }) {
  const rows = [['Pizza','30 000','5 000'],['Burger','20 000','0'],['Sandwich','10 000','Pul yetarli emas'],['Pizza','25 000','0'],['Burger','15 000','Pul yetarli emas']];
  return <div className="ch7-test-table"><div className="head"><b>Ovqat</b><b>Pul</b><b>Kutilgan</b><b>Haqiqiy</b><b>Bir xilmi?</b></div>{rows.map(([food,money,result])=><div key={`${food}-${money}`}><span>{food}</span><span>{money}</span><span>{revealed?result:'?'}</span><span>{revealed?result:'?'}</span><span>{revealed?'✓':'?'}</span></div>)}</div>;
}

function BugVisual({ revealed }: { revealed:boolean }) {
  return <div className="ch7-bug">
    <pre>IF money <mark>&gt;</mark> price</pre>
    <div><span>Burger</span><b>20 000</b><span>Berilgan pul</span><b>20 000</b></div>
    {revealed?<p>To‘g‘rilash: <code>money &gt;= price</code><br/>Teng, katta va kichik to‘lov holatlarini qayta tekshiring.</p>:<p>Kutilgan: 0 qaytim<br/>Haqiqiy: “Pul yetarli emas”<br/><strong>Qayerda xato?</strong></p>}
  </div>;
}

function RecapVisual() {
  return <ol className="ch7-recap-list">{steps.map((item,index)=><li key={item}><span>{index+1}</span>{item}</li>)}</ol>;
}

function RevealMap() {
  const rows = [
    ['Muammo va talablarni aniqladik','Analysis'],
    ['Katta ishni kichik qismlarga ajratdik','Decomposition'],
    ['Keraksiz tafsilotlarni olib tashladik','Abstraction'],
    ['Yechimni oldindan rejalashtirdik','Design'],
    ['Qismlar ierarxiyasini ko‘rsatdik','Structure diagram'],
    ['Standart shakllar bilan oqimni chizdik','Flowchart'],
    ['Tartibli matn bilan algoritmni yozdik','Pseudocode'],
    ['Kompyuter bajaradigan buyruqlarga aylantirdik','Coding'],
    ['Kutilgan va haqiqiy natijani solishtirdik','Testing'],
  ];
  return <div className="ch7-reveal-map">{rows.map(([what,name])=><article key={name}><span>{what}</span><b>{name}</b></article>)}</div>;
}

function VisualForSlide({ id, revealed }: { id:string; revealed:boolean }) {
  if(id==='ch7-01-challenge') return <MenuVisual/>;
  if(id==='ch7-02-understand') return <ThreeColumns revealed={revealed}/>;
  if(id==='ch7-03-small-jobs') return <div className="ch7-card-pile jobs">{(revealed?['Ovqatni tanlash','Narxni topish','Pulni olish','Pulni tekshirish','Qaytimni hisoblash','Natijani ko‘rsatish']:['Kichik ish 1','Kichik ish 2','Kichik ish 3','Kichik ish 4','Kichik ish 5','Kichik ish 6']).map(x=><span key={x}>{x}</span>)}</div>;
  if(id==='ch7-04-filter') return <div className="ch7-facts">{facts.map((fact,i)=><span className={revealed?(i===1||i===3||i===4||i===6||i===8||i===9||i===11?'keep':'drop'):''} key={fact}>{fact}</span>)}</div>;
  if(id==='ch7-05-hierarchy') return <Hierarchy revealed={revealed}/>;
  if(id==='ch7-06-sequence') return <Sequence revealed={revealed}/>;
  if(id==='ch7-07-shapes') return revealed?<Sequence revealed shapes/>:<ShapeLegend/>;
  if(id==='ch7-08-structured-text') return <StructuredText revealed={revealed}/>;
  if(id==='ch7-09-command-cards') return <CommandCards revealed={revealed}/>;
  if(id==='ch7-10-human-computer') return <HumanComputer revealed={revealed}/>;
  if(id==='ch7-11-predict-check') return <TestTable revealed={revealed}/>;
  if(id==='ch7-12-bug') return <BugVisual revealed={revealed}/>;
  if(id==='ch7-13-recap') return <RecapVisual/>;
  if(id==='ch7-14-reveal') return <RevealMap/>;
  return null;
}

export function Chapter7SlideBody({ slide }: { slide:LessonSlide }) {
  const [revealed,setRevealed]=useState(false);
  useEffect(()=>setRevealed(false),[slide.id]);
  const hasReveal=Boolean(slide.activity?.reveal)||['ch7-02-understand','ch7-03-small-jobs','ch7-04-filter','ch7-05-hierarchy','ch7-06-sequence','ch7-07-shapes','ch7-08-structured-text','ch7-09-command-cards','ch7-10-human-computer','ch7-11-predict-check','ch7-12-bug'].includes(slide.id);
  return <div className="ch7-slide-body">
    <div className="ch7-copy">
      <p className="lesson-eyebrow">{slide.eyebrow}</p>
      <h1>{slide.title}</h1>
      <p className="ch7-lead">{slide.lead}</p>
      {slide.bullets&&<ul>{slide.bullets.map(item=><li key={item}>{item}</li>)}</ul>}
      {slide.keyTerms&&<div className="ch7-terms">{slide.keyTerms.map(item=><article key={item.term}><strong>{item.term}</strong><span>{item.definition}</span></article>)}</div>}
      {slide.teacherPrompt&&<div className="ch7-question"><span>SAVOL</span><p>{slide.teacherPrompt}</p></div>}
      {slide.activity&&<div className="ch7-task"><span>GURUH VAZIFASI</span><strong>{slide.activity.title}</strong><p>{slide.activity.prompt}</p></div>}
      {hasReveal&&<button type="button" className="ch7-reveal-button" onClick={()=>setRevealed(value=>!value)}>{revealed?'Javobni yashirish':'Javob / namunani ko‘rsatish'}</button>}
      {revealed&&slide.activity?.reveal&&<div className="ch7-answer"><b>NAMUNA</b><p>{slide.activity.reveal}</p></div>}
    </div>
    <div className="ch7-visual-panel"><VisualForSlide id={slide.id} revealed={revealed}/></div>
  </div>;
}
