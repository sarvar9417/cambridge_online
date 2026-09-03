import {
  isRotatedQuestionTable,
  parseMsV2,
  parseQpV2,
  type ParsedLeaf,
  type PdfTextItem,
} from './parser-v3.ts'

export { isRotatedQuestionTable }
export type { ParsedLeaf, PdfTextItem }

type HorizontalMarkSchemeTable = {
  answerX: number
  marksX: number
  guidanceX: number
}

const QUESTION_PATH = /^\d{1,2}(?:\([a-z]\))?(?:\([ivx]+\))?$/i
const INTEGER_MARK = /^\d{1,2}$/
const MIRROR_NOISE = /(?:papacambridge\.com|Downloaded from PapaCambridge|Licensed for hosting|Re-uploading, mirroring or re-hosting|Trace ID:)/i
const MARGIN_PREFIX = /^(?:THIS|IN|WRITE|NOT|DO|MARGIN)\s+(?=(?:\([a-zivx]+\)|\d{1,2}\b))/
const MARKED_ROMAN_ROW = /^(\d{1,2})\(([a-z])\)\(([ivx]+)\)\s+.*\s+(\d{1,2})\s*$/i
const ROMAN_SEQUENCE = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'] as const
const STANDALONE_BRACKET_MARK = /(?:^|\s)\[\s*(\d{1,2})\s*\](?=\s|$)/g

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizedQpLine(value: string): string {
  const line = compact(value)
  if (!line || MIRROR_NOISE.test(line)) return ''
  return line.replace(MARGIN_PREFIX, '')
}

function romanKey(line: string): { top: number; part: string; roman: string; mark: number } | null {
  const match = compact(line).match(MARKED_ROMAN_ROW)
  if (!match) return null
  const mark = Number(match[4])
  if (!Number.isInteger(mark) || mark < 1 || mark > 20) return null
  return { top: Number(match[1]), part: match[2]!.toLowerCase(), roman: match[3]!.toLowerCase(), mark }
}

export function normalizeDuplicateRomanMarkRows(ls: string[]): string[] {
  const out = [...ls]
  const explicit = new Set<string>()
  for (const line of out) {
    const row = romanKey(line)
    if (row) explicit.add(`${row.top}.${row.part}.${row.roman}`)
  }

  const lastSeen = new Map<string, number>()
  for (let i = 0; i < out.length; i++) {
    const row = romanKey(out[i] ?? '')
    if (!row) continue
    const key = `${row.top}.${row.part}.${row.roman}`
    const previous = lastSeen.get(key)
    if (previous !== undefined && i - previous <= 20 && romanKey(out[previous] ?? '')) {
      const romanIndex = ROMAN_SEQUENCE.indexOf(row.roman as (typeof ROMAN_SEQUENCE)[number])
      const nextRoman = romanIndex >= 0 ? ROMAN_SEQUENCE[romanIndex + 1] : undefined
      const nextKey = nextRoman ? `${row.top}.${row.part}.${nextRoman}` : ''
      if (nextRoman && !explicit.has(nextKey)) {
        out[i] = compact(out[i] ?? '').replace(
          /^(\d{1,2}\([a-z]\)\()[ivx]+(\))/i,
          `$1${nextRoman}$2`,
        )
        explicit.add(nextKey)
      }
    }
    lastSeen.set(key, i)
  }
  return out
}

function repairLegacyBracketMarks(rows: ParsedLeaf[]): ParsedLeaf[] {
  return rows.map((row) => {
    const guidance = row.guidance ?? ''
    const standalone = [...guidance.matchAll(STANDALONE_BRACKET_MARK)]
      .map((match) => Number(match[1]))
      .filter((mark) => Number.isInteger(mark) && mark >= 1 && mark <= 20)
    if (!standalone.length) return row
    const mark = standalone[standalone.length - 1]!
    return mark === row.marks ? row : { ...row, marks: mark }
  })
}

