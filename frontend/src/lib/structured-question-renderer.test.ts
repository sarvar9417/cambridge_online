import { describe, expect, it } from 'vitest';
import { readableBooleanLatex, renderStructuredQuestionContent } from './structured-question-renderer';
import type { StructuredQuestionContent } from './structured-question-content';

const source = {
  paperId: '11111111-1111-4111-8111-111111111111',
  sha256: 'a'.repeat(64),
};

function render(content: StructuredQuestionContent) {
  const host = document.createElement('div');
  host.append(renderStructuredQuestionContent(content));
  return host;
}

describe('structured question DOM renderer', () => {
  it('renders mathematical LaTeX with KaTeX rather than exposing source code', () => {
    const latex = String.raw`\frac{2^{10}}{2^4}=2^6`;
    const host = render({
      version: 1,
      source,
      blocks: [{ type: 'math', semantics: 'math', latex, display: true, source: { page: 2 } }],
    });
    const math = host.querySelector<HTMLElement>('[data-question-block="math"]');
    expect(math?.dataset.mathRenderer).toBe('katex');
    expect(math?.dataset.latex).toBe(latex);
    expect(math?.querySelector('.katex')).not.toBeNull();
    expect(math?.querySelector('math')).not.toBeNull();
    expect(math?.textContent).not.toContain(String.raw`\frac`);
    expect(math?.dataset.sourcePage).toBe('2');
  });

  it('renders Boolean LaTeX with KaTeX while preserving readable accessibility notation', () => {
    const latex = String.raw`\overline{A} \land B \oplus C`;
    expect(readableBooleanLatex(latex)).toBe('A̅ ∧ B ⊕ C');
    const host = render({
      version: 1,
      source,
      blocks: [{ type: 'math', semantics: 'boolean_expression', latex, display: true, source: { page: 4 } }],
    });
    const math = host.querySelector<HTMLElement>('[data-question-block="math"]');
    expect(math?.querySelector('.katex')).not.toBeNull();
    expect(math?.dataset.latex).toBe(latex);
    expect(math?.getAttribute('aria-label')).toBe('A̅ ∧ B ⊕ C');
  });

  it('fails visibly instead of silently dropping invalid LaTeX', () => {
    const latex = String.raw`\frac{broken`;
    const host = render({
      version: 1,
      source,
      blocks: [{ type: 'math', semantics: 'math', latex, display: true, source: { page: 5 } }],
    });
    const math = host.querySelector<HTMLElement>('[data-question-block="math"]');
    expect(math?.classList.contains('structured-question-math-invalid')).toBe(true);
    expect(math?.textContent).toBe(latex);
    expect(math?.dataset.mathError).toBeTruthy();
  });

  it('renders verified assets by stable id and fails visibly when unresolved', () => {
    const assetId = '22222222-2222-4222-8222-222222222222';
    const content: StructuredQuestionContent = {
      version: 1,
      source,
      blocks: [{ type: 'asset', kind: 'logic_circuit', assetId, altText: 'Logic circuit', source: { page: 2 } }],
    };
    const ready = document.createElement('div');
    ready.append(renderStructuredQuestionContent(content, {
      resolveAsset: (id) => id === assetId ? 'https://signed.example/circuit.png' : null,
    }));
    expect(ready.querySelector('img')?.getAttribute('src')).toBe('https://signed.example/circuit.png');
    const missing = document.createElement('div');
    missing.append(renderStructuredQuestionContent(content));
    expect(missing.querySelector('[data-asset-missing="true"]')?.textContent).toBe('Logic circuit');
  });
});
