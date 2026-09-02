export const DEPENDENCY_PATTERNS: RegExp[] = [
  // Cambridge references can be written as part (a), part 2(a)(i), part b(ii), etc.
  /\bpart\s*(?:\d+\s*)?\((?<label>[a-h])\)(?:\([ivx]+\))?/i,
  /\bpart\s+(?<label>[a-h])\s*\([ivx]+\)/i,

  // Printed sibling material and candidate-produced answers/identifiers are both
  // dependency candidates. The AI classification stage decides text_ref vs answer_ref.
  /\b(?:your|the)\s+(?:answer|result|expression|value|variable|field names?|data type|structure|diagram|code|program|function|procedure|module)\s+(?:to|from|for|in)\s+part\b/i,
  /\b(?:table|diagram|algorithm|program|code|query|function|procedure|module|expression|values?|instructions?|structure)\s+(?:shown\s+|given\s+|defined\s+|described\s+|written\s+|created\s+)?(?:in|from)\s+part\b/i,
  /\b(?:variable|field names?|data type|function|procedure|module|algorithm|program|code|structure)\s+you\s+(?:created|set up|wrote|defined)\s+in\s+part\b/i,

  // Paper 4 practical questions frequently omit an explicit "part (x)" reference.
  // A test/evidence task consumes the program produced immediately beforehand, while
  // amend/extend/edit tasks consume previously written program state or modules.
  /\b(?:test|run)\s+(?:your|the)\s+program\b/i,
  /\b(?:take|provide)\s+(?:a\s+|one\s+or\s+more\s+)?screenshots?\b/i,
  /\b(?:amend|extend|edit)\s+(?:the\s+|your\s+)?(?:main\s+)?program\b/i,
  /\bafter\s+the\s+(?:code|program code)\s+you\s+wrote\b/i,
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
        label: match.groups?.label?.toLowerCase() ?? null,
        pattern: pattern.source,
        excerpt: match[0],
      });
    }
  }
  return mentions;
}
