import type{Pool}from'pg';import{DomainError}from'../services/assignments-service.js';import{snapshotHasStorageOnlyAsset}from'./assignment-attempt-overlay.js';
/**
 * The current student attempt UI can render textual portable assets through
 * contextMd, but not binary-only diagrams/images. Refuse publish rather than
 * silently presenting an incomplete question. Drafts stay allowed so the
 * teacher can resolve/re-extract the asset first.
 */
export async function assertAssignmentOnlineRenderable(pool:Pool,assignmentId:string){
 const result=await pool.query(`select portable_snapshot from assignment_questions where assignment_id=$1 and portable_snapshot is not null union all select portable_snapshot from assignment_context_items where assignment_id=$1`,[assignmentId]);
 if(result.rows.some(row=>snapshotHasStorageOnlyAsset(row.portable_snapshot)))throw new DomainError('online_asset_rendering_unavailable',409);
}
