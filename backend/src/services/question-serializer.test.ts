import { describe, expect, it } from 'vitest';
import { serializeQuestion } from './question-serializer.js';

const row = {
  id:'q1',display_ref:'9618/12/M/J/26 Q1',stem_md:'Question',context_md:null,
  command_word:'Explain',marks:3,ao:'AO2',answer_kind:'text',parent:null,
  mark_scheme:{ id:'ms1',points:[{ code:'MP1',text:'Point' }] },
};

describe('question serializer mark-scheme boundary', () => {
  it('removes the mark scheme when permission is false', () => {
    expect(serializeQuestion({ ...row,can_view_scheme:false })).not.toHaveProperty('markScheme');
  });

  it('removes the mark scheme when permission evidence is missing', () => {
    expect(serializeQuestion(row)).not.toHaveProperty('markScheme');
  });

  it('includes the mark scheme only with an explicit permission flag', () => {
    expect(serializeQuestion({ ...row,can_view_scheme:true })).toHaveProperty('markScheme.id','ms1');
  });
});
