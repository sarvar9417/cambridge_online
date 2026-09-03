import { describe, expect, it } from 'vitest'
import { parseMsV2 } from '../../supabase/functions/corpus-runner/parser.ts'

describe('0478 legacy top-level mark rows', () => {
  it('keeps sequential top-level questions whose guidance starts with a digit', () => {
    const rows = parseMsV2([
      '1 (a) first answer', '[2]', '(b) second answer', '[2]', '(c) third answer', '[2]',
      '2 (a) first answer', '[1]', '(b) second answer', '[2]',
      '3 (a) first answer', '[4]', '(b) second answer', '[3]', '(c) third answer', '[3]',
      '4 1 mark per correct item', 'accepted items', '[6]',
      '5 1 mark per row and 1 mark per category', 'accepted rows', '[10]',
      '6 (a) first answer', '[6]', '(b) (i) second answer', '[2]', '(ii) third answer', '[2]',
      '7 (a) first answer', '[2]', '(b) second answer', '[6]',
      '8 (a) first answer', '[2]', '(b) second answer', '[2]', '(c) third answer', '[3]', '(d) fourth answer', '[3]', '(e) fifth answer', '[2]',
      '9 5/6 matches – 5 marks', '[5]',
      '10 1 mark per correctly placed item', '[5]',
    ])
    expect(rows.map((row) => row.path)).toEqual(expect.arrayContaining(['4', '5', '9', '10']))
    expect(rows.reduce((sum, row) => sum + row.marks, 0)).toBe(75)
  })
})
