/* Render core · WebGL 2 · no runtime dependencies. */
(function(){
'use strict';
const TAU=Math.PI*2;
const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{let l=Math.hypot(...a)||1;return a.map(v=>v/l)},lerp:(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t)};
const M={
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul(a,b){let r=new Float32Array(16);for(let c=0;c<4;c++)for(let k=0;k<4;k++)for(let j=0;j<4;j++)r[c*4+k]+=a[j*4+k]*b[c*4+j];return r},
 translation(x,y,z){let m=M.identity();m[12]=x;m[13]=y;m[14]=z;return m},
 scale(x,y=x,z=x){let m=M.identity();m[0]=x;m[5]=y;m[10]=z;return m},
 rx(a){let c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])},
 ry(a){let c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])},
 rz(a){let c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1])},
 compose(p,r,s){return M.mul(M.translation(...p),M.mul(M.ry(r[1]),M.mul(M.rx(r[0]),M.mul(M.rz(r[2]),M.scale(...s)))))},
 point(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]]},
 dir(m,p){return V.norm([m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]])},
 perspective(fov,aspect,n,f){let t=1/Math.tan(fov/2),m=new Float32Array(16);m[0]=t/aspect;m[5]=t;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m},
 ortho(l,r,b,t,n,f){let m=M.identity();m[0]=2/(r-l);m[5]=2/(t-b);m[10]=-2/(f-n);m[12]=-(r+l)/(r-l);m[13]=-(t+b)/(t-b);m[14]=-(f+n)/(f-n);return m},
 lookAt(eye,target,up=[0,1,0]){let z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])},
 project(m,p){let x=p[0],y=p[1],z=p[2],w=m[3]*x+m[7]*y+m[11]*z+m[15];return [(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w,w]}
};
let materialId=0;
function color(hex){let s=typeof hex==='number'?hex:parseInt(hex.replace('#',''),16);return [(s>>16&255)/255,(s>>8&255)/255,(s&255)/255].map(v=>Math.pow(v,2.2))}
class Material{constructor(hex,rough=.5,metal=.0,emission=0,alpha=1){this.id=++materialId;this.color=color(hex);this.rough=rough;this.metal=metal;this.emission=emission;this.alpha=alpha;this.texture=null;this.floor=false;this.finish=0}}
class Node{
 constructor(name=''){this.name=name;this.position=[0,0,0];this.rotation=[0,0,0];this.scale=[1,1,1];this.children=[];this.parent=null;this.geometry=null;this.material=null;this.world=M.identity();this.id=0;this.visible=true;this.dynamic=false;this.castShadow=true;this.reflect=true}
 add(n){n.parent=this;this.children.push(n);return n}
 at(x,y,z){this.position=[x,y,z];return this}
 rotate(x,y,z){this.rotation=[x,y,z];return this}
 update(parent=M.identity(),id=0){this.world=M.mul(parent,M.compose(this.position,this.rotation,this.scale));this.pickId=this.id||id;for(let n of this.children)n.update(this.world,this.pickId)}
}
M.normal = function(m) {
 const a=[m[0],m[1],m[2]], b=[m[4],m[5],m[6]], c=[m[8],m[9],m[10]];
 const x=V.cross(b,c), y=V.cross(c,a), z=V.cross(a,b), det=V.dot(a,x);
 if(Math.abs(det)<1e-10) return new Float32Array([1,0,0,0,1,0,0,0,1]);
 return new Float32Array([...x,...y,...z].map(v=>v/det));
};
M.normalDir = function(m,p){const n=M.normal(m);return V.norm([n[0]*p[0]+n[3]*p[1]+n[6]*p[2],n[1]*p[0]+n[4]*p[1]+n[7]*p[2],n[2]*p[0]+n[5]*p[1]+n[8]*p[2]])};
const G={
 data:()=>({v:[],n:[],uv:[]}),
 tri(g,a,b,c,na,nb=na,nc=na,uvs=[[0,0],[1,0],[1,1]]){g.v.push(...a,...b,...c);g.n.push(...na,...nb,...nc);g.uv.push(...uvs[0],...uvs[1],...uvs[2])},
 quad(g,a,b,c,d,n){G.tri(g,a,b,c,n,n,n,[[0,0],[1,0],[1,1]]);G.tri(g,a,c,d,n,n,n,[[0,0],[1,1],[0,1]])},
 box(w,h,d,r=0){
  let g=G.data(),half=[w/2,h/2,d/2];r=Math.max(0,Math.min(r,...half));if(Math.min(w,h,d)<.055)r=0;
  const faces=[[[1,0,0],[0,1,0],[0,0,1]], [[-1,0,0],[0,1,0],[0,0,-1]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[0,0,1],[-1,0,0]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]];
  for(let [normal,u,v] of faces){let axis=normal.findIndex(x=>x!==0),ui=u.findIndex(x=>x!==0),vi=v.findIndex(x=>x!==0);let us=r?[ -half[ui],-half[ui]+r*.3,-half[ui]+r,half[ui]-r,half[ui]-r*.3,half[ui] ]:[-half[ui],half[ui]],vs=r?[-half[vi],-half[vi]+r*.3,-half[vi]+r,half[vi]-r,half[vi]-r*.3,half[vi]]:[-half[vi],half[vi]];
   if(r<=.045&&r>0){us=[-half[ui],-half[ui]+r,half[ui]-r,half[ui]];vs=[-half[vi],-half[vi]+r,half[vi]-r,half[vi]];}us=[...new Set(us)];vs=[...new Set(vs)];
   const p=(a,b)=>{let q=normal.map((n,i)=>n*half[axis]+u[i]*a+v[i]*b),cl=q.map((x,i)=>Math.max(-half[i]+r,Math.min(half[i]-r,x))),nn=r?V.norm(V.sub(q,cl)):normal;return [r?V.add(cl,V.mul(nn,r)):q,nn]};
   for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){let a=p(us[i],vs[j]),b=p(us[i+1],vs[j]),c=p(us[i+1],vs[j+1]),d0=p(us[i],vs[j+1]);G.tri(g,a[0],b[0],c[0],a[1],b[1],c[1]);G.tri(g,a[0],c[0],d0[0],a[1],c[1],d0[1])}
  }return g
 },
 cylinder(rt,rb,h,seg=32){let g=G.data();for(let i=0;i<seg;i++){let a=i/seg*TAU,b=(i+1)/seg*TAU,p=[Math.cos(a)*rb,-h/2,Math.sin(a)*rb],q=[Math.cos(a)*rt,h/2,Math.sin(a)*rt],r=[Math.cos(b)*rt,h/2,Math.sin(b)*rt],s=[Math.cos(b)*rb,-h/2,Math.sin(b)*rb],na=V.norm([Math.cos(a),(rb-rt)/h,Math.sin(a)]),nb=V.norm([Math.cos(b),(rb-rt)/h,Math.sin(b)]);G.tri(g,p,q,r,na,na,nb);G.tri(g,p,r,s,na,nb,nb);G.tri(g,[0,h/2,0],r,q,[0,1,0]);G.tri(g,[0,-h/2,0],p,s,[0,-1,0])}return g},
 sphere(r,seg=24,rings=12){let g=G.data();const p=(u,v)=>{let n=[Math.sin(v)*Math.cos(u),Math.cos(v),Math.sin(v)*Math.sin(u)];return [V.mul(n,r),n]};for(let i=0;i<seg;i++)for(let j=0;j<rings;j++){let a=p(i/seg*TAU,j/rings*Math.PI),b=p((i+1)/seg*TAU,j/rings*Math.PI),c=p((i+1)/seg*TAU,(j+1)/rings*Math.PI),d=p(i/seg*TAU,(j+1)/rings*Math.PI);G.tri(g,a[0],b[0],c[0],a[1],b[1],c[1]);G.tri(g,a[0],c[0],d[0],a[1],c[1],d[1])}return g},
 torus(r,t,seg=40,sides=8){let g=G.data();const p=(i,j)=>{let u=i/seg*TAU,v=j/sides*TAU,n=[Math.cos(u)*Math.cos(v),Math.sin(v),Math.sin(u)*Math.cos(v)];return [[Math.cos(u)*(r+t*Math.cos(v)),t*Math.sin(v),Math.sin(u)*(r+t*Math.cos(v))],n]};for(let i=0;i<seg;i++)for(let j=0;j<sides;j++){let a=p(i,j),b=p(i,j+1),c=p(i+1,j+1),d=p(i+1,j);G.tri(g,a[0],b[0],c[0],a[1],b[1],c[1]);G.tri(g,a[0],c[0],d[0],a[1],c[1],d[1])}return g},
 tube(points,r=.04,seg=8){let g=G.data(),rings=[];for(let i=0;i<points.length;i++){let tangent=V.norm(V.sub(points[Math.min(i+1,points.length-1)],points[Math.max(0,i-1)])),ref=Math.abs(tangent[1])>.92?[1,0,0]:[0,1,0],u=V.norm(V.cross(tangent,ref)),v=V.cross(tangent,u);rings.push(Array.from({length:seg},(_,j)=>{let n=V.add(V.mul(u,Math.cos(j/seg*TAU)),V.mul(v,Math.sin(j/seg*TAU)));return [V.add(points[i],V.mul(n,r)),n]}))}for(let i=0;i<rings.length-1;i++)for(let j=0;j<seg;j++){let a=rings[i][j],b=rings[i][(j+1)%seg],c=rings[i+1][(j+1)%seg],d=rings[i+1][j];G.tri(g,a[0],b[0],c[0],a[1],b[1],c[1]);G.tri(g,a[0],c[0],d[0],a[1],c[1],d[1])}return g},
 extrude(poly,depth){let g=G.data();for(let i=1;i<poly.length-1;i++){G.tri(g,[...poly[0],depth/2],[...poly[i],depth/2],[...poly[i+1],depth/2],[0,0,1]);G.tri(g,[...poly[0],-depth/2],[...poly[i+1],-depth/2],[...poly[i],-depth/2],[0,0,-1])}for(let i=0;i<poly.length;i++){let a=poly[i],b=poly[(i+1)%poly.length],n=V.norm([b[1]-a[1],a[0]-b[0],0]);G.quad(g,[...a,depth/2],[...a,-depth/2],[...b,-depth/2],[...b,depth/2],n)}return g},
 plane(w,d){let g=G.data();G.quad(g,[-w/2,0,d/2],[w/2,0,d/2],[w/2,0,-d/2],[-w/2,0,-d/2],[0,1,0]);return g},
 merge(items){let g=G.data();for(let {geometry:src,matrix} of items){for(let i=0;i<src.v.length;i+=3){g.v.push(...M.point(matrix,src.v.slice(i,i+3)));g.n.push(...M.normalDir(matrix,src.n.slice(i,i+3)))}for(let x of src.uv)g.uv.push(x)}return g}
};
// Rounded, bevelled convex castings with smooth edge normals and flat cap faces.
G.bevelExtrude=function(input,depth=.5,bevel=.06,corner=.12){
 let area=input.reduce((sum,p,i)=>{let q=input[(i+1)%input.length];return sum+p[0]*q[1]-q[0]*p[1]},0);
 let poly=area<0?[...input].reverse():input, path=[];
 for(let i=0;i<poly.length;i++){
  const p=poly[i],prev=poly[(i+poly.length-1)%poly.length],next=poly[(i+1)%poly.length];
  const lp=Math.hypot(prev[0]-p[0],prev[1]-p[1]),ln=Math.hypot(next[0]-p[0],next[1]-p[1]);
  const r=Math.min(corner,lp*.28,ln*.28),a=[p[0]+(prev[0]-p[0])*r/lp,p[1]+(prev[1]-p[1])*r/lp],b=[p[0]+(next[0]-p[0])*r/ln,p[1]+(next[1]-p[1])*r/ln];
  for(let j=0;j<=4;j++){const t=j/4;path.push([(1-t)**2*a[0]+2*(1-t)*t*p[0]+t*t*b[0],(1-t)**2*a[1]+2*(1-t)*t*p[1]+t*t*b[1]])}
 }
 const n=path.length,g=G.data(),out=[],inset=[];bevel=Math.min(bevel,depth*.38);
 for(let i=0;i<n;i++){
  let p=path[i],a=path[(i+n-1)%n],b=path[(i+1)%n],u=V.norm([p[1]-a[1],a[0]-p[0],0]),v=V.norm([b[1]-p[1],p[0]-b[0],0]);
  let nn=V.norm(V.add(u,v));out.push(nn);inset.push(V.mul(nn,1/Math.max(.15,V.dot(nn,u))));
 }
 const rings=[];
 for(let j=0;j<=5;j++){let a=Math.PI/2*(1-j/5);rings.push({z:-depth/2+bevel*(1-Math.sin(a)),off:bevel*(1-Math.cos(a)),side:Math.cos(a),nz:-Math.sin(a)})}
 for(let j=0;j<=5;j++){let a=Math.PI/2*j/5;rings.push({z:depth/2-bevel+bevel*Math.sin(a),off:bevel*(1-Math.cos(a)),side:Math.cos(a),nz:Math.sin(a)})}
 const pt=(i,r)=>[path[i][0]-inset[i][0]*r.off,path[i][1]-inset[i][1]*r.off,r.z];
 const nn=(i,r)=>[out[i][0]*r.side,out[i][1]*r.side,r.nz];
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){
  let k=(i+1)%n,a=rings[j],b=rings[j+1];
  G.tri(g,pt(i,a),pt(k,a),pt(k,b),nn(i,a),nn(k,a),nn(k,b));G.tri(g,pt(i,a),pt(k,b),pt(i,b),nn(i,a),nn(k,b),nn(i,b));
 }
 for(const [ring,sign] of [[rings[0],-1],[rings.at(-1),1]]){
  const center=[path.reduce((a,p)=>a+p[0],0)/n,path.reduce((a,p)=>a+p[1],0)/n,ring.z];
  for(let i=0;i<n;i++){let a=pt(i,ring),b=pt((i+1)%n,ring);G.tri(g,center,sign>0?a:b,sign>0?b:a,[0,0,sign])}
 }
 return g;
};
function mesh(parent,geo,mat,p=[0,0,0],r=[0,0,0]){let n=new Node();n.geometry=geo;n.material=mat;n.position=p;n.rotation=r;parent.add(n);return n}
// Merge non-animated descendants per material and device, preserving animated joints.
function optimize(root){let buckets=new Map(),keep=[];function collect(n,mat,id){let m=M.mul(mat,M.compose(n.position,n.rotation,n.scale));id=n.id||id;if(n.dynamic){optimize(n);keep.push({node:n,matrix:mat,id});return}if(n.geometry){let key=[n.material.id,id,n.castShadow,n.reflect].join(':');if(!buckets.has(key))buckets.set(key,{material:n.material,id,castShadow:n.castShadow,reflect:n.reflect,items:[]});buckets.get(key).items.push({geometry:n.geometry,matrix:m})}for(let c of n.children)collect(c,m,id)}for(let c of root.children)collect(c,M.identity(),root.id);root.children=[];for(let k of keep){let wrapper=new Node();wrapper.id=k.id;wrapper._fixed=k.matrix;wrapper.update=function(parent,id){this.world=M.mul(parent,this._fixed);this.pickId=this.id||id;for(let c of this.children)c.update(this.world,this.pickId)};wrapper.add(k.node);root.add(wrapper)}for(let b of buckets.values()){let n=mesh(root,G.merge(b.items),b.material);n.id=b.id;n.castShadow=b.castShadow;n.reflect=b.reflect}}
const vs=`#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;layout(location=1) in vec3 a_normal;layout(location=2) in vec2 a_uv;
uniform mat4 u_model,u_vp;uniform mat3 u_normal;
out vec3 v_world,v_normal,v_local,v_lnormal;out vec2 v_uv;
void main(){vec4 p=u_model*vec4(a_pos,1.);v_world=p.xyz;v_normal=normalize(u_normal*a_normal);v_local=a_pos;v_lnormal=a_normal;v_uv=a_uv;gl_Position=u_vp*p;}`;
const fs=`#version 300 es
precision highp float;precision highp sampler2DShadow;
in vec3 v_world,v_normal,v_local,v_lnormal;in vec2 v_uv;out vec4 frag;
uniform vec3 u_color,u_eye,u_lightDir,u_fog;uniform float u_rough,u_metal,u_emission,u_alpha,u_floor,u_selected,u_alarm,u_time,u_textureOn,u_reflectionOn,u_clipFloor,u_volume,u_decal,u_night,u_finish,u_hq;
uniform mat4 u_lightVP;uniform vec4 u_contacts[8],u_lamps[16];uniform int u_lampCount;uniform sampler2DShadow u_shadow;uniform sampler2D u_reflection,u_texture;uniform vec2 u_resolution,u_shadowTexel;
const float PI=3.14159265;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
// Normal-offset lookup into a hardware-compared depth map; every tap is bilinear PCF,
// so the 4x4 (fine) or 2x2 (fast) grid gives a smooth penumbra without dithering noise.
float shadow(vec3 n){float ndl=clamp(dot(n,u_lightDir),0.,1.);vec4 sp=u_lightVP*vec4(v_world+n*(.012+.028*(1.-ndl)),1.);vec3 q=sp.xyz/sp.w*.5+.5;
 if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.)return 1.;q.z-=.00045;float s=0.;
 if(u_hq>.5){for(int x=0;x<4;x++)for(int y=0;y<4;y++)s+=texture(u_shadow,vec3(q.xy+(vec2(x,y)-1.5)*u_shadowTexel,q.z));return s/16.;}
 for(int x=0;x<2;x++)for(int y=0;y<2;y++)s+=texture(u_shadow,vec3(q.xy+(vec2(x,y)-.5)*u_shadowTexel,q.z));return s*.25;}
// Procedural studio environment; lobes widen with roughness (energy roughly conserved).
vec3 env(vec3 r,float rough){float sky=smoothstep(-.15-.35*rough,.85,r.y);vec3 c=mix(vec3(.055,.07,.08),vec3(.38,.48,.55),sky);float e1=mix(26.,2.5,rough),e2=mix(36.,2.5,rough);float panel=pow(max(0.,dot(r,normalize(vec3(-.6,1.,.5)))),e1)*(e1+2.)/28.;float rim=pow(max(0.,dot(r,normalize(vec3(.8,.5,-.6)))),e2)*(e2+2.)/38.;return c+vec3(2.4,2.6,2.65)*panel+vec3(.38,.68,.78)*rim;}
// Analytic split-sum environment BRDF (Karis, mobile approximation).
vec2 envBRDF(float ndv,float r){vec4 c=r*vec4(-1.,-.0275,-.572,.022)+vec4(1.,.0425,1.04,-.04);float a=min(c.x*c.x,exp2(-9.28*ndv))*c.x+c.y;return vec2(-1.04,1.04)*a+c.zw;}
void main(){if(u_clipFloor>.5&&v_world.y<.08)discard;vec3 n=normalize(v_normal),v=normalize(u_eye-v_world),l=u_lightDir;if(dot(n,v)<0.&&u_alpha<.99)n=-n;vec3 h=normalize(v+l);float ndl=max(dot(n,l),0.),ndv=max(dot(n,v),.001),ndh=max(dot(n,h),0.);float texAlpha=1.;vec3 albedo=u_color;if(u_textureOn>.5){vec4 t=texture(u_texture,v_uv);texAlpha=t.a;vec3 rgb=t.rgb;if(u_decal>.5&&t.a<.95)rgb=min(vec3(1.),rgb/max(.12,t.a));albedo*=pow(rgb,vec3(2.2));if(t.a<.03)discard;}
 float baseRough=u_rough;
 // Surface finishes in object space so moving parts do not swim: 1 painted metal (orange peel), 2 brushed steel, 3 cast concrete, 4 rubber/plastic.
 if(u_finish>.5){vec3 lp=v_local,ln=abs(normalize(v_lnormal));
  if(u_finish<1.5){float o=noise(lp*38.)*.6+noise(lp*7.)*.4;baseRough*=.86+.28*o;albedo*=.975+.05*noise(lp*2.3);}
  else if(u_finish<2.5){vec3 sc=ln.x>.6?vec3(1.,90.,2.5):ln.y>.6?vec3(90.,1.,2.5):vec3(90.,2.5,1.);float b=noise(lp*sc)*.65+noise(lp*sc*2.7)*.35;baseRough=clamp(baseRough*(.78+.5*b),.08,1.);albedo*=.95+.1*b;}
  else if(u_finish<3.5){float m=noise(lp*1.7)*.55+noise(lp*6.)*.3+noise(lp*31.)*.15;albedo*=.86+.26*m;baseRough=min(1.,baseRough+.06*(m-.5));}
  else{baseRough=min(1.,baseRough*(.92+.16*noise(lp*55.)));}
 }
 float floorGloss=1.;if(u_floor>.5){float m=noise(vec3(v_world.xz*.35,1.))*.6+noise(vec3(v_world.xz*1.7,3.))*.4;floorGloss=.55+.9*m;baseRough=clamp(baseRough*(1.25-.45*m),.12,1.);albedo*=.965+.07*noise(vec3(v_world.xz*.8,7.));}
 float variance=max(dot(dFdx(n),dFdx(n)),dot(dFdy(n),dFdy(n)));float rough=min(1.,sqrt(max(.12,baseRough)*max(.12,baseRough)+min(.15,variance*.22))),a=rough*rough,a2=a*a,den=ndh*ndh*(a2-1.)+1.;float D=a2/(PI*den*den+.0001),k=(rough+1.)*(rough+1.)/8.;float vis=(ndv/(ndv*(1.-k)+k))*(ndl/(ndl*(1.-k)+k));vec3 f0=mix(vec3(.04),albedo,u_metal),F=f0+(1.-f0)*pow(1.-max(dot(h,v),0.),5.);vec3 spec=D*vis*F/max(4.*ndv*ndl,.001);float sh=u_clipFloor>.5?1.:mix(.28,1.,shadow(n));// Day: skylight through the clerestory. Night shift: skylight gone, high-bay fixtures carry the scene.
 vec3 hemi=mix(mix(vec3(.12,.135,.145),vec3(.50,.54,.56),n.y*.5+.5),mix(vec3(.028,.036,.044),vec3(.15,.165,.18),n.y*.5+.5),u_night);vec3 sun=mix(vec3(4.2,4.02,3.67),vec3(.7,.7,.68),u_night);vec3 diffuse=(1.-u_metal)*albedo;vec3 col=albedo*hemi*(1.-u_metal*.64)+((1.-F)*diffuse/PI+spec)*sun*ndl*sh;
 vec2 ab=envBRDF(ndv,rough);float horizon=clamp(1.+dot(reflect(-v,n),n),0.,1.);col+=env(reflect(-v,n),rough)*(f0*ab.x+ab.y)*horizon*horizon*1.15*mix(.8,.3,u_night);col+=albedo*u_emission*mix(1.,1.7,u_night);
 // Soft bounce from the shop's service wall; broad studio fill, not a hard second shadow.
 vec3 fill=normalize(vec3(.7,.65,-.75));col+=albedo*(1.-u_metal*.7)*vec3(.17,.21,.23)*mix(1.,.45,u_night)*max(0.,dot(n,fill));
 // Night shift: high-bay LED fixtures as downward cones with windowed inverse-square falloff.
 if(u_night>.01&&u_lampCount>0){vec3 acc=vec3(0);for(int i=0;i<16;i++){if(i>=u_lampCount)break;vec3 L=u_lamps[i].xyz-v_world;float d2=dot(L,L);L*=inversesqrt(d2);float cone=smoothstep(.2,.75,L.y),win=clamp(1.-d2/289.,0.,1.);float nl=max(dot(n,L),0.);vec3 hh=normalize(L+v);float g=pow(max(dot(n,hh),0.),mix(8.,90.,1.-rough))*(1.-rough)*.35;acc+=(nl*(diffuse/PI+f0*g))*cone*win*win*u_lamps[i].w/(1.+d2*.09);}col+=acc*vec3(1.,.94,.84)*u_night;}
 if(u_floor>.5){
  vec2 cell=abs(fract((v_world.xz+1.5)/3.)-.5)*3.;vec2 aa=max(fwidth(v_world.xz),vec2(.005));
  float seam=1.-min(smoothstep(.008,.008+aa.x,cell.x),smoothstep(.008,.008+aa.y,cell.y));
  // Saw-cut expansion joints every 6 m read slightly wider than the 3 m panel seams.
  vec2 joint=abs(fract((v_world.xz+1.5)/6.)-.5)*6.;float cut=1.-min(smoothstep(.016,.016+aa.x,joint.x),smoothstep(.016,.016+aa.y,joint.y));col*=1.-max(seam*.12,cut*.24);
  float contact=0.;for(int i=0;i<8;i++){vec4 o=u_contacts[i];vec2 q=(v_world.xz-o.xy)/o.zw;contact=max(contact,exp(-dot(q,q)*1.5)*.28);}col*=1.-contact;
  if(u_reflectionOn>.5){vec2 uv=gl_FragCoord.xy/u_resolution;vec3 ref=vec3(0);float spread=.0012+.0035*rough;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)ref+=texture(u_reflection,uv+vec2(x,y)*spread).rgb;ref/=9.;float fres=(.06+.22*pow(1.-ndv,3.))*floorGloss*(1.-cut);col=mix(col,ref*(1.-contact*.6),clamp(fres,0.,.4));}
 }
 if(u_selected>.5){float rim=pow(1.-ndv,3.);col+=mix(vec3(.01,.2,.16),vec3(.6,.10,.012),u_alarm)*rim*.9;}
 float fog=1.-exp(-pow(length(u_eye-v_world)*.008,2.));col=mix(col,u_fog,fog);float alpha=u_alpha*texAlpha;if(u_alpha<.99&&u_volume<.5)alpha=mix(alpha,1.,pow(1.-ndv,4.)*.55);if(u_volume>.5){if(abs(n.y)>.8)discard;alpha*=.30*pow(1.-clamp(v_world.y/4.1,0.,1.),.8);}frag=vec4(col,alpha);
}`;
const depthVS=`#version 300 es
layout(location=0) in vec3 a_pos;uniform mat4 u_model,u_vp;void main(){gl_Position=u_vp*u_model*vec4(a_pos,1.);}`;
const depthFS=`#version 300 es
precision highp float;out vec4 frag;uniform vec3 u_idColor;void main(){frag=vec4(u_idColor,1.);}`;
const fullVS=`#version 300 es
out vec2 v_uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);v_uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const bloomFS=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 frag;uniform sampler2D u_image;uniform vec2 u_step;uniform float u_extract;
void main(){vec3 c=vec3(0);float total=0.;for(int i=-4;i<=4;i++){float w=exp(-float(i*i)/7.);vec3 s=texture(u_image,v_uv+u_step*float(i)).rgb;if(u_extract>.5){float mx=max(s.r,max(s.g,s.b)),sat=(mx-min(s.r,min(s.g,s.b)))/max(mx,.001);s=max(s-vec3(1.),vec3(0))*mix(.2,1.,smoothstep(.12,.45,sat));}c+=s*w;total+=w;}frag=vec4(c/total,1.);}`;
// Half-resolution, depth-aware ambient occlusion. Deterministic spatial sampling;
// bilateral upsampling keeps machine silhouettes free of dark screen-space halos.
const aoFS=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 frag;
uniform sampler2D u_depth;uniform vec2 u_size;uniform float u_tanHalf,u_aspect;
float linearDepth(float d){return (2.*.2*150.)/(150.+.2-(d*2.-1.)*(150.-.2));}
vec3 position(vec2 uv,float d){
 // Depth uses NEAREST; reconstruct at its actual texel centre, never between texels.
 vec2 size=vec2(textureSize(u_depth,0));uv=(floor(uv*size)+.5)/size;
 float z=linearDepth(d);return vec3((uv*2.-1.)*vec2(u_aspect*u_tanHalf,u_tanHalf),-1.)*z;}
