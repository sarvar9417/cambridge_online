import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PgQuestionsRepository } from './repositories/questions-repository.js';
import express from 'express';
import request from 'supertest';
import { createQuestionsRouter } from './routes/questions.js';

const baseRow = {
  id:'q1',display_ref:'Q1',stem_md:'Question',context_md:null,command_word:'Explain',
  marks:2,ao:'AO2',answer_kind:'text',parent:null,mark_scheme:{ id:'ms1',points:[] },
};
const student = { id:'student',role:'student' as const,schoolId:'school',fullName:'Student' };
const teacher = { id:'teacher',role:'teacher' as const,schoolId:'school',fullName:'Teacher' };

describe('question detail authorization', () => {
  it('uses assignment visibility and released submission checks for students', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:1,rows:[{ ...baseRow,can_view_scheme:false }] });
    const result = await new PgQuestionsRepository({ query } as unknown as Pool).findOne(student,'q1');
    expect(result).not.toHaveProperty('markScheme');
    const [sql,values] = query.mock.calls[0]!;
    expect(sql).toContain('e.student_id=$3');
    expect(sql).toContain('s.released_at is not null');
    expect(values).toEqual(['q1','student','student']);
  });

  it('returns a scheme to staff when the SQL permission flag allows it', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:1,rows:[{ ...baseRow,can_view_scheme:true }] });
    const result = await new PgQuestionsRepository({ query } as unknown as Pool).findOne(teacher,'q1');
    expect(result).toHaveProperty('markScheme.id','ms1');
  });

  it('returns null instead of revealing an inaccessible question', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:0,rows:[] });
    await expect(new PgQuestionsRepository({ query } as unknown as Pool).findOne(student,'missing'))
      .resolves.toBeNull();
  });

  it('rejects teacher question mutation with 403 before repository write',async()=>{
    const approve=vi.fn();
    const app=express();
    app.use((req,_res,next)=>{req.actor=teacher;next()});
    app.use('/questions',createQuestionsRouter({approve}as unknown as PgQuestionsRepository));
    const response=await request(app).post('/questions/2fe20e05-75b3-43a7-ac45-a81cb52b4ca8/approve');
    expect(response.status).toBe(403);
    expect(approve).not.toHaveBeenCalled();
  });
});
