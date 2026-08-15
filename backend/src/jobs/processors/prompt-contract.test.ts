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
  { file: 'extract-question.v3.md', schema: extractQpSchema },
  { file: 'extract-markscheme.v1.md', schema: extractMsSchema },
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

  it('shows the asset keys, since an empty array teaches the model nothing', () => {
    const [example] = jsonExamples(
      readFileSync(join(promptsDir, 'extract-question.v3.md'), 'utf8'),
    );
    const parsed = extractQpSchema.parse(JSON.parse(example!));
    const assets = parsed.questions.flatMap((question) => question.assets);
    expect(assets.length).toBeGreaterThan(0);
    // A drawn asset has no transcription, so the crop is the only copy of it and
    // the bbox has to be there.
    const drawn = assets.filter((asset) => asset.content_md === null);
    expect(drawn.length).toBeGreaterThan(0);
    for (const asset of drawn) expect(asset.bbox).not.toBeNull();
  });
});
