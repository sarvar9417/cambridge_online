import { createHash } from 'node:crypto';

/**
 * Cambridge mark scheme extracts sometimes compress several distinct mark
 * points into a single "manual_only" M1 worth all available marks.
 *
 * Do NOT infer independent scoring from an OCR'd "1 mark for each" phrase:
 * PDF multi-column reading order mixes examiner restrictions and solutions.
 * Each entry below was individually audited against its captured source
 * guidance. Both display reference and the exact guidance fingerprint must
 * match before a new Live session receives the derived point rubric.
 *
 * Expanding coverage requires reviewing each source in its original layout.
 * Unlisted, revised, alternative or ambiguous rubrics retain manual marking.
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

interface AuditedRubric {
  /** MD5 is only a content-revision fingerprint, not a security credential. */
  guidanceMd5:string;
  maxMarks:number;
  criteria:readonly string[];
}

/** Individually verified 9618 source references and independent credit items. */
const APPROVED_RUBRICS:Readonly<Record<string,AuditedRubric>>={
  '9618/11/M/J/26 Q4(a)':{
    guidanceMd5:'c4f7e73163f727b21dac87e64bbe5ab0',
    maxMarks:4,
    criteria:[
      'CUSTOMER BORROW is a one-to-many relationship (1:M)',
      'TOY_INSTANCE to TOY is a many-to-one relationship (M:1)',
      'Identify the correct Primary Key and matching Foreign Key in both relationships',
      'State how the keys form the relationship',
    ],
  },
  '9618/11/M/J/26 Q5(a)':{
    guidanceMd5:'950550f5d580c48e34193a96c686540c',
    maxMarks:3,
    criteria:[
      'The image is made of pixels',
      'Each pixel has one colour',
      'Each colour has a unique binary code',
      'The code for the colour of each pixel is stored in sequence / order',
    ],
  },
  '9618/11/M/J/26 Q5(b)':{
    guidanceMd5:'106fb96b0876d46896c82710b814cd35',
    maxMarks:3,
    criteria:[
      'drawing object',
      'property',
      'drawing list',
    ],
  },
  '9618/12/M/J/26 Q6(a)':{
    guidanceMd5:'d2392b53b506fd7958465fbbb9c96142',
    maxMarks:3,
    criteria:[
      'It only has one function, to monitor health',
      'All the hardware, such as sensors and a microprocessor, is dedicated to monitoring health',
      'The firmware cannot be easily amended or updated because its function is preset',
    ],
  },
};

function stableUuid(namespace:string,ordinal:number) {
  const hash=createHash('sha256').update(namespace).update(':').update(String(ordinal)).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

export function expandExplicitLiveMarkPoints<T extends ExplicitScheme>(
  scheme:T,sourceReference:string,
):T {
  if(scheme.schemeType!=='manual_only'
      ||scheme.points.length!==1||scheme.groups.length!==0||scheme.levels.length!==0
      ||scheme.points[0]!.marks!==scheme.maxMarks
      ||!scheme.guidanceMd)return scheme;
  const audited=APPROVED_RUBRICS[sourceReference];
  if(!audited || audited.maxMarks!==scheme.maxMarks)return scheme;
  const hash=createHash('md5').update(scheme.guidanceMd,'utf8').digest('hex');
  if(hash!==audited.guidanceMd5)return scheme;
  const groupId=audited.criteria.length>scheme.maxMarks?stableUuid(scheme.id,0):null;
  const points=audited.criteria.map((text,index):ExplicitPoint=>({
    id:stableUuid(scheme.id,index+1),code:`MP${index+1}`,text,marks:1,
    accept:[],reject:[],requires:[],isBod:false,groupId,
  }));
  const groups:ExplicitGroup[]=groupId?[{
    id:groupId,label:'Any correct point',nRequired:scheme.maxMarks,
    marksPerPoint:1,maxMarks:scheme.maxMarks,awardMode:'fixed',
  }]:[];
  return {...scheme,schemeType:groupId?'any_n_from_m':'all_required',points,groups,derivedFromGuidance:true} as T;
}