export function detectHorizontalMarkSchemeTable(items: PdfTextItem[]): HorizontalMarkSchemeTable | null {
  const question = items.find((item) => item.s.trim() === 'Question')
  const answer = items.find((item) => item.s.trim() === 'Answer')
  const marks = items.find((item) => item.s.trim() === 'Marks')
  const guidance = items.find((item) => item.s.trim() === 'Guidance')
  if (!question || !answer || !marks || !guidance) return null

  const ys = [question.y, answer.y, marks.y, guidance.y]
  const sameRow = Math.max(...ys) - Math.min(...ys) <= 12
  const leftToRight = question.x < answer.x && answer.x < marks.x && marks.x < guidance.x
  if (!sameRow || !leftToRight) return null

  return { answerX: answer.x, marksX: marks.x, guidanceX: guidance.x }
}

export function formatPdfTextRow(row: PdfTextItem[], table: HorizontalMarkSchemeTable | null): string {
  const ordered = [...row].sort((a, b) => a.x - b.x)
  if (!table) return compact(ordered.map((item) => item.s).join(' '))

  const question = ordered.find(
    (item) => item.x < table.answerX && QUESTION_PATH.test(item.s.trim()),
  )
  if (!question) return compact(ordered.map((item) => item.s).join(' '))

  const markCandidates = ordered.filter((item) => {
    const text = item.s.trim()
    if (!INTEGER_MARK.test(text)) return false
    const mark = Number(text)
    return mark >= 1 && mark <= 20 && item.x >= table.marksX - 12 && item.x < table.guidanceX
  })
  if (!markCandidates.length) return compact(ordered.map((item) => item.s).join(' '))

  const mark = markCandidates.sort((a, b) => a.x - b.x)[0]!
  return compact([...ordered.filter((item) => item !== mark), mark].map((item) => item.s).join(' '))
}

export function normalizeQpLinesV3(ls: string[], ms: ParsedLeaf[]): string[] {
  const normalized = ls.map(normalizedQpLine)
  const byQuestion = new Map<number, string[]>()
  for (const leaf of ms) {
    const q = Number(leaf.path.split('.')[0])
    if (!byQuestion.has(q)) byQuestion.set(q, [])
    byQuestion.get(q)!.push(leaf.path)
  }

  let previousStart = -1
  for (const q of [...byQuestion.keys()].sort((a, b) => a - b)) {
    const hasSubparts = byQuestion.get(q)!.some((path) => path.includes('.'))
    const candidates: Array<{ index: number; distanceToA: number }> = []

    for (let i = previousStart + 1; i < normalized.length; i++) {
      const line = normalized[i] ?? ''
      const match = line.match(new RegExp(`^${q}\\s+(.+)`))
      if (!match) continue
      const rest = match[1]!.trim()
      if (!rest || !/[A-Z(]/.test(rest[0]!)) continue

      const inlineA = new RegExp(`^${q}\\s+.*?\\(a\\)(?:\\s|$)`, 'i').test(line)
      let distanceToA = inlineA ? 0 : Number.POSITIVE_INFINITY
      if (hasSubparts && !inlineA) {
        for (let j = i + 1; j < Math.min(normalized.length, i + 220); j++) {
          if (/^\(a\)\s*/i.test(normalized[j] ?? '')) {
            distanceToA = j - i
            break
          }
        }
        if (!Number.isFinite(distanceToA)) continue
      }
      candidates.push({ index: i, distanceToA })
    }

    if (!candidates.length) continue
    candidates.sort((a, b) => a.distanceToA - b.distanceToA || a.index - b.index)
    const chosen = candidates[0]!.index

    // Keep numbered steps in the source text, but prevent the base parser from
    // treating an earlier step number (for example "4 If ...") as Question 4.
    for (const candidate of candidates) {
      if (candidate.index < chosen) normalized[candidate.index] = `\u2060${normalized[candidate.index]}`
    }
    previousStart = chosen
  }

  return normalized
}

export function parseMsV3(ls: string[]): ParsedLeaf[] {
  return repairLegacyBracketMarks(parseMsV2(normalizeDuplicateRomanMarkRows(ls)))
}

export function parseQpV3(ls: string[], ms: ParsedLeaf[]): Record<string, string> {
  return parseQpV2(normalizeQpLinesV3(ls, ms), ms)
}
