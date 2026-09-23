import { createHash } from 'node:crypto';

export type VisualFidelityClassification = 'VF-0' | 'VF-1' | 'VF-2' | 'VF-3' | 'VF-4' | 'VF-5';
export type VisualFidelitySurface =
  | 'question_bank_desktop'
  | 'question_bank_mobile'
  | 'pdf'
  | 'docx'
  | 'live_student'
  | 'live_teacher'
  | 'mark_scheme_pdf'
  | 'mark_scheme_docx'
  | 'mark_scheme_live';

export type SourceBbox = readonly [number, number, number, number];

export const QP_REQUIRED_VISUAL_FIDELITY_SURFACES = [
  'question_bank_desktop',
  'question_bank_mobile',
  'pdf',
  'docx',
  'live_student',
  'live_teacher',
] as const satisfies readonly VisualFidelitySurface[];

export function normalizeSourceBbox(value: unknown): SourceBbox | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const numeric = value.map((item) => Number(item));
  if (numeric.some((item) => !Number.isFinite(item))) return null;
  const [x1, y1, x2, y2] = numeric as [number, number, number, number];
  if (x1 < 0 || y1 < 0 || x2 <= x1 || y2 <= y1) return null;
  return [x1, y1, x2, y2] as const;
}

export function pdftoppmSourceArgs(input: {
  pdfPath: string;
  page: number;
  outputPrefix: string;
  dpi?: number;
  bbox?: SourceBbox | null;
}) {
  if (!Number.isInteger(input.page) || input.page < 1) {
    throw new Error(`visual_fidelity_invalid_page:${input.page}`);
  }
  const dpi = input.dpi ?? 200;
  if (!Number.isInteger(dpi) || dpi < 72 || dpi > 600) {
    throw new Error(`visual_fidelity_invalid_dpi:${dpi}`);
  }
  const args = [
    '-f',
    String(input.page),
    '-l',
    String(input.page),
    '-singlefile',
    '-png',
    '-r',
    String(dpi),
  ];
  if (input.bbox) {
    const [x1, y1, x2, y2] = input.bbox;
    const x = Math.floor(x1);
    const y = Math.floor(y1);
    const width = Math.ceil(x2) - x;
    const height = Math.ceil(y2) - y;
    if (width < 1 || height < 1) throw new Error('visual_fidelity_invalid_bbox');
    args.push('-x', String(x), '-y', String(y), '-W', String(width), '-H', String(height));
  }
  args.push(input.pdfPath, input.outputPrefix);
  return args;
}

export function sha256Hex(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function isSha256(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{64}$/i.test(value));
}

export function classificationRequiresRenderedEvidence(classification: VisualFidelityClassification) {
  return classification !== 'VF-5';
}
