import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type ClassItem, type User } from '../lib/api';
import './assessment-center.css';

type Answer = number|null;
type Question = {id?:string;sourceNumber?:number;position?:number;prompt:string;options:string[];
  correctIndex:Answer;topic:string;maxMarks:number;choiceIndex?:Answer};
type Package = {schemaVersion?:number;title:string;sourceFilename?:string;
  courseCode:'school'|'0478'|'9618';gradeLabel:string;
  kind:'practice'|'diagnostic'|'monitoring'|'summative';
  durationMinutes:number;questions:Question[]};
type TeacherTest = {id:string;title:string;courseCode:string;gradeLabel:string;kind:string;
  status:string;durationMinutes:number;questionCount:number;unkeyedCount:number;
  submittedCount:number;sourceFilename?:string};
type StudentTest = {id:string;title:string;courseCode:string;gradeLabel:string;kind:string;
  durationMinutes:number;questionCount:number;attemptId:string|null;
  submittedAt:string|null;score:number|null;maxScore:number|null;releaseAnswers:boolean};
type TestDetail = {id:string;title:string;course_code:string;grade_label:string;
  kind:string;status:string;release_answers:boolean;questions:Question[];classIds:string[]};
type Attempt = {id:string;title:string;testId:string;kind:string;deadlineAt:string;serverNow:string;
  submittedAt:string|null;score:number|null;maxScore:number|null;
  questions:Question[]};
type StudentRow = {studentId:string;name:string;status:string;score:number|null;
  maxScore:number|null;percent:number|null;submittedAt:string|null};
type TopicRow = {topic:string;maxMarks:number;earnedMarks:number;percent:number|null;
  questions?:number;students?:number};
type Report = {test:{id:string;title:string;kind:string;courseCode:string;gradeLabel:string};
  students:StudentRow[];topics:TopicRow[];
  questions:Array<{number:number;topic:string;prompt:string;submitted:number;answered:number;correct:number}>};
type Profile = {studentId:string;averagePercent:number|null;tests:Array<{
  testId:string;title:string;kind:string;submittedAt:string;score:number;maxScore:number;percent:number|null
}>;topics:TopicRow[]};
const KINDS=[['practice','Practice'],['diagnostic','Diagnostic'],['monitoring','Monitoring'],['summative','Summative']] as const;
const emptyQuestion=():Question=>({prompt:'',options:['','','',''],correctIndex:null,topic:'Unclassified',maxMarks:1});
const emptyPackage=():Package=>({title:'',courseCode:'school',gradeLabel:'Grade 9',
  kind:'diagnostic',durationMinutes:20,questions:[emptyQuestion()]});
const msg=(cause:unknown)=>cause instanceof Error?cause.message:'So‘rov bajarilmadi.';
function validatePackage(input:unknown):Package{
  if(!input||typeof input!=='object')throw Error('Faylda test ma’lumotlari yo‘q.');
  const x=input as Record<string,unknown>;
  if(!Array.isArray(x.questions)||x.questions.length<1||x.questions.length>100)
    throw Error('1–100 ta savol kerak.');
  const questions:Question[]=x.questions.map((raw,index)=>{
    const q=raw as Record<string,unknown>;
    if(typeof q.prompt!=='string'||!q.prompt.trim()||
      !Array.isArray(q.options)||q.options.length!==4||
      q.options.some(option=>typeof option!=='string'||!option.trim()))
      throw Error((index+1)+'-savol matni yoki 4 ta variant to‘liq emas.');
    if(q.correctIndex!==null&&q.correctIndex!==undefined&&
      (typeof q.correctIndex!=='number'||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>3))
      throw Error((index+1)+'-savolda javob kaliti noto‘g‘ri.');
    return {prompt:q.prompt,options:q.options as string[],
      correctIndex:q.correctIndex===undefined?null:q.correctIndex as Answer,
      topic:typeof q.topic==='string'&&q.topic.trim()?q.topic:'Unclassified',
      maxMarks:typeof q.maxMarks==='number'?q.maxMarks:1,
      sourceNumber:typeof q.sourceNumber==='number'?q.sourceNumber:index+1};
  });
  return {title:String(x.title||'Import qilingan test').slice(0,160),
    courseCode:['school','0478','9618'].includes(String(x.courseCode))
      ?x.courseCode as Package['courseCode']:'school',
    gradeLabel:String(x.gradeLabel??'').slice(0,48),
    kind:['practice','diagnostic','monitoring','summative'].includes(String(x.kind))
      ?x.kind as Package['kind']:'diagnostic',
    durationMinutes:Number(x.durationMinutes)||30,
    sourceFilename:typeof x.sourceFilename==='string'?x.sourceFilename:undefined,
    questions};
}
const percent=(n:number|null)=>n===null?'—':n+'%';
const time=(date:string)=>new Date(date).toLocaleString('uz-UZ');

