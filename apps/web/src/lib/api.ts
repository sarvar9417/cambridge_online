const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

/**
 * The access token is held in memory only. `localStorage` survives XSS; a
 * variable does not, and the refresh cookie is httpOnly so a reload can recover
 * the session without ever exposing a long-lived credential to script.
 */
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * One shared refresh promise. Several requests failing at once must not each
 * rotate the cookie: rotation is single use, and the losers would be treated as
 * token reuse and log the user out.
 */
let refreshInFlight: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  refreshInFlight ??= (async () => {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new ApiError(response.status, 'invalid_refresh', 'Sessiya tugagan.');
    const body = (await response.json()) as { accessToken: string };
    setAccessToken(body.accessToken);
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function send(path: string, init: RequestInit, token: string | null) {
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (init.body) headers.set('content-type', 'application/json');
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokenUsed = accessToken;
  let response = await send(path, init, tokenUsed);

  const canRetry = response.status === 401 && Boolean(tokenUsed) && !path.startsWith('/auth/');
  if (canRetry) {
    try {
      if (accessToken === tokenUsed) await refreshSession();
      response = await send(path, init, accessToken);
    } catch (error) {
      setAccessToken(null);
      throw error;
    }
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'request_failed',
      body?.error?.message ?? 'So‘rov bajarilmadi.',
    );
  }
  return body as T;
}
