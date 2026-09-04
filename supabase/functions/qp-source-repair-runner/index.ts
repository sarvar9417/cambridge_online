import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.1.0'

const GITHUB_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'))
const EXPECTED_REPO = 'sarvar9417/cambridge_online'
const ALLOWED_REFS = new Set([
  'refs/heads/fix/question-source-text-references',
  'refs/heads/fix/9618-full-source-audit',
  'refs/heads/fix/source-structure-repair-v2',
  'refs/heads/main',
])
const AUDIENCE = 'cambridge-corpus'
const BUCKET = 'question-assets'
const MAX_PNG_BYTES = 2_000_000

function adminHeaders(): Record<string,string> {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return {'Content-Type':'application/json','apikey':legacy,'Authorization':`Bearer ${legacy}`}
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!raw) throw new Error('supabase_secret_key_missing')
  const key = JSON.parse(raw).default
  if (!key) throw new Error('default_secret_key_missing')
  return {'Content-Type':'application/json','apikey':key}
}

async function authenticate(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) throw new Error('missing_github_oidc')
  const { payload } = await jwtVerify(token, GITHUB_JWKS, {
    issuer: 'https://token.actions.githubusercontent.com',
    audience: AUDIENCE,
  })
  if (payload.repository !== EXPECTED_REPO) throw new Error('wrong_repository')
  if (!ALLOWED_REFS.has(String(payload.ref || ''))) throw new Error('wrong_ref')
  return payload
}

async function rpc(name: string, args: Record<string,unknown> = {}) {
  const url = Deno.env.get('SUPABASE_URL')
  if (!url) throw new Error('supabase_url_missing')
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: adminHeaders(), body: JSON.stringify(args),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`rpc_${name}_${res.status}:${text.slice(0,2000)}`)
  return text ? JSON.parse(text) : null
}

function validManifest(manifest: unknown, version: string): manifest is Record<string,unknown> {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return false
  const value = manifest as Record<string,unknown>
  return value.version === version && Array.isArray(value.rows) && value.rows.length > 0 && value.rows.length <= 80
}

function decodeBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index=0; index<binary.length; index+=1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function isPng(bytes: Uint8Array) {
  return bytes.length >= 8
    && bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47
    && bytes[4]===0x0d && bytes[5]===0x0a && bytes[6]===0x1a && bytes[7]===0x0a
}

async function sha256(bytes: Uint8Array) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return [...digest].map(value=>value.toString(16).padStart(2,'0')).join('')
}

async function uploadPng(input:{questionId:string;sourcePaperId:string;asset:Record<string,unknown>}) {
  const encoded = typeof input.asset.pngBase64 === 'string' ? input.asset.pngBase64 : ''
  if (!encoded) throw new Error('source_crop_png_missing')
  const bytes = decodeBase64(encoded)
  if (!isPng(bytes)) throw new Error('source_crop_not_png')
  if (bytes.byteLength > MAX_PNG_BYTES) throw new Error(`source_crop_too_large:${bytes.byteLength}`)
  const hash = await sha256(bytes)
  const claimed = typeof input.asset.contentHash === 'string' ? input.asset.contentHash.toLowerCase() : ''
  if (!/^[a-f0-9]{64}$/.test(claimed) || claimed !== hash) throw new Error('source_crop_hash_mismatch')

  const base = Deno.env.get('SUPABASE_URL')
  if (!base) throw new Error('supabase_url_missing')
  const objectPath = `source-repair/${input.sourcePaperId}/${input.questionId}/${hash}.png`
  const headers = adminHeaders()
  delete headers['Content-Type']
  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
    method:'POST',
    headers:{...headers,'content-type':'image/png','cache-control':'max-age=31536000','x-upsert':'true'},
    body:bytes,
  })
  if (!res.ok) throw new Error(`source_crop_upload_failed:${res.status}:${(await res.text()).slice(0,500)}`)
  return {
    kind: input.asset.kind === 'diagram' ? 'diagram' : 'image',
    storagePath:`supabase://${BUCKET}/${objectPath}`,
    altText: typeof input.asset.altText === 'string' ? input.asset.altText : 'Original Cambridge source layout',
    sourcePage: input.asset.sourcePage ?? null,
    sourceBbox: input.asset.sourceBbox ?? null,
    contentHash:hash,
    cropStatus:'ready',
    sizeBytes:bytes.byteLength,
  }
}

