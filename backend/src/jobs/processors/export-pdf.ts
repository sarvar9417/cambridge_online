import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import type { Pool } from 'pg';
import { config } from '../../config.js';
import { toAssignmentExportQuestion } from '../../lib/assignment-export.js';
import { assertPaperTotal, renderPaperHtml, type ExportQuestion } from '../../lib/export-html.js';
import type { Job } from '../job-queue.js';

export function createExportPdfProcessor(pool: Pool) {
  return async (job: Job) => {
    const exportId = String((job.payload as {exportId?:unknown}).exportId);
    const exportResult = await pool.query(
      `select e.*,coalesce(s.name,'CamPath') school_name from exports e
       join users u on u.id=e.requested_by left join schools s on s.id=u.school_id where e.id=$1`,
      [exportId],
    );
    if (!exportResult.rowCount) throw Error('export_not_found');
    const exp = exportResult.rows[0];
    let title = '';
    let questions: ExportQuestion[] = [];

    if (exp.ref_table === 'assignments') {
      const result = await pool.query(
        `with items as (
           select a.id assignment_id,a.title,a.total_marks,aq.question_id,aq.sort_order,
             aq.role::text role,aq.fresh_ref,aq.source_ref,coalesce(aq.marks_override,q.marks) marks,
             aq.portable_snapshot,q.display_ref,q.stem_md,q.context_md
           from assignments a
           join assignment_questions aq on aq.assignment_id=a.id
           join questions q on q.id=aq.question_id
           where a.id=$1
           union all
           select a.id assignment_id,a.title,a.total_marks,aci.question_id,aci.sort_order,
             'context_only'::text role,aci.fresh_ref,aci.source_ref,0 marks,
             aci.portable_snapshot,q.display_ref,q.stem_md,q.context_md
           from assignments a
           join assignment_context_items aci on aci.assignment_id=a.id
           join questions q on q.id=aci.question_id
           where a.id=$1
         )
         select i.*,
           coalesce(mp.points,'[]'::json) points
         from items i
         left join lateral (
           select json_agg(json_build_object('code',msp.code,'text',msp.text,'marks',msp.marks) order by msp.sort_order) points
           from mark_schemes ms
           join mark_scheme_points msp on msp.mark_scheme_id=ms.id
           where ms.question_id=i.question_id and ms.status='approved' and i.role='graded'
         ) mp on true
         order by i.sort_order,i.question_id`,
        [exp.ref_id],
      );
      title = result.rows[0]?.title ?? 'CamPath Paper';
      questions = result.rows.map(toAssignmentExportQuestion);
      assertPaperTotal(questions,Number(result.rows[0]?.total_marks??0));
    } else {
      const result = await pool.query(
        `select a.title,q.display_ref,q.stem_md,q.marks,ans.text,
         coalesce(json_agg(json_build_object('code',msp.code,'text',msp.text,'marks',gp.awarded_marks)order by msp.sort_order)filter(where gp.id is not null),'[]') points
         from submissions s join assignments a on a.id=s.assignment_id join answers ans on ans.submission_id=s.id
         join questions q on q.id=ans.question_id join gradings g on g.answer_id=ans.id
         left join grading_points gp on gp.grading_id=g.id left join mark_scheme_points msp on msp.id=gp.mark_scheme_point_id
         where s.id=$1 and s.released_at is not null group by a.id,q.id,ans.id order by q.sort_order`,
        [exp.ref_id],
      );
      title = `${result.rows[0]?.title ?? 'Result'} Feedback`;
      questions = result.rows.map((row) => ({ displayRef:row.display_ref,stem:`${row.stem_md}\n\nStudent answer: ${row.text}`,marks:row.marks,points:row.points }));
    }

    let executable=config.CHROME_EXECUTABLE_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',launchArgs=['--no-sandbox'];
    if(process.env.VERCEL){const chromium=(await import('@sparticuz/chromium-min')).default;executable=await chromium.executablePath(config.CHROMIUM_PACK_URL??'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar');launchArgs=chromium.args}
    await pool.query(`update exports set status='running',error=null where id=$1`, [exportId]);
    try {
      const browser = await puppeteer.launch({ executablePath:executable,headless:true,args:launchArgs });
      try {
        const page = await browser.newPage();
        const watermark = `${exp.school_name} · ${new Date().toISOString().slice(0,10)} · Ichki foydalanish uchun`;
        await page.setContent(renderPaperHtml(title, questions, exp.kind !== 'question_paper', watermark), { waitUntil:'load' });
        const pdf = await page.pdf({ format:'A4',printBackground:true });
        const dir = process.env.VERCEL?'/tmp/campath-exports':resolve(config.EXPORT_DIR);
        await mkdir(dir, { recursive:true });
        const path = resolve(dir, `${exportId}.pdf`);
        await writeFile(path, pdf);
        await pool.query(`update exports set status='succeeded',storage_path=$2,file_data=$3,expires_at=now()+interval '24 hours',finished_at=now()where id=$1`, [exportId, path,pdf]);
        return { path, size:pdf.length };
      } finally {
        await browser.close();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'PDF export failed';
      await pool.query(`update exports set status='failed',error=$2,finished_at=now()where id=$1`, [exportId, message]);
      throw error;
    }
  };
}
