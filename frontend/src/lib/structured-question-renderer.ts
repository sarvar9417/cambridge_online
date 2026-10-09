import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { StructuredQuestionBlock,StructuredQuestionContent } from './structured-question-content';
import { splitAnswerScaffoldText } from './structured-answer';

export type StructuredAssetResolver=(assetId:string)=>string|null|undefined;

export type StructuredQuestionRenderOptions={
  resolveAsset?:StructuredAssetResolver;
  responseValues?:Record<string,string>;
  responseDisabled?:boolean;
  onResponseChange?:(key:string,value:string)=>void;
};

function text(className:string,value:string){
  const node=document.createElement('span');
  node.className=className;
  node.textContent=value;
  return node;
}

function renderTextBlock(
  block:Extract<StructuredQuestionBlock,{type:'text'}>,
  blockIndex:number,
  options:StructuredQuestionRenderOptions,
){
  const segments=splitAnswerScaffoldText(block.text);
  const hasScaffold=segments.some((segment)=>segment.kind==='answer');
  if(!hasScaffold){
    const paragraph=document.createElement('p');
    paragraph.className=`structured-question-text structured-question-${block.style}`;
    paragraph.dataset.questionBlock='text';
    paragraph.textContent=block.text;
    return paragraph;
  }

  const wrapper=document.createElement('div');
  wrapper.className=`structured-question-text structured-question-${block.style} structured-question-text-scaffold`;
  wrapper.dataset.questionBlock='text';
  wrapper.dataset.answerScaffold='true';

  for(const segment of segments){
    if(segment.kind==='text'){
      const paragraph=document.createElement('p');
      paragraph.className='structured-question-scaffold-copy';
      paragraph.textContent=segment.text;
      wrapper.append(paragraph);
      continue;
    }
    const row=document.createElement('label');
    row.className='structured-question-scaffold-row';
    row.dataset.answerLabel=segment.label;
    const label=document.createElement('strong');
    label.textContent=segment.label;
    const answerIndex=wrapper.querySelectorAll('[data-response-key]').length;
    const key=`blank.${blockIndex}.${answerIndex}`;
    if(options.onResponseChange){
      const input=document.createElement('input');
      input.type='text';
      input.className='structured-question-inline-input';
      input.dataset.responseKey=key;
      input.value=options.responseValues?.[key]??'';
      input.disabled=Boolean(options.responseDisabled);
      input.setAttribute('aria-label',`Answer: ${segment.label}`);
      input.addEventListener('input',()=>options.onResponseChange?.(key,input.value));
      row.append(label,input);
    }else{
      const line=document.createElement('span');
      line.className='structured-question-scaffold-line';
      line.setAttribute('aria-hidden','true');
      row.append(label,line);
    }
    if(segment.suffix){
      const suffix=document.createElement('small');
      suffix.textContent=segment.suffix;
      row.append(suffix);
    }
    wrapper.append(row);
  }
  return wrapper;
}

export function readableBooleanLatex(latex:string){
  return latex
    .replace(/\\overline\{([^{}]+)\}/g,(_,value:string)=>[...value].map(char=>`${char}\u0305`).join(''))
    .replaceAll('\\land','∧')
    .replaceAll('\\lor','∨')
    .replaceAll('\\oplus','⊕')
    .replaceAll('\\neg','¬')
    .replaceAll('\\cdot','·')
    .replace(/\\operatorname\{NAND\}/g,'NAND')
    .replace(/\\operatorname\{NOR\}/g,'NOR')
    .replace(/\\operatorname\{XOR\}/g,'XOR')
    .replace(/\\mathrm\{(AND|OR|NOT|NAND|NOR|XOR)\}/g,'$1')
    .replace(/\s+/g,' ')
    .trim();
}

function renderMath(block:Extract<StructuredQuestionBlock,{type:'math'}>){
  const node=document.createElement(block.display?'div':'span');
  node.className=`structured-question-math structured-question-${block.semantics.replaceAll('_','-')}`;
  node.dataset.questionBlock='math';
  node.dataset.latex=block.latex;
  node.dataset.mathRenderer='katex';
  node.setAttribute('role','math');
  node.setAttribute(
    'aria-label',
    block.semantics==='boolean_expression' ? readableBooleanLatex(block.latex) : block.latex,
  );

  try {
    katex.render(block.latex,node,{
      displayMode:block.display,
      throwOnError:true,
      strict:'warn',
      trust:false,
      output:'htmlAndMathml',
    });
  } catch (error) {
    node.classList.add('structured-question-math-invalid');
    node.dataset.mathError=error instanceof Error ? error.message : 'Invalid LaTeX';
    node.textContent=block.latex;
  }
  return node;
}

