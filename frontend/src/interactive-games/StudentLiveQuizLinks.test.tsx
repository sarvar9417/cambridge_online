import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { StudentLiveQuizLinks } from './StudentLiveQuizLinks';

vi.mock('../lib/api',()=>({api:vi.fn()}));
const mockApi=vi.mocked(api);

describe('Student Live Quiz automatic classroom links',()=>{
  let root:Root,container:HTMLDivElement;
  beforeEach(()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
    mockApi.mockReset();
  });
  afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.useRealTimers();vi.unstubAllGlobals();});

  it('shows the direct join URL when the classroom has a discoverable room',async()=>{
    mockApi.mockResolvedValue({data:[{id:'room-1',pin:'482915',className:'11-A',
      courseCode:'9618',status:'waiting',mode:'classic',playerCount:12,createdAt:new Date().toISOString()}]});
    await act(async()=>{root.render(<StudentLiveQuizLinks/>);await Promise.resolve();});
    expect(mockApi).toHaveBeenCalledWith('/live-quizzes/available');
    expect(container.textContent).toContain('11-A · Classic Quiz');
    expect(container.textContent).toContain('12 o‘quvchi');
    expect(container.querySelector<HTMLAnchorElement>('a[href="#/play/482915"]')?.textContent).toContain('O‘yinga kirish');
  });

  it('always shows the PIN-entry link even without an active classroom game',async()=>{
    mockApi.mockResolvedValue({data:[]});
    await act(async()=>{root.render(<StudentLiveQuizLinks/>);await Promise.resolve();});
    expect(container.querySelector<HTMLAnchorElement>('a[href="#/play"]')?.textContent).toContain('Kodni kiritish');
    expect(container.textContent).toContain('O‘yin kodini kiritib qo‘shiling');
    expect(container.querySelector('.lq-student-discovery-room')).toBeNull();
  });

  it('automatically reveals a newly created class room at the next poll',async()=>{
    vi.useFakeTimers();
    mockApi.mockResolvedValueOnce({data:[]}).mockResolvedValue({data:[{id:'room-2',pin:'654321',
      className:'11-B',courseCode:'9618',status:'active',mode:'treasure',playerCount:2,
      createdAt:new Date().toISOString()}]});
    await act(async()=>{root.render(<StudentLiveQuizLinks/>);await Promise.resolve();});
    expect(container.querySelector('a[href="#/play"]')).not.toBeNull();
    expect(container.querySelector('.lq-student-discovery-room')).toBeNull();
    await act(async()=>{await vi.advanceTimersByTimeAsync(10_000);});
    expect(container.querySelector('a[href="#/play/654321"]')).not.toBeNull();
    expect(container.textContent).toContain('11-B · Treasure Quest');
  });
});
