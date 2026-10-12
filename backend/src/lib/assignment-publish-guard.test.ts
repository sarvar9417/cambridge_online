import{describe,expect,it,vi}from'vitest';import type{Pool}from'pg';import{assertAssignmentOnlineRenderable}from'./assignment-publish-guard.js';
describe('assignment online publish guard',()=>{
 it('blocks a binary-only portable asset',async()=>{
  const query=vi.fn()
   .mockResolvedValueOnce({rows:[{portable_snapshot:{contextBlocks:[{assets:[{kind:'diagram',storagePath:'private/network.png',contentMd:null}]}]}}]});
  await expect(assertAssignmentOnlineRenderable({query}as unknown as Pool,'a1')).rejects.toMatchObject({code:'online_asset_rendering_unavailable',status:409});
  expect(query).toHaveBeenCalledWith(expect.stringContaining("a.mode<>'pdf'"),['a1']);
 });
 it('allows a renderable question whose response surface passes the database gate',async()=>{
  const query=vi.fn()
   .mockResolvedValueOnce({rows:[{portable_snapshot:{contextBlocks:[{assets:[{kind:'table',storagePath:null,contentMd:'|a|b|'}]}]}}]})
   .mockResolvedValueOnce({rowCount:0,rows:[]});
  await expect(assertAssignmentOnlineRenderable({query}as unknown as Pool,'a1')).resolves.toBeUndefined();
  expect(String(query.mock.calls[1]?.[0])).toContain("response_block->>'type'='table'");
 });
 it('blocks a table/matching task whose source-backed answer surface is not usable online',async()=>{
  const query=vi.fn()
   .mockResolvedValueOnce({rows:[]})
   .mockResolvedValueOnce({rowCount:1,rows:[{display_ref:'9618/21/M/J/26 Q8(a)'}]});
  await expect(assertAssignmentOnlineRenderable({query}as unknown as Pool,'a1'))
   .rejects.toMatchObject({code:'online_response_rendering_unavailable',status:409});
 });
 it('allows assignments without portable snapshots when their canonical response surfaces pass',async()=>{
  const query=vi.fn()
   .mockResolvedValueOnce({rows:[]})
   .mockResolvedValueOnce({rowCount:0,rows:[]});
  await expect(assertAssignmentOnlineRenderable({query}as unknown as Pool,'legacy')).resolves.toBeUndefined();
 });
});