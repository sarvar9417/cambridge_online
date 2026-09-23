import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { AssignmentsService } from './assignments-service.js';

const student:Actor={id:'student-1',role:'student',schoolId:'school-1',fullName:'Student One'};

describe('student attempt source-backed question delivery',()=>{
  it('starts an attempt with validated structured content and signed visual URLs without exposing storage paths',async()=>{
    const assetId='22222222-2222-4222-8222-222222222222';
    const content={
      version:1,
      source:{paperId:'11111111-1111-4111-8111-111111111111',sha256:'c'.repeat(64)},
      blocks:[
        {type:'text',style:'task',text:'Study the diagram and explain the output.',source:{page:3}},
        {type:'asset',kind:'logic_circuit',assetId,altText:'Logic circuit',source:{page:3}},
      ],
    };
    const startedAt=new Date('2026-09-04T10:00:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('select a.*,existing.late_granted_until'))return{rowCount:1,rows:[{
        id:'assignment-1',opens_at:null,due_at:null,allow_late:false,late_granted_until:null,time_limit_min:30,
      }]};
      if(sql.includes('insert into submissions'))return{rowCount:1,rows:[{
        id:'submission-1',status:'in_progress',started_at:startedAt,time_extension_min:0,
      }]};
      if(sql.includes('q.content_json,q.content_version'))return{rowCount:1,rows:[{
        id:'33333333-3333-4333-8333-333333333333',display_ref:'0478/12/M/J/26 Q3(a)',stem_md:'Legacy stem',
        context_md:null,parent_context:null,command_word:'Explain',marks:4,answer_kind:'text',answer_text:'',
        content_json:content,content_version:1,
      }]};
      if(sql.includes('from question_assets'))return{rowCount:1,rows:[{
        id:assetId,storage_path:'supabase://question-assets/papers/p1/diagram.png',
      }]};
      throw new Error(`Unexpected SQL in test: ${sql}`);
    });
    const client={query,release:vi.fn()};
    const pool={connect:vi.fn().mockResolvedValue(client)} as unknown as Pool;
    const signer={signStoragePath:vi.fn().mockResolvedValue('https://signed.example/diagram.png')};

    const attempt=await new AssignmentsService(pool,signer).start(student,'assignment-1','session-1');

    expect(attempt.activeSessionId).toBe('session-1');
    expect(attempt.questions).toHaveLength(1);
    expect(attempt.questions[0]).toMatchObject({
      displayRef:'0478/12/M/J/26 Q3(a)',contentVersion:1,contentJson:content,
      assetUrls:{[assetId]:'https://signed.example/diagram.png'},
    });
    expect(signer.signStoragePath).toHaveBeenCalledWith('supabase://question-assets/papers/p1/diagram.png',300);
    expect(JSON.stringify(attempt)).not.toContain('supabase://');
    expect(query.mock.calls.some(([sql])=>String(sql).includes('q.content_json,q.content_version'))).toBe(true);
  });

  it('materializes svg_markup-backed visuals into student-safe data URLs without storage',async()=>{
    const assetId='44444444-4444-4444-8444-444444444444';
    const content={
      version:1,
      source:{paperId:'11111111-1111-4111-8111-111111111111',sha256:'d'.repeat(64)},
      blocks:[{type:'asset',kind:'diagram',assetId,altText:'K-map',source:{page:7}}],
    };
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('select a.*,existing.late_granted_until'))return{rowCount:1,rows:[{
        id:'assignment-2',opens_at:null,due_at:null,allow_late:false,late_granted_until:null,time_limit_min:null,
      }]};
      if(sql.includes('insert into submissions'))return{rowCount:1,rows:[{
        id:'submission-2',status:'in_progress',started_at:new Date('2026-09-04T10:00:00Z'),time_extension_min:0,
      }]};
      if(sql.includes('q.content_json,q.content_version'))return{rowCount:1,rows:[{
        id:'55555555-5555-4555-8555-555555555555',display_ref:'9618/31/O/N/22 Q7(a)',stem_md:'Complete the K-map.',
        context_md:null,parent_context:null,command_word:'Complete',marks:2,answer_kind:'diagram',answer_text:'',
        content_json:content,content_version:1,
      }]};
      if(sql.includes('from question_assets'))return{rowCount:1,rows:[{
        id:assetId,storage_path:null,content_md:'<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
      }]};
      throw new Error(`Unexpected SQL in test: ${sql}`);
    });
    const client={query,release:vi.fn()};
    const pool={connect:vi.fn().mockResolvedValue(client)} as unknown as Pool;

    const attempt=await new AssignmentsService(pool).start(student,'assignment-2','session-2');
    const url=attempt.questions[0]?.assetUrls?.[assetId];
    expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(decodeURIComponent(url!.split(',')[1]!)).toContain('<svg');
  });
  it('carries semantic table assets so legacy image-shaped blocks can be materialized in the browser',async()=>{
    const assetId='66666666-6666-4666-8666-666666666666';
    const table='| A | B | X |\n| --- | --- | --- |\n| 0 | 0 | 1 |\n| 0 | 1 | |';
    const content={
      version:1,
      source:{paperId:'11111111-1111-4111-8111-111111111111',sha256:'e'.repeat(64)},
      blocks:[{type:'asset',kind:'image',assetId,altText:'Truth table',source:{page:4}}],
    };
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('select a.*,existing.late_granted_until'))return{rowCount:1,rows:[{
        id:'assignment-3',opens_at:null,due_at:null,allow_late:false,late_granted_until:null,time_limit_min:null,
      }]};
      if(sql.includes('insert into submissions'))return{rowCount:1,rows:[{
        id:'submission-3',status:'in_progress',started_at:new Date('2026-09-04T10:00:00Z'),time_extension_min:0,
      }]};
      if(sql.includes('q.content_json,q.content_version'))return{rowCount:1,rows:[{
        id:'77777777-7777-4777-8777-777777777777',display_ref:'9618/11/M/J/21 Q3(b)',stem_md:'Complete the table.',
        context_md:null,parent_context:null,command_word:'Complete',marks:2,answer_kind:'table',answer_text:'',
        content_json:content,content_version:1,
      }]};
      if(sql.includes('from question_assets'))return{rowCount:1,rows:[{
        id:assetId,kind:'table',storage_path:null,content_md:table,alt_text:'Truth table',source_page:4,
      }]};
      throw new Error(`Unexpected SQL in test: ${sql}`);
    });
    const client={query,release:vi.fn()};
    const pool={connect:vi.fn().mockResolvedValue(client)} as unknown as Pool;

    const attempt=await new AssignmentsService(pool).start(student,'assignment-3','session-3');
    expect(attempt.questions[0]?.assetUrls).toEqual({});
    expect(attempt.questions[0]?.sourceAssets).toEqual([{
      id:assetId,kind:'table',url:null,contentMd:table,altText:'Truth table',sourcePage:4,
    }]);
  });

});
