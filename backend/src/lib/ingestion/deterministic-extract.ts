/**
 * Reading a Cambridge question paper without a model.
 *
 * The papers are typeset to a fixed house style and `pdftotext -layout` keeps
 * it: a question number sits at column zero, a part `(a)` is indented a little,
 * a sub-part `(i)` further, the marks appear as `[3]` at the right margin, and
 * an answer line is a run of dots. That is enough structure to read the tree
 * exactly, and the mark total is a checksum -- Paper 1 is 75 marks, so a parse
 * that sums to 75 got every bracket.
 *
 * What this cannot do is read a diagram, a table or a mark scheme's meaning.
 * Those are not guessed: they are reported as issues and the question goes to
 * the review queue that already exists, which is the same place a low-confidence
 * model extraction would land.
 *
 * ## Column zero moves, so nothing is measured from it
 *
 * "Column zero" is a property of the page, not of the document. From 2024 the
 * papers carry a vertical `DO NOT WRITE IN THIS MARGIN` rule, and on the pages
 * that have one `pdftotext` shifts every line about thirty columns to the right.
 * Measured over the 2021-2025 corpus the shift alternates page by page inside a
 * single paper: in `9618_w25_qp_22` question 1 sits at column 0 and question 2
 * at column 30.
 *
 * Absolute indents therefore classify nothing, and neither does a per-page
 * origin: a page can open on a part, on a sub-part or on body text, so the
 * leftmost thing on it is not a fixed grid column. Trying that read parts on
 * continuation pages as being left of the part column and dropped them outright,
 * which cost more papers than it fixed.
 *
 * What is stable is the nesting *within a question*. The first bracketed label
 * after a question number is its first part, whatever column that lands in, and
 * every later label is a part or a sub-part according to whether it sits at that
 * same column or further in. Both are printed by the same shifted page, so the
 * comparison survives any shift without having to know it.
 */

export interface ParsedQuestion {
  path: string;
  label: string;
  parentPath: string | null;
  stem: string;
  marks: number | null;
  answerLines: number;
  sourcePages: number[];
  issues: string[];
  confidence: number;
}

export interface ParsedPaper {
  questions: ParsedQuestion[];
  /** Every bracket the paper printed, summed. Compare against the component total. */
  totalMarks: number;
  /** The total the paper states on its own front page, when it states one. */
  declaredTotal: number | null;
  issues: string[];
}

/**
 * Every paper prints its own total on the front page. Reading it there beats
 * being told: Paper 1 and 2 are 75 but Paper 3 and 4 are not, and a checksum
 * that depends on the caller knowing the right number is a checksum that will
 * eventually be run against the wrong one.
 */
export function declaredTotalOf(text: string): number | null {
  const stated = /total mark for this paper is\s+(\d{1,3})/i.exec(text);
  return stated ? Number(stated[1]) : null;
}

