#!/usr/bin/env python3
from __future__ import annotations
import collections,json,os,re,subprocess,tempfile
from pathlib import Path
import gdown,psycopg2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

REF=re.compile(r'^\s*(\d{1,2})(\([a-z]\))?(\([ivx]+\))?\s+(?:(.*?)\s+)?(\d+)\s*$')
PREF=re.compile(r'9618/\d+/(?:M/J|O/N)/\d+')
ROM={'i','ii','iii','iv','v','vi','vii','viii','ix','x'}

def did(u):
 m=re.search(r'/d/([^/]+)',u or '') or re.search(r'[?&]id=([^&]+)',u or '')
 if not m: raise ValueError('bad_drive_url')
 return m.group(1)
def dl(u,p):
 if not gdown.download(id=did(u),output=str(p),quiet=True,fuzzy=True) or p.stat().st_size<1000: raise RuntimeError('download_failed')
def text(pdf,txt):
 r=subprocess.run(['pdftotext','-layout',str(pdf),str(txt)],capture_output=True,text=True)
 if r.returncode: raise RuntimeError('pdftotext:'+r.stderr[-300:])
def msparse(p):
 ls=p.read_text(errors='ignore').splitlines(); cand=[]
 for i,l in enumerate(ls):
  s=re.sub(r'\s+',' ',l).strip(); m=REF.match(s)
  if not m: continue
  top=int(m.group(1)); marks=int(m.group(5)); a=m.group(2); ro=m.group(3)
  if top>30 or marks>20: continue
  path=(str(top)+(a or '')+(ro or '')).replace('(',' .').replace(')','').replace(' ','')
  cand.append((i+1,path,top,a,ro,marks))
 out=[]; cur=0; seen=set()
 for line,path,top,a,ro,marks in cand:
  if a or ro:
   if top<cur or top>cur+1: continue
   if top==cur+1: cur=top
  else:
   if top!=cur+1: continue
   cur=top
  if path in seen: continue
  seen.add(path); out.append({'line':line,'path':path,'marks':marks})
 sub={int(x['path'].split('.')[0]) for x in out if '.' in x['path']}
 out=[x for x in out if not('.' not in x['path'] and int(x['path']) in sub)]
 for j,x in enumerate(out):
  a=x['line']-1; b=(out[j+1]['line']-1 if j+1<len(out) else len(ls)); z=[]
  for l in ls[a:b]:
   s=re.sub(r'\s+',' ',l).strip()
   if s and 'Cambridge International AS & A Level' not in s and not s.startswith('©') and not s.startswith('Question Answer Marks'): z.append(s)
  x['guidance']='\n'.join(z)
 return out
def qstarts(p,ms):
 ls=p.read_text(errors='ignore').splitlines(); by=collections.defaultdict(list)
 for e in ms: by[int(e['path'].split('.')[0])].append(e['path'])
 out={}; prev=-1
 for q in sorted(by):
  has=any('.' in x for x in by[q]); c=[]
  for i,l in enumerate(ls):
   if i<=prev: continue
   m=re.match(rf'^\s*{q}\s+(.+)',l)
   if not m: continue
   r=m.group(1).strip()
   if not r or '9618/' in r or not(r[0].isupper() or r.startswith('(')): continue
   if has and not any(re.match(r'^\s*\(a\)\s+',x) for x in ls[i:min(len(ls),i+150)]): continue
   c.append(i)
  if c: out[q]=c[0]; prev=c[0]
 return out
