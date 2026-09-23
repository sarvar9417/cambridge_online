import { describe, expect, it } from 'vitest';
import {
  classificationRequiresRenderedEvidence,
  isSha256,
  normalizeSourceBbox,
  pdftoppmSourceArgs,
  QP_REQUIRED_VISUAL_FIDELITY_SURFACES,
  sha256Hex,
} from './visual-fidelity-evidence.js';

describe('visual fidelity evidence helpers', () => {
  it('normalizes a valid source bbox and rejects malformed geometry', () => {
    expect(normalizeSourceBbox([60, 190, 1390, 870])).toEqual([60, 190, 1390, 870]);
    expect(normalizeSourceBbox([60, 190, 50, 870])).toBeNull();
    expect(normalizeSourceBbox([60, 190, 1390])).toBeNull();
    expect(normalizeSourceBbox(['x', 190, 1390, 870])).toBeNull();
  });

  it('builds deterministic pdftoppm crop arguments', () => {
    expect(
      pdftoppmSourceArgs({
        pdfPath: '/tmp/source.pdf',
        page: 5,
        outputPrefix: '/tmp/crop',
        dpi: 200,
        bbox: [60.2, 190.8, 1390.1, 870.2],
      }),
    ).toEqual([
      '-f',
      '5',
      '-l',
      '5',
      '-singlefile',
      '-png',
      '-r',
      '200',
      '-x',
      '60',
      '-y',
      '190',
      '-W',
      '1331',
      '-H',
      '681',
      '/tmp/source.pdf',
      '/tmp/crop',
    ]);
  });

  it('requires durable rendered evidence for every classification except VF-5', () => {
    expect(classificationRequiresRenderedEvidence('VF-0')).toBe(true);
    expect(classificationRequiresRenderedEvidence('VF-4')).toBe(true);
    expect(classificationRequiresRenderedEvidence('VF-5')).toBe(false);
  });

  it('defines the mandatory QP product surfaces explicitly', () => {
    expect(QP_REQUIRED_VISUAL_FIDELITY_SURFACES).toEqual([
      'question_bank_desktop',
      'question_bank_mobile',
      'pdf',
      'docx',
      'live_student',
      'live_teacher',
    ]);
  });

  it('hashes and validates evidence bytes deterministically', () => {
    const hash = sha256Hex(Buffer.from('Cambridge 9618 visual evidence'));
    expect(hash).toHaveLength(64);
    expect(isSha256(hash)).toBe(true);
    expect(isSha256('not-a-sha')).toBe(false);
  });
});
