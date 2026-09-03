const SVG_START = /^\s*<svg\b/i;

export function isSvgAsset(value: string | null | undefined) {
  return Boolean(value && SVG_START.test(value));
}

export function svgAssetDataUrl(value: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`;
}

function enhanceAsset(asset: Element) {
  if (asset.getAttribute('data-visual-enhanced') === 'true') return;
  const source = asset.querySelector('pre');
  const svg = source?.textContent ?? '';
  if (source && isSvgAsset(svg)) {
    const image = document.createElement('img');
    image.className = 'qb-asset-image';
    image.src = svgAssetDataUrl(svg);
    image.alt = asset.querySelector(':scope > span')?.textContent?.split(' · source page')[0]?.trim() || 'Question diagram';
    image.loading = 'eager';
    image.decoding = 'async';
    source.replaceWith(image);
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
 * makes those assets visible instead of showing SVG source code, and makes the
 * diagram action explicit on cards that depend on a visual prompt.
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
