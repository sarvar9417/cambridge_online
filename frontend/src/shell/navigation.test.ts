import { describe, expect, it } from 'vitest';
import { navigationFor } from './AppShell';
import { sectionsFor } from '../lib/sections';
import type { ClassItem } from '../lib/api';

const classes: ClassItem[] = [
  { id: 'c1', name: '11-A', grade: 11, level: 'AS', academicYear: '2025/26', studentCount: 12 },
  { id: 'c2', name: '11-B', grade: 11, level: 'AS', academicYear: '2025/26', studentCount: 9 },
];

const labels = (role: 'owner' | 'teacher' | 'student', list = classes) =>
  navigationFor(role, list).map((group) => group.label);

const paths = (role: 'owner' | 'teacher' | 'student', list = classes) =>
  navigationFor(role, list).flatMap((group) => group.items.map((item) => item.path));

describe('who sees which surface', () => {
  it('gives the owner both the management and the teaching surfaces', () => {
    expect(labels('owner')).toEqual(['Boshqaruv', 'O‘qitish', 'Sinflar']);
  });

  it('keeps a teacher out of the management surface entirely', () => {
    // Approving accounts and watching spend is not a teacher's work, and the
    // endpoints behind those pages are owner-only -- showing the links would
    // offer them a 403.
    expect(labels('teacher')).toEqual(['O‘qitish', 'Sinflar']);
    expect(paths('teacher').some((path) => path.startsWith('boshqaruv/'))).toBe(false);
  });

  it('gives a student only their own surface, with no class list', () => {
    expect(labels('student')).toEqual(['O‘rganish']);
    expect(paths('student').every((path) => path.startsWith('oquvchi/'))).toBe(true);
  });

  it('omits the class group rather than showing an empty heading', () => {
    expect(labels('owner', [])).toEqual(['Boshqaruv', 'O‘qitish']);
  });

  it('links each class by id, not by name', () => {
    // Two classes can share a name across academic years; the id is what the
    // page actually needs.
    const classPaths = navigationFor('owner', classes).at(-1)!.items.map((item) => item.path);
    expect(classPaths).toEqual(['oqitish/sinf?id=c1', 'oqitish/sinf?id=c2']);
  });
});

describe('badges', () => {
  it('shows a count only when there is something to do', () => {
    const none = navigationFor('owner', classes, { pendingUsers: 0 });
    const some = navigationFor('owner', classes, { pendingUsers: 3 });
    const find = (groups: ReturnType<typeof navigationFor>) =>
      groups[0]!.items.find((item) => item.path === 'boshqaruv/odamlar')!;
    // Zero is not news. A "0" pill would train the eye to ignore the pill.
    expect(find(none).badge).toBe(0);
    expect(find(some).badge).toBe(3);
  });

  it('puts the review count on the corpus page, where the queue actually is', () => {
    const groups = navigationFor('owner', classes, { reviewQueue: 7 });
    expect(groups[0]!.items.find((item) => item.path === 'boshqaruv/korpus')!.badge).toBe(7);
  });
});

describe('every rail link leads somewhere', () => {
  /** Standalone pages with their own chrome, routed in main.tsx, not by sectionsFor. */
  const STANDALONE = new Set(['oqitish/savol-banki', 'oqitish/tanlovlar']);

  for (const role of ['owner', 'teacher', 'student'] as const) {
    it(`resolves every ${role} link to a page with content`, () => {
      const items = navigationFor(role, classes).flatMap((group) => group.items);
      expect(items.length).toBeGreaterThan(0);

      for (const item of items) {
        const [surface, page = ''] = item.path.split('?')[0]!.split('/');
        // The management pages are components, not section lists.
        if (surface === 'boshqaruv' || STANDALONE.has(item.path)) continue;
        expect({ path: item.path, sections: sectionsFor(surface!, page, role).length })
          .not.toEqual({ path: item.path, sections: 0 });
      }
    });
  }
});
