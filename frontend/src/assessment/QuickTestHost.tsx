import { useCallback, useEffect, useState } from 'react';
import { api, type ClassItem, type User } from '../lib/api';
import { AssessmentCenter } from './AssessmentCenter';
import './quick-test.css';

type Test={id:string;title:string;gradeLabel:string;durationMinutes:number;questionCount:number;unkeyedCount:number;status:string;sourceFilename?:string};
type Session={id:string;testId:string;code:string;title:string;status:string;joined:number;submitted:number;expiresAt:string;durationMinutes:number};
type Row={id:string;name:string;answered:number;submittedAt:string|null;score:number|null;maxScore:number|null;
  details:Array<{number:number;prompt:string;choiceIndex:number|null;correctIndex:number;correct:boolean;topic:string}>};
type Report={id:string;code:string;title:string;status:string;students:Row[]};
const msg=(e:unknown)=>e instanceof Error?e.message:'So‘rov bajarilmadi.';
const invite=(code:string)=>window.location.origin+'/#/test/'+code;
const cell=(s:unknown)=>'"'+String(s??'').replaceAll('"','""')+'"';

export function QuickTestHost({user,classes}:{user:User;classes:ClassItem[]}){
  const [tests,setTests]=useState<Test[]>([]);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [active,setActive]=useState<string|null>(null);
  const [report,setReport]=useState<Report|null>(null);
  const [details,setDetails]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [advanced,setAdvanced]=useState(false);
  const [error,setError]=useState('');
  const [copied,setCopied]=useState('');
  const reload=useCallback(async()=>{
    const [a,b]=await Promise.all([
      api<{data:Test[]}>('/assessment-center'),
      api<{data:Session[]}>('/assessment-code/sessions')]);
    setTests(a.data);setSessions(b.data);
  },[]);
  useEffect(()=>{void reload().catch(e=>setError(msg(e)));},[reload]);
  useEffect(()=>{
    if(!active)return;
    let live=true;
    const refresh=async()=>{
      try{
        const r=await api<{data:Report}>('/assessment-code/sessions/'+active+'/report');
        if(live)setReport(r.data);
      }catch(e){if(live)setError(msg(e));}
    };
    void refresh();
    const timer=window.setInterval(()=>{void refresh();},3000);
    return()=>{live=false;window.clearInterval(timer);};
  },[active]);
  const start=async(t:Test)=>{
    if(t.unkeyedCount){
      setError('Avval '+t.unkeyedCount+' ta savolning javobini tekshirish kerak.');return;
    }
    const warning=t.gradeLabel==='Grade 7'?
      'Manbadagi Grade 7 hujjatining ichki sarlavhasi “Stage 9”. Sinf va kalitlarni tekshirib tasdiqlaysizmi?':
      ['Grade 8','Grade 9'].includes(t.gradeLabel)?
        'Bu testning javob kaliti asl hujjatda yo‘q edi. Kiritilgan kalitlarni ko‘rib chiqib, o‘quvchilarga berishni tasdiqlaysizmi?':null;
    if(warning&&!window.confirm(warning))return;
    setBusy(true);setError('');
    try{
      const r=await api<{data:Session}>('/assessment-code/sessions',{
        method:'POST',body:JSON.stringify({testId:t.id,sourceReviewed:true})});
      await reload();setActive(r.data.id);setDetails(null);
    }catch(e){setError(msg(e));}finally{setBusy(false);}
  };
  const close=async()=>{
    if(!active||!window.confirm('Testni yakunlaysizmi? Ishlanayotgan urinishlar ham baholanadi.'))return;
    setBusy(true);setError('');
    try{
      await api('/assessment-code/sessions/'+active+'/close',{method:'POST',body:'{}'});
      await reload();
      const r=await api<{data:Report}>('/assessment-code/sessions/'+active+'/report');
      setReport(r.data);
    }catch(e){setError(msg(e));}finally{setBusy(false);}
  };
  const copy=async(value:string,kind:string)=>{
    try{await navigator.clipboard.writeText(value);setCopied(kind);}
    catch{setError('Nusxalash bloklangan. Kodni qo‘lda tanlab nusxalang.');}
  };
  const exportCsv=()=>{
    if(!report)return;
    const rows=[['O‘quvchi','Javob berilgan','To‘g‘ri','Ball','Jami ball','Holat'],
      ...report.students.map(s=>[s.name,s.answered,s.details.filter(d=>d.correct).length,
        s.score??'',s.maxScore??'',s.submittedAt?'Tugatgan':'Ishlamoqda'])];
    const csv='\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='test-'+report.code+'-natijalar.csv';a.click();
    URL.revokeObjectURL(url);
  };
  if(advanced)return <section className="qt-host"><button className="qt-back" type="button"
    onClick={()=>{setAdvanced(false);void reload();}}>← Kod bilan testga qaytish</button>
    <AssessmentCenter user={user} classes={classes}/></section>;
  const current=sessions.find(s=>s.id===active);
  const chosen=report?.students.find(s=>s.id===details);
  return <main className="qt-host">
    <header className="qt-header">
      <div><span className="qt-eyebrow">CAMBRIDGE · TEACHER STUDIO</span>
        <h1>📝 Kod bilan test</h1>
        <p>Testni tanlang, kodni o‘quvchilarga bering — natijalar shu yerda chiqadi.</p></div>
      <button className="qt-muted-btn" type="button" onClick={()=>setAdvanced(true)}>Test qo‘shish / tahrirlash</button>
    </header>
    {error&&<p role="alert" className="qt-error">{error}</p>}
    {active&&current&&<section className="qt-panel qt-live">
      <div className="qt-between"><div><span className="qt-eyebrow">TANLANGAN TEST</span><h2>{current.title}</h2></div>
        <button type="button" className="qt-muted-btn" onClick={()=>{setActive(null);setReport(null);setDetails(null);}}>← Barcha testlar</button></div>
      <div className="qt-code-layout">
        <div className="qt-code-card">
          <div className="qt-eyebrow">O‘QUVCHI KIRISH KODI</div>
          <div className="qt-code" aria-label={'Kirish kodi '+current.code}>{current.code}</div>
          <div className="qt-code-actions">
            <button type="button" onClick={()=>{void copy(current.code,'code');}}>{copied==='code'?'✓ Nusxalandi':'Kodni nusxalash'}</button>
            <button type="button" onClick={()=>{void copy(invite(current.code),'link');}}>{copied==='link'?'✓ Nusxalandi':'Havolani nusxalash'}</button>
          </div>
          <a href={invite(current.code)} target="_blank" rel="noreferrer">{invite(current.code)}</a>
          <p>O‘quvchilar ismi va kodini kiritadi. Login talab qilinmaydi.</p>
        </div>
        <div className="qt-session-stats">
          <div><b>{report?.students.length??current.joined}</b><span>Qo‘shilgan</span></div>
          <div><b>{report?.students.filter(s=>s.submittedAt).length??current.submitted}</b><span>Tugatgan</span></div>
          <div><b>{current.durationMinutes} min</b><span>Har bir o‘quvchiga vaqt</span></div>
          <div className="qt-session-actions">
            <span className={'qt-pill '+(current.status==='open'?'qt-pill-active':'')}>{current.status==='open'?'● Test ochiq':'Test yakunlangan'}</span>
            {current.status==='open'&&<button type="button" disabled={busy} className="qt-danger" onClick={()=>{void close();}}>Testni yakunlash</button>}
          </div>
        </div>
      </div>
      <div className="qt-between qt-results-head"><h3>Natijalar — avtomatik yangilanadi</h3>
        <button type="button" className="qt-muted-btn" onClick={exportCsv} disabled={!report?.students.length}>CSV yuklash</button></div>
      {!report?.students.length?<p className="qt-empty">Hozircha hech kim qo‘shilmadi. Kodni o‘quvchilarga bering.</p>:
        <div className="qt-table-wrap"><table><thead><tr><th>O‘quvchi</th><th>Jarayon</th><th>To‘g‘ri</th><th>Ball</th><th></th></tr></thead>
          <tbody>{report.students.map(s=><tr key={s.id}>
            <td><strong>{s.name}</strong></td><td>{s.submittedAt?'✓ Tugatdi':s.answered+' ta javob'}</td>
            <td>{s.submittedAt?s.details.filter(d=>d.correct).length:'—'}</td>
            <td>{s.submittedAt?s.score+' / '+s.maxScore:'—'}</td>
            <td><button type="button" className="qt-text-btn" onClick={()=>setDetails(s.id===details?null:s.id)}>Batafsil</button></td>
          </tr>)}</tbody></table></div>}
      {chosen&&<div className="qt-detail"><h3>{chosen.name} — savollar bo‘yicha natija</h3>
        {chosen.details.map(q=><p key={q.number}>
          <b>#{q.number}</b> {q.prompt}
          <small>{q.choiceIndex===null?'Javob yo‘q':`O‘quvchi: ${'ABCD'[q.choiceIndex]}`} · To‘g‘ri: {'ABCD'[q.correctIndex]}
            {' '}{q.correct?'✓':'✕'}</small>
        </p>)}</div>}
    </section>}
    <section className="qt-panel">
      <div className="qt-between"><h2>Testlar</h2><span>{tests.length} ta to‘plam</span></div>
      <div className="qt-tests">{tests.map(t=><article key={t.id} className="qt-test">
        <span className="qt-eyebrow">{t.gradeLabel} · {t.questionCount} SAVOL</span>
        <h3>{t.title}</h3><p>{t.durationMinutes} daqiqa · {t.unkeyedCount?'Javoblarni tekshirish kerak':'Javob kaliti kiritilgan'}</p>
        <button type="button" className="qt-primary" disabled={busy||!!t.unkeyedCount}
          onClick={()=>{void start(t);}}>Kod yaratish →</button>
      </article>)}</div>
    </section>
    {sessions.length>0&&<section className="qt-panel"><h2>Oldingi testlar</h2>
      <div className="qt-history">{sessions.map(s=><button key={s.id} type="button"
        className={active===s.id?'is-active':''}
        onClick={()=>{setActive(s.id);setDetails(null);setReport(null);}}>
        <strong>{s.title}</strong><span>Kod: {s.code} · {s.joined} o‘quvchi · {s.submitted} tugatgan · {s.status}</span>
      </button>)}</div></section>}
  </main>;
}

