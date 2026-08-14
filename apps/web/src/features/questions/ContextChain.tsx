import type { Portable } from './types';

export function ContextChain({ portable }: { portable: Portable }) {
  return (
    <>
      {portable.contextBlocks.map((block) => (
        <section key={block.id} className="space-y-2 border-l-2 border-teal-600 pl-4">
          {block.context && (
            <p className="whitespace-pre-wrap text-sm text-slate-700">{block.context}</p>
          )}
          {block.assets.map((asset) => (
            <figure key={asset.id} className="space-y-1">
              {asset.svgMarkup ? (
                <div
                  className="max-w-full overflow-auto"
                  dangerouslySetInnerHTML={{ __html: asset.svgMarkup }}
                />
              ) : asset.storagePath ? (
                <img
                  src={asset.storagePath}
                  alt={asset.altText}
                  className="max-h-72 max-w-full object-contain"
                />
              ) : null}
              {asset.contentMd && (
                <figcaption className="whitespace-pre-wrap text-sm text-slate-600">
                  {asset.contentMd}
                </figcaption>
              )}
            </figure>
          ))}
        </section>
      ))}
    </>
  );
}
