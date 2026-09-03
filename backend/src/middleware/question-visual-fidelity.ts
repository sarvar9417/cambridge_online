import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Pool } from 'pg';

const BROWSER_ASSET_PREFIX = '[[browser_asset_url:';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function browserAssetProjection(body: unknown): unknown {
  if (Array.isArray(body)) return body.map(browserAssetProjection);
  if (!isRecord(body)) return body;

  const projected: JsonRecord = {};
  for (const [key, value] of Object.entries(body)) projected[key] = browserAssetProjection(value);

  const url = typeof projected.url === 'string' ? projected.url : '';
  const storagePath = typeof projected.storagePath === 'string' ? projected.storagePath : '';
  const contentMd = typeof projected.contentMd === 'string' ? projected.contentMd.trim() : '';
  const kind = typeof projected.kind === 'string' ? projected.kind : '';
  if (url && storagePath && !contentMd && (kind === 'diagram' || kind === 'image')) {
    projected.contentMd = `${BROWSER_ASSET_PREFIX}${encodeURIComponent(url)}]]`;
  }
  return projected;
}

export function readBrowserAssetProjection(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith(BROWSER_ASSET_PREFIX) || !trimmed.endsWith(']]')) return null;
  const encoded = trimmed.slice(BROWSER_ASSET_PREFIX.length, -2);
  try {
    const url = decodeURIComponent(encoded);
    return /^https:\/\//i.test(url) || /^http:\/\/localhost(?::\d+)?\//i.test(url) ? url : null;
  } catch {
    return null;
  }
}

function requestedDiagramFilter(req: Request) {
  if (req.method !== 'GET' || req.path !== '/') return null;
  const parsed = new URL(req.url, 'http://question-bank.local');
  const raw = parsed.searchParams.get('hasDiagram');
  if (raw !== 'true' && raw !== 'false') return null;
  parsed.searchParams.delete('hasDiagram');
  req.url = `${parsed.pathname}${parsed.search ? parsed.search : ''}`;
  return raw === 'true';
}

function collectQuestionIds(body: unknown) {
  if (!isRecord(body) || !Array.isArray(body.data)) return [] as string[];
  const ids = new Set<string>();
  for (const item of body.data) {
    if (!isRecord(item)) continue;
    if (typeof item.id === 'string') ids.add(item.id);
    if (Array.isArray(item.parts)) {
      for (const part of item.parts) if (isRecord(part) && typeof part.id === 'string') ids.add(part.id);
    }
  }
  return [...ids];
}

async function visualPresence(pool: Pool, ids: string[]) {
  if (!ids.length) return new Map<string, boolean>();
  const result = await pool.query(
    `with recursive chain as (
       select q.id leaf_id,q.id node_id,q.parent_id
       from questions q where q.id=any($1::uuid[])
       union all
       select c.leaf_id,p.id,p.parent_id
       from chain c join questions p on p.id=c.parent_id
     )
     select c.leaf_id,
       bool_or(
         qa.id is not null
         and qa.kind in ('diagram','image')
         and (
           nullif(qa.content_md,'') is not null
           or nullif(qa.storage_path,'') is not null
           or nullif(qa.svg_markup,'') is not null
         )
       ) has_visual
     from chain c
     left join question_assets qa on qa.question_id=c.node_id
     group by c.leaf_id`,
    [ids],
  );
  return new Map(result.rows.map((row) => [String(row.leaf_id), Boolean(row.has_visual)]));
}

export function applyVisualPresence(body: unknown, presence: Map<string, boolean>, requested: boolean | null) {
  if (!isRecord(body) || !Array.isArray(body.data)) return body;
  if (body.view === 'parts') {
    const data = body.data
      .filter(isRecord)
      .map((part) => ({ ...part, hasDiagram: presence.get(String(part.id)) ?? false }))
      .filter((part) => requested === null || part.hasDiagram === requested);
    return { ...body, data };
  }
  if (body.view === 'families') {
    const families = body.data.filter(isRecord).map((family) => {
      const parts = Array.isArray(family.parts) ? family.parts.filter(isRecord).map((part) => {
        const hasDiagram = presence.get(String(part.id)) ?? false;
        const matches = Boolean(part.matches) && (requested === null || hasDiagram === requested);
        return { ...part, hasDiagram, matches };
      }) : [];
      return { ...family, parts, matchCount: parts.filter((part) => part.matches).length };
    }).filter((family) => requested === null || Number(family.matchCount) > 0);
    return { ...body, data: families };
  }
  return body;
}

/**
 * Browser-facing fidelity layer for the Question Bank.
 *
 * - The repository historically considered only assets attached directly to a
 *   leaf. Cambridge diagrams often live on a parent/context node, so list chips
 *   and the hasDiagram filter are corrected against the whole ancestor chain.
 * - Private storage assets already receive short-lived URLs from the repository.
 *   The projection exposes that URL through contentMd only in HTTP responses so
 *   the existing React/DOM renderer can display it without changing persisted
 *   source provenance or export data.
 */
export function createQuestionVisualFidelityMiddleware(pool: Pool): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const requested = requestedDiagramFilter(req);
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      const ids = collectQuestionIds(body);
      void visualPresence(pool, ids)
        .then((presence) => applyVisualPresence(body, presence, requested))
        .then(browserAssetProjection)
        .then((projected) => originalJson(projected))
        .catch(next);
      return res;
    }) as typeof res.json;
    next();
  };
}
