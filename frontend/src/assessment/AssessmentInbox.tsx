import {useEffect,useState} from 'react';
import {api} from '../lib/api';
import './assessment-center.css';

type Assigned={id:string;title:string;courseCode:string;gradeLabel:string;
  kind:string;durationMinutes:number;submittedAt:string|null;attemptId:string|null;
  opensAt:string|null;closesAt:string|null;serverNow:string};

export function AssessmentInbox(){
  const [list,setList]=useState<Assigned[]>([]);
  const [error,setError]=useState(false);
  useEffect(()=>{
    let active=true;
    const poll=async()=>{
      try{
        const result=await api<{data:Assigned[]}>('/assessment-center');
        if(active){setList(result.data);setError(false);}
      }catch{if(active)setError(true);}
    };
    void poll();
    const timer=window.setInterval(()=>{void poll();},10000);
    return()=>{active=false;window.clearInterval(timer);};
  },[]);
  const pending=list.filter(item=>!item.submittedAt);
  if(!pending.length&&!error)return null;
  return <section className="ac-inbox" aria-label="Yangi testlar">
    <div className="ac-between">
      <div><p className="ac-eyebrow">ASSESSMENT CENTER</p><h2>📝 Menga berilgan testlar</h2></div>
      <a href="#oquvchi/testlar" className="ac-inbox-link">Testlarim →</a>
    </div>
    {error?<p role="status">Testlar ro‘yxatini olishda aloqa uzildi. Testlarim sahifasida qayta urinib ko‘ring.</p>
    :<div className="ac-inbox-grid">{pending.slice(0,4).map(item=>{
      const now=Date.parse(item.serverNow);
      const upcoming=!item.attemptId&&Boolean(item.opensAt&&now<Date.parse(item.opensAt));
      const closed=!item.attemptId&&Boolean(item.closesAt&&now>=Date.parse(item.closesAt));
      return <a href="#oquvchi/testlar" className="ac-inbox-item" key={item.id}>
        <strong>{item.title}</strong>
        <small>{item.courseCode} · {item.gradeLabel} · {item.durationMinutes} daqiqa</small>
        <span>{upcoming?'⏳ Hali ochilmagan':closed?'Muddati tugagan':
          item.attemptId?'▶ Davom ettirish':'▶ Testni boshlash'}</span>
      </a>;
    })}</div>}
  </section>;
}
