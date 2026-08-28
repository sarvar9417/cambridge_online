import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.1.0'

const GITHUB_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'))
const EXPECTED_REPO = 'sarvar9417/cambridge_online'
const EXPECTED_REF = 'refs/heads/fix/source-backed-topic-review'
const EXPECTED_WORKFLOW = `${EXPECTED_REPO}/.github/workflows/source-backed-topic-review.yml@${EXPECTED_REF}`
const AUDIENCE = 'campath-topic-review'

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
  const { payload } = await jwtVerify(token,GITHUB_JWKS,{
    issuer:'https://token.actions.githubusercontent.com',
    audience:AUDIENCE,
  })
  if (payload.repository !== EXPECTED_REPO) throw new Error('wrong_repository')
  if (payload.ref !== EXPECTED_REF) throw new Error('wrong_ref')
  if (payload.workflow_ref !== EXPECTED_WORKFLOW) throw new Error('wrong_workflow')
  return payload
}

async function rpc(name:string,args:Record<string,unknown>={}) {
  const base = Deno.env.get('SUPABASE_URL')
  if (!base) throw new Error('supabase_url_missing')
  const response = await fetch(`${base}/rest/v1/rpc/${name}`,{
    method:'POST',headers:adminHeaders(),body:JSON.stringify(args),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`rpc_${name}_${response.status}:${text.slice(0,3000)}`)
  return text ? JSON.parse(text) : null
}

Deno.serve(async (req:Request) => {
  try {
    if (req.method !== 'POST') return Response.json({ok:false,error:'method_not_allowed'},{status:405})
    const claims = await authenticate(req)
    const body = await req.json()
    const action = String(body?.action || '')

    if (action === 'taxonomy') {
      return Response.json({ok:true,actor:claims.actor,runId:claims.run_id,data:await rpc('topic_review_taxonomy_bootstrap_v1')})
    }
    if (action === 'questions') {
      const status = String(body?.status || '')
      const offset = Number(body?.offset || 0)
      const limit = Number(body?.limit || 250)
      if (!['approved','needs_review'].includes(status) || !Number.isInteger(offset) || !Number.isInteger(limit)) {
        return Response.json({ok:false,error:'bad_page_request'},{status:400})
      }
      return Response.json({ok:true,actor:claims.actor,runId:claims.run_id,data:await rpc('topic_review_questions_bootstrap_v1',{p_status:status,p_offset:offset,p_limit:limit})})
    }
    if (action === 'apply') {
      const manifest = body?.manifest
      if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return Response.json({ok:false,error:'invalid_manifest'},{status:400})
      if (manifest.reviewVersion !== 'source-backed-taxonomy-review-v1') return Response.json({ok:false,error:'invalid_review_version'},{status:400})
      if (!Array.isArray(manifest.rows) || manifest.rows.length<1 || manifest.rows.length>100) return Response.json({ok:false,error:'invalid_rows'},{status:400})
      return Response.json({ok:true,actor:claims.actor,runId:claims.run_id,result:await rpc('apply_source_backed_taxonomy_review_v1',{p_manifest:manifest})})
    }
    return Response.json({ok:false,error:'unknown_action'},{status:400})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message.slice(0,4000))
    const authFailure = /github_oidc|repository|wrong_ref|wrong_workflow|JWT|signature|audience|issuer/i.test(message)
    return Response.json({ok:false,error:message},{status:authFailure?403:500})
  }
})
