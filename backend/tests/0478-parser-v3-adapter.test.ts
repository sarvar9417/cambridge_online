import { describe, expect, it } from 'vitest'
import {
  detectHorizontalMarkSchemeTable,
  formatPdfTextRow,
  normalizeQpLinesV3,
  parseMsV3,
  parseQpV3,
  type ParsedLeaf,
  type PdfTextItem,
} from '../../supabase/functions/corpus-runner/parser-v3-adapter.ts'

describe('0478 parser v3 adapter', () => {
  it('moves the Marks-column value to the end of a 2026 horizontal mark-scheme row', () => {
    const header: PdfTextItem[] = [
      { s: 'Question', x: 68, y: 500 },
      { s: 'Answer', x: 291, y: 500 },
      { s: 'Marks', x: 507, y: 500 },
      { s: 'Guidance', x: 638, y: 500 },
    ]
    const table = detectHorizontalMarkSchemeTable(header)
    expect(table).not.toBeNull()

    const row: PdfTextItem[] = [
      { s: '1(a)', x: 82, y: 470 },
      { s: 'A', x: 127, y: 470 },
      { s: '1', x: 534, y: 470 },
      { s: 'Mark', x: 551, y: 470 },
      { s: 'the', x: 579, y: 470 },
      { s: 'first', x: 598, y: 470 },
      { s: 'answer', x: 618, y: 470 },
    ]

    const line = formatPdfTextRow(row, table)
    expect(line).toBe('1(a) A Mark the first answer 1')
    const leaves = parseMsV3([line])
    expect(leaves.map((leaf) => [leaf.path, leaf.marks])).toEqual([['1.a', 1]])
  })

  it('strips margin artefacts and ignores a numbered instruction step before the real question', () => {
    const ms: ParsedLeaf[] = [
      { i: 0, path: '3.c', top: 3, a: '(c)', marks: 5 },
      { i: 1, path: '4.a', top: 4, a: '(a)', marks: 2 },
      { i: 2, path: '4.b.i', top: 4, a: '(b)', r: '(i)', marks: 1 },
      { i: 3, path: '4.b.ii', top: 4, a: '(b)', r: '(ii)', marks: 2 },
      { i: 4, path: '5', top: 5, marks: 3 },
    ]
    const qp = [
      '3 (c) Write an algorithm from these requirements.',
      '1 Input a value.',
      '2 Validate the value.',
      '3 Ask for the value again if needed.',
      '4 If both inputs match, output an accepted message.',
      '[5]',
      '4 This algorithm stores the names of runners.',
      '(a) State the purpose of the array.',
      '[2]',
      'NOT (b) The algorithm uses two counters.',
      'IN (i) State the initial value of the first counter.',
      '[1]',
      'IN (ii) Explain why the second counter is incremented.',
      '[2]',
      '5 State one benefit of testing.',
      '[3]',
    ]

    const normalized = normalizeQpLinesV3(qp, ms)
    expect(normalized[4]?.startsWith('\u20604 If')).toBe(true)
    expect(normalized[9]).toBe('(b) The algorithm uses two counters.')
    expect(normalized[10]).toBe('(i) State the initial value of the first counter.')

    const stems = parseQpV3(qp, ms)
    expect(stems['4.a']).toContain('State the purpose of the array')
    expect(stems['4.b.i']).toContain('State the initial value of the first counter')
    expect(stems['4.b.ii']).toContain('Explain why the second counter is incremented')
  })

  it('strips a margin token before a top-level question number', () => {
    const ms: ParsedLeaf[] = [
      { i: 0, path: '1.b', top: 1, a: '(b)', marks: 4 },
      { i: 1, path: '2', top: 2, marks: 3 },
      { i: 2, path: '3.a', top: 3, a: '(a)', marks: 4 },
    ]
    const qp = [
      '1 (b) Explain the previous method.',
      '[4]',
      'IN 2 Three uses of arithmetic operators are shown.',
      'Draw one line from each use to the correct result.',
      '[3]',
      '3 The purpose of this algorithm is to sort values.',
      '(a) State the purpose of the flag.',
      '[4]',
      'Price',
      '2 decimal places',
    ]

    const normalized = normalizeQpLinesV3(qp, ms)
    expect(normalized[2]).toBe('2 Three uses of arithmetic operators are shown.')
    const stems = parseQpV3(qp, ms)
    expect(stems['2']).toContain('Three uses of arithmetic operators are shown')
    expect(stems['2']).not.toContain('decimal places')
  })

  it('strips reversed vertical margin fragments before letter and roman part labels', () => {
    const ms: ParsedLeaf[] = [
      { i: 0, path: '2.d', top: 2, a: '(d)', marks: 3 },
      { i: 1, path: '2.e.i', top: 2, a: '(e)', r: '(i)', marks: 2 },
      { i: 2, path: '2.e.ii', top: 2, a: '(e)', r: '(ii)', marks: 2 },
      { i: 3, path: '3', top: 3, marks: 1 },
    ]
    const qp = [
      '2 Data is transmitted across a network.',
      '(d) Describe how a checksum is used.',
      '[3]',
      'OD (e) All data is encrypted before transmission.',
      '(i) Give two types of encryption.',
      '[2]',
      'ETIRW (ii) Describe what is meant by an encryption key.',
      '[2]',
      '3 State one security measure.',
      '[1]',
    ]

    const normalized = normalizeQpLinesV3(qp, ms)
    expect(normalized[3]).toBe('(e) All data is encrypted before transmission.')
    expect(normalized[6]).toBe('(ii) Describe what is meant by an encryption key.')

    const stems = parseQpV3(qp, ms)
    expect(stems['2.e.i']).toContain('Give two types of encryption')
    expect(stems['2.e.ii']).toContain('Describe what is meant by an encryption key')
  })
})
