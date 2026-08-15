import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ZodType } from 'zod';
import { describe, expect, it } from 'vitest';
import { crossCheckSchema } from './ai-crosscheck.js';
import {
  classificationSchema,
  dependencyOutputSchema,
  extractMsSchema,
  extractQpSchema,
} from './ingestion-contract.js';

/**
 * The worked example in a prompt is the only shape the model is ever shown, so
 * it is the contract in practice. When the two drift the parse fails at run
 * time, three paid attempts later, on a whole batch.
 *
 * Parsing the example catches a key that contradicts the schema. It does not
 * catch a key the example never mentions, and that is the failure that actually
 * happened: `extract-question.v2` printed `"assets": []`, which parses cleanly
 * because it is empty, so the model was left to invent the asset shape and
 * produced `asset_id` with no `alt_text`. Every paper with a diagram died on it.
 * An empty collection demonstrates nothing, so the second test below requires
 * the extraction example to populate one.
 */
const PROMPTS: Array<{ file: string; schema: ZodType }> = [
  { file: 'extract-question.v4.md', schema: extractQpSchema },
  { file: 'extract-markscheme.v2.md', schema: extractMsSchema },
  { file: 'classify-question.v2.md', schema: classificationSchema },
  { file: 'detect-dependencies.v1.md', schema: dependencyOutputSchema },
  { file: 'cross-check.v2.md', schema: crossCheckSchema },
];

const promptsDir = join(process.cwd(), process.cwd().endsWith('backend') ? '..' : '.', 'prompts');

/**
 * Examples appear both inside ```json fences and bare under an Output heading.
 * Scanning for balanced braces reads both, and a prompt that offers two
 * alternative shapes (cross-check agrees / disagrees) yields both of them.
 */
function jsonExamples(markdown: string): string[] {
  const found: string[] = [];
  for (let index = 0; index < markdown.length; index += 1) {
    if (markdown[index] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let end = index; end < markdown.length; end += 1) {
      const char = markdown[end]!;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = !inString;
      else if (!inString && char === '{') depth += 1;
      else if (!inString && char === '}') {
        depth -= 1;
        if (depth === 0) {
          const candidate = markdown.slice(index, end + 1);
          try {
            JSON.parse(candidate);
            found.push(candidate);
          } catch {
            // A brace that opens prose rather than an object; keep scanning.
          }
          index = end;
          break;
        }
      }
    }
  }
  return found;
}

describe('prompt worked examples satisfy the contract they feed', () => {
  for (const { file, schema } of PROMPTS) {
    it(`${file} parses`, () => {
      const examples = jsonExamples(readFileSync(join(promptsDir, file), 'utf8'));
      expect(examples.length).toBeGreaterThan(0);
      for (const example of examples) {
        const result = schema.safeParse(JSON.parse(example));
        // Print the failure rather than a bare boolean: the point of this test
        // is to say which key drifted.
        expect(
          result.success ? null : `${file}: ${JSON.stringify(result.error.issues, null, 1)}`,
        ).toBeNull();
      }
    });
  }

  /**
   * Collections of objects that must be demonstrated at least once somewhere in
   * a prompt's examples. An empty array shows the key exists and nothing about
   * what goes in it, which is precisely how the asset shape came to be invented.
   */
  const MUST_BE_POPULATED: Array<{ file: string; paths: string[] }> = [
    { file: 'extract-question.v4.md', paths: ['questions[].assets'] },
    // A banded scheme is a different shape entirely, and it is the one that
    // decides how an Evaluate answer is marked.
    { file: 'extract-markscheme.v2.md', paths: ['schemes[].groups', 'schemes[].points', 'schemes[].levels'] },
    { file: 'cross-check.v2.md', paths: ['disagreements'] },
  ];

  function collect(node: unknown, path: string, into: Map<string, number>) {
    if (Array.isArray(node)) {
      into.set(path, (into.get(path) ?? 0) + node.length);
      for (const item of node) collect(item, `${path}[]`, into);
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node))
        collect(value, path ? `${path}.${key}` : key, into);
    }
  }

  for (const { file, paths } of MUST_BE_POPULATED) {
    it(`${file} demonstrates every collection it asks for`, () => {
      const counts = new Map<string, number>();
      for (const example of jsonExamples(readFileSync(join(promptsDir, file), 'utf8')))
        collect(JSON.parse(example), '', counts);
      // Report the path alongside the count so a failure names the collection
      // that was left empty rather than just "expected 0 to be greater than 0".
      const populated = paths.filter((path) => (counts.get(path) ?? 0) > 0);
      expect(populated).toEqual(paths);
    });
  }

  it('gives every drawn asset a bbox, since the crop is its only copy', () => {
    const [example] = jsonExamples(
      readFileSync(join(promptsDir, 'extract-question.v4.md'), 'utf8'),
    );
    const parsed = extractQpSchema.parse(JSON.parse(example!));
    const drawn = parsed.questions
      .flatMap((question) => question.assets)
      .filter((asset) => asset.content_md === null);
    expect(drawn.length).toBeGreaterThan(0);
    for (const asset of drawn) expect(asset.bbox).not.toBeNull();
  });

  it('shows a parent node, which has no answer of its own', () => {
    const [example] = jsonExamples(
      readFileSync(join(promptsDir, 'extract-question.v4.md'), 'utf8'),
    );
    const parsed = extractQpSchema.parse(JSON.parse(example!));
    const parents = parsed.questions.filter((question) =>
      parsed.questions.some((child) => child.parent_path === question.path),
    );
    expect(parents.length).toBeGreaterThan(0);
    // Left undemonstrated, the model sent answer_kind: null against a
    // non-nullable enum and lost the batch three times over.
    for (const parent of parents) {
      expect(parent.marks).toBeNull();
      expect(parent.answer_kind).toBeNull();
    }
  });
});
