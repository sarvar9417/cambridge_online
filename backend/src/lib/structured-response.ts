import { z } from 'zod';

const coordinate=z.number().finite().min(0).max(1);
const responseId=z.string().min(1).max(80);
const responseText=z.string().max(4000);

const tableCellSchema=z.object({
  block:z.number().int().nonnegative(),
  row:z.number().int().nonnegative(),
  column:z.number().int().nonnegative(),
  value:responseText,
}).strict();

const matchingSchema=z.object({
  block:z.number().int().nonnegative(),
  leftId:z.string().min(1).max(120),
  rightId:z.string().min(1).max(120),
}).strict();

const textAnnotationSchema=z.object({
  id:responseId,
  type:z.literal('text'),
  assetId:z.string().uuid().nullable().optional(),
  x:coordinate,
  y:coordinate,
  width:coordinate.optional(),
  value:responseText,
}).strict();

const lineAnnotationSchema=z.object({
  id:responseId,
  type:z.literal('line'),
  assetId:z.string().uuid().nullable().optional(),
  x1:coordinate,
  y1:coordinate,
  x2:coordinate,
  y2:coordinate,
}).strict();

const strokeAnnotationSchema=z.object({
  id:responseId,
  type:z.literal('stroke'),
  assetId:z.string().uuid().nullable().optional(),
  points:z.array(z.tuple([coordinate,coordinate])).min(2).max(500),
}).strict();

export const structuredResponseSchema=z.object({
  version:z.literal(1),
  tableCells:z.array(tableCellSchema).max(300).default([]),
  matches:z.array(matchingSchema).max(150).default([]),
  annotations:z.array(z.discriminatedUnion('type',[
    textAnnotationSchema,lineAnnotationSchema,strokeAnnotationSchema,
  ])).max(300).default([]),
}).strict().superRefine((response,ctx)=>{
  const cellKeys=response.tableCells.map((cell)=>`${cell.block}:${cell.row}:${cell.column}`);
  if(new Set(cellKeys).size!==cellKeys.length)ctx.addIssue({code:'custom',path:['tableCells'],message:'table response cells must be unique'});
  const matchKeys=response.matches.map((match)=>`${match.block}:${match.leftId}`);
  if(new Set(matchKeys).size!==matchKeys.length)ctx.addIssue({code:'custom',path:['matches'],message:'matching left items must be unique'});
  const annotationIds=response.annotations.map((annotation)=>annotation.id);
  if(new Set(annotationIds).size!==annotationIds.length)ctx.addIssue({code:'custom',path:['annotations'],message:'annotation ids must be unique'});
});

export type StructuredResponse=z.infer<typeof structuredResponseSchema>;

export function parseStructuredResponse(value:unknown) {
  return structuredResponseSchema.parse(value);
}

export function structuredResponseHasContent(value:StructuredResponse|null|undefined) {
  if(!value)return false;
  return value.tableCells.some((cell)=>cell.value.trim())
    || value.matches.length>0
    || value.annotations.some((annotation)=>annotation.type!=='text'||annotation.value.trim());
}

export function structuredResponseSummary(value:StructuredResponse|null|undefined) {
  if(!value)return '';
  const lines:string[]=[];
  for(const cell of value.tableCells){
    if(cell.value.trim())lines.push(`Table R${cell.row+1}C${cell.column+1}: ${cell.value.trim()}`);
  }
  for(const match of value.matches){
    lines.push(`Match ${match.leftId} -> ${match.rightId}`);
  }
  for(const annotation of value.annotations){
    if(annotation.type==='text'&&annotation.value.trim())lines.push(`Label: ${annotation.value.trim()}`);
  }
  const lineCount=value.annotations.filter((annotation)=>annotation.type==='line').length;
  const strokeCount=value.annotations.filter((annotation)=>annotation.type==='stroke').length;
  if(lineCount)lines.push(`Drawn connections: ${lineCount}`);
  if(strokeCount)lines.push(`Freehand strokes: ${strokeCount}`);
  return lines.join('\n').slice(0,20000);
}
