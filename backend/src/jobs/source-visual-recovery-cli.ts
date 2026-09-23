import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { spawn } from 'node:child_process';
import { pool } from '../database/client.js';
import { completeInlineSvg, renderableVisualAssetSql } from '../lib/source-visual-readiness.js';

type Row={
  asset_id:string;
  display_ref:string;
  source_page:number|null;
  latex_source:string|null;
  paper_storage_path:string|null;
  source_url:string|null;
};

function flagValues(flag:string){
  const out:string[]=[];
  for(let i=0;i<process.argv.length;i+=1){
    if(process.argv[i]===flag&&process.argv[i+1])out.push(process.argv[i+1]!);
  }
  return out;
}

function run(command:string,args:string[],cwd:string){
  return new Promise<void>((resolve,reject)=>{
    const child=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe']});
    let stderr='';
    child.stderr.on('data',(chunk)=>{stderr+=String(chunk);});
    child.on('error',reject);
    child.on('close',(code)=>code===0?resolve():reject(new Error(`${command} failed (${code}): ${stderr.slice(-4000)}`)));
  });
}

function latexDocument(source:string){
  if(/\\documentclass\b/.test(source))return source;
  return [
    '\\documentclass[border=6pt]{standalone}',
    '\\usepackage{tikz}',
    '\\usetikzlibrary{arrows.meta,positioning}',
    '\\begin{document}',
    source,
    '\\end{document}',
  ].join('\n');
}

async function compileLatexToSvg(assetId:string,latex:string){
  const dir=await mkdtemp(join(tmpdir(),'campath-visual-'));
  try{
    const tex=join(dir,'source.tex');
    await writeFile(tex,latexDocument(latex),'utf8');
    await run('pdflatex',['-interaction=nonstopmode','-halt-on-error',basename(tex)],dir);
    await run('pdftocairo',['-svg','source.pdf','source.svg'],dir);
    const svg=await readFile(join(dir,'source.svg'),'utf8');
    if(!completeInlineSvg(svg))throw new Error(`compiled_svg_invalid:${assetId}`);
    return {
      svg,
      contentHash:createHash('sha256').update(svg).digest('hex'),
      sizeBytes:Buffer.byteLength(svg),
    };
  }finally{
    await rm(dir,{recursive:true,force:true});
  }
}

if(!pool)throw new Error('DATABASE_URL is required');

const write=process.argv.includes('--write');
const allLatex=process.argv.includes('--all-latex');
const requested=[...new Set(flagValues('--asset'))];
const verified=new Set(flagValues('--verified'));

if(write&&!verified.size)throw new Error('--write requires at least one explicit --verified <asset-id>');

const result=await pool.query<Row>(`
  select qa.id asset_id,q.display_ref,qa.source_page,qa.latex_source,
         sp.storage_path paper_storage_path,sp.source_url
  from question_assets qa
  join questions q on q.id=qa.question_id
  left join source_papers sp on sp.id=q.source_paper_id
  where qa.kind in ('diagram','image')
    and not ${renderableVisualAssetSql('qa')}
    and nullif(btrim(coalesce(qa.latex_source,'')),'') is not null
    and exists(
      select 1
      from questions consumer
      cross join lateral jsonb_array_elements(coalesce(consumer.content_json->'blocks','[]'::jsonb)) block
      where consumer.content_version=1
        and block->>'type'='asset'
        and block->>'assetId'=qa.id::text
    )
    and ($1::boolean or cardinality($2::uuid[])>0)
    and ($1::boolean or qa.id=any($2::uuid[]))
  order by q.display_ref,qa.id
`,[allLatex,requested]);

if(!result.rowCount){
  console.log(JSON.stringify({mode:write?'write':'dry-run',assets:[],message:'No matching recoverable visual assets.'},null,2));
  await pool.end();
  process.exit(0);
}

const report:Array<Record<string,unknown>>=[];
for(const row of result.rows){
  if(!row.latex_source)continue;
  const compiled=await compileLatexToSvg(row.asset_id,row.latex_source);
  const canWrite=write&&verified.has(row.asset_id);
  if(canWrite){
    const updated=await pool.query(
      `update question_assets qa
       set svg_markup=$2,content_hash=$3,size_bytes=$4
       where qa.id=$1
         and not ${renderableVisualAssetSql('qa')}
         and qa.latex_source=$5
       returning qa.id`,
      [row.asset_id,compiled.svg,compiled.contentHash,compiled.sizeBytes,row.latex_source],
    );
    if(updated.rowCount!==1)throw new Error(`visual_recovery_concurrent_change:${row.asset_id}`);
  }
  report.push({
    assetId:row.asset_id,
    displayRef:row.display_ref,
    sourcePage:row.source_page,
    sourceUrl:row.source_url,
    paperStoragePath:row.paper_storage_path,
    contentHash:compiled.contentHash,
    sizeBytes:compiled.sizeBytes,
    action:canWrite?'written':'dry_run_only',
    verificationRequired:!verified.has(row.asset_id),
  });
}

const remaining=await pool.query(`
  select count(distinct qa.id)::int count
  from question_assets qa
  where qa.kind in ('diagram','image')
    and not ${renderableVisualAssetSql('qa')}
    and exists(
      select 1
      from questions consumer
      cross join lateral jsonb_array_elements(coalesce(consumer.content_json->'blocks','[]'::jsonb)) block
      where consumer.content_version=1
        and block->>'type'='asset'
        and block->>'assetId'=qa.id::text
    )
`);

console.log(JSON.stringify({
  mode:write?'write':'dry-run',
  assets:report,
  remainingCanonicalUnresolved:Number(remaining.rows[0]?.count??0),
},null,2));

await pool.end();
