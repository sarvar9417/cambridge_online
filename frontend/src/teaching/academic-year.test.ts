import { describe, expect, it } from 'vitest';

/**
 * The two date rules the class form depends on, kept here rather than reached
 * through the component: both are pure, and both are wrong in a way that only
 * shows up on one day of the year.
 */
const nextAcademicYear = (current?: string) => {
  const start = current ? Number(current.split('/')[0]) : new Date().getFullYear();
  return `${start + 1}/${start + 2}`;
};

const thisAcademicYear = (now: Date) => {
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${start + 1}`;
};

describe('the academic year a new class defaults to', () => {
  it('starts in September, not January', () => {
    // A class created in October belongs to the year that just started; one
    // created in March belongs to the year that started last autumn. Defaulting
    // to the calendar year would put every spring class in the wrong one.
    expect(thisAcademicYear(new Date('2026-09-01T00:00:00Z'))).toBe('2026/2027');
    expect(thisAcademicYear(new Date('2026-10-15T00:00:00Z'))).toBe('2026/2027');
    expect(thisAcademicYear(new Date('2027-03-10T00:00:00Z'))).toBe('2026/2027');
  });

  it('rolls over on the first of September and not before', () => {
    expect(thisAcademicYear(new Date('2026-08-31T00:00:00Z'))).toBe('2025/2026');
    expect(thisAcademicYear(new Date('2026-09-01T00:00:00Z'))).toBe('2026/2027');
  });
});

describe('the year a rollover proposes', () => {
  it('advances both halves', () => {
    expect(nextAcademicYear('2026/2027')).toBe('2027/2028');
    expect(nextAcademicYear('2029/2030')).toBe('2030/2031');
  });

  it('crosses a decade without breaking', () => {
    expect(nextAcademicYear('2099/2100')).toBe('2100/2101');
  });
});
