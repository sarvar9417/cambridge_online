import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {CelebrationTier} from './live-challenge-rewards';

/**
 * Real-time ray-marched 3D mascot, with lit volumetric head/arms, rim-light,
 * specular shading and moving expressions. No external 3D binary, CDN or
 * runtime dependency. An existing accessible SVG remains as GPU fallback.
 */
const VERTEX=`
attribute vec2 aPosition;
void main(){gl_Position=vec4(aPosition,0.0,1.0);}
`;
const FRAGMENT=`
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uMood;

float sphere(vec3 p,float r){return length(p)-r;}
float box3(vec3 p,vec3 b,float r){
  vec3 q=abs(p)-b;
  return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r;
}
float capsule(vec3 p,vec3 a,vec3 b,float r){
  vec3 q=p-a,v=b-a;
  return length(q-v*clamp(dot(q,v)/max(dot(v,v),0.0001),0.0,1.0))-r;
}
vec2 joinParts(vec2 a,vec2 b){return a.x<b.x?a:b;}
vec2 scene(vec3 p){
  float swing=sin(uTime*7.0)*0.14;
  float joyous=step(1.5,uMood);
  // Rounded, real 3D body and head.
  vec2 hit=vec2(box3(p-vec3(0.0,-0.49,0.0),vec3(0.41,0.38,0.34),0.20),1.0);
  hit=joinParts(hit,vec2(box3(p-vec3(0.0,0.30,0.0),vec3(0.66,0.46,0.37),0.23),1.0));
  hit=joinParts(hit,vec2(box3(p-vec3(0.0,0.30,0.405),vec3(0.55,0.35,0.038),0.17),2.0));
  // Antenna and lit jewel.
  hit=joinParts(hit,vec2(capsule(p,vec3(0.0,0.81,0.0),vec3(0.0,1.06,0.0),0.045),4.0));
  hit=joinParts(hit,vec2(sphere(p-vec3(0.0,1.09,0.0),0.10),3.0));
  // Jointed 3D arms move in response to emotional state.
  vec3 leftStart=vec3(-0.52,-0.42,0.0);
  vec3 rightStart=vec3(0.52,-0.42,0.0);
  vec3 leftEnd=vec3(-0.86,-0.56+0.09*sin(uTime*3.0),0.03);
  vec3 rightEnd=vec3(0.90,-0.48+joyous*(0.47+0.1*sin(uTime*8.0))+swing,0.04);
  hit=joinParts(hit,vec2(capsule(p,leftStart,leftEnd,0.14),1.0));
  hit=joinParts(hit,vec2(capsule(p,rightStart,rightEnd,0.14),1.0));
  hit=joinParts(hit,vec2(sphere(p-leftEnd,0.16),1.0));
  hit=joinParts(hit,vec2(sphere(p-rightEnd,0.16),1.0));
  hit=joinParts(hit,vec2(capsule(p,vec3(-0.23,-0.79,0.0),vec3(-0.24,-1.03,0.09),0.145),1.0));
  hit=joinParts(hit,vec2(capsule(p,vec3(0.23,-0.79,0.0),vec3(0.24,-1.03,0.09),0.145),1.0));
  // Glowing eyes physically embedded on the front panel.
  hit=joinParts(hit,vec2(sphere((p-vec3(-0.24,0.37,0.53))*vec3(1.0,0.89,1.0),0.105),3.0));
  hit=joinParts(hit,vec2(sphere((p-vec3(0.24,0.37,0.53))*vec3(1.0,0.89,1.0),0.105),3.0));
  // Arc of emissive 3D pearls: smile, neutral or concerned expression.
  for(int i=0;i<7;i++){
    float x=float(i-3)*0.061;
    float smileY=0.078+0.092*pow(x/0.183,2.0);
    float sadY=0.169-0.092*pow(x/0.183,2.0);
    float y=uMood<0.5?sadY:(uMood<1.5?0.123:smileY);
    hit=joinParts(hit,vec2(sphere(p-vec3(x,y,0.531),0.025),3.0));
  }
  return hit;
}
vec3 normalAt(vec3 p){
  float h=0.0015;
  vec2 e=vec2(h,0.0);
  return normalize(vec3(
    scene(p+e.xyy).x-scene(p-e.xyy).x,
    scene(p+e.yxy).x-scene(p-e.yxy).x,
    scene(p+e.yyx).x-scene(p-e.yyx).x
  ));
}
void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*uResolution)/min(uResolution.x,uResolution.y);
  uv.y-=0.045;
  float angle=0.14*sin(uTime*0.8);
  vec3 eye=vec3(3.9*sin(angle),0.12,3.9*cos(angle));
  vec3 forward=normalize(vec3(0.0,-0.04,0.0)-eye);
  vec3 right=normalize(cross(forward,vec3(0.0,1.0,0.0)));
  vec3 up=cross(right,forward);
  vec3 direction=normalize(forward*2.8+right*uv.x*2.55+up*uv.y*2.55);
  float t=0.0;
  vec2 hit=vec2(100.0,-1.0);
  for(int i=0;i<70;i++){
    hit=scene(eye+direction*t);
    if(hit.x<0.0015||t>8.0)break;
    t+=max(hit.x*0.72,0.008);
  }
  if(t>8.0){gl_FragColor=vec4(0.0);return;}
  vec3 p=eye+direction*t;
  vec3 n=normalAt(p);
  vec3 keyLight=normalize(vec3(-0.52,0.9,1.1));
  vec3 fillLight=normalize(vec3(0.85,0.25,-0.48));
  float diffuse=max(dot(n,keyLight),0.0);
  float fill=max(dot(n,fillLight),0.0);
  float rim=pow(1.0-max(dot(n,-direction),0.0),3.4);
  vec3 base=vec3(0.65,0.81,1.0);
  float gloss=46.0;
  if(hit.y>1.5&&hit.y<2.5){base=vec3(0.039,0.078,0.24);gloss=80.0;}
  if(hit.y>2.5&&hit.y<3.5){base=vec3(0.21,0.94,1.0);gloss=25.0;}
  if(hit.y>3.5){base=vec3(1.0,0.73,0.29);gloss=60.0;}
  vec3 reflected=reflect(-keyLight,n);
  float spec=pow(max(dot(reflected,-direction),0.0),gloss);
  vec3 color=base*(0.32+0.66*diffuse+0.18*fill)
    +vec3(0.28,0.56,1.0)*rim*0.35+vec3(1.0)*spec*0.67;
  if(hit.y>2.5&&hit.y<3.5)color+=base*0.38;
  color=pow(color,vec3(0.86));
  gl_FragColor=vec4(color,1.0);
}`;

