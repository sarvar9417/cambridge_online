import { pool } from './client.js';
import {
  LIVE_VISUAL_READINESS_VERSION,
  questionHasVisualSql,
  questionVisualIntegritySql,
} from '../lib/source-visual-readiness.js';

if (!pool) throw new Error('DATABASE_URL is required');

const client=await pool.connect();
try{
  await client.query('BEGIN');
  // Source writes take ROW EXCLUSIVE locks. SHARE keeps the snapshot stable
  // until the cache and freshness flag commit together.
  await client.query('LOCK TABLE public.questions IN SHARE MODE');
  await client.query('LOCK TABLE public.question_assets IN SHARE MODE');

  const visualReady=questionVisualIntegritySql('q');
  const hasVisual=questionHasVisualSql('q');

  await client.query('DELETE FROM public.live_question_visual_readiness');
  const inserted=await client.query(
    `INSERT INTO public.live_question_visual_readiness(
       question_id,has_visual,visual_ready,computed_at
     )
     SELECT q.id,(${hasVisual}),(${visualReady}),now()
     FROM public.questions q
     RETURNING question_id`,
  );

  await client.query(
    `UPDATE public.live_question_visual_readiness_state
     SET dirty=false,
         refreshed_at=now(),
         algorithm_version=$2,
         row_count=$1
     WHERE singleton=true`,
    [inserted.rowCount ?? 0,LIVE_VISUAL_READINESS_VERSION],
  );
  await client.query('COMMIT');
  console.log(`Refreshed Live visual readiness for ${inserted.rowCount ?? 0} questions`);
}catch(error){
  await client.query('ROLLBACK');
  throw error;
}finally{
  client.release();
  await pool.end();
}
