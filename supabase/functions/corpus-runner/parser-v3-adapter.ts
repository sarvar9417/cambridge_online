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

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizedQpLine(value: string): string {
  const line = compact(value)
  if (!line || MIRROR_NOISE.test(line)) return ''
  return line.replace(MARGIN_PREFIX, '')
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
  return parseMsV2(ls)
}

export function parseQpV3(ls: string[], ms: ParsedLeaf[]): Record<string, string> {
  return parseQpV2(normalizeQpLinesV3(ls, ms), ms)
}
