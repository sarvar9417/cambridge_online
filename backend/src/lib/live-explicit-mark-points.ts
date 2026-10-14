import { createHash } from 'node:crypto';

/**
 * Deterministic, conservative correction for imported Cambridge mark schemes
 * where an explicit "1 mark for each (correct) point/term" rubric has been
 * collapsed to one manual-only M1 carrying every mark.
 *
 * Never infer an assessment rule from punctuation, a worked example, an
 * answer's length or marks alone. Unsupported/rule-dependent rubrics stay
 * manual-only, with the official source text unchanged.
 */
export interface ExplicitPoint {
  id:string;code:string;text:string;marks:number;accept:unknown;reject:unknown;
  requires:unknown;isBod:boolean;groupId:string|null;
}
export interface ExplicitGroup {
  id:string;label:string|null;nRequired:number;marksPerPoint:number;
  maxMarks:number;awardMode:'fixed'|'point_marks';
}
export interface ExplicitScheme {
  id:string;schemeType:string;maxMarks:number;guidanceMd:string|null;
  points:ExplicitPoint[];groups:ExplicitGroup[];
  levels:Array<{levelNumber:number;minMarks:number;maxMarks:number;descriptorMd:string;indicativeContentMd?:string|null}>;
  derivedFromGuidance?:boolean;
}

function stableUuid(namespace:string,ordinal:number) {
  const hash=createHash('sha256').update(namespace).update(':').update(String(ordinal)).digest('hex');
  // A stable version-5-shaped UUID; no persistence beyond the session snapshot
  // and no database data edits are required.
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

function extractExplicitCriteria(guidance:string,maxMarks:number):string[]|null {
  if(!Number.isInteger(maxMarks)||maxMarks<2||maxMarks>12)return null;
  // Only the very explicit one-mark-per-independent-item Cambridge wording.
  if(!/\b1\s+mark\s+for\s+each\s+(?:(?:correct|valid|suitable)\s+)?(?:point|term)\b/i.test(guidance))return null;
  // These rules tie marks to pairs, options, ordering, levels or choices.
  if(/(?:\b(?:per|for)\s+(?:matching|corresponding)\b|\bjustification\s+must\s+match\b|\bno\s+mix\s+and\s+match\b|\b(?:two|2)\s*[×x]\s*(?:two|2)\b|\b(?:wrong|incorrect)\s+order\b|\bmark\s+for\s+(?:an|a)\s+(?:appropriate|valid)\s+(?:expansion|description|explanation)\b)/i.test(guidance))return null;
  const lines=guidance.split(/\r?\n/);
  const bullets=lines
    .map(line=>/^\s*[•●▪]\s*(.+?)\s*$/.exec(line)?.[1]?.trim())
    .filter((line):line is string=>Boolean(line&&line.length>=5));
  if(bullets.length<maxMarks||bullets.length>12)return null;
  // Empty boilerplate or example/sample lists are not awardable criteria.
  if(bullets.some(line=>/^(?:example(?:s)?|accept|reject|note|do not accept|or\b)/i.test(line)))return null;
  if(new Set(bullets.map(x=>x.toLowerCase())).size!==bullets.length)return null;
  return bullets;
}

export function expandExplicitLiveMarkPoints<T extends ExplicitScheme>(scheme:T):T {
  if(scheme.schemeType!=='manual_only'
      ||scheme.points.length!==1||scheme.groups.length!==0||scheme.levels.length!==0
      ||scheme.points[0]!.marks!==scheme.maxMarks)return scheme;
  const official=scheme.guidanceMd?.trim();
  if(!official)return scheme;
  const criteria=extractExplicitCriteria(official,scheme.maxMarks);
  if(!criteria)return scheme;
  const groupId=criteria.length>scheme.maxMarks?stableUuid(scheme.id,0):null;
  const points=criteria.map((text,index):ExplicitPoint=>({
    id:stableUuid(scheme.id,index+1),code:`MP${index+1}`,text,marks:1,
    accept:[],reject:[],requires:[],isBod:false,groupId,
  }));
  const groups:ExplicitGroup[]=groupId?[{
    id:groupId,label:'Any correct point',nRequired:scheme.maxMarks,
    marksPerPoint:1,maxMarks:scheme.maxMarks,awardMode:'fixed',
  }]:[];
  return {...scheme,schemeType:groupId?'any_n_from_m':'all_required',points,groups,derivedFromGuidance:true} as T;
}
