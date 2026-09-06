import { portableTableBlock } from './portable-source-assets';

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

function assetKind(asset: Element) {
  return asset.querySelector(':scope > strong')?.textContent?.trim().toLowerCase() ?? '';
}

function sourcePage(asset: Element) {
  const label = asset.querySelector(':scope > span')?.textContent ?? '';
  const match = label.match(/source page\s+(\d+)/i);
  return match ? Number(match[1]) : 1;
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

function unavailable(source: Element, kind: string) {
  const notice = document.createElement('div');
  notice.className = 'qb-asset-unavailable';
  notice.setAttribute('role', 'alert');
  notice.dataset.sourceAssetUnavailable = 'true';
  notice.textContent = kind === 'table'
    ? 'Original jadval yuklanmadi.'
    : 'Original diagramma yuklanmadi.';
  source.replaceWith(notice);
}

function renderTable(asset: Element, source: Element, value: string) {
  const block = portableTableBlock({
    id: '00000000-0000-4000-8000-000000000000',
    kind: 'table',
    altText: asset.querySelector(':scope > span')?.textContent ?? 'Table',
    contentMd: value,
  }, { page: sourcePage(asset) });
  if (!block) {
    unavailable(source, 'table');
    return;
  }

  const table = document.createElement('table');
  table.className = `structured-question-table structured-question-${block.kind.replaceAll('_', '-')}`;
  table.dataset.questionBlock = 'table';
  table.dataset.tableKind = block.kind;
  if (block.headers.length) {
    const thead = document.createElement('thead');
    const row = document.createElement('tr');
    for (const header of block.headers) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = header;
      row.append(th);
    }
    thead.append(row);
    table.append(thead);
  }
  const editable = new Set(block.editableCells.map(([row, column]) => `${row}:${column}`));
  const tbody = document.createElement('tbody');
  block.rows.forEach((cells, rowIndex) => {
    const row = document.createElement('tr');
    cells.forEach((cellValue, columnIndex) => {
      const cell = document.createElement('td');
      cell.textContent = cellValue ?? '';
      if (editable.has(`${rowIndex}:${columnIndex}`)) cell.dataset.editable = 'true';
      row.append(cell);
    });
    tbody.append(row);
  });
  table.append(tbody);
  source.replaceWith(table);
}

function renderCode(source: Element, value: string) {
  const pre = document.createElement('pre');
  pre.className = 'structured-question-code qb-asset-code';
  pre.dataset.questionBlock = 'code';
  const code = document.createElement('code');
  const fenced = value.trim().match(/^```([^\n]*)\n([\s\S]*?)\n```$/);
  if (fenced?.[1]?.trim()) code.dataset.language = fenced[1].trim();
  code.textContent = (fenced?.[2] ?? value).trim();
  pre.append(code);
  source.replaceWith(pre);
}

export function enhanceQuestionAsset(asset: Element) {
  if (asset.getAttribute('data-visual-enhanced') === 'true') return;
  const source = asset.querySelector(':scope > pre');
  const value = source?.textContent ?? '';
  const kind = assetKind(asset);

  if (source && isSvgAsset(value)) {
    replaceWithImage(asset, source, svgAssetDataUrl(value));
  } else if (source) {
    const signedUrl = browserAssetUrl(value);
    if (signedUrl) {
      replaceWithImage(asset, source, signedUrl);
    } else if (kind === 'table') {
      renderTable(asset, source, value);
    } else if (kind === 'pseudocode' || kind === 'code') {
      renderCode(source, value);
    } else if (kind === 'diagram' || kind === 'image') {
      // A prose/ASCII description is repair evidence, not the Cambridge visual.
      // Never show it to teachers/students as if it were the original diagram.
      unavailable(source, kind);
    }
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
  root.querySelectorAll('.qb-asset').forEach(enhanceQuestionAsset);
  root.querySelectorAll('.qb-question-card').forEach(clarifyDiagramAction);
}

/**
 * Question Bank already receives portable assets from the backend. This layer
 * makes source-backed visuals and semantic context render as the question
 * actually needs them: images/SVG as images, tables as tables and pseudocode
 * as code. Flattened diagram descriptions fail closed instead of leaking into
 * the classroom as a false visual substitute.
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
