import{describe,expect,it,vi}from'vitest';
import{materializeExportAssets}from'./export-assets.js';

function png(width=2,height=3){const bytes=Buffer.alloc(24);bytes.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],0);bytes.writeUInt32BE(width,16);bytes.writeUInt32BE(height,20);return bytes}

describe('export asset materialization',()=>{
 it('embeds a private PNG as a self-contained SVG while preserving asset id',async()=>{
  const signer={signStoragePath:vi.fn().mockResolvedValue('https://signed.example/q.png')};
  const fetchImpl=vi.fn().mockResolvedValue(new Response(png(),{status:200,headers:{'content-type':'image/png'}})) as unknown as typeof fetch;
  const [question]=await materializeExportAssets([{displayRef:'Q1',stem:'Use source image',marks:1,contextBlocks:[{assets:[{id:'22222222-2222-4222-8222-222222222222',kind:'image',storagePath:'supabase://question-assets/q.png',altText:'Source crop'}]}]}],signer,fetchImpl);
  expect(signer.signStoragePath).toHaveBeenCalledWith('supabase://question-assets/q.png',300);
  expect(question?.contextBlocks?.[0]?.assets?.[0]).toMatchObject({id:'22222222-2222-4222-8222-222222222222',storagePath:'supabase://question-assets/q.png'});
  expect(question?.contextBlocks?.[0]?.assets?.[0]?.contentMd).toContain('<svg');
  expect(question?.contextBlocks?.[0]?.assets?.[0]?.contentMd).toContain('viewBox="0 0 2 3"');
  expect(question?.contextBlocks?.[0]?.assets?.[0]?.contentMd).toContain('data:image/png;base64,');
 });
 it('prefers a ready source crop over an existing generated SVG',async()=>{
  const signer={signStoragePath:vi.fn().mockResolvedValue('https://signed.example/source-crop.png')};
  const fetchImpl=vi.fn().mockResolvedValue(new Response(png(7,5),{status:200,headers:{'content-type':'image/png'}})) as unknown as typeof fetch;
  const generated='<svg viewBox="0 0 99 99"><text>generated substitute</text></svg>';
  const [question]=await materializeExportAssets([{displayRef:'Q2(a)',stem:'Match the items',marks:4,contextBlocks:[{assets:[{
    id:'11111111-1111-4111-8111-111111111111',kind:'diagram',
    storagePath:'supabase://question-assets/source-crop.png',cropStatus:'ready',
    contentMd:generated,altText:'Original Cambridge matching diagram',
  }]}]}],signer,fetchImpl);
  const asset=question?.contextBlocks?.[0]?.assets?.[0];
  expect(signer.signStoragePath).toHaveBeenCalledWith('supabase://question-assets/source-crop.png',300);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(asset?.contentMd).toContain('viewBox="0 0 7 5"');
  expect(asset?.contentMd).toContain('data:image/png;base64,');
  expect(asset?.contentMd).not.toContain('generated substitute');
  expect(asset?.cropStatus).toBe('ready');
 });
 it('fails closed when storage credentials are unavailable',async()=>{
  await expect(materializeExportAssets([{displayRef:'Q1',stem:'Use source image',marks:1,contextBlocks:[{assets:[{kind:'image',storagePath:'supabase://question-assets/q.png',altText:'Required source'}]}]}])).rejects.toThrow('export_asset_storage_unavailable');
 });
 it('leaves already portable semantic/SVG assets untouched',async()=>{
  const [question]=await materializeExportAssets([{displayRef:'Q1',stem:'T',marks:1,contextBlocks:[{assets:[{kind:'table',contentMd:'|A|B|',altText:'Table'}]}]}]);
  expect(question?.contextBlocks?.[0]?.assets?.[0]?.contentMd).toBe('|A|B|');
 });
});
