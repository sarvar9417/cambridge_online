export type PdfTextItem = { s: string; x: number; y: number }
export type ParsedLeaf = { i: number; path: string; top: number; a?: string; r?: string; marks: number; guidance?: string }

const ROM = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i

export function isRotatedQuestionTable(items: PdfTextItem[]): boolean {
  const q = items.filter((z) => z.s.trim() === 'Question')
  const a = items.filter((z) => z.s.trim() === 'Answer')
  const m = items.filter((z) => z.s.trim() === 'Marks')
  return q.some((qq) => a.some((aa) => m.some((mm) => {
    const xs = [qq.x, aa.x, mm.x]
    const ys = [qq.y, aa.y, mm.y]
    return Math.max(...xs) - Math.min(...xs) < 12 && Math.max(...ys) - Math.min(...ys) > 80
  })))
}

function cleanLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function isCambridgeHeader(s: string): boolean {
  return s.includes('9618/') || s.includes('0478/') || s.includes('Cambridge International')
}

function makePath(top: number, a?: string | null, roman?: string | null): string {
  return [String(top), a?.replace(/[()]/g, '').toLowerCase(), roman?.replace(/[()]/g, '').toLowerCase()].filter(Boolean).join('.')
}

function finalizePrimary(candidates: ParsedLeaf[], ls: string[]): ParsedLeaf[] {
  const ordered: ParsedLeaf[] = []
  let cur = 0
  const seen = new Set<string>()
  for (const x of candidates) {
    if (x.a || x.r) {
      if (x.top < cur || x.top > cur + 1) continue
      if (x.top === cur + 1) cur = x.top
    } else {
      if (x.top !== cur + 1) continue
      cur = x.top
    }
    if (!seen.has(x.path)) {
      seen.add(x.path)
      ordered.push(x)
    }
  }
  const sub = new Set(ordered.filter((x) => x.path.includes('.')).map((x) => x.top))
  const leaves = ordered.filter((x) => x.path.includes('.') || !sub.has(x.top))
  for (let j = 0; j < leaves.length; j++) {
    const start = leaves[j]!.i
    const end = j + 1 < leaves.length ? leaves[j + 1]!.i : ls.length
    leaves[j]!.guidance = ls.slice(start, end).filter((x) => x && !isCambridgeHeader(x) && !x.startsWith('©')).join('\n')
  }
  return leaves
}

function parsePrimaryMs(ls: string[]): ParsedLeaf[] {
  const candidates: ParsedLeaf[] = []
  for (let i = 0; i < ls.length; i++) {
    const s = cleanLine(ls[i] ?? '')
    const m = s.match(/^(\d{1,2})\s*(\([a-z]\))?\s*(\([ivx]+\))?\s+(?:(.*?)\s+)?(\d+)\s*$/i)
    if (!m) continue
    const top = Number(m[1])
    const marks = Number(m[5])
    if (!Number.isInteger(top) || top < 1 || top > 30 || !Number.isInteger(marks) || marks < 1 || marks > 20) continue
    candidates.push({ i, path: makePath(top, m[2], m[3]), top, a: m[2] ?? undefined, r: m[3] ?? undefined, marks })
  }
  return finalizePrimary(candidates, ls)
}

type LegacyStart = { i: number; path: string; top: number; a?: string; r?: string }

