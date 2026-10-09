export type StructuredResponseTableCell={
  block:number;row:number;column:number;value:string;
};
export type StructuredResponseMatch={
  block:number;leftId:string;rightId:string;
};
export type StructuredResponseAnnotation=
  | {id:string;type:'text';assetId?:string|null;x:number;y:number;width?:number;value:string}
  | {id:string;type:'line';assetId?:string|null;x1:number;y1:number;x2:number;y2:number}
  | {id:string;type:'stroke';assetId?:string|null;points:Array<[number,number]>};

export type StructuredResponse={
  version:1;
  tableCells:StructuredResponseTableCell[];
  matches:StructuredResponseMatch[];
  annotations:StructuredResponseAnnotation[];
};

export function emptyStructuredResponse():StructuredResponse {
  return {version:1,tableCells:[],matches:[],annotations:[]};
}

export function normalizeStructuredResponse(value:unknown):StructuredResponse {
  if(!value||typeof value!=='object'||Array.isArray(value))return emptyStructuredResponse();
  const row=value as Partial<StructuredResponse>;
  return {
    version:1,
    tableCells:Array.isArray(row.tableCells)?row.tableCells:[],
    matches:Array.isArray(row.matches)?row.matches:[],
    annotations:Array.isArray(row.annotations)?row.annotations:[],
  };
}

export function structuredResponseHasContent(value:StructuredResponse|null|undefined) {
  if(!value)return false;
  return value.tableCells.some((cell)=>cell.value.trim())
    || value.matches.length>0
    || value.annotations.some((annotation)=>annotation.type!=='text'||annotation.value.trim());
}

export function structuredResponseTextCount(value:StructuredResponse|null|undefined) {
  if(!value)return 0;
  const words=[
    ...value.tableCells.map((cell)=>cell.value),
    ...value.annotations.filter((annotation):annotation is Extract<StructuredResponseAnnotation,{type:'text'}>=>annotation.type==='text').map((annotation)=>annotation.value),
  ].join(' ').trim();
  return words?words.split(/\s+/).length:0;
}
