type LiveReportPdf = {
  session:{title:string;className:string};
  aggregate:{studentCount:number;totalEarned:number;totalPossible:number;averageScore:number;averagePossible:number;averagePercentage:number};
  students:Array<{studentName:string;earned:number;possible:number;percentage:number}>;
  questions:Array<{questionPosition:number;displayRef:string;earned:number;possible:number;percentage:number;subtopics:Array<{subtopicCode:string}>}>;
  subtopics:Array<{subtopicCode:string;subtopicTitle:string;earned:number;possible:number;percentage:number}>;
  mostMissedPoints:Array<{displayRef:string;code:string;text:string;missedCount:number;assessedCount:number;missRate:number}>;
  reteachRecommendations:Array<{code:string;title:string;reason:string;percentage:number}>;
};

const esc=(value:unknown)=>String(value??'')
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'",'&#39;');
const pct=(value:number)=>`${Math.round(value*100)}%`;
const row=(label:string,value:string,detail='')=>`<div class="row"><span>${esc(label)}${detail?`<small>${esc(detail)}</small>`:''}</span><strong>${esc(value)}</strong></div>`;

export function renderLiveReportHtml(report:LiveReportPdf,schoolName:string,generatedAt=new Date()){
  const students=report.students.map(item=>row(item.studentName,`${item.earned}/${item.possible} · ${pct(item.percentage)}`)).join('');
  const questions=report.questions.map(item=>row(
    `Q${item.questionPosition+1} · ${item.displayRef}`,
    `${item.earned}/${item.possible} · ${pct(item.percentage)}`,
    item.subtopics.map(subtopic=>subtopic.subtopicCode).join(', ')||'Subtopic evidence yo‘q',
  )).join('');
  const subtopics=report.subtopics.map(item=>row(
    `${item.subtopicCode} · ${item.subtopicTitle}`,
    `${item.earned}/${item.possible} · ${pct(item.percentage)}`,
  )).join('')||'<p class="empty">Subtopic evidence topilmadi.</p>';
  const missed=report.mostMissedPoints.slice(0,15).map(item=>row(
    `${item.displayRef} · ${item.code}`,
    `${item.missedCount}/${item.assessedCount} · ${pct(item.missRate)}`,
    item.text,
  )).join('')||'<p class="empty">Qayd etilgan mark-point xatosi yo‘q.</p>';
  const reteach=report.reteachRecommendations.map(item=>`<article><strong>${esc(item.code)} · ${esc(item.title)}</strong><p>${esc(item.reason)}</p></article>`).join('')
    ||'<p class="empty">60% dan past evidence-backed subtopic topilmadi.</p>';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;font-size:10.5pt;line-height:1.45;margin:0}
    header{border-bottom:2px solid #172033;padding-bottom:10px;margin-bottom:14px}header h1{font-size:21pt;margin:2px 0 3px}header p{margin:0;color:#596579}
    .meta{display:flex;justify-content:space-between;gap:10px;font-size:9pt;color:#596579}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
    .kpi{border:1px solid #cbd3df;border-radius:7px;padding:10px}.kpi span{display:block;color:#596579;font-size:8.5pt}.kpi strong{display:block;font-size:15pt;margin-top:2px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.box{border:1px solid #cbd3df;border-radius:7px;padding:10px;break-inside:avoid}
    h2{font-size:12pt;margin:0 0 7px}.row{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #e5e9f0}.row:last-child{border-bottom:0}.row span{min-width:0}.row small{display:block;color:#667085;font-size:8pt;margin-top:1px}.row strong{white-space:nowrap}
    .reteach article{border-left:3px solid #9a6700;padding:6px 9px;margin:6px 0;background:#fbf7ed}.reteach p{margin:2px 0}.empty{color:#667085}
    footer{margin-top:14px;padding-top:7px;border-top:1px solid #cbd3df;color:#667085;font-size:8pt;text-align:center}
  </style></head><body>
    <header><div class="meta"><span>${esc(schoolName)}</span><span>${esc(generatedAt.toISOString().slice(0,10))}</span></div>
      <h1>${esc(report.session.title)}</h1><p>${esc(report.session.className)} · Live Challenge detailed report</p></header>
    <section class="kpis">
      <div class="kpi"><span>O‘quvchilar</span><strong>${report.aggregate.studentCount}</strong></div>
      <div class="kpi"><span>Sinf jami</span><strong>${report.aggregate.totalEarned} / ${report.aggregate.totalPossible}</strong></div>
      <div class="kpi"><span>O‘rtacha</span><strong>${report.aggregate.averageScore.toFixed(1)} / ${report.aggregate.averagePossible.toFixed(1)}</strong><span>${pct(report.aggregate.averagePercentage)}</span></div>
    </section>
    <section class="grid"><div class="box"><h2>O‘quvchilar</h2>${students}</div><div class="box"><h2>Savollar</h2>${questions}</div></section>
    <section class="grid"><div class="box"><h2>Subtopic natijalari</h2>${subtopics}</div><div class="box"><h2>Eng ko‘p yo‘qotilgan mark pointlar</h2>${missed}</div></section>
    <section class="box reteach"><h2>Qayta o‘qitish tavsiyasi</h2>${reteach}</section>
    <footer>CamPath · ichki foydalanish uchun · evidence-backed Live Challenge report</footer>
  </body></html>`;
}
