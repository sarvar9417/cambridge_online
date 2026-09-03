import { describe, expect, it } from 'vitest';
import { applyVisualPresence, browserAssetProjection, readBrowserAssetProjection } from './question-visual-fidelity.js';

describe('question visual fidelity middleware helpers', () => {
  it('marks a leaf from ancestor-derived visual presence and applies the diagram filter', () => {
    const body = {
      view: 'parts',
      data: [
        { id: 'a', displayRef: 'Q1(a)', hasDiagram: false },
        { id: 'b', displayRef: 'Q1(b)', hasDiagram: false },
      ],
    };
    const result = applyVisualPresence(body, new Map([['a', true], ['b', false]]), true) as typeof body;
    expect(result.data).toEqual([{ id: 'a', displayRef: 'Q1(a)', hasDiagram: true }]);
  });

  it('recomputes family matchCount after ancestor-aware filtering', () => {
    const body = {
      view: 'families',
      data: [{ rootId: 'r', matchCount: 2, parts: [
        { id: 'a', matches: true },
        { id: 'b', matches: true },
      ] }],
    };
    const result = applyVisualPresence(body, new Map([['a', true], ['b', false]]), true) as typeof body;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.matchCount).toBe(1);
    expect(result.data[0]?.parts[0]).toMatchObject({ id: 'a', hasDiagram: true, matches: true });
    expect(result.data[0]?.parts[1]).toMatchObject({ id: 'b', hasDiagram: false, matches: false });
  });

  it('projects only signed private image URLs and can decode the browser marker', () => {
    const source = {
      assets: [{
        id: 'asset-1', kind: 'diagram', storagePath: 'supabase://question-assets/a.png',
        url: 'https://project.supabase.co/storage/v1/object/sign/question-assets/a.png?token=temporary',
        contentMd: null,
      }],
    };
    const projected = browserAssetProjection(source) as typeof source;
    const marker = projected.assets[0]?.contentMd ?? '';
    expect(marker).toContain('[[browser_asset_url:');
    expect(readBrowserAssetProjection(marker)).toBe(source.assets[0]?.url);
  });

  it('does not project non-visual or non-https URLs', () => {
    const textAsset = browserAssetProjection({ kind: 'text', storagePath: 'x', url: 'https://example.com/a', contentMd: null }) as Record<string, unknown>;
    expect(textAsset.contentMd).toBeNull();
    expect(readBrowserAssetProjection('[[browser_asset_url:javascript%3Aalert(1)]]')).toBeNull();
  });
});
