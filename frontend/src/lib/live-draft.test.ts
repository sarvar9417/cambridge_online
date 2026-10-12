import { describe, expect, it } from 'vitest';
import {
  LIVE_DRAFT_MAX_AGE_MS,
  liveDraftKey,
  migrateLegacyLiveDraft,
  readLiveDraft,
  removeLiveDraft,
  writeLiveDraft,
  type LiveDraftIdentity,
} from './live-draft';

function memoryStorage() {
  const data = new Map<string,string>();
  return {
    getItem(key:string){ return data.get(key) ?? null; },
    setItem(key:string,value:string){ data.set(key,value); },
    removeItem(key:string){ data.delete(key); },
    data,
  };
}

const identity:LiveDraftIdentity = {
  userId:'user-1',
  sessionId:'session-1',
  questionId:'question-1',
};

describe('Live offline draft isolation',()=>{
  it('scopes one draft to user, session and question with an explicit schema version',()=>{
    expect(liveDraftKey(identity)).toBe('campath:live-draft:v1:user-1:session-1:question-1');
    expect(liveDraftKey({...identity,userId:'user-2'})).not.toBe(liveDraftKey(identity));
    expect(liveDraftKey({...identity,questionId:'question-2'})).not.toBe(liveDraftKey(identity));
  });

  it('round-trips a versioned draft and preserves answer metadata',()=>{
    const storage=memoryStorage();
    writeLiveDraft(identity,{answerId:'answer-1',text:'saved offline',tabId:'tab-a',updatedAt:1_000},storage);
    expect(readLiveDraft(identity,{storage,now:1_500})).toEqual({
      version:1,
      ...identity,
      answerId:'answer-1',
      text:'saved offline',
      tabId:'tab-a',
      updatedAt:1_000,
    });
  });

  it('does not leak a draft across accounts sharing the same browser',()=>{
    const storage=memoryStorage();
    writeLiveDraft(identity,{answerId:'answer-1',text:'student one',tabId:'tab-a',updatedAt:1_000},storage);
    expect(readLiveDraft({...identity,userId:'user-2'},{storage,now:1_500})).toBeNull();
    expect(readLiveDraft(identity,{storage,now:1_500})?.text).toBe('student one');
  });

  it('purges stale, future-skewed and malformed records instead of restoring them',()=>{
    const storage=memoryStorage();
    const key=liveDraftKey(identity);
    storage.setItem(key,JSON.stringify({version:1,...identity,answerId:null,text:'stale',tabId:'tab',updatedAt:1_000}));
    expect(readLiveDraft(identity,{storage,now:1_000+LIVE_DRAFT_MAX_AGE_MS+1})).toBeNull();
    expect(storage.getItem(key)).toBeNull();

    storage.setItem(key,JSON.stringify({version:1,...identity,answerId:null,text:'future',tabId:'tab',updatedAt:100_001}));
    expect(readLiveDraft(identity,{storage,now:1_000})).toBeNull();
    expect(storage.getItem(key)).toBeNull();

    storage.setItem(key,'{broken');
    expect(readLiveDraft(identity,{storage,now:1_000})).toBeNull();
    expect(storage.getItem(key)).toBeNull();
  });

  it('migrates the previous session+answer draft without losing recent text',()=>{
    const storage=memoryStorage();
    storage.setItem('campath:live-draft:session-1:answer-1',JSON.stringify({text:'legacy answer',updatedAt:2_000,tabId:'old'}));
    const migrated=migrateLegacyLiveDraft(identity,'answer-1','answer-1','tab-new',{storage,now:2_500});
    expect(migrated?.text).toBe('legacy answer');
    expect(readLiveDraft(identity,{storage,now:2_500})?.answerId).toBe('answer-1');
    expect(storage.getItem('campath:live-draft:session-1:answer-1')).toBeNull();
  });

  it('removes only the current user/session/question draft after submit',()=>{
    const storage=memoryStorage();
    const other={...identity,userId:'user-2'};
    writeLiveDraft(identity,{answerId:'answer-1',text:'one',tabId:'tab-a'},storage);
    writeLiveDraft(other,{answerId:'answer-2',text:'two',tabId:'tab-b'},storage);
    removeLiveDraft(identity,storage);
    expect(readLiveDraft(identity,{storage})).toBeNull();
    expect(readLiveDraft(other,{storage})?.text).toBe('two');
  });
});
