import type{Pool}from'pg';
import{DomainError}from'../services/assignments-service.js';
import{snapshotHasStorageOnlyAsset}from'./assignment-attempt-overlay.js';
import{questionOnlineResponseIntegritySql}from'./source-response-readiness.js';
/**
 * Online assignments must have both renderable source visuals and a response
 * surface that preserves the Cambridge task. A source table/diagram may look
 * correct while still being unusable if the learner only receives a generic
 * textarea; fail closed before publish in that case.
 */
export async function assertAssignmentOnlineRenderable(pool:Pool,assignmentId:string){
 const result=await pool.query(`select aq.portable_snapshot from assignment_questions aq join assignments a on a.id=aq.assignment_id where aq.assignment_id=$1 and a.mode<>'pdf' and aq.portable_snapshot is not null union all select aci.portable_snapshot from assignment_context_items aci join assignments a on a.id=aci.assignment_id where aci.assignment_id=$1 and a.mode<>'pdf'`,[assignmentId]);
 if(result.rows.some(row=>snapshotHasStorageOnlyAsset(row.portable_snapshot)))throw new DomainError('online_asset_rendering_unavailable',409);

 const response=await pool.query(
   `select q.display_ref
    from assignment_questions aq
    join assignments a on a.id=aq.assignment_id
    join questions q on q.id=aq.question_id
    where aq.assignment_id=$1
      and a.mode<>'pdf'
      and not ${questionOnlineResponseIntegritySql('q')}
    limit 1`,
   [assignmentId],
 );
 if(response.rowCount)throw new DomainError('online_response_rendering_unavailable',409);
}
