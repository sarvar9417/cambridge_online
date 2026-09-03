import { execFile } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { Pool, PoolClient } from 'pg';
import { config } from '../config.js';
import { ClaudeIngestionClient } from '../lib/ai/claude.js';
import { SupabaseAssetStore, type AssetStore } from './asset-store.js';
import { materializeSourcePdf } from './source-paper-file.js';
import { segmentPreparedArtifact } from './processors/ingestion.js';
import { createQuestionExtractionV2Handler } from './processors/ai-extract-qp-v2.js';
import { cropAndStoreAssets, type StoredAssetRecord } from './processors/asset-crop-store.js';
import { validateAssetMetadata } from './processors/asset-metadata.js';
import type { ExtractedAsset, ExtractedQuestion } from './processors/ingestion-contract.js';

const run = promisify(execFile);
const RULE = 'source_visual_required_but_missing';
const REPAIR_VERSION = 'source-visual-repair-v1';

type Artifact = Record<string, unknown>;

type TargetLeaf = {
  id: string;
  path: string;
  displayRef: string;
  marks: number;
  status: string;
  notes: string;
};

type PaperTarget = {
  paperId: string;
  sourceUrl: string | null;
  storagePath: string | null;
  sha256: string;
  year: number;
  series: string;
  component: number;
  variant: number;
  sourceBackedCount: number;
  leaves: TargetLeaf[];
  chainPaths: Map<string, string>;
};

export type AuditResult = {
  questionId: string;
  displayRef: string;
  visualReady: boolean;
  marks: number;
  approvedMarkSchemeMarks: number | null;
  primarySubtopicCount: number;
  crossSyllabusPrimaryCount: number;
  learningObjectiveCount: number;
  crossSyllabusLoCount: number;
  otherUnresolvedErrors: number;
  sourceBackedManual: boolean;
  taxonomyReviewNote: boolean;
  auditPass: boolean;
  autoApprove: boolean;
};

export type RepairPaperReport = {
  paperId: string;
  source: string;
  targetCount: number;
  extractedQuestionCount: number;
  relevantNodeCount: number;
  cropCandidateCount: number;
  storedAssetCount: number;
  insertedAssetCount: number;
  repairedFindingCount: number;
  autoApprovedCount: number;
  stillNeedsReviewCount: number;
  missingVisualRefs: string[];
  audits: AuditResult[];
};

export type RepairRunReport = {
  version: string;
  apply: boolean;
  paperLimit: number | null;
  startedAt: string;
  finishedAt: string;
  selectedPapers: number;
  selectedTargets: number;
  papers: RepairPaperReport[];
};

export function sourceCropAssets(question: ExtractedQuestion): ExtractedQuestion {
  const assets = question.assets
    .filter((asset) => (asset.kind === 'diagram' || asset.kind === 'image') && asset.page && asset.bbox)
    .map((asset) => ({ ...asset, contentMd: null }));
  return { ...question, assets };
}

export function canAutoApproveAudit(input: Omit<AuditResult, 'auditPass' | 'autoApprove'>) {
  const auditPass = input.visualReady
    && input.marks > 0
    && input.approvedMarkSchemeMarks === input.marks
    && input.primarySubtopicCount === 1
    && input.crossSyllabusPrimaryCount === 0
    && input.learningObjectiveCount > 0
    && input.crossSyllabusLoCount === 0
    && input.otherUnresolvedErrors === 0;
  const autoApprove = auditPass && input.sourceBackedManual && !input.taxonomyReviewNote;
  return { auditPass, autoApprove };
}

