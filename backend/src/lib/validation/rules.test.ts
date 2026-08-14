import{describe,expect,it}from'vitest';import{validateExtraction,type ValidationInput}from'./rules.js';
const base=():ValidationInput=>({componentTotal:2,questions:[{id:'p',path:'1',parentId:null,marks:null,stem:'Parent context text',commandWord:null,answerKind:'text',answerLines:null,assetCount:0,subtopicConfidences:[.9],extractConfidence:.95},{id:'q',path:'1.a',parentId:'p',marks:2,stem:'Explain a valid technical reason.',commandWord:'Explain',answerKind:'text',answerLines:2,assetCount:0,subtopicConfidences:[.9],extractConfidence:.95}],schemes:[{questionId:'q',type:'all_required',maxMarks:2,points:[1,1]}],assets:[]});
describe('V01-V20 extraction rules',()=>{const cases:Array<[string,(x:ValidationInput)=>void]>=[['V01',x=>x.schemes[0]!.points=[1]],['V02',x=>x.componentTotal=3],['V03',x=>x.schemes=[]],['V04',x=>x.schemes.push({questionId:'missing',type:'all_required',maxMarks:1,points:[1]})],['V05',x=>Object.assign(x.schemes[0]!,{type:'any_n_from_m',nRequired:2,points:[1,1]})],['V06',x=>Object.assign(x.schemes[0]!,{type:'any_n_from_m',nRequired:1,points:[1,1],groupMaxMarks:3})],['V07',x=>x.questions[0]!.marks=1],['V08',x=>x.questions[1]!.path='2.a'],['V09',x=>x.questions.push({...x.questions[0]!,id:'p3',path:'3'})],['V10',x=>x.questions[1]!.answerKind='diagram'],['V11',x=>x.assets=[{storagePath:'',size:10}]],['V12',x=>x.questions[1]!.commandWord='Invalid'],['V13',x=>x.questions[1]!.marks=10],['V14',x=>x.questions[1]!.answerLines=1],['V15',x=>x.questions[1]!.subtopicConfidences=[]],['V16',x=>x.questions[1]!.subtopicConfidences=[.5]],['V17',x=>x.questions[1]!.stem='short'],['V18',x=>x.questions[1]!.extractConfidence=.5],['V19',x=>x.duplicateSimilarity=.95],['V20',x=>Object.assign(x.schemes[0]!,{type:'levels_of_response',levels:0})]];it.each(cases)('%s triggers', (code,mutate)=>{const x=base();mutate(x);expect(validateExtraction(x).map(f=>f.code)).toContain(code)});it('accepts a clean extraction',()=>expect(validateExtraction(base())).toEqual([]));});

describe('V21 subtopic weights', () => {
  const base = {
    componentTotal: 3,
    questions: [
      {
        id: 'q1', path: '1', parentId: null, marks: 3, stem: 'Explain why a key is needed.',
        commandWord: 'Explain', answerKind: 'text', answerLines: 6, assetCount: 0,
        subtopicConfidences: [0.9], extractConfidence: 0.95,
      },
    ],
    schemes: [{ questionId: 'q1', type: 'all_required', maxMarks: 3, points: [1, 1, 1] }],
    assets: [],
  };

  it('accepts weights that split evenly to one', () => {
    const findings = validateExtraction({
      ...base,
      questions: [{ ...base.questions[0]!, subtopicWeights: [0.5, 0.3, 0.2] }],
    });
    expect(findings.filter((f) => f.code === 'V21')).toEqual([]);
  });

  it('flags weights that would inflate mastery', () => {
    const findings = validateExtraction({
      ...base,
      questions: [{ ...base.questions[0]!, subtopicWeights: [1, 1] }],
    });
    expect(findings.filter((f) => f.code === 'V21')).toHaveLength(1);
  });

  it('says nothing when no weights were supplied', () => {
    expect(validateExtraction(base).filter((f) => f.code === 'V21')).toEqual([]);
  });
});

describe('V22 sibling asset duplication', () => {
  const base = {
    componentTotal: 3,
    questions: [
      { id: 'q3', path: '3', parentId: null, marks: null, stem: 'A company stores records.',
        commandWord: null, answerKind: 'text', answerLines: 0, assetCount: 1,
        subtopicConfidences: [], extractConfidence: 0.95 },
      { id: 'q3a', path: '3.a', parentId: 'q3', marks: 3, stem: 'Define primary key.',
        commandWord: 'Define', answerKind: 'text', answerLines: 6, assetCount: 1,
        subtopicConfidences: [0.9], extractConfidence: 0.95 },
    ],
    schemes: [{ questionId: 'q3a', type: 'all_required', maxMarks: 3, points: [1, 1, 1] }],
  };

  it('flags one figure copied onto several siblings', () => {
    const findings = validateExtraction({
      ...base,
      assets: [
        { storagePath: 'a/1.png', size: 40_000, questionPath: '3.a', contentHash: 'same' },
        { storagePath: 'a/2.png', size: 40_000, questionPath: '3.b', contentHash: 'same' },
        { storagePath: 'a/3.png', size: 40_000, questionPath: '3.c', contentHash: 'same' },
      ],
    });
    const v22 = findings.filter((f) => f.code === 'V22');
    expect(v22).toHaveLength(1);
    expect(v22[0]!.message).toContain('3 siblings');
  });

  it('says nothing when siblings carry different figures', () => {
    const findings = validateExtraction({
      ...base,
      assets: [
        { storagePath: 'a/1.png', size: 40_000, questionPath: '3.a', contentHash: 'one' },
        { storagePath: 'a/2.png', size: 40_000, questionPath: '3.b', contentHash: 'two' },
      ],
    });
    expect(findings.filter((f) => f.code === 'V22')).toEqual([]);
  });

  it('ignores assets with no hash, which is what an uncropped run produces', () => {
    const findings = validateExtraction({
      ...base,
      assets: [
        { storagePath: 'a/1.png', size: 40_000, questionPath: '3.a' },
        { storagePath: 'a/2.png', size: 40_000, questionPath: '3.b' },
      ],
    });
    expect(findings.filter((f) => f.code === 'V22')).toEqual([]);
  });
});
