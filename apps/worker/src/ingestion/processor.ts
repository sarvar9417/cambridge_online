import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import type { Job } from 'bullmq';
import type { Database } from '@campath/db';
import { schema } from '@campath/db';
import { validateExtraction, type ValidationContext } from '@campath/shared';
import type { AiUsage } from '@campath/ai';
import { preparePdf, planBatches, type PreparedPage } from './prepare.js';
import {
  checkPageTotals,
  dedupeQuestions,
  dependencyCandidates,
  flaggedRate,
  matchSchemes,
  selectForCrossCheck,
  worthClassifying,
} from './pipeline.js';
import { persistPaper } from './persist.js';
import { StageStore } from './stage-store.js';
import type { Extractor } from './extractor.js';
import type {
  Classification,
  CrossCheckVerdict,
  DetectedDependency,
  ExtractQpBatch,
  ExtractedQuestion,
  ExtractedScheme,
  StagePayload,
} from './types.js';

export interface IngestionDeps {
  db: Database;
  extractor: Extractor;
  /** Resolves a `source_papers.storage_path` to a local file. */
  fetchPdf: (storagePath: string) => Promise<string>;
  sampler?: () => number;
}

/**
 * One processor for all twelve stages.
 *
 * BullMQ names the job after the stage, so a single consumer keeps the chain in
 * one file where the data flow between stages is visible. Each stage reads its
 * predecessor's committed output from `jobs.result`, which is what makes a
 * killed worker resume rather than restart.
 */
