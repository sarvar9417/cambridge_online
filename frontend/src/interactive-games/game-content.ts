/**
 * Standalone Interactive Games content model.
 * Pilot bank: Cambridge 9618 Hodder Chapter 7, section 7.1 (pp. 179–181).
 * This is a curated pilot, NOT the complete Chapter 7 syllabus.
 * No Wordwall code, assets or dependencies are used.
 */
export type GameKind = 'match-up' | 'matching-pairs' | 'flash-cards' | 'group-sort';
export interface GamePair { id: string; term: string; definition: string; }
export type GroupName = 'Legal' | 'Morality' | 'Ethics' | 'Culture';
export interface SortPrompt { id: string; statement: string; group: GroupName; }
export interface GamePack {
  id: string;
  courseCode: '9618' | '0478';
  chapterNo: number;
  sectionCode: string;
  sectionTitle: string;
  source: string;
  pairs: GamePair[];
  groups: SortPrompt[];
}

export const GROUPS: readonly GroupName[] = ['Legal', 'Morality', 'Ethics', 'Culture'];

export const chapter7Pilot: GamePack = {
  id: '9618-ch7-sec7.1-pilot',
  courseCode: '9618',
  chapterNo: 7,
  sectionCode: '7.1',
  sectionTitle: 'Legal, moral, ethical and cultural implications',
  source: 'Hodder 9618 coursebook, Chapter 7, section 7.1, pp. 179–181',
  pairs: [
    { id: 'legal', term: 'Legal', definition: 'Relating to what is permitted or required by law.' },
    { id: 'morality', term: 'Morality', definition: 'Beliefs about the difference between right and wrong.' },
    { id: 'ethics', term: 'Ethics', definition: 'Moral principles guiding professional or organisational behaviour.' },
    { id: 'culture', term: 'Culture', definition: 'The attitudes, values and practices shared by a society or group.' },
    { id: 'ip', term: 'Intellectual property rights', definition: 'Rules protecting ownership of creations and ideas.' },
    { id: 'privacy', term: 'Privacy', definition: 'The right to keep personal information from unauthorised access or sharing.' },
    { id: 'plagiarism', term: 'Plagiarism', definition: 'Presenting someone else’s work as your own.' },
    { id: 'bcs', term: 'BCS', definition: 'British Computer Society, a professional body for computing.' },
  ],
  groups: [
    { id: 'sort1', statement: 'A rule established by law', group: 'Legal' },
    { id: 'sort2', statement: 'Whether copying software without permission breaks legislation', group: 'Legal' },
    { id: 'sort3', statement: 'An individual’s view of right and wrong', group: 'Morality' },
    { id: 'sort4', statement: 'A personal judgement about an action being right or wrong', group: 'Morality' },
    { id: 'sort5', statement: 'Following a professional code of conduct', group: 'Ethics' },
    { id: 'sort6', statement: 'Protecting confidential employer information as a professional duty', group: 'Ethics' },
    { id: 'sort7', statement: 'Values shared by a society', group: 'Culture' },
    { id: 'sort8', statement: 'Practices common within a cultural group', group: 'Culture' },
  ],
};

export const GAME_CATALOG: ReadonlyArray<{ id: GameKind; label: string; description: string }> = [
  { id: 'match-up', label: 'Match Up', description: 'Connect each term to its correct definition.' },
  { id: 'matching-pairs', label: 'Matching Pairs', description: 'Find matching hidden cards from memory.' },
  { id: 'flash-cards', label: 'Flash Cards', description: 'Reveal definitions and revise essential vocabulary.' },
  { id: 'group-sort', label: 'Group Sort', description: 'Classify statements into the correct categories.' },
];

export function isCorrectPair(termId: string, definitionId: string): boolean {
  return termId === definitionId;
}

export function isCorrectGroup(prompt: SortPrompt, answer: GroupName): boolean {
  return prompt.group === answer;
}