export async function repairSourceVisuals(pool: Pool, options: {
  apply: boolean;
  paperLimit?: number | null;
  paperId?: string | null;
  ai?: ClaudeIngestionClient;
  assetStore?: AssetStore;
}): Promise<RepairRunReport> {
  const startedAt = new Date().toISOString();
  const papers = await loadTargets(pool, options.paperLimit ?? null, options.paperId ?? null);
  const selectedTargets = papers.reduce((sum, paper) => sum + paper.leaves.length, 0);

  if (!options.apply) {
    return {
      version: REPAIR_VERSION,
      apply: false,
      paperLimit: options.paperLimit ?? null,
      startedAt,
      finishedAt: new Date().toISOString(),
      selectedPapers: papers.length,
      selectedTargets,
      papers: papers.map((paper) => ({
        paperId: paper.paperId,
        source: `${paper.year}/${paper.series}/P${paper.component}/V${paper.variant}`,
        targetCount: paper.leaves.length,
        extractedQuestionCount: 0,
        relevantNodeCount: paper.chainPaths.size,
        cropCandidateCount: 0,
        storedAssetCount: 0,
        insertedAssetCount: 0,
        repairedFindingCount: 0,
        autoApprovedCount: 0,
        stillNeedsReviewCount: paper.leaves.length,
        missingVisualRefs: paper.leaves.map((leaf) => leaf.displayRef),
        audits: [],
      })),
    };
  }

  const ai = options.ai ?? createAi();
  const assetStore = options.assetStore ?? createAssetStore();
  await assetStore.checkReady();
  const extract = createQuestionExtractionV2Handler(pool, ai);
  const reports: RepairPaperReport[] = [];

  for (const paper of papers) {
    const prepared = await preparePaper(pool, paper);
    const extracted = await extract(paper.paperId, prepared) as Artifact;
    const allQuestions = Array.isArray(extracted.questions) ? extracted.questions as ExtractedQuestion[] : [];
    const relevant = allQuestions
      .filter((question) => paper.chainPaths.has(question.path))
      .map(sourceCropAssets);

    const cropInput = validateAssetMetadata({ ...extracted, questions: relevant });
    const cropped = await cropAndStoreAssets(cropInput, assetStore);
    const stored = Array.isArray(cropped.storedAssets) ? cropped.storedAssets as StoredAssetRecord[] : [];
    const cropCandidateCount = Array.isArray(cropped.assetCandidates) ? cropped.assetCandidates.length : 0;

    const persisted = await persistPaperRepair(pool, paper, relevant, stored);
    reports.push({
      paperId: paper.paperId,
      source: `${paper.year}/${paper.series}/P${paper.component}/V${paper.variant}`,
      targetCount: paper.leaves.length,
      extractedQuestionCount: allQuestions.length,
      relevantNodeCount: relevant.length,
      cropCandidateCount,
      storedAssetCount: stored.length,
      ...persisted,
    });
  }

  return {
    version: REPAIR_VERSION,
    apply: true,
    paperLimit: options.paperLimit ?? null,
    startedAt,
    finishedAt: new Date().toISOString(),
    selectedPapers: papers.length,
    selectedTargets,
    papers: reports,
  };
}

