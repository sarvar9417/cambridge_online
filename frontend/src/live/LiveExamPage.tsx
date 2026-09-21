import type { ClassItem, User } from '../lib/api';
import { navigate, useRoute } from '../lib/router';
import { LiveChallengeAnalyticsPanel } from './LiveChallengeAnalyticsPanel';
import { LiveChallengeBoard } from './LiveChallengeBoard';
import { LiveChallengeBuilder } from './LiveChallengeBuilder';
import { LiveChallengeParticipationControls } from './LiveChallengeParticipationControls';
import { LiveChallengeStaffLanding } from './LiveChallengeStaffLanding';
import { LiveChallengeStudentLanding } from './LiveChallengeStudentLanding';
import { LiveExamPage as LiveExamRuntime } from './LiveExamRuntime';
import './live-exam.css';

/** One canonical Cambridge Live Challenge entry point. */
export function LiveExamPage({user,classes}:{user:User;classes:ClassItem[]}) {
  const route=useRoute();
  const builderId=route.params.get('builder');
  const analyticsId=route.params.get('analytics');
  const sessionId=route.params.get('id');
  const projector=route.params.get('projector')==='1';

  if(builderId){
    if(user.role==='student')return <div className="live-page"><p className="live-error">Live Challenge builder faqat o‘qituvchi uchun mavjud.</p></div>;
    return <LiveChallengeBuilder draftId={builderId} user={user}/>;
  }

  if(analyticsId){
    if(user.role==='student')return <div className="live-page"><p className="live-error">Analytics faqat o‘qituvchi uchun mavjud.</p></div>;
    return <div className="live-page live-landing">
      <header className="live-page-head"><div><span className="live-eyebrow">CAMBRIDGE LIVE CHALLENGE</span><h1>Session analytics</h1><p>Cambridge marks va learning-objective evidence asosidagi yakuniy tahlil.</p></div><button className="live-secondary" onClick={()=>navigate('oqitish/live')}>Challenge’lar</button></header>
      <LiveChallengeAnalyticsPanel sessionId={analyticsId}/>
    </div>;
  }

  // The projector never loads the private staff snapshot. It talks only to the
  // server-side learner-safe board projection endpoint.
  if(projector&&sessionId&&user.role!=='student')return <LiveChallengeBoard sessionId={sessionId}/>;

  if(!sessionId&&user.role==='student')return <LiveChallengeStudentLanding/>;
  if(!sessionId&&user.role!=='student')return <LiveChallengeStaffLanding/>;
  if(!sessionId)return null;

  return <>
    <LiveExamRuntime user={user} classes={classes}/>
    <LiveChallengeParticipationControls user={user} sessionId={sessionId}/>
  </>;
}
