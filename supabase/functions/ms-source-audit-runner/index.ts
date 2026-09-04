import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.1.0'

const GITHUB_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'))
const EXPECTED_REPO = 'sarvar9417/cambridge_online'
const ALLOWED_REFS = new Set(['refs/heads/fix/9618-ms-source-audit', 'refs/heads/main'])
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
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: adminHeaders(), body: JSON.stringify(args),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`rpc_${name}_${response.status}:${text.slice(0,2000)}`)
  return text ? JSON.parse(text) : null
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return Response.json({ok:false,error:'method_not_allowed'},{status:405})
    const claims = await authenticate(req)
    const body = await req.json()
    const action = String(body?.action || '')
    if (action === 'source_audit_bootstrap') {
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:await rpc('ms_source_audit_bootstrap_v2')})
    }
    if (action === 'record_source_audit') {
      if (!Array.isArray(body?.audits) || body.audits.length < 1 || body.audits.length > 100) {
        return Response.json({ok:false,error:'audit_batch_must_contain_1_to_100_rows'},{status:400})
      }
      return Response.json({ok:true,actor:claims.actor,run_id:claims.run_id,data:await rpc('ms_source_audit_record_v2',{p_audits:body.audits})})
    }
    return Response.json({ok:false,error:'unknown_action'},{status:400})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message.slice(0,3000))
    const authFailure = /github_oidc|repository|wrong_ref|JWT|signature|audience|issuer/i.test(message)
    return Response.json({ok:false,error:message},{status:authFailure ? 403 : 500})
  }
})
