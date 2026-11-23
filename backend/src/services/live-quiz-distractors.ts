import { randomInt } from 'node:crypto';

/**
 * Source-bounded distractor ranking for Cambridge Live Quiz.
 *
 * A distractor must come from the already verified, deduplicated glossary pool.
 * Topic/section metadata and shared technical vocabulary provide a conservative
 * approximation of conceptual similarity; they do not prove semantic equivalence.
 * Never pad a question with unrelated random options.
 */
export type QuizDifficulty = 'standard' | 'challenging';

export interface RelatedQuizTerm {
  id: string;
  term: string;
  definition: string;
  chapterNo?: number;
  syllabusTopicCode?: string;
  hodderSectionCodes?: readonly string[];
}

const stop = new Set([
  'the','and','for','with','from','that','this','into','which','where','when',
  'what','how','are','has','have','can','will','use','uses','using','used',
  'its','not','one','two','all','any','each','than','such','only','some',
  'their','them','they','been','being','more','other','also','between',
  'about','through','after','before','who','whose','into','onto','does',
  'data','computer','computers','system','systems','information',
  'defined','definition','source','verified','different','type','types',
]);

function words(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z][a-z0-9]{2,}/g) ?? [])
    .filter(word => !stop.has(word))
    .map(word => {
      // Normalise simple inflections but do not stem algorithm-specific terms.
      if (word.endsWith('ing') && word.length > 6) return word.slice(0, -3);
      if (word.endsWith('ed') && word.length > 5) return word.slice(0, -2);
      if (word.endsWith('s') && !word.endsWith('ss') && word.length > 4) return word.slice(0, -1);
      return word;
    }));
}

function intersection(a: Set<string>, b: Set<string>): number {
  let common = 0;
  for (const word of a) if (b.has(word)) common++;
  return common;
}

const normalize = (value: string): string => value.normalize('NFKC')
  .toLowerCase().trim().replace(/\s+/g, ' ');

export function selectRelatedDistractors<T extends RelatedQuizTerm>(
  target: T, pool: readonly T[], difficulty: QuizDifficulty = 'standard',
): T[] {
  const targetDescription = words(target.definition);
  const targetLabel = words(target.term);
  const targetSections = new Set(target.hodderSectionCodes ?? []);
  const ranked = pool.flatMap(other => {
    if (other.id === target.id ||
      normalize(other.term) === normalize(target.term) ||
      normalize(other.definition) === normalize(target.definition)) return [];

    const sameSection = (other.hodderSectionCodes ?? [])
      .some(code => targetSections.has(code));
    const sameTopic = Boolean(target.syllabusTopicCode &&
      other.syllabusTopicCode === target.syllabusTopicCode);
    const sameChapter = target.chapterNo !== undefined &&
      other.chapterNo === target.chapterNo;
    const sharedDefinitions = intersection(targetDescription, words(other.definition));
    const sharedLabels = intersection(targetLabel, words(other.term));
    const meaning = sharedDefinitions * 2 + sharedLabels;
    // Matching a topic alone is not evidence of conceptual similarity.
    // Require meaningful shared terminology even within a broad curriculum topic.
    const isRelated = difficulty === 'challenging'
      ? ((sameSection || sameTopic) && meaning >= 2) ||
        (sameChapter && meaning >= 4) || meaning >= 6
      : ((sameSection || sameTopic) && meaning >= 1) ||
        (sameChapter && meaning >= 2) || meaning >= 4;
    if (!isRelated) return [];

    const score = (sameSection ? 14 : 0) + (sameTopic ? 12 : 0) +
      (sameChapter ? 3 : 0) + sharedDefinitions * 4 + sharedLabels * 2;
    return [{ other, score }];
  });
  // Challenging always picks the three closest alternatives. Standard varies
  // three among the top five *related* alternatives to keep repeat rounds fresh.
  ranked.sort((a, b) => b.score - a.score);
  if (difficulty === 'challenging') return ranked.slice(0, 3).map(item => item.other);
  const shortlist = ranked.slice(0, 5);
  for (let i = shortlist.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shortlist[i], shortlist[j]] = [shortlist[j]!, shortlist[i]!];
  }
  return shortlist.slice(0, 3).map(item => item.other);
}
