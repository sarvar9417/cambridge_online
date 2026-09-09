import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { LessonCheckpointService } from './services/lesson-checkpoint-service.js';
import { createLessonCheckpointsRouter } from './routes/lesson-checkpoints.js';

const teacher={id:'teacher',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
const student={id:'student',role:'student' as const,schoolId:'school',fullName:'Student'};

describe('LessonCheckpointService',()=>{
  it('resolves current target LOs and returns full source context/assets/dependencies',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{
        id:'11111111-1111-4111-8111-111111111111',parent_id:'22222222-2222-4222-8222-222222222222',
        display_ref:'9618/31/M/J/24 Q1(a)',stem:'Question',context_md:'Context',command_word:'Explain',marks:2,
        year:2024,series:'MJ',variant:1,component:3,matched_lo_codes:['13.2-lo-04'],has_diagram:true,has_dependency:true,
        mark_scheme_points:[{code:'MP1',text:'First marking point',marks:1},{code:'MP2',text:'Second marking point',marks:1}],
      }]})
      .mockResolvedValueOnce({rows:[
        {leaf_id:'11111111-1111-4111-8111-111111111111',id:'22222222-2222-4222-8222-222222222222',parent_id:null,display_ref:'9618/31/M/J/24 Q1',context_md:'Shared context',depth:0},
        {leaf_id:'11111111-1111-4111-8111-111111111111',id:'11111111-1111-4111-8111-111111111111',parent_id:'22222222-2222-4222-8222-222222222222',display_ref:'9618/31/M/J/24 Q1(a)',context_md:null,depth:1},
      ]})
      .mockResolvedValueOnce({rows:[{
        question_id:'11111111-1111-4111-8111-111111111111',depends_on_id:'33333333-3333-4333-8333-333333333333',
        display_ref:'9618/31/M/J/24 Q1(i)',stem:'Earlier required part',context_md:null,
      }]})
      .mockResolvedValueOnce({rows:[
        {id:'44444444-4444-4444-8444-444444444444',question_id:'22222222-2222-4222-8222-222222222222',kind:'diagram',storage_path:'question/diagram.png',content_md:null,alt_text:'Network diagram',source_page:4},
        {id:'55555555-5555-4555-8555-555555555555',question_id:'33333333-3333-4333-8333-333333333333',kind:'pseudocode',storage_path:null,content_md:'OUTPUT value',alt_text:'Pseudocode',source_page:4},
      ]});
    const signer={signStoragePath:vi.fn().mockResolvedValue('https://signed.example/diagram.png')};
    const service=new LessonCheckpointService({query} as unknown as Pool,signer);
    const result=await service.list(['13.2.1'],2021,2026,'9618');
    const [sql,values]=query.mock.calls[0]!;
    expect(sql).toContain('with requested_lo as');
    expect(sql).toContain('eligible_lo as');
    expect(sql).toContain('learning_objective_compatibility compat');
    expect(sql).toContain("compat.relation in('equivalent','subtopic_compatible')");
    expect(sql).toContain('target_syllabus.valid_from <= $3');
    expect(sql).toContain('target_syllabus.valid_to >= $3');
    expect(sql).toContain('source_syllabus.code=$4');
    expect(sql).toContain('join eligible_lo eligible on eligible.id=lo.id');
    expect(sql).toContain("q.status='approved'");
    expect(sql).toContain('syllabus.code=$4');
    expect(sql).not.toContain('question_subtopics');
    expect(values).toEqual([['13.2.1'],2021,2026,'9618']);
    expect(query.mock.calls[1]?.[0]).toContain('with recursive chain as');
    expect(query.mock.calls[2]?.[0]).toContain('from question_dependencies qd');
    expect(query.mock.calls[3]?.[0]).toContain('from question_assets');
    expect(signer.signStoragePath).toHaveBeenCalledWith('question/diagram.png',300);
    expect(result.data[0]).toMatchObject({
      displayRef:'9618/31/M/J/24 Q1(a)',
      matchedLearningObjectiveCodes:['13.2-lo-04'],
      contextMd:'Context',
      hasDependency:true,
      contextBlocks:[{
        displayRef:'9618/31/M/J/24 Q1',
        contextMd:'Shared context',
        assets:[{kind:'diagram',url:'https://signed.example/diagram.png',altText:'Network diagram'}],
      }],
      dependencies:[{
        displayRef:'9618/31/M/J/24 Q1(i)',
        stem:'Earlier required part',
        assets:[{kind:'pseudocode',contentMd:'OUTPUT value'}],
      }],
      markSchemePoints:[
        {code:'MP1',text:'First marking point',marks:1},
        {code:'MP2',text:'Second marking point',marks:1},
      ],
    });
    expect(result.syllabusCode).toBe('9618');
  });

  it('avoids source expansion queries when there are no matching questions',async()=>{
    const query=vi.fn().mockResolvedValueOnce({rows:[]});
    const service=new LessonCheckpointService({query} as unknown as Pool);
    const result=await service.list(['1.1.3']);
    expect(result.data).toEqual([]);
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe('lesson checkpoint route',()=>{
  it('passes a current 0478 target LO and 2015–2026 range to the service',async()=>{
    const list=vi.fn().mockResolvedValue({data:[],learningObjectiveCodes:['7-lo-03'],syllabusCode:'0478',yearFrom:2015,yearTo:2026});
    const app=express();app.use((req,_res,next)=>{req.actor=teacher;next()});app.use('/lesson-checkpoints',createLessonCheckpointsRouter({list} as unknown as LessonCheckpointService));
    const response=await request(app).get('/lesson-checkpoints').query({loCodes:['7-lo-03'],syllabusCode:'0478',yearFrom:2015,yearTo:2026});
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith(['7-lo-03'],2015,2026,'0478');
  });

  it('keeps 9618 and 2021–2026 as defaults',async()=>{
    const list=vi.fn().mockResolvedValue({data:[]});
    const app=express();app.use((req,_res,next)=>{req.actor=teacher;next()});app.use('/lesson-checkpoints',createLessonCheckpointsRouter({list} as unknown as LessonCheckpointService));
    await request(app).get('/lesson-checkpoints').query({loCodes:'1.1.3'}).expect(200);
    expect(list).toHaveBeenCalledWith(['1.1.3'],2021,2026,'9618');
  });

  it('allows students to read complete approved source context while redacting internal LO metadata',async()=>{
    const list=vi.fn().mockResolvedValue({
      data:[{
        id:'q1',displayRef:'9618/31/M/J/24 Q1(a)',stem:'Question',contextMd:'Context',commandWord:'Explain',marks:2,
        year:2024,series:'MJ',variant:1,component:3,hasDiagram:true,hasDependency:true,matchedLearningObjectiveCodes:['13.2-lo-04'],
        contextBlocks:[{id:'p1',displayRef:'9618/31/M/J/24 Q1',contextMd:'Shared context',assets:[{id:'a1',kind:'diagram',url:'https://signed.example/a.png',contentMd:null,altText:'Diagram',sourcePage:4}]}],
        dependencies:[{id:'d1',displayRef:'9618/31/M/J/24 Q1(i)',stem:'Earlier part',contextMd:null,assets:[]}],
      }],
      learningObjectiveCodes:['13.2-lo-04'],syllabusCode:'9618',yearFrom:2021,yearTo:2026,
    });
    const app=express();app.use((req,_res,next)=>{req.actor=student;next()});app.use('/lesson-checkpoints',createLessonCheckpointsRouter({list} as unknown as LessonCheckpointService));
    const response=await request(app).get('/lesson-checkpoints').query({loCodes:'13.2-lo-04'}).expect(200);
    expect(response.body.data[0]).toMatchObject({
      displayRef:'9618/31/M/J/24 Q1(a)',stem:'Question',marks:2,
      contextBlocks:[{contextMd:'Shared context',assets:[{url:'https://signed.example/a.png'}]}],
      dependencies:[{displayRef:'9618/31/M/J/24 Q1(i)',stem:'Earlier part'}],
    });
    expect(response.body.data[0]).not.toHaveProperty('matchedLearningObjectiveCodes');
    expect(response.body).not.toHaveProperty('learningObjectiveCodes');
    expect(response.body).toMatchObject({syllabusCode:'9618',yearFrom:2021,yearTo:2026});
  });

  it('rejects invalid year order before calling the service',async()=>{
    const list=vi.fn();const app=express();
    app.use((req,_res,next)=>{req.actor=teacher;next()});app.use('/lesson-checkpoints',createLessonCheckpointsRouter({list} as unknown as LessonCheckpointService));
    await request(app).get('/lesson-checkpoints').query({loCodes:'1.1.3',yearFrom:2026,yearTo:2021}).expect(400);
    expect(list).not.toHaveBeenCalled();
  });
});
