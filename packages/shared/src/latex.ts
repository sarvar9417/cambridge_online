/**
 * LaTeX authoring rules for question stems, mark scheme points and diagrams.
 *
 * Rendering contract: `$...$` and `$$...$$` segments are handed to KaTeX in the
 * browser and in the PDF export; everything outside them is plain text. KaTeX is
 * a maths typesetter, not a TeX engine, so this module rejects the constructs it
 * cannot render and the ones that would be unsafe to store at all.
 *
 * The checks are deterministic and pure — no network, no shelling out to TeX.
 */

export type LatexSeverity = 'error' | 'warning';

export interface LatexFinding {
  code: string;
  severity: LatexSeverity;
  message: string;
  /** Character offset in the source where the problem starts, when known. */
  offset?: number;
}

export interface LatexCheckResult {
  ok: boolean;
  findings: LatexFinding[];
  /** Number of `$...$` / `$$...$$` segments detected. */
  mathSegments: number;
}

/**
 * Commands that read files, write files, execute code or redefine the renderer's
 * own macros. None of them are needed to write a 9618 question and all of them
 * are dangerous the moment a real TeX engine ever touches this text.
 */
const FORBIDDEN_COMMANDS = [
  'input',
  'include',
  'write',
  'openout',
  'immediate',
  'read',
  'catcode',
  'def',
  'gdef',
  'edef',
  'xdef',
  'let',
  'newcommand',
  'renewcommand',
  'newenvironment',
  'usepackage',
  'documentclass',
  'csname',
  'expandafter',
  'loop',
  'repeat',
  'url',
  'href',
  'includegraphics',
];

/** Environments KaTeX understands. Anything else must become an SVG asset. */
const SUPPORTED_ENVIRONMENTS = new Set([
  'matrix',
  'pmatrix',
  'bmatrix',
  'Bmatrix',
  'vmatrix',
  'Vmatrix',
  'array',
  'aligned',
  'alignedat',
  'gathered',
  'cases',
  'rcases',
  'split',
  'darray',
  'dcases',
  'equation',
  'align',
  'gather',
  'CD',
]);

/** Environments that mean "this is really a diagram" and need an SVG instead. */
const DIAGRAM_ENVIRONMENTS = new Set(['tikzpicture', 'axis', 'circuitikz', 'forest', 'tabular']);

export const MAX_LATEX_LENGTH = 8000;

const commandPattern = /\\([a-zA-Z]+)/g;
const environmentPattern = /\\begin\s*\{([^}]*)\}/g;

/**
 * Split a source into its maths segments, honouring `\$` escapes and `$$`.
 * Returns null when the delimiters are unbalanced.
 */
export function findMathSegments(source: string): Array<{ start: number; end: number }> | null {
  const segments: Array<{ start: number; end: number }> = [];
  let index = 0;
  let openedAt: number | null = null;
  let openedDouble = false;

  while (index < source.length) {
    const character = source[index]!;
    if (character === '\\') {
      index += 2; // skip the escaped character, including \$
      continue;
    }
    if (character !== '$') {
      index += 1;
      continue;
    }
    const isDouble = source[index + 1] === '$';
    if (openedAt === null) {
      openedAt = index;
      openedDouble = isDouble;
      index += isDouble ? 2 : 1;
      continue;
    }
    if (openedDouble && !isDouble) {
      // A single `$` inside a display segment cannot close it.
      index += 1;
      continue;
    }
    segments.push({ start: openedAt, end: index + (isDouble ? 2 : 1) });
    openedAt = null;
    openedDouble = false;
    index += isDouble ? 2 : 1;
  }

  return openedAt === null ? segments : null;
}

function checkBraces(source: string): LatexFinding | null {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth < 0) {
        return {
          code: 'unbalanced_braces',
          severity: 'error',
          message: 'Yopuvchi } ortiqcha.',
          offset: index,
        };
      }
    }
  }
  return depth === 0
    ? null
    : { code: 'unbalanced_braces', severity: 'error', message: 'Ochilgan { yopilmagan.' };
}

/**
 * Validate a LaTeX fragment destined for KaTeX rendering.
 * Pure function: same input always produces the same findings.
 */
