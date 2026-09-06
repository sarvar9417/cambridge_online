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
    .replaceAll('\\,',' ')
    .replace(/\\operatorname\{([^{}]+)\}/g,'$1')
    .replace(/\\mathrm\{([^{}]+)\}/g,'$1')
    .replace(/\\text\{([^{}]+)\}/g,'$1')
    .replace(/[{}]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

export function readableMathLatex(latex:string){
  return latex
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,'($1)/($2)')
    .replace(/\\sqrt\{([^{}]+)\}/g,'√($1)')
    .replaceAll('\\times','×')
    .replaceAll('\\div','÷')
    .replaceAll('\\pm','±')
    .replaceAll('\\leq','≤')
    .replaceAll('\\le','≤')
    .replaceAll('\\geq','≥')
    .replaceAll('\\ge','≥')
    .replaceAll('\\neq','≠')
    .replaceAll('\\cdot','·')
    .replaceAll('\\,',' ')
    .replace(/\\operatorname\{([^{}]+)\}/g,'$1')
    .replace(/\\mathrm\{([^{}]+)\}/g,'$1')
    .replace(/\\text\{([^{}]+)\}/g,'$1')
    .replace(/\^\{([^{}]+)\}/g,'^$1')
    .replace(/_\{([^{}]+)\}/g,'_$1')
    .replace(/[{}]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

function renderKMapCorner(th:HTMLTableCellElement){
  th.className='structured-question-k-map-corner';
  th.setAttribute('aria-label','Karnaugh map axes: AB columns, CD rows');
  const axis=document.createElement('span');
  axis.className='structured-question-k-map-axis';
  const columns=document.createElement('b');
  columns.textContent='AB';
  const rows=document.createElement('b');
  rows.textContent='CD';
  axis.append(columns,rows);
  th.append(axis);
}

function renderTable(block:Extract<StructuredQuestionBlock,{type:'table'}>){
  const table=document.createElement('table');
  table.className=`structured-question-table structured-question-${block.kind.replaceAll('_','-')}`;
  table.dataset.questionBlock='table';
  table.dataset.tableKind=block.kind;

  if(block.headers.length){
    const thead=document.createElement('thead');
    const row=document.createElement('tr');
    block.headers.forEach((header,columnIndex)=>{
      const th=document.createElement('th');
      th.scope='col';
      if(block.kind==='k_map'&&columnIndex===0){
        renderKMapCorner(th);
      }else{
        th.textContent=header;
      }
      row.append(th);
    });
    thead.append(row);
    table.append(thead);
  }

  const editable=new Set(block.editableCells.map(([row,column])=>`${row}:${column}`));
  const tbody=document.createElement('tbody');
  block.rows.forEach((cells,rowIndex)=>{
    const row=document.createElement('tr');
    cells.forEach((value,columnIndex)=>{
      const isKMapRowHeader=block.kind==='k_map'&&columnIndex===0;
      const cell=document.createElement(isKMapRowHeader?'th':'td');
      if(isKMapRowHeader)(cell as HTMLTableCellElement).scope='row';
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

function openAssetZoom(url:string,altText:string){
  const dialog=document.createElement('dialog');
  dialog.className='structured-question-asset-dialog';
  dialog.setAttribute('aria-label',altText||'Question visual');

  const toolbar=document.createElement('div');
  toolbar.className='structured-question-asset-dialog-toolbar';
  const title=document.createElement('strong');
  title.textContent=altText||'Question visual';
  const close=document.createElement('button');
  close.type='button';
  close.textContent='Close';
  close.addEventListener('click',()=>dialog.close());
  toolbar.append(title,close);

  const image=document.createElement('img');
  image.src=url;
  image.alt=altText;
  dialog.append(toolbar,image);
  dialog.addEventListener('click',(event)=>{
    if(event.target===dialog)dialog.close();
  });
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);
  if(typeof dialog.showModal==='function')dialog.showModal();
  else dialog.setAttribute('open','');
}

function renderAsset(block:Extract<StructuredQuestionBlock,{type:'asset'}>,options:StructuredQuestionRenderOptions){
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
    image.tabIndex=0;
    image.setAttribute('role','button');
    image.setAttribute('aria-label',`${block.altText||'Question visual'} — open larger view`);
    image.addEventListener('click',()=>openAssetZoom(url,block.altText));
    image.addEventListener('keydown',(event)=>{
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        openAssetZoom(url,block.altText);
      }
    });
    figure.append(image);
  }else{
    const fallback=text('structured-question-asset-missing',block.altText||'Source visual');
    fallback.dataset.assetMissing='true';
    figure.append(fallback);
  }
  return figure;
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
      node.textContent=block.semantics==='boolean_expression'?readableBooleanLatex(block.latex):readableMathLatex(block.latex);
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
    case 'asset': return renderAsset(block,options);
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
