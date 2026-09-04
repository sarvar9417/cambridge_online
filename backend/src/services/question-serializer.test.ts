import { describe, expect, it } from 'vitest';
import { serializeQuestion } from './question-serializer.js';

const row = {
  id:'q1',display_ref:'9618/12/M/J/26 Q1',stem_md:'Question',context_md:null,
  command_word:'Explain',marks:3,ao:'AO2',answer_kind:'text',parent:null,
  mark_scheme:{ id:'ms1',points:[{ code:'MP1',text:'Point' }] },
};

const structuredContent = {
  version:1,
  source:{
    paperId:'11111111-1111-4111-8111-111111111111',
    sha256:'a'.repeat(64),
  },
  blocks:[{
    type:'text',style:'task',text:'Complete the truth table.',source:{ page:3 },
  }],
};

describe('question serializer boundaries', () => {
  it('removes the mark scheme when permission is false', () => {
    expect(serializeQuestion({ ...row,can_view_scheme:false })).not.toHaveProperty('markScheme');
  });

  it('removes the mark scheme when permission evidence is missing', () => {
    expect(serializeQuestion(row)).not.toHaveProperty('markScheme');
  });

  it('includes the mark scheme only with an explicit permission flag', () => {
    expect(serializeQuestion({ ...row,can_view_scheme:true })).toHaveProperty('markScheme.id','ms1');
  });

  it('keeps legacy text while exposing validated canonical structured content', () => {
    const serialized = serializeQuestion({
      ...row,
      content_json:structuredContent,
      content_version:1,
    });
    expect(serialized).toHaveProperty('stemMd','Question');
    expect(serialized).toHaveProperty('contentVersion',1);
    expect(serialized).toHaveProperty('contentJson.blocks.0.type','text');
  });

  it('returns a null structured-content contract for legacy questions', () => {
    expect(serializeQuestion(row)).toMatchObject({ contentJson:null,contentVersion:null });
  });

  it('fails closed instead of exposing malformed canonical content', () => {
    expect(() => serializeQuestion({
      ...row,
      content_json:{ ...structuredContent,version:2 },
      content_version:1,
    })).toThrow();
  });
});