export function createIngestionProcessor(deps: IngestionDeps) {
  const store = new StageStore(deps.db);
  const sampler = deps.sampler ?? Math.random;

  return async (job: Job<StagePayload>) => {
    const payload = job.data;

    if (await store.alreadyDone(payload)) {
      return { stage: payload.stage, skipped: true, reason: 'already_succeeded' };
    }

    await store.begin(payload);
    try {
      const result = await runStage(payload);
      await store.complete(payload, result);
      return result;
    } catch (error) {
      await store.fail(payload, error);
      throw error;
    }
  };

  async function runStage(payload: StagePayload): Promise<unknown> {
    const paper = await loadPaper(payload.sourcePaperId);

    switch (payload.stage) {
      case 'UPLOAD':
        // The API has already written source_papers and put the file in storage;
        // this stage exists so the chain records that it happened.
        return { sha256: paper.sha256, storagePath: paper.storagePath };

      case 'PREPARE': {
        const dir = await mkdtemp(join(tmpdir(), `campath-${payload.sha256.slice(0, 12)}-`));
        const pdfPath = await deps.fetchPdf(paper.storagePath);
        const pages = await preparePdf({ pdfPath, outputDir: dir });
        await deps.db
          .update(schema.sourcePapers)
          .set({ pageCount: pages.length })
          .where(eq(schema.sourcePapers.id, payload.sourcePaperId));
        return { dir, pages };
      }

      case 'SEGMENT': {
        const prepared = await require<{ pages: PreparedPage[] }>(payload, 'PREPARE');
        return { batches: planBatches(prepared.pages.length) };
      }

      case 'EXTRACT_QP': {
        const prepared = await require<{ pages: PreparedPage[] }>(payload, 'PREPARE');
        const segmented = await require<{ batches: number[][] }>(payload, 'SEGMENT');

        const batches: ExtractQpBatch[] = [];
        const collected: ExtractedQuestion[] = [];
        const usages: AiUsage[] = [];

        for (const pageNumbers of segmented.batches) {
          const pages = prepared.pages.filter((page) => pageNumbers.includes(page.page));
          const { batch, usage } = await deps.extractor.extractQuestions({
            pages,
            metadata: paperMetadata(paper),
            priorRefs: collected.map((question) => question.path),
          });
          batches.push(batch);
          collected.push(...batch.questions);
          usages.push(usage);
          await logAiCall(usage, 'extract_qp', payload.sourcePaperId);
        }

        return {
          questions: dedupeQuestions(collected),
          totalMismatches: checkPageTotals(batches),
        };
      }

      case 'EXTRACT_MS': {
        const prepared = await require<{ pages: PreparedPage[] }>(payload, 'PREPARE');
        const { schemes, usage } = await deps.extractor.extractMarkScheme({
          pages: prepared.pages,
          metadata: paperMetadata(paper),
        });
        await logAiCall(usage, 'extract_ms', payload.sourcePaperId);
        return { schemes };
      }

      case 'MATCH': {
        const qp = await require<{ questions: ExtractedQuestion[] }>(payload, 'EXTRACT_QP');
        const ms = await require<{ schemes: ExtractedScheme[] }>(payload, 'EXTRACT_MS');
        return matchSchemes(qp.questions, ms.schemes);
      }

      case 'ASSETS': {
        // Cropping needs sharp and a storage client; both are wired in a later
        // task. The stage records what would be cropped so ASSETS is not a
        // silent no-op in the audit trail.
        const qp = await require<{ questions: ExtractedQuestion[] }>(payload, 'EXTRACT_QP');
        const pending = qp.questions.flatMap((question) =>
          question.assets.map((asset) => ({
            path: question.path,
            kind: asset.kind,
            bbox: asset.bbox,
            page: asset.page,
          })),
        );
        return { pending, cropped: 0, reason: 'asset cropping not implemented yet' };
      }

      case 'CLASSIFY': {
        const qp = await require<{ questions: ExtractedQuestion[] }>(payload, 'EXTRACT_QP');
        const matched = await require<{
          pairs: Array<{ question: ExtractedQuestion; scheme: ExtractedScheme }>;
        }>(payload, 'MATCH');
        const schemeByPath = new Map(
          matched.pairs.map((pair) => [pair.question.path, pair.scheme]),
        );
        const subtopics = await loadSubtopics();

        const classifications: Classification[] = [];
        for (const question of qp.questions) {
          if (question.marks === null) continue; // parents carry context, not topics
          const { classification, usage } = await deps.extractor.classify({
            question,
            scheme: schemeByPath.get(question.path) ?? null,
            subtopics,
            componentName: paper.componentName,
            level: paper.level,
          });
          classifications.push(classification);
          await logAiCall(usage, 'classify', payload.sourcePaperId);
        }
        return { classifications };
      }

      case 'DEPENDS': {
        const qp = await require<{ questions: ExtractedQuestion[] }>(payload, 'EXTRACT_QP');
        const candidates = worthClassifying(dependencyCandidates(qp.questions));
        if (candidates.length === 0) return { dependencies: [], candidates: 0 };

        const { dependencies, usage } = await deps.extractor.detectDependencies({
          questions: qp.questions,
          candidates,
        });
        await logAiCall(usage, 'depends', payload.sourcePaperId);
        return { dependencies, candidates: candidates.length };
      }

      case 'VALIDATE': {
        const context = await buildValidationContext(payload, paper);
        const report = validateExtraction(context);
        return {
          findings: report.findings,
          errorCount: report.errorCount,
          warningCount: report.warningCount,
          flaggedPaths: report.flaggedPaths,
        };
      }

      case 'CROSSCHECK': {
        const prepared = await require<{ pages: PreparedPage[] }>(payload, 'PREPARE');
        const qp = await require<{ questions: ExtractedQuestion[] }>(payload, 'EXTRACT_QP');
        const matched = await require<{
          pairs: Array<{ question: ExtractedQuestion; scheme: ExtractedScheme }>;
        }>(payload, 'MATCH');

        const schemeByPath = new Map(
          matched.pairs.map((pair) => [pair.question.path, pair.scheme]),
        );
        const selected = selectForCrossCheck(matched.pairs, qp.questions, sampler);

        const verdicts: CrossCheckVerdict[] = [];
        for (const question of selected) {
          const pages = prepared.pages.filter((page) => question.sourcePages.includes(page.page));
          const { verdict, usage } = await deps.extractor.crossCheck({
            pages,
            question,
            scheme: schemeByPath.get(question.path) ?? null,
          });
          verdicts.push(verdict);
          await logAiCall(usage, 'crosscheck', payload.sourcePaperId);
        }

        return {
          verdicts,
          checked: selected.length,
          coverage: qp.questions.length ? selected.length / qp.questions.length : 0,
        };
      }

      case 'PERSIST': {
        const qp = await require<{ questions: ExtractedQuestion[] }>(payload, 'EXTRACT_QP');
        const ms = await require<{ schemes: ExtractedScheme[] }>(payload, 'EXTRACT_MS');
        const classify = await require<{ classifications: Classification[] }>(payload, 'CLASSIFY');
        const depends = await require<{ dependencies: DetectedDependency[] }>(payload, 'DEPENDS');
        const validate = await require<{
          findings: ReturnType<typeof validateExtraction>['findings'];
          flaggedPaths: string[];
        }>(payload, 'VALIDATE');
        const crosscheck = await require<{ verdicts: CrossCheckVerdict[] }>(payload, 'CROSSCHECK');

        const disagreed = crosscheck.verdicts
          .filter((verdict) => !verdict.agrees)
          .map((verdict) => verdict.path);
        const flagged = [...new Set([...validate.flaggedPaths, ...disagreed])];

        const result = await persistPaper(deps.db, {
          sourcePaperId: payload.sourcePaperId,
          componentId: paper.componentId,
          questions: qp.questions,
          schemes: ms.schemes,
          classifications: classify.classifications,
          dependencies: depends.dependencies,
          verdicts: crosscheck.verdicts,
          findings: validate.findings,
          flaggedPaths: flagged,
          promptVersions: {
            extractQp: 'extract-question.v1',
            extractMs: 'extract-markscheme.v1',
            crossCheck: 'cross-check.v1',
          },
        });

        return { ...result, rate: flaggedRate(result.leafCount, result.needsReviewCount) };
      }

      default:
        throw new Error(`Unknown stage ${payload.stage}`);
    }
  }

  /** Reads a predecessor's output, failing loudly if the chain ran out of order. */
  async function require<T>(payload: StagePayload, stage: StagePayload['stage']): Promise<T> {
    const value = await store.read<T>(payload, stage);
    if (value === null) throw new Error(`Stage ${stage} has no committed output yet`);
    return value;
  }

  async function buildValidationContext(
    payload: StagePayload,
    paper: PaperRow,
  ): Promise<ValidationContext> {
    const qp = await require<{ questions: ExtractedQuestion[] }>(payload, 'EXTRACT_QP');
    const ms = await require<{ schemes: ExtractedScheme[] }>(payload, 'EXTRACT_MS');
    const classify = await require<{ classifications: Classification[] }>(payload, 'CLASSIFY');
    const depends = await require<{ dependencies: DetectedDependency[] }>(payload, 'DEPENDS');

    const byPath = new Map(classify.classifications.map((item) => [item.path, item]));

    return {
      componentTotalMarks: paper.componentTotalMarks,
      year: paper.year,
      questions: qp.questions.map((question) => ({
        path: question.path,
        parentPath: question.parentPath,
        displayRef: question.path,
        marks: question.marks,
        stemMd: question.stemMd,
        contextMd: question.contextMd,
        commandWord: question.commandWord,
        answerKind: question.answerKind,
        answerLines: question.answerLines,
        extractConfidence: question.confidence,
        subtopics: byPath.get(question.path)?.subtopics ?? [],
      })),
      schemes: ms.schemes.map((scheme) => ({
        questionPath: scheme.path,
        type: scheme.schemeType,
        maxMarks: scheme.maxMarks,
        points: scheme.points.map((point) => ({
          code: point.code,
          marks: point.marks,
          groupLabel: point.groupLabel,
        })),
        groups: scheme.groups,
        levelCount: scheme.levels.length,
        confidence: scheme.confidence,
      })),
      assets: [],
      dependencies: depends.dependencies.map((dependency) => ({
        fromPath: dependency.fromPath,
        toPath: dependency.toPath,
        kind: dependency.kind,
        strength: dependency.strength,
      })),
    };
  }

  async function loadPaper(sourcePaperId: string): Promise<PaperRow> {
    const [row] = await deps.db
      .select({
        sha256: schema.sourcePapers.sha256,
        storagePath: schema.sourcePapers.storagePath,
        componentId: schema.sourcePapers.componentId,
        year: schema.sourcePapers.year,
        series: schema.sourcePapers.series,
        variant: schema.sourcePapers.variant,
        componentName: schema.components.name,
        componentNumber: schema.components.number,
        componentTotalMarks: schema.components.totalMarks,
        level: schema.components.level,
      })
      .from(schema.sourcePapers)
      .innerJoin(schema.components, eq(schema.components.id, schema.sourcePapers.componentId))
      .where(eq(schema.sourcePapers.id, sourcePaperId))
      .limit(1);

    if (!row) throw new Error(`source_paper ${sourcePaperId} not found`);
    return row as PaperRow;
  }

  async function loadSubtopics() {
    return deps.db
      .select({ code: schema.subtopics.code, title: schema.subtopics.title })
      .from(schema.subtopics)
      .orderBy(schema.subtopics.code);
  }

  /** R7: every model call is recorded with its cost. */
  async function logAiCall(usage: AiUsage, purpose: string, sourcePaperId: string) {
    await deps.db.insert(schema.aiCalls).values({
      purpose,
      model: usage.model,
      promptVersion: usage.promptVersion,
      refTable: 'source_papers',
      refId: sourcePaperId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      costUsd: String(usage.costUsd),
      latencyMs: usage.latencyMs,
      ok: true,
    });
  }
}

interface PaperRow {
  sha256: string;
  storagePath: string;
  componentId: string;
  year: number;
  series: string;
  variant: number;
  componentName: string;
  componentNumber: number;
  componentTotalMarks: number;
  level: string;
}

const paperMetadata = (paper: PaperRow) => ({
  syllabus: '9618',
  component: paper.componentNumber,
  year: paper.year,
  series: paper.series,
  variant: paper.variant,
});
