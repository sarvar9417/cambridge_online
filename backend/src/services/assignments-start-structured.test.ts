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
});
