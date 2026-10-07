import { useEffect, useMemo, useRef } from 'react';
import { isStructuredQuestionContent, type StructuredQuestionContent } from '../lib/structured-question-content';
import { inspectStructuredQuestionIntegrity } from '../lib/structured-question-integrity';
import { renderStructuredQuestionContent } from '../lib/structured-question-renderer';
import './structured-question-reading.css';

export function structuredQuestionUsable(value:unknown):value is StructuredQuestionContent {
  return isStructuredQuestionContent(value);
}

export function structuredQuestionAssetsReady(content:StructuredQuestionContent,assetUrls:Record<string,string>={}) {
  return content.blocks.every((block)=>block.type!=='asset'||Boolean(assetUrls[block.assetId]));
}

export function structuredQuestionRenderSignature(
  content:StructuredQuestionContent,
  assetUrls:Record<string,string>={},
) {
  return JSON.stringify([
    content,
    Object.entries(assetUrls).sort(([left],[right])=>left.localeCompare(right)),
  ]);
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
  const findings=useMemo(()=>valid?inspectStructuredQuestionIntegrity(content):[],[content,valid]);
  const presentationReady=valid&&findings.length===0;
  const assetsReady=presentationReady&&structuredQuestionAssetsReady(content,assetUrls);
  const renderSignature=structuredQuestionRenderSignature(content,assetUrls);

  useEffect(()=>{
    const node=host.current;
    if(!node||!presentationReady||!assetsReady)return;
    node.replaceChildren(renderStructuredQuestionContent(content,{
      resolveAsset:(assetId)=>assetUrls[assetId]??null,
    }));
    return()=>node.replaceChildren();
  },[renderSignature,presentationReady,assetsReady]);

  if(!valid){
    return (
      <div className="structured-question-invalid" role="alert">
        Savolning source-backed tarkibini tekshirib bo‘lmadi. Savol to‘liq ko‘rsatilmaguncha javob berish bloklandi.
      </div>
    );
  }
  if(findings.length){
    return (
      <div className="structured-question-integrity-error" role="alert" data-integrity-code={findings[0]?.code}>
        <strong>Savol ko‘rinishi tekshiruvdan o‘tmadi.</strong>
        Jadval yoki boshqa source tuzilmasi oddiy matnga qo‘shilib ketgan bo‘lishi mumkin. Noto‘liq yoki noto‘g‘ri ko‘rinish bilan ishlash bloklandi.
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
