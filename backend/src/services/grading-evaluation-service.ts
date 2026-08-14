import type{Pool}from'pg';
export async function computeGradingEvaluations(pool:Pool){const result=await pool.query(`with point_metrics as(
select g.prompt_version,g.model,count(distinct g.id)::int sample_size,
round(100.0*avg((gp.ai_matched=gp.teacher_matched)::int),2)point_agreement_pct,
round(100.0*count(*)filter(where gp.ai_matched and not gp.teacher_matched)/nullif(count(*)filter(where not gp.teacher_matched),0),2)false_positive_pct,
round(100.0*count(*)filter(where not gp.ai_matched and gp.teacher_matched)/nullif(count(*)filter(where gp.teacher_matched),0),2)false_negative_pct
from gradings g join grading_points gp on gp.grading_id=g.id where g.prompt_version is not null and g.model is not null and gp.ai_matched is not null and gp.teacher_matched is not null group by g.prompt_version,g.model),score_metrics as(
select prompt_version,model,round(100.0*avg((ai_score=teacher_score)::int),2)score_exact_pct,round(100.0*avg((abs(ai_score-teacher_score)<=1)::int),2)score_within_1_pct,round(avg(abs(ai_score-teacher_score)),2)mean_abs_error from gradings where prompt_version is not null and model is not null and ai_score is not null and teacher_score is not null group by prompt_version,model)
insert into grading_evaluations(prompt_version,model,sample_size,point_agreement_pct,score_exact_pct,score_within_1_pct,mean_abs_error,false_positive_pct,false_negative_pct)
select p.prompt_version,p.model,p.sample_size,p.point_agreement_pct,s.score_exact_pct,s.score_within_1_pct,s.mean_abs_error,p.false_positive_pct,p.false_negative_pct from point_metrics p left join score_metrics s using(prompt_version,model)
returning id,prompt_version,model,sample_size,point_agreement_pct,score_exact_pct,score_within_1_pct,mean_abs_error,false_positive_pct,false_negative_pct,computed_at`);return result.rows}
