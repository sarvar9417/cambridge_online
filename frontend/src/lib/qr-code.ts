type QrSpec={version:number;size:number;dataCodewords:number;eccCodewords:number;alignment:number};

const SPECS:QrSpec[]=[
  {version:4,size:33,dataCodewords:80,eccCodewords:20,alignment:26},
  {version:5,size:37,dataCodewords:108,eccCodewords:26,alignment:30},
];

function gfMultiply(x:number,y:number){
  let z=0;
  for(let i=7;i>=0;i-=1){
    z=(z<<1)^((z>>>7)*0x11d);
    z^=((y>>>i)&1)*x;
  }
  return z&0xff;
}

function rsDivisor(degree:number){
  const result=new Uint8Array(degree);
  result[degree-1]=1;
  let root=1;
  for(let i=0;i<degree;i+=1){
    for(let j=0;j<degree;j+=1){
      result[j]=gfMultiply(result[j]!,root)^((j+1<degree)?result[j+1]!:0);
    }
    root=gfMultiply(root,2);
  }
  return result;
}

function rsRemainder(data:Uint8Array,degree:number){
  const divisor=rsDivisor(degree);
  const result=new Uint8Array(degree);
  for(const byte of data){
    const factor=byte^result[0]!;
    result.copyWithin(0,1);
    result[degree-1]=0;
    for(let i=0;i<degree;i+=1)result[i]^=gfMultiply(divisor[i]!,factor);
  }
  return result;
}

function appendBits(bits:number[],value:number,length:number){
  for(let i=length-1;i>=0;i-=1)bits.push((value>>>i)&1);
}

function encodeData(text:string,spec:QrSpec){
  const bytes=new TextEncoder().encode(text);
  const capacity=spec.dataCodewords*8;
  const bits:number[]=[];
  appendBits(bits,0b0100,4);
  appendBits(bits,bytes.length,8);
  for(const byte of bytes)appendBits(bits,byte,8);
  if(bits.length>capacity)throw new Error('live_qr_join_link_too_long');
  for(let i=0;i<Math.min(4,capacity-bits.length);i+=1)bits.push(0);
  while(bits.length%8!==0)bits.push(0);
  const data=Array.from({length:bits.length/8},(_,index)=>{
    let value=0;
    for(let bit=0;bit<8;bit+=1)value=(value<<1)|bits[index*8+bit]!;
    return value;
  });
  for(let pad=0;data.length<spec.dataCodewords;pad+=1)data.push(pad%2===0?0xec:0x11);
  return Uint8Array.from(data);
}

function formatBits(mask:number){
  const data=(1<<3)|mask; // Error correction level L = 01.
  let value=data<<10;
  for(let i=14;i>=10;i-=1){
    if(((value>>>i)&1)!==0)value^=0x537<<(i-10);
  }
  return (((data<<10)|value)^0x5412)&0x7fff;
}

function maskBit(mask:number,x:number,y:number){
  switch(mask){
    case 0:return (x+y)%2===0;
    case 1:return y%2===0;
    case 2:return x%3===0;
    case 3:return (x+y)%3===0;
    case 4:return (Math.floor(y/2)+Math.floor(x/3))%2===0;
    case 5:return (x*y)%2+(x*y)%3===0;
    case 6:return ((x*y)%2+(x*y)%3)%2===0;
    case 7:return ((x+y)%2+(x*y)%3)%2===0;
    default:return false;
  }
}

function drawFinder(modules:boolean[][],functional:boolean[][],cx:number,cy:number){
  const size=modules.length;
  for(let dy=-4;dy<=4;dy+=1)for(let dx=-4;dx<=4;dx+=1){
    const x=cx+dx,y=cy+dy;
    if(x<0||y<0||x>=size||y>=size)continue;
    const distance=Math.max(Math.abs(dx),Math.abs(dy));
    modules[y]![x]=distance!==2&&distance!==4;
    functional[y]![x]=true;
  }
}

function drawAlignment(modules:boolean[][],functional:boolean[][],cx:number,cy:number){
  for(let dy=-2;dy<=2;dy+=1)for(let dx=-2;dx<=2;dx+=1){
    modules[cy+dy]![cx+dx]=Math.max(Math.abs(dx),Math.abs(dy))!==1;
    functional[cy+dy]![cx+dx]=true;
  }
}

function reserveAndDrawFunctionPatterns(modules:boolean[][],functional:boolean[][],spec:QrSpec){
  const size=spec.size;
  drawFinder(modules,functional,3,3);
  drawFinder(modules,functional,size-4,3);
  drawFinder(modules,functional,3,size-4);

  for(let i=0;i<size;i+=1){
    if(!functional[6]![i]){modules[6]![i]=i%2===0;functional[6]![i]=true}
    if(!functional[i]![6]){modules[i]![6]=i%2===0;functional[i]![6]=true}
  }
  drawAlignment(modules,functional,spec.alignment,spec.alignment);

  const reserve=(x:number,y:number)=>{functional[y]![x]=true};
  for(let i=0;i<=5;i+=1)reserve(8,i);
  reserve(8,7);reserve(8,8);reserve(7,8);
  for(let i=9;i<=14;i+=1)reserve(14-i,8);
  for(let i=0;i<=7;i+=1)reserve(size-1-i,8);
  for(let i=8;i<=14;i+=1)reserve(8,size-15+i);
  modules[size-8]![8]=true;functional[size-8]![8]=true;
}

