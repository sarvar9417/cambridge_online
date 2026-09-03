import { describe, expect, it } from 'vitest';
import type { ExtractedQuestion } from './processors/ingestion-contract.js';
import { canAutoApproveAudit, sourceCropAssets } from './source-visual-repair.js';

const question = (assets: ExtractedQuestion['assets']): ExtractedQuestion => ({
  path: '2.a', label: 'a', parentPath: '2', displayRef: '2(a)', stemMd: 'Complete the diagram.', contextMd: null,
  commandWord: 'Complete', marks: 2, answerKind: 'diagram', answerLines: null, sourcePages: [4], assets,
  issues: [], confidence: 0.95,
});

describe('source visual repair safety', () => {
  it('accepts only reproducible original-source diagram/image crops', () => {
    const result = sourceCropAssets(question([
      { kind: 'diagram', contentMd: '<svg>AI reconstruction</svg>', altText: 'diagram', bbox: null, page: 4 },
      { kind: 'diagram', contentMd: '<svg>also reconstructed</svg>', altText: 'crop me', bbox: [10, 20, 300, 200], page: 4 },
      { kind: 'table', contentMd: null, altText: 'table', bbox: [10, 20, 300, 200], page: 4 },
      { kind: 'image', contentMd: null, altText: 'photo', bbox: [1, 2, 40, 60], page: 4 },
    ]));
    expect(result.assets).toHaveLength(2);
    expect(result.assets.map((asset) => asset.kind)).toEqual(['diagram', 'image']);
    expect(result.assets[0]?.contentMd).toBeNull();
    expect(result.assets[0]?.bbox).toEqual([10, 20, 300, 200]);
  });

  it('auto-approves only a source-backed manually curated leaf whose entire audit passes', () => {
    const base = {
      questionId: 'q', displayRef: 'Q2(a)', visualReady: true, marks: 2, approvedMarkSchemeMarks: 2,
      primarySubtopicCount: 1, crossSyllabusPrimaryCount: 0, learningObjectiveCount: 1, crossSyllabusLoCount: 0,
      otherUnresolvedErrors: 0, sourceBackedManual: true, taxonomyReviewNote: false,
    };
    expect(canAutoApproveAudit(base)).toEqual({ auditPass: true, autoApprove: true });
    expect(canAutoApproveAudit({ ...base, sourceBackedManual: false })).toEqual({ auditPass: true, autoApprove: false });
    expect(canAutoApproveAudit({ ...base, taxonomyReviewNote: true })).toEqual({ auditPass: true, autoApprove: false });
  });

  it('fails the audit when marks, taxonomy, LO or another validation error is unsafe', () => {
    const base = {
      questionId: 'q', displayRef: 'Q', visualReady: true, marks: 3, approvedMarkSchemeMarks: 2,
      primarySubtopicCount: 2, crossSyllabusPrimaryCount: 1, learningObjectiveCount: 0, crossSyllabusLoCount: 0,
      otherUnresolvedErrors: 1, sourceBackedManual: true, taxonomyReviewNote: false,
    };
    expect(canAutoApproveAudit(base)).toEqual({ auditPass: false, autoApprove: false });
  });
});
