import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const SIX_DIGIT_SEGMENT = /(^|\/)\d{6}(?=\/|$)/g;

export function requestIdFromHeader(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}

export function observablePath(path: string) {
  return path
    .replace(UUID_PATTERN, ':uuid')
    .replace(SIX_DIGIT_SEGMENT, '$1:code');
}

const defaultInfo = (line:string) => {
  if (process.env.NODE_ENV !== 'test') console.log(line);
};
const defaultError = (line:string) => {
  if (process.env.NODE_ENV !== 'test') console.error(line);
};

export function requestObservability(
  write: (line: string) => void = defaultInfo,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = requestIdFromHeader(req.headers['x-request-id']);
    const started = process.hrtime.bigint();
    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    res.once('finish', () => {
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      const actor = req.actor;
      write(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'http.request',
        requestId,
        method: req.method,
        path: observablePath(req.path),
        status: res.statusCode,
        durationMs: Math.round(elapsedMs * 10) / 10,
        ...(actor ? { role: actor.role } : {}),
      }));
    });
    next();
  };
}

export function logRequestFailure(
  req: Request,
  res: Response,
  error: unknown,
  category: 'database_unavailable' | 'internal_error',
  write: (line: string) => void = defaultError,
) {
  const value = error as { name?: unknown; code?: unknown } | null;
  write(JSON.stringify({
    ts: new Date().toISOString(),
    event: 'http.error',
    requestId: typeof res.locals.requestId === 'string' ? res.locals.requestId : null,
    method: req.method,
    path: observablePath(req.path),
    category,
    errorName: typeof value?.name === 'string' ? value.name : 'UnknownError',
    errorCode: typeof value?.code === 'string' ? value.code : null,
    ...(req.actor ? { role: req.actor.role } : {}),
  }));
}
