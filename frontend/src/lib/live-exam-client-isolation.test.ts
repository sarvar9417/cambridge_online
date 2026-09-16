import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, setAccessToken } from './api';

const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{
  status,
  headers:{'content-type':'application/json'},
});

const sessionId='22222222-2222-4222-8222-222222222222';
const path=`/live-exams/${sessionId}`;

afterEach(()=>{
  setAccessToken(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Live Exam client isolation and recovery',()=>{
  it('never reuses one authenticated learner snapshot after the access token changes',async()=>{
    const learnerA={session:{version:7},ownAnswer:{text:'A private answer'}};
    const learnerB={session:{version:7},ownAnswer:{text:'B private answer'}};
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(json(200,learnerA))
      .mockResolvedValueOnce(json(200,learnerB));
    vi.stubGlobal('fetch',fetchMock);

    setAccessToken('student-a-token');
    await expect(api(path)).resolves.toEqual(learnerA);

    setAccessToken('student-b-token');
    await expect(api(path)).resolves.toEqual(learnerB);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]![0])).toContain(`/live-exams/${sessionId}`);
    expect(String(fetchMock.mock.calls[1]![0])).not.toContain('/events?');
    const headers=fetchMock.mock.calls[1]![1]!.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer student-b-token');
  });

  it('forces an authoritative full snapshot after the recovery window even without an event hint',async()=>{
    let now=1_000_000;
    vi.spyOn(Date,'now').mockImplementation(()=>now);
    const first={session:{version:4},participantMarker:'first'};
    const recovered={session:{version:4},participantMarker:'presence-refreshed'};
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(json(200,first))
      .mockResolvedValueOnce(json(200,recovered));
    vi.stubGlobal('fetch',fetchMock);
    setAccessToken('live-token');

    await expect(api(path)).resolves.toEqual(first);
    now+=15_001;
    await expect(api(path)).resolves.toEqual(recovered);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]![0])).toContain(`/live-exams/${sessionId}`);
    expect(String(fetchMock.mock.calls[1]![0])).not.toContain('/events?');
  });
});
