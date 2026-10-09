import { describe, expect, it } from 'vitest';
import type { StructuredQuestionContent } from './structured-question-content';
import { materializePortableSourceAssets } from './portable-source-assets';

describe('portable source response materialization',()=>{
  it('turns blank source table cells into editable semantic cells even when a faithful source visual exists',()=>{
    const content:StructuredQuestionContent={
      version:1,
      source:{paperId:'paper',sha256:'abc'},
      blocks:[{type:'asset',kind:'image',assetId:'asset-1',altText:'Source table',source:{page:1}}],
    };
    const materialized=materializePortableSourceAssets(content,[{
      id:'asset-1',
      kind:'table',
      url:'https://example.test/table.png',
      contentMd:'| Term | Description |\n| --- | --- |\n| Pixel | |\n| Header | |',
      altText:'Source table',
      sourcePage:1,
    }]);
    const table=materialized.blocks[0];
    expect(table.type).toBe('table');
    if(table.type!=='table')throw new Error('table block expected');
    expect(table.editableCells).toEqual([[0,1],[1,1]]);
  });

  it('keeps reference-only tables as source visuals when there are no answer blanks',()=>{
    const content:StructuredQuestionContent={
      version:1,
      source:{paperId:'paper',sha256:'abc'},
      blocks:[{type:'asset',kind:'image',assetId:'asset-1',altText:'Reference table',source:{page:1}}],
    };
    const materialized=materializePortableSourceAssets(content,[{
      id:'asset-1',
      kind:'table',
      url:'https://example.test/table.png',
      contentMd:'| A | B |\n| --- | --- |\n| 1 | 2 |',
      altText:'Reference table',
      sourcePage:1,
    }]);
    expect(materialized.blocks[0]?.type).toBe('asset');
  });
});
