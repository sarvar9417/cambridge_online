import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

const QUIET_ZONE=4;

export function liveJoinUrl(code:string,href?:string) {
  const normalized=code.replace(/\D/g,'').slice(0,6);
  if(!/^\d{6}$/.test(normalized))throw new Error('live_join_code_invalid');
  const current=new URL(href??window.location.href);
  current.hash='';
  current.search='';
  return `${current.href}#oquvchi/live?code=${normalized}`;
}

export function liveJoinQrPath(value:string) {
  const qr=qrcode(0,'M');
  qr.addData(value,'Byte');
  qr.make();
  const modules=qr.getModuleCount();
  let path='';
  for(let row=0;row<modules;row+=1){
    for(let column=0;column<modules;column+=1){
      if(qr.isDark(row,column)){
        path+=`M${column+QUIET_ZONE} ${row+QUIET_ZONE}h1v1h-1z`;
      }
    }
  }
  return {path,size:modules+QUIET_ZONE*2};
}

export function LiveJoinQr({code,className=''}:{code:string;className?:string}) {
  const url=useMemo(()=>liveJoinUrl(code),[code]);
  const qr=useMemo(()=>liveJoinQrPath(url),[url]);
  return <div className={`live-join-qr ${className}`.trim()}>
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      role="img"
      aria-label={`Live Challenge ${code} xonasiga kirish uchun QR kod`}
      shapeRendering="crispEdges"
    >
      <rect className="live-join-qr-bg" width={qr.size} height={qr.size}/>
      <path className="live-join-qr-modules" d={qr.path}/>
    </svg>
    <small>Telefon kamerasi bilan skanerlang</small>
  </div>;
}
