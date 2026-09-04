import type { Assignment, Flashcard, MasteryItem, ResultItem } from '../lib/api';
import { navigate } from '../lib/router';
import { isOpen, urgencyOf } from './StudentHome';
import './student-next-action.css';

export type StudentNextActionModel =
  | {kind:'assignment';title:string;detail:string;assignmentId:string}
  | {kind:'flashcards';title:string;detail:string}
  | {kind:'practice';title:string;detail:string;item:MasteryItem}
  | {kind:'results';title:string;detail:string}
  | {kind:'lessons';title:string;detail:string};

export function nextStudentAction(assignments:Assignment[],results:ResultItem[],mastery:MasteryItem[],flashcards:Flashcard[]):StudentNextActionModel {
  const open=assignments.filter(isOpen);
  const inProgress=open.find((item)=>item.submissionStatus==='in_progress');
  if(inProgress)return{kind:'assignment',title:'Boshlangan vazifani tugat',detail:`${inProgress.title} · ${inProgress.totalMarks} ball`,assignmentId:inProgress.id};
  const urgent=[...open].filter((item)=>['overdue','today','soon'].includes(urgencyOf(item.dueAt))).sort((a,b)=>(a.dueAt?+new Date(a.dueAt):Infinity)-(b.dueAt?+new Date(b.dueAt):Infinity))[0];
  if(urgent)return{kind:'assignment',title:urgencyOf(urgent.dueAt)==='overdue'?'Muddati o‘tgan vazifani bajar':'Eng yaqin vazifani bajar',detail:`${urgent.title} · ${urgent.totalMarks} ball`,assignmentId:urgent.id};
  if(flashcards.length)return{kind:'flashcards',title:'Bugungi takrorlashni tugat',detail:`${flashcards.length} ta kartochka kutmoqda`};
  const weak=[...mastery].filter((item)=>item.attempts>0&&item.practiceReady).sort((a,b)=>a.score-b.score)[0];
  if(weak&&weak.score<.8)return{kind:'practice',title:'Eng kuchsiz subtopicni mashq qil',detail:`${weak.code} ${weak.title} · ${Math.round(weak.score*100)}% mastery`,item:weak};
  const low=[...results].sort((a,b)=>+new Date(b.releasedAt)-+new Date(a.releasedAt)).find((item)=>item.percentage<70);
  if(low)return{kind:'results',title:'So‘nggi xatolarni tahlil qil',detail:`${low.title} · ${Math.round(low.percentage)}%`};
  return{kind:'lessons',title:'Keyingi darsni o‘rgan',detail:'Source-backed Study Mode’dan davom et'};
}

export function StudentNextAction({assignments,results,mastery,flashcards,onStart,onPractice}:{assignments:Assignment[];results:ResultItem[];mastery:MasteryItem[];flashcards:Flashcard[];onStart:(id:string)=>void;onPractice:(item:MasteryItem)=>void}) {
  const action=nextStudentAction(assignments,results,mastery,flashcards);
  const run=()=>{
    if(action.kind==='assignment')return onStart(action.assignmentId);
    if(action.kind==='practice')return onPractice(action.item);
    if(action.kind==='flashcards')return navigate('oquvchi/organish');
    if(action.kind==='results')return navigate('oquvchi/natijalar');
    navigate('oquvchi/darslar');
  };
  return <section className={`sna sna--${action.kind}`}>
    <div><span>TAVSIYA ETILGAN KEYINGI QADAM</span><h2>{action.title}</h2><p>{action.detail}</p></div>
    <button type="button" onClick={run}>{action.kind==='assignment'?'Ochish':action.kind==='practice'?'Mashqni boshlash':action.kind==='flashcards'?'Takrorlash':action.kind==='results'?'Natijani ochish':'Darslarga o‘tish'} →</button>
  </section>;
}