function legacyStarts(ls: string[]): LegacyStart[] {
  const starts: LegacyStart[] = []
  let top = 0
  let a = ''
  const push = (value: LegacyStart) => {
    if (starts.some((x) => x.i === value.i && x.path === value.path)) return
    starts.push(value)
  }
  for (let i = 0; i < ls.length; i++) {
    const s = cleanLine(ls[i] ?? '')
    if (!s || isCambridgeHeader(s) || s.startsWith('©')) continue

    let m = s.match(/^(\d{1,2})\s*\(([a-z])\)\s*(?:\(([ivx]+)\)\s*)?(.*)$/i)
    if (m) {
      const q = Number(m[1])
      if (q >= 1 && q <= 30 && (top === 0 || q === top || q === top + 1)) {
        top = q
        a = m[2]!.toLowerCase()
        push({ i, path: makePath(top, a, m[3]), top, a, r: m[3]?.toLowerCase() })
      }
      continue
    }

    // Early 0478 mark schemes sometimes start a whole question with text such
    // as "4 1 mark per correct word" or simply "9" before a table. The old
    // detector required the first character after the number to be a letter or
    // '(', which silently dropped these sequential top-level questions.
    m = s.match(/^(\d{1,2})(?:\s+|$)(.*)$/)
    if (m) {
      const q = Number(m[1])
      if (q >= 1 && q <= 30 && (top === 0 || q === top + 1)) {
        top = q
        a = ''
        push({ i, path: String(top), top })
      }
      continue
    }

    m = s.match(/^\(([a-z])\)\s*(?:\(([ivx]+)\)\s*)?(.*)$/i)
    if (m && top > 0) {
      a = m[1]!.toLowerCase()
      push({ i, path: makePath(top, a, m[2]), top, a, r: m[2]?.toLowerCase() })
      continue
    }

    m = s.match(/^\(([ivx]+)\)\s*(.*)$/i)
    if (m && top > 0 && a && ROM.test(m[1]!)) {
      push({ i, path: makePath(top, a, m[1]), top, a, r: m[1]!.toLowerCase() })
    }
  }
  return starts.sort((x, y) => x.i - y.i)
}

function parseLegacyBracketMs(ls: string[]): ParsedLeaf[] {
  const starts = legacyStarts(ls)
  const rows: ParsedLeaf[] = []
  for (let j = 0; j < starts.length; j++) {
    const start = starts[j]!
    const end = j + 1 < starts.length ? starts[j + 1]!.i : ls.length
    const segment = ls.slice(start.i, end)
    const marks = [...segment.join(' ').matchAll(/\[\s*(\d{1,2})\s*\]/g)]
      .map((m) => Number(m[1]))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 20)
    if (!marks.length) continue
    rows.push({
      ...start,
      marks: marks[marks.length - 1]!,
      guidance: segment.filter((x) => x && !isCambridgeHeader(x) && !x.startsWith('©')).join('\n'),
    })
  }
  const sub = new Set(rows.filter((x) => x.path.includes('.')).map((x) => x.top))
  return rows.filter((x) => x.path.includes('.') || !sub.has(x.top))
}

export function parseMsV2(ls: string[]): ParsedLeaf[] {
  const primary = parsePrimaryMs(ls)
  const legacy = parseLegacyBracketMs(ls)
  const pTotal = primary.reduce((sum, x) => sum + x.marks, 0)
  const lTotal = legacy.reduce((sum, x) => sum + x.marks, 0)
  return lTotal > pTotal ? legacy : primary
}

