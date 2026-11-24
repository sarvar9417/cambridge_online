import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, type ReviewQuestion } from '../lib/api';
import './corpus.css';

type PaperState = 'reviewed' | 'needs_review' | 'running' | 'failed' | 'queued' | 'not_started';

interface CorpusPaper {
  id: string; label: string; syllabusCode: string; year: number; series: string; component: number; variant: number;
  hasMarkScheme: boolean; questions: number; leaves: number; needsReview: number; unflaggedReview: number;
  state: PaperState; error: string | null;
}

interface CorpusSummary {
  papers: CorpusPaper[];
  totals: Record<PaperState, number>;
  findings: Array<{ code: string; severity: string; open: number }>;
}

const STATE_LABEL: Record<PaperState, string> = {
  reviewed: 'Tekshirilgan',
  needs_review: 'Tekshirilmagan',
  running: 'Ishlanmoqda',
  failed: 'To‘xtagan',
  queued: 'Navbatda',
  not_started: 'Boshlanmagan',
};

const COMMAND_WORDS = [
  'State', 'Give', 'Name', 'Identify', 'Define', 'Describe', 'Explain', 'Compare',
  'Calculate', 'Complete', 'Draw', 'Write', 'Evaluate', 'Justify', 'Suggest', 'Show', 'Other',
];

/**
 * Building the corpus: which papers are in, which stopped, and what is waiting
 * to be checked.
 *
 * Moved off the single scrolling page. The review queue used to sit between the
 * class list and the grading queue, which mixed the operator's job of getting
 * papers in with the teacher's job of marking answers.
 */
