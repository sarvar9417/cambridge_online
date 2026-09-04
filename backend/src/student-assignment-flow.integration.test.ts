import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { AssignmentsService } from './services/assignments-service.js';
import type { ResultsService } from './services/results-service.js';
import { createAssignmentsRouter } from './routes/assignments.js';
import { createResultsRouter } from './routes/results.js';

const assignmentId='11111111-1111-4111-8111-111111111111';
const submissionId='22222222-2222-4222-8222-222222222222';
const questionId='33333333-3333-4333-8333-333333333333';
const sessionId='44444444-4444-4444-8444-444444444444';
const assetId='55555555-5555-4555-8555-555555555555';
const paperId='66666666-6666-4666-8666-666666666666';

const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student One'};
const structuredContent={
  version:1 as const,
  source:{paperId,sha256:'d'.repeat(64)},
  blocks:[
    {type:'text' as const,style:'task' as const,text:'Study the logic circuit and explain the output.',source:{page:4}},
    {type:'asset' as const,kind:'logic_circuit' as const,assetId,altText:'Logic circuit',source:{page:4}},
  ],
};
const assetUrls={[assetId]:'https://signed.example/circuit.png'};

describe('student assignment HTTP flow',()=>{
  it('keeps one source-backed question contract from attempt through save, submit and released result',async()=>{
    let answer='';
    let submitted=false;

    const start=vi.fn().mockResolvedValue({
      submissionId,activeSessionId:sessionId,startedAt:'2026-09-04T10:00:00.000Z',deadline:null,serverNow:'2026-09-04T10:00:00.000Z',
      questions:[{
        id:questionId,displayRef:'0478/12/M/J/26 Q4(a)',stemMd:'Legacy fallback',contextMd:'',commandWord:'Explain',marks:4,
        answerKind:'text',answerText:'',contentJson:structuredContent,contentVersion:1,assetUrls,
      }],
    });
    const saveAnswer=vi.fn(async(_actor,_submission,_question,text,activeSessionId)=>{
      expect(activeSessionId).toBe(sessionId);
      answer=text;
      return{savedAt:new Date('2026-09-04T10:01:00.000Z')};
    });
    const submit=vi.fn(async()=>{submitted=true;return{id:submissionId,status:'submitted',submitted_at:'2026-09-04T10:02:00.000Z'}});
    const assignmentsService={start,saveAnswer,submit} as unknown as AssignmentsService;

    const detail=vi.fn(async()=>{
      expect(submitted).toBe(true);
      return[{
        gradingId:'grading-1',appealStatus:null,displayRef:'0478/12/M/J/26 Q4(a)',stemMd:'Legacy fallback',marks:4,
        answerText:answer,finalScore:4,feedback:'Correct explanation.',points:[{code:'B1',text:'Correct output explained',matched:true,marks:4}],
        contentJson:structuredContent,contentVersion:1,assetUrls,
      }];
    });
    const resultsService={detail,list:vi.fn()} as unknown as ResultsService;

    const app=express();
    app.use(express.json());
    app.use((req,_res,next)=>{req.actor=student;next()});
    app.use('/assignments',createAssignmentsRouter(assignmentsService));
    app.use('/results',createResultsRouter(resultsService));

    const started=await request(app)
      .post(`/assignments/${assignmentId}/attempt`)
      .send({clientSessionId:sessionId})
      .expect(201);
    expect(started.body.questions[0]).toMatchObject({
      id:questionId,contentVersion:1,contentJson:structuredContent,assetUrls,
    });
    expect(JSON.stringify(started.body)).not.toContain('supabase://');

    await request(app)
      .put(`/assignments/submissions/${submissionId}/answers/${questionId}`)
      .send({text:'The output is 1 because both required conditions are true.',activeSessionId:sessionId})
      .expect(200);
    expect(saveAnswer).toHaveBeenCalledTimes(1);

    const submittedResponse=await request(app)
      .post(`/assignments/submissions/${submissionId}/submit`)
      .expect(200);
    expect(submittedResponse.body.status).toBe('submitted');

    const result=await request(app).get(`/results/${submissionId}`).expect(200);
    expect(result.body.data[0]).toMatchObject({
      answerText:'The output is 1 because both required conditions are true.',
      contentVersion:1,contentJson:structuredContent,assetUrls,
    });
    expect(JSON.stringify(result.body)).not.toContain('supabase://');
    expect(start).toHaveBeenCalledWith(student,assignmentId,sessionId,undefined);
    expect(submit).toHaveBeenCalledWith(student,submissionId);
    expect(detail).toHaveBeenCalledWith(student,submissionId);
  });
});
