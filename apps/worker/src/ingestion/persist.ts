import { sql } from 'drizzle-orm';
import type { Database } from '@campath/db';
import { schema } from '@campath/db';
import type { Finding } from '@campath/shared';
import type {
  Classification,
  CrossCheckVerdict,
  DetectedDependency,
  ExtractedQuestion,
  ExtractedScheme,
} from './types.js';

export interface PersistInput {
  sourcePaperId: string;
  componentId: string;
  questions: ExtractedQuestion[];
  schemes: ExtractedScheme[];
  classifications: Classification[];
  dependencies: DetectedDependency[];
  verdicts: CrossCheckVerdict[];
  findings: Finding[];
  /** Paths that must not auto-approve. */
  flaggedPaths: string[];
  promptVersions: Record<string, string>;
}

export interface PersistResult {
  questionCount: number;
  leafCount: number;
  approvedCount: number;
  needsReviewCount: number;
  findingCount: number;
}

/**
 * Writes one paper's extraction.
 *
 * Everything happens in a single transaction. A half-written paper is worse than
 * no paper: V02 would pass on the fragment, V03 would report leaves that exist
 * but whose schemes were never committed, and the review queue would show a
 * paper nobody can trust.
 *
 * Re-running is safe. `questions` is keyed on `(source_paper_id, path)`, so a
 * retry after a partial failure updates rather than duplicates.
 */
