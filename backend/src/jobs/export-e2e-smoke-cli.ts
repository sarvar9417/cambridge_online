import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import puppeteer from 'puppeteer-core';
import { config } from '../config.js';
import { pool } from '../database/client.js';
import { materializeExportAssets } from '../lib/export-assets.js';
import { buildDocx } from '../lib/export-docx.js';
import { assertPaperTotal, renderPaperHtml, type ExportMode, type ExportQuestion } from '../lib/export-html.js';
import type { Actor } from '../lib/actor.js';
import { PgStaffAwareQuestionsRepository } from '../repositories/staff-aware-questions-repository.js';
import { buildSelectionReview, type SelectionItemPortable } from '../services/selection-review.js';
import { SupabaseAssetStore } from './asset-store.js';

const execFileAsync = promisify(execFile);
const outputDir = resolve('tmp/export-e2e');

const actor: Actor = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'owner',
  schoolId: null,
  fullName: 'Export E2E Smoke',
};

const representativeCases = [
  { slug: 'p1-text', title: 'P1 text', refs: ['9618/11/M/J/26 Q2(a)'] },
  { slug: 'p1-diagram', title: 'P1 diagram', refs: ['9618/11/M/J/26 Q6(a)'], requireVisual: true },
  { slug: 'p2-trace', title: 'P2 trace table', refs: ['9618/21/M/J/26 Q8(a)'], requireVisual: true },
  {
    slug: 'p3-answer-dependency',
    title: 'P3 answer dependency',
    refs: ['9618/31/M/J/25 Q5(b)(ii)', '9618/31/M/J/25 Q5(b)(iii)'],
  },
  { slug: 'p4-practical', title: 'P4 practical programming', refs: ['9618/41/M/J/26 Q3(a)(i)'], requireVisual: true },
  {
    slug: 'multi-part-family',
    title: 'Multi-part family',
    refs: ['9618/11/M/J/26 Q1(a)(i)', '9618/11/M/J/26 Q1(a)(ii)'],
  },
] as const;

type SmokeCase = {
  slug: string;
  title: string;
  refs: string[];
  requireVisual?: boolean;
};

type SchemeRow = {
  question_id: string;
  scheme_status: string;
  scheme_guidance: string | null;
  points: ExportQuestion['points'];
};

function assertClean(value: string, label: string) {
  const forbidden = [
    'papacambridge',
    'trace id: pc-',
    're-uploading, mirroring or re-hosting',
    'licensed for hosting on papacambridge.com only',
    'downloaded from papacambridge',
  ];
  const lower = value.toLowerCase();
  const hit = forbidden.find((item) => lower.includes(item));
  if (hit) throw new Error(`source_host_contamination:${label}:${hit}`);
}

async function selectionFromRefs(
  repo: PgStaffAwareQuestionsRepository,
  refs: readonly string[],
) {
  const found = await pool!.query<{ id: string; display_ref: string }>(
    `select q.id,q.display_ref
     from questions q
     join source_papers sp on sp.id=q.source_paper_id
     where q.display_ref=any($1::text[])
       and q.marks is not null
       and q.status='approved'
       and sp.kind='QP'
     order by array_position($1::text[],q.display_ref)`,
    [refs],
  );
  if (found.rows.length !== refs.length) {
    const foundRefs = new Set(found.rows.map((row) => row.display_ref));
    const missing = refs.filter((ref) => !foundRefs.has(ref));
    throw new Error(`e2e_case_question_missing:${missing.join(',')}`);
  }

  const items: SelectionItemPortable[] = [];
  for (const [index, row] of found.rows.entries()) {
    const portable = await repo.portable(actor, row.id);
    if (!portable) throw new Error(`portable_question_missing:${row.display_ref}`);
    items.push({
      id: row.id,
      role: 'graded',
      sortOrder: index + 1,
      sourceRef: row.display_ref,
      portable,
    });
  }
  const review = buildSelectionReview(items);
  if (!review.canPublish) {
    throw new Error(
      `selection_dependency_gate:${review.dependencyIssues.map((issue) => issue.code).join(',')}`,
    );
  }
  return review;
}

