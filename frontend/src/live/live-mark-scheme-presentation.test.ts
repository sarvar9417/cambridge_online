import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=readFileSync(resolve(process.cwd(),'src','live','LiveExamPage.tsx'),'utf8');
const css=readFileSync(resolve(process.cwd(),'src','live','live-exam.css'),'utf8');

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

  it('does not mislabel a legacy composite multi-mark manual rubric as a single MP',()=>{
    expect(source).toContain("scheme.schemeType==='manual_only'");
    expect(source).toContain("scheme.points.length===1 && scheme.points[0]!.marks>1");
    expect(source).toContain("groupedManualRubric?'Umumiy baholash mezoni':point.code");
    expect(source).toContain("Rasmiy mezon bazada umumiy");
    expect(source).toContain("0–");
    expect(source).toContain("const canCheckPoint=interactive&&!schemeNeedsManualScore(scheme)");
    expect(source).toContain("{canCheckPoint?<input type=\"checkbox\"");
  });

  it('keeps the original source text available but visually secondary',()=>{
    expect(css).toContain('.live-scheme-original summary');
    expect(css).toContain('.live-scheme-original p');
  });
});
