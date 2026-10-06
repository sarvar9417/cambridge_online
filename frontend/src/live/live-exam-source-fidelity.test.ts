import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src', 'live', 'LiveExamPage.tsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'src', 'live', 'live-exam.css'), 'utf8');

describe('live exam source fidelity contract', () => {
  it('shows recursive parent context and the leaf question together', () => {
    expect(source).toContain('portable.contextBlocks.map((block)');
    expect(source).toContain('portable.leaf.stem?<LatexQuestionText');
    expect(source).not.toContain('!portable.contextBlocks.length&&portable.leaf.stem');
  });

  it('renders legacy semantic tables as tables rather than raw pipe text', () => {
    expect(source).toContain('portableTableBlock');
    expect(source).toContain('<LiveSemanticTable');
    expect(source).toContain('asset.kind===\'code\'||asset.kind===\'pseudocode\'');
    expect(source).not.toContain("asset.kind==='code'||asset.kind==='pseudocode'||asset.kind==='table'");
  });

  it('fails closed instead of falling back to partial legacy content when structured source exists', () => {
    expect(source).toContain('const structuredPresent=Boolean(rawContent)');
    expect(source).toContain('Noto‘liq savol ko‘rsatilmadi.');
    expect(source).not.toContain('structuredQuestionAssetsReady');
  });

  it('keeps wide Cambridge tables inside a dedicated horizontal viewport', () => {
    expect(styles).toContain('.live-table-scroll');
    expect(styles).toContain('overflow-x:auto');
    expect(styles).toContain('width:max-content');
    expect(styles).toContain('min-width:100%');
  });

  it('keeps official mark-scheme guidance, accept and reject notes visible', () => {
    expect(source).toContain('scheme.guidanceMd');
    expect(source).toContain('markSchemeNotes(point.accept)');
    expect(source).toContain('markSchemeNotes(point.reject)');
  });
});
