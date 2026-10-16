import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=readFileSync(resolve(process.cwd(),'src','live','LiveExamPage.tsx'),'utf8');
const css=readFileSync(resolve(process.cwd(),'src','live','live-exam.css'),'utf8');

describe('Live Challenge mark scheme presentation',()=>{
  it('keeps raw Cambridge guidance secondary when points are atomic and opens it for manual fallback',()=>{
    expect(source).not.toContain('<p className="live-scheme-guidance">{scheme.guidanceMd}</p>');
    expect(source).toContain('<details className="live-scheme-original" open={!scheme.points.length}>');
    expect(source).toContain("scheme.points.length?'Original Cambridge mark scheme’ni ko‘rish':'Original Cambridge mark scheme — qo‘lda baholash'");
  });

  it('presents a human-readable one-mark rule and hides the technical main group label',()=>{
    expect(source).toContain('Har bir to‘g‘ri band uchun 1 ball · Maksimum');
    expect(source).toContain("group.label&&group.label!=='main'");
    expect(css).toContain('.live-scheme-rule');
  });

  it('keeps the original source text available but visually secondary',()=>{
    expect(css).toContain('.live-scheme-original summary');
    expect(css).toContain('.live-scheme-original p');
  });
});
