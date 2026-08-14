import{mkdtemp,rm,writeFile}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join}from'node:path';
import{afterEach,describe,expect,it,vi}from'vitest';
import type{Pool}from'pg';
import{createIngestionProcessors,segmentPreparedArtifact}from'./ingestion.js';

const dirs:string[]=[];
afterEach(async()=>{await Promise.all(dirs.splice(0).map(path=>rm(path,{recursive:true,force:true})))});
const job=(kind:string,payload:unknown={paperId:'paper-a',previousJobId:'previous'})=>({id:`job-${kind}`,kind,payload,attempts:1,maxAttempts:3});

describe('ingestion stage pipeline',()=>{
  it('starts with a durable prepare job reference',async()=>{
    const result=await createIngestionProcessors({}as Pool)['ingest-paper']!(job('ingest-paper',{paperId:'paper-a'}));
    expect(result).toMatchObject({next:{kind:'ingest-prepare',payload:{paperId:'paper-a',previousJobId:'job-ingest-paper'},idempotencyKey:'ingest:paper-a:prepare'}});
  });

  it('loads the previous durable artifact and chains the next stage',async()=>{
    const query=vi.fn().mockResolvedValue({rowCount:1,rows:[{result:{prepared:true}}]});
    const prepare=vi.fn().mockResolvedValue({pageCount:3});
    const result=await createIngestionProcessors({query}as unknown as Pool,{prepare})['ingest-prepare']!(job('ingest-prepare'));
    expect(prepare).toHaveBeenCalledWith('paper-a',{prepared:true});
    expect(result).toMatchObject({result:{pageCount:3},next:{kind:'ingest-segment'}});
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
});
