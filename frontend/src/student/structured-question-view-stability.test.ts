import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=readFileSync(resolve(process.cwd(),'src/student/StructuredQuestionView.tsx'),'utf8');

describe('StructuredQuestionView render stability',()=>{
  it('uses a value-stable signature instead of snapshot object identity',()=>{
    expect(source).toContain('structuredQuestionRenderSignature');
    expect(source).toContain('Object.entries(assetUrls).sort');
    expect(source).toContain('const renderSignature=structuredQuestionRenderSignature(content,assetUrls)');
    expect(source).toContain('},[renderSignature,presentationReady,assetsReady]);');
    expect(source).not.toContain('},[content,assetUrls,presentationReady,assetsReady]);');
  });
});
