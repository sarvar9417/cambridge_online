/**
 * Conservative, offline DOCX text-to-draft importer.
 * No auto-grading keys are guessed. Documents with figures are rejected rather than
 * silently dropping examinable information. A-D questions must be explicit.
 */
const WORD_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DRAW_NS='http://schemas.openxmlformats.org/drawingml/2006/main';
function parseDocument(xml:string){
  const document=new DOMParser().parseFromString(xml,'application/xml');
  if(document.querySelector('parsererror'))throw Error('Word XML formatini o‘qib bo‘lmadi.');
  if(document.getElementsByTagNameNS(WORD_NS,'drawing').length||
    document.getElementsByTagNameNS(WORD_NS,'pict').length||
    document.getElementsByTagNameNS(DRAW_NS,'graphic').length){
    throw Error('Word faylida diagramma yoki rasm bor. Savolni yo‘qotmaslik uchun JSON ko‘rib chiqilgan paketdan foydalaning.');
  }
  return [...document.getElementsByTagNameNS(WORD_NS,'p')]
    .map(p=>[...p.getElementsByTagNameNS(WORD_NS,'t')].map(t=>t.textContent??'').join('').trim())
    .filter(Boolean);
}
export type WordDraftQuestion={prompt:string;options:string[];correctIndex:null;
  topic:string;maxMarks:number;sourceNumber:number};
export function extractWordMcqs(xml:string):WordDraftQuestion[]{
  const lines=parseDocument(xml);
  const questions:WordDraftQuestion[]=[];
  let current:{prompt:string;options:string[];sourceNumber:number}|null=null;
  let optionMode=false;
  const commit=()=>{
    if(!current)return;
    if(current.options.length!==4||!current.options.every(option=>option.trim()))
      throw Error(current.sourceNumber+'-savolning A–D variantlari aniq ajratilmadi. Word formatini tekshiring.');
    questions.push({prompt:current.prompt.trim(),options:current.options,
      correctIndex:null,topic:'Unclassified',maxMarks:1,sourceNumber:current.sourceNumber});
    current=null;optionMode=false;
  };
  for(const line of lines){
    if(/^(?:answer\s*key|answers|javoblar)\s*[:\-]?/i.test(line)){commit();break;}
    const num=/^(?:question\s*)?(\d{1,3})[\).:]\s+(.+)/i.exec(line);
    const option=/^([A-D])[\).:]\s+(.+)/.exec(line);
    if(num&&(!current||current.options.length===4)){
      commit();current={sourceNumber:Number(num[1]),prompt:num[2]!,options:[]};
      optionMode=false;continue;
    }
    if(!current)continue;
    if(option&&current.options.length<4&&option[1]==='ABCD'[current.options.length]){
      current.options.push(option[2]!.trim());optionMode=true;continue;
    }
    if(optionMode&&current.options.length){
      current.options[current.options.length-1]+=' '+line;continue;
    }
    current.prompt+=' '+line;
  }
  commit();
  if(!questions.length)throw Error('Word hujjatida raqamlangan va A–D variantli savollar aniqlanmadi.');
  if(questions.length>100)throw Error('Bir testda 100 tadan ortiq savol bo‘lmasligi kerak.');
  return questions;
}
export async function importWordDocx(file:File){
  if(!/\.docx$/i.test(file.name))throw Error('Faqat .docx Word formati qo‘llab-quvvatlanadi.');
  if(file.size>8*1024*1024)throw Error('Word fayli 8 MB dan oshmasin.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const u16=(n:number)=>dv.getUint16(n,true),u32=(n:number)=>dv.getUint32(n,true);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
    if(u32(i)===0x06054b50){end=i;break;}
  }
  if(end<0)throw Error('DOCX ZIP tuzilmasi topilmadi.');
  const count=u16(end+10),base=u32(end+16);
  if(count>10000||base>=bytes.length)throw Error('DOCX ZIP tuzilmasi noto‘g‘ri.');
  let cursor=base;let xml='';
  for(let i=0;i<count;i++){
    if(cursor+46>bytes.length||u32(cursor)!==0x02014b50)throw Error('DOCX katalogi buzilgan.');
    const method=u16(cursor+10),size=u32(cursor+20),
      nameLength=u16(cursor+28),extraLength=u16(cursor+30),commentLength=u16(cursor+32);
    const name=new TextDecoder().decode(bytes.slice(cursor+46,cursor+46+nameLength));
    if(name==='word/document.xml'){
      const local=u32(cursor+42);
      if(local+30>bytes.length||u32(local)!==0x04034b50)throw Error('DOCX XML yozuvi buzilgan.');
      const dataStart=local+30+u16(local+26)+u16(local+28);
      if(dataStart+size>bytes.length||size>8*1024*1024)throw Error('DOCX XML hajmi noto‘g‘ri.');
      const compressed=bytes.slice(dataStart,dataStart+size);
      if(method===0)xml=new TextDecoder().decode(compressed);
      else if(method===8){
        if(typeof DecompressionStream==='undefined')
          throw Error('Brauzer Word faylini ocholmaydi. JSON paketdan foydalaning.');
        const output=new Blob([compressed]).stream()
          .pipeThrough(new DecompressionStream('deflate-raw'));
        xml=new TextDecoder().decode(await new Response(output).arrayBuffer());
      }else throw Error('DOCX ZIP compression formati qo‘llab-quvvatlanmaydi.');
      break;
    }
    cursor+=46+nameLength+extraLength+commentLength;
  }
  if(!xml)throw Error('Word faylida document.xml topilmadi.');
  const grade=/\bGrade[ _-]*([5-9])\b/i.exec(file.name)?.[1];
  if(grade){
    const title=parseDocument(xml).find(line=>/^Stage\s*\d+/i.test(line));
    const stage=title?(/^Stage\s*(\d+)/i.exec(title)?.[1]):null;
    if(stage&&stage!==grade)
      throw Error('Word faylining nomi Grade '+grade+
        ', ichki sarlavhasi esa Stage '+stage+
        '. Savollarni noto‘g‘ri sinfga tarqatmaslik uchun manbani tekshiring.');
  }
  return extractWordMcqs(xml);
}

// A Word file cannot provide an authoritative key. Infer the obvious course
// and grade only from the filename, and reject contradictory internal headers.
export function detectWordAssessmentMetadata(filename:string){
  const grade=/\bGrade[ _-]*([5-9])\b/i.exec(filename)?.[1];
  if(grade)return {courseCode:'school' as const,gradeLabel:'Grade '+grade,
    title:filename.replace(/\.docx$/i,'').replaceAll('_',' ')};
  const course=/\b(0478|9618)\b/.exec(filename)?.[1];
  if(course)return {courseCode:course as '0478'|'9618',
    gradeLabel:/paper[ _-]*3/i.test(filename)?'Paper 3':'Paper 1',
    title:filename.replace(/\.docx$/i,'').replaceAll('_',' ')};
  throw Error('Fayl nomida Grade 5–9 yoki 0478/9618 kodi yo‘q. Avval nomni aniqlang.');
}
