const SVG_START = /^\s*<svg\b/i;
const BROWSER_ASSET_PREFIX = '[[browser_asset_url:';

export function isSvgAsset(value: string | null | undefined) {
  return Boolean(value && SVG_START.test(value));
}

export function svgAssetDataUrl(value: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`;
}

export function browserAssetUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed.startsWith(BROWSER_ASSET_PREFIX) || !trimmed.endsWith(']]')) return null;
  try {
    const url = decodeURIComponent(trimmed.slice(BROWSER_ASSET_PREFIX.length, -2));
    return /^https:\/\//i.test(url) || /^http:\/\/localhost(?::\d+)?\//i.test(url) ? url : null;
  } catch {
    return null;
  }
}

function replaceWithImage(asset: Element, source: Element, url: string) {
  const image = document.createElement('img');
  image.className = 'qb-asset-image';
  image.src = url;
  image.alt = asset.querySelector(':scope > span')?.textContent?.split(' · source page')[0]?.trim() || 'Question diagram';
  image.loading = 'eager';
  image.decoding = 'async';
  source.replaceWith(image);
}

function enhanceAsset(asset: Element) {
  if (asset.getAttribute('data-visual-enhanced') === 'true') return;
  const source = asset.querySelector('pre');
  const value = source?.textContent ?? '';
  if (source && isSvgAsset(value)) {
    replaceWithImage(asset, source, svgAssetDataUrl(value));
  } else if (source) {
    const signedUrl = browserAssetUrl(value);
    if (signedUrl) replaceWithImage(asset, source, signedUrl);
  }
  asset.setAttribute('data-visual-enhanced', 'true');
}

function clarifyDiagramAction(card: Element) {
  if (![...card.querySelectorAll('.qb-chip')].some((chip) => chip.textContent?.trim() === 'Diagramma')) return;
  const button = [...card.querySelectorAll<HTMLButtonElement>('button')]
    .find((candidate) => candidate.textContent?.trim() === 'Kontekst');
  if (button) {
    button.textContent = 'Diagramma / kontekst';
    button.title = 'Savolga tegishli original diagramma va shared contextni ko‘rish';
  }
}

function enhance(root: ParentNode = document) {
  root.querySelectorAll('.qb-asset').forEach(enhanceAsset);
  root.querySelectorAll('.qb-question-card').forEach(clarifyDiagramAction);
}

/**
 * Question Bank already receives portable assets from the backend. This layer
 * makes inline SVG and private-storage crops visible as images instead of source
 * text, and makes the diagram action explicit on cards that depend on a visual
 * prompt.
 */
export function installQuestionAssetFidelityEnhancer() {
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      enhance();
    });
  };
  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
