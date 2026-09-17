import{describe,expect,it}from'vitest';
import{assertPaperTotal,renderPaperHtml,type ExportQuestion}from'./export-html.js';

const source={paperId:'11111111-1111-4111-8111-111111111111',sha256:'a'.repeat(64)};

describe('generated paper fidelity gate',()=>{
  it('renders a plain theory question without leaking mark-scheme content',()=>{
    const q:ExportQuestion={displayRef:'Q1',sourceRef:'9618/11/M/J/26 Q1(d)',stem:'Explain one benefit of cache memory.',marks:2,points:[{code:'MP1',text:'Faster access than main memory.',marks:1}]};
    const html=renderPaperHtml('Practice',[q],'question_paper');
    expect(html).toContain('Explain one benefit of cache memory.');
    expect(html).toContain('Total: 2');
    expect(html).not.toContain('Faster access than main memory.');
  });

  it('renders structured tables and a canonical diagram exactly once',()=>{
    const assetId='22222222-2222-4222-8222-222222222222';
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect x="5" y="5" width="110" height="50"/></svg>';
    const q:ExportQuestion={displayRef:'Q2',sourceRef:'9618/13/M/J/26 Q2(a)',stem:'',marks:2,contentJson:{version:1,source,blocks:[{type:'text',style:'paragraph',text:'Complete the table.',source:{page:3}},{type:'table',kind:'table',headers:['Input','Output'],rows:[['0',''],['1','']],editableCells:[[0,1],[1,1]],source:{page:3}},{type:'asset',kind:'logic_circuit',assetId,altText:'Logic circuit',source:{page:3}}]},contextBlocks:[{assets:[{id:assetId,kind:'diagram',altText:'Logic circuit',contentMd:svg}]}]};
    const html=renderPaperHtml('Practice',[q],'question_paper');
    expect(html).toContain('<table');
    expect(html).toContain('Input');
    expect((html.match(/data-asset-id="22222222-2222-4222-8222-222222222222"/g)??[])).toHaveLength(1);
    expect((html.match(/Logic circuit/g)??[])).toHaveLength(1);
  });

  it('preserves pseudocode and the task boundary for Paper 2 style questions',()=>{
    const stem='Study the pseudocode.\nFOR Index ← 1 TO 10\nOUTPUT Index\nNEXT Index\nWrite pseudocode to change the loop so that only even values are output.';
    const html=renderPaperHtml('Practice',[{displayRef:'Q3',sourceRef:'9618/22/M/J/26 Q3(a)',stem,marks:3}],'question_paper');
    expect(html).toContain('class="stem-code"');
    expect(html).toContain('FOR Index');
    expect(html).toContain('class="stem-task"');
  });

  it('keeps dependency context but excludes it from total marks',()=>{
    const questions:ExportQuestion[]=[
      {displayRef:'Q4 context',sourceRef:'9618/42/M/J/26 Q2',stem:'Use the following class definition in the next question.',marks:0,role:'context_only'},
      {displayRef:'Q4',sourceRef:'9618/42/M/J/26 Q2(b)(i)',stem:'Write program code to implement the method.',marks:7,role:'graded'},
    ];
    expect(assertPaperTotal(questions,7)).toBe(7);
    const html=renderPaperHtml('Practice',questions,'question_paper');
    expect(html).toContain('Context');
    expect(html).toContain('Total: 7');
    expect(html).not.toContain('[0]');
  });

  it('renders mark-scheme-only output as a self-contained question plus canonical rubric',()=>{
    const q:ExportQuestion={
      displayRef:'Q5',sourceRef:'9618/31/M/J/26 Q5(a)',stem:'Explain why a primary key is required.',marks:3,schemeStatus:'approved',
      schemeGuidance:'Award any three valid points. Do not award repeated statements.',
      points:[
        {code:'MP1',text:'Uniquely identifies each record.',marks:1,groupLabel:'Any three from',groupNRequired:3,groupMaxMarks:3,groupAwardMode:'any_n'},
        {code:'MP2',text:'Prevents duplicate identifiers.',marks:1,groupLabel:'Any three from',groupNRequired:3,groupMaxMarks:3,groupAwardMode:'any_n',accept:['entity integrity']},
        {code:'MP3',text:'Supports relationships through foreign keys.',marks:1,groupLabel:'Any three from',groupNRequired:3,groupMaxMarks:3,groupAwardMode:'any_n',reject:['makes searches faster'],requires:['MP1']},
      ],
    };
    const html=renderPaperHtml('Mark scheme',[q],'mark_scheme');
    expect(html).toContain('Explain why a primary key is required.');
    expect(html).toContain('Guidance:');
    expect(html).toContain('Award any three valid points.');
    expect(html).toContain('Any three from');
    expect(html).toContain('Accept:');
    expect(html).toContain('entity integrity');
    expect(html).toContain('Reject:');
    expect(html).toContain('Requires:');
    expect(html).not.toContain('Name:</span>');
  });

  it('renders combined mode with both answer space and the rubric',()=>{
    const q:ExportQuestion={displayRef:'Q6',sourceRef:'9618/33/M/J/26 Q7(c)',stem:'State one purpose of an index.',marks:2,answerLines:3,points:[{code:'MP1',text:'Speeds up retrieval.',marks:1}]};
    const html=renderPaperHtml('Combined',[q],'combined');
    expect(html).toContain('class="answer-space"');
    expect(html).toContain('MP1');
    expect(html).toContain('Speeds up retrieval.');
  });

  it('keeps totals stable for a 20+ question worksheet',()=>{
    const questions:ExportQuestion[]=Array.from({length:24},(_,index)=>({displayRef:`Q${index+1}`,sourceRef:`9618/source Q${index+1}`,stem:`Question ${index+1}`,marks:(index%3)+1}));
    const expected=questions.reduce((sum,q)=>sum+q.marks,0);
    expect(assertPaperTotal(questions,expected)).toBe(expected);
    const html=renderPaperHtml('Large worksheet',questions,'question_paper');
    expect(html).toContain(`Total: ${expected}`);
    expect((html.match(/class="question/g)??[]).length).toBeGreaterThanOrEqual(24);
  });

  it('fails closed when a required private diagram has not been materialised',()=>{
    const q:ExportQuestion={displayRef:'Q8',sourceRef:'9618/11/M/J/25 Q1(b)',stem:'Complete the circuit.',marks:3,contextBlocks:[{assets:[{kind:'diagram',storagePath:'private/source-crop.png',altText:'Required circuit'}]}]};
    expect(()=>renderPaperHtml('Practice',[q],'question_paper')).toThrow('export_asset_unavailable:9618/11/M/J/25 Q1(b):Required circuit');
  });
});
