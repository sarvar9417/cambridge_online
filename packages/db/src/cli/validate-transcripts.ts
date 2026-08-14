/**
 * Runs the 23 validation rules over the hand-transcribed papers and prints the
 * flagged rate. This is the pipeline's health target measured against real
 * Cambridge content, without needing a model.
 */
import { validateExtraction } from '@campath/shared';
import { PAPER as P11 } from '../seed/paper-9618-s23-11.js';
import { PAPER as P12 } from '../seed/paper-9618-s23-12.js';
import { PAPER as P13 } from '../seed/paper-9618-s23-13.js';
import { transcriptToValidationContext } from '../seed/transcript-to-validation.js';

const PAPERS = [
  { name: '9618/11/M/J/23', paper: P11 },
  { name: '9618/12/M/J/23', paper: P12 },
  { name: '9618/13/M/J/23', paper: P13 },
];

let totalLeaves = 0;
let totalFlagged = 0;

for (const { name, paper } of PAPERS) {
  const context = transcriptToValidationContext({
    papers: [paper],
    componentTotalMarks: 75,
    year: 2023,
  });
  const report = validateExtraction(context);
  const leaves = context.questions.filter(
    (q) => !context.questions.some((other) => other.parentPath === q.path),
  );
  const flagged = leaves.filter((leaf) => report.flaggedPaths.includes(leaf.path));
  const marks = leaves.reduce((sum, leaf) => sum + (leaf.marks ?? 0), 0);

  totalLeaves += leaves.length;
  totalFlagged += flagged.length;

  const byCode = new Map<string, number>();
  for (const f of report.findings) byCode.set(f.code, (byCode.get(f.code) ?? 0) + 1);

  console.log(`\n${name}`);
  console.log(`  nodes ${context.questions.length}  leaves ${leaves.length}  marks ${marks}/75`);
  console.log(`  errors ${report.errorCount}  warnings ${report.warningCount}`);
  console.log(
    `  flagged ${flagged.length}/${leaves.length} = ${((flagged.length / leaves.length) * 100).toFixed(1)}%`,
  );
  for (const f of report.findings) console.log(`    ${f.code} ${f.path ?? '-'}: ${f.message}`);
  if (byCode.size) {
    console.log(
      `  by rule: ${[...byCode.entries()]
        .sort()
        .map(([c, n]) => `${c}×${n}`)
        .join('  ')}`,
    );
  }
}

const pct = (totalFlagged / totalLeaves) * 100;
console.log(`\nTOTAL  leaves ${totalLeaves}  flagged ${totalFlagged} = ${pct.toFixed(1)}%`);
console.log(
  `verdict: ${pct < 5 ? 'validation too soft' : pct > 30 ? 'extraction poor' : 'healthy (5-30% target)'}`,
);
