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
