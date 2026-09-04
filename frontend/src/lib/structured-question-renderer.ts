import type { StructuredQuestionBlock,StructuredQuestionContent } from './structured-question-content';

export type StructuredAssetResolver=(assetId:string)=>string|null|undefined;

export type StructuredQuestionRenderOptions={
  resolveAsset?:StructuredAssetResolver;
};

function text(className:string,value:string){
  const node=document.createElement('span');
  node.className=className;
  node.textContent=value;
  return node;
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

function renderTable(block:Extract<StructuredQuestionBlock,{type:'table'}>){
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
      cell.textContent=value??'';
      if(editable.has(key)){
        cell.dataset.editable='true';
        cell.setAttribute('aria-label',`Answer cell row ${rowIndex+1}, column ${columnIndex+1}`);
      }
      row.append(cell);
    });
    tbody.append(row);
  });
  table.append(tbody);
  return table;
}

function renderMatching(block:Extract<StructuredQuestionBlock,{type:'matching'}>){
  const wrapper=document.createElement('div');
  wrapper.className='structured-question-matching';
  wrapper.dataset.questionBlock='matching';

  const left=document.createElement('ol');
  left.className='structured-question-matching-left';
  for(const item of block.left){
    const row=document.createElement('li');
    row.dataset.matchId=item.id;
    row.textContent=item.text;
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

function renderBlock(block:StructuredQuestionBlock,options:StructuredQuestionRenderOptions){
  switch(block.type){
    case 'text': {
      const paragraph=document.createElement('p');
      paragraph.className=`structured-question-text structured-question-${block.style}`;
      paragraph.dataset.questionBlock='text';
      paragraph.textContent=block.text;
      return paragraph;
    }
    case 'math': {
      const node=document.createElement(block.display?'div':'span');
      node.className=`structured-question-math structured-question-${block.semantics.replaceAll('_','-')}`;
      node.dataset.questionBlock='math';
      node.dataset.latex=block.latex;
      node.setAttribute('role','math');
      node.setAttribute('aria-label',block.semantics==='boolean_expression'?'Boolean expression':'Mathematical expression');
      node.textContent=block.semantics==='boolean_expression'?readableBooleanLatex(block.latex):block.latex;
      return node;
    }
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
    case 'table': return renderTable(block);
    case 'matching': return renderMatching(block);
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
  for(const block of content.blocks){
    const node=renderBlock(block,options);
    node.dataset.sourcePage=String(block.source.page);
    if(block.source.bbox)node.dataset.sourceBbox=block.source.bbox.join(',');
    fragment.append(node);
  }
  return fragment;
}
