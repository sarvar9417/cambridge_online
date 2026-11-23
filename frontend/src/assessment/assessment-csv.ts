/** Neutralize spreadsheet formula injection from teacher/student controlled text. */
export function assessmentCsvCell(value:unknown):string {
  const raw=String(value??'').replace(/[\x00-\x1F\x7F]/g,' ');
  const guarded=/^\s*[=+@-]/.test(raw)?'\u0027'+raw:raw;
  return '"'+guarded.replaceAll('"','""')+'"';
}