function createAi() {
  if (!config.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required for source visual repair');
  return new ClaudeIngestionClient({ apiKey: config.ANTHROPIC_API_KEY, model: config.ANTHROPIC_MODEL });
}

function createAssetStore() {
  if (!config.SUPABASE_URL || !config.SUPABASE_STORAGE_SECRET_KEY) {
    throw new Error('Supabase private asset storage configuration is required for source visual repair');
  }
  return new SupabaseAssetStore({
    url: config.SUPABASE_URL,
    secretKey: config.SUPABASE_STORAGE_SECRET_KEY,
    bucket: config.ASSET_STORAGE_BUCKET,
  });
}

async function loadTargets(pool: Pool, paperLimit: number | null, paperId: string | null) {
  const params: unknown[] = [];
  const paperFilter = paperId ? `and sp.id=$${params.push(paperId)}` : '';
  const result = await pool.query(
    `with target_leaves as (
       select q.id,q.path,q.display_ref,q.marks,q.status::text status,coalesce(q.notes,'') notes,
              sp.id paper_id,sp.storage_path,sp.source_url,sp.sha256,sp.year,sp.series::text series,
              c.number component,sp.variant
       from validation_findings vf
       join questions q on q.id=vf.ref_id and vf.ref_table='questions'
       join source_papers sp on sp.id=q.source_paper_id and sp.kind='QP'
       join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
       join components c on c.id=q.component_id
       where vf.rule_code='${RULE}' and vf.resolved_at is null ${paperFilter}
     ), ranked_papers as (
       select paper_id,
              max(year) year,max(series) series,max(component) component,max(variant) variant,
              max(storage_path) storage_path,max(source_url) source_url,max(sha256) sha256,
              count(*) filter(where notes ilike '%Source-backed manual extraction%')::int source_backed_count
       from target_leaves group by paper_id
       order by count(*) filter(where notes ilike '%Source-backed manual extraction%') desc,
                max(year) desc,max(series),max(component),max(variant)
     )
     select * from ranked_papers`,
    params,
  );
  const selectedRows = paperLimit && paperLimit > 0 ? result.rows.slice(0, paperLimit) : result.rows;
  const papers: PaperTarget[] = [];
  for (const row of selectedRows) {
    const leafRows = await pool.query(
      `with recursive leaves as (
         select q.id,q.parent_id,q.path,q.display_ref,q.marks,q.status::text status,coalesce(q.notes,'') notes
         from validation_findings vf join questions q on q.id=vf.ref_id
         where vf.ref_table='questions' and vf.rule_code=$1 and vf.resolved_at is null and q.source_paper_id=$2
       ), chain as (
         select l.id leaf_id,l.id node_id,l.parent_id,l.path from leaves l
         union all
         select c.leaf_id,p.id,p.parent_id,p.path from chain c join questions p on p.id=c.parent_id
       )
       select l.id,l.path,l.display_ref,l.marks,l.status,l.notes,
              coalesce(jsonb_agg(distinct jsonb_build_object('path',c.path,'id',c.node_id)) filter(where c.node_id is not null),'[]'::jsonb) chain_nodes
       from leaves l left join chain c on c.leaf_id=l.id
       group by l.id,l.path,l.display_ref,l.marks,l.status,l.notes order by l.display_ref`,
      [RULE, row.paper_id],
    );
    const chainPaths = new Map<string, string>();
    const leaves: TargetLeaf[] = leafRows.rows.map((leaf) => {
      for (const node of leaf.chain_nodes as Array<{ path: string; id: string }>) chainPaths.set(node.path, node.id);
      return {
        id: String(leaf.id), path: String(leaf.path), displayRef: String(leaf.display_ref),
        marks: Number(leaf.marks), status: String(leaf.status), notes: String(leaf.notes ?? ''),
      };
    });
    papers.push({
      paperId: String(row.paper_id), storagePath: row.storage_path ? String(row.storage_path) : null,
      sourceUrl: row.source_url ? String(row.source_url) : null, sha256: String(row.sha256),
      year: Number(row.year), series: String(row.series), component: Number(row.component), variant: Number(row.variant),
      sourceBackedCount: Number(row.source_backed_count), leaves, chainPaths,
    });
  }
  return papers;
}

async function preparePaper(pool: Pool, paper: PaperTarget): Promise<Artifact> {
  if (!config.PDFTOPPM_PATH || !config.PDFTOTEXT_PATH) throw new Error('Poppler paths are required for source visual repair');
  const baseDir = resolve(config.EXPORT_DIR, '..', 'source-visual-repair', paper.paperId);
  const materialized = await materializeSourcePdf({
    storagePath: paper.storagePath,
    sourceUrl: paper.sourceUrl,
    sha256: paper.sha256,
  }, join(baseDir, 'source'));
  const outputDir = join(baseDir, 'prepared');
  await mkdir(outputDir, { recursive: true });
  const prefix = join(outputDir, 'page');
  const textPath = join(outputDir, 'pages.txt');
  await run(config.PDFTOPPM_PATH, ['-png', '-r', '200', materialized.sourcePath, prefix], { maxBuffer: 10 * 1024 * 1024 });
  await run(config.PDFTOTEXT_PATH, ['-layout', materialized.sourcePath, textPath], { maxBuffer: 10 * 1024 * 1024 });
  const pageImages = (await readdir(outputDir))
    .filter((name) => /^page-\d+\.png$/.test(name))
    .sort((a, b) => pageNumber(a) - pageNumber(b))
    .map((name) => join(outputDir, name));
  if (!pageImages.length) throw new Error(`source_visual_repair_no_pages:${paper.paperId}`);
  await pool.query(`update source_papers set page_count=$2 where id=$1`, [paper.paperId, pageImages.length]);
  return segmentPreparedArtifact({
    paperId: paper.paperId, sourcePath: materialized.sourcePath, sourceMode: materialized.mode,
    outputDir, textPath, pageImages, pageCount: pageImages.length,
  });
}

async function persistPaperRepair(pool: Pool, paper: PaperTarget, questions: ExtractedQuestion[], stored: StoredAssetRecord[]) {
  const extractedByPath = new Map(questions.map((question) => [question.path, question]));
  const client = await pool.connect();
  try {
    await client.query('begin');
    let insertedAssetCount = 0;
    for (const storedAsset of stored) {
      const questionId = paper.chainPaths.get(storedAsset.questionPath);
      const extracted = extractedByPath.get(storedAsset.questionPath);
      const asset = extracted?.assets[storedAsset.assetIndex];
      if (!questionId || !asset || (asset.kind !== 'diagram' && asset.kind !== 'image')) continue;
      insertedAssetCount += await insertStoredAsset(client, questionId, asset, storedAsset);
    }

    const audits: AuditResult[] = [];
    let repairedFindingCount = 0;
    let autoApprovedCount = 0;
    const missingVisualRefs: string[] = [];
    for (const leaf of paper.leaves) {
      const audit = await auditLeaf(client, leaf.id);
      audits.push(audit);
      if (!audit.visualReady) {
        missingVisualRefs.push(leaf.displayRef);
        continue;
      }
      const resolved = await client.query(
        `update validation_findings set resolved_at=now(),resolution=$3
         where ref_table='questions' and ref_id=$1 and rule_code=$2 and resolved_at is null returning id`,
        [leaf.id, RULE, `${REPAIR_VERSION}: original QP crop stored; topic/LO/marks audit=${audit.auditPass ? 'pass' : 'review'}`],
      );
      repairedFindingCount += resolved.rowCount ?? 0;
      const note = `${REPAIR_VERSION}: original QP visual restored from source page crop; visual finding resolved.${audit.auditPass ? ' Taxonomy/LO/marks audit passed.' : ' Remaining content audit requires review.'}`;
      await client.query(
        `update questions set notes=case when coalesce(notes,'') like '%'||$2||'%' then notes else concat_ws(E'\n',nullif(notes,''),$2) end,
                              updated_at=now()
         where id=$1`,
        [leaf.id, note],
      );
      if (audit.autoApprove) {
        const approved = await client.query(
          `update questions set status='approved',updated_at=now() where id=$1 and status='needs_review' returning id`,
          [leaf.id],
        );
        autoApprovedCount += approved.rowCount ?? 0;
      }
    }
    await client.query('commit');
    return {
      insertedAssetCount,
      repairedFindingCount,
      autoApprovedCount,
      stillNeedsReviewCount: paper.leaves.length - autoApprovedCount,
      missingVisualRefs,
      audits,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function insertStoredAsset(client: PoolClient, questionId: string, asset: ExtractedAsset, stored: StoredAssetRecord) {
  const result = await client.query(
    `insert into question_assets(
       question_id,kind,storage_path,content_md,alt_text,sort_order,source_page,source_bbox,
       crop_status,crop_error,size_bytes,content_hash
     )
     select $1,$2,$3,null,$4,$5,$6,$7::jsonb,'ready',null,$8,$9
     where not exists(
       select 1 from question_assets qa where qa.question_id=$1 and qa.content_hash=$9 and qa.kind=$2
     ) returning id`,
    [questionId, asset.kind, stored.storagePath, asset.altText, stored.assetIndex,
      stored.sourcePage, JSON.stringify(stored.bbox), stored.sizeBytes, stored.contentHash],
  );
  return result.rowCount ?? 0;
}

async function auditLeaf(client: PoolClient, questionId: string): Promise<AuditResult> {
  const result = await client.query(
    `with recursive chain as (
       select q.id node_id,q.parent_id from questions q where q.id=$1
       union all select p.id,p.parent_id from chain c join questions p on p.id=c.parent_id
     ), visual as (
       select exists(
         select 1 from chain c join question_assets qa on qa.question_id=c.node_id
         where qa.kind in ('diagram','image') and (
           nullif(qa.content_md,'') is not null or nullif(qa.storage_path,'') is not null or nullif(qa.svg_markup,'') is not null
         )
       ) ready
     )
     select q.id,q.display_ref,q.marks,coalesce(q.notes,'') notes,visual.ready visual_ready,
       (select ms.max_marks from mark_schemes ms where ms.question_id=q.id and ms.status='approved' limit 1) approved_ms_marks,
       (select count(*)::int from question_subtopics qs where qs.question_id=q.id and qs.is_primary) primary_count,
       (select count(*)::int from question_subtopics qs join subtopics st on st.id=qs.subtopic_id join topics t on t.id=st.topic_id
          where qs.question_id=q.id and qs.is_primary and t.syllabus_id<>sp.syllabus_id) cross_primary,
       (select count(*)::int from question_learning_objectives qlo where qlo.question_id=q.id) lo_count,
       (select count(*)::int from question_learning_objectives qlo join learning_objectives lo on lo.id=qlo.lo_id
          join subtopics st on st.id=lo.subtopic_id join topics t on t.id=st.topic_id
          where qlo.question_id=q.id and t.syllabus_id<>sp.syllabus_id) cross_lo,
       (select count(*)::int from validation_findings vf where vf.ref_table='questions' and vf.ref_id=q.id
          and vf.resolved_at is null and vf.severity='error' and vf.rule_code<>$2) other_errors
     from questions q join source_papers sp on sp.id=q.source_paper_id cross join visual where q.id=$1`,
    [questionId, RULE],
  );
  if (!result.rowCount) throw new Error(`source_visual_repair_question_missing:${questionId}`);
  const row = result.rows[0];
  const base = {
    questionId: String(row.id), displayRef: String(row.display_ref), visualReady: Boolean(row.visual_ready),
    marks: Number(row.marks), approvedMarkSchemeMarks: row.approved_ms_marks === null ? null : Number(row.approved_ms_marks),
    primarySubtopicCount: Number(row.primary_count), crossSyllabusPrimaryCount: Number(row.cross_primary),
    learningObjectiveCount: Number(row.lo_count), crossSyllabusLoCount: Number(row.cross_lo),
    otherUnresolvedErrors: Number(row.other_errors),
    sourceBackedManual: String(row.notes).includes('Source-backed manual extraction'),
    taxonomyReviewNote: String(row.notes).includes('taxonomy-review:'),
  };
  return { ...base, ...canAutoApproveAudit(base) };
}

function pageNumber(name: string) {
  return Number(name.match(/(\d+)/)?.[1] ?? 0);
}
