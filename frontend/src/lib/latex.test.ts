import { describe, expect, it } from 'vitest';
import { renderLatex, tokenizeLatex } from './latex';

describe('tokenizeLatex', () => {
  it('splits prose from inline maths', () => {
    expect(tokenizeLatex('Convert $2^{10}$ bytes')).toEqual([
      { kind: 'text', value: 'Convert ', display: false },
      { kind: 'math', value: '2^{10}', display: false },
      { kind: 'text', value: ' bytes', display: false },
    ]);
  });

  it('marks display maths', () => {
    const tokens = tokenizeLatex('$$x = y$$');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ kind: 'math', display: true });
  });

  it('treats an escaped dollar as prose', () => {
    expect(tokenizeLatex('costs \\$5')).toEqual([
      { kind: 'text', value: 'costs $5', display: false },
    ]);
  });

  it('keeps an unterminated run as prose instead of eating the question', () => {
    expect(tokenizeLatex('Explain $x')).toEqual([
      { kind: 'text', value: 'Explain $x', display: false },
    ]);
  });

  it('handles several runs in one stem', () => {
    const tokens = tokenizeLatex('$a$ and $b$ and $$c$$');
    expect(tokens.filter((token) => token.kind === 'math')).toHaveLength(3);
  });

  it('returns prose only when there is no maths', () => {
    expect(tokenizeLatex('Explain why a primary key is required.')).toEqual([
      { kind: 'text', value: 'Explain why a primary key is required.', display: false },
    ]);
  });
});

describe('renderLatex', () => {
  it('renders maths through KaTeX', () => {
    const { html, errors } = renderLatex('Value $2^{10}$');
    expect(errors).toEqual([]);
    expect(html).toContain('katex');
    expect(html).toContain('Value');
  });

  it('escapes HTML an author typed in prose', () => {
    const { html } = renderLatex('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('reports a broken formula without throwing', () => {
    const { html, errors } = renderLatex('$\\frac{1}$');
    expect(errors).toHaveLength(1);
    expect(html).toContain('latex-error');
  });

  it('keeps line breaks from the editor', () => {
    expect(renderLatex('a\nb').html).toContain('<br />');
  });

  it('strips a link even if one reached the client', () => {
    // KaTeX with trust:false neutralises \href rather than throwing: the label
    // still typesets but no anchor and no URL survive into the DOM.
    const { html } = renderLatex('$\\href{https://evil.test}{click}$');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('evil.test');
  });
});
