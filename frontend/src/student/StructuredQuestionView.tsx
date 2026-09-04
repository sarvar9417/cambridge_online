import { useEffect, useRef } from 'react';
import { isStructuredQuestionContent, type StructuredQuestionContent } from '../lib/structured-question-content';
import { renderStructuredQuestionContent } from '../lib/structured-question-renderer';

export function structuredQuestionUsable(value:unknown):value is StructuredQuestionContent {
  return isStructuredQuestionContent(value);
}

export function structuredQuestionAssetsReady(content:StructuredQuestionContent,assetUrls:Record<string,string>={}) {
  return content.blocks.every((block)=>block.type!=='asset'||Boolean(assetUrls[block.assetId]));
}

export function StructuredQuestionView({
  content,
  assetUrls={},
}: {
  content:StructuredQuestionContent;
  assetUrls?:Record<string,string>;
}) {
  const host=useRef<HTMLDivElement>(null);
  const valid=structuredQuestionUsable(content);
  const assetsReady=valid&&structuredQuestionAssetsReady(content,assetUrls);

  useEffect(()=>{
    const node=host.current;
    if(!node||!valid||!assetsReady)return;
    node.replaceChildren(renderStructuredQuestionContent(content,{
      resolveAsset:(assetId)=>assetUrls[assetId]??null,
    }));
    return()=>node.replaceChildren();
  },[content,assetUrls,valid,assetsReady]);

  if(!valid){
    return (
      <div className="structured-question-invalid" role="alert">
        Savolning source-backed tarkibini tekshirib bo‘lmadi. Savol to‘liq ko‘rsatilmaguncha javob berish bloklandi.
      </div>
    );
  }
  if(!assetsReady){
    return (
      <div className="structured-question-invalid" role="alert">
        Savolga tegishli diagramma yoki rasm yuklanmadi. Noto‘liq savol bilan ishlash bloklandi.
      </div>
    );
  }

  return <div ref={host} className="structured-question-view" data-content-version="1" />;
}
