import { z } from 'zod';

const responseKey=z.string().min(1).max(160);
const responseValue=z.string().max(5000);
const point=z.object({
  x:z.number().min(0).max(1),
  y:z.number().min(0).max(1),
}).strict();
const drawing=z.object({
  strokes:z.array(z.array(point).min(1).max(2000)).max(200),
}).strict();

export const structuredResponsePayloadSchema=z.object({
  version:z.literal(1),
  values:z.record(responseKey,responseValue).default({}),
  matches:z.record(responseKey,responseKey).default({}),
  drawings:z.record(responseKey,drawing).default({}),
}).strict().superRefine((value,ctx)=>{
  const controlCount=Object.keys(value.values).length+Object.keys(value.matches).length+Object.keys(value.drawings).length;
  if(controlCount>600)ctx.addIssue({code:'custom',message:'Too many structured response controls'});
  const pointCount=Object.values(value.drawings)
    .flatMap((drawing)=>drawing.strokes)
    .reduce((sum,stroke)=>sum+stroke.length,0);
  if(pointCount>20_000)ctx.addIssue({code:'custom',message:'Structured drawing is too large'});
});

export type StructuredResponsePayload=z.infer<typeof structuredResponsePayloadSchema>;

export function structuredResponseSummary(payload:StructuredResponsePayload|null|undefined) {
  if(!payload)return '';
  const lines:string[]=[];
  for(const [key,value] of Object.entries(payload.values).sort(([a],[b])=>a.localeCompare(b))){
    if(value.trim())lines.push(`${key}: ${value.trim()}`);
  }
  for(const [key,value] of Object.entries(payload.matches).sort(([a],[b])=>a.localeCompare(b))){
    if(value.trim())lines.push(`${key}: ${value.trim()}`);
  }
  for(const [key,drawing] of Object.entries(payload.drawings).sort(([a],[b])=>a.localeCompare(b))){
    const points=drawing.strokes.reduce((sum,stroke)=>sum+stroke.length,0);
    if(points)lines.push(`${key}: [drawing · ${drawing.strokes.length} stroke(s)]`);
  }
  return lines.join('\n');
}

export function structuredResponseHasContent(payload:StructuredResponsePayload|null|undefined) {
  return Boolean(payload&&(
    Object.values(payload.values).some((value)=>value.trim())
    ||Object.values(payload.matches).some((value)=>value.trim())
    ||Object.values(payload.drawings).some((drawing)=>drawing.strokes.some((stroke)=>stroke.length))
  ));
}
