import type { Pool } from 'pg';
import { z } from 'zod';

const componentNumberSchema = z.number().int().min(1).max(4);
const loSchema = z.object({
  code: z.string().trim().min(1),
  text: z.string().trim().min(1),
  sortOrder: z.number().int().min(0),
  componentNumbers: z.array(componentNumberSchema).min(1).optional(),
}).strict();

const subtopicSchema = z.object({
  code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  sortOrder: z.number().int().min(0),
  learningObjectives: z.array(loSchema).min(1),
}).strict();

const topicSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().trim().min(1),
  sortOrder: z.number().int().min(0),
  componentNumbers: z.array(componentNumberSchema).min(1),
  subtopics: z.array(subtopicSchema).min(1),
}).strict();

const componentSchema = z.object({
  number: componentNumberSchema,
  name: z.string().trim().min(1),
  level: z.enum(['AS', 'A2']),
  durationMinutes: z.number().int().positive(),
  totalMarks: z.number().int().positive(),
  weightingPct: z.number().positive().max(100),
}).strict();

export const syllabusCatalogSchema = z.object({
  code: z.literal('9618'),
  subject: z.string().trim().min(1),
  versionLabel: z.string().trim().min(1),
  validFrom: z.number().int().min(2021),
  validTo: z.number().int().min(2021),
  isActive: z.boolean().default(false),
  components: z.array(componentSchema).length(4),
  topics: z.array(topicSchema).min(1),
}).strict().superRefine((value, ctx) => {
  if (value.validTo < value.validFrom) {
    ctx.addIssue({ code: 'custom', message: 'validTo must be >= validFrom', path: ['validTo'] });
  }
  unique(value.components.map((item) => String(item.number)), ctx, ['components'], 'component number');
  unique(value.topics.map((item) => String(item.number)), ctx, ['topics'], 'topic number');
  const components = new Map(value.components.map((item) => [item.number, item] as const));
  for (const [topicIndex, topic] of value.topics.entries()) {
    unique(topic.componentNumbers.map(String), ctx, ['topics', topicIndex, 'componentNumbers'], 'component number');
    const topicComponentSet = new Set(topic.componentNumbers);
    const levels = new Set<'AS' | 'A2'>();
    for (const [componentIndex, componentNumber] of topic.componentNumbers.entries()) {
      const component = components.get(componentNumber);
      if (!component) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown component number: ${componentNumber}`,
          path: ['topics', topicIndex, 'componentNumbers', componentIndex],
        });
      } else {
        levels.add(component.level);
      }
    }
    if (levels.size > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'A topic cannot span AS and A2 components.',
        path: ['topics', topicIndex, 'componentNumbers'],
      });
    }
    unique(topic.subtopics.map((item) => item.code), ctx, ['topics', topicIndex, 'subtopics'], 'subtopic code');
    for (const [subIndex, sub] of topic.subtopics.entries()) {
      unique(
        sub.learningObjectives.map((item) => item.code),
        ctx,
        ['topics', topicIndex, 'subtopics', subIndex, 'learningObjectives'],
        'learning objective code',
      );
      for (const [loIndex, lo] of sub.learningObjectives.entries()) {
        const coverage = lo.componentNumbers ?? topic.componentNumbers;
        unique(
          coverage.map(String),
          ctx,
          ['topics', topicIndex, 'subtopics', subIndex, 'learningObjectives', loIndex, 'componentNumbers'],
          'component number',
        );
        for (const [componentIndex, componentNumber] of coverage.entries()) {
          if (!topicComponentSet.has(componentNumber)) {
            ctx.addIssue({
              code: 'custom',
              message: `Learning objective component ${componentNumber} is outside topic coverage.`,
              path: ['topics', topicIndex, 'subtopics', subIndex, 'learningObjectives', loIndex, 'componentNumbers', componentIndex],
            });
          }
        }
      }
    }
  }
});

export type SyllabusCatalog = z.infer<typeof syllabusCatalogSchema>;

export interface SyllabusCatalogImportResult {
  syllabusId: string;
  components: number;
  topics: number;
  componentTopicLinks: number;
  subtopics: number;
  learningObjectives: number;
  componentLearningObjectiveLinks: number;
}

export async function importSyllabusCatalog(pool: Pool, raw: unknown): Promise<SyllabusCatalogImportResult> {
  const catalog = syllabusCatalogSchema.parse(raw);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const overlap = await client.query(
      `select id,valid_from,valid_to from syllabi
       where code=$1 and not(valid_to<$2 or valid_from>$3)
       for update`,
      [catalog.code, catalog.validFrom, catalog.validTo],
    );
    const exact = overlap.rows.filter(
      (row) => Number(row.valid_from) === catalog.validFrom && Number(row.valid_to) === catalog.validTo,
    );
    if (overlap.rowCount && !exact.length) {
      throw new Error(`syllabus_catalog_validity_overlap:${catalog.code}:${catalog.validFrom}-${catalog.validTo}`);
    }
    if (exact.length > 1) {
      throw new Error(`syllabus_catalog_exact_version_duplicate:${catalog.code}:${catalog.validFrom}-${catalog.validTo}`);
    }

    let syllabusId: string;
    if (exact.length) {
      syllabusId = String(exact[0].id);
      const populated = await client.query(
        `select count(*)::int components,
          (select count(*)::int from topics where syllabus_id=$1) topics
         from components where syllabus_id=$1`,
        [syllabusId],
      );
      if (Number(populated.rows[0]?.components ?? 0) > 0 || Number(populated.rows[0]?.topics ?? 0) > 0) {
        throw new Error(`syllabus_catalog_version_already_populated:${syllabusId}`);
      }
      await client.query(
        `update syllabi
         set subject=$2,version_label=$3,is_active=$4
         where id=$1`,
        [syllabusId, catalog.subject, catalog.versionLabel, catalog.isActive],
      );
    } else {
      const inserted = await client.query(
        `insert into syllabi(code,subject,version_label,valid_from,valid_to,is_active)
         values($1,$2,$3,$4,$5,$6)
         returning id`,
        [catalog.code, catalog.subject, catalog.versionLabel, catalog.validFrom, catalog.validTo, catalog.isActive],
      );
      syllabusId = String(inserted.rows[0].id);
    }

    const componentIds = new Map<number, string>();
    const componentLevels = new Map<number, 'AS' | 'A2'>();
    for (const component of [...catalog.components].sort((a, b) => a.number - b.number)) {
      const inserted = await client.query(
        `insert into components(syllabus_id,number,name,level,duration_min,total_marks,weight_pct)
         values($1,$2,$3,$4,$5,$6,$7)
         returning id`,
        [
          syllabusId,
          component.number,
          component.name,
          component.level,
          component.durationMinutes,
          component.totalMarks,
          component.weightingPct,
        ],
      );
      componentIds.set(component.number, String(inserted.rows[0].id));
      componentLevels.set(component.number, component.level);
    }

    let componentTopicLinks = 0;
    let subtopics = 0;
    let learningObjectives = 0;
    let componentLearningObjectiveLinks = 0;
    for (const topic of [...catalog.topics].sort((a, b) => a.sortOrder - b.sortOrder || a.number - b.number)) {
      const coverage = [...topic.componentNumbers].sort((a, b) => a - b);
      const primaryComponentNumber = coverage[0]!;
      const componentId = componentIds.get(primaryComponentNumber);
      const level = componentLevels.get(primaryComponentNumber);
      if (!componentId || !level) {
        throw new Error(`syllabus_catalog_component_reference_missing:${topic.number}:${primaryComponentNumber}`);
      }
      const insertedTopic = await client.query(
        `insert into topics(syllabus_id,component_id,number,title,level,sort_order)
         values($1,$2,$3,$4,$5,$6)
         returning id`,
        [syllabusId, componentId, topic.number, topic.title, level, topic.sortOrder],
      );
      const topicId = String(insertedTopic.rows[0].id);
      for (const componentNumber of coverage) {
        const coveredComponentId = componentIds.get(componentNumber);
        if (!coveredComponentId) {
          throw new Error(`syllabus_catalog_component_reference_missing:${topic.number}:${componentNumber}`);
        }
        await client.query(
          `insert into component_topics(component_id,topic_id,is_primary)
           values($1,$2,$3)`,
          [coveredComponentId, topicId, componentNumber === primaryComponentNumber],
        );
        componentTopicLinks += 1;
      }
      for (const sub of [...topic.subtopics].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))) {
        const insertedSub = await client.query(
          `insert into subtopics(topic_id,code,title,sort_order)
           values($1,$2,$3,$4)
           returning id`,
          [topicId, sub.code, sub.title, sub.sortOrder],
        );
        const subtopicId = String(insertedSub.rows[0].id);
        subtopics += 1;
        for (const lo of [...sub.learningObjectives].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))) {
          const insertedLo = await client.query(
            `insert into learning_objectives(subtopic_id,code,text,sort_order)
             values($1,$2,$3,$4)
             returning id`,
            [subtopicId, lo.code, lo.text, lo.sortOrder],
          );
          const learningObjectiveId = String(insertedLo.rows[0].id);
          learningObjectives += 1;
          const loCoverage = [...(lo.componentNumbers ?? coverage)].sort((a, b) => a - b);
          for (const componentNumber of loCoverage) {
            const coveredComponentId = componentIds.get(componentNumber);
            if (!coveredComponentId) {
              throw new Error(`syllabus_catalog_component_reference_missing:${lo.code}:${componentNumber}`);
            }
            await client.query(
              `insert into component_learning_objectives(component_id,learning_objective_id)
               values($1,$2)`,
              [coveredComponentId, learningObjectiveId],
            );
            componentLearningObjectiveLinks += 1;
          }
        }
      }
    }

    await client.query('commit');
    return {
      syllabusId,
      components: catalog.components.length,
      topics: catalog.topics.length,
      componentTopicLinks,
      subtopics,
      learningObjectives,
      componentLearningObjectiveLinks,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

function unique(values: string[], ctx: z.RefinementCtx, path: (string | number)[], label: string) {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) {
      ctx.addIssue({ code: 'custom', message: `Duplicate ${label}: ${value}`, path: [...path, index] });
    }
    seen.add(value);
  }
}
