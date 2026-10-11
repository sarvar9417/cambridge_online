import { z } from 'zod';

const blockKey=z.string().regex(/^\d+$/);
const shortText=z.string().max(5000);
const coordinate=z.number().min(0).max(1);
const id=z.string().min(1).max(80);

export const structuredResponseSchema=z.object({
  version:z.literal(1),
  tables:z.record(blockKey,z.record(z.string().regex(/^\d+:\d+$/),shortText)).default({}),
  matching:z.record(blockKey,z.record(id,id)).default({}),
  annotations:z.record(blockKey,z.array(z.object({
    id,x:coordinate,y:coordinate,text:shortText,
  }).strict()).max(200)).default({}),
  lines:z.record(blockKey,z.array(z.object({
    id,x1:coordinate,y1:coordinate,x2:coordinate,y2:coordinate,
  }).strict()).max(300)).default({}),
}).strict();

export type StructuredResponseV1=z.infer<typeof structuredResponseSchema>;

export function safeStructuredResponse(value:unknown){
  if(value==null)return null;
  return structuredResponseSchema.parse(value);
}
