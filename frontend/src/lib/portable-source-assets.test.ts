import { describe, expect, it } from 'vitest';
import type { StructuredQuestionContent } from './structured-question-content';
import {
  materializePortableSourceAssets,
  portableAssetUrl,
  portableTableBlock,
} from './portable-source-assets';

const assetId='11111111-1111-4111-8111-111111111111';
const content:StructuredQuestionContent={
  version:1,
  source:{paperId:'22222222-2222-4222-8222-222222222222',sha256:'a'.repeat(64)},
  blocks:[{type:'asset',kind:'image',assetId,altText:'Truth table',source:{page:3}}],
};

describe('portable source assets',()=>{
  it('renders a DB-resident inline SVG without requiring a storage URL',()=>{
    const url=portableAssetUrl({id:assetId,kind:'diagram',contentMd:'<svg viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>'});
    expect(url).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(url!.split(',')[1]!)).toContain('<svg');
  });

  it('renders fenced SVG repairs as an image instead of exposing the SVG source',()=>{
    const url=portableAssetUrl({
      id:assetId,
      kind:'diagram',
      contentMd:'```svg\n<svg xmlns="http://www.w3.org/2000/svg" width="620" height="250"><rect width="10" height="10"/></svg>\n```',
    });
    expect(url).toMatch(/^data:image\/svg\+xml/);
    const decoded=decodeURIComponent(url!.split(',')[1]!);
    expect(decoded).toMatch(/^<svg/);
    expect(decoded).not.toContain('```');
  });

  it('rejects partial SVG or SVG mixed with trailing prose so markup cannot leak into a visual path',()=>{
    expect(portableAssetUrl({id:assetId,kind:'diagram',contentMd:'<svg><rect/></svg> extra text'})).toBeNull();
    expect(portableAssetUrl({id:assetId,kind:'diagram',contentMd:'<svg><rect/>'})).toBeNull();
  });

  it('does not pretend a prose/ASCII diagram substitute is a visual',()=>{
    expect(portableAssetUrl({id:assetId,kind:'diagram',contentMd:'Use the original PDF for exact gate symbols.'})).toBeNull();
  });

  it('parses ordinary Markdown tables into semantic table blocks',()=>{
    const table=portableTableBlock({
      id:assetId,kind:'table',altText:'Truth table',
      contentMd:'| A | B | X |\n| --- | --- | --- |\n| 0 | 0 | 1 |\n| 0 | 1 | |',
    },{page:3});
    expect(table?.kind).toBe('truth_table');
    expect(table?.headers).toEqual(['A','B','X']);
    expect(table?.rows).toEqual([['0','0','1'],['0','1',null]]);
    expect(table?.editableCells).toEqual([[1,2]]);
  });

  it('parses source pipe grids even when the legacy repair omitted the Markdown separator row',()=>{
    const table=portableTableBlock({
      id:assetId,kind:'table',altText:'8-bit register',
      contentMd:'| 0 | 0 | 1 | 1 | 0 | 1 | 0 | 1 |\n| | | | | | | | |',
    },{page:5});
    expect(table?.headers).toEqual([]);
    expect(table?.rows[0]).toEqual(['0','0','1','1','0','1','0','1']);
    expect(table?.rows[1]).toEqual([null,null,null,null,null,null,null,null]);
  });

  it('keeps a source-faithful inline SVG table as an image-backed asset',()=>{
    const tableContent:StructuredQuestionContent={
      ...content,
      blocks:[{type:'asset',kind:'table',assetId,altText:'Merged Cambridge table',source:{page:7}}],
    };
    const next=materializePortableSourceAssets(tableContent,[{
      id:assetId,kind:'table',altText:'Merged Cambridge table',
      contentMd:'<svg viewBox="0 0 100 40"><path d="M0 0H100V40H0Z"/></svg>',
    }]);
    expect(next.blocks[0]?.type).toBe('asset');
    expect(portableAssetUrl({id:assetId,kind:'table',contentMd:'<svg viewBox="0 0 1 1"></svg>'})).toMatch(/^data:image\/svg\+xml/);
  });

  it('upgrades a legacy generic asset block that points at a semantic table',()=>{
    const next=materializePortableSourceAssets(content,[{
      id:assetId,kind:'table',altText:'Truth table',
      contentMd:'| A | X |\n| --- | --- |\n| 0 | |\n| 1 | |',
    }]);
    expect(next.blocks[0]?.type).toBe('table');
    if(next.blocks[0]?.type==='table'){
      expect(next.blocks[0].headers).toEqual(['A','X']);
      expect(next.blocks[0].editableCells).toEqual([[0,1],[1,1]]);
    }
  });
});
