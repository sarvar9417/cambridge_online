import{z}from'zod';

export const commandWords=['State','Give','Name','Identify','Define','Describe','Explain','Compare','Calculate','Complete','Draw','Write','Evaluate','Justify','Suggest','Show','Other']as const;
export const answerKinds=['text','pseudocode','code','image','table','diagram']as const;
export const schemeTypes=['all_required','any_n_from_m','levels_of_response','exact_match','code_output','manual_only']as const;

const assetSchema=z.object({
  kind:z.enum(answerKinds),content_md:z.string().nullable(),alt_text:z.string(),
  bbox:z.tuple([z.number(),z.number(),z.number(),z.number()]).nullable(),page:z.number().int().positive().nullable(),
}).strict();
const questionSchema=z.object({
  path:z.string().trim().min(1),label:z.string().trim().min(1),parent_path:z.string().trim().min(1).nullable(),
  stem_md:z.string().nullable(),context_md:z.string().nullable(),command_word:z.enum(commandWords).nullable(),
  marks:z.number().int().min(0).nullable(),answer_kind:z.enum(answerKinds),answer_lines:z.number().int().min(0).nullable(),
  source_pages:z.array(z.number().int().positive()).min(1),assets:z.array(assetSchema),issues:z.array(z.string()),confidence:z.number().min(0).max(1),
}).strict();
export const extractQpSchema=z.object({questions:z.array(questionSchema),truncated:z.boolean(),page_total_marks:z.number().int().min(0)}).strict();

const groupSchema=z.object({label:z.string(),n_required:z.number().int().min(0),marks_per_point:z.number().int().min(1),max_marks:z.number().int().min(0)}).strict();
const schemePointSchema=z.object({
  code:z.string().trim().min(1),group_label:z.string().nullable(),marks:z.number().int().min(0),text:z.string(),
  accept:z.array(z.string()),reject:z.array(z.string()),requires:z.array(z.string()),is_bod:z.boolean(),
}).strict();
const levelSchema=z.object({level_number:z.number().int().min(0),min_marks:z.number().int().min(0),max_marks:z.number().int().min(0),descriptor_md:z.string()}).strict();
const schemeSchema=z.object({
  question_ref:z.string().trim().min(1),path:z.string().trim().min(1),scheme_type:z.enum(schemeTypes),max_marks:z.number().int().positive(),
  guidance_md:z.string().nullable(),groups:z.array(groupSchema),points:z.array(schemePointSchema),levels:z.array(levelSchema),
  confidence:z.number().min(0).max(1),issues:z.array(z.string()),
}).strict();
export const extractMsSchema=z.object({schemes:z.array(schemeSchema)}).strict();

export type ExtractedAsset={kind:typeof answerKinds[number];contentMd:string|null;altText:string;bbox:[number,number,number,number]|null;page:number|null};
export type ExtractedQuestion={path:string;label:string;parentPath:string|null;displayRef:string;stemMd:string|null;contextMd:string|null;commandWord:typeof commandWords[number]|null;marks:number|null;answerKind:typeof answerKinds[number];answerLines:number|null;sourcePages:number[];assets:ExtractedAsset[];issues:string[];confidence:number};
export type ExtractQpBatch={questions:ExtractedQuestion[];truncated:boolean;pageTotalMarks:number};
export type ExtractedSchemePoint={code:string;groupLabel:string|null;marks:number;text:string;accept:string[];reject:string[];requires:string[];isBod:boolean};
export type ExtractedScheme={path:string;displayRef:string;questionRef:string;schemeType:typeof schemeTypes[number];maxMarks:number;guidanceMd:string|null;groups:Array<{label:string;nRequired:number;marksPerPoint:number;maxMarks:number}>;points:ExtractedSchemePoint[];levels:Array<{levelNumber:number;minMarks:number;maxMarks:number;descriptorMd:string}>;confidence:number;issues:string[]};