function drawFormat(modules:boolean[][],mask:number){
  const size=modules.length,bits=formatBits(mask);
  const bit=(index:number)=>((bits>>>index)&1)!==0;
  for(let i=0;i<=5;i+=1)modules[i]![8]=bit(i);
  modules[7]![8]=bit(6);
  modules[8]![8]=bit(7);
  modules[8]![7]=bit(8);
  for(let i=9;i<=14;i+=1)modules[8]![14-i]=bit(i);
  for(let i=0;i<=7;i+=1)modules[size-1-i]![8]=bit(i);
  for(let i=8;i<=14;i+=1)modules[8]![size-15+i]=bit(i);
  modules[size-8]![8]=true;
}

function penalty(modules:boolean[][]){
  const size=modules.length;
  let score=0;
  const linePenalty=(get:(index:number)=>boolean)=>{
    let runColor=get(0),runLength=1;
    for(let i=1;i<size;i+=1){
      const color=get(i);
      if(color===runColor){runLength+=1;if(runLength===5)score+=3;else if(runLength>5)score+=1}
      else{runColor=color;runLength=1}
    }
  };
  for(let y=0;y<size;y+=1)linePenalty((x)=>modules[y]![x]!);
  for(let x=0;x<size;x+=1)linePenalty((y)=>modules[y]![x]!);
  for(let y=0;y<size-1;y+=1)for(let x=0;x<size-1;x+=1){
    const value=modules[y]![x]!;
    if(modules[y]![x+1]===value&&modules[y+1]![x]===value&&modules[y+1]![x+1]===value)score+=3;
  }
  const finderPatterns=['00001011101','10111010000'];
  const line=(values:boolean[])=>values.map((value)=>value?'1':'0').join('');
  for(let y=0;y<size;y+=1){
    const row=line(modules[y]!);
    for(const pattern of finderPatterns)for(let i=0;(i=row.indexOf(pattern,i))>=0;i+=1)score+=40;
  }
  for(let x=0;x<size;x+=1){
    const col=line(Array.from({length:size},(_,y)=>modules[y]![x]!));
    for(const pattern of finderPatterns)for(let i=0;(i=col.indexOf(pattern,i))>=0;i+=1)score+=40;
  }
  const dark=modules.flat().filter(Boolean).length;
  const percent=dark*100/(size*size);
  score+=Math.floor(Math.abs(percent-50)/5)*10;
  return score;
}

export function qrMatrix(text:string){
  const bytes=new TextEncoder().encode(text);
  const spec=SPECS.find((candidate)=>bytes.length<=candidate.dataCodewords-2);
  if(!spec)throw new Error('live_qr_join_link_too_long');

  const data=encodeData(text,spec);
  const ecc=rsRemainder(data,spec.eccCodewords);
  const codewords=Uint8Array.from([...data,...ecc]);
  const rawBits:number[]=[];
  for(const byte of codewords)appendBits(rawBits,byte,8);

  let best:boolean[][]|null=null,bestScore=Number.POSITIVE_INFINITY;
  for(let mask=0;mask<8;mask+=1){
    const modules=Array.from({length:spec.size},()=>Array<boolean>(spec.size).fill(false));
    const functional=Array.from({length:spec.size},()=>Array<boolean>(spec.size).fill(false));
    reserveAndDrawFunctionPatterns(modules,functional,spec);
    let bitIndex=0;
    for(let right=spec.size-1;right>=1;right-=2){
      if(right===6)right=5;
      for(let vertical=0;vertical<spec.size;vertical+=1){
        const upward=((right+1)&2)===0;
        const y=upward?spec.size-1-vertical:vertical;
        for(let offset=0;offset<2;offset+=1){
          const x=right-offset;
          if(functional[y]![x])continue;
          const value=bitIndex<rawBits.length?rawBits[bitIndex]!==0:false;
          modules[y]![x]=value!==maskBit(mask,x,y);
          bitIndex+=1;
        }
      }
    }
    drawFormat(modules,mask);
    const candidateScore=penalty(modules);
    if(candidateScore<bestScore){bestScore=candidateScore;best=modules}
  }
  if(!best)throw new Error('live_qr_generation_failed');
  return best;
}

export function qrSvg(text:string,scale=4,border=4){
  const matrix=qrMatrix(text);
  const size=matrix.length;
  const full=size+border*2;
  const path:string[]=[];
  for(let y=0;y<size;y+=1){
    let start=-1;
    for(let x=0;x<=size;x+=1){
      const dark=x<size&&matrix[y]![x];
      if(dark&&start<0)start=x;
      if(!dark&&start>=0){path.push(`M${start+border} ${y+border}h${x-start}v1H${start+border}z`);start=-1}
    }
  }
  const pixels=full*scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" width="${pixels}" height="${pixels}" shape-rendering="crispEdges" role="img" aria-label="Live Challenge QR code"><rect width="100%" height="100%" fill="white"/><path d="${path.join('')}" fill="black"/></svg>`;
}

export function liveJoinUrl(origin:string,code:string){
  const clean=code.replace(/\D/g,'').slice(0,6);
  if(clean.length!==6)throw new Error('live_join_code_invalid');
  return `${origin.replace(/\/$/,'')}/#oquvchi/live?code=${clean}`;
}