function TopicBars({rows}:{rows:TopicRow[]}){
  return <div className="ac-topic-list">{rows.length?rows.map(row=><div className="ac-topic" key={row.topic}>
    <div className="ac-topic-head"><span>{row.topic}</span><b>{percent(row.percent)}</b></div>
    <div className="ac-meter" role="meter" aria-label={row.topic} aria-valuemin={0}
      aria-valuemax={100} aria-valuenow={row.percent??0}>
      <span style={{width:(row.percent??0)+'%'}}/></div>
    <small>{row.earnedMarks}/{row.maxMarks} ball · {row.questions??row.students??0} dalil</small>
  </div>):<p className="ac-muted">Hali topshirilgan test yo‘q.</p>}</div>;
}
function StudentProfile({studentId,onBack}:{studentId:string;onBack:()=>void}){
  const [profile,setProfile]=useState<Profile|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{let live=true;
    void api<{data:Profile}>(studentId==='self'?'/assessment-center/profile':
      '/assessment-center/students/'+studentId+'/profile')
      .then(r=>{if(live)setProfile(r.data);}).catch(e=>{if(live)setError(msg(e));});
    return()=>{live=false;};},[studentId]);
  const change=profile&&profile.tests.length>1&&profile.tests[0]?.percent!=null&&profile.tests.at(-1)?.percent!=null
    ?profile.tests[0]!.percent!-profile.tests.at(-1)!.percent!:null;
  return <section className="ac-panel" aria-label="O‘zlashtirish profili">
    <button type="button" className="ac-link" onClick={onBack}>← Testlarga qaytish</button>
    <h2>Individual o‘zlashtirish</h2>{error&&<p role="alert" className="ac-error">{error}</p>}
    {!profile?<p>Ma’lumotlar yuklanmoqda…</p>:<>
      <div className="ac-metrics"><div><strong>{percent(profile.averagePercent)}</strong><span>O‘rtacha natija</span></div>
        <div><strong>{profile.tests.length}</strong><span>Topshirilgan test</span></div>
        <div><strong>{change==null?'—':(change>0?'+':'')+change+' pp'}</strong><span>Birinchi–so‘nggi farq</span></div></div>
      <h3>Mavzu bo‘yicha ko‘rsatkichlar</h3><TopicBars rows={profile.topics}/>
      <h3>Testlar tarixi</h3><div className="ac-table-wrap"><table><thead><tr><th>Test</th><th>Tur</th>
        <th>Ball</th><th>Natija</th><th>Sana</th></tr></thead>
        <tbody>{profile.tests.map(item=><tr key={item.testId}>
          <td>{item.title}</td><td>{item.kind}</td><td>{item.score}/{item.maxScore}</td>
          <td>{percent(item.percent)}</td><td>{time(item.submittedAt)}</td>
        </tr>)}</tbody></table></div>
      <p className="ac-muted">Natijalar testlarning birinchi mustaqil urinishlaridan olingan.
        Turli qiyinchilikdagi testlar orasidagi foiz farqi avtomatik ravishda mastery deb hisoblanmaydi.</p>
    </>}
  </section>;
}

