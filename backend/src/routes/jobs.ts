import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { JobRunner } from '../jobs/runner.js';
import { createExportPdfProcessor } from '../jobs/processors/export-pdf.js';
export function createJobsRouter(pool: Pool) {
  const router=Router();
  router.post('/run-once',async(req,res)=>{if(req.actor!.role==='student'){res.status(403).json({error:{code:'staff_only',message:'Faqat xodimlar uchun.'}});return}await pool.query(`update exports set file_data=null where file_data is not null and expires_at<=now()`);const runner=new JobRunner(pool,{'export-pdf':createExportPdfProcessor(pool)});res.json({processed:await runner.runOnce(['export-pdf'])})});
  router.get('/:id',async(req,res)=>{const result=await pool.query(`select j.id,j.status,j.attempts,j.max_attempts,j.result,j.error,j.created_at,j.started_at,j.finished_at from jobs j left join exports e on j.ref_table='exports' and e.id=j.ref_id where j.id=$1 and ($2='owner' or e.requested_by=$3)`,[z.string().uuid().parse(req.params.id),req.actor!.role,req.actor!.id]);if(!result.rowCount){res.status(404).json({error:{code:'not_found',message:'Topilmadi.'}});return}res.json(result.rows[0])});
  return router;
}
