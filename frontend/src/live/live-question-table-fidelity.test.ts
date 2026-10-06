import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const fidelity=readFileSync(resolve(process.cwd(),'src','lib','question-asset-fidelity-dom.ts'),'utf8');
const css=readFileSync(resolve(process.cwd(),'src','question-asset-fidelity.css'),'utf8');

describe('Live Challenge table fidelity',()=>{
  it('enhances legacy Live semantic assets instead of leaving pipe tables in preformatted text',()=>{
    expect(fidelity).toContain("root.querySelectorAll('.live-asset').forEach(enhanceLiveAsset)");
    expect(fidelity).toContain("value.includes('|') && renderTable(asset, source, value)");
    expect(fidelity).toContain('looksLikeCode(value)');
  });

  it('keeps wide source tables inside a horizontal viewport',()=>{
    expect(css).toContain('.live-question-card>.structured-question-view');
    expect(css).toContain('overflow-x:auto');
    expect(css).toContain('width:max-content');
    expect(css).toContain('min-width:100%');
  });
});
