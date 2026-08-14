import { describe, expect, it } from 'vitest';
import { checkLatex } from '@campath/shared';
import { TOPICS } from './syllabus-9618-2026.js';
import { PAPER, flattenPaper } from './paper-9618-s23-11.js';
import type { SeedLeaf, SeedNode } from './paper-9618-s23-11.js';

const TOPICS_BY_CODE = new Set(TOPICS.flatMap((topic) => topic.subtopics.map((sub) => sub.code)));

function leaves(): SeedLeaf[] {
  return flattenPaper(PAPER).filter((item) => !('children' in item)) as SeedLeaf[];
}

/** Context-carrying parents; kept alongside `leaves()` for symmetry in tests. */
function _nodes(): SeedNode[] {
  return flattenPaper(PAPER).filter((item) => 'children' in item) as SeedNode[];
}
void _nodes;

function latexFields(item: SeedNode | SeedLeaf): Array<[string, string]> {
  const fields: Array<[string, string]> = [];
  if (item.contextLatex) fields.push([`${item.path}.contextLatex`, item.contextLatex]);
  if ('children' in item) {
    for (const child of item.children) fields.push(...latexFields(child));
    return fields;
  }
  const leaf = item as SeedLeaf;
  fields.push([`${leaf.path}.stemLatex`, leaf.stemLatex]);
  if (leaf.scheme.guidance) fields.push([`${leaf.path}.guidance`, leaf.scheme.guidance]);
  for (const point of leaf.scheme.points) {
    if (point.textLatex) fields.push([`${leaf.path}.${point.code}`, point.textLatex]);
  }
  return fields;
}

describe('9618/11/M/J/23 transcript', () => {
  it('has the six questions and the expected mark total of 75', () => {
    expect(PAPER.map((node) => node.path)).toEqual(['1', '2', '3', '4', '5', '6']);
    const total = leaves().reduce((sum, leaf) => sum + leaf.marks, 0);
    expect(total).toBe(75);
  });

  it('has unique paths that match their tree position', () => {
    const paths = flattenPaper(PAPER).map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const item of flattenPaper(PAPER)) {
      expect(item.path).toBe(item.label === item.path ? item.label : item.path);
    }
    // every path except roots has the parent path as a prefix
    for (const item of flattenPaper(PAPER)) {
      const parts = item.path.split('.');
      if (parts.length > 1) {
        const parentPath = parts.slice(0, -1).join('.');
        expect(paths).toContain(parentPath);
      }
    }
  });

  it('every LaTeX field passes the KaTeX contract', () => {
    const bad: Array<[string, string[]]> = [];
    for (const item of flattenPaper(PAPER)) {
      for (const [field, source] of latexFields(item)) {
        const result = checkLatex(source);
        if (!result.ok) bad.push([field, result.findings.map((f) => f.code)]);
      }
    }
    expect(bad).toEqual([]);
  });

  it('mark scheme points sum to max marks for all_required schemes', () => {
    for (const leaf of leaves()) {
      if (leaf.scheme.type === 'all_required') {
        const total = leaf.scheme.points.reduce((sum, point) => sum + (point.marks ?? 1), 0);
        expect(total, `Q${leaf.path} all_required total`).toBe(leaf.scheme.maxMarks);
      }
    }
  });

  it('any_n_from_m schemes have more points than required', () => {
    for (const leaf of leaves()) {
      if (leaf.scheme.type !== 'any_n_from_m') continue;
      for (const group of leaf.scheme.groups ?? []) {
        const inGroup = leaf.scheme.points.filter((p) => p.groupLabel === group.label);
        expect(inGroup.length, `Q${leaf.path} group ${group.label}`).toBeGreaterThan(
          group.nRequired,
        );
      }
    }
  });

  it('leaf marks never exceed the paper maximum for that sub-part', () => {
    for (const leaf of leaves()) {
      expect(leaf.scheme.maxMarks, `Q${leaf.path}`).toBe(leaf.marks);
    }
  });

  it('every subtopic code exists in the 2026 syllabus', () => {
    const unknown: string[] = [];
    for (const leaf of leaves()) {
      for (const code of leaf.subtopics) {
        if (!TOPICS_BY_CODE.has(code)) unknown.push(`${leaf.path}: ${code}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it('leaf nodes always carry a stem, command and marks', () => {
    for (const leaf of leaves()) {
      expect(leaf.stemLatex).not.toBe('');
      expect(leaf.command).toBeTruthy();
      expect(leaf.marks).toBeGreaterThan(0);
    }
  });

  it('path regex matches the schema (3.b.ii style)', () => {
    const schemaPattern = /^[0-9a-z]+(\.[0-9a-z]+)*$/;
    for (const item of flattenPaper(PAPER)) {
      expect(item.path, `Q${item.path}`).toMatch(schemaPattern);
    }
  });
});
