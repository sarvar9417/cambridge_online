import { describe,expect,it } from 'vitest';
import { sanitizeLiveProjectorSnapshot } from './live-projector-privacy.js';

describe('Live projector privacy',()=>{
  it('remaps internal UUIDs consistently and strips learner-specific payloads',()=>{
    const sessionId='11111111-1111-4111-8111-111111111111';
    const questionId='22222222-2222-4222-8222-222222222222';
    const assetId='33333333-3333-4333-8333-333333333333';
    const snapshot={
      session:{id:sessionId,classId:'44444444-4444-4444-8444-444444444444',title:'Room'},
      questions:[{id:questionId}],
      participants:[{id:'55555555-5555-4555-8555-555555555555',studentId:'66666666-6666-4666-8666-666666666666',fullName:'Learner'}],
      question:{
        id:questionId,
        sourceQuestionId:questionId,
        portable:{
          leaf:{id:questionId,rootId:questionId,contentJson:{version:1,source:{paperId:'77777777-7777-4777-8777-777777777777',sha256:'a'.repeat(64)},blocks:[{type:'asset',kind:'diagram',assetId,altText:'diagram',source:{page:1}}]}},
          contextBlocks:[{id:questionId,assets:[{id:assetId,storagePath:`supabase://question-assets/${questionId}/asset.png`,url:'https://signed.example/asset.png'}]}],
          dependencies:[],
        },
        dependencyWork:[{questionId,ownAnswer:'private previous answer',submittedAt:'2026-10-12T00:00:00Z'}],
      },
      markScheme:{id:'88888888-8888-4888-8888-888888888888',points:[{id:'99999999-9999-4999-8999-999999999999'}]},
      ownAnswer:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',text:'private answer'},
      review:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',answerText:'private answer'},
      teacherAnswers:[{studentName:'Learner',text:'private answer'}],
      report:{rows:[{studentName:'Learner',answerText:'private answer'}]},
    };

    const sanitized=sanitizeLiveProjectorSnapshot(snapshot);
    expect(sanitized.questions).toEqual([]);
    expect(sanitized.participants).toEqual([]);
    expect(sanitized.ownAnswer).toBeNull();
    expect(sanitized.review).toBeNull();
    expect(sanitized.teacherAnswers).toEqual([]);
    expect(sanitized.report).toBeNull();
    expect(sanitized.question.dependencyWork[0]!).toMatchObject({ownAnswer:null,submittedAt:null});
    expect(sanitized.question.portable.contextBlocks[0]!.assets[0]!.storagePath).toBeNull();

    const body=JSON.stringify(sanitized);
    for(const raw of [sessionId,questionId,assetId,'44444444-4444-4444-8444-444444444444']){
      expect(body).not.toContain(raw);
    }
    expect(sanitized.question.id).toBe(sanitized.question.sourceQuestionId);
    expect(sanitized.question.portable.leaf.id).toBe(sanitized.question.id);
    expect(sanitized.question.portable.contextBlocks[0]!.assets[0]!.id)
      .toBe(sanitized.question.portable.leaf.contentJson.blocks[0]!.assetId);
    expect(sanitized.question.portable.contextBlocks[0]!.assets[0]!.url).toBe('https://signed.example/asset.png');
  });
});
