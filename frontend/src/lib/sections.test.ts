import { describe, expect, it } from 'vitest';
import { sectionsFor, type SectionName } from './sections';

const teacher = (page: string) => sectionsFor('oqitish', page, 'teacher');
const student = (page: string) => sectionsFor('oquvchi', page, 'student');

describe('which sections a page shows', () => {
  it('gives each teaching page its own sections', () => {
    expect(teacher('vazifalar')).toEqual(['teacherAssignments']);
    expect(teacher('tekshirish')).toEqual(['gradingQueue', 'appeals']);
    expect(teacher('oquvchilar')).toEqual(['analytics', 'classes']);
  });

  it('gives each student page its own sections', () => {
    expect(student('vazifalar')).toEqual(['studentAssignments']);
    expect(student('natijalar')).toEqual(['studentResults']);
    expect(student('organish')).toEqual(['studentLearning']);
  });

  it('never shows the same section on two teaching pages', () => {
    // The complaint that started this: every section rendered on every screen,
    // so choosing "Vazifalar" also showed the classes, the appeals and the
    // grading queue underneath.
    const pages = ['vazifalar', 'tekshirish', 'oquvchilar'];
    const seen = new Map<SectionName, string>();
    for (const page of pages) {
      for (const section of teacher(page)) {
        expect(seen.get(section) ?? page).toBe(page);
        seen.set(section, page);
      }
    }
  });

  it('puts every teaching section on some page, so none is orphaned', () => {
    const reachable = new Set(
      ['vazifalar', 'tekshirish', 'oquvchilar', 'sinf', ''].flatMap((page) => teacher(page)),
    );
    for (const section of ['teacherAssignments', 'gradingQueue', 'appeals', 'analytics', 'classes'] as SectionName[]) {
      expect(reachable.has(section)).toBe(true);
    }
  });

  it('puts every student section on some page', () => {
    const reachable = new Set(
      ['vazifalar', 'natijalar', 'organish', ''].flatMap((page) => student(page)),
    );
    for (const section of ['studentHome', 'studentAssignments', 'studentResults', 'studentLearning', 'studentProfile'] as SectionName[]) {
      expect(reachable.has(section)).toBe(true);
    }
  });

  it('lands an unknown page on something useful rather than a blank screen', () => {
    expect(teacher('yoq-sahifa').length).toBeGreaterThan(0);
    expect(student('yoq-sahifa').length).toBeGreaterThan(0);
    expect(teacher('')).toEqual(teacher('boshqa'));
  });

  it('shows a teacher nothing on a student URL, not an empty student screen', () => {
    // The rail keeps roles apart, but a URL can be typed or shared.
    expect(sectionsFor('oquvchi', 'natijalar', 'teacher')).toEqual([]);
    expect(sectionsFor('oquvchi', 'organish', 'owner')).toEqual([]);
  });

  it('gives a student their own page when a teaching URL names one they have', () => {
    // The role decides which set of sections exists; the page name only picks
    // among that role's pages. A student following a stale /oqitish link gets
    // their own assignments, never a teacher's.
    expect(sectionsFor('oqitish', 'natijalar', 'student')).toEqual(['studentResults']);
    expect(sectionsFor('oqitish', 'vazifalar', 'student')).toEqual(['studentAssignments']);
  });

  it('falls back to the student home for a page only teachers have', () => {
    expect(sectionsFor('oqitish', 'tekshirish', 'student'))
      .toEqual(['studentHome', 'studentProfile']);
  });

  it('lets an owner work as a teacher, since they do both jobs', () => {
    expect(sectionsFor('oqitish', 'vazifalar', 'owner')).toEqual(['teacherAssignments']);
  });
});