export function checkLatex(source: string): LatexCheckResult {
  const findings: LatexFinding[] = [];

  if (source.length > MAX_LATEX_LENGTH) {
    findings.push({
      code: 'too_long',
      severity: 'error',
      message: `LaTeX matni ${MAX_LATEX_LENGTH} belgidan oshmasligi kerak.`,
    });
  }

  const braceFinding = checkBraces(source);
  if (braceFinding) findings.push(braceFinding);

  const segments = findMathSegments(source);
  if (segments === null) {
    findings.push({
      code: 'unbalanced_math',
      severity: 'error',
      message: 'Matematik $ belgilari juftlashmagan.',
    });
  }

  for (const match of source.matchAll(commandPattern)) {
    const name = match[1]!;
    if (FORBIDDEN_COMMANDS.includes(name)) {
      findings.push({
        code: 'forbidden_command',
        severity: 'error',
        message: `\\${name} buyrug‘i ruxsat etilmagan.`,
        offset: match.index,
      });
    }
  }

  for (const match of source.matchAll(environmentPattern)) {
    const name = match[1]!.replace(/\*$/, '');
    if (DIAGRAM_ENVIRONMENTS.has(name)) {
      findings.push({
        code: 'diagram_environment',
        severity: 'error',
        message: `\\begin{${name}} KaTeX’da renderlanmaydi — buni chizma (SVG) sifatida qo‘shing.`,
        offset: match.index,
      });
      continue;
    }
    if (!SUPPORTED_ENVIRONMENTS.has(name)) {
      findings.push({
        code: 'unsupported_environment',
        severity: 'warning',
        message: `\\begin{${name}} KaTeX’da qo‘llab-quvvatlanmasligi mumkin.`,
        offset: match.index,
      });
    }
  }

  return {
    ok: !findings.some((finding) => finding.severity === 'error'),
    findings,
    mathSegments: segments?.length ?? 0,
  };
}

/** Throwable form used by services; the API surfaces `findings` to the editor. */
export class LatexError extends Error {
  readonly status = 422;
  readonly code = 'invalid_latex';
  constructor(
    readonly field: string,
    readonly findings: LatexFinding[],
  ) {
    super(`invalid_latex:${field}`);
  }
}

export function assertLatex(field: string, source: string | null | undefined) {
  if (source === null || source === undefined || source === '') return;
  const result = checkLatex(source);
  if (!result.ok) throw new LatexError(field, result.findings);
}

/**
 * Strip maths so the plain words can go into the Postgres full-text index.
 * Search should match "primary key", not `\mathtt` or `_2`.
 */
export function latexToSearchText(source: string): string {
  return source
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/(?<!\\)\$[^$]*\$/g, ' ')
    .replace(/\\[a-zA-Z]+\s*/g, ' ')
    .replace(/[{}\\$&^_~#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Minimal SVG hardening for diagram assets. Diagrams are authored by staff and
 * rendered inline, so the markup must not be able to carry script or fetch
 * anything from outside.
 */
const SVG_FORBIDDEN =
  /<\s*(script|foreignObject|iframe|object|embed|use\b[^>]*href\s*=\s*["']http)/i;
const SVG_EVENT_HANDLER = /\son[a-z]+\s*=/i;
const SVG_EXTERNAL_REFERENCE = /(href|xlink:href|src)\s*=\s*["']\s*(?!#)[a-z]+:/i;

export function checkSvg(markup: string): LatexCheckResult {
  const findings: LatexFinding[] = [];
  if (!/^\s*<svg[\s>]/i.test(markup)) {
    findings.push({
      code: 'not_svg',
      severity: 'error',
      message: 'Chizma <svg> bilan boshlanishi kerak.',
    });
  }
  if (SVG_FORBIDDEN.test(markup)) {
    findings.push({
      code: 'unsafe_svg_element',
      severity: 'error',
      message: 'SVG ichida script/foreignObject/tashqi havola bo‘lishi mumkin emas.',
    });
  }
  if (SVG_EVENT_HANDLER.test(markup)) {
    findings.push({
      code: 'unsafe_svg_handler',
      severity: 'error',
      message: 'SVG ichida on… hodisa atributlari bo‘lishi mumkin emas.',
    });
  }
  if (SVG_EXTERNAL_REFERENCE.test(markup)) {
    findings.push({
      code: 'external_reference',
      severity: 'error',
      message: 'SVG tashqi manbaga murojaat qila olmaydi.',
    });
  }
  return {
    ok: !findings.some((finding) => finding.severity === 'error'),
    findings,
    mathSegments: 0,
  };
}
