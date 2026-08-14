import{mkdtemp,rm,writeFile}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join}from'node:path';
import{afterEach,describe,expect,it,vi}from'vitest';
import type{Pool}from'pg';
import{createIngestionProcessors,detectDependencyCandidates,INGESTION_STAGES,matchExtractedArtifacts,segmentPreparedArtifact,validateIngestionArtifact}from'./ingestion.js';

const dirs:string[]=[];
afterEach(async()=>{await Promise.all(dirs.splice(0).map(path=>rm(path,{recursive:true,force:true})))});
const job=(kind:string,payload:unknown={paperId:'paper-a',previousJobId:'previous'})=>({id:`job-${kind}`,kind,payload,attempts:1,maxAttempts:3});

describe('ingestion stage pipeline',()=>{
  it('starts with a durable prepare job reference',async()=>{
    const result=await createIngestionProcessors({}as Pool)['ingest-paper']!(job('ingest-paper',{paperId:'paper-a'}));
    expect(result).toMatchObject({result:{paperId:'paper-a'},next:{kind:'ingest-prepare',payload:{refId:'paper-a',refTable:'source_papers',previousJobId:'job-ingest-paper'},idempotencyKey:'ingest:paper-a:prepare'}});
  });

  it('starts paired question and mark-scheme papers as one durable run',async()=>{
    const payload={runId:'run-a',qpPaperId:'qp-a',msPaperId:'ms-a'};
    const result=await createIngestionProcessors({}as Pool)['ingest-bundle']!(job('ingest-bundle',payload));
    expect(result).toMatchObject({result:payload,next:{kind:'ingest-prepare',payload:{refId:'run-a',refTable:'ingestion_runs'},idempotencyKey:'ingest-run:run-a:prepare',refTable:'ingestion_runs',refId:'run-a'}});
  });

  it('loads the previous durable artifact and chains the next stage',async()=>{
    const query=vi.fn().mockResolvedValue({rowCount:1,rows:[{result:{prepared:true}}]});
    const prepare=vi.fn().mockResolvedValue({pageCount:3});
    const result=await createIngestionProcessors({query}as unknown as Pool,{prepare})['ingest-prepare']!(job('ingest-prepare'));
    expect(prepare).toHaveBeenCalledWith('paper-a',{prepared:true});
    expect(result).toMatchObject({result:{pageCount:3},next:{kind:'ingest-segment'}});
  });

  it('runs DEPENDS after classification and before validation',()=>{
    const classify=INGESTION_STAGES.indexOf('classify');
    const depends=INGESTION_STAGES.indexOf('depends');
    const validate=INGESTION_STAGES.indexOf('validate');
    expect(classify).toBeGreaterThanOrEqual(0);
    expect(depends).toBe(classify+1);
    expect(validate).toBe(depends+1);
  });

  it('creates three-page batches with one-page overlap',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'campath-segment-'));dirs.push(dir);const textPath=join(dir,'pages.txt');
    await writeFile(textPath,['one','two','three','four','five'].join('\f'));
    const result=await segmentPreparedArtifact({textPath,pageImages:['1.png','2.png','3.png','4.png','5.png']});
    expect(result.batches).toEqual([
      {pageNumbers:[1,2,3],images:['1.png','2.png','3.png'],text:'one\n\f\ntwo\n\f\nthree'},
      {pageNumbers:[3,4,5],images:['3.png','4.png','5.png'],text:'three\n\f\nfour\n\f\nfive'},
    ]);
  });

  it('fails explicitly when an AI stage has no provider',async()=>{
    const query=vi.fn().mockResolvedValue({rowCount:1,rows:[{result:{batches:[]}}]});
    await expect(createIngestionProcessors({query}as unknown as Pool)['ingest-extract-qp']!(job('ingest-extract-qp'))).rejects.toThrow('ingestion_stage_unavailable:extract-qp');
  });

  it('matches question papers and mark schemes by display reference',async()=>{
    const result=await matchExtractedArtifacts({questions:[{id:'q1',displayRef:'1(a)'},{id:'q2',display_ref:'2'}],markSchemes:[{display_ref:'1(a)',maxMarks:2},{displayRef:'3',maxMarks:1}]});
    expect(result.markSchemes).toEqual([{display_ref:'1(a)',maxMarks:2,questionId:'q1'}]);
    expect(result.matchReport).toEqual({duplicateQuestionRefs:[],unmatchedQuestions:['2'],unmatchedSchemes:['3']});
  });

  it('detects sibling references for the DEPENDS classifier',async()=>{
    const result=await detectDependencyCandidates({questions:[
      {path:'3.a',stemMd:'State one feature.'},
      {path:'3.b',stemMd:'Using your answer to part (a), state the final value.'},
      {path:'4.a',stemMd:'Describe one part of the fetch-execute cycle.'},
    ]});
    expect(result.dependencyCandidates).toEqual([
      expect.objectContaining({fromPath:'3.b',mentions:expect.arrayContaining([expect.objectContaining({excerpt:expect.stringMatching(/part\s*\(a\)/i)})])}),
    ]);
  });

  it('runs validation and assigns review status',async()=>{
    const validationInput={componentTotal:2,questions:[{id:'q',path:'1',parentId:null,marks:2,stem:'Explain a valid technical reason.',commandWord:'Explain',answerKind:'text',answerLines:2,assetCount:0,subtopicConfidences:[.9],extractConfidence:.95}],schemes:[],assets:[]};
    const result=await validateIngestionArtifact({validationInput});
    expect(result.reviewStatus).toBe('needs_review');
    expect(result.validationFindings).toEqual(expect.arrayContaining([expect.objectContaining({code:'V03',severity:'error'})]));
  });

  it('passes classified dependencies into V23 validation',async()=>{
    const validationInput={componentTotal:2,questions:[
      {id:'root',path:'3',parentId:null,marks:null,stem:'Shared context for question three.',commandWord:null,answerKind:'text',answerLines:null,assetCount:0,subtopicConfidences:[],extractConfidence:.95},
      {id:'a',path:'3.a',parentId:'root',marks:1,stem:'State one property.',commandWord:'State',answerKind:'text',answerLines:1,assetCount:0,subtopicConfidences:[.9],extractConfidence:.95},
      {id:'b',path:'3.b',parentId:'root',marks:1,stem:'Using your answer to part (a), state the result.',commandWord:'State',answerKind:'text',answerLines:1,assetCount:0,subtopicConfidences:[.9],extractConfidence:.95},
    ],schemes:[
      {questionId:'a',type:'all_required',maxMarks:1,points:[1]},
      {questionId:'b',type:'all_required',maxMarks:1,points:[1]},
    ],assets:[]};
    const result=await validateIngestionArtifact({validationInput,dependencies:[{from_path:'3.b',kind:'answer_ref'}]});
    expect((result.validationFindings as Array<{code:string}>).some(finding=>finding.code==='V23')).toBe(false);
    expect((result.validationInput as any).dependencies).toEqual([{fromPath:'3.b',kind:'answer_ref'}]);
  });
});
