/** Regenerate the complete one-row-per-card audit from the game bank and evidence registry. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  module._compile(compiled.outputText, filename);
};

const { COMPARE_DECKS } = require('../frontend/src/interactive-games/concept-compare-bank.ts');
const { COMPARE_MS_EVIDENCE, COMPARE_P1_QUESTION_PAPERS, COMPARE_P1_MARK_SCHEMES } =
  require('../frontend/src/interactive-games/concept-compare-ms-evidence.ts');

const decks = COMPARE_DECKS.filter(deck => deck.chapterNo >= 1 && deck.chapterNo <= 8)
  .sort((a, b) => a.chapterNo - b.chapterNo || a.id.localeCompare(b.id));
const escape = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const evidenceFor = (deck, number) => (COMPARE_MS_EVIDENCE[deck.id] ?? [])
  .filter(entry => entry.cards.includes(number));
const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);
const linked = decks.reduce((sum, deck) => sum + deck.cards.filter((_, i) => evidenceFor(deck, i + 1).length).length, 0);
const evidencedDecks = decks.filter(deck => deck.cards.some((_, i) => evidenceFor(deck, i + 1).length)).length;

const lines = [
  '# Cambridge 9618 · Chapter 1–8 Compare: QP/MS card-by-card audit',
  '',
  '**Review date:** 20 November 2026 · **Assessment:** Paper 1 (Theory Fundamentals), 2021–2025 QP/MS collection.',
  '',
  `**Inventory:** ${decks.length} comparison pairs, ${totalCards} cards; ${linked} cards have explicit QP/MS marking-point evidence across ${evidencedDecks} pairs. ${totalCards - linked} cards remain textbook-derived practice with no direct marking-point reference recorded.`,
  '',
  '## Source documents and interpretation',
  '',
  `- Question Papers (QP): [9618 Paper 1 archive](${COMPARE_P1_QUESTION_PAPERS})`,
  `- Published Mark Schemes (MS): [9618 Paper 1 archive](${COMPARE_P1_MARK_SCHEMES})`,
  '- Official qualification past-paper page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-computer-science-9618/past-papers/',
  '- Original practice statements: Hodder Computer Science 9618, respective chapter and book sections. These Compare statements are **not** Cambridge questions or verbatim MS answers.',
  '- Original Hodder chapter extracts for Chapters 2–8 were available for source orientation. Chapter 1 was indexed in the platform, but its full PDF was not among the supplied attachments; its textbook fidelity was not independently rechecked here.',
  '- **MS-supported** means the identified Cambridge marking point supports the specific card fact. The examiner did not necessarily ask for an A-versus-B comparison.',
  '- **Hodder / no direct MS evidence recorded** does not mean the card is false or outside the syllabus; a published Paper 1 MS may simply not test that particular statement.',
  '- References use the format `9618/variant/season/year Question` (for example `9618/12/O/N/21 Q5(b)(i)`). Only papers with a matching published QP **and** MS in the reviewed collection were used.',
  '- The QP collection also has 2026 papers, but no corresponding 2026 published MS in the reviewed MS archive; therefore **no 2026 questions are marked MS-supported**.',
  '',
  '## Chapter-level verification coverage',
  '',
  '| Chapter | Compare pairs | All cards | Specific QP/MS evidence | Hodder-only / no matching MS point recorded |',
  '| ---: | ---: | ---: | ---: | ---: |',
  ...Array.from({ length: 8 }, (_, i) => {
    const relevant = decks.filter(deck => deck.chapterNo === i + 1);
    const all = relevant.reduce((sum, deck) => sum + deck.cards.length, 0);
    const verified = relevant.reduce((sum, deck) => sum + deck.cards.filter((_, index) => evidenceFor(deck, index + 1).length).length, 0);
    return `| ${i + 1} | ${relevant.length} | ${all} | ${verified} | ${all - verified} |`;
  }),
  '',
  '## Per-card evidence table',
];

for (let chapter = 1; chapter <= 8; chapter++) {
  const relevant = decks.filter(deck => deck.chapterNo === chapter);
  const count = relevant.reduce((sum, deck) => sum + deck.cards.length, 0);
  const supported = relevant.reduce((sum, deck) => sum + deck.cards.filter((_, i) => evidenceFor(deck, i + 1).length).length, 0);
  lines.push('', `### Chapter ${chapter} — ${relevant.length} comparison pairs · ${supported}/${count} MS-supported cards`, '');
  for (const deck of relevant) {
    lines.push(`#### ${escape(deck.a)} ↔ ${escape(deck.b)} (${deck.id})`, '');
    lines.push(`Hodder ${deck.sectionCodes.join(', ')} · ${deck.extractPages ? 'extract pages' : 'pp.'} ${deck.pages}`, '');
    lines.push('| Card | Correct side | Card statement | Audit status | QP + MS question | MS marking-point summary |');
    lines.push('| ---: | :---: | --- | --- | --- | --- |');
    for (let index = 0; index < deck.cards.length; index++) {
      const [statement, answer] = deck.cards[index];
      const evidence = evidenceFor(deck, index + 1);
      lines.push(`| ${index + 1} | ${answer} | ${escape(statement)} | ${evidence.length ? '**MS-supported**' : 'Hodder / no direct MS evidence recorded'} | ${evidence.map(e => escape(e.question)).join('; ') || '—'} | ${evidence.map(e => escape(e.rationale)).join('; ') || '—'} |`);
    }
    lines.push('');
  }
}

lines.push('## Further verification', '',
  '- Statements without a direct MS ref need independent textbook/syllabus review, not a fabricated Cambridge citation.',
  '- Learners should consult the linked official QP and MS together. A fact mentioned in the MS does **not** guarantee a mark outside the original question context.',
  '- This is a documentation/evidence pass, not a production deployment or a claim of Cambridge endorsement.', '');

const output = path.join(__dirname, '../docs/9618-compare-p1-ms-audit-2026-11-20.md');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, lines.join('\n'), 'utf8');
process.stdout.write(`${output}\n${decks.length} decks, ${totalCards} cards, ${linked} MS-supported\n`);