function AttemptWorkspace({test,onExit}:{test:Attempt;onExit:()=>void}){
  const [attempt,setAttempt]=useState(test),[index,setIndex]=useState(0);
  const [clock,setClock]=useState(Date.now());
  const [offset]=useState(()=>new Date(test.serverNow).getTime()-Date.now());
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
  const remaining=Math.max(0,Math.ceil((new Date(attempt.deadlineAt).getTime()-clock-offset)/1000));
  const submitted=Boolean(attempt.submittedAt);
  useEffect(()=>{const id=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(id);},[]);
  const finish=useCallback(async()=>{
    if(busy||attempt.submittedAt)return;
    setBusy(true);setError('');
    try{const r=await api<{data:Attempt}>('/assessment-center/attempts/'+attempt.id+'/submit',
      {method:'POST'});setAttempt(r.data);}
    catch(e){setError(msg(e));}finally{setBusy(false);}
  },[attempt.id,attempt.submittedAt,busy]);
  useEffect(()=>{if(!submitted&&!remaining&&!busy)void finish();},[submitted,remaining,busy,finish]);
  async function choose(q:Question,choiceIndex:number){
    if(busy||submitted||!remaining||!q.id)return;
    setBusy(true);setSaved('');setError('');
    try{
      await api('/assessment-center/attempts/'+attempt.id+'/answers/'+q.id,
        {method:'PUT',body:JSON.stringify({choiceIndex})});
      setAttempt(current=>({...current,questions:current.questions.map(item=>
        item.id===q.id?{...item,choiceIndex}:item)}));
      setSaved('Javob serverda saqlandi ✓');
    }catch(e){setError('Javob saqlanmadi: '+msg(e));}finally{setBusy(false);}
  }
  const q=attempt.questions[index];
  const answered=attempt.questions.filter(x=>x.choiceIndex!==null&&x.choiceIndex!==undefined).length;
  return <section className="ac-panel ac-attempt">
    <div className="ac-between"><button type="button" className="ac-link" onClick={onExit}>← Testlar</button>
      {!submitted&&<strong className={'ac-timer'+(remaining<=60?' is-urgent':'')}>⏱ {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</strong>}</div>
    <p className="ac-eyebrow">{attempt.kind} · TEST</p><h2>{attempt.title}</h2>
    {error&&<p role="alert" className="ac-error">{error}</p>}
    {submitted?<div className="ac-complete"><h3>Test yakunlandi</h3>
      <strong>{attempt.score}/{attempt.maxScore} ball</strong>
      <p>Birinchi urinish natijasi saqlandi. Javob kaliti faqat o‘qituvchi ruxsat bergan testlarda ko‘rsatiladi.</p>
      <button type="button" className="ac-primary" onClick={onExit}>Bosh sahifaga qaytish</button>
      {attempt.questions.some(q=>q.correctIndex!==undefined)&&<div className="ac-review">
        {attempt.questions.map(item=><p key={item.id}>#{item.position}: {item.choiceIndex==null?'Javobsiz':String.fromCharCode(65+item.choiceIndex)}
          {' · To‘g‘ri: '+String.fromCharCode(65+Number(item.correctIndex))}</p>)}
      </div>}
    </div>:q?<><div className="ac-progress"><div className="ac-between"><span>Savol {index+1}/{attempt.questions.length}</span>
        <span>{answered} ta javob saqlangan</span></div><progress value={answered} max={attempt.questions.length}/></div>
      <article className="ac-question"><small>{q.topic}</small><h3>{q.prompt}</h3>
        <div className="ac-options">{q.options.map((option,i)=><label className={'ac-choice'+(q.choiceIndex===i?' is-selected':'')} key={i}>
          <input type="radio" name={'question-'+q.id} checked={q.choiceIndex===i}
            disabled={busy||!remaining} onChange={()=>{void choose(q,i);}}/>
          <b>{String.fromCharCode(65+i)}</b><span>{option}</span>
        </label>)}</div></article>
      {saved&&<p role="status" className="ac-success">{saved}</p>}
      <div className="ac-between ac-controls"><button type="button" disabled={index===0}
        onClick={()=>{setSaved('');setIndex(n=>n-1);}}>← Oldingi</button>
        <button type="button" disabled={index===attempt.questions.length-1}
          onClick={()=>{setSaved('');setIndex(n=>n+1);}}>Keyingi →</button>
        <button type="button" className="ac-primary" disabled={busy}
          onClick={()=>{if(window.confirm('Testni yakunlaysizmi? Qayta topshirib bo‘lmaydi.'))void finish();}}>
          Yakunlash</button></div>
    </>:null}
  </section>;
}

export function AssessmentCenter({user,classes}:{user:User;classes:ClassItem[]}){
  const student=user.role==='student';
  const [tests,setTests]=useState<Array<TeacherTest|StudentTest>>([]);
  const [selected,setSelected]=useState<TestDetail|null>(null);
  const [report,setReport]=useState<Report|null>(null);
  const [profileId,setProfileId]=useState<string|null>(null);
  const [attempt,setAttempt]=useState<Attempt|null>(null);
  const [draft,setDraft]=useState<Package|null>(null);
  const [targetIds,setTargetIds]=useState<string[]>([]);
  const [releaseAnswers,setReleaseAnswers]=useState(false);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const load=useCallback(async()=>{setLoading(true);
    try{const r=await api<{data:Array<TeacherTest|StudentTest>}>('/assessment-center');setTests(r.data);}
    catch(e){setError(msg(e));}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);

  async function importFile(file:File){
    setError('');setSuccess('');
    try{const data=validatePackage(JSON.parse(await file.text()));
      setDraft({...data,sourceFilename:data.sourceFilename??file.name});setSelected(null);setReport(null);}
    catch(e){setError('Import xatosi: '+msg(e));}
  }
  function editQuestion(index:number,update:Partial<Question>){
    setDraft(current=>current?{...current,questions:current.questions.map((q,i)=>i===index?{...q,...update}:q)}:null);
  }
  async function createTest(){
    if(!draft)return;setBusy(true);setError('');
    try{const data=validatePackage(draft);
      const result=await api<{data:{id:string}}>('/assessment-center',{method:'POST',
        body:JSON.stringify(data)});
      setDraft(null);setSuccess('Test draft holatida saqlandi. Javob kalitlarini tekshirib, sinfga nashr qiling.');
      await load();await openTest(result.data.id);
    }catch(e){setError(msg(e));}finally{setBusy(false);}
  }
  async function openTest(id:string){
    setError('');setSelected(null);setReport(null);setDraft(null);setProfileId(null);
    try{const r=await api<{data:TestDetail}>('/assessment-center/tests/'+id);
      setSelected(r.data);setTargetIds(r.data.classIds??[]);setReleaseAnswers(r.data.release_answers);}
    catch(e){setError(msg(e));}
  }
  async function saveCorrectIndex(question:Question,correctIndex:number|null){
    if(!selected||!question.id)return;
    setBusy(true);setError('');
    try{
      await api('/assessment-center/tests/'+selected.id+'/questions/'+question.id,{
        method:'PATCH',body:JSON.stringify({correctIndex}),
      });
      await openTest(selected.id);
      setSuccess('Javob kaliti saqlandi.');
    }catch(e){setError(msg(e));}finally{setBusy(false);}
  }
  async function publish(){
    if(!selected)return;setBusy(true);setError('');
    try{await api('/assessment-center/tests/'+selected.id+'/publish',{method:'POST',
      body:JSON.stringify({classIds:targetIds,releaseAnswers})});
      setSuccess('Test nashr qilindi — tanlangan sinf o‘quvchilarida paydo bo‘ladi.');
      await openTest(selected.id);await load();
    }catch(e){setError(msg(e));}finally{setBusy(false);}
  }
  async function openReport(){
    if(!selected)return;setError('');
    try{const r=await api<{data:Report}>('/assessment-center/tests/'+selected.id+'/report');
      setReport(r.data);}catch(e){setError(msg(e));}
  }
  async function start(id:string){
    setBusy(true);setError('');
    try{const r=await api<{data:Attempt}>('/assessment-center/tests/'+id+'/start',{method:'POST'});
      setAttempt(r.data);}catch(e){setError(msg(e));}finally{setBusy(false);}
  }
  const pending=selected?.questions.filter(q=>q.correctIndex===null).length??0;
  const overall=useMemo(()=>report?.students.filter(s=>s.percent!==null)??[],[report]);
  const average=overall.length?Math.round(overall.reduce((s,r)=>s+Number(r.percent),0)/overall.length):null;
  function downloadCsv(){
    if(!report)return;
    const clean=(v:unknown)=>'"'+String(v??'').replaceAll('"','""')+'"';
    const rows=[['O‘quvchi','Holat','Ball','Jami','Foiz','Topshirgan vaqt'],
      ...report.students.map(s=>[s.name,s.status,s.score,s.maxScore,s.percent,s.submittedAt])];
    const csv='\uFEFF'+rows.map(row=>row.map(clean).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='assessment-'+report.test.id+'.csv';
    document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
  }
  if(attempt)return <main className="assessment-center">
    <AttemptWorkspace test={attempt} onExit={()=>{setAttempt(null);void load();}}/></main>;
  if(profileId)return <main className="assessment-center">
    <StudentProfile studentId={profileId} onBack={()=>setProfileId(null)}/></main>;

  return <main className="assessment-center">
    <header className="ac-header"><div><p className="ac-eyebrow">CAMBRIDGE · ASSESSMENT STUDIO</p>
      <h1>Test & Assessment Center</h1>
      <p>{student?'Belgilangan testlarni mustaqil ishlang va bilim rivojlanishingizni kuzating.':
        'Testlarni boshqaring, natijalarni solishtiring va o‘quvchi kesimida zaif mavzularni toping.'}</p>
    </div>{!student&&<button className="ac-primary" type="button" onClick={()=>{setDraft(emptyPackage());setSelected(null);setReport(null);}}>
      + Test yaratish</button>}</header>
    {error&&<p role="alert" className="ac-error">{error}</p>}
    {success&&<p role="status" className="ac-success">{success}</p>}
    {student&&<div className="ac-actions"><button type="button" className="ac-secondary"
      onClick={()=>setProfileId('self')}>📈 Mening o‘zlashtirishim</button></div>}
    {!student&&draft&&<section className="ac-panel">
      <div className="ac-between"><h2>Testni tahrirlash</h2>
        <button type="button" className="ac-link" onClick={()=>setDraft(null)}>Bekor qilish</button></div>
      <div className="ac-form-grid">
        <label>Test nomi<input value={draft.title}
          onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
        <label>Kurs<select value={draft.courseCode}
          onChange={e=>setDraft({...draft,courseCode:e.target.value as Package['courseCode']})}>
          <option value="school">Grade 5–9</option><option value="0478">0478 · IGCSE</option>
          <option value="9618">9618 · A Level</option></select></label>
        <label>Sinfi / Paper<input value={draft.gradeLabel}
          onChange={e=>setDraft({...draft,gradeLabel:e.target.value})}/></label>
        <label>Test turi<select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value as Package['kind']})}>
          {KINDS.map(([value,label])=><option value={value} key={value}>{label}</option>)}
          </select></label>
        <label>Vaqt (daq.)<input type="number" min={1} max={240} value={draft.durationMinutes}
          onChange={e=>setDraft({...draft,durationMinutes:Number(e.target.value)})}/></label>
      </div>
      <div className="ac-between"><h3>Savollar ({draft.questions.length})</h3>
        <button type="button" className="ac-secondary" disabled={draft.questions.length>=100}
          onClick={()=>setDraft({...draft,questions:[...draft.questions,emptyQuestion()]})}>+ Savol</button></div>
      {draft.questions.map((q,i)=><div className="ac-editor-q" key={i}>
        <div className="ac-between"><strong>#{i+1}</strong><button type="button" className="ac-link"
          disabled={draft.questions.length<=1}
          onClick={()=>setDraft({...draft,questions:draft.questions.filter((_,j)=>j!==i)})}>Olib tashlash</button></div>
        <label>Savol matni<textarea rows={2} value={q.prompt}
          onChange={e=>editQuestion(i,{prompt:e.target.value})}/></label>
        <div className="ac-answer-grid">{q.options.map((option,j)=><label key={j}>{'ABCD'[j]} variant
          <input value={option} onChange={e=>editQuestion(i,{options:q.options.map((v,k)=>k===j?e.target.value:v)})}/></label>)}</div>
        <div className="ac-form-grid">
          <label>To‘g‘ri javob<select value={q.correctIndex??''}
            onChange={e=>editQuestion(i,{correctIndex:e.target.value===''?null:Number(e.target.value)})}>
            <option value="">Javob kaliti yo‘q</option>{'ABCD'.split('').map((letter,j)=><option value={j} key={letter}>{letter}</option>)}
          </select></label>
          <label>Mavzu<input value={q.topic} onChange={e=>editQuestion(i,{topic:e.target.value})}/></label>
          <label>Ball<input type="number" min={1} max={20} value={q.maxMarks}
            onChange={e=>editQuestion(i,{maxMarks:Number(e.target.value)})}/></label>
        </div></div>)}
      <div className="ac-between"><p>{draft.questions.filter(q=>q.correctIndex===null).length} ta javob kaliti hali berilmagan.</p>
        <button type="button" className="ac-primary" disabled={busy}
          onClick={()=>{void createTest();}}>{busy?'Saqlanmoqda…':'Draft saqlash'}</button></div>
    </section>}
    {!student&&!draft&&!selected&&<section className="ac-panel">
      <h2>Word’dan tayyorlangan testlarni import qilish</h2>
      <p>Konvertatsiya qilingan JSON test paketini yuklang yoki testni qo‘lda tuzing. Javob kaliti yo‘q
        savollar draft bo‘lib qoladi; ularni tekshirmasdan o‘quvchiga chiqarib bo‘lmaydi.</p>
      <label className="ac-import">📁 JSON test paketi
        <input type="file" accept=".json,application/json" onChange={e=>{
          const file=e.target.files?.[0];if(file)void importFile(file);e.target.value='';}}/></label>
    </section>}
    {!student&&selected&&<section className="ac-panel">
      <button type="button" className="ac-link" onClick={()=>{setSelected(null);setReport(null);}}>
        ← Barcha testlar</button>
      <div className="ac-between"><div><p className="ac-eyebrow">{selected.course_code} · {selected.kind}</p>
        <h2>{selected.title}</h2><p>{selected.questions.length} savol · {selected.status}</p></div>
        {selected.status==='published'&&<button type="button" className="ac-primary"
          onClick={()=>{void openReport();}}>Natijalarni ko‘rish</button>}</div>
      {selected.status==='draft'&&<div className="ac-publish">
        <h3>Sinfga nashr qilish</h3>
        <p className={pending?'ac-warning':'ac-success'}>
          {pending?pending+' savolda javob kaliti yo‘q. Nashr qilish bloklangan.':'Javob kalitlari to‘liq.'}</p>
        <div className="ac-class-grid">{classes.map(c=><label key={c.id}>
          <input type="checkbox" checked={targetIds.includes(c.id)}
            onChange={e=>setTargetIds(ids=>e.target.checked?[...ids,c.id]:ids.filter(x=>x!==c.id))}/>
          {c.name} {c.grade?'· Grade '+c.grade:''}</label>)}</div>
        <label><input type="checkbox" checked={releaseAnswers}
          onChange={e=>setReleaseAnswers(e.target.checked)}/> Topshirgandan keyin to‘g‘ri javoblar ko‘rinsin</label>
        <button type="button" className="ac-primary" disabled={busy||pending>0||targetIds.length===0}
          onClick={()=>{void publish();}}>Testni nashr qilish</button>
      </div>}
      {report?<div className="ac-report"><div className="ac-between">
        <h3>Sinf natijalari</h3><button type="button" className="ac-secondary" onClick={downloadCsv}>CSV yuklash</button>
      </div><div className="ac-metrics"><div><strong>{report.students.length}</strong><span>O‘quvchilar</span></div>
        <div><strong>{overall.length}</strong><span>Topshirganlar</span></div>
        <div><strong>{percent(average)}</strong><span>O‘rtacha</span></div></div>
        <h3>Mavzular bo‘yicha</h3><TopicBars rows={report.topics}/>
        <h3>O‘quvchilar natijalari</h3><div className="ac-table-wrap"><table><thead><tr>
          <th>Ism</th><th>Holat</th><th>Ball</th><th>Foiz</th><th>Profil</th>
          </tr></thead><tbody>{report.students.map(s=><tr key={s.studentId}>
            <td>{s.name}</td><td>{s.status}</td><td>{s.score??'—'}/{s.maxScore??'—'}</td>
            <td>{percent(s.percent)}</td><td><button className="ac-link" type="button"
              onClick={()=>setProfileId(s.studentId)}>Ko‘rish</button></td>
          </tr>)}</tbody></table></div>
        <h3>Eng qiyin savollar</h3><div className="ac-question-analysis">
          {[...report.questions].sort((a,b)=>(a.submitted? a.correct/a.submitted:1)-(b.submitted? b.correct/b.submitted:1))
            .slice(0,10).map(q=><p key={q.number}><b>#{q.number}</b> {q.prompt}
              <small>{q.correct}/{q.submitted} to‘g‘ri · {q.topic}</small></p>)}</div>
      </div>:<div className="ac-question-analysis"><h3>Savollar va javob kalitlari</h3>
        {selected.questions.map(q=><div className="ac-saved-q" key={q.id}>
          <p><b>#{q.position}.</b> {q.prompt}
            <small>{q.topic} · {q.maxMarks} ball · To‘g‘ri: {q.correctIndex===null?'Tekshirilmagan':'ABCD'[q.correctIndex]}</small></p>
          {selected.status==='draft'&&<label className="ac-key-editor">Javob kalitini tasdiqlash
            <select value={q.correctIndex??''} disabled={busy}
              onChange={event=>{void saveCorrectIndex(q,event.target.value===''?null:Number(event.target.value));}}>
              <option value="">Tekshirilmagan</option>
              {'ABCD'.split('').map((letter,i)=><option value={i} key={letter}>{letter} — {q.options[i]}</option>)}
            </select></label>}</div>)}</div>}
    </section>}
    {!selected&&!draft&&<section className="ac-panel">
      <h2>{student?'Menga berilgan testlar':'Testlar kutubxonasi'}</h2>
      {loading?<p>Yuklanmoqda…</p>:!tests.length?<p className="ac-muted">
        {student?'Hozircha sizga test biriktirilmagan.':'Test hali kiritilmagan. JSON paketni import qiling yoki yangi test yarating.'}
      </p>:<div className="ac-test-grid">{tests.map(t=><article className="ac-test-card" key={t.id}>
        <span className="ac-tag">{t.courseCode} · {t.kind}</span><h3>{t.title}</h3>
        <p>{t.gradeLabel} · {t.questionCount} savol · {t.durationMinutes} daqiqa</p>
        {student?<><p>{(t as StudentTest).submittedAt?'Topshirilgan':
          (t as StudentTest).attemptId?'Davom ettirish mumkin':'Yangi test'}</p>
          <button type="button" className="ac-primary" disabled={busy}
            onClick={()=>{void start(t.id);}}>
            {(t as StudentTest).submittedAt?'Natijani ko‘rish':
              (t as StudentTest).attemptId?'Davom ettirish':'Testni boshlash'}</button></>:
          <><p>{(t as TeacherTest).status} · {(t as TeacherTest).submittedCount} topshirgan
            · {(t as TeacherTest).unkeyedCount} javobsiz kalit</p>
          <button type="button" className="ac-secondary" onClick={()=>{void openTest(t.id);}}>
            Boshqarish →</button></>}
      </article>)}</div>}
    </section>}
  </main>;
}
