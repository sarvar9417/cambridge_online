import type { Pool } from 'pg';

type AttemptQuestion={id:string;displayRef:string;marks:number;contextMd?:string|null;[key:string]:unknown};
type AttemptLike={questions:AttemptQuestion[];[key:string]:unknown};
type PortableSnapshot={
  leaf?:{stem?:unknown};
  contextBlocks?:Array<{displayRef?:unknown;context?:unknown;assets?:Array<{kind?:unknown;contentMd?:unknown;storagePath?:unknown;altText?:unknown}>}>;
};

function parseSnapshot(value:unknown):PortableSnapshot|null{
  if(!value)return null;if(typeof value==='string'){try{return JSON.parse(value)as PortableSnapshot}catch{return null}}
  return typeof value==='object'?value as PortableSnapshot:null;
}

function portableText(value:unknown,{includeLeaf=false}:{includeLeaf?:boolean}={}):string{
  const snapshot=parseSnapshot(value);if(!snapshot)return'';const lines:string[]=[];
  for(const block of snapshot.contextBlocks??[]){
    if(typeof block.displayRef==='string')lines.push(`[${block.displayRef}]`);
    if(typeof block.context==='string'&&block.context.trim())lines.push(block.context.trim());
    for(const asset of block.assets??[])if(typeof asset.contentMd==='string'&&asset.contentMd.trim())lines.push(asset.contentMd.trim());
  }
  if(includeLeaf&&typeof snapshot.leaf?.stem==='string'&&snapshot.leaf.stem.trim())lines.push(snapshot.leaf.stem.trim());
  return lines.join('\n\n');
}

/**
 * The legacy AssignmentsService remains the source of attempt lifecycle/auth.
 * This overlay only replaces presentation metadata created by Question Bank v2:
 * fresh numbering, overridden marks and frozen portable textual context.
 */
export async function overlayAssignmentAttempt(pool:Pool,assignmentId:string,attempt:AttemptLike):Promise<AttemptLike>{
  if(!attempt.questions.length)return attempt;
  const result=await pool.query(
    `select aq.question_id,aq.fresh_ref,coalesce(aq.marks_override,q.marks) marks,aq.portable_snapshot,
       coalesce((
         select jsonb_agg(aci.portable_snapshot order by aci.sort_order)
         from question_dependencies qd
         join assignment_context_items aci on aci.assignment_id=aq.assignment_id and aci.question_id=qd.depends_on_id
         where qd.question_id=aq.question_id and qd.kind::text in ('text_ref','text')
       ),'[]'::jsonb) referenced_snapshots
     from assignment_questions aq join questions q on q.id=aq.question_id
     where aq.assignment_id=$1`,
    [assignmentId],
  );
  const byId=new Map(result.rows.map(row=>[String(row.question_id),row]));
  return{...attempt,questions:attempt.questions.map(question=>{
    const row=byId.get(question.id);if(!row)return question;
    const frozen=portableText(row.portable_snapshot);
    const referenced=(Array.isArray(row.referenced_snapshots)?row.referenced_snapshots:[]).map((value:unknown)=>portableText(value,{includeLeaf:true})).filter(Boolean).join('\n\n');
    const contexts=[frozen,referenced,question.contextMd??''].filter((value,index,array)=>Boolean(value)&&array.indexOf(value)===index);
    return{...question,displayRef:String(row.fresh_ref??question.displayRef),marks:Number(row.marks??question.marks),contextMd:contexts.join('\n\n')||null};
  })};
}

export function snapshotHasStorageOnlyAsset(value:unknown):boolean{
  const snapshot=parseSnapshot(value);return Boolean(snapshot?.contextBlocks?.some(block=>block.assets?.some(asset=>typeof asset.storagePath==='string'&&asset.storagePath&&!asset.contentMd)));
}