/** Page numbers, the copyright line, the syllabus code, turn-over instructions. */
const FURNITURE = [
  /^\s*\d{1,2}\s*$/,
  /^\s*©\s*UCLES/i,
  /^\s*9618\/\d{2}\/[A-Z]\/[A-Z]\/\d{2}\s*$/,
  /^\s*\[?\s*Turn over/i,
  /^\s*BLANK PAGE\s*$/i,
  /^\s*Permission to reproduce/i,
  /^\s*Cambridge Assessment International Education/i,
  /^\s*www\.cambridgeinternational\.org/i,
  /^\s*DC \(/,
  // From 2024 the margin rule is printed as running text on most pages. It is
  // set at column zero, so leaving it in drags every page origin to 0 and the
  // shifted pages stop being detectable at all.
  /DO NOT WRITE IN THIS MARGIN/i,
  // The candidate barcode, e.g. `* 0000800000003 *`, sometimes with the printer
  // code (`DFD`) trailing on the same line.
  /^\s*\*\s*[\d\s]{8,}\*\s*(\S{2,4}\s*)?$/,
  // Crop and fold marks survive as a line of stray punctuation.
  /^[\s,.*·]*$/,
];

const isFurniture = (line: string) => FURNITURE.some((pattern) => pattern.test(line));

/**
 * The barcode font renders into the private-use plane, so those lines arrive as
 * a run of characters no Cambridge question would contain. They sit at their own
 * indent and would otherwise be taken for the leftmost content on the page.
 */
function isGarbage(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const exotic = trimmed.replace(/[\x20-\x7E]/g, '').length;
  return exotic > trimmed.length / 3;
}

/** A ruled answer line: mostly dots, with at most a short label in front. */
const DOT_RUN = /\.{10,}/;

/** `[3]` at the end of a line, which is how every mark allocation is printed. */
const MARKS_AT_END = /\[(\d{1,2})\]\s*$/;

const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/;

const QUESTION_LINE = /^(\s*)(\d{1,2})\s{2,}(\S.*)$/;
const BRACKET_LINE = /^(\s*)\(([a-z]{1,4})\)\s*(.*)$/;

/**
 * A question number introduces prose. A truth-table row introduces more numbers,
 * and `77  0 1 1` reading as question 77 is the specific bug this prevents.
 */
const looksLikeQuestionText = (rest: string) => /^[A-Za-z(“"'‘]/.test(rest);

interface Marker {
  kind: 'question' | 'part' | 'subpart';
  label: string;
  rest: string;
  indent: number;
  page: number;
}

/**
 * Which structural marker, if any, a line opens.
 *
 * `partColumn` is the column this question's parts are printed at, learned from
 * its first one. Until it is known any bracketed label is a part, which is what
 * `(a)` always is; once it is known, anything further in is a sub-part. That
 * settles `(i)`, which is ambiguous on its own -- it is the ninth part letter as
 * well as the first roman numeral. Multi-character romans are unambiguous and
 * are trusted whatever the column.
 */
function markerOf(line: string, page: number, expectedQuestion: number, partColumn: number | null): Marker | null {
  /*
   * A question number is only a question number if it is the next one and is
   * followed by prose. Cambridge numbers its questions 1..N in order, which is
   * the stronger of the two; the prose test is what keeps a truth-table row out.
   *
   * Indentation deliberately plays no part. It used to, and that is what broke
   * the 2024-2025 papers: their margin rule moves the number thirty columns in,
   * so an indent test rejected it, `expectedQuestion` stuck, and every later
   * question on the paper stopped being recognised too -- their marks folded
   * into whichever node happened to be open and the paper read 29 of 75.
   *
   * The next-but-one is accepted as well, for the same reason: one missed
   * question should cost one question, not the rest of the paper.
   */
  const question = QUESTION_LINE.exec(line);
  if (question) {
    const number = Number(question[2]);
    if (looksLikeQuestionText(question[3]!) && (number === expectedQuestion || number === expectedQuestion + 1)) {
      return { kind: 'question', label: question[2]!, rest: question[3]!, indent: question[1]!.length, page };
    }
  }

  // The text may be empty: a part whose content is a code block or a table opens
  // with `(a)` alone on its line, and requiring text on the same line silently
  // dropped those parts and folded their marks into the question above.
  const bracketed = BRACKET_LINE.exec(line);
  if (!bracketed) return null;

  const indent = bracketed[1]!.length;
  const label = bracketed[2]!;
  const rest = bracketed[3]!.trim();

  if (label.length > 1 && ROMAN.test(label)) return { kind: 'subpart', label, rest, indent, page };
  // A column or two of drift is the same level: the labels are proportionally
  // set, so `(i)` and `(iii)` do not start at the same pixel.
  if (partColumn !== null && indent > partColumn + 1) return { kind: 'subpart', label, rest, indent, page };
  return { kind: 'part', label, rest, indent, page };
}

/** Collapses runs of whitespace and drops the dotted rules a student writes on. */
function cleanStem(lines: string[]) {
  return lines
    .map((line) => line.replace(/\.{4,}/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

/**
 * Markers are printed inline whenever a level has a single child: `1 (a)` when
 * question one has one part, `(c) (i)` when part c has one sub-part, and
 * `1 (a) (i)` for both at once.
 *
 * Read as one node they swallow their child's marks and then acquire children,
 * which surfaces as a node that is both a parent and marked -- and, before this,
 * as a paper whose marks did not add up to its printed total.
 */
function peelInlineMarker(rest: string): { label: string; roman: boolean; rest: string } | null {
  const inline = /^\(([a-z]{1,4})\)\s*(.*)$/.exec(rest);
  if (!inline) return null;
  const label = inline[1]!;
  return { label, roman: ROMAN.test(label) && label.length > 1, rest: inline[2]!.trim() };
}

export function parsePaper(text: string): ParsedPaper {
  const pages = text.split('\f');
  const issues: string[] = [];

  interface Open {
    path: string; label: string; parentPath: string | null;
    body: string[]; marks: number | null; answerLines: number; pages: Set<number>;
  }

  const finished: Open[] = [];
  let current: Open | null = null;
  let questionPath = '';
  let partPath = '';
  let expectedQuestion = 1;
  /** The column this question prints its parts at, learned from the first one. */
  let partColumn: number | null = null;

  const close = () => { if (current) finished.push(current); current = null; };

  const open = (path: string, label: string, parentPath: string | null, page: number) => {
    close();
    current = { path, label, parentPath, body: [], marks: null, answerLines: 0, pages: new Set([page]) };
  };

  pages.forEach((page, pageIndex) => {
    const pageNumber = pageIndex + 1;
    for (const raw of page.split('\n')) {
      if (isFurniture(raw) || isGarbage(raw)) continue;

      const marker = markerOf(raw, pageNumber, expectedQuestion, partColumn);
      if (marker) {
        if (marker.kind === 'question') {
          const number = Number(marker.label);
          if (number !== expectedQuestion) issues.push(`question_number_skipped:${expectedQuestion}`);
          questionPath = marker.label;
          partPath = '';
          // A new question re-learns its own part column: the page it starts on
          // may be shifted differently from the one the previous question ended on.
          partColumn = null;
          expectedQuestion = number + 1;
          open(questionPath, marker.label, null, pageNumber);
        } else if (marker.kind === 'part') {
          if (!questionPath) { issues.push(`part_before_question:${marker.label}`); continue; }
          if (partColumn === null) partColumn = marker.indent;
          partPath = `${questionPath}.${marker.label}`;
          open(partPath, marker.label, questionPath, pageNumber);
        } else {
          const parent = partPath || questionPath;
          if (!parent) { issues.push(`subpart_before_question:${marker.label}`); continue; }
          open(`${parent}.${marker.label}`, marker.label, parent, pageNumber);
        }

        // Peel any further markers printed on the same line, opening a child for
        // each. A part after a question, a sub-part after a part, or both.
        let rest = marker.rest;
        let depth = marker.kind === 'question' ? 0 : marker.kind === 'part' ? 1 : 2;
        for (let peeled = peelInlineMarker(rest); peeled && depth < 2; peeled = peelInlineMarker(rest)) {
          const parent = current!.path;
          open(`${parent}.${peeled.label}`, peeled.label, parent, pageNumber);
          if (depth === 0) partPath = current!.path;
          rest = peeled.rest;
          depth += 1;
        }
        if (rest) current!.body.push(rest);
      } else if (current) {
        current.pages.add(pageNumber);
        if (DOT_RUN.test(raw)) current.answerLines += 1;
        const text = raw.trim();
        if (text) current.body.push(raw);
      }

      // The bracket belongs to whichever node is open, including the line that
      // opened it -- `..... [1]` is both the answer rule and the allocation.
      const marks = MARKS_AT_END.exec(raw);
      if (marks && current) {
        const value = Number(marks[1]);
        // A node that already has marks and meets another has run into the next
        // question without a marker the parser recognised. The first bracket is
        // kept and the second is reported: overwriting used to hide the miss by
        // silently discarding marks the paper had actually printed.
        if (current.marks !== null) issues.push(`double_marks:${current.path}:${current.marks}+${value}`);
        else current.marks = value;
      }
    }
  });
  close();

  // Only leaves carry marks. A node with children holds shared context, which is
  // exactly what the extraction contract says.
  const hasChild = new Set(finished.filter((node) => node.parentPath).map((node) => node.parentPath!));

  const questions: ParsedQuestion[] = finished.map((node) => {
    const nodeIssues: string[] = [];
    const isLeaf = !hasChild.has(node.path);
    const stem = cleanStem(node.body);

    if (isLeaf && node.marks === null) nodeIssues.push('leaf_without_marks');
    if (!isLeaf && node.marks !== null) nodeIssues.push('parent_with_marks');
    // A parent with no text of its own is normal: `(c) (i)` puts the wording on
    // the child. Only a leaf with nothing to read is a failure.
    if (!stem && isLeaf) nodeIssues.push('empty_stem');
    // A table or a drawing survives the text layer as almost nothing, so a short
    // stem on a marked leaf is the signature of material this cannot read.
    if (isLeaf && stem.length < 25) nodeIssues.push('stem_too_short_for_a_question');

    return {
      path: node.path,
      label: node.label,
      parentPath: node.parentPath,
      stem,
      marks: isLeaf ? node.marks : null,
      answerLines: node.answerLines,
      sourcePages: [...node.pages].sort((a, b) => a - b),
      issues: nodeIssues,
      // Confidence is structural, not a guess: a clean leaf reads exactly, and
      // anything with an issue drops below the review threshold on purpose.
      confidence: nodeIssues.length === 0 ? 0.95 : 0.5,
    };
  });

  const totalMarks = questions.reduce((sum, question) => sum + (question.marks ?? 0), 0);
  if (!questions.length) issues.push('no_questions_found');

  return { questions, totalMarks, declaredTotal: declaredTotalOf(text), issues };
}

/**
 * The paper's own total is the checksum. Cambridge prints it on the front page
 * and every bracket must add up to it; a mismatch means a bracket was missed or
 * counted twice, and the whole paper is worth a human look rather than a
 * per-question one.
 */
export function checkTotal(parsed: ParsedPaper, expected?: number) {
  // The paper's own statement wins over anything passed in.
  const target = parsed.declaredTotal ?? expected ?? null;
  return {
    expected: target,
    actual: parsed.totalMarks,
    matches: target === null ? false : parsed.totalMarks === target,
    source: parsed.declaredTotal !== null ? 'paper' : expected !== undefined ? 'caller' : 'unknown',
  };
}
