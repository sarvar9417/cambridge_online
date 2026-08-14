import type{Pool}from'pg';import{DomainError}from'../services/assignments-service.js';import{snapshotHasStorageOnlyAsset}from'./assignment-attempt-overlay.js';
/**
 * The current student attempt UI can render textual portable assets through
 * contextMd, but not binary-only diagrams/images. Refuse online/mock publish
 * rather than silently presenting an incomplete question. PDF mode is handled
 * by the PDF exporter/preflight instead.
 */
export async function assertAssignmentOnlineRenderable(pool:Pool,assignmentId:string){
 const result=await pool.query(`select aq.portable_snapshot from assignment_questions aq join assignments a on a.id=aq.assignment_id where aq.assignment_id=$1 and a.mode<>'pdf' and aq.portable_snapshot is not null union all select aci.portable_snapshot from assignment_context_items aci join assignments a on a.id=aci.assignment_id where aci.assignment_id=$1 and a.mode<>'pdf'`,[assignmentId]);
 if(result.rows.some(row=>snapshotHasStorageOnlyAsset(row.portable_snapshot)))throw new DomainError('online_asset_rendering_unavailable',409);
}
