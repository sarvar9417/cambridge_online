import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { AssignmentsService } from './services/assignments-service.js';
import type { ResultsService } from './services/results-service.js';
import type { ContentService } from './services/content-service.js';
import { createAssignmentsRouter } from './routes/assignments.js';
import { createResultsRouter } from './routes/results.js';
import { createContentRouter } from './routes/content.js';

const submissionId='11111111-1111-4111-8111-111111111111';
const subtopicId='22222222-2222-4222-8222-222222222222';
const practiceId='33333333-3333-4333-8333-333333333333';
const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student One'};

describe('student closed learning-loop HTTP contract',()=>{
  it('moves from a released lost mark to targeted practice and persists lesson completion',async()=>{
    const detail=vi.fn().mockResolvedValue([{
      gradingId:'grading-1',appealStatus:null,displayRef:'0478/12/M/J/26 Q2(a)',stemMd:'Explain...',marks:4,
      answerText:'answer',finalScore:2,feedback:'Develop the explanation.',points:[],contentJson:null,contentVersion:null,assetUrls:{},
      practiceTargets:[{subtopicId,code:'7.4',title:'Standard methods'}],
    }]);
    const createPractice=vi.fn().mockResolvedValue({id:practiceId,title:'Mashq · 7.4 Standard methods',totalMarks:10,questionCount:5});
    const touchLesson=vi.fn().mockResolvedValue({chapterNo:7,slideId:'ch7-book-074',visitedAt:'2026-09-04T11:00:00Z',completedAt:'2026-09-04T11:00:00Z'});
    const lessonProgress=vi.fn().mockResolvedValue([{chapterNo:7,slideId:'ch7-book-074',visitedAt:'2026-09-04T11:00:00Z',completedAt:'2026-09-04T11:00:00Z'}]);

    const resultsService={detail,list:vi.fn()} as unknown as ResultsService;
    const assignmentsService={createPractice} as unknown as AssignmentsService;
    const contentService={touchLesson,lessonProgress} as unknown as ContentService;

    const app=express();
    app.use(express.json());
    app.use((req,_res,next)=>{req.actor=student;next()});
    app.use('/results',createResultsRouter(resultsService));
    app.use('/assignments',createAssignmentsRouter(assignmentsService));
    app.use('/content',createContentRouter(contentService));

    const released=await request(app).get(`/results/${submissionId}`).expect(200);
    const target=released.body.data[0].practiceTargets[0];
    expect(target).toEqual({subtopicId,code:'7.4',title:'Standard methods'});

    const practice=await request(app)
      .post('/assignments/practice')
      .send({subtopicId:target.subtopicId})
      .expect(201);
    expect(practice.body).toMatchObject({id:practiceId,questionCount:5});
    expect(createPractice).toHaveBeenCalledWith(student,{subtopicId});

    await request(app)
      .put('/content/lessons/progress')
      .send({chapterNo:7,slideId:'ch7-book-074',completed:true})
      .expect(200);
    expect(touchLesson).toHaveBeenCalledWith(student,{chapterNo:7,slideId:'ch7-book-074',completed:true});

    const progress=await request(app).get('/content/lessons/progress').expect(200);
    expect(progress.body.data).toHaveLength(1);
    expect(progress.body.data[0].completedAt).not.toBeNull();
  });
});