function renderTable(
  block:Extract<StructuredQuestionBlock,{type:'table'}>,
  blockIndex:number,
  options:StructuredQuestionRenderOptions,
){
  const table=document.createElement('table');
  table.className=`structured-question-table structured-question-${block.kind.replaceAll('_','-')}`;
  table.dataset.questionBlock='table';
  table.dataset.tableKind=block.kind;

  if(block.headers.length){
    const thead=document.createElement('thead');
    const row=document.createElement('tr');
    for(const header of block.headers){
      const th=document.createElement('th');
      th.scope='col';
      th.textContent=header;
      row.append(th);
    }
    thead.append(row);
    table.append(thead);
  }

  const editable=new Set(block.editableCells.map(([row,column])=>`${row}:${column}`));
  const tbody=document.createElement('tbody');
  block.rows.forEach((cells,rowIndex)=>{
    const row=document.createElement('tr');
    cells.forEach((value,columnIndex)=>{
      const cell=document.createElement('td');
      const key=`${rowIndex}:${columnIndex}`;
      if(editable.has(key)){
        cell.dataset.editable='true';
        const responseKey=`table.${blockIndex}.${rowIndex}.${columnIndex}`;
        if(options.onResponseChange){
          const input=document.createElement('input');
          input.type='text';
          input.className='structured-question-cell-input';
          input.dataset.responseKey=responseKey;
          input.value=options.responseValues?.[responseKey]??value??'';
          input.disabled=Boolean(options.responseDisabled);
          input.setAttribute('aria-label',`Answer cell row ${rowIndex+1}, column ${columnIndex+1}`);
          input.addEventListener('input',()=>options.onResponseChange?.(responseKey,input.value));
          cell.append(input);
        }else{
          cell.textContent=value??'';
          cell.setAttribute('aria-label',`Answer cell row ${rowIndex+1}, column ${columnIndex+1}`);
        }
      }else{
        cell.textContent=value??'';
      }
      row.append(cell);
    });
    tbody.append(row);
  });
  table.append(tbody);
  return table;
}

function renderMatching(
  block:Extract<StructuredQuestionBlock,{type:'matching'}>,
  blockIndex:number,
  options:StructuredQuestionRenderOptions,
){
  const wrapper=document.createElement('div');
  wrapper.className='structured-question-matching';
  wrapper.dataset.questionBlock='matching';

  const left=document.createElement('ol');
  left.className='structured-question-matching-left';
  for(const item of block.left){
    const row=document.createElement('li');
    row.dataset.matchId=item.id;
    if(options.onResponseChange){
      const label=document.createElement('label');
      label.className='structured-question-match-row';
      const prompt=document.createElement('span');
      prompt.textContent=item.text;
      const select=document.createElement('select');
      const key=`match.${blockIndex}.${item.id}`;
      select.dataset.responseKey=key;
      select.disabled=Boolean(options.responseDisabled);
      const empty=document.createElement('option');
      empty.value='';
      empty.textContent='Tanlang…';
      select.append(empty);
      for(const target of block.right){
        const option=document.createElement('option');
        option.value=target.id;
        option.textContent=target.text;
        select.append(option);
      }
      select.value=options.responseValues?.[key]??'';
      select.addEventListener('change',()=>options.onResponseChange?.(key,select.value));
      label.append(prompt,select);
      row.append(label);
    }else{
      row.textContent=item.text;
    }
    left.append(row);
  }

  const right=document.createElement('ol');
  right.className='structured-question-matching-right';
  for(const item of block.right){
    const row=document.createElement('li');
    row.dataset.matchId=item.id;
    row.textContent=item.text;
    right.append(row);
  }
  wrapper.append(left,right);
  return wrapper;
}

function renderBlock(block:StructuredQuestionBlock,blockIndex:number,options:StructuredQuestionRenderOptions){
  switch(block.type){
    case 'text': return renderTextBlock(block,blockIndex,options);
    case 'math': return renderMath(block);
    case 'code': {
      const pre=document.createElement('pre');
      pre.className='structured-question-code';
      pre.dataset.questionBlock='code';
      const code=document.createElement('code');
      if(block.language)code.dataset.language=block.language;
      code.textContent=block.text;
      pre.append(code);
      return pre;
    }
    case 'list': {
      const list=document.createElement('ul');
      list.className='structured-question-list';
      list.dataset.questionBlock='list';
      for(const item of block.items){
        const row=document.createElement('li');
        row.textContent=item;
        list.append(row);
      }
      return list;
    }
    case 'table': return renderTable(block,blockIndex,options);
    case 'matching': return renderMatching(block,blockIndex,options);
    case 'asset': {
      const figure=document.createElement('figure');
      figure.className=`structured-question-asset structured-question-${block.kind.replaceAll('_','-')}`;
      figure.dataset.questionBlock='asset';
      figure.dataset.assetId=block.assetId;
      const url=options.resolveAsset?.(block.assetId);
      if(url){
        const image=document.createElement('img');
        image.src=url;
        image.alt=block.altText;
        image.loading='lazy';
        figure.append(image);
      }else{
        const fallback=text('structured-question-asset-missing',block.altText||'Source visual');
        fallback.dataset.assetMissing='true';
        figure.append(fallback);
      }
      return figure;
    }
    case 'answer_area': {
      const area=document.createElement('div');
      area.className=`structured-question-answer-area structured-question-answer-${block.kind.replaceAll('_','-')}`;
      area.dataset.questionBlock='answer_area';
      area.dataset.answerKind=block.kind;
      if(block.lines)area.dataset.lines=String(block.lines);
      return area;
    }
  }
}

export function renderStructuredQuestionContent(
  content:StructuredQuestionContent,
  options:StructuredQuestionRenderOptions={},
){
  const fragment=document.createDocumentFragment();
  for(const [blockIndex,block] of content.blocks.entries()){
    const node=renderBlock(block,blockIndex,options);
    node.dataset.sourcePage=String(block.source.page);
    if(block.source.bbox)node.dataset.sourceBbox=block.source.bbox.join(',');
    fragment.append(node);
  }
  return fragment;
}
