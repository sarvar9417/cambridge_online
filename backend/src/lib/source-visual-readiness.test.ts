import { describe, expect, it } from 'vitest';
import {
  portableSourceVisualAssetRenderable,
  renderableVisualAssetSql,
  sourceVisualAssetRenderable,
  unrenderableVisualAssetSql,
} from './source-visual-readiness.js';

describe('source visual readiness', () => {
  it('accepts a storage-backed Cambridge visual', () => {
    expect(sourceVisualAssetRenderable({
      kind:'diagram',
      storagePath:'supabase://question-assets/source/diagram.png',
      contentMd:null,
    })).toBe(true);
  });

  it('accepts direct and XML-prefixed SVG source', () => {
    expect(sourceVisualAssetRenderable({
      kind:'diagram',
      contentMd:'<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>',
    })).toBe(true);
    expect(sourceVisualAssetRenderable({
      kind:'image',
      contentMd:'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>',
    })).toBe(true);
  });

  it('accepts fenced legacy SVG but not prose or partial markup', () => {
    expect(sourceVisualAssetRenderable({
      kind:'diagram',
      contentMd:'```svg\n<svg><path d="M0 0"/></svg>\n```',
    })).toBe(true);
    expect(sourceVisualAssetRenderable({
      kind:'diagram',
      contentMd:'Use the original PDF for the exact diagram.',
    })).toBe(false);
    expect(sourceVisualAssetRenderable({
      kind:'diagram',
      contentMd:'<svg><path d="M0 0"/>',
    })).toBe(false);
  });

  it('does not classify semantic non-visual assets as renderable visuals', () => {
    expect(sourceVisualAssetRenderable({
      kind:'table',
      contentMd:'| A | B |\n|---|---|\n|0|1|',
    })).toBe(false);
  });
  it('requires a signed browser URL when a portable visual is storage-backed', () => {
    expect(portableSourceVisualAssetRenderable({
      kind:'diagram',
      storagePath:'legacy/private.png',
      url:null,
      contentMd:null,
    })).toBe(false);
    expect(portableSourceVisualAssetRenderable({
      kind:'diagram',
      storagePath:'legacy/private.png',
      url:'https://example.test/signed.png',
      contentMd:null,
    })).toBe(true);
  });


  it('keeps SQL predicates aligned with storage, content SVG and svg_markup recovery', () => {
    const ready=renderableVisualAssetSql('asset');
    const broken=unrenderableVisualAssetSql('asset');
    expect(ready).toContain("asset.storage_path");
    expect(ready).toContain("asset.content_md");
    expect(ready).toContain("asset.svg_markup");
    expect(ready).toContain("<\\\\?xml");
    expect(broken).toContain('not');
  });
});
