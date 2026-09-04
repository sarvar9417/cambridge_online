import type{IngestionStageHandler}from'./ingestion.js';import type{ExtractedQuestion}from'./ingestion-contract.js';import{enforceSourceVisualFidelity}from'./source-visual-fidelity.js';import{enforceSourceStructureFidelity}from'./source-structure-fidelity.js';
type Artifact=Record<string,unknown>;
/** bbox is [x1,y1,x2,y2] in pixels of the 200-dpi rendered page image. */
export interface AssetCandidate{questionPath:string;assetIndex:number;kind:string;sourcePage:number;bbox:[number,number,number,number];altText:string}
export const validateAssetMetadataStage:IngestionStageHandler=async(_refId,input)=>validateAssetMetadata(input);
export function validateAssetMetadata(input:Artifact):Artifact{
 const questions=Array.isArray(input.questions)?input.questions as ExtractedQuestion[]:[],assetCandidates:AssetCandidate[]=[];
 const validated=questions.map(question=>{const issues=[...question.issues];let forceReview=false;question.assets.forEach((asset,index)=>{
   if(asset.contentMd)return;
   if(!asset.page||!asset.bbox){issues.push(`asset_missing_crop_coordinates:${index}`);forceReview=true;return}
   const[x1,y1,x2,y2]=asset.bbox;if(![x1,y1,x2,y2].every(Number.isFinite)||x1<0||y1<0||x2<=x1||y2<=y1){issues.push(`asset_invalid_crop_coordinates:${index}`);forceReview=true;return}
   assetCandidates.push({questionPath:question.path,assetIndex:index,kind:asset.kind,sourcePage:asset.page,bbox:asset.bbox,altText:asset.altText});
  });return{...question,confidence:forceReview?Math.min(question.confidence,.79):question.confidence,issues:[...new Set(issues)]}});
 const visualChecked=enforceSourceVisualFidelity(validated);
 const next=enforceSourceStructureFidelity(visualChecked);
 return{...input,questions:next,assetCandidates};
}
