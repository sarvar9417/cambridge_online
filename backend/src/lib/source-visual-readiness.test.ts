import { describe, expect, it } from 'vitest';
import {
  completeInlineSvg,
  portableVisualReady,
  questionVisualIntegritySql,
  renderableVisualAssetSql,
} from './source-visual-readiness.js';

describe('source visual readiness',()=>{
  it('accepts complete inline SVG and rejects prose or partial markup',()=>{
    expect(completeInlineSvg('<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>')).toBe(true);
    expect(completeInlineSvg('<?xml version="1.0"?><svg></svg>')).toBe(true);
    expect(completeInlineSvg('<svg><path/>')).toBe(false);
    expect(completeInlineSvg('K-map diagram goes here')).toBe(false);
  });

  it('treats browser URL or inline SVG as a renderable portable visual',()=>{
    expect(portableVisualReady({kind:'diagram',url:'https://signed.example/a.png',contentMd:null})).toBe(true);
    expect(portableVisualReady({kind:'image',url:null,contentMd:'<svg></svg>'})).toBe(true);
    expect(portableVisualReady({kind:'diagram',url:null,contentMd:'diagram description'})).toBe(false);
    expect(portableVisualReady({kind:'code',url:null,contentMd:'OUTPUT X'})).toBe(true);
  });

  it('uses the same three canonical source fields in SQL readiness',()=>{
    const sql=renderableVisualAssetSql('qa');
    expect(sql).toContain('qa.storage_path');
    expect(sql).toContain('qa.content_md');
    expect(sql).toContain('qa.svg_markup');
  });

  it('walks parent context and fails closed for unresolved visuals',()=>{
    const sql=questionVisualIntegritySql('q');
    expect(sql).toContain('with recursive source_visual_chain');
    expect(sql).toContain("qa.kind in ('diagram','image')");
    expect(sql).toContain('and not');
    expect(sql).toContain('qa.svg_markup');
  });
});
