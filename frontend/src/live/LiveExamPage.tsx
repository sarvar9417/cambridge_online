import type { ClassItem, User } from '../lib/api';
import { useRoute } from '../lib/router';
import { LiveChallengeBuilder } from './LiveChallengeBuilder';
import { LiveExamPage as LiveExamRuntime } from './LiveExamRuntime';

/**
 * Canonical Live Challenge entry point.
 *
 * Builder and runtime share the same teaching route, but remain separate React
 * surfaces so the draft workflow cannot accidentally inherit classroom polling
 * or student-room behavior. Published/runtime sessions still use the proven
 * LiveExamRuntime implementation.
 */
export function LiveExamPage({user,classes}:{user:User;classes:ClassItem[]}) {
  const route=useRoute();
  const builderId=route.params.get('builder');

  if(builderId){
    if(user.role==='student'){
      return <div className="live-page"><p className="live-error">Live Challenge builder faqat o‘qituvchi uchun mavjud.</p></div>;
    }
    return <LiveChallengeBuilder draftId={builderId} user={user}/>;
  }

  return <LiveExamRuntime user={user} classes={classes}/>;
}