export async function persistPaper(db: Database, input: PersistInput): Promise<PersistResult> {
  const flagged = new Set(input.flaggedPaths);
  const isLeaf = (path: string) =>
    !input.questions.some((question) => question.parentPath === path);

  return db.transaction(async (tx) => {
    const idByPath = new Map<string, string>();

    // Parents before children so parent_id always resolves.
    const ordered = [...input.questions].sort(
      (a, b) => a.path.split('.').length - b.path.split('.').length,
    );

    for (const [index, question] of ordered.entries()) {
      const status = flagged.has(question.path) ? 'needs_review' : 'approved';
      const [row] = await tx
        .insert(schema.questions)
        .values({
          sourcePaperId: input.sourcePaperId,
          componentId: input.componentId,
          parentId: question.parentPath ? (idByPath.get(question.parentPath) ?? null) : null,
          label: question.label,
          path: question.path,
          displayRef: buildDisplayRef(question.path),
          depth: question.path.split('.').length - 1,
          sortOrder: index,
          stemMd: question.stemMd,
          contextMd: question.contextMd,
          commandWord: question.commandWord,
          marks: question.marks,
          answerKind: question.answerKind,
          answerLines: question.answerLines,
          status,
          extractConfidence: String(question.confidence),
          promptVersion: input.promptVersions.extractQp ?? null,
        })
        .onConflictDoUpdate({
          target: [schema.questions.sourcePaperId, schema.questions.path],
          set: {
            stemMd: question.stemMd,
            contextMd: question.contextMd,
            commandWord: question.commandWord,
            marks: question.marks,
            answerKind: question.answerKind,
            answerLines: question.answerLines,
            status,
            extractConfidence: String(question.confidence),
            updatedAt: new Date(),
          },
        })
        .returning({ id: schema.questions.id });

      if (row) idByPath.set(question.path, row.id);
    }

    // Rewrite the dependent rows rather than diffing them: a re-run must not
    // leave a subtopic or mark point that the new extraction dropped.
    const questionIds = [...idByPath.values()];
    if (questionIds.length) {
      await tx
        .delete(schema.questionAssets)
        .where(inIds(schema.questionAssets.questionId, questionIds));
      await tx
        .delete(schema.questionSubtopics)
        .where(inIds(schema.questionSubtopics.questionId, questionIds));
      await tx
        .delete(schema.questionDependencies)
        .where(inIds(schema.questionDependencies.questionId, questionIds));
      await tx.delete(schema.markSchemes).where(inIds(schema.markSchemes.questionId, questionIds));
    }

    for (const question of input.questions) {
      const questionId = idByPath.get(question.path);
      if (!questionId) continue;

      for (const [order, asset] of question.assets.entries()) {
        await tx.insert(schema.questionAssets).values({
          questionId,
          kind: asset.kind,
          contentMd: asset.contentMd,
          altText: asset.altText,
          sortOrder: order,
          sourcePage: asset.page,
        });
      }
    }

    for (const classification of input.classifications) {
      const questionId = idByPath.get(classification.path);
      if (!questionId) continue;

      for (const subtopic of classification.subtopics) {
        const [row] = await tx
          .select({ id: schema.subtopics.id })
          .from(schema.subtopics)
          .where(sql`${schema.subtopics.code} = ${subtopic.code}`)
          .limit(1);
        if (!row) continue;

        await tx.insert(schema.questionSubtopics).values({
          questionId,
          subtopicId: row.id,
          isPrimary: subtopic.isPrimary,
          weight: String(subtopic.weight),
          confidence: String(subtopic.confidence),
          setBy: 'ai',
        });
      }
    }

    for (const dependency of input.dependencies) {
      const fromId = idByPath.get(dependency.fromPath);
      const toId = idByPath.get(dependency.toPath);
      if (!fromId || !toId || dependency.kind === 'none') continue;

      await tx.insert(schema.questionDependencies).values({
        questionId: fromId,
        dependsOnId: toId,
        kind: dependency.kind,
        strength: dependency.strength,
        evidence: dependency.evidence,
        detectedBy: 'ai',
        confidence: String(dependency.confidence),
      });
    }

    for (const scheme of input.schemes) {
      const questionId = idByPath.get(scheme.path);
      if (!questionId) continue;

      const [markScheme] = await tx
        .insert(schema.markSchemes)
        .values({
          questionId,
          sourcePaperId: input.sourcePaperId,
          schemeType: scheme.schemeType,
          maxMarks: scheme.maxMarks,
          guidanceMd: scheme.guidanceMd,
          status: flagged.has(scheme.path) ? 'needs_review' : 'approved',
          extractConfidence: String(scheme.confidence),
          promptVersion: input.promptVersions.extractMs ?? null,
        })
        .returning({ id: schema.markSchemes.id });
      if (!markScheme) continue;

      const groupIds = new Map<string, string>();
      for (const [order, group] of scheme.groups.entries()) {
        const [row] = await tx
          .insert(schema.markSchemeGroups)
          .values({
            markSchemeId: markScheme.id,
            label: group.label,
            nRequired: group.nRequired,
            marksPerPoint: group.marksPerPoint,
            maxMarks: group.maxMarks,
            sortOrder: order,
          })
          .returning({ id: schema.markSchemeGroups.id });
        if (row) groupIds.set(group.label, row.id);
      }

      for (const [order, point] of scheme.points.entries()) {
        await tx.insert(schema.markSchemePoints).values({
          markSchemeId: markScheme.id,
          groupId: point.groupLabel ? (groupIds.get(point.groupLabel) ?? null) : null,
          code: point.code,
          text: point.text,
          marks: point.marks,
          accept: point.accept,
          reject: point.reject,
          requires: point.requires,
          isBod: point.isBod,
          sortOrder: order,
        });
      }

      for (const level of scheme.levels) {
        await tx.insert(schema.markSchemeLevels).values({
          markSchemeId: markScheme.id,
          levelNumber: level.levelNumber,
          minMarks: level.minMarks,
          maxMarks: level.maxMarks,
          descriptorMd: level.descriptorMd,
        });
      }
    }

    // R6: nothing is silently accepted. Every finding becomes a row a human can
    // resolve, and the paper-level ones hang off the source paper.
    for (const item of input.findings) {
      const refId = item.path ? idByPath.get(item.path) : undefined;
      await tx.insert(schema.validationFindings).values({
        ruleCode: item.code,
        severity: item.severity,
        refTable: refId ? 'questions' : 'source_papers',
        refId: refId ?? input.sourcePaperId,
        message: item.message,
        details: item.details ?? null,
      });
    }

    for (const verdict of input.verdicts) {
      const refId = idByPath.get(verdict.path);
      if (!refId) continue;
      await tx.insert(schema.crossChecks).values({
        refTable: 'questions',
        refId,
        checkerPromptVersion: input.promptVersions.crossCheck ?? 'cross-check.v1',
        agrees: verdict.agrees,
        disagreement: verdict.disagreements.length ? verdict.disagreements : null,
        confidence: String(verdict.confidence),
      });
    }

    const leaves = input.questions.filter((question) => isLeaf(question.path));
    return {
      questionCount: input.questions.length,
      leafCount: leaves.length,
      approvedCount: leaves.filter((leaf) => !flagged.has(leaf.path)).length,
      needsReviewCount: leaves.filter((leaf) => flagged.has(leaf.path)).length,
      findingCount: input.findings.length,
    };
  });
}

const inIds = (column: unknown, ids: string[]) =>
  sql`${column} in (${sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  )})`;

/** '3.b.ii' -> 'Q3(b)(ii)'. The paper prefix is added by the caller's metadata. */
export function buildDisplayRef(path: string): string {
  const [root, ...rest] = path.split('.');
  return `Q${root}${rest.map((part) => `(${part})`).join('')}`;
}
