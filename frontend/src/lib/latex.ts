import katex from 'katex';

export interface LatexToken {
  kind: 'text' | 'math';
  value: string;
  display: boolean;
}

/**
 * Split authored text into prose and maths runs.
 *
 * `$...$` is inline maths, `$$...$$` is display maths, and `\$` is a literal
 * dollar sign. An unterminated run is treated as prose rather than swallowing
 * the rest of the question: a half-typed formula in the editor must still show
 * the words around it.
 */
export function tokenizeLatex(source: string): LatexToken[] {
  const tokens: LatexToken[] = [];
  let text = '';
  let index = 0;

  const pushText = () => {
    if (text) tokens.push({ kind: 'text', value: text, display: false });
    text = '';
  };

  while (index < source.length) {
    const character = source[index]!;

    if (character === '\\' && source[index + 1] === '$') {
      text += '$';
      index += 2;
      continue;
    }
    if (character !== '$') {
      text += character;
      index += 1;
      continue;
    }

    const display = source[index + 1] === '$';
    const delimiter = display ? '$$' : '$';
    const start = index + delimiter.length;
    let end = -1;

    for (let scan = start; scan < source.length; scan += 1) {
      if (source[scan] === '\\') {
        scan += 1;
        continue;
      }
      if (source.startsWith(delimiter, scan)) {
        // A lone `$` cannot close a `$$` run.
        if (!display && source[scan + 1] === '$') continue;
        end = scan;
        break;
      }
    }

    if (end === -1) {
      text += source.slice(index);
      break;
    }

    pushText();
    tokens.push({ kind: 'math', value: source.slice(start, end), display });
    index = end + delimiter.length;
  }

  pushText();
  return tokens;
}

export interface RenderedLatex {
  html: string;
  errors: string[];
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Render authored text to HTML.
 *
 * Prose is HTML-escaped before it is concatenated, so nothing an author types
 * outside a maths run can inject markup. KaTeX runs with `trust: false`, which
 * blocks `\href`, `\url` and `\includegraphics` regardless of what the backend
 * validator let through.
 */
export function renderLatex(source: string): RenderedLatex {
  const errors: string[] = [];
  const html = tokenizeLatex(source)
    .map((token) => {
      if (token.kind === 'text') {
        return escapeHtml(token.value)
          .replace(/\n{2,}/g, '</p><p>')
          .replace(/\n/g, '<br />');
      }
      try {
        return katex.renderToString(token.value, {
          displayMode: token.display,
          throwOnError: true,
          strict: false,
          trust: false,
          output: 'html',
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'LaTeX xatosi');
        return `<code class="latex-error">${escapeHtml(token.value)}</code>`;
      }
    })
    .join('');

  return { html: `<p>${html}</p>`, errors };
}
