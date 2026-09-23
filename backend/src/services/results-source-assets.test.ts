import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { ResultsService } from './results-service.js';

const actor:Actor={id:'student-1',role:'student',schoolId:'school-1',fullName:'Student One'};
const paperId='11111111-1111-4111-8111-111111111111';

function structured(assetId:string,shaChar:string){
  return {
    version:1,
    source:{paperId,sha256:shaChar.repeat(64)},
    blocks:[{type:'asset',kind:'image',assetId,altText:'Source asset',source:{page:4}}],
  };
}

describe('released result source asset delivery',()=>{
  it('returns semantic source assets and inline SVG URLs for canonical structured results',async()=>{
    const tableId='22222222-2222-4222-8222-222222222222';
    const svgId='33333333-3333-4333-8333-333333333333';
    const table='| A | X |\n| --- | --- |\n| 0 | |\n| 1 | 1 |';
    const svg='<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('from submissions s')&&sql.includes('join gradings g'))return{rowCount:2,rows:[
        {
          id:'44444444-4444-4444-8444-444444444444',grading_id:'g1',appeal_status:null,
          display_ref:'9618/11/M/J/21 Q3(b)',stem_md:'Complete the table.',content_json:structured(tableId,'a'),content_version:1,
          marks:2,text:'answer',final_score:1,teacher_feedback_md:null,points:[],practice_targets:[],
        },
        {
          id:'55555555-5555-4555-8555-555555555555',grading_id:'g2',appeal_status:null,
          display_ref:'9618/31/O/N/25 Q6(b)(ii)',stem_md:'Complete the K-map.',content_json:structured(svgId,'b'),content_version:1,
          marks:2,text:'answer',final_score:2,teacher_feedback_md:null,points:[],practice_targets:[],
        },
      ]};
      if(sql.includes('from question_assets'))return{rowCount:2,rows:[
        {id:tableId,kind:'table',storage_path:null,source_markup:table,alt_text:'Truth table',source_page:4},
        {id:svgId,kind:'diagram',storage_path:null,source_markup:svg,alt_text:'K-map',source_page:7},
      ]};
      throw new Error(`Unexpected SQL in test: ${sql}`);
    });
    const pool={query} as unknown as Pool;

    const detail=await new ResultsService(pool).detail(actor,'submission-1');

    expect(detail[0]?.assetUrls).toEqual({});
    expect(detail[0]?.sourceAssets).toEqual([{
      id:tableId,kind:'table',url:null,contentMd:table,altText:'Truth table',sourcePage:4,
    }]);
    const svgUrl=detail[1]?.assetUrls?.[svgId];
    expect(svgUrl).toMatch(/^data:image\/svg\+xml/);
    expect(detail[1]?.sourceAssets?.[0]).toMatchObject({id:svgId,kind:'diagram',url:svgUrl});
  });
});
