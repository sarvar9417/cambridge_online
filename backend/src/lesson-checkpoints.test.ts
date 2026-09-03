import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { LessonCheckpointService } from './services/lesson-checkpoint-service.js';
import { createLessonCheckpointsRouter } from './routes/lesson-checkpoints.js';

const teacher={id:'teacher',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
const student={id:'student',role:'student' as const,schoolId:'school',fullName:'Student'};

describe('LessonCheckpointService',()=>{
  it('queries approved historical questions by exact LO code and qualification',async()=>{
    const query=vi.fn().mockResolvedValue({rows:[{
      id:'q1',display_ref:'9618/31/M/J/24 Q1(a)',stem:'Question',context_md:'Context',command_word:'Explain',marks:2,
      year:2024,series:'MJ',variant:31,component:3,matched_lo_codes:['13.2-lo-04'],has_diagram:false,has_dependency:true,
    }]});
    const service=new LessonCheckpointService({query} as unknown as Pool);
    const result=await service.list(['13.2-lo-04'],2021,2025,'9618');
    const [sql,values]=query.mock.calls[0]!;
    expect(sql).toContain('join question_learning_objectives');
    expect(sql).toContain('join syllabi syllabus on syllabus.id=sp.syllabus_id');
    expect(sql).toContain("lo.code=any($1::text[])");
    expect(sql).toContain("q.status='approved'");
    expect(sql).toContain('syllabus.code=$4');
    expect(sql).not.toContain('question_subtopics');
    expect(values).toEqual([['13.2-lo-04'],2021,2025,'9618']);
    expect(result.data[0]).toMatchObject({displayRef:'9618/31/M/J/24 Q1(a)',matchedLearningObjectiveCodes:['13.2-lo-04'],contextMd:'Context',hasDependency:true});
    expect(result.syllabusCode).toBe('9618');
  });
});

describe('lesson checkpoint route',()=>{
  it('passes 0478 LO codes, qualification and 2015–2026 range to the service',async()=>{
    const list=vi.fn().mockResolvedValue({data:[],learningObjectiveCodes:['7-lo-03','2.1.1-lo-03'],syllabusCode:'0478',yearFrom:2015,yearTo:2026});
    const app=express();app.use((req,_res,next)=>{req.actor=teacher;next()});app.use('/lesson-checkpoints',createLessonCheckpointsRouter({list} as unknown as LessonCheckpointService));
    const response=await request(app).get('/lesson-checkpoints').query({loCodes:['7-lo-03','2.1.1-lo-03'],syllabusCode:'0478',yearFrom:2015,yearTo:2026});
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith(['7-lo-03','2.1.1-lo-03'],2015,2026,'0478');
  });

  it('keeps 9618 and 2021–2025 as defaults',async()=>{
    const list=vi.fn().mockResolvedValue({data:[]});
    const app=express();app.use((req,_res,next)=>{req.actor=teacher;next()});app.use('/lesson-checkpoints',createLessonCheckpointsRouter({list} as unknown as LessonCheckpointService));
    await request(app).get('/lesson-checkpoints').query({loCodes:'1.1-lo-01'}).expect(200);
    expect(list).toHaveBeenCalledWith(['1.1-lo-01'],2021,2025,'9618');
  });

  it('is staff-only and rejects invalid year order',async()=>{
    const list=vi.fn();const app=express();let actor:typeof teacher|typeof student=student;
    app.use((req,_res,next)=>{req.actor=actor;next()});app.use('/lesson-checkpoints',createLessonCheckpointsRouter({list} as unknown as LessonCheckpointService));
    await request(app).get('/lesson-checkpoints').query({loCodes:'1.1-lo-01'}).expect(403);
    actor=teacher;
    await request(app).get('/lesson-checkpoints').query({loCodes:'1.1-lo-01',yearFrom:2026,yearTo:2021}).expect(400);
    expect(list).not.toHaveBeenCalled();
  });
});
