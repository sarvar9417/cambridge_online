// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOOK_COMPLETENESS_AUDITS } from './book-completeness-audit';
import { BOOK_COMPLETENESS_BASELINES, type BookAuditChapter } from './book-completeness-baseline';
import { rawPdfEmphasisForChapter } from './raw-pdf-emphasis-baseline';

const expectedInventory: Record<BookAuditChapter, Record<string, number>> = {
  1: {
    pages: 26,
    rawPdfEmphasis: 42,
    keyTerms: 31,
    examples: 8,
    activities: 9,
    extensionActivities: 4,
    figures: 9,
    tables: 9,
    findOutMore: 0,
    links: 0,
    pseudocodePages: 0,
    chapterReview: 6,
    checkpoints: 17,
  },
  7: {
    pages: 41,
    rawPdfEmphasis: 77,
    keyTerms: 30,
    examples: 7,
    activities: 20,
    extensionActivities: 1,
    figures: 22,
    tables: 6,
    findOutMore: 7,
    links: 4,
    pseudocodePages: 28,
    chapterReview: 9,
    checkpoints: 9,
  },
  13: {
    pages: 24,
    rawPdfEmphasis: 51,
    keyTerms: 18,
    examples: 9,
    activities: 9,
    extensionActivities: 6,
    figures: 16,
    tables: 2,
    findOutMore: 0,
    links: 0,
    pseudocodePages: 8,
    chapterReview: 5,
    checkpoints: 16,
  },
};

afterEach(()=>{
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('formal Book Completeness Audit', () => {
  for (const chapter of [1, 7, 13] as const) {
    it(`locks Chapter ${chapter} to the independently inventoried supplied PDF`, () => {
      const baseline = BOOK_COMPLETENESS_BASELINES[chapter];
      const expected = expectedInventory[chapter];
      expect(baseline.pageCount).toBe(expected.pages);
      expect(rawPdfEmphasisForChapter(chapter)).toHaveLength(expected.rawPdfEmphasis);
      expect(baseline.keyTerms).toHaveLength(expected.keyTerms);
      expect(baseline.examples).toHaveLength(expected.examples);
      expect(baseline.activities).toHaveLength(expected.activities);
      expect(baseline.extensionActivities).toHaveLength(expected.extensionActivities);
      expect(baseline.figures).toHaveLength(expected.figures);
      expect(baseline.tables).toHaveLength(expected.tables);
      expect(baseline.findOutMore).toHaveLength(expected.findOutMore);
      expect(baseline.links).toHaveLength(expected.links);
      expect(baseline.pseudocodePages).toHaveLength(expected.pseudocodePages);
      expect(baseline.chapterReviewAnchors).toHaveLength(expected.chapterReview);
      expect(baseline.expectedCheckpointCount).toBe(expected.checkpoints);
    });

    it(`fails closed unless every Chapter ${chapter} completeness category is covered`, () => {
      const audit = BOOK_COMPLETENESS_AUDITS[chapter];
      expect(audit.checksExpected).toBeGreaterThan(0);
      expect(audit.categories.raw_pdf_emphasis?.expected).toBe(expectedInventory[chapter].rawPdfEmphasis);
      expect(audit.categories.raw_pdf_emphasis?.covered).toBe(expectedInventory[chapter].rawPdfEmphasis);
      for (const [category, result] of Object.entries(audit.categories)) {
        expect(result.missing, `${category}: ${result.missing.join(' | ')}`).toEqual([]);
        expect(result.covered, category).toBe(result.expected);
        expect(result.complete, category).toBe(true);
      }
      expect(audit.checksCovered).toBe(audit.checksExpected);
      expect(audit.complete).toBe(true);
    });
  }

  it('keeps every declared past-paper enrichment key implemented in the Cambridge Exam Lens', async () => {
    const pending: VoidFunction[]=[];
    vi.stubGlobal('queueMicrotask',(callback:VoidFunction)=>pending.push(callback));
    vi.stubGlobal('MutationObserver',class {
      constructor(_callback:MutationCallback){}
      observe(){}
      disconnect(){}
      takeRecords(){return [] as MutationRecord[];}
    });

    const keys=[1,7,13].flatMap((chapter)=>BOOK_COMPLETENESS_BASELINES[chapter as BookAuditChapter].examEnrichmentKeys);
    document.body.innerHTML = keys
      .map((key) => `<section class="exam-host"><div class="lesson-checkpoint-contract"><strong>${key}</strong></div></section>`)
      .join('');
    vi.resetModules();
    const { installLessonExamInsights } = await import('./lesson-exam-insights');
    const release = installLessonExamInsights();
    try {
      while(pending.length)pending.shift()!();

      const hosts=[...document.querySelectorAll<HTMLElement>('.exam-host')];
      expect(hosts).toHaveLength(keys.length);
      hosts.forEach((host,index)=>{
        expect(host.querySelector('.lesson-exam-insight'), `Missing Cambridge Exam Lens key ${keys[index]}`).not.toBeNull();
      });
    } finally {
      release();
    }
  });
});