def qparse(p,ms):
 ls=p.read_text(errors='ignore').splitlines(); by=collections.defaultdict(list)
 for e in ms: by[int(e['path'].split('.')[0])].append(e['path'])
 ss=qstarts(p,ms); out={}
 for q in sorted(by):
  if q not in ss: continue
  start=ss[q]; nxt=[ss[k] for k in ss if k>q and ss[k]>start]; end=min(nxt) if nxt else len(ls); reg=ls[start:end]; paths=by[q]
  mt=re.match(rf'^\s*{q}\s+(.*)',reg[0]); ctx=[mt.group(1).strip()] if mt else []
  for l in reg[1:]:
   if re.match(r'^\s*\([a-z]\)\s+',l): break
   s=re.sub(r'\s+',' ',l).strip()
   if s and not PREF.search(s) and not s.startswith(('©','*')): ctx.append(s)
  ctx=re.sub(r'\s+',' ',' '.join(ctx)).strip(); starts=[]; cur=None
  for i,l in enumerate(reg):
   s=l.strip(); m=re.match(rf'^{q}\s+\(([a-z])\)\s*(?:\(([ivx]+)\))?\s*(.*)',s)
   if m:
    cur=m.group(1); path=f'{q}.{cur}'+(f'.{m.group(2)}' if m.group(2) else '')
    if path in paths: starts.append((i,path,m.group(3)))
    continue
   m=re.match(r'^\(([^)]+)\)\s*(.*)',s)
   if not m: continue
   tok,rest=m.group(1),m.group(2)
   if tok in 'abcdefgh':
    cur=tok; rr=re.match(r'^\(([ivx]+)\)\s*(.*)',rest)
    if rr and f'{q}.{cur}.{rr.group(1)}' in paths: starts.append((i,f'{q}.{cur}.{rr.group(1)}',rr.group(2))); continue
    if f'{q}.{tok}' in paths: starts.append((i,f'{q}.{tok}',rest)); continue
   if tok in ROM and cur and f'{q}.{cur}.{tok}' in paths: starts.append((i,f'{q}.{cur}.{tok}',rest))
  if str(q) in paths: starts.insert(0,(0,str(q),mt.group(1).strip() if mt else ''))
  uniq=[]; seen=set()
  for x in sorted(starts):
   if x[1] not in seen: uniq.append(x);seen.add(x[1])
  for j,(i,path,first) in enumerate(uniq):
   stop=uniq[j+1][0] if j+1<len(uniq) else len(reg); z=[first] if first else []
   for l in reg[i+1:stop]:
    s=re.sub(r'\s+',' ',l).strip()
    if not s or PREF.search(s) or s.startswith(('©','*','BLANK PAGE')): continue
    z.append(re.sub(r'\.{10,}',' ',s))
   st=re.sub(r'\s+',' ',' '.join(z)).strip(); mark=next(x['marks'] for x in ms if x['path']==path); mm=list(re.finditer(r'\[\s*(\d+)\s*\]',st))
   if mm: st=st[:next((x for x in mm if int(x.group(1))==mark),mm[0]).end()]
   if path!=str(q) and ctx: st=(ctx[:800]+' '+st).strip()
   out[path]=st
 return out
def kind(c,s):
 t=s.lower()
 if c==4:return 'image' if 'screenshot' in t or 'test your program' in t else 'code'
 if 'pseudocode' in t and any(k in t for k in ['complete','write','procedure','function']):return 'pseudocode'
 if any(k in t for k in ['logic circuit','flowchart','karnaugh','k-map','structure chart']):return 'diagram'
 if 'table' in t:return 'table'
 return 'text'
def model(rows):
 if len(rows)<15 or len(set(y for _,y in rows))<2:return None
 m=Pipeline([('v',TfidfVectorizer(ngram_range=(1,2),max_features=45000,sublinear_tf=True,strip_accents='unicode')),('m',LogisticRegression(max_iter=1200,class_weight='balanced',C=4))]);m.fit([x for x,_ in rows],[y for _,y in rows]);return m
def tax(cur,sid,cid):
 cur.execute('select st.id,st.code from subtopics st join topics t on t.id=st.topic_id where t.syllabus_id=%s and exists(select 1 from component_subtopics x where x.component_id=%s and x.subtopic_id=st.id)',(sid,cid)); sub={c:i for i,c in cur.fetchall()}
 cur.execute('select lo.id,lo.code,st.code from learning_objectives lo join subtopics st on st.id=lo.subtopic_id join topics t on t.id=st.topic_id where t.syllabus_id=%s and exists(select 1 from component_learning_objectives x where x.component_id=%s and x.lo_id=lo.id)',(sid,cid)); lo={(s,c):i for i,c,s in cur.fetchall()};return sub,lo
