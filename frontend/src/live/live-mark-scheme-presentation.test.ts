import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source=readFileSync(new URL('./LiveExamPage.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('./live-exam.css',import.meta.url),'utf8');

describe('Live Challenge mark scheme presentation',()=>{
  it('keeps raw Cambridge guidance collapsed instead of duplicating it above mark points',()=>{
    expect(source).not.toContain('<p className="live-scheme-guidance">{scheme.guidanceMd}</p>');
    expect(source).toContain('<details className="live-scheme-original">');
    expect(source).toContain('Original Cambridge mark scheme’ni ko‘rish');
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
