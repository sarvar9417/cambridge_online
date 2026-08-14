import{describe,expect,it,vi}from'vitest';import type{Pool}from'pg';import{assertAssignmentOnlineRenderable}from'./assignment-publish-guard.js';
describe('assignment online publish guard',()=>{
 it('blocks a binary-only portable asset',async()=>{const query=vi.fn().mockResolvedValue({rows:[{portable_snapshot:{contextBlocks:[{assets:[{kind:'diagram',storagePath:'private/network.png',contentMd:null}]}]}}]});await expect(assertAssignmentOnlineRenderable({query}as unknown as Pool,'a1')).rejects.toMatchObject({code:'online_asset_rendering_unavailable',status:409});expect(query).toHaveBeenCalledWith(expect.stringContaining("a.mode<>'pdf'"),['a1'])});
 it('allows textual extracted assets',async()=>{const query=vi.fn().mockResolvedValue({rows:[{portable_snapshot:{contextBlocks:[{assets:[{kind:'table',storagePath:null,contentMd:'|a|b|'}]}]}}]});await expect(assertAssignmentOnlineRenderable({query}as unknown as Pool,'a1')).resolves.toBeUndefined()});
 it('allows assignments without portable snapshots',async()=>{const query=vi.fn().mockResolvedValue({rows:[]});await expect(assertAssignmentOnlineRenderable({query}as unknown as Pool,'legacy')).resolves.toBeUndefined()});
});
