import { describe, expect, it } from 'vitest';
import {
  completeInlineSvg,
  portableQuestionVisualReady,
  sourceVisualDataUrl,
  portableVisualReady,
  portableCanonicalAssetReady,
  renderableCanonicalAssetSql,
  questionVisualIntegritySql,
  renderableVisualAssetSql,
  sourceVisualBlockerSql,
} from './source-visual-readiness.js';

describe('source visual readiness',()=>{
  it('accepts complete inline SVG and rejects prose or partial markup',()=>{
    expect(completeInlineSvg('<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>')).toBe(true);
    expect(completeInlineSvg('<?xml version="1.0"?><svg></svg>')).toBe(true);
    expect(renderableVisualAssetSql('qa')).toContain("<[?]xml");
    expect(completeInlineSvg('<svg><path/>')).toBe(false);
    expect(completeInlineSvg('K-map diagram goes here')).toBe(false);
  });

  it('treats browser URL or inline SVG as a renderable portable visual',()=>{
    expect(portableVisualReady({kind:'diagram',url:'https://signed.example/a.png',contentMd:null})).toBe(true);
    expect(portableVisualReady({kind:'image',url:null,contentMd:'<svg></svg>'})).toBe(true);
    expect(portableVisualReady({kind:'diagram',url:null,contentMd:'diagram description'})).toBe(false);
    expect(portableVisualReady({kind:'code',url:null,contentMd:'OUTPUT X'})).toBe(true);
  });

  it('validates semantic and storage-backed canonical asset kinds explicitly',()=>{
    expect(portableCanonicalAssetReady({kind:'table',url:null,contentMd:'| A | B |\n|---|---|\n|0|1|'})).toBe(true);
    expect(portableCanonicalAssetReady({kind:'table',url:null,contentMd:'table description only'})).toBe(false);
    expect(portableCanonicalAssetReady({kind:'table',url:null,contentMd:null})).toBe(false);
    expect(portableCanonicalAssetReady({kind:'table',url:'https://signed.example/table.png',contentMd:null})).toBe(true);
    expect(portableCanonicalAssetReady({kind:'pseudocode',url:null,contentMd:'INPUT X\nOUTPUT X'})).toBe(true);
    expect(portableCanonicalAssetReady({kind:'unknown',url:'https://signed.example/unknown.png',contentMd:null})).toBe(false);
    const sql=renderableCanonicalAssetSql('qa');
    expect(sql).toContain("qa.kind='table'");
    expect(sql).toContain("qa.kind in ('pseudocode','code')");
  });

  it('accepts fenced SVG consistently and encodes it as an image URL',()=>{
    const fenced='```svg\n<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>\n```';
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
    expect(sql).toContain("block->>'type'='asset'");
    expect(sql).toContain("qa.id::text=block->>'assetId'");
    expect(sql).toContain("qa.kind in ('diagram','image')");
    expect(sql).toContain("qa.kind='table'");
    expect(sql).toContain('qa.svg_markup');
    expect(sql).toContain(sourceVisualBlockerSql('source_node'));
  });

  it('fails closed when a printed visual cue is followed only by flattened labels',()=>{
    const broken={version:1,blocks:[
      {type:'text',style:'paragraph',text:'The diagram shows a logic circuit.'},
      {type:'text',style:'paragraph',text:'A Q B S P C R Z D'},
      {type:'text',style:'task',text:'Write the Boolean logic expression.'},
    ]};
    expect(portableQuestionVisualReady(broken,[])).toBe(false);
    const sql=sourceVisualBlockerSql('source_node');
    expect(sql).toContain('next.ordinality=cue.ordinality+1');
    expect(sql).toContain('shows?|showing');
  });

  it('accepts the repaired shared Cambridge circuit asset',()=>{
    const svg='<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
    const repaired={version:1,blocks:[
      {type:'text',style:'paragraph',text:'The diagram shows a logic circuit.'},
      {type:'asset',kind:'logic_circuit',assetId:'shared-circuit'},
      {type:'text',style:'task',text:'Write the Boolean logic expression.'},
    ]};
    expect(portableQuestionVisualReady(repaired,[{
      id:'shared-circuit',kind:'diagram',url:null,contentMd:svg,
    }])).toBe(true);
  });

  it('allows a source-backed semantic table to represent data-structure diagrams',()=>{
    const content={version:1,blocks:[
      {type:'text',text:'This diagram shows the content of the initialised array.'},
      {type:'asset',kind:'table',assetId:'array-state'},
    ]};
    expect(portableQuestionVisualReady(content,[{
      id:'array-state',kind:'table',url:null,contentMd:'| index | data | pointer |',
    }])).toBe(true);
  });

  it('accepts storage-backed table assets only when a signed browser URL is available',()=>{
    const content={version:1,blocks:[
      {type:'text',text:'The diagram shows the circular queue populated with four items.'},
      {type:'asset',kind:'table',assetId:'queue-state'},
    ]};
    expect(portableQuestionVisualReady(content,[{
      id:'queue-state',kind:'table',url:'https://signed.example/queue.png',contentMd:null,
    }])).toBe(true);
    expect(portableQuestionVisualReady(content,[{
      id:'queue-state',kind:'table',url:null,contentMd:null,
    }])).toBe(false);
  });

  it('accepts a legacy image-shaped block when it resolves to a source-backed table asset',()=>{
    const content={version:1,blocks:[
      {type:'text',text:'The diagram represents the current state of the stack.'},
      {type:'asset',kind:'image',assetId:'stack-state'},
    ]};
    expect(portableQuestionVisualReady(content,[{
      id:'stack-state',kind:'table',url:null,contentMd:'<svg xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"1\" height=\"1\"/></svg>',
    }])).toBe(true);
  });

  it('does not treat learner-generated screenshots or truth-table wording as missing source visuals',()=>{
    expect(portableQuestionVisualReady({version:1,blocks:[
      {type:'text',text:'Take a screenshot showing the program output.'},
    ]},[])).toBe(true);
    expect(portableQuestionVisualReady({version:1,blocks:[
      {type:'text',text:'The truth table for a logic circuit is shown.'},
    ]},[])).toBe(true);
  });

  it('ignores stale unreferenced visual rows when canonical structured content points at a ready asset',()=>{
    const ready={id:'ready',kind:'image',url:'https://signed.example/source.png',contentMd:null};
    const stale={id:'stale',kind:'diagram',url:null,contentMd:'legacy prose repair'};
    const content={version:1,blocks:[{type:'asset',kind:'image',assetId:'ready'}]};
    expect(portableQuestionVisualReady(content,[ready,stale])).toBe(true);
    expect(portableQuestionVisualReady({version:1,blocks:[{type:'asset',kind:'image',assetId:'stale'}]},[ready,stale])).toBe(false);
  });

  it('does not misclassify semantic table/code assets referenced through legacy image-shaped blocks as missing visuals',()=>{
    const table={id:'table-1',kind:'table',url:null,contentMd:'| A | B |\n|---|---|\n00|1|'};
    const code={id:'code-1',kind:'pseudocode',url:null,contentMd:'INPUT X\nOUTPUT X'};
    const content={version:1,blocks:[
      {type:'asset',kind:'image',assetId:'table-1'},
      {type:'asset',kind:'image',assetId:'code-1'},
    ]};
    expect(portableQuestionVisualReady(content,[table,code])).toBe(true);
  });
});