void main(){float d=texture(u_depth,v_uv).r;if(d>=.999999){frag=vec4(1.,1.,0.,1.);return;}
 vec3 p=position(v_uv,d),dx=dFdx(p),dy=dFdy(p);vec3 n=normalize(cross(dx,dy));if(n.z<0.)n=-n;
 float z=-p.z,radius=.65,occ=0.;vec2 ip=mod(floor(v_uv*u_size),4.);float angle=(ip.x*.25+ip.y*.0625)*6.2831853,jitter=fract(ip.y*.25+ip.x*.5625);
 vec2 scale=vec2(1./u_aspect,1.)*radius/(max(z,.2)*u_tanHalf*2.);
 for(int i=0;i<12;i++){float a=float(i)*2.399963+angle,ring=.16+.84*(float(i)+jitter)/12.;vec2 uv=v_uv+vec2(cos(a),sin(a))*scale*ring;
  if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))continue;
  float sd=texture(u_depth,uv).r;if(sd>=.99999)continue;vec3 diff=position(uv,sd)-p;float dist=length(diff);
  if(dist>.001)occ+=max(0.,dot(n,diff/dist)-.12)*(1.-smoothstep(.05,radius,dist));
 }
 frag=vec4(1.-min(.57,occ*(3.4/12.)),z/150.,0.,1.);
}`;
const postFS=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 frag;uniform sampler2D u_image,u_bloom,u_ao,u_depth;uniform vec2 u_texel,u_aoTexel;uniform float u_bloomOn,u_fxaa;
float ambientOcclusion(){
 float d=texture(u_depth,v_uv).r;if(d>=.999999)return 1.;float z=(2.*.2)/(150.+.2-(d*2.-1.)*(150.-.2));
 // 4x4 depth-aware blur exactly covers the 4x4 interleaved rotation pattern of the AO pass, so no sampling noise survives.
 float sum=0.,weights=0.;for(int x=0;x<4;x++)for(int y=0;y<4;y++){vec2 o=vec2(x,y)-1.5;vec2 a=texture(u_ao,v_uv+o*u_aoTexel).rg;float w=exp(-abs(a.g-z)*850.)/(1.+.25*dot(o,o));sum+=a.r*w;weights+=w;}
 return weights>.000001?sum/weights:1.;
}
float tl(vec3 c){float l=dot(c,vec3(.299,.587,.114));return l/(1.+l);}
// FXAA (fast preset) for the balanced quality path, which renders without MSAA. Luma is tone-mapped first so HDR edges resolve.
vec3 fxaa(vec3 c,vec3 n,vec3 s,vec3 e,vec3 w){vec2 t=u_texel;float lNW=tl(texture(u_image,v_uv+vec2(-t.x,t.y)).rgb),lNE=tl(texture(u_image,v_uv+t).rgb),lSW=tl(texture(u_image,v_uv-t).rgb),lSE=tl(texture(u_image,v_uv+vec2(t.x,-t.y)).rgb),lM=tl(c);
 float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))),lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));if(lMax-lMin<max(.03,lMax*.125))return c;
 vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),(lNW+lSW)-(lNE+lSE));float red=max((lNW+lNE+lSW+lSE)*.03125,1./128.);dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+red),-8.,8.)*t;
 vec3 a=.5*(texture(u_image,v_uv-dir/6.).rgb+texture(u_image,v_uv+dir/6.).rgb),b=a*.5+.25*(texture(u_image,v_uv-dir*.5).rgb+texture(u_image,v_uv+dir*.5).rgb);float lB=tl(b);return (lB<lMin||lB>lMax)?a:b;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 c=texture(u_image,v_uv).rgb;vec3 n=texture(u_image,v_uv+vec2(0,u_texel.y)).rgb,s=texture(u_image,v_uv-vec2(0,u_texel.y)).rgb,e=texture(u_image,v_uv+vec2(u_texel.x,0)).rgb,w=texture(u_image,v_uv-vec2(u_texel.x,0)).rgb;vec3 lum=vec3(.299,.587,.114);float contrast=max(max(dot(n,lum),dot(s,lum)),max(dot(e,lum),dot(w,lum)))-min(min(dot(n,lum),dot(s,lum)),min(dot(e,lum),dot(w,lum)));if(u_fxaa>.5)c=fxaa(c,n,s,e,w);else c=mix(c,(n+s+e+w)*.25,clamp(contrast*.35,0.,.20));if(u_bloomOn>.5)c*=mix(ambientOcclusion(),1.,smoothstep(.8,2.2,dot(c,lum))*.60);c+=texture(u_bloom,v_uv).rgb*.13*u_bloomOn;c=aces(c*.94);float vig=1.-.13*pow(length((v_uv-.5)*vec2(1.1,.85)),2.);c=pow(c*vig,vec3(1./2.2));frag=vec4(c,1.);}`;
