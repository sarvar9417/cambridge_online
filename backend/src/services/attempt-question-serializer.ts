import { parseStructuredQuestionContent, type StructuredQuestionContent } from '../lib/structured-question-content.js';

export interface AttemptQuestionRow {
  id:string;
  display_ref:string;
  stem_md:string|null;
  context_md:string|null;
  parent_context:string|null;
  command_word:string|null;
  marks:number|null;
  answer_kind:string;
  answer_text:string|null;
  content_json?:unknown|null;
  content_version?:number|null;
}

export function attemptQuestionAssetIds(content:StructuredQuestionContent|null) {
  if(!content)return [];
  return [...new Set(content.blocks.flatMap((block)=>block.type==='asset'?[block.assetId]:[]))];
}

export function parseAttemptStructuredContent(row:AttemptQuestionRow) {
  if(row.content_json==null)return null;
  if(Number(row.content_version)!==1)throw new Error(`Unsupported structured content version for question ${row.id}`);
  return parseStructuredQuestionContent(row.content_json);
}

export function serializeAttemptQuestion(
  row:AttemptQuestionRow,
  signedAssetUrls:Record<string,string>={},
) {
  const contentJson=parseAttemptStructuredContent(row);
  const assetIds=attemptQuestionAssetIds(contentJson);
  const assetUrls=Object.fromEntries(
    assetIds
      .filter((id)=>Boolean(signedAssetUrls[id]))
      .map((id)=>[id,signedAssetUrls[id]!] as const),
  );
  return {
    id:row.id,
    displayRef:row.display_ref,
    stemMd:row.stem_md??'',
    contextMd:row.parent_context??row.context_md??'',
    commandWord:row.command_word??'',
    marks:Number(row.marks??0),
    answerKind:row.answer_kind,
    answerText:row.answer_text??'',
    contentJson,
    contentVersion:contentJson?1:null,
    assetUrls,
  };
}
