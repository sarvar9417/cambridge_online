import type { User } from './api';

/**
 * Every section the application can render, named.
 *
 * Naming them lets the rule "which section belongs on which page" live in one
 * pure function that can be checked, instead of being spread through the JSX as
 * conditions that are only observable by clicking.
 */
export type SectionName =
  | 'studentAssignments'
  | 'studentResults'
  | 'studentLearning'
  | 'studentProfile'
  | 'classes'
  | 'analytics'
  | 'appeals'
  | 'teacherAssignments'
  | 'gradingQueue';

const STUDENT_SECTIONS = new Set<SectionName>([
  'studentAssignments', 'studentResults', 'studentLearning', 'studentProfile',
]);

/**
 * Which sections a page shows.
 *
 * Before this, every section rendered on every screen: choosing "Vazifalar" in
 * the rail put the class list, the appeals, the grading queue and a question
 * preview underneath it. A section that appears everywhere answers nothing.
 *
 * The role check is not redundant with the navigation. The rail already keeps a
 * teacher away from student pages, but a URL can be typed or shared, and a
 * teacher landing on a student page should get nothing rather than a student
 * screen filled with their own empty data.
 */
export function sectionsFor(
  surface: string,
  page: string,
  role: User['role'],
): SectionName[] {
  const sections = pick(surface, page, role);
  return sections.filter((section) => (role === 'student'
    ? STUDENT_SECTIONS.has(section)
    : !STUDENT_SECTIONS.has(section)));
}

function pick(surface: string, page: string, role: User['role']): SectionName[] {
  if (role === 'student' || surface === 'oquvchi') {
    switch (page) {
      case 'vazifalar': return ['studentAssignments'];
      case 'natijalar': return ['studentResults'];
      case 'organish': return ['studentLearning'];
      // Home is what a student sees on the way in: what is due, and who they are.
      default: return ['studentAssignments', 'studentProfile'];
    }
  }

  switch (page) {
    case 'vazifalar': return ['teacherAssignments'];
    // An appeal is a student disputing a mark, which is the same sitting as
    // working through the grading queue.
    case 'tekshirish': return ['gradingQueue', 'appeals'];
    case 'oquvchilar': return ['analytics', 'classes'];
    case 'sinf': return ['classes', 'analytics'];
    default: return ['classes', 'analytics'];
  }
}