async function longWorksheetSelection(repo: PgStaffAwareQuestionsRepository) {
  const result = await pool!.query<{ id: string; display_ref: string }>(
    `select q.id,q.display_ref
     from questions q
     join source_papers sp on sp.id=q.source_paper_id
     join components c on c.id=q.component_id
     where q.status='approved'
       and q.marks is not null
       and sp.kind='QP'
       and q.display_ref like '9618/%'
       and sp.year between 2024 and 2026
       and c.number in (1,2,3)
       and not exists(select 1 from question_dependencies qd where qd.question_id=q.id)
     order by sp.year desc,c.number,sp.series,sp.variant,q.sort_order,q.id
     limit 24`,
  );
  if (result.rows.length < 20) throw new Error(`long_worksheet_pool_too_small:${result.rows.length}`);

  const items: SelectionItemPortable[] = [];
  for (const [index, row] of result.rows.entries()) {
    const portable = await repo.portable(actor, row.id);
    if (!portable) throw new Error(`portable_question_missing:${row.display_ref}`);
    items.push({
      id: row.id,
      role: 'graded',
      sortOrder: index + 1,
      sourceRef: row.display_ref,
      portable,
    });
  }
  const review = buildSelectionReview(items);
  if (!review.canPublish) throw new Error('long_worksheet_dependency_gate');
  return review;
}

async function exportQuestions(review: ReturnType<typeof buildSelectionReview>) {
  const questionIds = review.items
    .filter((item) => item.role === 'graded')
    .map((item) => item.portable.leaf.id);
  const schemes = await pool!.query<SchemeRow>(
    `select ms.question_id,ms.status::text scheme_status,ms.guidance_md scheme_guidance,
       coalesce(json_agg(json_build_object(
         'code',msp.code,
         'text',msp.text,
         'marks',msp.marks,
         'accept',msp.accept,
         'reject',msp.reject,
         'requires',msp.requires,
         'groupLabel',msg.label,
         'groupNRequired',msg.n_required,
         'groupMaxMarks',msg.max_marks,
         'groupAwardMode',msg.award_mode,
         'groupSortOrder',msg.sort_order
       ) order by coalesce(msg.sort_order,2147483647),msp.sort_order,msp.id)
       filter(where msp.id is not null),'[]'::json) points
     from canonical_mark_schemes ms
     left join mark_scheme_points msp on msp.mark_scheme_id=ms.id
     left join mark_scheme_groups msg on msg.id=msp.group_id
     where ms.question_id=any($1::uuid[]) and ms.status='approved'
     group by ms.id,ms.question_id,ms.status,ms.guidance_md`,
    [questionIds],
  );
  const byQuestion = new Map(schemes.rows.map((row) => [row.question_id, row] as const));
  const missingSchemes = questionIds.filter((id) => !byQuestion.has(id));
  if (missingSchemes.length) throw new Error(`canonical_mark_scheme_missing:${missingSchemes.join(',')}`);

  const questions: ExportQuestion[] = review.items.map((item) => {
    const scheme = byQuestion.get(item.portable.leaf.id);
    return {
      displayRef: item.freshRef,
      sourceRef: item.sourceRef,
      stem: item.portable.leaf.stem,
      contentJson: item.portable.leaf.contentJson ?? null,
      contextBlocks: item.portable.contextBlocks,
      marks: item.effectiveMarks,
      answerLines: item.portable.leaf.answerLines,
      role: item.role,
      schemeStatus: scheme?.scheme_status,
      schemeGuidance: scheme?.scheme_guidance ?? null,
      points: scheme?.points ?? [],
    };
  });
  assertPaperTotal(questions, review.totalMarks);
  return questions;
}

