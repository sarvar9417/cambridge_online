import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import type { Job } from 'bullmq';
import type { Database } from '@campath/db';
import { schema } from '@campath/db';
import { flaggedRate, validateExtraction, type ValidationContext } from '@campath/shared';
import type { AiUsage } from '@campath/ai';
import { preparePdf, planBatches, type PreparedPage } from './prepare.js';
import {
  checkPageTotals,
  dedupeQuestions,
  dependencyCandidates,
  matchSchemes,
  selectForCrossCheck,
  worthClassifying,
} from './pipeline.js';
import { cropAssets, type CroppedAsset } from './assets.js';
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
  /** Persists a cropped asset and returns its storage key. */
  putAsset: (key: string, bytes: Buffer) => Promise<string>;
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

        for (const pageNumbers of segmented.batches) {
          const pages = prepared.pages.filter((page) => pageNumbers.includes(page.page));
          const { batch } = await track('extract_qp', payload.sourcePaperId, () =>
            deps.extractor.extractQuestions({
              pages,
              metadata: paperMetadata(paper),
              priorRefs: collected.map((question) => question.path),
            }),
          );
          batches.push(batch);
          collected.push(...batch.questions);
        }

        return {
          questions: dedupeQuestions(collected),
          totalMismatches: checkPageTotals(batches),
        };
      }

      case 'EXTRACT_MS': {
        const prepared = await require<{ pages: PreparedPage[] }>(payload, 'PREPARE');
        const { schemes } = await track('extract_ms', payload.sourcePaperId, () =>
          deps.extractor.extractMarkScheme({
            pages: prepared.pages,
            metadata: paperMetadata(paper),
          }),
        );
        return { schemes };
      }

      case 'MATCH': {
        const qp = await require<{ questions: ExtractedQuestion[] }>(payload, 'EXTRACT_QP');
        const ms = await require<{ schemes: ExtractedScheme[] }>(payload, 'EXTRACT_MS');
        return matchSchemes(qp.questions, ms.schemes);
      }

      case 'ASSETS': {
        const prepared = await require<{ dir: string; pages: PreparedPage[] }>(payload, 'PREPARE');
        const qp = await require<{ questions: ExtractedQuestion[] }>(payload, 'EXTRACT_QP');

        const assets = await cropAssets({
          questions: qp.questions,
          pages: prepared.pages,
          outputDir: join(prepared.dir, 'assets'),
          deps: { put: deps.putAsset },
        });

        return {
          assets,
          cropped: assets.filter((asset) => asset.storagePath !== null).length,
          skipped: assets.filter((asset) => asset.skipped !== null).length,
        };
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
          const { classification } = await track('classify', payload.sourcePaperId, () =>
            deps.extractor.classify({
              question,
              scheme: schemeByPath.get(question.path) ?? null,
              subtopics,
              componentName: paper.componentName,
              level: paper.level,
            }),
          );
          classifications.push(classification);
        }
        return { classifications };
      }

      case 'DEPENDS': {
        const qp = await require<{ questions: ExtractedQuestion[] }>(payload, 'EXTRACT_QP');
        const candidates = worthClassifying(dependencyCandidates(qp.questions));
        if (candidates.length === 0) return { dependencies: [], candidates: 0 };

        const { dependencies } = await track('depends', payload.sourcePaperId, () =>
          deps.extractor.detectDependencies({ questions: qp.questions, candidates }),
        );
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
          const { verdict } = await track('crosscheck', payload.sourcePaperId, () =>
            deps.extractor.crossCheck({
              pages,
              question,
              scheme: schemeByPath.get(question.path) ?? null,
            }),
          );
          verdicts.push(verdict);
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
    const cropped = await require<{ assets: CroppedAsset[] }>(payload, 'ASSETS');

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
      // Real crop results, not an empty list: V10, V11 and V22 are the only
      // checks on whether a figure actually survived extraction, and they can
      // only fire if the assets reach them.
      assets: cropped.assets.map((asset, index) => ({
        id: `${asset.questionPath}#${index}`,
        questionPath: asset.questionPath,
        kind: asset.kind,
        storagePath: asset.storagePath,
        sizeBytes: asset.sizeBytes,
        altText: asset.altText,
        contentHash: asset.contentHash,
      })),
      dependencies: depends.dependencies.map((dependency) => ({
        fromPath: dependency.fromPath,
        toPath: dependency.toPath,
        kind: dependency.kind,
        strength: dependency.strength,
      })),
      // V19 needs the rest of the bank to compare against; without it a repeat
      // across years can never be reported.
      knownStems: await loadKnownStems(paper.year),
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

  /**
   * Approved stems from every other year, for V19.
   *
   * Restricted to leaves with a stem, because a parent carries scenario text
   * that legitimately repeats between papers and would produce noise.
   */
  async function loadKnownStems(currentYear: number) {
    const rows = await deps.db
      .select({
        displayRef: schema.questions.displayRef,
        stem: schema.questions.stemMd,
        year: schema.sourcePapers.year,
      })
      .from(schema.questions)
      .innerJoin(schema.sourcePapers, eq(schema.sourcePapers.id, schema.questions.sourcePaperId))
      .where(
        and(
          isNotNull(schema.questions.marks),
          isNotNull(schema.questions.stemMd),
          ne(schema.sourcePapers.year, currentYear),
        ),
      )
      .limit(5000);

    return rows.map((row) => ({
      displayRef: row.displayRef,
      stem: row.stem ?? '',
      year: row.year,
    }));
  }

  async function loadSubtopics() {
    return deps.db
      .select({ code: schema.subtopics.code, title: schema.subtopics.title })
      .from(schema.subtopics)
      .orderBy(schema.subtopics.code);
  }

  /**
   * R7: every model call is recorded, including the ones that fail.
   *
   * A failed call still costs tokens and still moves the monthly budget, so
   * logging only successes would make the budget guard read low exactly when a
   * paper is looping on retries.
   */
  async function track<T extends { usage: AiUsage }>(
    purpose: string,
    sourcePaperId: string,
    call: () => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await call();
      await deps.db.insert(schema.aiCalls).values({
        purpose,
        model: result.usage.model,
        promptVersion: result.usage.promptVersion,
        refTable: 'source_papers',
        refId: sourcePaperId,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cacheReadTokens: result.usage.cacheReadTokens,
        cacheWriteTokens: result.usage.cacheWriteTokens,
        costUsd: String(result.usage.costUsd),
        latencyMs: result.usage.latencyMs,
        ok: true,
      });
      return result;
    } catch (error) {
      await deps.db.insert(schema.aiCalls).values({
        purpose,
        model: 'unknown',
        refTable: 'source_papers',
        refId: sourcePaperId,
        latencyMs: Date.now() - startedAt,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
