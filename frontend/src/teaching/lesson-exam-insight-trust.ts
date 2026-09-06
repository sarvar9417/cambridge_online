const reviewed9618Pattern=/reviewed 9618 mark schemes/gi;
const accurate9618Label='9618 QP corpus + approved/review-tracked MS (trust shown per question)';

/**
 * The 0478 Chapter 7 corpus is fully approved for the audited checkpoint LOs.
 * The 9618 Chapter 1/13 corpus is not: many linked MS records remain
 * source-audited `needs_review`. Lesson guidance therefore must not imply that
 * every 9618 scheme behind an insight has already been reviewed/approved.
 */
export function normalizeLessonExamInsightTrust(value:string){
  return value.replace(reviewed9618Pattern,accurate9618Label);
}

function scan(){
  document.querySelectorAll<HTMLElement>('.lesson-exam-insight small').forEach(source=>{
    const current=source.textContent??'';
    const next=normalizeLessonExamInsightTrust(current);
    if(next!==current){
      source.textContent=next;
      source.dataset.examInsightTrust='normalized';
    }
  });
}

let installed=false;
let scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;scan()});
}

export function installLessonExamInsightTrust(){
  if(installed||typeof document==='undefined')return;
  installed=true;
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

installLessonExamInsightTrust();
