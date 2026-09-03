export type QuestionTextBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'task'; text: string }
  | { type: 'code'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: string[] };

const BULLET = /^\s*(?:[•●▪◦]|[-*])\s+(.+?)\s*$/;
const TABLE = /^\s*\|.*\|\s*$/;
const TASK = /^\s*(?:Write|State|Give|Name|Identify|Define|Describe|Explain|Compare|Calculate|Complete|Draw|Evaluate|Justify|Suggest|Show|Determine|Find|Convert|Use|Select|Tick|Circle|Fill|Indicate|Outline|Label|Construct|Predict)\b/i;
const PSEUDOCODE = /^\s*(?:TYPE\b|ENDTYPE\b|DECLARE\b|CONSTANT\b|IF\b|ELSE\b|ELSEIF\b|ENDIF\b|FOR\b|NEXT\b|WHILE\b|ENDWHILE\b|REPEAT\b|UNTIL\b|CASE\s+OF\b|OTHERWISE\b|ENDCASE\b|PROCEDURE\b|ENDPROCEDURE\b|FUNCTION\b|ENDFUNCTION\b|CALL\b|RETURN\b|INPUT\b|OUTPUT\b|OPENFILE\b|READFILE\b|WRITEFILE\b|CLOSEFILE\b|SEEK\b|GETRECORD\b|PUTRECORD\b|CLASS\b|ENDCLASS\b|PUBLIC\b|PRIVATE\b|INHERITS\b|SUPER\b)/i;
const SQL = /^\s*(?:SELECT\b|FROM\b|WHERE\b|ORDER\s+BY\b|GROUP\s+BY\b|INSERT\s+INTO\b|UPDATE\b|DELETE\s+FROM\b|CREATE\s+TABLE\b|ALTER\s+TABLE\b|DROP\s+TABLE\b)/i;
const PROGRAM_CODE = /^\s*(?:def\s+\w+\s*\(|class\s+\w+|if\s+.+:|elif\s+.+:|else\s*:|for\s+.+:|while\s+.+:|return\b|print\s*\(|input\s*\(|#include\b|using\s+namespace\b|public\s*:|private\s*:|protected\s*:|(?:int|float|double|bool|boolean|char|string|String|void)\s+[A-Za-z_]\w*)/;
const ASSIGNMENT = /^\s*[A-Za-z_]\w*(?:\s*\[[^\]]+\])?(?:\.[A-Za-z_]\w*)*\s*(?:←|<-|:=|=(?!=))\s*.+$/;
const CODE_PUNCTUATION = /^\s*(?:\{|\}|\);?|\];?)\s*$/;
const FENCE = /^\s*```/;

function normalise(value: string) {
  return value.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

function isCodeLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return PSEUDOCODE.test(line)
    || SQL.test(line)
    || PROGRAM_CODE.test(line)
    || ASSIGNMENT.test(line)
    || CODE_PUNCTUATION.test(line);
}

function startsSpecial(line: string) {
  return BULLET.test(line) || TABLE.test(line) || FENCE.test(line) || isCodeLine(line) || TASK.test(line);
}

/**
 * Convert source-faithful Cambridge question text into presentation blocks.
 *
 * The function deliberately does not rewrite wording. It only removes PDF line
 * wrapping inside prose paragraphs and preserves meaningful line boundaries in
 * pseudocode/program code. This means the database remains the source of truth
 * while every UI can present the same stem in a readable structure.
 */
export function structureQuestionText(value: string | null | undefined): QuestionTextBlock[] {
  const source = normalise(value ?? '');
  if (!source) return [];
  const lines = source.split('\n');
  const blocks: QuestionTextBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (FENCE.test(line)) {
      index += 1;
      const code: string[] = [];
      while (index < lines.length && !FENCE.test(lines[index] ?? '')) {
        code.push(lines[index] ?? '');
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', text: code.join('\n').replace(/\s+$/, '') });
      continue;
    }

    if (TABLE.test(line)) {
      const rows: string[] = [];
      while (index < lines.length && TABLE.test(lines[index] ?? '')) {
        rows.push((lines[index] ?? '').trim());
        index += 1;
      }
      blocks.push({ type: 'table', rows });
      continue;
    }

    const bullet = line.match(BULLET);
    if (bullet) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = (lines[index] ?? '').match(BULLET);
        if (!match) break;
        items.push(match[1]!.trim());
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    if (isCodeLine(line)) {
      const code: string[] = [];
      while (index < lines.length) {
        const current = lines[index] ?? '';
        if (!current.trim()) break;
        if (isCodeLine(current)) {
          code.push(current.trimEnd());
          index += 1;
          continue;
        }
        // Keep indented continuations and short symbol/value lines with an
        // established code block, but stop before ordinary explanatory prose.
        if (/^\s{2,}\S/.test(current) || /^[\w'".-]+(?:\s*,\s*[\w'".-]+)+\s*$/.test(current.trim())) {
          code.push(current.trimEnd());
          index += 1;
          continue;
        }
        break;
      }
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }

    if (TASK.test(line)) {
      const task = [line.trim()];
      index += 1;
      while (index < lines.length) {
        const next = lines[index] ?? '';
        if (!next.trim() || startsSpecial(next)) break;
        task.push(next.trim());
        index += 1;
      }
      blocks.push({ type: 'task', text: task.join(' ') });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length) {
      const next = lines[index] ?? '';
      if (!next.trim() || startsSpecial(next)) break;
      paragraph.push(next.trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

export function hasMeaningfulQuestionStructure(value: string | null | undefined) {
  const blocks = structureQuestionText(value);
  return blocks.length > 1 || blocks.some((block) => block.type !== 'paragraph');
}
