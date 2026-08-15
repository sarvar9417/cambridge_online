import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { syllabusCatalogSchema, type SyllabusCatalog } from './syllabus-catalog-import.js';

const descriptorSchema = z.object({
  code: z.literal('9618'),
  subject: z.string().trim().min(1),
  versionLabel: z.string().trim().min(1),
  validFrom: z.number().int(),
  validTo: z.number().int(),
  isActive: z.boolean(),
  components: z.array(z.unknown()).length(4),
  fragments: z.array(z.string().trim().min(1)).min(1),
  learningObjectiveOverrides: z.record(z.string(), z.array(z.string().trim().min(1))).default({}),
}).strict();

const fragmentSchema = z.object({ topics: z.array(z.unknown()).min(1) }).strict();

export async function loadSyllabusCatalogDocument(filePath: string): Promise<SyllabusCatalog> {
  const raw = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
  const direct = syllabusCatalogSchema.safeParse(raw);
  if (direct.success) return direct.data;

  const descriptor = descriptorSchema.parse(raw);
  const topics: unknown[] = [];
  const baseDir = dirname(filePath);
  for (const fragmentName of descriptor.fragments) {
    const fragmentPath = resolve(baseDir, fragmentName);
    if (!fragmentPath.startsWith(`${resolve(baseDir)}/`)) throw new Error(`syllabus_catalog_fragment_outside_directory:${fragmentName}`);
    const fragment = fragmentSchema.parse(JSON.parse(await readFile(fragmentPath, 'utf8')));
    topics.push(...fragment.topics);
  }

  const assembled = structuredClone({
    code: descriptor.code,
    subject: descriptor.subject,
    versionLabel: descriptor.versionLabel,
    validFrom: descriptor.validFrom,
    validTo: descriptor.validTo,
    isActive: descriptor.isActive,
    components: descriptor.components,
    topics,
  }) as Record<string, unknown>;

  applyLearningObjectiveOverrides(assembled, descriptor.learningObjectiveOverrides);
  return syllabusCatalogSchema.parse(assembled);
}

function applyLearningObjectiveOverrides(catalog: Record<string, unknown>, overrides: Record<string, string[]>) {
  const topics = catalog.topics;
  if (!Array.isArray(topics)) throw new Error('syllabus_catalog_topics_missing');
  for (const [subtopicCode, texts] of Object.entries(overrides)) {
    let matched = 0;
    for (const topic of topics) {
      if (!topic || typeof topic !== 'object') continue;
      const subtopics = (topic as Record<string, unknown>).subtopics;
      if (!Array.isArray(subtopics)) continue;
      for (const subtopic of subtopics) {
        if (!subtopic || typeof subtopic !== 'object') continue;
        const row = subtopic as Record<string, unknown>;
        if (row.code !== subtopicCode) continue;
        matched += 1;
        row.learningObjectives = texts.map((text, index) => ({
          code: `${subtopicCode}-lo-${String(index + 1).padStart(2, '0')}`,
          text,
          sortOrder: index + 1,
        }));
      }
    }
    if (matched !== 1) throw new Error(`syllabus_catalog_override_target_count:${subtopicCode}:${matched}`);
  }
}
