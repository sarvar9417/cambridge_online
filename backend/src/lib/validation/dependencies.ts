export const DEPENDENCY_PATTERNS: RegExp[] = [
  /\bpart\s*\(([a-h])\)/i,
  /\byour answer to\s*\(?([a-h])\)?/i,
  /\bthe (table|diagram|algorithm|program|code|query)\s+(in|from)\s+part/i,
];

export interface DependencyMention {
  label: string | null;
  pattern: string;
  excerpt: string;
}

/**
 * Cheap stage-one dependency detection. Deliberately over-inclusive: false
 * positives can be reviewed, while a false negative can make an extracted
 * Cambridge subpart impossible to answer on its own.
 */
export function findDependencyMentions(stem: string): DependencyMention[] {
  const mentions: DependencyMention[] = [];
  for (const pattern of DEPENDENCY_PATTERNS) {
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
