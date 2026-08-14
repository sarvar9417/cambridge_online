import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, setAccessToken } from './api';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

describe('API access token refresh', () => {
  it('adds the in-memory access token to requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { data: [] }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('access-token');
    await api('/classes');
    const headers = fetchMock.mock.calls[0]![1]!.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(fetchMock.mock.calls[0]![1]!.credentials).toBe('include');
  });

  it('refreshes once and retries a 401 request with the new token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: { message: 'expired' } }))
      .mockResolvedValueOnce(json(200, { accessToken: 'new-token', user: {} }))
      .mockResolvedValueOnce(json(200, { data: ['ok'] }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('old-token');
    await expect(api('/classes')).resolves.toEqual({ data: ['ok'] });
    expect(String(fetchMock.mock.calls[1]![0])).toContain('/auth/refresh');
    const retryHeaders = fetchMock.mock.calls[2]![1]!.headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-token');
  });

  it('shares one refresh across concurrent 401 responses', async () => {
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json(200, { accessToken: 'new-token', user: {} });
      }
      const headers = init?.headers as Headers;
      return headers.get('Authorization') === 'Bearer new-token'
        ? json(200, { ok: true })
        : json(401, { error: { message: 'expired' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('old-token');
    await expect(Promise.all([api('/classes'), api('/assignments')])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
    expect(refreshCalls).toBe(1);
  });

  it('clears the token when refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: { message: 'expired' } }))
      .mockResolvedValueOnce(json(401, { error: { message: 'refresh expired' } }))
      .mockResolvedValueOnce(json(401, { error: { message: 'unauthorized' } }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('old-token');
    await expect(api('/classes')).rejects.toThrow('refresh expired');
    await expect(api('/classes')).rejects.toThrow('unauthorized');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const finalHeaders = fetchMock.mock.calls[2]![1]!.headers as Headers;
    expect(finalHeaders.has('Authorization')).toBe(false);
  });
});
