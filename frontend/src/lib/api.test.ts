import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, apiBlob, setAccessToken } from './api';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type':'application/json' },
});

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

describe('API access token refresh', () => {
  for (const [name, request] of [
    ['JSON', () => api('/classes')],
    ['download', () => apiBlob('/exports/example/file')],
  ] as const) {
    it.each(['network', 'server', 'retry-network'])(`${name} retains its session after a temporary %s failure`, async (failure) => {
      const browserWindow = new EventTarget();
      const expired = vi.fn();
      browserWindow.addEventListener('campath:auth-expired', expired);
      vi.stubGlobal('window', browserWindow);
      const fetchMock = vi.fn().mockResolvedValueOnce(json(401, {}));
      if (failure === 'network') fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      else if (failure === 'server') fetchMock.mockResolvedValueOnce(json(503, { error: { message: 'Unavailable' } }));
      else fetchMock.mockResolvedValueOnce(json(200, { accessToken: 'new-token' })).mockRejectedValueOnce(new TypeError('Failed to fetch'));
      fetchMock.mockResolvedValue(json(200, { data: [] }));
      vi.stubGlobal('fetch', fetchMock);
      setAccessToken('old-token');

      await expect(request()).rejects.toThrow();
      expect(expired).not.toHaveBeenCalled();
      await request();
      const headers = fetchMock.mock.calls.at(-1)![1].headers as Headers;
      expect(headers.get('Authorization')).toBe(`Bearer ${failure === 'retry-network' ? 'new-token' : 'old-token'}`);
    });

    it.each([401, 403, 410])(`${name} clears the session when refresh definitively fails with %s`, async (status) => {
      const browserWindow = new EventTarget();
      const expired = vi.fn();
      browserWindow.addEventListener('campath:auth-expired', expired);
      vi.stubGlobal('window', browserWindow);
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(json(401, {}))
        .mockResolvedValueOnce(json(status, { error: { message: 'Session rejected' } }))
        .mockResolvedValueOnce(json(200, {}));
      vi.stubGlobal('fetch', fetchMock);
      setAccessToken('old-token');

      await expect(request()).rejects.toThrow('Session rejected');
      expect(expired).toHaveBeenCalledOnce();
      await request();
      expect((fetchMock.mock.calls.at(-1)![1].headers as Headers).has('Authorization')).toBe(false);
    });

    it(`${name} clears the session when the refreshed token is also rejected`, async () => {
      const browserWindow = new EventTarget();
      const expired = vi.fn();
      browserWindow.addEventListener('campath:auth-expired', expired);
      vi.stubGlobal('window', browserWindow);
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(json(401, {}))
        .mockResolvedValueOnce(json(200, { accessToken: 'new-token' }))
        .mockResolvedValueOnce(json(401, { error: { message: 'Access rejected' } }))
        .mockResolvedValueOnce(json(200, {}));
      vi.stubGlobal('fetch', fetchMock);
      setAccessToken('old-token');

      await expect(request()).rejects.toThrow('Access rejected');
      expect(expired).toHaveBeenCalledOnce();
      await request();
      expect((fetchMock.mock.calls.at(-1)![1].headers as Headers).has('Authorization')).toBe(false);
    });
  }

  it('shares one refresh when startup effects request the same session concurrently', async () => {
    const session = { accessToken: 'restored-token', user: { id: 'student' } };
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return json(200, session);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(Promise.all([
      api('/auth/refresh', { method: 'POST' }, { suppressAuthExpired: true }),
      api('/auth/refresh', { method: 'POST' }, { suppressAuthExpired: true }),
    ])).resolves.toEqual([session, session]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Only in-flight requests are shared; a later refresh must rotate again.
    await api('/auth/refresh', { method: 'POST' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares a startup refresh with an automatic refresh after a 401', async () => {
    const session = { accessToken: 'new-token', user: { id: 'student' } };
    let refreshCalls = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).endsWith('/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json(200, session);
      }
      return (init?.headers as Headers).get('Authorization') === 'Bearer new-token'
        ? json(200, { data: [] })
        : json(401, { error: { message: 'expired' } });
    }));
    setAccessToken('old-token');

    await expect(Promise.all([
      api('/auth/refresh', { method: 'POST' }, { suppressAuthExpired: true }),
      api('/classes'),
    ])).resolves.toEqual([session, { data: [] }]);
    expect(refreshCalls).toBe(1);
  });

  it('adds the in-memory access token to requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { data:[] }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('access-token');
    await api('/classes');
    const headers = fetchMock.mock.calls[0]![1]!.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(fetchMock.mock.calls[0]![1]!.credentials).toBe('include');
  });

  it.each([200, 401])('does not reuse a previous account response (%s) after an account switch', async (status) => {
    let release!: (response: Response) => void;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>(resolve => { release = resolve; }))
      .mockResolvedValue(json(200, { data: ['new-account'] }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('previous-account');
    const previous = api('/classes');
    const rejected = expect(previous).rejects.toMatchObject({ code: 'session_changed' });
    setAccessToken('current-account');
    release(json(status, { data: ['previous-account'] }));
    await rejected;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(api('/classes')).resolves.toEqual({ data: ['new-account'] });
    expect((fetchMock.mock.calls.at(-1)![1].headers as Headers).get('Authorization')).toBe('Bearer current-account');
  });

  it.each([200, 401, 410])('an old pending refresh (%s) cannot overwrite or expire a new account', async (status) => {
    const browserWindow = new EventTarget();
    const expired = vi.fn();
    browserWindow.addEventListener('campath:auth-expired', expired);
    vi.stubGlobal('window', browserWindow);
    let release!: (response: Response) => void;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(401, {}))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { release = resolve; }))
      .mockResolvedValue(json(200, { data: ['current-account'] }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('previous-account');
    const previous = api('/classes');
    const rejected = expect(previous).rejects.toMatchObject({ code: 'session_changed' });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    setAccessToken('current-account');
    release(json(status, { accessToken: 'previous-refreshed-token', error: { message: 'Previous session ended' } }));
    await rejected;
    expect(expired).not.toHaveBeenCalled();
    await api('/classes');
    expect((fetchMock.mock.calls.at(-1)![1].headers as Headers).get('Authorization')).toBe('Bearer current-account');
  });

  it('waits for another tab to release the cookie lock before sending a refresh', async () => {
    let unlock!: () => void;
    const heldLock = new Promise<void>(resolve => { unlock = resolve; });
    vi.stubGlobal('navigator', { locks: { request: async (_name: string, action: () => Promise<Response>) => {
      await heldLock;
      return action();
    } } });
    const fetchMock = vi.fn().mockResolvedValue(json(200, { accessToken: 'restored-token' }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = api('/auth/refresh', { method: 'POST' });
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    unlock();
    await expect(pending).resolves.toEqual({ accessToken: 'restored-token' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('discards a login response whose body arrives after another account has signed in', async () => {
    let release!: (body: unknown) => void;
    const response = json(200, {});
    vi.spyOn(response, 'json').mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const fetchMock = vi.fn().mockResolvedValueOnce(response).mockResolvedValue(json(200, { data: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const login = api('/auth/login', { method: 'POST' });
    const rejected = expect(login).rejects.toMatchObject({ code: 'session_changed' });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    setAccessToken('new-account');
    release({ accessToken: 'old-account' });
    await rejected;
    await api('/classes');
    expect((fetchMock.mock.calls.at(-1)![1].headers as Headers).get('Authorization')).toBe('Bearer new-account');
  });

  it('refreshes once and retries a 401 request with the new token', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(401, { error:{ message:'expired' } }))
      .mockResolvedValueOnce(json(200, { accessToken:'new-token',user:{} }))
      .mockResolvedValueOnce(json(200, { data:['ok'] }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('old-token');
    await expect(api('/classes')).resolves.toEqual({ data:['ok'] });
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
        return json(200, { accessToken:'new-token',user:{} });
      }
      const headers = init?.headers as Headers;
      return headers.get('Authorization') === 'Bearer new-token'
        ? json(200, { ok:true })
        : json(401, { error:{ message:'expired' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('old-token');
    await expect(Promise.all([api('/classes'),api('/assignments')]))
      .resolves.toEqual([{ ok:true },{ ok:true }]);
    expect(refreshCalls).toBe(1);
  });

  it('clears the token when refresh fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(401, { error:{ message:'expired' } }))
      .mockResolvedValueOnce(json(401, { error:{ message:'refresh expired' } }))
      .mockResolvedValueOnce(json(401, { error:{ message:'unauthorized' } }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('old-token');
    await expect(api('/classes')).rejects.toThrow('refresh expired');
    await expect(api('/classes')).rejects.toThrow('unauthorized');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const finalHeaders = fetchMock.mock.calls[2]![1]!.headers as Headers;
    expect(finalHeaders.has('Authorization')).toBe(false);
  });

  it('does not announce expiry for an anonymous bootstrap refresh',async()=>{
    const browserWindow=new EventTarget();let events=0;
    browserWindow.addEventListener('campath:auth-expired',()=>{events+=1});
    vi.stubGlobal('window',browserWindow);
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json(401,{error:{message:'No session'}})));
    await expect(api('/auth/refresh',{method:'POST'},{suppressAuthExpired:true})).rejects.toThrow('No session');
    expect(events).toBe(0);
  });
});

describe('Live Exam snapshot synchronisation', () => {
  const sessionId='22222222-2222-4222-8222-222222222222';
  const path=`/live-exams/${sessionId}`;

  it('uses the event cursor to reuse an unchanged authoritative snapshot', async () => {
    const first={session:{version:3},question:{id:'q1'}};
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(json(200,first))
      .mockResolvedValueOnce(json(200,{sessionId,currentVersion:3,changed:false,events:[]}));
    vi.stubGlobal('fetch',fetchMock);
    setAccessToken('live-token');

    await expect(api(path)).resolves.toEqual(first);
    await expect(api(path)).resolves.toEqual(first);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]![0])).toContain(`/live-exams/${sessionId}`);
    expect(String(fetchMock.mock.calls[1]![0])).toContain(`/live-exams/${sessionId}/events?afterVersion=3&limit=1`);
  });

  it('refreshes the full snapshot immediately when the session version advances', async () => {
    const first={session:{version:3},question:{id:'q1'}};
    const next={session:{version:4},question:{id:'q2'}};
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(json(200,first))
      .mockResolvedValueOnce(json(200,{sessionId,currentVersion:4,changed:true,events:[{version:4,type:'question.opened',createdAt:'2026-09-16T05:00:00Z'}]}))
      .mockResolvedValueOnce(json(200,next));
    vi.stubGlobal('fetch',fetchMock);
    setAccessToken('live-token');

    await expect(api(path)).resolves.toEqual(first);
    await expect(api(path)).resolves.toEqual(next);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('falls back to the snapshot if the cursor route is temporarily unavailable', async () => {
    const first={session:{version:3},question:{id:'q1'}};
    const fallback={session:{version:3},question:{id:'q1'},sessionMarker:'fresh'};
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(json(200,first))
      .mockResolvedValueOnce(json(404,{error:{message:'Not found',code:'not_found'}}))
      .mockResolvedValueOnce(json(200,fallback));
    vi.stubGlobal('fetch',fetchMock);
    setAccessToken('live-token');

    await api(path);
    await expect(api(path)).resolves.toEqual(fallback);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
