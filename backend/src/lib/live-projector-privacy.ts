const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function projectorUuid(index:number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12,'0')}`;
}

function redactValue(value:unknown, ids:Map<string,string>):unknown {
  if (typeof value === 'string' && UUID.test(value)) {
    let mapped=ids.get(value);
    if(!mapped){
      mapped=projectorUuid(ids.size+1);
      ids.set(value,mapped);
    }
    return mapped;
  }
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item)=>redactValue(item,ids));
  if (!value || typeof value !== 'object') return value;
  const output:Record<string,unknown>={};
  for(const [key,item] of Object.entries(value as Record<string,unknown>)){
    // Storage object paths are implementation details and can contain source
    // question identifiers. A signed/renderable URL is sufficient for display.
    if(key==='storagePath') {
      output[key]=null;
      continue;
    }
    output[key]=redactValue(item,ids);
  }
  return output;
}

/**
 * Projector snapshots are shown on shared/public displays. Keep the rendering
 * contract intact while replacing database UUIDs with response-local aliases
 * and forcing every learner-specific payload surface empty.
 */
export function sanitizeLiveProjectorSnapshot<T extends Record<string,unknown>>(snapshot:T):T {
  const sanitized=redactValue(snapshot,new Map()) as Record<string,unknown>;
  sanitized.questions=[];
  sanitized.participants=[];
  sanitized.ownAnswer=null;
  sanitized.review=null;
  sanitized.teacherAnswers=[];
  sanitized.report=null;

  const question=sanitized.question;
  if(question && typeof question==='object' && !Array.isArray(question)){
    const dependencyWork=(question as Record<string,unknown>).dependencyWork;
    if(Array.isArray(dependencyWork)){
      for(const item of dependencyWork){
        if(item && typeof item==='object' && !Array.isArray(item)){
          (item as Record<string,unknown>).ownAnswer=null;
          (item as Record<string,unknown>).submittedAt=null;
        }
      }
    }
  }
  return sanitized as T;
}
