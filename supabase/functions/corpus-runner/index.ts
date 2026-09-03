import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.1.0'
import { getDocumentProxy } from 'npm:unpdf@1.4.0'
import {
  detectHorizontalMarkSchemeTable,
  formatPdfTextRow,
  isRotatedQuestionTable,
  parseMsV3,
  parseQpV3,
} from './parser-v3-adapter.ts'

const GITHUB_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'))
const EXPECTED_REPO = 'sarvar9417/cambridge_online'
const EXPECTED_REFS = new Set(['refs/heads/main', 'refs/heads/agent/hodder-knowledge-map'])
const AUDIENCE = 'cambridge-corpus'
const REVOKED_WRITE_RUNS = new Set(['31963095382','31963583283','31963661237'])

function adminHeaders(): Record<string,string> {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return {'Content-Type':'application/json','apikey':legacy,'Authorization':`Bearer ${legacy}`}
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!raw) throw new Error('supabase_secret_key_missing')
  const key = JSON.parse(raw).default
  if (!key) throw new Error('default_secret_key_missing')
  return {'Content-Type':'application/json','apikey':key}
}

function driveId(u:string){
  const m=u.match(/\/d\/([^/]+)/)||u.match(/[?&]id=([^&]+)/)
  if(!m)throw Error('bad_drive_url')
  return m[1]
}
function driveDownloadUrl(u:string){return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId(u))}&export=download&confirm=t`}
function sleep(ms:number){return new Promise(resolve=>setTimeout(resolve,ms))}
async function sha256Hex(bytes:Uint8Array){
  const h=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))
  return [...h].map(x=>x.toString(16).padStart(2,'0')).join('')
}

async function fetchPdf(u:string,timeoutMs=30000){
  const maxAttempts=4
  let lastReason='download_failed'
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs)
    let retryReason:string|null=null
    try{
      const r=await fetch(driveDownloadUrl(u),{signal:ctrl.signal})
      if(!r.ok){
        const reason=`download_${r.status}`
        if((r.status===429||r.status>=500)&&attempt<maxAttempts) retryReason=reason
        else throw Error(attempt>1?`${reason}_after_retries`:reason)
      }else{
        const bytes=new Uint8Array(await r.arrayBuffer())
        if(bytes.length<5||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('not_pdf')
        if(bytes.length>25*1024*1024)throw Error('pdf_too_large')
        return bytes
      }
    }catch(error){
      if(!retryReason){
        const message=error instanceof Error?error.message:String(error)
        const transient=/abort|network|fetch failed|timed?\s*out|connection|reset/i.test(message)
        if(transient&&attempt<maxAttempts) retryReason=message||'network_error'
        else throw error
      }
    }finally{
      clearTimeout(timer)
    }
    lastReason=retryReason||lastReason
    await sleep([500,1500,3500][attempt-1]??3500)
  }
  throw Error(`${lastReason}_after_retries`)
}

async function pdfLines(u:string){
  const bytes=await fetchPdf(u),pdf=await getDocumentProxy(bytes),out:string[]=[]
  for(let p=1;p<=pdf.numPages;p++){
    const pg=await pdf.getPage(p),tc:any=await pg.getTextContent(),it=(tc.items||[])
      .filter((z:any)=>z.str?.trim())
      .map((z:any)=>({s:String(z.str),x:+(z.transform?.[4]||0),y:+(z.transform?.[5]||0)}))
    const rot=isRotatedQuestionTable(it),table=detectHorizontalMarkSchemeTable(it)
    if(rot){
      it.sort((a:any,b:any)=>Math.abs(a.x-b.x)>1.8?a.x-b.x:a.y-b.y)
      let row:any[]=[],x:number|null=null
      const flush=()=>{if(row.length){row.sort((a,b)=>a.y-b.y);out.push(row.map(z=>z.s).join(' ').replace(/\s+/g,' ').trim());row=[]}}
      for(const z of it){if(x===null||Math.abs(z.x-x)<=1.8){row.push(z);if(x===null)x=z.x}else{flush();row=[z];x=z.x}}
      flush()
    }else{
      it.sort((a:any,b:any)=>Math.abs(b.y-a.y)>1.8?b.y-a.y:a.x-b.x)
      let row:any[]=[],y:number|null=null
      const flush=()=>{if(row.length){row.sort((a,b)=>a.x-b.x);out.push(formatPdfTextRow(row,table));row=[]}}
      for(const z of it){if(y===null||Math.abs(z.y-y)<=1.8){row.push(z);if(y===null)y=z.y}else{flush();row=[z];y=z.y}}
      flush()
    }
    out.push('')
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
  const url=Deno.env.get('SUPABASE_URL')
  if(!url)throw new Error('supabase_url_missing')
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
      const catalog=body?.catalog
      if(!catalog||typeof catalog!=='object')return Response.json({error:'invalid_catalog_payload'},{status:400})
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,result:await rpc('import_syllabus_catalog_json_v1',{p_catalog:catalog})})
    }

    if(action==='stage'){
      const sources=body?.sources
      if(!Array.isArray(sources)||sources.length===0||sources.length>12)return Response.json({error:'invalid_stage_payload'},{status:400})
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
      if(code)return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:await rpc('corpus_runner_bootstrap_v2',{
        p_syllabus_code:code,p_year_from:Number(body?.year_from||2015),p_year_to:Number(body?.year_to||2028)
      })})
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:await rpc('corpus_runner_bootstrap')})
    }

    if(action==='repair_bootstrap'){
      const base=await rpc('corpus_runner_bootstrap'),repair=await rpc('corpus_runner_repair_bootstrap')
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:{...base,sources:repair?.sources||[]}})
    }

    if(action==='extract'){
      const qpUrl=String(body?.qp_url||''),msUrl=String(body?.ms_url||'')
      if(!qpUrl||!msUrl)return Response.json({error:'invalid_extract_payload'},{status:400})
      const[q,m]=await Promise.all([pdfLines(qpUrl),pdfLines(msUrl)])
      const leaves=parseMsV3(m),stems=parseQpV3(q,leaves),rows=leaves.map(x=>({path:x.path,marks:x.marks,stem:stems[x.path]||null,guidance:x.guidance}))
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
  }catch(error){
    const message=error instanceof Error?error.message:String(error)
    console.error(message.slice(0,3000))
    const authFailure=/github_oidc|repository|wrong_ref|JWT|signature|audience|issuer/i.test(message)
    return Response.json({ok:false,error:message},{status:authFailure?403:500})
  }
})