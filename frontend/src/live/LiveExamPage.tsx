import type { ClassItem, User } from '../lib/api';
import { useRoute } from '../lib/router';
import { LiveChallengeBuilder } from './LiveChallengeBuilder';
import { LiveChallengeStaffLanding } from './LiveChallengeStaffLanding';
import { LiveExamPage as LiveExamRuntime } from './LiveExamRuntime';

/**
 * Canonical Live Challenge entry point.
 *
 * Staff creation now always enters the draft builder. Runtime sessions and the
 * student's code/join surface continue to reuse the proven classroom runtime.
 */
export function LiveExamPage({user,classes}:{user:User;classes:ClassItem[]}) {
  const route=useRoute();
  const builderId=route.params.get('builder');
  const sessionId=route.params.get('id');

  if(builderId){
    if(user.role==='student'){
      return <div className="live-page"><p className="live-error">Live Challenge builder faqat o‘qituvchi uchun mavjud.</p></div>;
    }
    return <LiveChallengeBuilder draftId={builderId} user={user}/>;
  }

  if(user.role!=='student'&&!sessionId)return <LiveChallengeStaffLanding/>;
  return <LiveExamRuntime user={user} classes={classes}/>;
}
