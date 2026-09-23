import { describe, expect, it } from 'vitest';
import {
  completeInlineSvg,
  portableQuestionVisualReady,
  sourceVisualDataUrl,
  portableVisualReady,
  questionVisualIntegritySql,
  renderableVisualAssetSql,
} from './source-visual-readiness.js';

describe('source visual readiness',()=>{
  it('accepts complete inline SVG and rejects prose or partial markup',()=>{
    expect(completeInlineSvg('<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>')).toBe(true);
    expect(completeInlineSvg('<?xml version="1.0"?><svg></svg>')).toBe(true);
    expect(renderableVisualAssetSql('qa')).toContain("<\\?xml");
    expect(completeInlineSvg('<svg><path/>')).toBe(false);
    expect(completeInlineSvg('K-map diagram goes here')).toBe(false);
  });

  it('treats browser URL or inline SVG as a renderable portable visual',()=>{
    expect(portableVisualReady({kind:'diagram',url:'https://signed.example/a.png',contentMd:null})).toBe(true);
    expect(portableVisualReady({kind:'image',url:null,contentMd:'<svg></svg>'})).toBe(true);
    expect(portableVisualReady({kind:'diagram',url:null,contentMd:'diagram description'})).toBe(false);
    expect(portableVisualReady({kind:'code',url:null,contentMd:'OUTPUT X'})).toBe(true);
  });
  it('accepts fenced SVG consistently and encodes it as an image URL',()=>{
    const fenced='\`\`\`svg\n<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>\n\`\`\`';
    expect(completeInlineSvg(fenced)).toBe(true);
    const url=sourceVisualDataUrl(fenced);
    expect(url).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(url!.split(',')[1]!)).toMatch(/^<svg/);
  });


  it('uses the same three canonical source fields in SQL readiness',()=>{
    const sql=renderableVisualAssetSql('qa');
    expect(sql).toContain('qa.storage_path');
    expect(sql).toContain('qa.content_md');
    expect(sql).toContain('qa.svg_markup');
  });

  it('walks parent context and validates canonical structured asset references',()=>{
    const sql=questionVisualIntegritySql('q');
    expect(sql).toContain('with recursive source_visual_chain');
    expect(sql).toContain("block->>'type'='asset'");
    expect(sql).toContain("block->>'kind' in ('diagram','image','flowchart','logic_circuit')");
    expect(sql).toContain("qa.id::text=block->>'assetId'");
    expect(sql).toContain("qa.kind in ('diagram','image')");
    expect(sql).toContain('qa.svg_markup');
  });

  it('ignores stale unreferenced visual rows when canonical structured content points at a ready asset',()=>{
    const ready={id:'ready',kind:'image',url:'https://signed.example/source.png',contentMd:null};
    const stale={id:'stale',kind:'diagram',url:null,contentMd:'legacy prose repair'};
    const content={version:1,blocks:[{type:'asset',kind:'image',assetId:'ready'}]};
    expect(portableQuestionVisualReady(content,[ready,stale])).toBe(true);
    expect(portableQuestionVisualReady({version:1,blocks:[{type:'asset',kind:'image',assetId:'stale'}]},[ready,stale])).toBe(false);
  });
  it('does not misclassify semantic table/code assets referenced through legacy image-shaped blocks as missing visuals',()=>{
    const table={id:'table-1',kind:'table',url:null,contentMd:'| A | B |\n|---|---|\n|0|1|'};
    const code={id:'code-1',kind:'pseudocode',url:null,contentMd:'INPUT X\nOUTPUT X'};
    const content={version:1,blocks:[
      {type:'asset',kind:'image',assetId:'table-1'},
      {type:'asset',kind:'image',assetId:'code-1'},
    ]};
    expect(portableQuestionVisualReady(content,[table,code])).toBe(true);
  });
});
