import type { ReactNode } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

type LatexQuestionTextProps = {
  latex?: string | null;
  fallback?: string | null;
  className?: string;
};

const SAFE_TEXT_ESCAPES: Array<[RegExp, string]> = [
  [/\\#/g, '#'],
  [/\\_/g, '_'],
  [/\\%/g, '%'],
  [/\\&/g, '&'],
  [/\\\$/g, '$'],
  [/\\textasciitilde\{\}/g, '~'],
  [/\\textbackslash\{\}/g, '\\'],
];

function plainText(source: string) {
  let value = source;
  for (const [pattern, replacement] of SAFE_TEXT_ESCAPES) value = value.replace(pattern, replacement);
  return value
    .replace(/\\texttt\{([^{}]*)\}/g, '$1')
    .replace(/\\textbf\{([^{}]*)\}/g, '$1')
    .replace(/\\emph\{([^{}]*)\}/g, '$1')
    .trim();
}

function mathHtml(latex: string, displayMode: boolean) {
  return katex.renderToString(latex, {
    displayMode,
    throwOnError: true,
    strict: 'warn',
    trust: false,
    output: 'htmlAndMathml',
  });
}

function renderParagraph(source: string, paragraphIndex: number): ReactNode {
  const nodes: ReactNode[] = [];
  const expression = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let token = 0;

  while ((match = expression.exec(source))) {
    const before = plainText(source.slice(cursor, match.index));
    if (before) nodes.push(before);
    const displayMode = match[1] !== undefined;
    const latex = (displayMode ? match[1] : match[2]) ?? '';
    try {
      nodes.push(
        <span
          key={`math-${paragraphIndex}-${token++}`}
          className={displayMode ? 'latex-question-math latex-question-math-display' : 'latex-question-math'}
          data-latex={latex}
          data-math-renderer="katex"
          dangerouslySetInnerHTML={{ __html: mathHtml(latex, displayMode) }}
        />,
      );
    } catch (error) {
      nodes.push(
        <span
          key={`math-error-${paragraphIndex}-${token++}`}
          className="latex-question-math-error"
          data-latex={latex}
          title={error instanceof Error ? error.message : 'Invalid LaTeX'}
        >
          {displayMode ? `\\[${latex}\\]` : `\\(${latex}\\)`}
        </span>,
      );
    }
    cursor = expression.lastIndex;
  }

  const tail = plainText(source.slice(cursor));
  if (tail) nodes.push(tail);
  return nodes;
}

export function LatexQuestionText({ latex, fallback = '', className }: LatexQuestionTextProps) {
  const source = latex?.trim();
  if (!source) return <p className={className}>{fallback}</p>;

  const paragraphs = source
    .split(/\\par(?:\s+|$)/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className={className ? `latex-question-text ${className}` : 'latex-question-text'} data-body-format="latex">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{renderParagraph(paragraph, index)}</p>
      ))}
    </div>
  );
}
