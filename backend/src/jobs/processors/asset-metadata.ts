import type{IngestionStageHandler}from'./ingestion.js';import type{ExtractedQuestion}from'./ingestion-contract.js';
type Artifact=Record<string,unknown>;
export interface AssetCandidate{questionPath:string;assetIndex:number;kind:string;sourcePage:number;bbox:[number,number,number,number];altText:string}
export const validateAssetMetadataStage:IngestionStageHandler=async(_refId,input)=>validateAssetMetadata(input);
export function validateAssetMetadata(input:Artifact):Artifact{
 const questions=Array.isArray(input.questions)?input.questions as ExtractedQuestion[]:[],assetCandidates:AssetCandidate[]=[];
 const next=questions.map(question=>{const issues=[...question.issues];question.assets.forEach((asset,index)=>{
   if(asset.contentMd)return;
   if(!asset.page||!asset.bbox){issues.push(`asset_missing_crop_coordinates:${index}`);return}
   const[x,y,width,height]=asset.bbox;if(![x,y,width,height].every(Number.isFinite)||x<0||y<0||width<=0||height<=0){issues.push(`asset_invalid_crop_coordinates:${index}`);return}
   assetCandidates.push({questionPath:question.path,assetIndex:index,kind:asset.kind,sourcePage:asset.page,bbox:asset.bbox,altText:asset.altText});
  });return{...question,issues:[...new Set(issues)]}});
 return{...input,questions:next,assetCandidates};
}