export function refFromPath(path:string){const[root,...rest]=path.split('.');return`${root}${rest.map(part=>`(${part})`).join('')}`}
export function normalizeQp(raw:unknown):ExtractQpBatch{
  const parsed=extractQpSchema.parse(raw);return{
    truncated:parsed.truncated,pageTotalMarks:parsed.page_total_marks,
    questions:parsed.questions.map(question=>({
      path:question.path,label:question.label,parentPath:question.parent_path,displayRef:refFromPath(question.path),stemMd:question.stem_md,
      contextMd:question.context_md,commandWord:question.command_word,marks:question.marks,answerKind:question.answer_kind,answerLines:question.answer_lines,
      sourcePages:question.source_pages,assets:question.assets.map(asset=>({kind:asset.kind,contentMd:asset.content_md,altText:asset.alt_text,bbox:asset.bbox,page:asset.page})),
      issues:question.issues,confidence:question.confidence,
    })),
  };
}
export function normalizeMs(raw:unknown):ExtractedScheme[]{
  const parsed=extractMsSchema.parse(raw);return parsed.schemes.map(scheme=>({
    path:scheme.path,displayRef:refFromPath(scheme.path),questionRef:scheme.question_ref,schemeType:scheme.scheme_type,maxMarks:scheme.max_marks,guidanceMd:scheme.guidance_md,
    groups:scheme.groups.map(group=>({label:group.label,nRequired:group.n_required,marksPerPoint:group.marks_per_point,maxMarks:group.max_marks})),
    points:scheme.points.map(point=>({code:point.code,groupLabel:point.group_label,marks:point.marks,text:point.text,accept:point.accept,reject:point.reject,requires:point.requires,isBod:point.is_bod})),
    levels:scheme.levels.map(level=>({levelNumber:level.level_number,minMarks:level.min_marks,maxMarks:level.max_marks,descriptorMd:level.descriptor_md})),
    confidence:scheme.confidence,issues:scheme.issues,
  }));
}

export function mergeQuestions(existing:ExtractedQuestion[],incoming:ExtractedQuestion[]){
  const byPath=new Map(existing.map(question=>[question.path,question]));const conflicts:string[]=[];
  for(const question of incoming){const prior=byPath.get(question.path);if(!prior){byPath.set(question.path,question);continue}
    const comparable=(value:ExtractedQuestion)=>JSON.stringify({parentPath:value.parentPath,stemMd:value.stemMd,contextMd:value.contextMd,marks:value.marks,answerKind:value.answerKind,assets:value.assets});
    if(comparable(prior)!==comparable(question))conflicts.push(question.path);
    if(question.confidence>prior.confidence)byPath.set(question.path,{...question,issues:[...new Set([...question.issues,...(conflicts.includes(question.path)?['overlap_conflict']:[])])]});
    else if(conflicts.includes(question.path))byPath.set(question.path,{...prior,issues:[...new Set([...prior.issues,'overlap_conflict'])]});
  }
  return{questions:[...byPath.values()].sort((a,b)=>pathOrder(a.path,b.path)),conflicts:[...new Set(conflicts)]};
}
export function mergeSchemes(existing:ExtractedScheme[],incoming:ExtractedScheme[]){
  const byPath=new Map(existing.map(scheme=>[scheme.path,scheme]));const conflicts:string[]=[];
  for(const scheme of incoming){const prior=byPath.get(scheme.path);if(!prior){byPath.set(scheme.path,scheme);continue}
    const comparable=(value:ExtractedScheme)=>JSON.stringify({schemeType:value.schemeType,maxMarks:value.maxMarks,guidanceMd:value.guidanceMd,groups:value.groups,points:value.points,levels:value.levels});
    if(comparable(prior)!==comparable(scheme))conflicts.push(scheme.path);
    if(scheme.confidence>prior.confidence)byPath.set(scheme.path,{...scheme,issues:[...new Set([...scheme.issues,...(conflicts.includes(scheme.path)?['overlap_conflict']:[])])]});
    else if(conflicts.includes(scheme.path))byPath.set(scheme.path,{...prior,issues:[...new Set([...prior.issues,'overlap_conflict'])]});
  }
  return{schemes:[...byPath.values()].sort((a,b)=>pathOrder(a.path,b.path)),conflicts:[...new Set(conflicts)]};
}
function pathOrder(left:string,right:string){const a=left.split('.'),b=right.split('.');for(let i=0;i<Math.max(a.length,b.length);i++){if(a[i]===undefined)return-1;if(b[i]===undefined)return 1;const na=Number(a[i]),nb=Number(b[i]);if(Number.isFinite(na)&&Number.isFinite(nb)&&na!==nb)return na-nb;const cmp=a[i]!.localeCompare(b[i]!);if(cmp)return cmp}return 0}
