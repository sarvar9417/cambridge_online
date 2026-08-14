import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import type { Pool } from 'pg';
import { config } from '../../config.js';
import { renderPaperHtml, type ExportQuestion } from '../../lib/export-html.js';
import type { Job } from '../job-queue.js';

export function createExportPdfProcessor(pool: Pool) {
  return async (job: Job) => {
    const exportId = String((job.payload as { exportId?: unknown }).exportId);
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
        `select a.title,q.display_ref,q.stem_md,q.context_md,q.marks,
         coalesce(json_agg(json_build_object('code',msp.code,'text',msp.text,'marks',msp.marks)order by msp.sort_order)filter(where msp.id is not null),'[]') points
         from assignments a join assignment_questions aq on aq.assignment_id=a.id join questions q on q.id=aq.question_id
         left join mark_schemes ms on ms.question_id=q.id left join mark_scheme_points msp on msp.mark_scheme_id=ms.id
         where a.id=$1 group by a.id,q.id,aq.sort_order order by aq.sort_order`,
        [exp.ref_id],
      );
      title = result.rows[0]?.title ?? 'CamPath Paper';
      questions = result.rows.map((row) => ({
        displayRef: row.display_ref,
        stem: row.stem_md,
        context: row.context_md,
        marks: row.marks,
        points: row.points,
      }));
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
      questions = result.rows.map((row) => ({
        displayRef: row.display_ref,
        stem: `${row.stem_md}\n\nStudent answer: ${row.text}`,
        marks: row.marks,
        points: row.points,
      }));
    }

    const executable =
      config.CHROME_EXECUTABLE_PATH ??
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    await pool.query(`update exports set status='running',error=null where id=$1`, [exportId]);
    try {
      const browser = await puppeteer.launch({
        executablePath: executable,
        headless: true,
        args: ['--no-sandbox'],
      });
      try {
        const page = await browser.newPage();
        const watermark = `${exp.school_name} · ${new Date().toISOString().slice(0, 10)} · Ichki foydalanish uchun`;
        await page.setContent(
          renderPaperHtml(title, questions, exp.kind !== 'question_paper', watermark),
          { waitUntil: 'load' },
        );
        const pdf = await page.pdf({ format: 'A4', printBackground: true });
        const dir = resolve(config.EXPORT_DIR);
        await mkdir(dir, { recursive: true });
        const path = resolve(dir, `${exportId}.pdf`);
        await writeFile(path, pdf);
        await pool.query(
          `update exports set status='succeeded',storage_path=$2,expires_at=now()+interval '24 hours',finished_at=now()where id=$1`,
          [exportId, path],
        );
        return { path, size: pdf.length };
      } finally {
        await browser.close();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'PDF export failed';
      await pool.query(`update exports set status='failed',error=$2,finished_at=now()where id=$1`, [
        exportId,
        message,
      ]);
      throw error;
    }
  };
}
