import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');

describe('Live Challenge answer resilience contract',()=>{
  it('persists empty answers and serializes overlapping autosaves',()=>{
    expect(page).not.toContain("if(!text||session.status!=='question_open'");
    expect(page).toContain('const saveInFlight=useRef(false)');
    expect(page).toContain('if(saveInFlight.current)return');
    expect(page).toContain('pendingSave.current!==null');
    expect(page).toContain('latestAnswer.current=value;pendingSave.current=value');
  });

  it('does not overwrite a recoverable local draft before hydration',()=>{
    expect(page).toContain("const [hydratedKey,setHydratedKey]=useState('')");
    expect(page).toContain('hydratedKey!==draftKey');
    expect(page).toContain('localDraft.updatedAt>serverUpdatedAt');
    expect(page).toContain('snapshot.ownAnswer?.updatedAt');
  });

  it('uses the privacy-scoped projector snapshot and closes answer controls at zero',()=>{
    expect(page).toContain("${projector?'/projector':''}");
    expect(page).toContain('projectorView=projector&&user.role!==\'student\'');
    expect(page).toContain('busy||remaining===0||Boolean(snapshot.ownAnswer?.submittedAt)');
  });
});
