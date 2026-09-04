import { describe, expect, it } from 'vitest';
import type { AssetUrlSigner } from '../jobs/asset-store.js';
import { materializeStoredExportAssets, pngBytesToInlineSvg } from './materialize-export-assets.js';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('source crop export materialization', () => {
  it('wraps a PNG as a self-contained SVG accepted by existing exporters', () => {
    const svg = pngBytesToInlineSvg(onePixelPng);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 1 1"');
    expect(svg).toContain('data:image/png;base64,');
  });

  it('materializes storage-only assets while preserving semantic table assets', async () => {
    const signer: AssetUrlSigner = {
      signStoragePath: async (path) => path ? 'https://example.test/source.png' : null,
    };
    const output = await materializeStoredExportAssets([
      {
        displayRef:'Q1',stem:'Use the source layout.',marks:2,
        contextBlocks:[{assets:[
          {kind:'image',storagePath:'supabase://question-assets/source.png',altText:'Source crop'},
          {kind:'table',contentMd:'| A | B |\n| --- | --- |\n| 1 | 2 |',altText:'Table'},
        ]}],
      },
    ], signer, async () => new Response(onePixelPng, {status:200,headers:{'content-type':'image/png'}}));

    const assets = output[0]!.contextBlocks![0]!.assets!;
    expect(assets[0]!.contentMd).toContain('<svg');
    expect(assets[1]!.contentMd).toContain('| A | B |');
  });
});