function topStartsV2(ls: string[], ms: ParsedLeaf[]): Map<number, number> {
  const by = new Map<number, string[]>()
  for (const e of ms) {
    const q = Number(e.path.split('.')[0])
    if (!by.has(q)) by.set(q, [])
    by.get(q)!.push(e.path)
  }
  const out = new Map<number, number>()
  let prev = -1
  for (const q of [...by.keys()].sort((a, b) => a - b)) {
    const hasSubparts = by.get(q)!.some((x) => x.includes('.'))
    const candidates: number[] = []
    for (let i = 0; i < ls.length; i++) {
      if (i <= prev) continue
      const line = cleanLine(ls[i] ?? '')
      const m = line.match(new RegExp(`^${q}\\s+(.+)`))
      if (!m) continue
      const rest = m[1]!.trim()
      if (!rest || isCambridgeHeader(rest) || !/[A-Z(]/.test(rest[0]!)) continue
      const inlineA = new RegExp(`^${q}\\s+.*?\\(a\\)(?:\\s|$)`, 'i').test(line)
      const separateA = ls.slice(i, Math.min(ls.length, i + 220)).some((x) => /^\(a\)\s*/i.test(cleanLine(x)))
      if (hasSubparts && !inlineA && !separateA) continue
      candidates.push(i)
    }
    if (candidates.length) {
      out.set(q, candidates[0]!)
      prev = candidates[0]!
    }
  }
  return out
}

export function parseQpV2(ls: string[], ms: ParsedLeaf[]): Record<string, string> {
  const by = new Map<number, string[]>()
  for (const e of ms) {
    const q = Number(e.path.split('.')[0])
    if (!by.has(q)) by.set(q, [])
    by.get(q)!.push(e.path)
  }
  const startsByQuestion = topStartsV2(ls, ms)
  const out: Record<string, string> = {}

  for (const q of [...by.keys()].sort((a, b) => a - b)) {
    const start = startsByQuestion.get(q)
    if (start === undefined) continue
    const nextStarts = [...startsByQuestion].filter(([k, v]) => k > q && v > start).map((x) => x[1])
    const end = nextStarts.length ? Math.min(...nextStarts) : ls.length
    const region = ls.slice(start, end)
    const paths = by.get(q)!
    const firstRaw = (cleanLine(region[0] ?? '').match(new RegExp(`^${q}\\s+(.*)`)) ?? [])[1] ?? ''
    const starts: Array<{ i: number; path: string; first: string }> = []

    let contextSeed = firstRaw
    const inline = firstRaw.match(/^(.*?)\s+\(([a-z])\)\s*(?:\(([ivx]+)\)\s*)?(.*)$/i)
    if (inline) {
      const path = makePath(q, inline[2], inline[3])
      if (paths.includes(path)) {
        contextSeed = inline[1]!.trim()
        starts.push({ i: 0, path, first: inline[4] ?? '' })
      }
    }

    const ctx = [contextSeed]
    for (const raw of region.slice(1)) {
      const line = cleanLine(raw)
      if (/^\([a-z]\)\s+/i.test(line)) break
      if (line && !isCambridgeHeader(line) && !line.startsWith('©') && !line.startsWith('*')) ctx.push(line)
    }
    const context = ctx.join(' ').replace(/\s+/g, ' ').trim()
    let currentA = ''

    for (let i = 0; i < region.length; i++) {
      const s = cleanLine(region[i] ?? '')
      let m = s.match(new RegExp(`^${q}\\s+\\(([a-z])\\)\\s*(?:\\(([ivx]+)\\)\\s*)?(.*)`, 'i'))
      if (m) {
        currentA = m[1]!.toLowerCase()
        const path = makePath(q, currentA, m[2])
        if (paths.includes(path)) starts.push({ i, path, first: m[3] ?? '' })
        continue
      }

      m = s.match(/^\(([^)]+)\)\s*(.*)/)
      if (!m) continue
      const token = m[1]!.toLowerCase()
      const rest = m[2] ?? ''
      if (ROM.test(token)) {
        const path = currentA ? makePath(q, currentA, token) : ''
        if (path && paths.includes(path)) starts.push({ i, path, first: rest })
        continue
      }
      if (/^[a-z]$/.test(token)) {
        currentA = token
        const roman = rest.match(/^\(([ivx]+)\)\s*(.*)/i)
        if (roman) {
          const path = makePath(q, currentA, roman[1])
          if (paths.includes(path)) starts.push({ i, path, first: roman[2] ?? '' })
          continue
        }
        const path = makePath(q, currentA)
        if (paths.includes(path)) starts.push({ i, path, first: rest })
      }
    }

    if (paths.includes(String(q))) starts.unshift({ i: 0, path: String(q), first: contextSeed })
    const seen = new Set<string>()
    const unique = starts.sort((a, b) => a.i - b.i).filter((x) => !seen.has(x.path) && (seen.add(x.path), true))

    for (let j = 0; j < unique.length; j++) {
      const x = unique[j]!
      const stop = j + 1 < unique.length ? unique[j + 1]!.i : region.length
      const stemLines = [x.first]
      for (const raw of region.slice(x.i + 1, stop)) {
        const line = cleanLine(raw)
        if (!line || isCambridgeHeader(line) || line.startsWith('©') || line.startsWith('*') || line === 'BLANK PAGE') continue
        stemLines.push(line.replace(/\.{10,}/g, ' '))
      }
      let stem = stemLines.join(' ').replace(/\s+/g, ' ').trim()
      const mark = ms.find((e) => e.path === x.path)?.marks
      const bracketMarks = [...stem.matchAll(/\[\s*(\d+)\s*\]/g)]
      if (bracketMarks.length && mark !== undefined) {
        const hit = bracketMarks.find((entry) => Number(entry[1]) === mark) ?? bracketMarks[0]!
        stem = stem.slice(0, (hit.index ?? 0) + hit[0].length)
      }
      if (x.path !== String(q) && context) stem = `${context.slice(0, 800)} ${stem}`.trim()
      if (stem) out[x.path] = stem
    }
  }

  return out
}
