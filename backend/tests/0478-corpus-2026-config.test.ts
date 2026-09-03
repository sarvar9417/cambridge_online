import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

async function read(relative: string) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')
}

describe('0478 2025-2026 corpus configuration', () => {
  it('discovers the exact 2025 and 2026 Drive year folders and backfills through 2026', async () => {
    const script = await read('../scripts/full-0478-corpus-backfill.py')
    expect(script).toContain('2025: "11BB4bIy6cU1Eng2qQOJx6lK8Um6-dEOY"')
    expect(script).toContain('2026: "1F9SRtj85iO7ciaE2B5hIKrTR66Czn5l0"')
    expect(script).toContain('year_to=2026')
  })

  it('keeps 2026 papers on a distinct 2026-2028 syllabus family', async () => {
    const script = await read('../scripts/full-0478-corpus-backfill.py')
    expect(script).toContain('"versionLabel": "2026-2028"')
    expect(script).toContain('"validFrom": 2026')
    expect(script).toContain('"validTo": 2028')
    expect(script).toContain('Use the two’s complement number system to represent positive and negative 8-bit binary integers')
    expect(script).toContain('fetch–decode–execute (FDE) cycle')
  })

  it('allows staging only after an exact syllabus version exists and preserves service-role-only execution', async () => {
    const migration = await read('../src/database/migrations/0103_extend_0478_sources_to_2028.sql')
    expect(migration).toContain('p_year < 2015 or p_year > 2028')
    expect(migration).toContain("where s.code='0478' and p_year between s.valid_from and s.valid_to")
    expect(migration).toContain("raise exception '0478_syllabus_version_missing:%',p_year")
    expect(migration).toContain('from public,anon,authenticated')
    expect(migration).toContain('to service_role')
  })

  it('retries transient Drive failures and watches all files that can change the corpus contract', async () => {
    const runner = await read('../../supabase/functions/corpus-runner/index.ts')
    const workflow = await read('../../.github/workflows/full-0478-corpus-backfill.yml')
    expect(runner).toContain('const maxAttempts=4')
    expect(runner).toContain('r.status===429||r.status>=500')
    expect(runner).toContain('[500,1500,3500]')
    expect(workflow).toContain("- 'backend/src/database/migrations/0103_extend_0478_sources_to_2028.sql'")
    expect(workflow).toContain("- 'supabase/functions/corpus-runner/parser.ts'")
  })
})
