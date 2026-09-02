import { describe, expect, it } from 'vitest';
import { parseAttemptContext } from './AttemptContext';

describe('attempt context parser', () => {
  it('keeps source refs, prose, Markdown tables and fenced pseudocode structurally separate', () => {
    const blocks = parseAttemptContext(`[9618/22/M/J/25 Q6]\n\nTwo arrays implement an ADT.\n\n| Index | Data | Pointer |\n|---:|---:|---:|\n| 1 | 1018 | 7 |\n\n\`\`\`text\nPROCEDURE Place(Value)\n  OUTPUT Value\nENDPROCEDURE\n\`\`\``);
    expect(blocks).toEqual([
      { type: 'source', text: '9618/22/M/J/25 Q6' },
      { type: 'paragraph', text: 'Two arrays implement an ADT.' },
      { type: 'table', rows: [['Index', 'Data', 'Pointer'], ['1', '1018', '7']] },
      { type: 'code', text: 'PROCEDURE Place(Value)\n  OUTPUT Value\nENDPROCEDURE' },
    ]);
  });

  it('does not interpret raw HTML as markup', () => {
    expect(parseAttemptContext('<script>alert(1)</script>')).toEqual([
      { type: 'paragraph', text: '<script>alert(1)</script>' },
    ]);
  });
});