type Props={tier:CelebrationTier;fallback:ReactNode;animate?:boolean};
const MOOD:Record<CelebrationTier,number>={support:0,steady:1,spark:2,gold:3};

export function LiveMascot3D({tier,fallback,animate=true}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
    if(!gl)return;
    function shader(type:number,source:string){
      const handle=gl!.createShader(type);
      if(!handle)return null;
      gl!.shaderSource(handle,source);
      gl!.compileShader(handle);
      if(!gl!.getShaderParameter(handle,gl!.COMPILE_STATUS)){gl!.deleteShader(handle);return null;}
      return handle;
    }
    const vert=shader(gl.VERTEX_SHADER,VERTEX),frag=shader(gl.FRAGMENT_SHADER,FRAGMENT);
    if(!vert||!frag){if(vert)gl.deleteShader(vert);if(frag)gl.deleteShader(frag);return;}
    const program=gl.createProgram();
    if(!program)return;
    gl.attachShader(program,vert);
    gl.attachShader(program,frag);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
      gl.deleteShader(vert);gl.deleteShader(frag);gl.deleteProgram(program);return;
    }
    const buffer=gl.createBuffer();
    if(!buffer){gl.deleteShader(vert);gl.deleteShader(frag);gl.deleteProgram(program);return;}
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    gl.useProgram(program);
    const position=gl.getAttribLocation(program,'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const resolution=gl.getUniformLocation(program,'uResolution');
    const time=gl.getUniformLocation(program,'uTime');
    const mood=gl.getUniformLocation(program,'uMood');
    const ratio=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.round(180*ratio);canvas.height=Math.round(190*ratio);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(resolution,canvas.width,canvas.height);
    gl.uniform1f(mood,MOOD[tier]);
    let frame=0;
    let start=0;
    let active=true;
    const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw=(now:number)=>{
      if(!active)return;
      if(!start)start=now;
      gl.uniform1f(time,animate&&!reduced?(now-start)/1000:0);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES,0,6);
      if(animate&&!reduced)frame=requestAnimationFrame(draw);
    };
    setReady(true);
    frame=requestAnimationFrame(draw);
    return()=>{
      active=false;
      cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vert);gl.deleteShader(frag);
    };
  },[tier,animate]);

  return <div className={`live-neon-mascot live-neon-mascot-real3d${ready?' is-webgl-ready':''}`} aria-hidden="true">
    <canvas ref={canvasRef} className="live-neon-mascot-canvas" width="180" height="190"/>
    <span className="live-neon-mascot-fallback">{fallback}</span>
  </div>;
}
