import { ThemeToggle } from './components/ThemeToggle';
import { FormEvent, useEffect, useState } from 'react';
import { api, apiBlob, setAccessToken, type User } from './lib/api';
import './selection-handoff.css';

type Review = {
  items:Array<{role:'graded'|'context_only';freshRef:string;sourceRef:string;effectiveMarks:number}>;
  totalMarks:number;
  dependencyIssues:Array<{severity:'error'|'warning';dependsOnRef:string;questionRef:string}>;
  canPublish:boolean;
};
type FilterOptions={classes:Array<{id:string;name:string}>};
type CreatedAssignment={id:string;title:string;mode:'online'|'pdf'|'mock';totalMarks:number;publishedAt:string|null;itemCount:number;gradedCount:number;contextOnlyCount:number};
type ExportItem={id:string;status:'queued'|'running'|'succeeded'|'failed';error:string|null;kind:string};

const sleep=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms));
const errorMessage=(error:unknown,fallback:string)=>error instanceof Error?error.message:fallback;

export function SelectionHandoffPage(){
  const selectionId=sessionStorage.getItem('campath:question-bank-selection')??'';
  const [user,setUser]=useState<User|null>(null);
  const [review,setReview]=useState<Review|null>(null);
  const [classes,setClasses]=useState<FilterOptions['classes']>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<CreatedAssignment|null>(null);
  const [exportItem,setExportItem]=useState<ExportItem|null>(null);

  useEffect(()=>{
    if(!selectionId){setError('Tanlangan savatcha topilmadi. Savol bankidan qayta ko‘rib chiqing.');setLoading(false);return}
    api<{accessToken:string;user:User}>('/auth/refresh',{method:'POST'},{suppressAuthExpired:true})
      .then(async session=>{
        setAccessToken(session.accessToken);setUser(session.user);
        if(session.user.role==='student')throw new Error('Bu amal faqat o‘qituvchi yoki owner uchun.');
        const [nextReview,options]=await Promise.all([api<Review>(`/selections/${selectionId}`),api<FilterOptions>('/questions/filter-options')]);
        setReview(nextReview);setClasses(options.classes??[]);
      })
      .catch(cause=>setError(errorMessage(cause,'Handoff ma’lumotlari yuklanmadi.')))
      .finally(()=>setLoading(false));
  },[selectionId]);

  const download=async(item:ExportItem)=>{
    const blob=await apiBlob(`/exports/${item.id}/file`),url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=`campath-${item.kind}.pdf`;anchor.click();URL.revokeObjectURL(url);
  };

  const pollExport=async(id:string)=>{
    for(let attempt=0;attempt<25;attempt++){
      const current=await api<ExportItem>(`/exports/${id}`);setExportItem(current);
      if(current.status==='succeeded'){await download(current);return current}
      if(current.status==='failed')throw new Error(current.error??'PDF eksportda xato yuz berdi.');
      await sleep(1200);
    }
    throw new Error('PDF navbatda qoldi. Dashboarddagi Export holatidan davom eting.');
  };

  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(!review?.canPublish||saving)return;
    const data=new FormData(event.currentTarget),mode=String(data.get('mode')??'online') as 'online'|'pdf'|'mock';
    const publish=data.get('publish')==='on'&&mode!=='pdf';
    const classId=String(data.get('classId')??'');
    const title=String(data.get('title')??'').trim();
    const dueAt=String(data.get('dueAt')??'');
    const timeLimit=String(data.get('timeLimitMin')??'');
    const instructions=String(data.get('instructions')??'').trim();
    setSaving(true);setError('');setExportItem(null);
    try{
      const created=await api<CreatedAssignment>(`/selections/${selectionId}/assignment`,{
        method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({
          classId,title,mode,publish,instructions:instructions||undefined,
          dueAt:dueAt?new Date(dueAt).toISOString():undefined,timeLimitMin:timeLimit?Number(timeLimit):undefined,
        }),
      });
      setResult(created);
      if(mode==='pdf'){
        const kind=data.get('includeScheme')==='on'?'combined':'question_paper';
        const exp=await api<ExportItem>('/exports',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({kind,refTable:'assignments',refId:created.id})});
        setExportItem(exp);
        // Best effort: on environments with the opportunistic runner this starts immediately.
        await api('/jobs/run-once',{method:'POST'}).catch(()=>null);
        await pollExport(exp.id);
      }
    }catch(cause){setError(errorMessage(cause,'Assignment yaratilmadi.'))}finally{setSaving(false)}
  };

  if(loading)return <main className="handoff-state">Handoff tayyorlanmoqda…</main>;
  if(error&&!review)return <main className="handoff-state"><h1>Assignment / PDF</h1><p>{error}</p><button onClick={()=>{window.location.hash='question-bank'}}>Savol bankiga qaytish</button></main>;

  return <main className="handoff-page">
    <header className="handoff-header"><button onClick={()=>{window.location.hash='question-bank'}}>← Savol bankiga</button><div><strong>Selection handoff</strong><span>{user?.fullName}</span></div><ThemeToggle className="handoff-theme-toggle" /><span className={review?.canPublish?'ready':'blocked'}>{review?.canPublish?'Preflight tayyor':'Dependency bloklangan'}</span></header>
    <div className="handoff-layout">
      <section className="handoff-summary">
        <div className="handoff-title"><span>CAMBRIDGE 9618</span><h1>Tanlangan savollar</h1><p>Fresh numbering va original Cambridge manba raqamlari assignment snapshotida saqlanadi.</p></div>
        <div className="handoff-stats"><div><small>Qismlar</small><strong>{review?.items.length??0}</strong></div><div><small>Baholanadi</small><strong>{review?.items.filter(i=>i.role==='graded').length??0}</strong></div><div><small>Kontekst</small><strong>{review?.items.filter(i=>i.role==='context_only').length??0}</strong></div><div><small>Jami</small><strong>{review?.totalMarks??0} ball</strong></div></div>
        <div className="handoff-items">{review?.items.map((item,index)=><article key={`${item.freshRef}-${index}`} className={item.role}><div><strong>{item.freshRef}</strong><span>{item.role==='graded'?`${item.effectiveMarks} ball`:'Context'}</span></div><small>{item.sourceRef}</small></article>)}</div>
        {review?.dependencyIssues.length?<div className="handoff-issues">{review.dependencyIssues.map((issue,index)=><p className={issue.severity} key={index}><strong>{issue.dependsOnRef}</strong> · {issue.questionRef}</p>)}</div>:<div className="handoff-ok">✓ Majburiy dependencylar qondirilgan.</div>}
      </section>

      <aside className="handoff-form-card">
        <h2>Natija turi</h2>
        <form onSubmit={submit}>
          <label>Sinf<select name="classId" required defaultValue=""><option value="" disabled>Tanlang</option>{classes.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Nomi<input name="title" required minLength={3} maxLength={120} defaultValue="Cambridge 9618 practice"/></label>
          <label>Turi<select name="mode" defaultValue="online"><option value="online">Online assignment</option><option value="mock">Mock exam</option><option value="pdf">PDF worksheet</option></select></label>
          <label>Ko‘rsatma<textarea name="instructions" rows={3} maxLength={5000} placeholder="Ixtiyoriy"/></label>
          <div className="handoff-two"><label>Muddat<input name="dueAt" type="datetime-local"/></label><label>Vaqt (min)<input name="timeLimitMin" type="number" min={1} max={300}/></label></div>
          <label className="handoff-check"><input name="publish" type="checkbox"/><span>Online/mock’ni darhol nashr qilish</span></label>
          <label className="handoff-check"><input name="includeScheme" type="checkbox"/><span>PDF’da mark scheme ham bo‘lsin</span></label>
          <button disabled={saving||!review?.canPublish||!classes.length}>{saving?'Yaratilmoqda…':'Assignment / PDF yaratish'}</button>
        </form>
        {error&&<div className="handoff-error">{error}</div>}
        {result&&<div className="handoff-result"><strong>✓ {result.title}</strong><span>{result.totalMarks} ball · {result.gradedCount} graded · {result.contextOnlyCount} context</span><small>{result.mode==='pdf'?(exportItem?.status==='succeeded'?'PDF tayyor va yuklandi.':`PDF: ${exportItem?.status??'tayyorlanmoqda'}`):(result.publishedAt?'Nashr qilindi.':'Draft yaratildi.')}</small></div>}
        <p className="handoff-note">Storage-only diagramlar hali PDF ichiga embed qilinmagan bo‘lsa eksport ataylab to‘xtaydi; incomplete worksheet chiqarilmaydi.</p>
      </aside>
    </div>
  </main>;
}
