import { useEffect, useState } from 'react';
import { api, type ClassItem } from './lib/api';
import { useRoute } from './lib/router';
import { LessonStudio } from './teaching/LessonStudio';

interface HeatCell { studentId:string;studentName:string;topic:number;mastery:number|null;evidence:number }
interface MarkPoint { id:string;code:string;text:string;displayRef:string;commandWord:string|null;missed:number;total:number;missPct:number }
interface CommandWord { commandWord:string;percentage:number;sampleSize:number }
interface AiQuality { promptVersion:string;sampleSize:number;pointAgreement:number;falsePositive:number;falseNegative:number }

export function AnalyticsPanel({ classes, owner }: { classes:ClassItem[];owner:boolean }) {
  const route=useRoute();
  const [classId,setClassId]=useState(classes[0]?.id??'');
  const [heat,setHeat]=useState<HeatCell[]>([]);
  const [points,setPoints]=useState<MarkPoint[]>([]);
  const [words,setWords]=useState<CommandWord[]>([]);
  const [quality,setQuality]=useState<AiQuality[]>([]);
  const [computing,setComputing]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{if(!classId||route.page==='darslar')return;setError('');Promise.all([
    api<{data:HeatCell[]}>(`/analytics/classes/${classId}/heatmap`),
    api<{data:MarkPoint[]}>(`/analytics/classes/${classId}/mark-points`),
    api<{data:CommandWord[]}>(`/analytics/classes/${classId}/command-words`),
    owner?api<{data:AiQuality[]}>('/analytics/ai-quality'):Promise.resolve({data:[]}),
  ]).then(([h,p,w,q])=>{setHeat(h.data);setPoints(p.data);setWords(w.data);setQuality(q.data)}).catch(cause=>setError(cause instanceof Error?cause.message:'Analitika yuklanmadi.'))},[classId,owner,route.page]);

  if(route.page==='darslar')return <LessonStudio user={{id:'lesson-studio',fullName:'',role:owner?'owner':'teacher',schoolId:null}}/>;

  const students=[...new Map(heat.map(cell=>[cell.studentId,cell.studentName])).entries()];
  const topics=[...new Set(heat.map(cell=>cell.topic))];
  const recompute=async()=>{setComputing(true);setError('');try{await api('/admin/grading-evaluations/recompute',{method:'POST'});setQuality((await api<{data:AiQuality[]}>('/analytics/ai-quality')).data)}catch(cause){setError(cause instanceof Error?cause.message:'AI sifati hisoblanmadi.')}finally{setComputing(false)}};
  return <section className="analytics-panel"><div className="section-title"><h2>Analitika</h2><select aria-label="Sinf" value={classId} onChange={event=>setClassId(event.target.value)}>{classes.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
    {error&&<p className="error">{error}</p>}
    {students.length>0&&<div className="heatmap" style={{gridTemplateColumns:`minmax(140px,1fr) repeat(${topics.length},52px)`}}><b>O‘quvchi</b>{topics.map(topic=><b key={topic}>T{topic}</b>)}{students.flatMap(([id,name])=>[<strong key={`${id}-name`}>{name}</strong>,...topics.map(topic=>{const cell=heat.find(item=>item.studentId===id&&item.topic===topic);const pct=cell?.mastery===null||cell?.mastery===undefined?null:Math.round(cell.mastery*100);return <span key={`${id}-${topic}`} className={`heat-cell ${pct===null||Number(cell?.evidence)<15?'low-data':pct<50?'weak':pct<=75?'mid':'strong'}`} title={`${name}, Topic ${topic}: ${pct??'ma’lumot yo‘q'}${pct===null?'':`%, ${cell?.evidence} ball dalil`}`}>{pct===null?'—':pct}</span>})])}</div>}
    <div className="analytics-columns"><div><h3>Yo‘qotilgan mark pointlar</h3>{points.length===0?<p className="empty">Kamida 8 ta tekshirilgan javob kerak.</p>:points.map(item=><div className="metric-row" key={item.id}><span><strong>{item.code} · {item.displayRef}</strong><small>{item.text}</small></span><b>{item.missPct}%</b></div>)}</div><div><h3>Command word</h3>{words.length===0?<p className="empty">Kamida 10 ta baholangan javob kerak.</p>:words.map(item=><div className="word-row" key={item.commandWord}><span>{item.commandWord}</span><progress max="100" value={item.percentage}/><b>{item.percentage}%</b></div>)}</div></div>
    {owner&&<div><div className="section-title"><h3>AI sifati</h3><button className="secondary" disabled={computing} onClick={recompute}>{computing?'Hisoblanmoqda':'Qayta hisoblash'}</button></div>{quality.length===0?<p className="empty">Kalibrlash uchun o‘qituvchi tekshirgan AI javoblari hali yo‘q.</p>:quality.map(item=><div className="quality-row" key={item.promptVersion}><strong>{item.promptVersion}</strong><span>Moslik {item.pointAgreement}%</span><span>FP {item.falsePositive}%</span><span>FN {item.falseNegative}%</span><small>n={item.sampleSize} · {item.sampleSize>=150&&item.pointAgreement>=88&&item.falsePositive<3?'gate tayyor':'soya rejimi'}</small></div>)}</div>}
  </section>;
}