import { finding, type RuleDefinition } from './types.js';

/**
 * Stage 1 of DEPENDS: cheap patterns that say "this stem points at a sibling".
 *
 * Deliberately over-inclusive. A false positive costs one model call in stage 2;
 * a false negative ships a question that cannot be answered once extracted on
 * its own.
 */
export const DEPENDENCY_PATTERNS: RegExp[] = [
  /\bpart\s*\(([a-h])\)/i,
  /\byour answer to\s*\(?([a-h])\)?/i,
  /\bthe (table|diagram|algorithm|program|code|query)\s+(in|from)\s+part/i,
];

export interface DependencyMention {
  /** The sibling label the stem points at, e.g. 'a'. */
  label: string | null;
  pattern: string;
  excerpt: string;
}

/** Returns every sibling reference a stem makes. Pure; used by DEPENDS and V23. */
export function findDependencyMentions(stem: string): DependencyMention[] {
  const mentions: DependencyMention[] = [];
  for (const pattern of DEPENDENCY_PATTERNS) {
    // Patterns are authored without /g; clone with it so every mention is seen.
    const global = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`);
    for (const match of stem.matchAll(global)) {
      mentions.push({
        label: match[1]?.toLowerCase() ?? null,
        pattern: pattern.source,
        excerpt: match[0],
      });
    }
  }
  return mentions;
}

/**
 * V23 — a stem refers to another part but no dependency row was written.
 *
 * The gap this catches: the teacher later extracts 3(c) alone, the reference to
 * part (a) travels with it, and the stimulus it points at does not.
 */
export const V23: RuleDefinition = {
  code: 'V23',
  severity: 'warning',
  title: 'Stem references another part but no dependency was recorded',
  run: (context) =>
    context.questions.flatMap((question) => {
      const stem = question.stemMd ?? '';
      const mentions = findDependencyMentions(stem);
      if (mentions.length === 0) return [];

      const recorded = context.dependencies.some(
        (dependency) => dependency.fromPath === question.path && dependency.kind !== 'none',
      );
      if (recorded) return [];

      return [
        finding(
          'V23',
          'warning',
          `stem mentions ${mentions.map((mention) => `"${mention.excerpt}"`).join(', ')} but no dependency was recorded`,
          question.path,
          { mentions },
        ),
      ];
    }),
};

export const dependencyRules = [V23];
