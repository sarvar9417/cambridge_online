import { describe, expect, it } from 'vitest';
import { attemptQuestionAssetIds, serializeAttemptQuestion, type AttemptQuestionRow } from './attempt-question-serializer.js';

const paperId='11111111-1111-4111-8111-111111111111';
const assetId='22222222-2222-4222-8222-222222222222';
const base:AttemptQuestionRow={
  id:'33333333-3333-4333-8333-333333333333',
  display_ref:'0478/12/M/J/26 Q3(a)',stem_md:'Legacy stem',context_md:'Leaf context',parent_context:'Parent context',
  command_word:'Describe',marks:3,answer_kind:'text',answer_text:null,content_json:null,content_version:null,
};

const structured={
  version:1 as const,
  source:{paperId,sha256:'a'.repeat(64)},
  blocks:[
    {type:'text' as const,style:'task' as const,text:'Source-backed task',source:{page:4}},
    {type:'asset' as const,kind:'diagram' as const,assetId,altText:'Network diagram',source:{page:4}},
  ],
};

describe('attempt question serializer',()=>{
  it('preserves the legacy path when structured content has not been migrated',()=>{
    expect(serializeAttemptQuestion(base)).toMatchObject({
      stemMd:'Legacy stem',contextMd:'Parent context',contentJson:null,contentVersion:null,assetUrls:{},
    });
  });

  it('returns validated structured content and only signed URLs it references',()=>{
    const result=serializeAttemptQuestion({...base,content_json:structured,content_version:1},{
      [assetId]:'https://signed.example/diagram.png',
      '44444444-4444-4444-8444-444444444444':'https://signed.example/unrelated.png',
    });
    expect(result.contentJson).toEqual(structured);
    expect(result.contentVersion).toBe(1);
    expect(result.assetUrls).toEqual({[assetId]:'https://signed.example/diagram.png'});
    expect(attemptQuestionAssetIds(result.contentJson)).toEqual([assetId]);
  });

  it('fails closed on a database version/content mismatch',()=>{
    expect(()=>serializeAttemptQuestion({...base,content_json:structured,content_version:2})).toThrow(/Unsupported structured content version/);
  });
});
