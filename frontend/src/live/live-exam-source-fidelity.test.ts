import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src', 'live', 'LiveExamRuntime.tsx'), 'utf8');

describe('live exam source fidelity contract', () => {
  it('shows recursive parent context and the leaf question together', () => {
    expect(source).toContain('portable.contextBlocks.map((block)');
    expect(source).toContain('portable.leaf.stem?<LatexQuestionText');
    expect(source).not.toContain('!portable.contextBlocks.length&&portable.leaf.stem');
  });

  it('keeps official mark-scheme guidance, accept and reject notes visible', () => {
    expect(source).toContain('scheme.guidanceMd');
    expect(source).toContain('markSchemeNotes(point.accept)');
    expect(source).toContain('markSchemeNotes(point.reject)');
  });
});