export function CorpusPage() {
  const [summary,setSummary]=useState<CorpusSummary|null>(null);
  const [review,setReview]=useState<ReviewQuestion[]>([]);
  const [reviewIndex,setReviewIndex]=useState(0);
  const [finding,setFinding]=useState('');
  const [syllabus,setSyllabus]=useState('');
  const [page,setPage]=useState(0);
  const [revision,setRevision]=useState(0);
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [stateFilter,setStateFilter]=useState<PaperState|'all'>('all');
  const lock=useRef(false);
  const pageSize=50;
  useEffect(()=>{
    let cancelled=false;
    setLoading(true);setError(null);setEditing(false);
    const params=new URLSearchParams({limit:String(pageSize),offset:String(page*pageSize)});
    if(finding)params.set('findingCode',finding);
    if(syllabus)params.set('syllabusCode',syllabus);
    Promise.all([api<CorpusSummary>('/admin/corpus'),api<{data:ReviewQuestion[]}>(`/ingestion/review?${params}`)])
      .then(([corpus,queue])=>{
        if(cancelled)return;
        setSummary(corpus);setReview(queue.data);setReviewIndex(0);
        if(!queue.data.length&&page>0)setPage(value=>Math.max(0,value-1));
      }).catch(cause=>{if(!cancelled){setReview([]);setError(cause instanceof Error?cause.message:'Yuklanmadi.');}})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true};
  },[finding,syllabus,page,revision]);
  const item=review[Math.min(reviewIndex,Math.max(0,review.length-1))];
  const blocking=Boolean(item?.findings.some(f=>f.severity==='error'));
  const mutate=useCallback(async(action:()=>Promise<unknown>)=>{
    if(lock.current)return;
    lock.current=true;setBusy(true);setError(null);
    try{await action();setEditing(false);setLoading(true);setRevision(v=>v+1);window.dispatchEvent(new Event('corpus-review-changed'));}
    catch(cause){setError(cause instanceof Error?cause.message:'Qaror saqlanmadi.');}
    finally{lock.current=false;setBusy(false);}
  },[]);
  const decide=async(id:string,decision:'approved'|'rejected')=>{
    if(loading||busy||!item||item.id!==id||(decision==='approved'&&blocking))return;
    if(decision==='rejected'&&!window.confirm('Savolni rad etishni tasdiqlaysizmi?'))return;
    await mutate(()=>api(`/ingestion/review/${id}/${decision}`,{method:'POST'}));
  };
  const saveEdit=async(event:FormEvent<HTMLFormElement>,target:ReviewQuestion)=>{
    event.preventDefault();
    if(target.structured||loading||busy)return;
    const data=new FormData(event.currentTarget);
    await mutate(()=>api(`/ingestion/review/${target.id}`,{method:'PATCH',body:JSON.stringify({
      stemMd:data.get('stemMd'),marks:data.get('marks')===''?null:Number(data.get('marks')),commandWord:data.get('commandWord')||null,
    })}));
  };
  const papers=useMemo(()=>(summary?.papers??[]).filter(p=>(stateFilter==='all'||p.state===stateFilter)&&(!syllabus||p.syllabusCode===syllabus)),[summary,stateFilter,syllabus]);
  const totalReview=(summary?.papers??[]).reduce((n,p)=>n+p.needsReview,0);
  const totalUnflagged=(summary?.papers??[]).reduce((n,p)=>n+p.unflaggedReview,0);
  const findingCodes=Array.from(new Set((summary?.findings??[]).map(f=>f.code))).sort();
  const totalForSyllabus=(summary?.papers??[]).filter(p=>!syllabus||p.syllabusCode===syllabus).reduce((n,p)=>n+(finding==='__unflagged__'?p.unflaggedReview:p.needsReview),0);
  const filter=(nextFinding:string,nextSyllabus:string)=>{setFinding(nextFinding);setSyllabus(nextSyllabus);setPage(0);setEditing(false);setLoading(true)};
  const note=(item?.notes??'').includes('taxonomy_confidence')?'Mavzu tasnifini tekshirish':'Qo‘lda tekshirish';
  if (error && !summary) return <section className="cp-card"><p className="cp-error" role="alert">{error}</p><button onClick={()=>setRevision(v=>v+1)}>Qayta yuklash</button></section>;
  if (!summary) return <p className="cp-loading">Yuklanmoqda…</p>;

  return (
    <div className="cp">
      <header className="cp-head">
        <h1>Korpus</h1>
        <p>Past Paper va Mark Scheme sifati. Tekshirish navbati dastur xatolari soni emas.</p>
      </header>

      {error ? <p className="cp-error" role="alert">{error}</p> : null}

      <div className="cp-totals" role="tablist" aria-label="Holat bo‘yicha filtr">
        <button
          role="tab" aria-selected={stateFilter === 'all'}
          className={stateFilter === 'all' ? 'is-active' : ''}
          onClick={() => setStateFilter('all')}
        >
          Hammasi <b>{summary.papers.length}</b>
        </button>
        {(Object.keys(STATE_LABEL) as PaperState[])
          .filter((state) => summary.totals[state] > 0)
          .map((state) => (
            <button
              key={state} role="tab" aria-selected={stateFilter === state}
              className={`${stateFilter === state ? 'is-active' : ''} cp-state--${state}`}
              onClick={() => setStateFilter(state)}
            >
              {STATE_LABEL[state]} <b>{summary.totals[state]}</b>
            </button>
          ))}
      </div>

      <section className="cp-card">
        <h2>Tekshirish navbati · {totalReview} savol</h2>
        <div className="cp-review-summary"><span><b>{totalReview-totalUnflagged}</b> · Finding mavjud</span><span><b>{totalUnflagged}</b> · Ochiq finding yo‘q (manual/taxonomy)</span></div>
        <div className="cp-review-tools">
          <select aria-label="Syllabus bo‘yicha filtr" value={syllabus} disabled={busy} onChange={e=>filter(finding,e.target.value)}>
            <option value="">Barcha syllabus</option><option value="0478">0478</option><option value="9618">9618</option>
          </select>
          <select aria-label="Finding bo‘yicha filtr" value={finding} disabled={busy} onChange={e=>filter(e.target.value,syllabus)}>
            <option value="">Barcha sabablar</option><option value="__unflagged__">Finding yo‘q / manual</option>
            {findingCodes.map(code=><option key={code} value={code}>{code}</option>)}
          </select>
          <button disabled={busy||loading} className="cp-secondary" onClick={()=>void mutate(()=>api('/ingestion/review/undo',{method:'POST'}))}>Qarorni qaytarish</button>
          <button className="cp-secondary" disabled={busy||loading} onClick={()=>setRevision(v=>v+1)}>Yangilash</button>
        </div>
        <div className="cp-review-tools">
          <button className="cp-secondary" disabled={page===0||busy||loading} onClick={()=>setPage(v=>v-1)}>Oldingi 50</button>
          <span className="cp-counter">{review.length?page*pageSize+1:0}–{page*pageSize+review.length}{!finding||finding==='__unflagged__'? ` / ${totalForSyllabus}`:''}</span>
          <button className="cp-secondary" disabled={busy||loading||review.length<pageSize||((!finding||finding==='__unflagged__')&&(page+1)*pageSize>=totalForSyllabus)} onClick={()=>setPage(v=>v+1)}>Keyingi 50</button>
        </div>
        {loading?<p role="status">Navbat yuklanmoqda…</p>:error?<p className="cp-empty">Yangilashni bosing.</p>:review.length===0?<p className="cp-empty">Bu filtr bo‘yicha savol yo‘q.</p>:<>
            {item ? (
              <article className="cp-review" key={item.id}>
                <div className="cp-review-meta">
                  <strong>{item.display_ref} · {item.marks} ball</strong>
                  <small>{item.command_word??'—'} · {item.syllabus_code==='0478'&&item.notes?.includes('taxonomy_confidence')?'Tasnif ishonchi':'Ajratish ishonchi'} {item.extract_confidence==null?'—':Math.round(Number(item.extract_confidence)*100)+'%'}</small>
                  <small className="cp-source">{item.storage_path}</small>
                  {item.source_url&&/^https?:\/\//i.test(item.source_url)?<a href={item.source_url} target="_blank" rel="noreferrer">Asl Question Paper</a>:null}
                  {!item.findings.length?<small>{note}</small>:null}
                  {blocking?<p className="cp-error">Manba xatosi mavjud. Asl jadval yoki diagramma tiklanmaguncha tasdiqlash bloklangan.</p>:null}
                </div>

                {editing ? (
                  <form className="cp-review-edit" onSubmit={(event) => saveEdit(event, item)}>
                    <label>Savol matni
                      <textarea name="stemMd" defaultValue={item.stem_md} minLength={10} required />
                    </label>
                    <label>Ball
                      <input name="marks" type="number" min="0" max="100" defaultValue={item.marks ?? ''} />
                    </label>
                    <label>Command word
                      <select name="commandWord" defaultValue={item.command_word ?? ''}>
                        <option value="">Tanlanmagan</option>
                        {COMMAND_WORDS.map((word) => <option key={word}>{word}</option>)}
                      </select>
                    </label>
                    <div className="cp-review-actions">
                      <button disabled={busy}>Saqlash</button>
                      <button type="button" className="cp-secondary" onClick={() => setEditing(false)}>Bekor qilish</button>
                    </div>
                  </form>
                ) : (
                  <p className="cp-stem">{item.stem_md}</p>
                )}

                {item.findings.map((f) => (
                  <span className={`cp-finding cp-finding--${f.severity}`} key={f.id ?? `${f.code}-${f.message}`}>
                    {f.code} · {f.message}
                  </span>
                ))}

                <div className="cp-review-actions">
                  <button
                    className="cp-secondary" disabled={busy||editing||reviewIndex === 0}
                    onClick={() => setReviewIndex((value) => Math.max(0, value - 1))}
                  >←</button>
                  <button className="cp-secondary" disabled={busy||item.structured} title={item.structured?'Strukturali savol asl manbadan tiklanishi kerak':undefined} onClick={() => setEditing(true)}>Tahrirlash</button>
                  <button disabled={busy||blocking||editing} onClick={() => decide(item.id, 'approved')}>Tasdiqlash</button>
                  <button className="cp-danger" disabled={busy||editing} onClick={() => decide(item.id, 'rejected')}>Rad etish</button>
                  <button
                    className="cp-secondary" disabled={busy||editing||reviewIndex >= review.length - 1}
                    onClick={() => setReviewIndex((value) => Math.min(review.length - 1, value + 1))}
                  >→</button>
                </div>
                <p className="cp-hint">{reviewIndex+1} / {review.length} · Tasdiqlashdan oldin asl manba va mavzuni tekshiring.</p>
              </article>
            ) : null}
          </>
        )}
      </section>

      {summary.findings.length ? (
        <section className="cp-card">
          <h2>Ochiq findinglar</h2>
          <p className="cp-sub">Qaysi qoida ishlayotgani — bitta tizimli muammomi yoki ko‘p turlimi</p>
          <div className="cp-findings">
            {summary.findings.map((f) => (
              <span key={f.code} className={`cp-finding cp-finding--${f.severity}`}>
                {f.code} <b>{f.open}</b>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="cp-card">
        <h2>Paperlar</h2>
        <p className="cp-sub">{papers.length} ta ko‘rsatilmoqda</p>
        <div className="cp-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Paper</th><th>MS</th><th>Savol</th><th>Leaf</th><th>Tekshirilmagan</th><th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {papers.map((paper) => (
                <tr key={paper.id} className={`cp-row--${paper.state}`}>
                  <td>{paper.syllabusCode} · {paper.label}</td>
                  <td>{paper.hasMarkScheme ? '✓' : '—'}</td>
                  <td className="num">{paper.questions || '—'}</td>
                  <td className="num">{paper.leaves || '—'}</td>
                  <td className="num">{paper.needsReview || '—'}</td>
                  <td>
                    <span className={`cp-pill cp-pill--${paper.state}`}>{STATE_LABEL[paper.state]}</span>
                    {paper.error ? <small className="cp-row-error">{paper.error}</small> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
