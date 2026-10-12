export type LiveSchemeType='all_required'|'any_n_from_m'|'exact_match'|'levels_of_response'|'code_output'|'manual_only';

export interface LiveMarkSchemeCapabilityInput {
  schemeType:string;
  maxMarks:number;
  guidanceMd:string|null;
  levels:Array<{levelNumber:number;minMarks:number;maxMarks:number;descriptorMd:string;indicativeContentMd?:string|null}>;
  points:Array<{id:string;code:string;text:string;marks:number;requires:unknown;groupId:string|null}>;
  groups:Array<{id:string;nRequired:number;marksPerPoint:number;maxMarks:number;awardMode?:'fixed'|'point_marks'}>;
}

const SUPPORTED_SCHEME_TYPES=new Set<LiveSchemeType>(['all_required','any_n_from_m','exact_match','levels_of_response','code_output','manual_only']);

function nonEmpty(value:unknown):value is string { return typeof value==='string'&&value.trim().length>0; }
function validInteger(value:unknown,min=0) { return typeof value==='number'&&Number.isInteger(value)&&value>=min; }
function requiredCodes(value:unknown) { if(!Array.isArray(value))return null; return value.every(nonEmpty)?value.map(String):null; }

export function liveMarkSchemeCapabilityReady(scheme:LiveMarkSchemeCapabilityInput) {
  if(!SUPPORTED_SCHEME_TYPES.has(scheme.schemeType as LiveSchemeType))return false;
  if(!validInteger(scheme.maxMarks,1))return false;
  const pointIds=new Set<string>(),pointCodes=new Set<string>();
  for(const point of scheme.points){
    if(!nonEmpty(point.id)||pointIds.has(point.id)||!nonEmpty(point.code)||pointCodes.has(point.code))return false;
    if(!nonEmpty(point.text)||!validInteger(point.marks,1))return false;
    pointIds.add(point.id);pointCodes.add(point.code);
  }
  for(const point of scheme.points){
    const requires=requiredCodes(point.requires);
    if(requires===null||requires.some((code)=>code===point.code||!pointCodes.has(code)))return false;
  }
  const groupIds=new Set<string>();
  for(const group of scheme.groups){
    if(!nonEmpty(group.id)||groupIds.has(group.id))return false;
    if(!validInteger(group.nRequired,1)||!validInteger(group.marksPerPoint,1)||!validInteger(group.maxMarks,1))return false;
    if(group.maxMarks>scheme.maxMarks)return false;
    groupIds.add(group.id);
  }
  if(scheme.points.some((point)=>point.groupId!==null&&!groupIds.has(point.groupId)))return false;
  switch(scheme.schemeType as LiveSchemeType){
    case 'all_required':
    case 'exact_match':
      return scheme.points.length>0;
    case 'any_n_from_m':
      return scheme.groups.length>0&&scheme.groups.every((group)=>scheme.points.filter((point)=>point.groupId===group.id).length>=group.nRequired);
    case 'levels_of_response': {
      if(!scheme.levels.length)return false;
      const seen=new Set<number>();let highest=0;
      for(const level of scheme.levels){
        if(!validInteger(level.levelNumber,0)||seen.has(level.levelNumber))return false;
        if(!validInteger(level.minMarks,0)||!validInteger(level.maxMarks,0)||level.minMarks>level.maxMarks||level.maxMarks>scheme.maxMarks)return false;
        if(!nonEmpty(level.descriptorMd))return false;
        seen.add(level.levelNumber);highest=Math.max(highest,level.maxMarks);
      }
      return highest===scheme.maxMarks;
    }
    case 'code_output':
      return nonEmpty(scheme.guidanceMd)||scheme.points.length>0;
    case 'manual_only':
      return nonEmpty(scheme.guidanceMd);
  }
}

export function liveMarkSchemeCapabilitySql(alias='ms') {
  const a=alias.replace(/[^a-zA-Z0-9_]/g,'');
  if(!a)throw new Error('invalid SQL alias');
  return '('+
    'case '+a+'.scheme_type::text '+
    "when 'all_required' then exists(select 1 from mark_scheme_points capability_point where capability_point.mark_scheme_id="+a+".id) "+
    "when 'exact_match' then exists(select 1 from mark_scheme_points capability_point where capability_point.mark_scheme_id="+a+".id) "+
    "when 'any_n_from_m' then exists(select 1 from mark_scheme_points capability_point where capability_point.mark_scheme_id="+a+".id) "+
      'and exists(select 1 from mark_scheme_groups capability_group where capability_group.mark_scheme_id='+a+'.id) '+
      'and not exists(select 1 from mark_scheme_groups capability_group where capability_group.mark_scheme_id='+a+'.id and ('+
        'capability_group.n_required<=0 or capability_group.marks_per_point<=0 or capability_group.max_marks<=0 or capability_group.max_marks>'+a+'.max_marks '+
        'or (select count(*) from mark_scheme_points capability_point where capability_point.mark_scheme_id='+a+'.id and capability_point.group_id=capability_group.id)<capability_group.n_required)) '+
    "when 'levels_of_response' then exists(select 1 from mark_scheme_levels capability_level where capability_level.mark_scheme_id="+a+".id and capability_level.min_marks>=0 and capability_level.max_marks>=capability_level.min_marks and capability_level.max_marks<="+a+".max_marks and nullif(btrim(capability_level.descriptor_md),'') is not null) "+
      'and coalesce((select max(capability_level.max_marks) from mark_scheme_levels capability_level where capability_level.mark_scheme_id='+a+'.id),-1)='+a+'.max_marks '+
    "when 'code_output' then nullif(btrim(coalesce("+a+".guidance_md,'')),'') is not null or exists(select 1 from mark_scheme_points capability_point where capability_point.mark_scheme_id="+a+".id) "+
    "when 'manual_only' then nullif(btrim(coalesce("+a+".guidance_md,'')),'') is not null "+
    'else false end)';
}
