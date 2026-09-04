import { z } from 'zod';

const sourceLocationSchema = z.object({
  page: z.number().int().positive(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
}).strict();

const textBlockSchema = z.object({
  type: z.literal('text'),
  style: z.enum(['paragraph', 'task']),
  text: z.string().min(1),
  source: sourceLocationSchema,
}).strict();

const mathBlockSchema = z.object({
  type: z.literal('math'),
  semantics: z.enum(['math', 'boolean_expression']),
  latex: z.string().min(1),
  display: z.boolean(),
  source: sourceLocationSchema,
}).strict();

const codeBlockSchema = z.object({
  type: z.literal('code'),
  language: z.string().min(1).nullable(),
  text: z.string().min(1),
  source: sourceLocationSchema,
}).strict();

const listBlockSchema = z.object({
  type: z.literal('list'),
  items: z.array(z.string().min(1)).min(1),
  source: sourceLocationSchema,
}).strict();

const tableBlockSchema = z.object({
  type: z.literal('table'),
  kind: z.enum(['table', 'truth_table', 'tick_grid', 'selection_grid']),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string().nullable())).min(1),
  editableCells: z.array(z.tuple([
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
  ])),
  source: sourceLocationSchema,
}).strict();

const matchingItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
}).strict();

const matchingBlockSchema = z.object({
  type: z.literal('matching'),
  left: z.array(matchingItemSchema).min(1),
  right: z.array(matchingItemSchema).min(1),
  source: sourceLocationSchema,
}).strict();

const assetBlockSchema = z.object({
  type: z.literal('asset'),
  kind: z.enum(['diagram', 'image', 'flowchart', 'logic_circuit']),
  assetId: z.string().uuid(),
  altText: z.string(),
  source: sourceLocationSchema,
}).strict();

const answerAreaBlockSchema = z.object({
  type: z.literal('answer_area'),
  kind: z.enum(['lines', 'box', 'table_cells', 'drawing']),
  lines: z.number().int().positive().nullable(),
  source: sourceLocationSchema,
}).strict();

export const structuredQuestionBlockSchema = z.discriminatedUnion('type', [
  textBlockSchema,
  mathBlockSchema,
  codeBlockSchema,
  listBlockSchema,
  tableBlockSchema,
  matchingBlockSchema,
  assetBlockSchema,
  answerAreaBlockSchema,
]);

export const structuredQuestionContentSchema = z.object({
  version: z.literal(1),
  source: z.object({
    paperId: z.string().uuid(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/i),
  }).strict(),
  blocks: z.array(structuredQuestionBlockSchema).min(1),
}).strict().superRefine((content, ctx) => {
  content.blocks.forEach((block, blockIndex) => {
    if (block.type === 'table') {
      const width = block.headers.length || block.rows[0]?.length || 0;
      if (width === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['blocks', blockIndex, 'rows'],
          message: 'table must have at least one column',
        });
        return;
      }
      block.rows.forEach((row, rowIndex) => {
        if (row.length !== width) {
          ctx.addIssue({
            code: 'custom',
            path: ['blocks', blockIndex, 'rows', rowIndex],
            message: `table row must contain exactly ${width} cells`,
          });
        }
      });
      block.editableCells.forEach(([row, column], cellIndex) => {
        if (row >= block.rows.length || column >= width) {
          ctx.addIssue({
            code: 'custom',
            path: ['blocks', blockIndex, 'editableCells', cellIndex],
            message: 'editable cell is outside the table bounds',
          });
        }
      });
    }

    if (block.type === 'matching') {
      for (const side of ['left', 'right'] as const) {
        const ids = block[side].map((item) => item.id);
        if (new Set(ids).size !== ids.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['blocks', blockIndex, side],
            message: `matching ${side} ids must be unique`,
          });
        }
      }
    }
  });
});

export type StructuredQuestionBlock = z.infer<typeof structuredQuestionBlockSchema>;
export type StructuredQuestionContent = z.infer<typeof structuredQuestionContentSchema>;

export function parseStructuredQuestionContent(value: unknown): StructuredQuestionContent {
  return structuredQuestionContentSchema.parse(value);
}

export function safeParseStructuredQuestionContent(value: unknown) {
  return structuredQuestionContentSchema.safeParse(value);
}
