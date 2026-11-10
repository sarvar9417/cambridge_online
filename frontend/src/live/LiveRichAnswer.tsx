import { useEffect, useRef, useState, type ReactNode } from 'react';
import './live-rich-answer.css';

/** The existing answer_text column remains backward-compatible with plain text. */
export const LIVE_RICH_ANSWER_PREFIX = '@@LIVE_RICH_V1@@';
export const LIVE_ANSWER_MAX_LENGTH = 20000;
const ALLOWED_TAGS = new Set(['p','div','br','strong','b','em','i','u','ol','ul','li','pre','code','blockquote']);
const DROP_TAGS = new Set(['script','style','svg','math','iframe','object','embed','form','input','button','img','video','audio','link','meta']);

export function isLiveRichAnswer(value:string) {
  return value.startsWith(LIVE_RICH_ANSWER_PREFIX);
}

/** Readable text for counters, exports and non-HTML consumers. Never execute stored markup. */
export function liveAnswerPlainText(value:string) {
  if (!isLiveRichAnswer(value)) return value;
  return value.slice(LIVE_RICH_ANSWER_PREFIX.length)
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<\/(?:p|div|li|ol|ul|pre|blockquote)>/gi,'\n')
    .replace(/<[^>]*>/g,'')
    .replace(/&(?:nbsp|#160);/gi,' ')
    .replace(/&(?:lt|#60);/gi,'<')
    .replace(/&(?:gt|#62);/gi,'>')
    .replace(/&(?:quot|#34);/gi,'"')
    .replace(/&(?:apos|#39);/gi,"'")
    .replace(/&amp;/gi,'&')
    .trim();
}

/**
 * Strict no-attributes allowlist. Build fresh DOM nodes rather than copying
 * user-provided attributes, styles, event handlers, images or links.
 */
export function sanitizeLiveRichHtml(html:string) {
  if (typeof document==='undefined') return '';
  const parsed=document.createElement('template');
  parsed.innerHTML=html;
  const out=document.createElement('div');
  const visit=(node:Node,parent:Node)=>{
    if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.textContent??''));return}
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    const name=(node as Element).tagName.toLowerCase();
    if(DROP_TAGS.has(name))return;
    if(ALLOWED_TAGS.has(name)){
      const child=document.createElement(name);
      parent.appendChild(child);
      for(const item of Array.from(node.childNodes))visit(item,child);
      return;
    }
    for(const item of Array.from(node.childNodes))visit(item,parent);
  };
  for(const node of Array.from(parsed.content.childNodes))visit(node,out);
  return out.innerHTML;
}

function htmlToNodes(html:string):ReactNode {
  if(typeof document==='undefined')return liveAnswerPlainText(LIVE_RICH_ANSWER_PREFIX+html);
  const parsed=document.createElement('template');
  parsed.innerHTML=sanitizeLiveRichHtml(html);
  const toReact=(node:Node,key:number):ReactNode=>{
    if(node.nodeType===Node.TEXT_NODE)return node.textContent;
    if(node.nodeType!==Node.ELEMENT_NODE)return null;
    const name=(node as Element).tagName.toLowerCase();
    if(!ALLOWED_TAGS.has(name))return null;
    const children=Array.from(node.childNodes).map((child,index)=>toReact(child,index));
    // No attributes from untrusted answers are ever passed into React.
    return name==='br'?<br key={key}/>:name==='pre'?<pre key={key}>{children}</pre>
      :name==='code'?<code key={key}>{children}</code>
      :name==='p'?<p key={key}>{children}</p>
      :name==='div'?<div key={key}>{children}</div>
      :name==='strong'||name==='b'?<strong key={key}>{children}</strong>
      :name==='em'||name==='i'?<em key={key}>{children}</em>
      :name==='u'?<u key={key}>{children}</u>
      :name==='ol'?<ol key={key}>{children}</ol>
      :name==='ul'?<ul key={key}>{children}</ul>
      :name==='li'?<li key={key}>{children}</li>
      :<blockquote key={key}>{children}</blockquote>;
  };
  return Array.from(parsed.content.childNodes).map((node,index)=>toReact(node,index));
}

export function LiveAnswerDisplay({value}:{value:string}) {
  if(!value)return <span>Javob yozilmagan</span>;
  if(!isLiveRichAnswer(value))return <span className="live-answer-plain">{value}</span>;
  return <div className="live-answer-formatted">{htmlToNodes(value.slice(LIVE_RICH_ANSWER_PREFIX.length))}</div>;
}

type LiveRichAnswerEditorProps={
  id:string; value:string; onChange:(next:string)=>void; disabled?:boolean;
  'aria-describedby'?:string;
};
const COMMANDS=[
  {key:'bold',label:'Qalin',title:'Bold (Ctrl+B)',text:'B'},
  {key:'italic',label:'Qiya',title:'Italic (Ctrl+I)',text:'I'},
  {key:'underline',label:'Tagiga chizish',title:'Underline (Ctrl+U)',text:'U'},
  {key:'insertUnorderedList',label:'Belgili ro‘yxat',title:'Bullets',text:'•'},
  {key:'insertOrderedList',label:'Raqamli ro‘yxat',title:'Numbered list',text:'1.'},
  {key:'formatBlock',label:'Kod bloki',title:'Code / pseudocode block',text:'</>'},
  {key:'undo',label:'Ortga qaytarish',title:'Undo (Ctrl+Z)',text:'↶'},
  {key:'redo',label:'Qayta tiklash',title:'Redo (Ctrl+Y)',text:'↷'},
] as const;

export function LiveRichAnswerEditor({id,value,onChange,disabled=false,'aria-describedby':describedBy}:LiveRichAnswerEditorProps) {
  const ref=useRef<HTMLDivElement>(null);
  const lastValue=useRef<string|null>(null);
  const [overLimit,setOverLimit]=useState(false);
  useEffect(()=>{
    const editor=ref.current;
    if(!editor||lastValue.current===value)return;
    if(isLiveRichAnswer(value))editor.innerHTML=sanitizeLiveRichHtml(value.slice(LIVE_RICH_ANSWER_PREFIX.length));
    else {
      editor.replaceChildren();
      // Legacy plain-text drafts stay literal (including <script> and newlines).
      editor.appendChild(document.createTextNode(value));
    }
    lastValue.current=value;
    setOverLimit(false);
  },[value]);
  const sync=()=>{
    const editor=ref.current;
    if(!editor||disabled)return;
    const text=editor.textContent??'';
    // Prevent empty rich envelopes and preserve the same server 20k limit.
    const next=text.trim()?LIVE_RICH_ANSWER_PREFIX+sanitizeLiveRichHtml(editor.innerHTML):'';
    if(next.length>LIVE_ANSWER_MAX_LENGTH){
      setOverLimit(true);
      document.execCommand('undo');
      return;
    }
    setOverLimit(false);
    lastValue.current=next;
    onChange(next);
  };
  const action=(key:typeof COMMANDS[number]['key'])=>{
    if(disabled||!ref.current)return;
    ref.current.focus();
    document.execCommand(key,false,key==='formatBlock'?'pre':undefined);
    sync();
  };
  return <div className="live-rich-editor" data-testid="live-rich-editor">
    <div className="live-editor-toolbar" role="toolbar" aria-label="Javob matnini formatlash">
      {COMMANDS.map(command=><button type="button" key={command.key} title={command.title} aria-label={command.text+' — '+command.label} disabled={disabled}
        onMouseDown={event=>event.preventDefault()} onClick={()=>action(command.key)}
        className={command.key==='bold'?'is-bold':command.key==='italic'?'is-italic':command.key==='underline'?'is-underline':''}>{command.text}</button>)}
    </div>
    <div ref={ref} id={id} className="live-editor-surface" role="textbox" aria-label="Javobingiz"
      aria-describedby={describedBy} aria-multiline="true" aria-disabled={disabled} contentEditable={!disabled}
      suppressContentEditableWarning spellCheck data-placeholder="Javobingizni shu yerga yozing…"
      onInput={sync}
      onPaste={event=>{
        if(disabled)return;
        event.preventDefault();
        // Word/browser pasted markup must not carry arbitrary HTML or images.
        document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));
        sync();
      }}/>
    {overLimit?<small className="live-editor-error" role="alert">20 000 belgidan oshdi. Qisqaroq javob yozing.</small>:null}
  </div>;
}
