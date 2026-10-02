import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, type User } from '../lib/api';
import { ClassesPage } from './ClassesPage';

vi.mock('../lib/api', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  api: vi.fn(),
}));

const teacher: User = {
  id: 'teacher', fullName: 'Teacher', role: 'teacher', schoolId: 'school',
};

const roster = (id: string, name: string) => ({
  roster: {
    id, name, grade: 11, level: 'AS' as const, academicYear: '2026/2027',
    archivedAt: null, ownerId: teacher.id,
    teachers: [{ id: teacher.id, fullName: teacher.fullName }], students: [],
  },
});

describe('Classes page route changes', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.mocked(api).mockReset();
    window.history.replaceState(null, '', '/#oqitish/sinf?id=old-class');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('clears the old roster while a newly routed class loads', async () => {
    let finishNewRoster: ((value: ReturnType<typeof roster>) => void) | undefined;
    vi.mocked(api).mockImplementation(async url => {
      if (url === '/classes/unassigned-students') return { students: [] } as never;
      if (url === '/classes/old-class/roster') return roster('old-class', 'Old archived class') as never;
      if (url === '/classes/new-class/roster') {
        return await new Promise<ReturnType<typeof roster>>(resolve => { finishNewRoster = resolve; }) as never;
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await act(async () => root.render(<ClassesPage user={teacher} classes={[]} onChanged={() => undefined} />));
    expect(container.textContent).toContain('Old archived class');

    await act(async () => {
      window.location.hash = 'oqitish/sinf?id=new-class';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(container.textContent).toContain('Yuklanmoqda');
    expect(container.textContent).not.toContain('Old archived class');

    await act(async () => finishNewRoster!(roster('new-class', 'New active class')));
    expect(container.textContent).toContain('New active class');
  });
});