class Renderer{
 constructor(canvas){
  this.canvas=canvas;const gl=canvas.getContext('webgl2',{antialias:false,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!gl)throw new Error('此浏览器未启用 WebGL 2，请使用开启硬件加速的 Chrome 或 Edge。');this.gl=gl;this.hdr=!!gl.getExtension('EXT_color_buffer_float');this.program=this.compile(vs,fs);this.depthProgram=this.compile(depthVS,depthFS);this.bloomProgram=this.compile(fullVS,bloomFS);this.postProgram=this.compile(fullVS,postFS);this.aoProgram=this.compile(fullVS,aoFS);this.quality='high';this.selected=0;this.alarmId=0;this.time=0;this.night=0;this.drawCalls=0;this.triangles=0;this.geometries=new Set();this.textures=new Set();this.contextLost=false;
  this.lightDir=V.norm([-0.45,.82,.45]);this.lightVP=M.mul(M.ortho(-24,24,-22,22,.1,100),M.lookAt(V.mul(this.lightDir,45),[0,0,0]));this.shadowSize=2048;this.shadow=this.shadowTarget(this.shadowSize);this.white=this.canvasTexture(Object.assign(document.createElement('canvas'),{width:1,height:1}),true);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;window.dispatchEvent(new CustomEvent('renderlost'))});canvas.addEventListener('webglcontextrestored',()=>location.reload());this.resize();
 }
 compile(v,f){let gl=this.gl,p=gl.createProgram();for(let [type,src] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s)}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));p.loc={};return p}
 loc(p,name){if(!(name in p.loc))p.loc[name]=this.gl.getUniformLocation(p,name);return p.loc[name]}
 u1(p,n,v){this.gl.uniform1f(this.loc(p,n),v)} u3(p,n,v){this.gl.uniform3fv(this.loc(p,n),v)} u2(p,n,v){this.gl.uniform2fv(this.loc(p,n),v)} um(p,n,v){this.gl.uniformMatrix4fv(this.loc(p,n),false,v)}
 tex(p,n,t,unit){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(this.loc(p,n),unit)}
 canvasTexture(canvas,white=false){let gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);if(white)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));else{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false)}gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.textures.add(t);return t}
 shadowTarget(size){let gl=this.gl,f=gl.createFramebuffer(),t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,size,size,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);for(let n of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,n,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);for(let n of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,n,gl.CLAMP_TO_EDGE);gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,t,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);this.checkFramebuffer('shadow');gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {f,t,w:size,h:size}}
 target(w,h,depth=true,float=true,depthTex=false){let gl=this.gl,f=gl.createFramebuffer(),t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,(float&&this.hdr)?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,(float&&this.hdr)?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);for(let n of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,n,gl.LINEAR);for(let n of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,n,gl.CLAMP_TO_EDGE);gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);let d=null,dt=null;if(depth){if(depthTex){
  dt=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,dt);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  for(let n of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,n,gl.NEAREST);for(let n of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,n,gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,dt,0);
 }else{d=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,d);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,d)}}this.checkFramebuffer('color');gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {f,t,d,dt,w,h}}
 checkFramebuffer(label){const gl=this.gl;if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error(label+' framebuffer unavailable')}
 multisample(w,h){let gl=this.gl,format=this.hdr?gl.RGBA16F:gl.RGBA8,available=gl.getInternalformatParameter(gl.RENDERBUFFER,format,gl.SAMPLES),samples=Math.min(4,available[0]||0);if(samples<2)return null;let f=gl.createFramebuffer(),c=gl.createRenderbuffer(),d=gl.createRenderbuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.bindRenderbuffer(gl.RENDERBUFFER,c);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,format,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,c);gl.bindRenderbuffer(gl.RENDERBUFFER,d);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,d);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.deleteFramebuffer(f);gl.deleteRenderbuffer(c);gl.deleteRenderbuffer(d);return null}gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {f,c,d,w,h,samples}}
 releaseTarget(t){if(!t)return;let gl=this.gl;gl.deleteFramebuffer(t.f);if(t.t)gl.deleteTexture(t.t);if(t.c)gl.deleteRenderbuffer(t.c);if(t.d)gl.deleteRenderbuffer(t.d);if(t.dt)gl.deleteTexture(t.dt)}
 resize(){let rect=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,this.quality==='high'?1.5:1)*(this.quality==='high'?1:.8),w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));if(this.width===w&&this.height===h)return;this.width=this.canvas.width=w;this.height=this.canvas.height=h;for(let n of ['main','reflection','bloomA','bloomB','ao','picking','msaa'])this.releaseTarget(this[n]);this.main=this.target(w,h,true,true,true);this.ao=this.target(Math.max(2,w>>1),Math.max(2,h>>1),false);this.msaa=this.multisample(w,h);this.reflection=this.target(Math.max(2,w>>1),Math.max(2,h>>1));this.bloomA=this.target(Math.max(2,w>>2),Math.max(2,h>>2),false);this.bloomB=this.target(Math.max(2,w>>2),Math.max(2,h>>2),false);this.picking=this.target(w,h,true,false)}
 upload(g){if(g.gpu)return;if(!g.center){let mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];for(let i=0;i<g.v.length;i++){let k=i%3;mn[k]=Math.min(mn[k],g.v[i]);mx[k]=Math.max(mx[k],g.v[i]);}g.center=mn.map((v,i)=>(v+mx[i])*.5);}let gl=this.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);g.buffers=[];for(let [i,values,size] of [[0,g.v,3],[1,g.n,3],[2,g.uv,2]]){let b=gl.createBuffer();g.buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,0,0)}g.gpu=vao;g.count=g.v.length/3;this.geometries.add(g)}
 list(root){let list=[];function walk(n){if(!n.visible)return;if(n.geometry)list.push(n);for(let c of n.children)walk(c)}walk(root);return list}
 draw(n,p){let gl=this.gl;this.upload(n.geometry);gl.bindVertexArray(n.geometry.gpu);this.um(p,'u_model',n.world);if(p===this.program)gl.uniformMatrix3fv(this.loc(p,'u_normal'),false,M.normal(n.world));gl.drawArrays(gl.TRIANGLES,0,n.geometry.count);this.drawCalls++;this.triangles+=n.geometry.count/3}
 render(root,camera){if(this.contextLost)return;root.update();this.resize();this.items=this.list(root);let gl=this.gl;this.drawCalls=0;this.triangles=0;this.vp=M.mul(camera.projection(this.width/this.height),camera.view());this.eye=camera.eye();gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.frontFace(gl.CCW);
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadow.f);gl.viewport(0,0,this.shadowSize,this.shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.depthProgram);this.um(this.depthProgram,'u_vp',this.lightVP);this.u3(this.depthProgram,'u_idColor',[0,0,0]);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.1,2);for(let n of this.items)if(n.castShadow&&n.material.alpha>.95&&!n.material.floor)this.draw(n,this.depthProgram);gl.disable(gl.POLYGON_OFFSET_FILL);
  if(this.quality==='high'){const reflectVP=M.mul(this.vp,M.scale(1,-1,1));gl.frontFace(gl.CW);this.scenePass(this.reflection,reflectVP,[this.eye[0],-this.eye[1],this.eye[2]],true);gl.frontFace(gl.CCW)}
  this.scenePass(this.quality==='high'&&this.msaa?this.msaa:this.main,this.vp,this.eye,false);if(this.quality==='high'&&this.msaa){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.msaa.f);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.main.f);gl.blitFramebuffer(0,0,this.width,this.height,0,0,this.width,this.height,gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT,gl.NEAREST);}gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.bindVertexArray(null);
  if(this.quality==='high'){this.occlusion(camera);this.blur(this.main.t,this.bloomA,[3/this.width,0],1);this.blur(this.bloomA.t,this.bloomB,[0,1.8/this.bloomA.h],0)}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.width,this.height);let p=this.postProgram;gl.useProgram(p);this.tex(p,'u_image',this.main.t,0);this.tex(p,'u_bloom',this.bloomB.t,1);this.tex(p,'u_ao',this.ao.t,2);this.tex(p,'u_depth',this.main.dt,3);this.u2(p,'u_aoTexel',[1/this.ao.w,1/this.ao.h]);this.u2(p,'u_texel',[1/this.width,1/this.height]);this.u1(p,'u_bloomOn',this.quality==='high'?1:0);this.u1(p,'u_fxaa',this.quality==='high'&&this.msaa?0:1);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindVertexArray(null)
 }
 scenePass(target,vp,eye,reflection){let gl=this.gl,p=this.program;gl.bindFramebuffer(gl.FRAMEBUFFER,target.f);gl.viewport(0,0,target.w,target.h);// Fog and clear colour match the page background (css --scene) after tone mapping.
  const fog=[.825,.962,.903].map((d,i)=>d+([.0105,.0183,.0221][i]-d)*this.night);gl.clearColor(fog[0],fog[1],fog[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(p);this.u3(p,'u_fog',fog);this.u1(p,'u_night',this.night);this.um(p,'u_vp',vp);this.um(p,'u_lightVP',this.lightVP);this.u3(p,'u_eye',eye);this.u3(p,'u_lightDir',this.lightDir);this.u2(p,'u_resolution',[target.w,target.h]);this.u2(p,'u_shadowTexel',[1/this.shadowSize,1/this.shadowSize]);this.u1(p,'u_time',this.time);this.u1(p,'u_hq',this.quality==='high'?1:0);gl.uniform4fv(this.loc(p,'u_contacts'),this.contacts||new Float32Array(32).fill(1));const lamps=this.lamps||null,lampCount=lamps?Math.min(16,lamps.length>>2):0;gl.uniform1i(this.loc(p,'u_lampCount'),lampCount);if(lampCount)gl.uniform4fv(this.loc(p,'u_lamps'),lamps.subarray(0,lampCount*4));this.u1(p,'u_clipFloor',reflection?1:0);this.tex(p,'u_shadow',this.shadow.t,0);this.tex(p,'u_reflection',reflection?this.white:this.reflection.t,1);this.u1(p,'u_reflectionOn',!reflection&&this.quality==='high'?1:0);
  const renderMaterial=n=>{let m=n.material;this.u3(p,'u_color',m.color);this.u1(p,'u_rough',m.rough);this.u1(p,'u_metal',m.metal);this.u1(p,'u_emission',m.emission);this.u1(p,'u_alpha',m.alpha);this.u1(p,'u_floor',m.floor?1:0);this.u1(p,'u_volume',m.volume?1:0);this.u1(p,'u_decal',m.decal?1:0);this.u1(p,'u_finish',m.finish||0);this.u1(p,'u_selected',(this.selected>0&&n.pickId===this.selected)||(this.alarmId>0&&n.pickId===this.alarmId)?1:0);this.u1(p,'u_alarm',this.alarmId>0&&n.pickId===this.alarmId?1:0);this.u1(p,'u_textureOn',m.texture?1:0);this.tex(p,'u_texture',m.texture||this.white,2);this.draw(n,p)};
  for(let n of this.items)if(n.material.alpha>=.99&&(!reflection||n.reflect&&!n.material.floor))renderMaterial(n);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);let transparent=this.items.filter(n=>n.material.alpha<.99&&(!reflection||n.reflect&&!n.material.floor));transparent.sort((a,b)=>Math.hypot(...V.sub(M.point(b.world,b.geometry.center||[0,0,0]),eye))-Math.hypot(...V.sub(M.point(a.world,a.geometry.center||[0,0,0]),eye)));for(let n of transparent){gl.disable(gl.CULL_FACE);renderMaterial(n)}gl.enable(gl.CULL_FACE);gl.depthMask(true);gl.disable(gl.BLEND)
 }
 occlusion(camera){const gl=this.gl,p=this.aoProgram;gl.bindFramebuffer(gl.FRAMEBUFFER,this.ao.f);gl.viewport(0,0,this.ao.w,this.ao.h);gl.useProgram(p);this.tex(p,'u_depth',this.main.dt,0);this.u2(p,'u_size',[this.ao.w,this.ao.h]);this.u1(p,'u_tanHalf',Math.tan(camera.fov*.5));this.u1(p,'u_aspect',this.width/this.height);gl.drawArrays(gl.TRIANGLES,0,3)}
 blur(tex,out,step,extract){let gl=this.gl,p=this.bloomProgram;gl.bindFramebuffer(gl.FRAMEBUFFER,out.f);gl.viewport(0,0,out.w,out.h);gl.useProgram(p);this.tex(p,'u_image',tex,0);this.u2(p,'u_step',step);this.u1(p,'u_extract',extract);gl.drawArrays(gl.TRIANGLES,0,3)}
 pick(clientX,clientY){let gl=this.gl,r=this.canvas.getBoundingClientRect(),x=Math.floor((clientX-r.left)/r.width*this.width),y=Math.floor((r.bottom-clientY)/r.height*this.height);if(x<0||y<0||x>=this.width||y>=this.height)return 0;gl.bindFramebuffer(gl.FRAMEBUFFER,this.picking.f);gl.viewport(0,0,this.width,this.height);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.frontFace(gl.CCW);gl.disable(gl.BLEND);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);let p=this.depthProgram;gl.useProgram(p);this.um(p,'u_vp',this.vp);for(let n of this.items){if(n.material.alpha<.5)continue;this.u3(p,'u_idColor',[(n.pickId&255)/255,0,0]);this.draw(n,p)}let pix=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pix);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return pix[0]}
 project(point){let p=M.project(this.vp,point),r=this.canvas.getBoundingClientRect();return {x:(p[0]*.5+.5)*r.width,y:(-.5*p[1]+.5)*r.height,visible:p[3]>0&&p[2]<1&&Math.abs(p[0])<1&&Math.abs(p[1])<1}}
 dispose(){let gl=this.gl;for(let g of this.geometries){gl.deleteVertexArray(g.gpu);g.buffers.forEach(b=>gl.deleteBuffer(b))}for(let t of this.textures)gl.deleteTexture(t);for(let n of ['main','reflection','bloomA','bloomB','ao','picking','shadow','msaa'])this.releaseTarget(this[n]);for(let p of [this.program,this.depthProgram,this.bloomProgram,this.postProgram,this.aoProgram])gl.deleteProgram(p)}
}
class OrbitCamera{
 constructor(canvas){this.target=[0,.7,0];this.theta=.62;this.phi=.97;this.distance=45;this.fov=43*Math.PI/180;this.tween=null;this.touring=false;this.listeners=[];this.onInteract=()=>{};let pointers=new Map(),start=null;
  const on=(name,fn,opts)=>{canvas.addEventListener(name,fn,opts);this.listeners.push([name,fn,opts])};
  on('contextmenu',e=>e.preventDefault());on('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});start={x:e.clientX,y:e.clientY};this.tween=null;this.touring=false;this.onInteract();});
  on('pointermove',e=>{let prev=pointers.get(e.pointerId);if(!prev)return;let dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(pointers.size===2){let other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1],before=Math.hypot(prev.x-other.x,prev.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);this.distance=Math.max(7,Math.min(70,this.distance*(before/Math.max(1,after))))}else if(e.buttons===2||e.shiftKey){this.pan(-dx*.018*this.distance/35,dy*.018*this.distance/35)}else{this.theta-=dx*.005;this.phi=Math.max(.10,Math.min(1.48,this.phi+dy*.005))}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})});
  const up=e=>{pointers.delete(e.pointerId);start=null};on('pointerup',up);on('pointercancel',up);on('wheel',e=>{e.preventDefault();this.distance=Math.max(7,Math.min(70,this.distance*Math.exp(e.deltaY*.001)));this.tween=null;this.touring=false;this.onInteract()},{passive:false});
 }
 eye(){return V.add(this.target,[this.distance*Math.sin(this.phi)*Math.sin(this.theta),this.distance*Math.cos(this.phi),this.distance*Math.sin(this.phi)*Math.cos(this.theta)])}
 view(){return M.lookAt(this.eye(),this.target)}projection(aspect){return M.perspective(this.fov,aspect,.2,150)}
 pan(x,z){this.target[0]+=Math.cos(this.theta)*x+Math.sin(this.theta)*z;this.target[2]+=-Math.sin(this.theta)*x+Math.cos(this.theta)*z;this.target[0]=Math.max(-20,Math.min(20,this.target[0]));this.target[2]=Math.max(-15,Math.min(15,this.target[2]))}
 fly(target,distance=14,theta=this.theta,phi=.92){this.tween={elapsed:0,start:{target:[...this.target],distance:this.distance,theta:this.theta,phi:this.phi},end:{target:[...target],distance,theta,phi}};this.touring=false}
 update(dt){if(this.tween){let t=this.tween;t.elapsed+=dt;let x=Math.min(1,t.elapsed/1.15),s=x*x*(3-2*x);this.target=V.lerp(t.start.target,t.end.target,s);for(let k of ['distance','theta','phi'])this[k]=t.start[k]+(t.end[k]-t.start[k])*s;if(x===1)this.tween=null}else if(this.touring)this.theta+=dt*.09}
 dispose(canvas){for(let [n,f,o] of this.listeners)canvas.removeEventListener(n,f,o)}
}
window.TwinGL={V,M,G,Material,Node,Renderer,OrbitCamera,mesh,optimize,color,TAU};
})();
