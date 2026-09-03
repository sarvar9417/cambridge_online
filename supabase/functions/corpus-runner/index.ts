import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.1.0'
import { getDocumentProxy } from 'npm:unpdf@1.4.0'

const GITHUB_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'))
const EXPECTED_REPO = 'sarvar9417/cambridge_online'
const EXPECTED_REFS = new Set(['refs/heads/main', 'refs/heads/agent/hodder-knowledge-map'])
const AUDIENCE = 'cambridge-corpus'
const REVOKED_WRITE_RUNS = new Set(['31963095382','31963583283','31963661237'])
const ROM=/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/

function adminHeaders(): Record<string,string> {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return {'Content-Type':'application/json','apikey':legacy,'Authorization':`Bearer ${legacy}`}
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!raw) throw new Error('supabase_secret_key_missing')
  const key = JSON.parse(raw).default
  if (!key) throw new Error('default_secret_key_missing')
  return {'Content-Type':'application/json','apikey':key}
}
function driveId(u:string){const m=u.match(/\/d\/([^/]+)/)||u.match(/[?&]id=([^&]+)/);if(!m)throw Error('bad_drive_url');return m[1]}
function driveDownloadUrl(u:string){return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId(u))}&export=download&confirm=t`}
function isCambridgeHeader(s:string){return s.includes('9618/')||s.includes('0478/')||s.includes('Cambridge International')}
async function sha256Hex(bytes:Uint8Array){const h=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));return [...h].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function fetchPdf(u:string,timeoutMs=30000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs)
  try{
    const r=await fetch(driveDownloadUrl(u),{signal:ctrl.signal});if(!r.ok)throw Error('download_'+r.status)
    const bytes=new Uint8Array(await r.arrayBuffer())
    if(bytes.length<5||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('not_pdf')
    if(bytes.length>25*1024*1024)throw Error('pdf_too_large')
    return bytes
  }finally{clearTimeout(timer)}
}
async function pdfLines(u:string){
  const bytes=await fetchPdf(u),pdf=await getDocumentProxy(bytes),out:string[]=[]
  for(let p=1;p<=pdf.numPages;p++){
    const pg=await pdf.getPage(p),tc:any=await pg.getTextContent(),it=(tc.items||[]).filter((z:any)=>z.str?.trim()).map((z:any)=>({s:String(z.str),x:+(z.transform?.[4]||0),y:+(z.transform?.[5]||0)}))
    const h=it.filter((z:any)=>/^(Question|Answer|Marks)$/.test(z.s.trim()))
    const rot=h.some((a:any,i:number)=>h.some((b:any,j:number)=>j>i&&Math.abs(a.x-b.x)<10&&Math.abs(a.y-b.y)>100))
    if(rot){it.sort((a:any,b:any)=>Math.abs(a.x-b.x)>1.8?a.x-b.x:a.y-b.y);let row:any[]=[],x:number|null=null;const f=()=>{if(row.length){row.sort((a,b)=>a.y-b.y);out.push(row.map(z=>z.s).join(' ').replace(/\s+/g,' ').trim());row=[]}};for(const z of it){if(x===null||Math.abs(z.x-x)<=1.8){row.push(z);if(x===null)x=z.x}else{f();row=[z];x=z.x}}f()}
    else{it.sort((a:any,b:any)=>Math.abs(b.y-a.y)>1.8?b.y-a.y:a.x-b.x);let row:any[]=[],y:number|null=null;const f=()=>{if(row.length){row.sort((a,b)=>a.x-b.x);out.push(row.map(z=>z.s).join(' ').replace(/\s+/g,' ').trim());row=[]}};for(const z of it){if(y===null||Math.abs(z.y-y)<=1.8){row.push(z);if(y===null)y=z.y}else{f();row=[z];y=z.y}}f()}
    out.push('')
  }
  return out
}
function parseMs(ls:string[]){
  const c:any[]=[]
  for(let i=0;i<ls.length;i++){
    const s=ls[i].replace(/\s+/g,' ').trim(),m=s.match(/^(\d{1,2})(\([a-z]\))?(\([ivx]+\))?\s+(?:(.*?)\s+)?(\d+)\s*$/i)
    if(!m)continue;const top=+m[1],marks=+m[5];if(top>30||marks>20)continue
    c.push({i,path:(m[1]+(m[2]||'')+(m[3]||'')).replace(/\(/g,'.').replace(/\)/g,''),top,a:m[2],r:m[3],marks})
  }
  const o:any[]=[];let cur=0;const seen=new Set<string>()
  for(const x of c){
    if(x.a||x.r){if(x.top<cur||x.top>cur+1)continue;if(x.top===cur+1)cur=x.top}
    else{if(x.top!==cur+1)continue;cur=x.top}
    if(!seen.has(x.path)){seen.add(x.path);o.push(x)}
  }
  const sub=new Set(o.filter(x=>x.path.includes('.')).map(x=>x.top)),f=o.filter(x=>x.path.includes('.')||!sub.has(x.top))
  for(let j=0;j<f.length;j++){const a=f[j].i,b=j+1<f.length?f[j+1].i:ls.length;f[j].guidance=ls.slice(a,b).filter(x=>x&&!isCambridgeHeader(x)&&!x.startsWith('©')).join('\n')}
  return f
}
function topStarts(ls:string[],ms:any[]){
  const by=new Map<number,string[]>;for(const e of ms){const q=+e.path.split('.')[0];if(!by.has(q))by.set(q,[]);by.get(q)!.push(e.path)}
  const out=new Map<number,number>();let prev=-1
  for(const q of[...by.keys()].sort((a,b)=>a-b)){
    const has=by.get(q)!.some(x=>x.includes('.')),cand:number[]=[]
    for(let i=0;i<ls.length;i++){if(i<=prev)continue;const m=ls[i].match(new RegExp(`^${q}\\s+(.+)`));if(!m)continue;const r=m[1].trim();if(!r||isCambridgeHeader(r)||!/[A-Z(]/.test(r[0]))continue;if(has&&!ls.slice(i,Math.min(ls.length,i+180)).some(x=>/^\(a\)\s+/.test(x)))continue;cand.push(i)}
    if(cand.length){out.set(q,cand[0]);prev=cand[0]}
  }
  return out
}
function parseQp(ls:string[],ms:any[]){
  const by=new Map<number,string[]>;for(const e of ms){const q=+e.path.split('.')[0];if(!by.has(q))by.set(q,[]);by.get(q)!.push(e.path)}
  const ss=topStarts(ls,ms),out:any={}
  for(const q of[...by.keys()].sort((a,b)=>a-b)){
    const st=ss.get(q);if(st===undefined)continue
    const nx=[...ss].filter(([k,v])=>k>q&&v>st).map(x=>x[1]),en=nx.length?Math.min(...nx):ls.length,reg=ls.slice(st,en),paths=by.get(q)!,first=(reg[0].match(new RegExp(`^${q}\\s+(.*)`))||[])[1]||''
    let ctx=[first];for(const l of reg.slice(1)){if(/^\([a-z]\)\s+/.test(l))break;if(l&&!isCambridgeHeader(l)&&!l.startsWith('©')&&!l.startsWith('*'))ctx.push(l)}
    const context=ctx.join(' ').replace(/\s+/g,' ').trim(),starts:any[]=[];let cur=''
    for(let i=0;i<reg.length;i++){
      const s=reg[i].trim();let m=s.match(new RegExp(`^${q}\\s+\\(([a-z])\\)\\s*(?:\\(([ivx]+)\\)\\s*)?(.*)`,'i'))
      if(m){cur=m[1];const p=`${q}.${cur}`+(m[2]?`.${m[2]}`:'');if(paths.includes(p))starts.push({i,path:p,first:m[3]});continue}
      m=s.match(/^\(([^)]+)\)\s*(.*)/);if(!m)continue;const tok=m[1].toLowerCase(),rest=m[2]
      if(ROM.test(tok)){if(cur&&paths.includes(`${q}.${cur}.${tok}`))starts.push({i,path:`${q}.${cur}.${tok}`,first:rest});continue}
      if(/^[a-z]$/.test(tok)){cur=tok;const rr=rest.match(/^\(([ivx]+)\)\s*(.*)/i);if(rr&&paths.includes(`${q}.${cur}.${rr[1]}`)){starts.push({i,path:`${q}.${cur}.${rr[1]}`,first:rr[2]});continue}if(paths.includes(`${q}.${tok}`))starts.push({i,path:`${q}.${tok}`,first:rest})}
    }
    if(paths.includes(String(q)))starts.unshift({i:0,path:String(q),first})
    const seen=new Set<string>(),u=starts.sort((a,b)=>a.i-b.i).filter(x=>!seen.has(x.path)&&(seen.add(x.path),true))
    for(let j=0;j<u.length;j++){
      const x=u[j],stop=j+1<u.length?u[j+1].i:reg.length;let z=[x.first]
      for(const l of reg.slice(x.i+1,stop)){if(!l||isCambridgeHeader(l)||l.startsWith('©')||l.startsWith('*')||l==='BLANK PAGE')continue;z.push(l.replace(/\.{10,}/g,' '))}
      let s=z.join(' ').replace(/\s+/g,' ').trim(),mark=ms.find(e=>e.path===x.path)?.marks,mm=[...s.matchAll(/\[\s*(\d+)\s*\]/g)]
      if(mm.length&&mark!==undefined){const hit=mm.find(a=>+a[1]===mark)||mm[0];s=s.slice(0,(hit.index||0)+hit[0].length)}
      if(x.path!==String(q)&&context)s=(context.slice(0,800)+' '+s).trim();out[x.path]=s
    }
  }
  return out
}

async function authenticate(req: Request) {
  const auth=req.headers.get('authorization')||'',token=auth.startsWith('Bearer ')?auth.slice(7):''
  if(!token)throw new Error('missing_github_oidc')
  const {payload}=await jwtVerify(token,GITHUB_JWKS,{issuer:'https://token.actions.githubusercontent.com',audience:AUDIENCE})
  if(payload.repository!==EXPECTED_REPO)throw new Error('wrong_repository')
  if(!EXPECTED_REFS.has(String(payload.ref||'')))throw new Error('wrong_ref')
  return payload
}
async function rpc(name:string,args:Record<string,unknown>={}){
  const url=Deno.env.get('SUPABASE_URL');if(!url)throw new Error('supabase_url_missing')
  const res=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:adminHeaders(),body:JSON.stringify(args)}),text=await res.text()
  if(!res.ok)throw new Error(`rpc_${name}_${res.status}:${text.slice(0,1500)}`)
  return text?JSON.parse(text):null
}

Deno.serve(async(req:Request)=>{
  try{
    if(req.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405})
    const claims=await authenticate(req),body=await req.json(),action=String(body?.action||'')
    const writeAction=['apply','repair','stage','catalog'].includes(action)
    if(writeAction&&REVOKED_WRITE_RUNS.has(String(claims.run_id||'')))return Response.json({ok:false,error:'workflow_run_write_revoked'},{status:409})
    if(action==='catalog'){
      const catalog=body?.catalog;if(!catalog||typeof catalog!=='object')return Response.json({error:'invalid_catalog_payload'},{status:400})
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,result:await rpc('import_syllabus_catalog_json_v1',{p_catalog:catalog})})
    }
    if(action==='stage'){
      const sources=body?.sources;if(!Array.isArray(sources)||sources.length===0||sources.length>12)return Response.json({error:'invalid_stage_payload'},{status:400})
      const results=[]
      for(const src of sources){
        const sourceUrl=String(src?.source_url||''),filename=String(src?.filename||'')
        if(!sourceUrl||!filename)return Response.json({error:'invalid_stage_item'},{status:400})
        const bytes=await fetchPdf(sourceUrl),sha=await sha256Hex(bytes),pdf=await getDocumentProxy(bytes)
        results.push(await rpc('stage_0478_remote_source_v1',{
          p_year:Number(src.year),p_series:String(src.series),p_component:Number(src.component),
          p_variant:Number(src.variant),p_kind:String(src.kind),p_filename:filename,
          p_source_url:sourceUrl,p_sha256:sha,p_page_count:pdf.numPages
        }))
      }
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,count:results.length,results})
    }
    if(action==='bootstrap'){
      const code=String(body?.syllabus_code||'').trim()
      if(code){return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:await rpc('corpus_runner_bootstrap_v2',{
        p_syllabus_code:code,p_year_from:Number(body?.year_from||2015),p_year_to:Number(body?.year_to||2025)
      })})}
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:await rpc('corpus_runner_bootstrap')})
    }
    if(action==='repair_bootstrap'){const base=await rpc('corpus_runner_bootstrap'),repair=await rpc('corpus_runner_repair_bootstrap');return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:{...base,sources:repair?.sources||[]}})}
    if(action==='extract'){
      const qpUrl=String(body?.qp_url||''),msUrl=String(body?.ms_url||'');if(!qpUrl||!msUrl)return Response.json({error:'invalid_extract_payload'},{status:400})
      const[q,m]=await Promise.all([pdfLines(qpUrl),pdfLines(msUrl)]),leaves=parseMs(m),stems=parseQp(q,leaves),rows=leaves.map(x=>({path:x.path,marks:x.marks,stem:stems[x.path]||null,guidance:x.guidance}))
      const total=rows.reduce((a,x)=>a+x.marks,0),missing=rows.filter(x=>!x.stem).map(x=>x.path)
      return Response.json({ok:true,count:rows.length,total,missing,rows})
    }
    if(action==='apply'||action==='repair'){
      const qpId=String(body?.qp_id||''),msId=String(body?.ms_id||''),rows=body?.rows
      if(!qpId||!msId||!Array.isArray(rows)||rows.length===0)return Response.json({error:'invalid_apply_payload'},{status:400})
      if(rows.length>80)return Response.json({error:'too_many_rows'},{status:413})
      if(action==='repair')return Response.json({ok:true,result:await rpc('repair_source_backfill_paper_v1',{p_qp_id:qpId,p_ms_id:msId,p_rows:rows,p_prompt:'source-backed-oidc-repair-v1'})})
      const is0478=String(body?.syllabus_code||'')==='0478',fn=is0478?'ingest_source_backfill_paper_v3':'ingest_source_backfill_paper_v2'
      return Response.json({ok:true,result:await rpc(fn,{p_qp_id:qpId,p_ms_id:msId,p_rows:rows,p_prompt:is0478?'source-backed-0478-oidc-v1':'source-backed-oidc-backfill-v1'})})
    }
    return Response.json({error:'unknown_action'},{status:400})
  }catch(error){const message=error instanceof Error?error.message:String(error);console.error(message.slice(0,3000));const authFailure=/github_oidc|repository|wrong_ref|JWT|signature|audience|issuer/i.test(message);return Response.json({ok:false,error:message},{status:authFailure?403:500})}
})
