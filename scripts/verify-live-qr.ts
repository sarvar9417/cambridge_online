import jsQR from 'jsqr';
import { liveJoinUrl,qrMatrix } from '../frontend/src/lib/qr-code.ts';

const value=liveJoinUrl('https://cambridge-online.vercel.app','654321');
const matrix=qrMatrix(value);
const border=4;
const scale=8;
const modules=matrix.length+border*2;
const width=modules*scale;
const data=new Uint8ClampedArray(width*width*4);
for(let y=0;y<width;y+=1){
  for(let x=0;x<width;x+=1){
    const mx=Math.floor(x/scale)-border;
    const my=Math.floor(y/scale)-border;
    const dark=mx>=0&&my>=0&&mx<matrix.length&&my<matrix.length&&matrix[my]![mx]!;
    const value=dark?0:255;
    const index=(y*width+x)*4;
    data[index]=value;data[index+1]=value;data[index+2]=value;data[index+3]=255;
  }
}
const decoded=jsQR(data,width,width,{inversionAttempts:'dontInvert'});
if(!decoded)throw new Error('Live join QR could not be decoded');
if(decoded.data!==value)throw new Error(`Live join QR decoded unexpected value: ${decoded.data}`);
console.log(`Live join QR decode OK: ${decoded.data}`);
