/**
 * Original Interactive Games curriculum bank.
 * Pilot: Cambridge 9618 Hodder coursebook, Chapter 7, section 7.1, pp. 179–181.
 * This is a curated learning set, not complete syllabus coverage.
 * No Wordwall code, templates, graphics or private content is used.
 */
export type GameKind =
  | 'match-up'
  | 'flash-cards'
  | 'speaking-cards'
  | 'spin-wheel'
  | 'open-box'
  | 'quiz'
  | 'find-the-match'
  | 'anagram';

export interface GamePair {
  id: string;
  term: string;
  definition: string;
}
export interface SpeakingPrompt {
  id: string;
  prompt: string;
  talkingPoints: string;
}
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: readonly string[];
  answerIndex: number;
  explanation: string;
}
export interface GamePack {
  id: string;
  courseCode: '9618' | '0478';
  chapterNo: number;
  sectionCode: string;
  sectionTitle: string;
  source: string;
  pairs: GamePair[];
  speaking: SpeakingPrompt[];
  quiz: QuizQuestion[];
}

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
  speaking: [
    { id: 's1', prompt: 'Explain the difference between legality and morality.', talkingPoints: 'Law determines legality; personal beliefs about right and wrong inform morality. The two can differ.' },
    { id: 's2', prompt: 'What does a professional code of ethics help computer scientists do?', talkingPoints: 'It sets expectations about professional conduct, integrity and responsibilities.' },
    { id: 's3', prompt: 'Explain what plagiarism means in computer science.', talkingPoints: 'Claiming another person’s ideas, text or code as your own; acknowledge the original source.' },
    { id: 's4', prompt: 'Why should computer professionals consider culture when designing software?', talkingPoints: 'Different societies share different values and practices; software may be offensive or inappropriate in a cultural context.' },
    { id: 's5', prompt: 'Describe the importance of privacy in computing.', talkingPoints: 'People should control access to personal information and avoid unauthorised disclosure.' },
    { id: 's6', prompt: 'What is the role of a professional body such as the BCS?', talkingPoints: 'It represents computing professionals and promotes professional standards and codes of conduct.' },
  ],
  quiz: [
    { id: 'q1', prompt: 'Which term describes presenting another person’s work as your own?',
      options: ['Copyright', 'Plagiarism', 'Privacy', 'Culture'], answerIndex: 1,
      explanation: 'Plagiarism is claiming another person’s work or ideas as your own.' },
    { id: 'q2', prompt: 'Which term most directly concerns laws and permitted behaviour?',
      options: ['Morality', 'Culture', 'Legal', 'Ethics'], answerIndex: 2,
      explanation: 'Legal refers to requirements and permissions established by law.' },
    { id: 'q3', prompt: 'A computing professional follows an organisational code of conduct. Which concept is most directly involved?',
      options: ['Culture', 'Ethics', 'Privacy', 'Morality'], answerIndex: 1,
      explanation: 'Professional ethics concerns conduct governed by professional principles or a code.' },
    { id: 'q4', prompt: 'Which concept refers to attitudes and practices shared by a society?',
      options: ['Culture', 'Morality', 'Privacy', 'Copyright'], answerIndex: 0,
      explanation: 'Culture comprises the shared attitudes, values and practices of a society or group.' },
    { id: 'q5', prompt: 'A person wants to prevent unauthorised access to their personal information. What right is involved?',
      options: ['Licensing', 'Ethics', 'Culture', 'Privacy'], answerIndex: 3,
      explanation: 'Privacy is the right to keep personal information from unauthorised access and sharing.' },
    { id: 'q6', prompt: 'Which organisation represents computing professionals and promotes a professional code of conduct?',
      options: ['BCS', 'ISP', 'DNS', 'LAN'], answerIndex: 0,
      explanation: 'The British Computer Society (BCS) is a professional body in computing.' },
  ],
};

export const GAME_CATALOG: ReadonlyArray<{ id: GameKind; label: string; description: string }> = [
  { id: 'match-up', label: 'Match Up', description: 'Connect terms with their definitions.' },
  { id: 'flash-cards', label: 'Flash Cards', description: 'Flip cards to revise key terms.' },
  { id: 'speaking-cards', label: 'Speaking Cards', description: 'Speak about a topic and reveal guidance.' },
  { id: 'spin-wheel', label: 'Spin the Wheel', description: 'Spin for a random concept to explain.' },
  { id: 'open-box', label: 'Open the Box', description: 'Open numbered boxes to reveal challenges.' },
  { id: 'quiz', label: 'Quiz', description: 'Answer one multiple-choice question at a time.' },
  { id: 'find-the-match', label: 'Find the Match', description: 'Choose the right term for a definition.' },
  { id: 'anagram', label: 'Anagram', description: 'Unscramble computer science vocabulary.' },
];

export function isCorrectPair(termId: string, definitionId: string): boolean {
  return termId === definitionId;
}

/** Consistent per-question four-choice construction without making the prompt's answer obvious. */
export function findMatchOptions(pairs: readonly GamePair[], index: number, minimum = 4): GamePair[] {
  if (pairs.length < minimum) return [];
  const target = pairs[index];
  if (!target) return [];
  // Pick three distinct distractors, including for short 4- and 5-term packs.
  // A fixed odd-offset list repeats candidates when the bank has five items.
  const others: GamePair[] = [];
  for (let offset = 1; others.length < 3 && offset < pairs.length; offset += 1) {
    const choice = pairs[(index + offset) % pairs.length]!;
    if (choice.id !== target.id && !others.some((item) => item.id === choice.id)) {
      others.push(choice);
    }
  }
  const place = index % (others.length + 1);
  const result = [...others];
  result.splice(place, 0, target);
  return result;
}

/** Stable scrambled prompt, never identical to the solution; does not leak correct spelling. */
export function scrambleTerm(term: string): string {
  const letters = [...term.toUpperCase()];
  if (letters.length < 3) return letters.reverse().join('');
  const odd = letters.filter((_, index) => index % 2 === 1).reverse();
  const even = letters.filter((_, index) => index % 2 === 0).reverse();
  const scrambled = [...odd, ...even].join('');
  if (scrambled !== letters.join('')) return scrambled;
  // Palindromes such as ABBA also survive reversal unchanged.
  // Move the first different character to the front, keeping the same letters.
  const different = letters.findIndex((char) => char !== letters[0]);
  if (different < 0) return letters.join(''); // Cannot scramble identical letters.
  const shifted = [...letters];
  [shifted[0], shifted[different]] = [shifted[different]!, shifted[0]!];
  return shifted.join('');
}

/** Return a shuffled copy so games never reorder the source round. */
export function shuffleItems<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other]!, shuffled[index]!];
  }
  return shuffled;
}
