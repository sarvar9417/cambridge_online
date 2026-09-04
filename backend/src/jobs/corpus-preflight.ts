import{access}from'node:fs/promises';import{resolve}from'node:path';import type{Pool}from'pg';
export type CorpusStatus='COMPLETE'|'READY_TO_QUEUE'|'SOURCE_MISSING';
export interface CorpusPreflightRow{key:string;year:number;series:'FM'|'MJ'|'ON';component:number;variant:number;paperCode:number;qpPaperId:string;msPaperId:string|null;qpPath:string;msPath:string|null;qpExists:boolean;msExists:boolean;qpPages:number|null;msPages:number|null;rootCount:number;leafCount:number;leafMarks:number;expectedMarks:number;markSchemeCount:number;approvedMarkSchemeCount:number;approvedLeafCount:number;unresolvedErrors:number;status:CorpusStatus;minimumExtractionCalls:number|null;knownClassificationCalls:number|null;knownDependencyCalls:number|null;knownCrosscheckCalls:number|null}
export interface CorpusPreflightSummary{rows:CorpusPreflightRow[];total:number;complete:number;ready:number;sourceMissing:number;knownMinimumExtractionCalls:number}

export async function loadCorpusPreflight(pool:Pool,input:{yearFrom?:number;yearTo?:number;syllabusCode?:string}={}):Promise<CorpusPreflightSummary>{
 const yearFrom=input.yearFrom??2021,yearTo=input.yearTo??2025,syllabusCode=input.syllabusCode??'9618';
 const result=await pool.query(`select qp.id qp_id,ms.id ms_id,qp.year,qp.series::text series,qp.variant,qp.storage_path qp_path,ms.storage_path ms_path,qp.page_count qp_pages,ms.page_count ms_pages,c.number component,c.total_marks expected_marks,
   coalesce(q.root_count,0)::int root_count,coalesce(q.leaf_count,0)::int leaf_count,coalesce(q.leaf_marks,0)::int leaf_marks,coalesce(q.approved_leaf_count,0)::int approved_leaf_count,
   coalesce(q.mark_scheme_count,0)::int mark_scheme_count,coalesce(q.approved_mark_scheme_count,0)::int approved_mark_scheme_count,coalesce(v.unresolved_errors,0)::int unresolved_errors
  from source_papers qp join syllabi s on s.id=qp.syllabus_id join components c on c.id=qp.component_id
  left join source_papers ms on ms.syllabus_id=qp.syllabus_id and ms.component_id=qp.component_id and ms.year=qp.year and ms.series=qp.series and ms.variant=qp.variant and ms.kind='MS'
  left join lateral(
    select count(*)filter(where q.parent_id is null) root_count,count(*)filter(where q.marks is not null) leaf_count,coalesce(sum(q.marks)filter(where q.marks is not null),0) leaf_marks,
      count(*)filter(where q.marks is not null and q.status='approved') approved_leaf_count,
      count(msq.id)filter(where q.marks is not null) mark_scheme_count,
      count(msq.id)filter(where q.marks is not null and msq.status='approved') approved_mark_scheme_count
    from questions q left join mark_schemes msq on msq.question_id=q.id where q.source_paper_id=qp.id
  )q on true
  left join lateral(
    select count(*) unresolved_errors from validation_findings vf where vf.ref_table='source_papers' and vf.ref_id=qp.id and vf.severity='error' and vf.resolved_at is null
  )v on true
  where s.code=$1 and qp.kind='QP' and qp.year between $2 and $3
  order by qp.year,qp.series,c.number,qp.variant`,[syllabusCode,yearFrom,yearTo]);
 const rows:CorpusPreflightRow[]=[];
 for(const row of result.rows){const qpPath=String(row.qp_path),msPath=row.ms_path?String(row.ms_path):null,qpExists=await exists(qpPath),msExists=msPath?await exists(msPath):false,component=Number(row.component),variant=Number(row.variant),paperCode=variant>=10?variant:component*10+variant,leafCount=Number(row.leaf_count),rootCount=Number(row.root_count),qpPages=nullableInt(row.qp_pages),msPages=nullableInt(row.ms_pages),minimumExtractionCalls=qpPages&&msPages?batchCount(qpPages)+batchCount(msPages):null,complete=Boolean(row.ms_id)&&leafCount>0&&Number(row.leaf_marks)===Number(row.expected_marks)&&Number(row.mark_scheme_count)===leafCount&&Number(row.approved_mark_scheme_count)===leafCount&&Number(row.approved_leaf_count)===leafCount&&Number(row.unresolved_errors)===0;const status:CorpusStatus=complete?'COMPLETE':qpExists&&msExists?'READY_TO_QUEUE':'SOURCE_MISSING';rows.push({key:`${row.year}-${row.series}-${paperCode}`,year:Number(row.year),series:row.series,component,variant,paperCode,qpPaperId:String(row.qp_id),msPaperId:row.ms_id?String(row.ms_id):null,qpPath,msPath,qpExists,msExists,qpPages,msPages,rootCount,leafCount,leafMarks:Number(row.leaf_marks),expectedMarks:Number(row.expected_marks),markSchemeCount:Number(row.mark_scheme_count),approvedMarkSchemeCount:Number(row.approved_mark_scheme_count),approvedLeafCount:Number(row.approved_leaf_count),unresolvedErrors:Number(row.unresolved_errors),status,minimumExtractionCalls,knownClassificationCalls:leafCount||null,knownDependencyCalls:rootCount||null,knownCrosscheckCalls:leafCount||null})}
 return{rows,total:rows.length,complete:rows.filter(row=>row.status==='COMPLETE').length,ready:rows.filter(row=>row.status==='READY_TO_QUEUE').length,sourceMissing:rows.filter(row=>row.status==='SOURCE_MISSING').length,knownMinimumExtractionCalls:rows.reduce((sum,row)=>sum+(row.minimumExtractionCalls??0),0)};
}
export function batchCount(pageCount:number){return pageCount<=0?0:Math.max(1,Math.ceil((pageCount-1)/2))}
async function exists(path:string){try{await access(resolve(path));return true}catch{return false}}
function nullableInt(value:unknown){const number=Number(value);return value===null||value===undefined||!Number.isFinite(number)?null:number}
