import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.1.0'

const GITHUB_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'))
const EXPECTED_REPO = 'sarvar9417/cambridge_online'
const ALLOWED_REFS = new Set([
  'refs/heads/feat/full-structured-content-backfill',
  'refs/heads/main',
])
const AUDIENCE = 'cambridge-corpus'

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

function validManifest(value: unknown): value is Record<string,unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const manifest = value as Record<string,unknown>
  return manifest.version === 'structured-content-backfill-v1'
    && typeof manifest.sourcePaperId === 'string'
    && typeof manifest.sourceSha256 === 'string'
    && /^[0-9a-f]{64}$/i.test(manifest.sourceSha256)
    && typeof manifest.parserVersion === 'string'
    && Array.isArray(manifest.rows)
    && manifest.rows.length > 0
    && manifest.rows.length <= 100
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return Response.json({ok:false,error:'method_not_allowed'},{status:405})
    const claims = await authenticate(req)
    const body = await req.json()
    const action = String(body?.action || '')
    if (action === 'structured_content_bootstrap') {
      const syllabus = String(body?.syllabus || '')
      if (!['0478','9618'].includes(syllabus)) return Response.json({ok:false,error:'invalid_syllabus'},{status:400})
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:await rpc('structured_content_backfill_bootstrap_v1',{p_syllabus_code:syllabus})})
    }
    if (action === 'structured_content_apply') {
      const manifest = body?.manifest
      if (!validManifest(manifest)) return Response.json({ok:false,error:'invalid_structured_content_manifest'},{status:400})
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,result:await rpc('apply_structured_content_backfill_v1',{p_manifest:manifest})})
    }
    return Response.json({ok:false,error:'unknown_action'},{status:400})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message.slice(0,3000))
    const authFailure = /github_oidc|repository|wrong_ref|JWT|signature|audience|issuer/i.test(message)
    return Response.json({ok:false,error:message},{status:authFailure ? 403 : 500})
  }
})
