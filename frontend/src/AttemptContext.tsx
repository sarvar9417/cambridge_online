import { Fragment, type ReactNode } from 'react';

type ContextBlock =
  | { type: 'source'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; text: string }
  | { type: 'table'; rows: string[][] };

const sourceRef = /^\[[^\]\n]+\]$/;
const tableLine = /^\s*\|.*\|\s*$/;
const dividerCell = /^:?-{3,}:?$/;

function tableCells(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isDivider(row: string[]) {
  return row.length > 0 && row.every((cell) => dividerCell.test(cell.replace(/\s+/g, '')));
}

/**
 * Small, deliberately constrained Markdown subset for frozen Cambridge context.
 * It supports the structures produced by ingestion (paragraphs, source refs,
 * pipe tables and fenced code) without accepting raw HTML.
 */
export function parseAttemptContext(value: string): ContextBlock[] {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ContextBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) { index += 1; continue; }

    if (line.trim().startsWith('```')) {
      index += 1;
      const code: string[] = [];
      while (index < lines.length && !(lines[index] ?? '').trim().startsWith('```')) {
        code.push(lines[index] ?? '');
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', text: code.join('\n').replace(/\s+$/, '') });
      continue;
    }

    if (tableLine.test(line)) {
      const rawRows: string[][] = [];
      while (index < lines.length && tableLine.test(lines[index] ?? '')) {
        rawRows.push(tableCells(lines[index] ?? ''));
        index += 1;
      }
      const rows = rawRows.filter((row) => !isDivider(row));
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }

    if (sourceRef.test(line.trim())) {
      blocks.push({ type: 'source', text: line.trim().slice(1, -1) });
      index += 1;
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (
      index < lines.length
      && (lines[index] ?? '').trim()
      && !(lines[index] ?? '').trim().startsWith('```')
      && !tableLine.test(lines[index] ?? '')
      && !sourceRef.test((lines[index] ?? '').trim())
    ) {
      paragraph.push((lines[index] ?? '').trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

function inline(text: string): ReactNode[] {
  const pieces = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return pieces.map((piece, index) => {
    if (piece.startsWith('`') && piece.endsWith('`')) {
      return <code key={index}>{piece.slice(1, -1)}</code>;
    }
    if (piece.startsWith('**') && piece.endsWith('**')) {
      return <strong key={index}>{piece.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{piece}</Fragment>;
  });
}

export function AttemptContext({ value }: { value: string }) {
  const blocks = parseAttemptContext(value);
  return (
    <div className="attempt-context">
      {blocks.map((block, index) => {
        if (block.type === 'source') {
          return <div className="attempt-context-ref" key={index}>{block.text}</div>;
        }
        if (block.type === 'code') {
          return <pre className="attempt-context-code" key={index}><code>{block.text}</code></pre>;
        }
        if (block.type === 'table') {
          const [header, ...body] = block.rows;
          if (!header) return null;
          return (
            <div className="attempt-context-table-wrap" key={index}>
              <table className="attempt-context-table">
                <thead><tr>{header.map((cell, cellIndex) => <th key={cellIndex}>{inline(cell)}</th>)}</tr></thead>
                {body.length > 0 && <tbody>{body.map((row, rowIndex) => (
                  <tr key={rowIndex}>{header.map((_, cellIndex) => <td key={cellIndex}>{inline(row[cellIndex] ?? '')}</td>)}</tr>
                ))}</tbody>}
              </table>
            </div>
          );
        }
        return <p className="attempt-context-text" key={index}>{inline(block.text)}</p>;
      })}
    </div>
  );
}
