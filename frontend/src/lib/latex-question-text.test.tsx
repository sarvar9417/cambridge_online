import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LatexQuestionText } from './latex-question-text';

describe('LatexQuestionText', () => {
  it('renders prose paragraphs and inline maths with KaTeX', () => {
    const html = renderToStaticMarkup(
      <LatexQuestionText latex={String.raw`Calculate \(2^{10} \times 8\).\\par Give your answer in mebibytes.`} />,
    );
    expect(html).toContain('data-body-format="latex"');
    expect(html).toContain('data-math-renderer="katex"');
    expect(html).toContain('Give your answer in mebibytes.');
    expect(html).toContain('katex');
  });

  it('uses plain markdown text while a question is not promoted', () => {
    const html = renderToStaticMarkup(<LatexQuestionText fallback="Source question" />);
    expect(html).toContain('<p>Source question</p>');
    expect(html).not.toContain('data-body-format="latex"');
  });

  it('fails visibly for invalid math without dropping the source', () => {
    const html = renderToStaticMarkup(<LatexQuestionText latex={String.raw`Broken \(\frac{2\)`} />);
    expect(html).toContain('latex-question-math-error');
    expect(html).toContain('frac');
  });
});
