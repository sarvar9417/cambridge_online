const CONTRACT_SELECTOR='.lesson-checkpoint-contract';
const CARD_SELECTOR='.lesson-exam-card';

function normalizeContract(contract:Element){
  const badge=contract.querySelector(':scope > div > span');
  if(badge)badge.textContent='CURRENT TARGET LO';

  const explanation=contract.querySelector(':scope > p');
  if(explanation){
    explanation.textContent='Approved past-paper leaves are selected from the current syllabus target learning objective(s). Historical source leaves are included only through explicit equivalent/subtopic_compatible compatibility edges.';
  }
}

function normalizeQuestionCard(card:Element){
  const sourceLo=card.querySelector('footer > span:last-child');
  if(!sourceLo)return;
  const value=(sourceLo.textContent??'').trim().replace(/^SOURCE LO\s*·\s*/i,'');
  if(value)sourceLo.textContent=`SOURCE LO · ${value}`;
}

function scan(){
  document.querySelectorAll(CONTRACT_SELECTOR).forEach(normalizeContract);
  document.querySelectorAll(CARD_SELECTOR).forEach(normalizeQuestionCard);
}

let scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;scan();});
}

export function installLessonCheckpointTaxonomyLabels(){
  if(typeof document==='undefined')return;
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

installLessonCheckpointTaxonomyLabels();
