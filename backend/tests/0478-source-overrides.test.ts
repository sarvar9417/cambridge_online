import { describe, expect, it } from 'vitest'
import { canonical0478SourceUrl } from '../../supabase/functions/corpus-runner/source-overrides.ts'

describe('0478 source overrides', () => {
  it('routes the known 2021 FM 22 pre-release duplicate to the actual exam question paper', () => {
    const url = canonical0478SourceUrl({
      year: 2021,
      series: 'FM',
      component: 2,
      variant: 2,
      kind: 'QP',
      sourceUrl: 'https://drive.google.com/file/d/wrong-pre-release/view?usp=sharing',
    })
    expect(url).toContain('1haAGyQegnBtF_NEMv-Bc3TMOX-EDwE2f')
  })

  it('does not rewrite unrelated sources', () => {
    const original = 'https://drive.google.com/file/d/original/view?usp=sharing'
    expect(canonical0478SourceUrl({
      year: 2021,
      series: 'FM',
      component: 2,
      variant: 2,
      kind: 'MS',
      sourceUrl: original,
    })).toBe(original)
    expect(canonical0478SourceUrl({
      year: 2022,
      series: 'FM',
      component: 2,
      variant: 2,
      kind: 'QP',
      sourceUrl: original,
    })).toBe(original)
  })
})
