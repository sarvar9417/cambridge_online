import { describe,expect,it } from 'vitest';
import { renderPaperHtml } from './export-html.js';

const source={paperId:'11111111-1111-4111-8111-111111111111',sha256:'c'.repeat(64)};
const location={page:5};

describe('canonical structured question PDF HTML integration',()=>{
  it('prefers canonical truth-table content over a flattened legacy stem',()=>{
    const html=renderPaperHtml('Worksheet',[{
      displayRef:'Q1',sourceRef:'0478/11/M/J/26 Q1',stem:'Complete the table A B Output 0 0',marks:2,
      contentJson:{version:1,source,blocks:[{
        type:'table',kind:'truth_table',headers:['A','B','Output'],
        rows:[['0','0',null],['0','1',null]],editableCells:[[0,2],[1,2]],source:location,
      }]},
    }]);
    expect(html).toContain('data-content-version="1"');
    expect(html).toContain('data-table-kind="truth_table"');
    expect(html).not.toContain('Complete the table A B Output 0 0');
  });

  it('keeps legacy rendering when canonical content is absent',()=>{
    const html=renderPaperHtml('Worksheet',[{displayRef:'Q1',stem:'Explain one advantage.',marks:2}]);
    expect(html).toContain('Explain one advantage.');
    expect(html).not.toContain('data-content-version="1"');
  });

  it('embeds a source-backed SVG referenced by canonical asset id',()=>{
    const assetId='22222222-2222-4222-8222-222222222222';
    const html=renderPaperHtml('Worksheet',[{
      displayRef:'Q1',stem:'Flattened diagram text',marks:2,
      contentJson:{version:1,source,blocks:[{type:'asset',kind:'logic_circuit',assetId,altText:'Logic circuit',source:location}]},
      contextBlocks:[{assets:[{id:assetId,kind:'diagram',contentMd:'<svg viewBox="0 0 20 10"></svg>',altText:'Logic circuit'}]}],
    }]);
    expect(html).toContain('data-asset-id="22222222-2222-4222-8222-222222222222"');
    expect(html).toContain('data:image/svg+xml;base64,');
  });
});
