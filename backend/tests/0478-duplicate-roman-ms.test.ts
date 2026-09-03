import { describe, expect, it } from 'vitest'
import {
  normalizeDuplicateRomanMarkRows,
  parseMsV3,
} from '../../supabase/functions/corpus-runner/parser-v3-adapter.ts'

describe('0478 duplicated roman mark rows', () => {
  it('recovers the next roman sibling only when a marked row is duplicated and the sibling is absent', () => {
    const source = [
      '1(a)(i) EquipmentID 1',
      '1(a)(i) One mark per point, max 1 1',
      '1(b) One mark per point 3',
    ]
    const normalized = normalizeDuplicateRomanMarkRows(source)
    expect(normalized[0]).toBe('1(a)(i) EquipmentID 1')
    expect(normalized[1]).toBe('1(a)(ii) One mark per point, max 1 1')
    expect(parseMsV3(normalized).map((row) => [row.path, row.marks])).toEqual([
      ['1.a.i', 1],
      ['1.a.ii', 1],
      ['1.b', 3],
    ])
  })

  it('does not rewrite a duplicate when the next roman sibling already exists', () => {
    const source = [
      '4(a)(i) First line 1',
      '4(a)(i) Continued line 1',
      '4(a)(ii) Next part 2',
    ]
    expect(normalizeDuplicateRomanMarkRows(source)).toEqual(source)
  })
})