async function materializeManifest(raw:Record<string,unknown>) {
  const sourcePaperId = String(raw.sourcePaperId || '')
  if (!sourcePaperId) throw new Error('source_paper_id_missing')
  const rows = raw.rows as Array<Record<string,unknown>>
  const nextRows=[] as Array<Record<string,unknown>>
  for (const row of rows) {
    const questionId=String(row.questionId||'')
    if (!questionId) throw new Error('question_id_missing')
    const assets=Array.isArray(row.assets)?row.assets:[]
    const nextAssets=[] as Array<Record<string,unknown>>
    for (const rawAsset of assets) {
      if (!rawAsset || typeof rawAsset!=='object' || Array.isArray(rawAsset)) throw new Error('invalid_asset')
      const asset=rawAsset as Record<string,unknown>
      if (typeof asset.pngBase64==='string') {
        nextAssets.push(await uploadPng({questionId,sourcePaperId,asset}))
      } else {
        if (asset.kind!=='table' || typeof asset.contentMd!=='string' || asset.contentMd.length>30000) {
          throw new Error('only semantic table content or verified PNG crop is accepted')
        }
        nextAssets.push({
          kind:'table',contentMd:asset.contentMd,altText:asset.altText,
          sourcePage:asset.sourcePage??null,sourceBbox:asset.sourceBbox??null,
          contentHash:asset.contentHash??null,cropStatus:'not_needed',
        })
      }
    }
    nextRows.push({...row,assets:nextAssets})
  }
  return {...raw,rows:nextRows}
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return Response.json({ok:false,error:'method_not_allowed'},{status:405})
    const claims = await authenticate(req)
    const body = await req.json()
    const action = String(body?.action || '')

    if (action === 'source_repair_bootstrap') {
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:await rpc('qp_source_repair_runner_bootstrap_v2')})
    }
    if (action === 'source_text_repair') {
      const manifest = body?.manifest
      if (!manifest || manifest.parserVersion!=='qp-source-repair-v2') return Response.json({ok:false,error:'invalid_v2_manifest'},{status:400})
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,result:await rpc('apply_qp_source_repair_manifest_v2',{p_manifest:manifest})})
    }
    if (action === 'source_repair_bootstrap_v3') {
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:await rpc('qp_source_repair_runner_bootstrap_v3')})
    }
    if (action === 'source_text_repair_v3') {
      const manifest = body?.manifest
      if (!manifest || manifest.parserVersion!=='qp-source-repair-v3') return Response.json({ok:false,error:'invalid_v3_manifest'},{status:400})
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,result:await rpc('apply_qp_source_repair_manifest_v3',{p_manifest:manifest})})
    }
    if (action === 'source_structure_bootstrap_v2') {
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:await rpc('source_structure_repair_bootstrap_v2')})
    }
    if (action === 'source_structure_apply_v2') {
      const manifest=body?.manifest
      if (!validManifest(manifest,'source-structure-repair-v2')) return Response.json({ok:false,error:'invalid_source_structure_manifest'},{status:400})
      const materialized=await materializeManifest(manifest)
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,result:await rpc('apply_source_structure_repair_manifest_v2',{p_manifest:materialized})})
    }

    return Response.json({ok:false,error:'unknown_action'},{status:400})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message.slice(0,3000))
    const authFailure = /github_oidc|repository|wrong_ref|JWT|signature|audience|issuer/i.test(message)
    return Response.json({ok:false,error:message},{status:authFailure ? 403 : 500})
  }
})
