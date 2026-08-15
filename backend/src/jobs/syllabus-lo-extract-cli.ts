import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Transcribes learning objectives out of the official 9618 syllabus text.
 *
 * The syllabus prints subject content as a two-column table and `pdftotext`
 * collapses the columns, so the objectives and their "Notes and guidance" arrive
 * interleaved with page furniture. That is why they were never transcribed by
 * hand: the ordering is recoverable by reading, not by a regular expression.
 *
 * The model only re-orders and labels what is already in the text — it is told
 * not to invent, and anything it could not read comes back in `issues` rather
 * than as a plausible guess.
 *
 *   npx tsx backend/src/jobs/syllabus-lo-extract-cli.ts \
 *     --text=<pdftotext output> --out=<catalog.json> [--topics=1,2,3]
 */
const arg = (name: string) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);

const textPath = arg('text');
const outPath = arg('out') ?? 'syllabus-lo.json';
const onlyTopics = arg('topics')?.split(',').map(Number);

if (!textPath) throw new Error('Usage: --text=<file> --out=<file> [--topics=1,2]');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required');

const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const promptVersion = 'extract-learning-objectives.v1';

const raw = await readFile(textPath, 'utf8');
const prompt = await readFile(
  join(process.cwd(), 'prompts', `${promptVersion}.md`),
  'utf8',
);

/**
 * Slice the subject-content section into one chunk per topic.
 *
 * The topic headings in the contents page and the syllabus overview are
 * identical to the ones in section 3, so anchoring on a heading alone lands in
 * the wrong place — the first attempt sliced the overview and the model
 * correctly reported that it contained no objectives at all.
 *
 * The reliable anchor is the phrase that introduces every objective list. The
 * section runs from the first subtopic heading before the first occurrence of
 * that phrase to the last occurrence, and is then cut on subtopic headings
 * (`1.1`, `10.4`) which only appear in this section in that form.
 */
function sliceTopics(text: string): Array<{ number: number; body: string }> {
  const ANCHOR = 'Candidates should be able to';
  const first = text.indexOf(ANCHOR);
  const last = text.lastIndexOf(ANCHOR);
  if (first === -1) throw new Error('subject content not found: no objective lists in the text');

  const headingPattern = /^(\d{1,2})\.(\d)\s+\S[^\n]{0,80}$/gm;
  const headings = [...text.matchAll(headingPattern)].filter(
    (match) => match.index !== undefined && match.index < last,
  );
  // Start at the last heading that precedes the first objective list.
  const startIndex = headings.filter((match) => match.index! <= first).at(-1)?.index ?? first;
  const inSection = headings.filter((match) => match.index! >= startIndex);

  const byTopic = new Map<number, string[]>();
  for (const [index, match] of inSection.entries()) {
    const topic = Number(match[1]);
    const from = match.index!;
    // Run to the next heading, or to the end of the objectives for the last one.
    const to = inSection[index + 1]?.index ?? text.indexOf('\n\n', last) + 2000;
    byTopic.set(topic, [...(byTopic.get(topic) ?? []), text.slice(from, to)]);
  }

  return [...byTopic.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, parts]) => ({ number, body: parts.join('\n\n') }));
}

interface ExtractedSubtopic {
  code: string;
  title: string;
  learningObjectives: Array<{ code: string; text: string; notes?: string }>;
}

async function extractTopic(chunk: { number: number; body: string }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Topic ${chunk.number}\n\n${chunk.body}` }],
    }),
  });

  if (!response.ok) throw new Error(`anthropic ${response.status}: ${await response.text()}`);
  const body = (await response.json()) as {
    content: Array<{ text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text = body.content.map((block) => block.text ?? '').join('');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const parsed = JSON.parse((fenced?.[1] ?? text).trim()) as {
    subtopics: ExtractedSubtopic[];
    issues?: string[];
  };

  return {
    ...parsed,
    usage: {
      input: body.usage?.input_tokens ?? 0,
      output: body.usage?.output_tokens ?? 0,
    },
  };
}

const chunks = sliceTopics(raw).filter(
  (chunk) => !onlyTopics || onlyTopics.includes(chunk.number),
);
console.log(`topics found: ${chunks.map((chunk) => chunk.number).join(', ')}`);

const results: Array<{ topic: number; subtopics: ExtractedSubtopic[]; issues: string[] }> = [];
let inputTokens = 0;
let outputTokens = 0;

for (const chunk of chunks) {
  process.stdout.write(`  topic ${String(chunk.number).padStart(2)} … `);
  try {
    const extracted = await extractTopic(chunk);
    inputTokens += extracted.usage.input;
    outputTokens += extracted.usage.output;
    results.push({
      topic: chunk.number,
      subtopics: extracted.subtopics ?? [],
      issues: extracted.issues ?? [],
    });
    const loCount = (extracted.subtopics ?? []).reduce(
      (sum, subtopic) => sum + subtopic.learningObjectives.length,
      0,
    );
    console.log(`${extracted.subtopics?.length ?? 0} subtopics, ${loCount} objectives`);
  } catch (error) {
    console.log(`FAILED: ${(error as Error).message.slice(0, 80)}`);
    results.push({ topic: chunk.number, subtopics: [], issues: ['extraction_failed'] });
  }
}

// Sonnet pricing, per million tokens.
const costUsd = (inputTokens * 3 + outputTokens * 15) / 1_000_000;
await writeFile(outPath, JSON.stringify({ promptVersion, model, results }, null, 1));

const totalSubtopics = results.reduce((sum, item) => sum + item.subtopics.length, 0);
const totalLos = results.reduce(
  (sum, item) => sum + item.subtopics.reduce((n, s) => n + s.learningObjectives.length, 0),
  0,
);
console.log(
  `\n${totalSubtopics} subtopics, ${totalLos} learning objectives → ${outPath}` +
    `\ntokens ${inputTokens} in / ${outputTokens} out ≈ $${costUsd.toFixed(3)}`,
);
const issues = results.flatMap((item) => item.issues.map((issue) => `topic ${item.topic}: ${issue}`));
if (issues.length) console.log(`issues:\n  ${issues.join('\n  ')}`);
