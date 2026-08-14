import { finding, parentOfPath, type RuleDefinition } from './types.js';

/** Anything smaller than this is a blank or failed crop, not a figure. */
export const MIN_ASSET_BYTES = 2048;

/** V10 — a question answered with a diagram must actually carry the diagram. */
export const V10: RuleDefinition = {
  code: 'V10',
  severity: 'error',
  title: 'Diagram question has no asset',
  run: (context) =>
    context.questions
      .filter(
        (question) =>
          question.answerKind === 'diagram' &&
          !context.assets.some((asset) => asset.questionPath === question.path),
      )
      .map((question) =>
        finding('V10', 'error', 'answer_kind is diagram but no asset was captured', question.path),
      ),
};

/**
 * V11 — an asset must point at a real file of plausible size.
 *
 * A 200-byte PNG is a white rectangle: the crop box was wrong and the figure
 * the student needs is not there.
 */
export const V11: RuleDefinition = {
  code: 'V11',
  severity: 'error',
  title: 'Asset file is missing or too small',
  run: (context) =>
    context.assets
      .filter((asset) => !asset.storagePath || (asset.sizeBytes ?? 0) <= MIN_ASSET_BYTES)
      .map((asset) =>
        finding(
          'V11',
          'error',
          asset.storagePath
            ? `asset is ${asset.sizeBytes ?? 0} bytes, under the ${MIN_ASSET_BYTES} byte floor`
            : 'asset has no storage path',
          asset.questionPath,
          { assetId: asset.id },
        ),
      ),
};

/**
 * V22 — the same figure attached to several siblings belongs on the parent.
 *
 * Cambridge prints one table above 3(a)-(d); if extraction copies it onto each
 * child then cherry-picking 3(c) carries a duplicate, and editing the table
 * later has to be done four times.
 */
export const V22: RuleDefinition = {
  code: 'V22',
  severity: 'warning',
  title: 'Asset is duplicated across siblings and should move to the parent',
  run: (context) => {
    const byParentAndHash = new Map<string, string[]>();

    for (const asset of context.assets) {
      if (!asset.contentHash) continue;
      const parent = parentOfPath(asset.questionPath);
      if (!parent) continue;
      const key = `${parent}::${asset.contentHash}`;
      byParentAndHash.set(key, [...(byParentAndHash.get(key) ?? []), asset.questionPath]);
    }

    return [...byParentAndHash.entries()]
      .filter(([, paths]) => new Set(paths).size > 1)
      .map(([key, paths]) => {
        const parent = key.split('::')[0]!;
        return finding(
          'V22',
          'warning',
          `the same asset is on ${new Set(paths).size} siblings; move it to "${parent}"`,
          parent,
          { siblings: [...new Set(paths)] },
        );
      });
  },
};

export const assetRules = [V10, V11, V22];