async function renderPdf(html: string, path: string) {
  if (!config.CHROME_EXECUTABLE_PATH) throw new Error('chrome_executable_required');
  const browser = await puppeteer.launch({
    executablePath: config.CHROME_EXECUTABLE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    if (pdf.byteLength < 5000) throw new Error(`generated_pdf_too_small:${pdf.byteLength}`);
    await writeFile(path, pdf);
  } finally {
    await browser.close();
  }
}

async function validatePdf(path: string, expectedTotal: number) {
  const { stdout: info } = await execFileAsync('pdfinfo', [path]);
  const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
  if (!Number.isInteger(pages) || pages < 1) throw new Error(`pdf_page_count_invalid:${path}`);
  const textPath = `${path}.txt`;
  await execFileAsync(config.PDFTOTEXT_PATH, [path, textPath]);
  const text = await readFile(textPath, 'utf8');
  assertClean(text, path);
  if (!text.includes('Cambridge International Computer Science')) {
    throw new Error(`pdf_header_missing:${path}`);
  }
  if (!text.includes(`Total: ${expectedTotal}`)) {
    throw new Error(`pdf_total_missing:${path}:${expectedTotal}`);
  }
  return {pages,text};
}

async function runCase(
  smokeCase: SmokeCase,
  review: ReturnType<typeof buildSelectionReview>,
  assetStore: SupabaseAssetStore,
  modes: ExportMode[],
  includeDocx = false,
) {
  const originalQuestions = await exportQuestions(review);
  const questions = await materializeExportAssets(originalQuestions, assetStore);
  const results: Array<Record<string, unknown>> = [];

  for (const mode of modes) {
    const title = `9618 export E2E — ${smokeCase.title}`;
    const html = renderPaperHtml(title, questions, mode, 'CamPath E2E smoke');
    assertClean(html, `${smokeCase.slug}:${mode}`);
    if (smokeCase.requireVisual && !html.includes('asset-image') && !html.includes('<table')) {
      throw new Error(`expected_visual_missing:${smokeCase.slug}:${mode}`);
    }
    if(mode==='mark_scheme'){
      if(!html.includes('<h2>Mark Scheme</h2>'))throw new Error(`mark_scheme_heading_missing:${smokeCase.slug}`);
      if(html.includes('<span>Name:</span>'))throw new Error(`mark_scheme_candidate_fields_present:${smokeCase.slug}`);
      for(const question of questions.filter(item=>item.role!=='context_only')){
        if(!(question.points?.length))throw new Error(`mark_scheme_points_missing:${question.sourceRef??question.displayRef}`);
        if(!html.includes(`Source: ${question.sourceRef}`))throw new Error(`mark_scheme_source_ref_missing:${question.sourceRef}`);
      }
    }
    const htmlPath = resolve(outputDir, `${smokeCase.slug}-${mode}.html`);
    const pdfPath = resolve(outputDir, `${smokeCase.slug}-${mode}.pdf`);
    await writeFile(htmlPath, html, 'utf8');
    await renderPdf(html, pdfPath);
    const validation = await validatePdf(pdfPath, review.totalMarks);
    if(mode==='mark_scheme'&&!validation.text.includes('Mark Scheme'))throw new Error(`mark_scheme_pdf_heading_missing:${smokeCase.slug}`);
    results.push({ mode, pages:validation.pages, totalMarks: review.totalMarks, questions: review.items.length });
  }

  if (includeDocx) {
    const docx = buildDocx(`9618 export E2E — ${smokeCase.title}`, questions, 'combined');
    if (docx.byteLength < 1000 || docx[0] !== 0x50 || docx[1] !== 0x4b) {
      throw new Error(`generated_docx_invalid:${smokeCase.slug}`);
    }
    await writeFile(resolve(outputDir, `${smokeCase.slug}-combined.docx`), docx);
  }

  return {
    slug: smokeCase.slug,
    refs: review.items.map((item) => item.sourceRef),
    totalMarks: review.totalMarks,
    modes: results,
  };
}

async function main() {
  if (!pool) throw new Error('database_url_required');
  if (!config.SUPABASE_URL || !config.SUPABASE_STORAGE_SECRET_KEY) {
    throw new Error('supabase_storage_credentials_required');
  }
  const assetStore = new SupabaseAssetStore({
    url: config.SUPABASE_URL,
    secretKey: config.SUPABASE_STORAGE_SECRET_KEY,
    bucket: config.ASSET_STORAGE_BUCKET,
  });
  await assetStore.checkReady();
  await mkdir(outputDir, { recursive: true });

  const repo = new PgStaffAwareQuestionsRepository(pool, assetStore);
  const report: Array<Record<string, unknown>> = [];
  for (const smokeCase of representativeCases) {
    const review = await selectionFromRefs(repo, smokeCase.refs);
    report.push(await runCase(smokeCase, review, assetStore, ['question_paper', 'combined']));
  }

  const markSchemeReview = await selectionFromRefs(repo, ['9618/21/M/J/26 Q8(a)']);
  report.push(await runCase(
    { slug: 'mark-scheme-only', title: 'Mark scheme only', refs: ['9618/21/M/J/26 Q8(a)'], requireVisual: true },
    markSchemeReview,
    assetStore,
    ['mark_scheme'],
    true,
  ));

  const longReview = await longWorksheetSelection(repo);
  report.push(await runCase(
    { slug: 'long-worksheet', title: '24-question worksheet', refs: longReview.items.map((item) => item.sourceRef) },
    longReview,
    assetStore,
    ['question_paper'],
    true,
  ));

  const summary = {
    generatedAt: new Date().toISOString(),
    corpus: '9618',
    cases: report,
  };
  await writeFile(resolve(outputDir, 'report.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  await pool.end();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  if (pool) await pool.end().catch(() => undefined);
  process.exitCode = 1;
});
