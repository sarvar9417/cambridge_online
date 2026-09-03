import { describe, expect, it } from 'vitest'
import {
  isRotatedQuestionTable,
  parseMsV2,
  parseQpV2,
  type ParsedLeaf,
} from '../../supabase/functions/corpus-runner/parser.ts'

describe('0478 corpus parser layout contracts', () => {
  it('does not mistake repeated horizontal Question/Answer/Marks headers for a rotated table', () => {
    const items = [
      { s: 'Question', x: 20, y: 700 }, { s: 'Answer', x: 160, y: 700 }, { s: 'Marks', x: 520, y: 700 },
      { s: 'Question', x: 20, y: 390 }, { s: 'Answer', x: 160, y: 390 }, { s: 'Marks', x: 520, y: 390 },
    ]
    expect(isRotatedQuestionTable(items)).toBe(false)
  })

  it('still recognises a genuinely vertical/rotated Question/Answer/Marks header', () => {
    const items = [
      { s: 'Question', x: 40, y: 700 },
      { s: 'Answer', x: 42, y: 520 },
      { s: 'Marks', x: 39, y: 330 },
    ]
    expect(isRotatedQuestionTable(items)).toBe(true)
  })

  it('parses legacy bracket-mark schemes used by early 0478 papers', () => {
    const rows = parseMsV2([
      '1 (a) parallel',
      '8 bits are sent at a time',
      '[2]',
      '(b) faster transmission',
      '[2]',
      '2 (a) universal serial bus',
      '[1]',
      '(b) Any two from:',
      'devices are automatically detected',
      '[2]',
    ])
    expect(rows.map((row) => [row.path, row.marks])).toEqual([
      ['1.a', 2], ['1.b', 2], ['2.a', 1], ['2.b', 2],
    ])
    expect(rows.reduce((sum, row) => sum + row.marks, 0)).toBe(7)
  })

  it('normalises zero-padded modern mark-scheme question numbers', () => {
    const rows = parseMsV2([
      '1 Answer one 1',
      '2 Answer two 2',
      '03 Answer three 3',
    ])
    expect(rows.map((row) => row.path)).toEqual(['1', '2', '3'])
  })

  it('finds a subpart when the top-level question starts directly with (a)', () => {
    const ms: ParsedLeaf[] = [
      { i: 0, path: '3.a', top: 3, a: '(a)', marks: 3 },
      { i: 1, path: '3.b', top: 3, a: '(b)', marks: 4 },
    ]
    const stems = parseQpV2([
      '3 (a) An example of a URL is shown.',
      'Identify the three parts. [3]',
      '(b) Describe what is meant by an IP address.',
      '[4]',
      '4 Six components are shown.',
    ], ms)
    expect(stems['3.a']).toContain('Identify the three parts')
    expect(stems['3.b']).toContain('Describe what is meant by an IP address')
  })

  it('splits context and (a) when PDF extraction merges them onto one top-level line', () => {
    const ms: ParsedLeaf[] = [
      { i: 0, path: '4.a', top: 4, a: '(a)', marks: 1 },
      { i: 1, path: '4.b', top: 4, a: '(b)', marks: 2 },
    ]
    const stems = parseQpV2([
      '4 A student uses both system software and application software. (a) Give one example of system software.',
      '[1]',
      '(b) Give two examples of application software.',
      '[2]',
      '5 Instructions are processed by a CPU.',
    ], ms)
    expect(stems['4.a']).toContain('Give one example of system software')
    expect(stems['4.b']).toContain('Give two examples of application software')
    expect(stems['4.b']).toContain('A student uses both system software and application software')
  })
})
