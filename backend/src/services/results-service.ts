import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { parseStructuredQuestionContent, type StructuredQuestionContent } from '../lib/structured-question-content.js';
import { DomainError } from './assignments-service.js';

interface AssetUrlSigner { signStoragePath(storagePath:string,expiresInSeconds?:number):Promise<string|null> }

function resultContent(row:{content_json?:unknown|null;content_version?:number|null;id:string}) {
  if(row.content_json==null)return null;
  if(Number(row.content_version)!==1)throw new Error(`Unsupported structured content version for question ${row.id}`);
  return parseStructuredQuestionContent(row.content_json);
}

function assetIds(content:StructuredQuestionContent|null) {
  return content?[...new Set(content.blocks.flatMap((block)=>block.type==='asset'?[block.assetId]:[]))]:[];
}

export class ResultsService {
  constructor(private readonly pool: Pool,private readonly assetUrlSigner?:AssetUrlSigner) {}

  async list(actor: Actor) {
    const result = await this.pool.query(
      `select s.id, a.title, c.name as class_name, u.full_name as student_name,
              s.total_score, s.total_max, s.percentage, s.grade, s.released_at
       from submissions s
       join assignments a on a.id = s.assignment_id
       join classes c on c.id = a.class_id
       join users u on u.id = s.student_id
       where s.released_at is not null and (
         ($1 = 'student' and s.student_id = $2) or
         ($1 = 'owner' and c.school_id = $3) or
         ($1 = 'teacher' and (c.owner_id = $2 or exists (
           select 1 from class_teachers ct where ct.class_id = c.id and ct.teacher_id = $2
         )))
       ) order by s.released_at desc`,
      [actor.role, actor.id, actor.schoolId],
    );
    return result.rows.map((row) => ({
      id: row.id, title: row.title, className: row.class_name, studentName: row.student_name,
      totalScore: Number(row.total_score), totalMax: Number(row.total_max),
      percentage: Number(row.percentage), grade: row.grade, releasedAt: row.released_at,
    }));
  }

  async detail(actor: Actor, submissionId: string) {
    const result = await this.pool.query(
      `select q.id, g.id as grading_id, ga.status as appeal_status, q.display_ref, q.stem_md, q.content_json, q.content_version,
              q.marks, ans.text, g.final_score, g.teacher_feedback_md,
              coalesce(json_agg(json_build_object('code', msp.code, 'text', msp.text, 'matched', gp.final_matched,
                'marks', gp.awarded_marks) order by msp.sort_order) filter (where gp.id is not null), '[]') points
       from submissions s
       join assignments a on a.id = s.assignment_id join classes c on c.id = a.class_id
       join answers ans on ans.submission_id = s.id join questions q on q.id = ans.question_id
       join gradings g on g.answer_id = ans.id
       left join grading_appeals ga on ga.grading_id = g.id
       left join grading_points gp on gp.grading_id = g.id
       left join mark_scheme_points msp on msp.id = gp.mark_scheme_point_id
       where s.id = $1 and s.released_at is not null and (
         ($2 = 'student' and s.student_id = $3) or ($2 = 'owner' and c.school_id = $4) or
         ($2 = 'teacher' and (c.owner_id = $3 or exists (select 1 from class_teachers ct where ct.class_id = c.id and ct.teacher_id = $3)))
       ) group by q.id, ans.id, g.id, ga.status order by q.sort_order`,
      [submissionId, actor.role, actor.id, actor.schoolId],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);

    const contentByQuestion=new Map<string,StructuredQuestionContent|null>();
    const referencedAssets=new Set<string>();
    for(const row of result.rows){
      const content=resultContent(row);
      contentByQuestion.set(row.id,content);
      for(const id of assetIds(content))referencedAssets.add(id);
    }
    const signedAssetUrls:Record<string,string>={};
    if(referencedAssets.size&&this.assetUrlSigner){
      const assets=await this.pool.query(`select id,storage_path from question_assets where id=any($1::uuid[])`,[[...referencedAssets]]);
      await Promise.all(assets.rows.map(async(row)=>{
        if(!row.storage_path)return;
        const url=await this.assetUrlSigner!.signStoragePath(row.storage_path,300);
        if(url)signedAssetUrls[row.id]=url;
      }));
    }

    return result.rows.map((row) => {
      const content=contentByQuestion.get(row.id)??null;
      const rowAssetUrls=Object.fromEntries(
        assetIds(content)
          .filter((id)=>Boolean(signedAssetUrls[id]))
          .map((id)=>[id,signedAssetUrls[id]!] as const),
      );
      return {
        gradingId: row.grading_id, appealStatus: row.appeal_status, displayRef: row.display_ref, stemMd: row.stem_md, marks: row.marks, answerText: row.text,
        finalScore: Number(row.final_score), feedback: row.teacher_feedback_md, points: row.points,
        contentJson:content,contentVersion:content?1:null,assetUrls:rowAssetUrls,
      };
    });
  }
}
