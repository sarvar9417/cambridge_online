import { describe, expect, it } from 'vitest';
import {
  assertLatex,
  checkLatex,
  checkSvg,
  findMathSegments,
  latexToSearchText,
  LatexError,
  MAX_LATEX_LENGTH,
} from './latex.js';

const codes = (source: string) => checkLatex(source).findings.map((finding) => finding.code);

describe('checkLatex', () => {
  it('accepts a typical 9618 stem', () => {
    const result = checkLatex(
      'Convert the binary value $\\mathtt{10110101}_2$ into hexadecimal. Show your working.',
    );
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.mathSegments).toBe(1);
  });

  it('accepts display maths and supported environments', () => {
    const result = checkLatex(
      'The mantissa is $$\\begin{array}{c|c} 0 & 1 \\\\ 1 & 0 \\end{array}$$ in two’s complement.',
    );
    expect(result.ok).toBe(true);
  });

  it('accepts plain prose with no maths at all', () => {
    const result = checkLatex('Explain why a primary key is required.');
    expect(result.ok).toBe(true);
    expect(result.mathSegments).toBe(0);
  });

  it('rejects unbalanced maths delimiters', () => {
    expect(codes('Convert $2^{10}$ and $x')).toContain('unbalanced_math');
  });

  it('rejects unbalanced braces', () => {
    expect(codes('$\\frac{1}{2$')).toContain('unbalanced_braces');
    expect(codes('a } b')).toContain('unbalanced_braces');
  });

  it('does not treat an escaped dollar as a delimiter', () => {
    const result = checkLatex('The price is \\$5 and the value is $2^3$.');
    expect(result.ok).toBe(true);
    expect(result.mathSegments).toBe(1);
  });

  it('rejects file and code execution commands', () => {
    for (const command of ['\\input{/etc/passwd}', '\\write18{rm -rf /}', '\\includegraphics{x}']) {
      expect(codes(command)).toContain('forbidden_command');
    }
  });

  it('rejects macro redefinition', () => {
    expect(codes('\\def\\x{1}')).toContain('forbidden_command');
    expect(codes('\\renewcommand{\\frac}{}')).toContain('forbidden_command');
  });

  it('sends diagram environments to the SVG path instead', () => {
    const result = checkLatex('\\begin{tikzpicture}\\draw (0,0);\\end{tikzpicture}');
    expect(result.ok).toBe(false);
    expect(result.findings[0]!.code).toBe('diagram_environment');
    expect(result.findings[0]!.message).toContain('SVG');
  });

  it('warns but does not block on an unknown environment', () => {
    const result = checkLatex('\\begin{mystery}x\\end{mystery}');
    expect(result.ok).toBe(true);
    expect(result.findings[0]!.severity).toBe('warning');
  });

  it('rejects a source over the length limit', () => {
    expect(codes('a'.repeat(MAX_LATEX_LENGTH + 1))).toContain('too_long');
  });

  it('reports where the problem is', () => {
    const finding = checkLatex('ok \\input{x}').findings[0]!;
    expect(finding.offset).toBe(3);
  });
});

describe('findMathSegments', () => {
  it('pairs inline and display segments', () => {
    expect(findMathSegments('a $x$ b $$y$$ c')).toHaveLength(2);
  });

  it('keeps a single dollar inside display maths', () => {
    expect(findMathSegments('$$a $ b$$')).toHaveLength(1);
  });

  it('returns null when a segment never closes', () => {
    expect(findMathSegments('$x')).toBeNull();
  });
});

describe('assertLatex', () => {
  it('passes over empty and missing values', () => {
    expect(() => assertLatex('stem', null)).not.toThrow();
    expect(() => assertLatex('stem', '')).not.toThrow();
  });

  it('throws a 422 carrying the field and findings', () => {
    try {
      assertLatex('stemLatex', '\\input{x}');
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(LatexError);
      const latexError = error as LatexError;
      expect(latexError.status).toBe(422);
      expect(latexError.field).toBe('stemLatex');
      expect(latexError.findings[0]!.code).toBe('forbidden_command');
    }
  });
});

describe('latexToSearchText', () => {
  it('keeps the prose and drops the maths', () => {
    expect(latexToSearchText('Convert $\\mathtt{1011}_2$ to hexadecimal')).toBe(
      'Convert to hexadecimal',
    );
  });

  it('drops display maths and keeps the surrounding prose', () => {
    expect(latexToSearchText('Given $$x = y$$ explain the result')).toBe(
      'Given explain the result',
    );
  });
});

describe('checkSvg', () => {
  it('accepts a self-contained diagram', () => {
    expect(checkSvg('<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>').ok).toBe(true);
  });

  it('rejects markup that is not an svg', () => {
    expect(checkSvg('<div>x</div>').findings[0]!.code).toBe('not_svg');
  });

  it('rejects script and event handlers', () => {
    expect(checkSvg('<svg><script>alert(1)</script></svg>').ok).toBe(false);
    expect(checkSvg('<svg onload="alert(1)"></svg>').ok).toBe(false);
  });

  it('rejects references to anything off the page', () => {
    expect(checkSvg('<svg><image href="https://evil.test/x.png"/></svg>').ok).toBe(false);
    expect(checkSvg('<svg><use href="#local"/></svg>').ok).toBe(true);
  });
});
