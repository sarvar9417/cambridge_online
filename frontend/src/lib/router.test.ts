import { describe, expect, it } from 'vitest';
import { HOME_BY_ROLE, parseRoute } from './router';

describe('parseRoute', () => {
  it('splits a surface and a page', () => {
    const route = parseRoute('#boshqaruv/odamlar');
    expect(route.surface).toBe('boshqaruv');
    expect(route.page).toBe('odamlar');
  });

  it('accepts the leading slash a copied link often carries', () => {
    expect(parseRoute('#/boshqaruv/odamlar').page).toBe('odamlar');
  });

  it('reads query parameters without letting them leak into the page name', () => {
    const route = parseRoute('#oqitish/vazifalar?sinf=11-A&holat=ochiq');
    expect(route.page).toBe('vazifalar');
    expect(route.params.get('sinf')).toBe('11-A');
    expect(route.params.get('holat')).toBe('ochiq');
  });

  it('gives empty strings for an empty hash, so a caller can fall back to a home', () => {
    const route = parseRoute('');
    expect(route.surface).toBe('');
    expect(route.page).toBe('');
    expect(route.path).toBe('');
  });

  it('treats a surface with no page as a surface', () => {
    const route = parseRoute('#boshqaruv');
    expect(route.surface).toBe('boshqaruv');
    expect(route.page).toBe('');
  });

  it('sends every role to a home that role can actually open', () => {
    // A student landing on the owner dashboard would get a 403 as their first
    // impression of the platform.
    expect(HOME_BY_ROLE.owner.startsWith('boshqaruv/')).toBe(true);
    expect(HOME_BY_ROLE.teacher.startsWith('oqitish/')).toBe(true);
    expect(HOME_BY_ROLE.student.startsWith('oquvchi/')).toBe(true);
  });
});
