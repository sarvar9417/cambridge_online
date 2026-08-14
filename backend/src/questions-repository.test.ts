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

describe('question bank v2', () => {
  const matchingRow = {
    id:'q-leaf',parent_id:'q-root',label:'a',path:'1.a',display_ref:'9618/11/M/J/23 Q1(a)',
    depth:1,sort_order:1,stem:'Explain why the cache is used.',command_word:'Explain',marks:3,
    ao:'AO2',answer_kind:'text',status:'approved',component:1,year:2023,series:'MJ',variant:11,
    has_diagram:true,root_id:'q-root',root_ref:'9618/11/M/J/23 Q1',
    subtopics:[{id:'st1',code:'1.2',title:'Processor fundamentals'}],has_dependency:true,
  };

  it('builds advanced leaf filters and keeps the legacy stemMd field', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:1,rows:[matchingRow] });
    const repository = new PgQuestionsRepository({ query } as unknown as Pool);
    const result = await repository.findVisible(teacher, {
      view:'parts',q:'cache',component:1,topicIds:['11111111-1111-4111-8111-111111111111'],
      subtopicIds:['22222222-2222-4222-8222-222222222222'],commandWords:['Explain'],
      marksMin:2,marksMax:4,yearFrom:2022,yearTo:2024,series:['MJ'],aos:['AO2'],
      hasDiagram:true,dependency:'independent',limit:25,
    });
    const [sql,values] = query.mock.calls[0]!;
    expect(sql).toContain('component.number=');
    expect(sql).toContain('question_subtopics');
    expect(sql).toContain('q.command_word::text=any');
    expect(sql).toContain('sp.year>=');
    expect(sql).toContain('sp.series::text=any');
    expect(sql).toContain("qa.kind in ('diagram','image')");
    expect(sql).toContain('not exists(select 1 from question_dependencies');
    expect(sql).toContain('websearch_to_tsquery');
    expect(values).toContain('cache');
    expect(values).toContain(25);
    expect(result.view).toBe('parts');
    expect(result.unavailableFilters).toEqual([]);
    expect(result.data[0]).toMatchObject({
      id:'q-leaf',stem:'Explain why the cache is used.',stemMd:'Explain why the cache is used.',
      rootId:'q-root',component:1,year:2023,series:'MJ',variant:11,hasDiagram:true,hasDependency:true,
    });
  });

  it('returns a complete family while marking only matching leaves', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount:1,rows:[matchingRow] })
      .mockResolvedValueOnce({ rowCount:2,rows:[
        {root_id:'q-root',id:'q-leaf',label:'a',display_ref:'Q1(a)',depth:1,sort_order:1,marks:3,stem:'Explain why the cache is used.',command_word:'Explain',ao:'AO2',answer_kind:'text',status:'approved'},
        {root_id:'q-root',id:'q-b',label:'b',display_ref:'Q1(b)',depth:1,sort_order:2,marks:2,stem:'State one register.',command_word:'State',ao:'AO1',answer_kind:'text',status:'approved'},
      ]});
    const result = await new PgQuestionsRepository({ query } as unknown as Pool).findVisible(teacher,{view:'families'});
    expect(query).toHaveBeenCalledTimes(2);
    expect(result.view).toBe('families');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({rootId:'q-root',matchCount:1,totalCount:2});
    expect(result.data[0]!.parts).toEqual(expect.arrayContaining([
      expect.objectContaining({id:'q-leaf',matches:true}),
      expect.objectContaining({id:'q-b',matches:false}),
    ]));
  });

  it('reports filters whose backing analytics are not available yet', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:0,rows:[] });
    const result = await new PgQuestionsRepository({ query } as unknown as Pool).findVisible(teacher,{
      difficulty:'hard',unusedInClassId:'33333333-3333-4333-8333-333333333333',
    });
    expect(result.unavailableFilters).toEqual(['difficulty','unusedInClassId']);
  });

  it('parses repeated multi-value query parameters before calling the repository', async () => {
    const findVisible = vi.fn().mockResolvedValue({data:[],view:'parts',unavailableFilters:[],nextCursor:null});
    const app=express();
    app.use((req,_res,next)=>{req.actor=teacher;next()});
    app.use('/questions',createQuestionsRouter({findVisible} as unknown as PgQuestionsRepository));
    const response=await request(app).get('/questions')
      .query({
        view:'parts',series:['MJ','ON'],aos:['AO1','AO2'],commandWords:['Explain','State'],
        topicIds:['11111111-1111-4111-8111-111111111111'],
        subtopicIds:['22222222-2222-4222-8222-222222222222'],hasDiagram:'true',dependency:'independent',
      });
    expect(response.status).toBe(200);
    expect(findVisible).toHaveBeenCalledWith(teacher,expect.objectContaining({
      series:['MJ','ON'],aos:['AO1','AO2'],commandWords:['Explain','State'],
      topicIds:['11111111-1111-4111-8111-111111111111'],
      subtopicIds:['22222222-2222-4222-8222-222222222222'],hasDiagram:true,dependency:'independent',
    }));
  });

  it('rejects an invalid filter range and blocks student filter options', async () => {
    const findVisible = vi.fn();
    const filterOptions = vi.fn();
    const app=express();
    let actor: typeof teacher | typeof student = teacher;
    app.use((req,_res,next)=>{req.actor=actor;next()});
    app.use('/questions',createQuestionsRouter({findVisible,filterOptions} as unknown as PgQuestionsRepository));
    await request(app).get('/questions').query({marksMin:5,marksMax:2}).expect(400);
    expect(findVisible).not.toHaveBeenCalled();
    actor=student;
    await request(app).get('/questions/filter-options').expect(403);
    expect(filterOptions).not.toHaveBeenCalled();
  });
});