def paths(leaves):
 z=set()
 for p in leaves:
  a=p.split('.')
  for i in range(1,len(a)+1):z.add('.'.join(a[:i]))
 return sorted(z,key=lambda p:(len(p.split('.')),p))
def main():
 db=os.environ['DATABASE_URL']; conn=psycopg2.connect(db,sslmode=os.getenv('DB_SSL_MODE','require')); conn.autocommit=False
 with conn.cursor() as cur:
  cur.execute("select c.number,q.path,q.stem_md,coalesce(ms.guidance_md,''),st.code from questions q join source_papers sp on sp.id=q.source_paper_id join components c on c.id=q.component_id join question_subtopics qs on qs.question_id=q.id and qs.is_primary join subtopics st on st.id=qs.subtopic_id left join mark_schemes ms on ms.question_id=q.id where q.marks is not null and sp.year between 2021 and 2025")
  tr=collections.defaultdict(list)
  for c,p,s,g,y in cur.fetchall():tr[c].append((f'PATH {p} {s or ""} {g or ""}',y))
  mods={c:model(r) for c,r in tr.items()}
  cur.execute("select st.code,q.path,q.stem_md,coalesce(ms.guidance_md,''),lo.code from questions q join source_papers sp on sp.id=q.source_paper_id join question_subtopics qs on qs.question_id=q.id and qs.is_primary join subtopics st on st.id=qs.subtopic_id join question_learning_objectives ql on ql.question_id=q.id join learning_objectives lo on lo.id=ql.lo_id left join mark_schemes ms on ms.question_id=q.id where q.marks is not null and sp.year between 2021 and 2025")
  ltr=collections.defaultdict(list)
  for st,p,s,g,y in cur.fetchall():ltr[st].append((f'PATH {p} {s or ""} {g or ""}',y))
  lmods={s:model(r) for s,r in ltr.items()}
  wh=["q.kind='QP'","not exists(select 1 from questions x where x.source_paper_id=q.id)"];pa=[]
  if os.getenv('BACKFILL_YEAR'):wh+=['q.year=%s'];pa+=[int(os.getenv('BACKFILL_YEAR'))]
  if os.getenv('BACKFILL_SERIES'):wh+=['q.series::text=%s'];pa+=[os.getenv('BACKFILL_SERIES')]
  pa+=[int(os.getenv('BACKFILL_LIMIT','500'))]
  cur.execute(f"select q.id,q.syllabus_id,q.component_id,q.year,q.series::text,q.variant,q.source_url,c.number,m.id,m.source_url from source_papers q join components c on c.id=q.component_id join source_papers m on m.syllabus_id=q.syllabus_id and m.component_id=q.component_id and m.year=q.year and m.series=q.series and m.variant=q.variant and m.kind='MS' where {' and '.join(wh)} order by q.year desc,q.series,c.number,q.variant limit %s",pa); papers=cur.fetchall()
 ok=[];fail=[]
 with tempfile.TemporaryDirectory() as td:
  root=Path(td)
  for paper in papers:
   qid,sid,cid,yr,se,va,qu,c,mid,mu=paper; key=f'{yr}-{se}-{c}{va}'
   try:
    qp,mp=root/(key+'q.pdf'),root/(key+'m.pdf'); qt,mt=root/(key+'q.txt'),root/(key+'m.txt');dl(qu,qp);dl(mu,mp);text(qp,qt);text(mp,mt); ms=msparse(mt); stems=qparse(qt,ms)
    if sum(x['marks'] for x in ms)!=75:raise RuntimeError('ms_total')
    if any(not stems.get(x['path']) for x in ms):raise RuntimeError('missing_stem')
    with conn.cursor() as cur:sub,lomap=tax(cur,sid,cid)
    pred={}; lop={}
    for e in ms:
     p=e['path']; x=f'PATH {p} {stems[p]} {e["guidance"]}'; m=mods.get(c)
     if not m:raise RuntimeError('no_model')
     pr=m.predict_proba([x])[0]; order=pr.argsort()[::-1]; st=next((str(m.classes_[i]) for i in order if str(m.classes_[i]) in sub),None); cf=next((float(pr[i]) for i in order if str(m.classes_[i])==st),0)
     if not st:raise RuntimeError('no_subtopic'); pred[p]=(st,cf)
     lm=lmods.get(st)
     if lm:
      pp=lm.predict_proba([x])[0]; oo=pp.argsort()[::-1]
      for i in oo:
       lc=str(lm.classes_[i])
       if (st,lc) in lomap and float(pp[i])>=0.38:lop[p]=(lc,float(pp[i]));break
    allp=paths([x['path'] for x in ms]); leaf={x['path']:x for x in ms}; ids={}
    with conn.cursor() as cur:
     for n,p in enumerate(allp,1):
      a=p.split('.');par='.'.join(a[:-1]) if len(a)>1 else None;e=leaf.get(p);sm=stems.get(p) if e else None;mk=e['marks'] if e else None; cf=pred[p][1] if e else .95
      cur.execute("insert into questions(source_paper_id,component_id,parent_id,label,path,display_ref,depth,sort_order,stem_md,marks,answer_kind,status,extract_confidence,prompt_version,notes) values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'source-backed-bulk-v1',%s) returning id",(qid,cid,ids.get(par),a[-1],p,p,len(a)-1,n,sm,mk,kind(c,sm or ''),'approved' if e and cf>=.65 else 'needs_review',cf,json.dumps({'classifier':'tfidf-logreg','confidence':cf}) if e else None));ids[p]=cur.fetchone()[0]
     for e in ms:
      p=e['path']; st,cf=pred[p]; cur.execute("insert into question_subtopics(question_id,subtopic_id,is_primary,weight,confidence,set_by) values(%s,%s,true,1,%s,'source-backed-bulk')",(ids[p],sub[st],cf))
      if p in lop:cur.execute('insert into question_learning_objectives(question_id,lo_id,confidence) values(%s,%s,%s)',(ids[p],lomap[(st,lop[p][0])],lop[p][1]))
      cur.execute("insert into mark_schemes(question_id,source_paper_id,scheme_type,max_marks,guidance_md,status,extract_confidence,prompt_version) values(%s,%s,'manual_only',%s,%s,'approved',.97,'source-backed-bulk-v1')",(ids[p],mid,e['marks'],e['guidance']))
     cur.execute("select count(*) filter(where q.marks is not null),coalesce(sum(q.marks) filter(where q.marks is not null),0),count(ms.id),coalesce(sum(ms.max_marks),0),count(distinct q.id) filter(where q.marks is not null and qs.is_primary) from questions q left join mark_schemes ms on ms.question_id=q.id left join question_subtopics qs on qs.question_id=q.id and qs.is_primary where q.source_paper_id=%s",(qid,));a=cur.fetchone()
     if a!=(len(ms),75,len(ms),75,len(ms)):raise RuntimeError('gate:'+str(a))
     au={'year':yr,'series':se,'component':c,'variant':va,'leaves':len(ms),'low_conf':sum(1 for x in pred.values() if x[1]<.65),'lo':len(lop)};cur.execute("insert into manual_ingest_stage(paper_key,section,part,payload) values(%s,'bulk-audit',0,%s::jsonb) on conflict(paper_key,section,part) do update set payload=excluded.payload",(f'9618-{key}',json.dumps(au)))
    conn.commit();ok.append(au);print('COMMITTED',key,au,flush=True)
   except Exception as e:conn.rollback();fail.append({'paper':key,'error':str(e)});print('FAILED',key,e,flush=True)
 with conn.cursor() as cur:
  cur.execute("with x as(select sp.id,count(q.id) filter(where q.marks is not null) n from source_papers sp left join questions q on q.source_paper_id=sp.id where sp.kind='QP' and sp.year between 2021 and 2025 group by sp.id)select count(*),count(*)filter(where n>0),count(*)filter(where n=0)from x");snap=cur.fetchone()
 print('RESULTS',json.dumps(ok));print('FAILED',json.dumps(fail));print('SNAPSHOT',snap);conn.close()
 if fail:raise SystemExit(2)
if __name__=='__main__':main()
