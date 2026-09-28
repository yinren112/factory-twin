/* Procedural industrial assets, authored for this project. Units are metres. */
(function(){
'use strict';
const {V,M,G,Material,Node,mesh,optimize,color,TAU}=TwinGL;
function buildFactory(renderer){
 const root=new Node('Smart Factory Twin');
 const mats={floor:new Material('#43555e',.42,.08),slab:new Material('#25343d',.5,.2),edge:new Material('#405562',.3,.65),dark:new Material('#19252c',.38,.45),black:new Material('#10191e',.63,.05),steel:new Material('#9aabb4',.29,.78),silver:new Material('#d3dfe1',.28,.65),panel:new Material('#d1d8d7',.38,.15),white:new Material('#edf0e7',.3,.1),wall:new Material('#2f424e',.64,.18),wallDark:new Material('#263940',.5,.3),orange:new Material('#e98435',.26,.12),orangeDark:new Material('#bd591f',.36,.12),yellow:new Material('#d1b674',.44,.08),teal:new Material('#4f8467',.55,.05),concrete:new Material('#9da39f',.92,.02),signRed:new Material('#b8322a',.45,.1),rubber:new Material('#142128',.82,.0),pallet:new Material('#647c84',.5,.45),green:new Material('#76f3ca',.2,.1,1.6),amber:new Material('#ffa561',.25,.1,1.8),red:new Material('#ff6a3d',.24,.15,2),light:new Material('#d7f2ed',.2,.1,2.2),blue:new Material('#60bbd2',.24,.35,1),glass:new Material('#80c4cc',.15,.20,0,.12),glassDark:new Material('#10272f',.12,.58),ink:new Material('#243238',.7),muted:new Material('#7e969d',.7)};
 mats.floor.floor=true;
 let geoCache=new Map();const geo=(k,fn)=>{if(!geoCache.has(k))geoCache.set(k,fn());return geoCache.get(k)};
 const box=(p,w,h,d,mat,x=0,y=0,z=0,r=.025,rot=[0,0,0])=>(r=Math.min(r,.03),mesh(p,geo(`b${w},${h},${d},${r}`,()=>G.box(w,h,d,r)),mat,[x,y,z],rot));
 const cyl=(p,rt,rb,h,mat,x=0,y=0,z=0,rot=[0,0,0],segments=40)=>mesh(p,geo(`c${rt},${rb},${h},${segments}`,()=>G.cylinder(rt,rb,h,segments)),mat,[x,y,z],rot);
 const torus=(p,r,t,mat,x=0,y=0,z=0,rot=[0,0,0])=>mesh(p,geo(`t${r},${t}`,()=>G.torus(r,t)),mat,[x,y,z],rot);
 const tube=(p,pts,r,mat)=>mesh(p,G.tube(pts,r),mat);
 const group=(p,name,x=0,y=0,z=0,ry=0,dynamic=false)=>{let n=new Node(name).at(x,y,z).rotate(0,ry,0);n.dynamic=dynamic;p.add(n);return n};
 const labelTextures=new Map();
 function text(p,string,w,h,x,y,z,{fg='#bed3d4',bg=null,rotate=[Math.PI/2,0,0],weight=600}={}){
  let key=[string,fg,bg,w,h,weight].join('|');let mat=labelTextures.get(key);if(!mat){let c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);let ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height)}ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${weight} ${Math.floor(c.height*.69)}px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", Arial, sans-serif`;ctx.fillText(string,c.width/2,c.height/2,c.width*.95);mat=new Material('#ffffff',.8,.0,.25,.98);mat.decal=true;mat.texture=renderer.canvasTexture(c);labelTextures.set(key,mat)}let n=mesh(p,G.plane(w,h),mat,[x,y,z],rotate);n.castShadow=false;return n
 }
 const floorText=(s,x,z,w=3,h=.32,fg='#a4b5b5')=>text(root,s,w,h,x,.024,z,{rotate:[0,0,0],fg});
 function bolt(p,x,y,z,r=.045,axis='y'){return cyl(p,r,r,.045,mats.steel,x,y,z,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0],6)}
 function statusTower(p,x,y,z,baseState='running'){
  cyl(p,.035,.035,.35,mats.steel,x,y+.17,z);cyl(p,.10,.10,.06,mats.dark,x,y+.36,z);
  const lenses=[];for(let i=0;i<3;i++){let m=new Material(i===0?'#5ae1ae':i===1?'#ad7648':'#7c4540',.23,.1,i===0?1.8:0);lenses.push(m);cyl(p,.085,.085,.115,m,x,y+.43+i*.135,z);cyl(p,.091,.091,.025,mats.dark,x,y+.5+i*.135,z)}
  return state=>{for(let i=0;i<3;i++){let on=i===(state==='running'?0:state==='idle'?1:2);lenses[i].color=color(on?(i===0?'#5ef2bf':i===1?'#ffd287':'#ff644b'):(i===0?'#2c554e':i===1?'#63523d':'#613c38'));lenses[i].emission=on?2:0}}
 }
 function screen(p,w,h,x,y,z,title){box(p,w+.12,h+.13,.12,mats.dark,x,y,z,.05);let c=document.createElement('canvas');c.width=512;c.height=320;let ctx=c.getContext('2d');ctx.fillStyle='#0c2026';ctx.fillRect(0,0,512,320);ctx.fillStyle='#7ce2c5';ctx.font='24px Arial';ctx.fillText(title,28,45);ctx.font='bold 70px Arial';ctx.fillText('AUTO',25,126);ctx.strokeStyle='#5aebbd';ctx.lineWidth=5;ctx.beginPath();for(let i=0;i<40;i++){let yy=210+Math.sin(i*.6)*19+Math.sin(i*1.9)*9;i?ctx.lineTo(30+i*11.5,yy):ctx.moveTo(30,yy)}ctx.stroke();ctx.fillStyle='#4b747c';for(let j=0;j<3;j++)ctx.fillRect(30+j*152,265,120,12);let mat=new Material('#ffffff',.5,0,.8);mat.texture=renderer.canvasTexture(c);let n=mesh(p,G.plane(w,h),mat,[x,y,z+.066],[Math.PI/2,0,0]);n.castShadow=false}
 function vents(p,x,y,z,w=.65,h=.50){for(let i=0;i<6;i++)box(p,w,.033,.02,mats.dark,x,y-h/2+i*h/6,z,0)}
 function hazard(p,x,z,w,d){box(p,w,.016,d,mats.dark,x,.024,z,0);for(let t=-w/2+.15;t<w/2;t+=.4){let n=box(p,.17,.018,d*.92,mats.yellow,x+t,.035,z,0);n.rotation[1]=.25}}
 function rail(p,x1,z1,x2,z2){
 const length=Math.hypot(x2-x1,z2-z1),angle=-Math.atan2(z2-z1,x2-x1),g=group(p,'Grounded mesh safety guard',(x1+x2)/2,0,(z1+z2)/2,angle),count=Math.ceil(length/1.7);
 for(let i=0;i<=count;i++){let x=-length/2+i/count*length;
  box(g,.115,1.15,.115,mats.yellow,x,.61,0,.016);box(g,.30,.055,.30,mats.dark,x,.0575,0,.019);box(g,.135,.045,.135,mats.dark,x,1.208,0,.014);
  for(const dx of [-.105,.105])for(const dz of [-.105,.105])bolt(g,x+dx,.099,dz,.022);
 }
 box(g,length,.063,.063,mats.yellow,0,1.105,0,.015);box(g,length,.048,.048,mats.dark,0,.30,0,.01);
 for(let i=0;i<count;i++){
  let left=-length/2+i/count*length+.09,right=-length/2+(i+1)/count*length-.09;
  for(let x=left+.09;x<right;x+=.13)box(g,.009,.733,.009,mats.dark,x,.686,0,.002);
  for(let y=.41;y<1.10;y+=.13)box(g,right-left,.009,.009,mats.dark,(left+right)/2,y,0,.002);
  for(const x of [left,right]){box(g,.05,.12,.085,mats.steel,x,1.02,.01,.01);bolt(g,x,1.02,.065,.026,'z')}
 }
}


 function casting(p,outline,depth,mat,x=0,y=0,z=0,bevel=.05){return mesh(p,G.bevelExtrude(outline,depth,bevel,.12),mat,[x,y,z])}
 function boltRing(p,x,y,z,r,count=8,axis='z',size=.032){
  for(let i=0;i<count;i++){let a=i/count*TAU;
   if(axis==='z'){bolt(p,x+Math.cos(a)*r,y+Math.sin(a)*r,z,size,'z');cyl(p,size*.38,size*.38,.005,mats.black,x+Math.cos(a)*r,y+Math.sin(a)*r,z+.025,[Math.PI/2,0,0],6)}
   else{bolt(p,x+Math.cos(a)*r,y,z+Math.sin(a)*r,size);cyl(p,size*.38,size*.38,.005,mats.black,x+Math.cos(a)*r,y+.025,z+Math.sin(a)*r,[0,0,0],6)}
  }
 }
 function link(p,a,b,r,mat){return tube(p,[a,b],r,mat)}
 function flange(p,x,y,z,r=.19,axis='x'){
  const rot=axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0];
  cyl(p,r,r,.065,mats.steel,x,y,z,rot);cyl(p,r*1.02,r*1.02,.018,mats.dark,x,y,z,rot);
  for(let i=0;i<6;i++){let a=i*TAU/6,cc=Math.cos(a)*r*.8,ss=Math.sin(a)*r*.8;
   bolt(p,x+(axis==='x'?0:cc),y+(axis==='y'?0:axis==='x'?cc:ss),z+(axis==='z'?0:ss),.025,axis);
  }
 }
 function foot(p,x,z){cyl(p,.14,.16,.08,mats.rubber,x,.065,z);cyl(p,.075,.075,.18,mats.steel,x,.17,z);bolt(p,x,.25,z,.10)}
 function warning(p,x,y,z){text(p,'!',.11,.16,x,y,z,{fg:'#192c31',bg:'#deb974',weight:800})}
 function coolingFan(p,x,y,z,r=.20){
  cyl(p,r,r,.03,mats.black,x,y,z,[Math.PI/2,0,0]);torus(p,r*.91,.015,mats.steel,x,y,z+.02,[Math.PI/2,0,0]);
  for(let i=0;i<7;i++){let a=i/7*TAU;box(p,r*1.5,.025,.022,mats.dark,x,y,z+.03,.008,[0,0,a])}
  cyl(p,r*.25,r*.25,.035,mats.steel,x,y,z+.035,[Math.PI/2,0,0]);
 }
 const northShell=group(root,'North cutaway facade',0,0,0,0,true),westShell=group(root,'West cutaway facade',0,0,0,0,true);

 // Architectural shell: open roof and two cutaway facades preserve sight lines.
 box(root,30.4,.5,22.3,mats.slab,0,-.28,.1,.18);box(root,30,.06,22,mats.floor,0,-.015,.1,.04);
 // The production cell sits inside a continuous hall floor, with logistics aprons.
 const hallFloor=new Material('#647178',.72,.04);hallFloor.floor=true;
 const hall=group(root,'Factory hall context'),hallBack=group(root,'Hall north cutaway',0,0,0,0,true),hallWest=group(root,'Hall west cutaway',0,0,0,0,true);
 box(hall,300,.30,240,hallFloor,0,-.20,0,0).castShadow=false;
 box(hall,66,.055,48,hallFloor,0,-.044,2,.04).castShadow=false;
 // Aisles continue past the monitored cell; safety lines stay on the floor.
 for(const x of [-18.1,18.1]){
  box(hall,3.2,.012,51,mats.wallDark,x,-.007,3,0);
  for(const dx of [-1.64,1.64])box(hall,.07,.012,51,mats.yellow,x+dx,.004,3,0);
  for(let z=-18;z<=26;z+=3)box(hall,.09,.012,1.3,mats.muted,x,.005,z,0);
 }
 box(hall,66,.012,3.2,mats.wallDark,0,-.006,14.8,0);
 for(const z of [13.15,16.45])box(hall,66,.014,.075,mats.yellow,0,.006,z,0);
 for(let x=-30;x<=30;x+=3)box(hall,1.35,.014,.09,mats.muted,x,.009,14.8,0);
 for(const x of [-18.1,18.1])for(let i=-3;i<=3;i++)box(hall,.28,.015,2.8,mats.white,x+i*.38,.016,11.5,0);
 // Roof cutaway retains the steel column grid, clerestory and service galleries.
 const cladding=new Material('#75828a',.78,.08),clerestory=new Material('#a9d0d7',.30,.12,.20);
 box(hallBack,66,8.8,.24,cladding,0,4.4,-18.5,.015);
 for(let x=-30;x<=30;x+=6){
  box(hallBack,5.35,2.1,.08,clerestory,x,6.6,-18.33,.012);
  for(const dx of [-2.7,0,2.7])box(hallBack,.085,2.23,.12,mats.steel,x+dx,6.6,-18.23,.004);
  box(hallBack,5.5,.12,.18,mats.dark,x,5.49,-18.2,.015);
 }
 for(const x of [-30,-24,-18,-12,-6,0,6,12,18,24,30]){
  box(hallBack,.26,9.1,.36,mats.edge,x,4.55,-18.05,.015);
  box(hallBack,.68,.16,.72,mats.steel,x,.08,-18.05,.025);
  box(hallBack,.35,.22,7,mats.edge,x,8.85,-14.8,.012);
 }
 box(hallBack,66,.34,.32,mats.edge,0,8.85,-18.05,.015);
 box(hallBack,66,.14,6.6,mats.wall,0,9.08,-14.8,.015);
 for(const z of [-16,-12])box(hallBack,61,.055,.18,mats.light,0,8.93,z,.01);
 box(hallBack,150,.18,90,mats.wall,0,9.05,-63,.01);
 for(let x=-72;x<=72;x+=3)box(hallBack,.18,.11,88,mats.wall,x,9.18,-63,.005);
 for(const x of [-48,-18,18,48])for(const z of [-30,-51,-72]){
  box(hallBack,13,.18,3.3,mats.steel,x,9.23,z,.03);
  box(hallBack,12.6,.06,2.9,clerestory,x,9.35,z,.01);
 }
 box(hallWest,.25,7.8,43,cladding,-30,3.9,3,.015);
 for(const z of [-15,-3,9,21]){
  box(hallWest,.40,8.4,.40,mats.edge,-29.7,4.2,z,.02);
  box(hallWest,.8,.16,.8,mats.steel,-29.7,.08,z,.02);
 }
 // Pallet racking and dispatch buffer give the surrounding floor a purpose.
 const rackBlue=new Material('#2f6f9a',.5,.3);
 for(const x of [-24,24])for(const z of [-9,-2,5]){
  const storage=group(hall,'Material buffer rack',x,0,z);
  for(const xx of [-1.8,1.8])for(const zz of [-1.1,1.1])box(storage,.095,3.65,.095,rackBlue,xx,1.825,zz,.01);
  for(const y of [.18,1.35,2.52]){
   box(storage,3.7,.13,2.32,mats.orange,0,y,0,.015);
   for(const xx of [-.95,.95]){
    box(storage,1.55,.12,1.95,mats.pallet,xx,y+.14,0,.015);
    box(storage,1.4,.73,1.65,mats.muted,xx,y+.57,0,.045);
    box(storage,.6,.22,.012,mats.white,xx,y+.57,.833,.003);
   }
  }
 }
 for(let x=-10;x<=12;x+=5.5){
  for(const dx of [-2,2])box(hall,.065,.013,4.3,mats.yellow,x+dx,.006,21,0);
  box(hall,4,.013,.065,mats.yellow,x,.006,23.15,0);
  box(hall,2.5,.16,2,mats.pallet,x,.08,21,.035);
  for(const dx of [-.62,.62])for(const dz of [-.47,.47])box(hall,1.12,.86,.85,mats.panel,x+dx,.60,21+dz,.025);
 }
 text(hall,'物料缓存区',3.2,.62,-23,.018,11,{rotate:[0,0,0],fg:'#d8d4b0'});
 text(hall,'成品待发区',3.2,.62,0,.018,18,{rotate:[0,0,0],fg:'#d8d4b0'});
 text(hallBack,'01 号装配车间',5.2,.72,5,8.1,-18.3,{fg:'#e0e7de'});
 // Surface zones, seams, and embedded wayfinding.
 const zoneFloor=new Material('#576d76',.48,.10);zoneFloor.floor=true;box(root,25.2,.012,7.4,zoneFloor,0,.023,-.35,.08);
 for(let x of [-12.7,12.7])box(root,.045,.01,7.6,mats.yellow,x,.044,-.35,0);
 for(let z of [-4.12,3.42])box(root,25.45,.01,.045,mats.yellow,0,.045,z,0);
 const laneFloor=new Material('#304852',.47,.10);laneFloor.floor=true;box(root,27,.01,3.9,laneFloor,0,.021,7.5,.025);
 for(let z of [5.52,9.48])box(root,27,.015,.045,mats.muted,0,.030,z,0);
 for(const z of [6.65,8.35])for(let x=-10;x<=7.1;x+=1.2){box(root,.16,.006,.16,mats.white,x,.031,z,0);box(root,.11,.008,.11,mats.black,x,.033,z,0);box(root,.045,.01,.045,mats.white,x+.018,.034,z-.018,0)}
 floorText('AGV 通道  限速 1 m/s',-6.1,9.92,3.4,.30,'#d8d4b0');floorText('A 区  装配',-7.4,4.35,1.7,.34,'#d8d4b0');floorText('B 区  精装',3.4,4.35,1.7,.34,'#d8d4b0');
 for(let x of [-10,-3.5,3.5,10]){
  const arrow=[[-.45,-.16],[.05,-.16],[.05,-.34],[.52,0],[.05,.34],[.05,.16],[-.45,.16]];
  let g=G.extrude(arrow,.01);mesh(root,g,mats.muted,[x,.034,6.2],[-Math.PI/2,0,0]);
 }
 // Backwall cladding and large service glazing.
 box(northShell,30,.22,.35,mats.dark,0,.15,-10.7,.01);
 for(let x=-13.5;x<=13.5;x+=3){box(northShell,2.96,5.5,.18,mats.wall,x,2.9,-10.6,.015);for(let k=0;k<4;k++)box(northShell,.024,5.3,.033,mats.wallDark,x-1.1+k*.75,2.9,-10.49,0)}
 box(northShell,30,.28,.4,mats.dark,0,5.73,-10.57,.025);
 for(let x=-12;x<=12;x+=6){box(northShell,4.7,1.55,.08,mats.glassDark,x,3.95,-10.43,.035);for(let xx of [-2.4,0,2.4])box(northShell,.052,1.68,.08,mats.steel,x+xx,3.95,-10.37,.008);for(let yy of [3.11,4.79])box(northShell,4.86,.045,.09,mats.steel,x,yy,-10.37,0);box(northShell,4.4,.025,.035,mats.blue,x,4.69,-10.32,.008)}
 // Left cutaway wall with exposed structural I sections and utility pipes.
 box(westShell,.18,3.6,14.4,mats.wall,-14.85,1.96,-3.5,.02);
 for(let z of [-10.3,-4,3.9]){for(let xx of [-.14,.14])box(root,.12,6.4,.38,mats.dark,-14.2+xx,3.2,z,.02);box(root,.26,6.4,.1,mats.edge,-14.2,3.2,z,.01);box(root,.74,.08,.7,mats.steel,-14.2,.07,z,.025);for(let dx of [-.23,.23])for(let dz of [-.2,.2])bolt(root,-14.2+dx,.12,z+dz,.055)}
 for(let z of [-10.3,-5.0]){box(root,28.8,.28,.38,mats.edge,0,6.35,z,.025);box(root,28.8,.065,.62,mats.dark,0,6.19,z,.008);for(let x=-12;x<=12;x+=4){box(root,2.8,.075,.30,mats.light,x,6.08,z,.03);box(root,3.08,.14,.45,mats.dark,x,6.25,z,.035)}}
 // Thin tie rods and industrial overhead tray.
 for(let x of [-12,-6,0,6,12])box(root,.045,.055,5.3,mats.steel,x,6.34,-7.65,.01);
 for(let yy of [1.0,1.25,1.5]){tube(root,[[-14.57,yy,3.0],[-14.57,yy,-8.6],[-14.2,yy,-9.2],[-12.5,yy,-9.2]],.055,yy===1.5?mats.teal:mats.steel)}
 tube(root,[[-13.7,5.25,-10.22],[-12,5.25,-10.22],[-3,5.25,-10.22],[8,5.25,-10.22],[12.4,5.25,-10.22],[12.8,4.9,-10.22],[12.8,.5,-10.22]],.085,mats.steel);
 for(let x=-12;x<13;x+=2)box(root,.14,.28,.07,mats.dark,x,5.25,-10.23,.01);
 text(northShell,'安全第一  预防为主',4.2,.40,1.3,5.15,-10.43,{fg:'#e6d9a8'});
 // rear utility cabinets with handles, seams, hinges, vents and emergency stop.
 function cabinet(x,z,number){let g=group(root,'Utility '+number,x,0,z);box(g,1.48,.19,.94,mats.dark,0,.16,0,.03);box(g,1.45,2.8,.86,mats.panel,0,1.63,0,.055);box(g,.032,2.5,.026,mats.dark,0,1.63,.445,.005);for(let xx of [-.60,.60]){for(let yy of [.55,2.5])box(g,.05,.11,.02,mats.steel,xx,yy,.452,.009);box(g,.043,.27,.045,mats.dark,xx*.18,1.52,.476,.012)}vents(g,-.35,.66,.448,.52,.45);vents(g,.35,.66,.448,.52,.45);text(g,'AP-'+number,.5,.12,0,2.74,.449,{fg:'#2d464e'});warning(g,.42,2.74,.452);box(g,.1,.1,.025,mats.green,-.5,2.5,.455,.02)}
 cabinet(-11.7,-8.8,'01');cabinet(-9.95,-8.8,'02');cabinet(10.6,-8.8,'03');cabinet(12.35,-8.8,'04');
 const devices=[],animations=[];
 function device(id,code,name,type,x,z,state='running'){let node=group(root,code,x,0,z);node.id=id;let d={id,code,name,type,node,anchor:[x,3,z],focus:[x,1.6,z],state,online:true,temperature:42+id*1.8,power:.8+id*.4,output:180+id*17,cycle:6.2+(id%3)*.8,history:[],setLamps:()=>{}};devices.push(d);return d}
 // Central twin-rail conveyor with machined side frames and modular slat surface.
 let conv=device(1,'CV-01','柔性输送线','CONVEYOR',0,.15);conv.anchor=[-8.9,1.85,.15];conv.focus=[-5,1,.15];conv.power=3.6;
 let cg=conv.node;box(cg,23.4,.34,1.36,mats.dark,0,1.15,0,.14);
 for(let zz of [-.72,.72]){box(cg,23.6,.28,.16,mats.silver,0,1.16,zz,.045);box(cg,23.4,.05,.028,mats.teal,0,1.31,zz+(zz<0?-.09:.09),.008);for(let x=-10.8;x<=11;x+=2.7){box(cg,.13,.91,.13,mats.steel,x,.555,zz,.018);box(cg,.36,.07,.40,mats.dark,x,.065,zz,.025);bolt(cg,x,1.2,zz+(zz<0?-.092:.092),.05,'z')}}
 for(let x=-11.3;x<=11.3;x+=.27){box(cg,.23,.055,1.20,mats.rubber,x,1.348,0,.02);if(Math.round(x*100)%3===0)box(cg,.012,.01,1.15,mats.edge,x,1.381,0,0)}
 for(let x of [-11.6,11.6])cyl(cg,.22,.22,1.34,mats.steel,x,1.13,0,[Math.PI/2,0,0]);
 for(let x of [-10.8,-2.8,6.5,10.9]){cyl(cg,.22,.22,.45,mats.edge,x,.9,-1.06,[Math.PI/2,0,0]);cyl(cg,.26,.26,.07,mats.dark,x,.9,-1.29,[Math.PI/2,0,0]);for(let i=0;i<8;i++)box(cg,.028,.055,.36,mats.steel,x+Math.cos(i*TAU/8)*.21,.9+Math.sin(i*TAU/8)*.21,-1.07,.006);box(cg,.24,.18,.22,mats.dark,x,.88,-1.48,.035)}
 function moduleProduct(parent){
  let g=group(parent,'Machined battery cassette');box(g,1.26,.11,.98,mats.pallet,0,0,0,.04);
  for(const x of [-.55,.55])for(const z of [-.39,.39]){cyl(g,.04,.05,.07,mats.dark,x,.065,z);bolt(g,x,.105,z,.028)}
  box(g,.91,.24,.75,mats.silver,0,.18,0,.055);box(g,.92,.025,.75,mats.dark,0,.304,0,.025);
  box(g,.89,.065,.72,mats.steel,0,.347,0,.045);
  for(let i=0;i<6;i++){box(g,.058,.04,.60,mats.silver,-.32+i*.128,.396,0,.018);box(g,.035,.014,.57,mats.dark,-.285+i*.128,.382,0,.006)}
  for(let xx of [-.38,.38])for(let zz of [-.30,.30])bolt(g,xx,.395,zz,.028);
  for(let z of [-.21,.21]){box(g,.095,.075,.14,mats.black,.49,.21,z,.022);cyl(g,.034,.034,.055,z<0?mats.orange:mats.teal,.557,.21,z,[0,0,Math.PI/2],16)}
  box(g,.37,.08,.018,mats.dark,0,.19,.39,.01);text(g,'LFP  /  48V',.30,.06,0,.19,.405,{fg:'#9fb8c0'});
  return g;
 }
 for(let i=0;i<9;i++){let p=moduleProduct(cg);p.dynamic=true;p.position=[-10.7+i*2.6,1.43,0];animations.push({type:'product',node:p,offset:i/9,device:conv})}
 conv.setLamps=statusTower(cg,-11.0,1.36,.95);
 // Articulated robots, formed casing, axis covers, cast ribs, exposed fasteners, dress packs.
 function robot(id,code,x,z,phase){
  let d=device(id,code,id===2?'上料协作机器人':'精密装配机器人','PRECISION / 6-AXIS',x,z);
  d.anchor=[x,3.35,z];d.focus=[x,1.90,z-.25];d.power=4.2;const g=d.node;
  hazard(g,0,0,2.7,2.1);box(g,1.64,.20,1.57,mats.dark,0,.145,0,.06);
  for(let xx of [-.63,.63])for(let zz of [-.60,.60]){cyl(g,.12,.12,.027,mats.steel,xx,.26,zz);bolt(g,xx,.286,zz,.072)}
  cyl(g,.62,.68,.33,mats.orange,0,.41,0,[0,0,0],56);cyl(g,.62,.62,.10,mats.dark,0,.62,0,[0,0,0],56);
  torus(g,.615,.025,mats.steel,0,.68,0);cyl(g,.54,.61,.20,mats.orange,0,.76,0,[0,0,0],56);boltRing(g,0,.87,0,.46,10,'y',.032);
  const base=group(g,'J1 pedestal yaw',0,.85,0,0,true);
  casting(base,[[-.53,-.04],[.50,-.04],[.50,.35],[.32,.62],[-.30,.62],[-.55,.31]],.88,mats.orange,0,0,0,.07);
  box(base,.49,.31,.51,mats.orangeDark,-.19,.2,-.47,.10);vents(base,-.2,.20,-.74,.30,.20);
  cyl(base,.32,.32,1.08,mats.dark,0,.49,0,[Math.PI/2,0,0],48);
  for(const zz of [-.58,.58]){
   cyl(base,.34,.34,.085,mats.orange,0,.49,zz,[Math.PI/2,0,0],48);
   cyl(base,.263,.263,.075,mats.steel,0,.49,zz+Math.sign(zz)*.07,[Math.PI/2,0,0],48);
   cyl(base,.191,.191,.088,mats.dark,0,.49,zz+Math.sign(zz)*.10,[Math.PI/2,0,0],48);
   cyl(base,.123,.123,.097,mats.silver,0,.49,zz+Math.sign(zz)*.13,[Math.PI/2,0,0],40);
   boltRing(base,0,.49,zz+Math.sign(zz)*.13,.218,8,'z',.026);
  }
  const shoulder=group(base,'J2 rounded cast upper arm',0,.49,0,0,true);
  casting(shoulder,[[-.31,-.05],[.29,-.05],[.38,.32],[.30,.64],[.20,1.55],[.27,1.81],[.15,2.04],[-.13,2.04],[-.29,1.81],[-.33,.62],[-.42,.23]],.63,mats.orange,0,0,0,.064);
  for(const side of [-1,1]){
   casting(shoulder,[[-.19,.37],[.12,.37],[.14,.60],[.11,1.55],[-.11,1.66],[-.23,.65]],.026,mats.orangeDark,0,0,side*.325,.008);
   box(shoulder,.09,.94,.03,mats.orange,-.04,1.00,side*.345,.038);
   for(const yy of [.47,1.49])bolt(shoulder,-.07,yy,side*.356,.026,'z');
  }
    // Continuous anchored dress pack along the outer flank, clear of the casting.
  tube(shoulder,[[-.39,.07,-.30],[-.52,.32,-.35],[-.52,.62,-.40],[-.46,1.2,-.40],[-.41,1.62,-.36],[-.29,1.90,-.34]],.065,mats.rubber);
  for(let yy=.37;yy<1.62;yy+=.105){let xx=-.53+(yy-.37)*.10;torus(shoulder,.067,.010,mats.edge,xx,yy,-.40)}
  for(let yy of [.45,1.4])box(shoulder,.16,.09,.27,mats.dark,-.40,yy,-.31,.02);
  // Flanged elbow gearbox and separate cooling fins.
  cyl(shoulder,.30,.30,.91,mats.dark,0,1.92,0,[Math.PI/2,0,0],48);
  for(const zz of [-.48,.48]){
   cyl(shoulder,.29,.29,.09,mats.orange,0,1.92,zz,[Math.PI/2,0,0],48);
   torus(shoulder,.245,.016,mats.silver,0,1.92,zz+Math.sign(zz)*.07,[Math.PI/2,0,0]);
   cyl(shoulder,.21,.21,.09,mats.steel,0,1.92,zz+Math.sign(zz)*.08,[Math.PI/2,0,0],48);
   cyl(shoulder,.12,.12,.10,mats.dark,0,1.92,zz+Math.sign(zz)*.12,[Math.PI/2,0,0]);boltRing(shoulder,0,1.92,zz+Math.sign(zz)*.13,.174,8,'z',.024);
  }
  const elbow=group(shoulder,'J3 tapered forearm',0,1.92,0,0,true);
  casting(elbow,[[-.22,-.06],[.23,-.06],[.29,.24],[.24,.53],[.15,1.45],[.12,1.63],[-.12,1.63],[-.20,1.45],[-.28,.48]],.48,mats.orange,0,0,0,.053);
  casting(elbow,[[-.13,.29],[.14,.29],[.115,1.26],[-.08,1.38]],.031,mats.orangeDark,0,0,.25,.01);
  box(elbow,.11,.72,.035,mats.orange,.02,.82,.277,.04);
  tube(elbow,[[-.25,.02,-.23],[-.39,.22,-.30],[-.34,.77,-.32],[-.24,1.25,-.28],[-.15,1.52,-.24]],.045,mats.black);
  for(const yy of [.32,.48,.64,.8,.96])box(elbow,.08,.06,.09,mats.edge,-.345+(yy-.32)*.10,yy,-.32,.012);
  const wrist=group(elbow,'J4/J5 levelled wrist',0,1.62,0,0,true);
  cyl(wrist,.19,.21,.20,mats.dark,0,.07,0,[0,0,0],48);torus(wrist,.19,.015,mats.steel,0,.10,0);
  cyl(wrist,.165,.165,.15,mats.silver,0,.22,0,[0,0,0],40);boltRing(wrist,0,.306,0,.128,8,'y',.022);
  const tool=group(wrist,'J6 pneumatic parallel gripper',0,.30,0,0,true);
  box(tool,.53,.14,.28,mats.dark,0,.035,0,.038);box(tool,.44,.07,.25,mats.steel,0,.137,0,.025);
  for(const xx of [-.13,.13])cyl(tool,.028,.028,.42,mats.silver,0,.11,xx,[0,0,Math.PI/2],16);
  const fingers=[];
  for(const xx of [-.205,.205]){let finger=group(tool,'Gripper jaw',xx,.19,0,0,true);box(finger,.067,.29,.20,mats.silver,0,.09,0,.017);box(finger,.13,.065,.20,mats.dark,xx<0?.032:-.032,.245,0,.012);bolt(finger,0,.06,.115,.027,'z');fingers.push(finger)}
  box(tool,.12,.13,.10,mats.dark,.31,.03,0,.02);box(tool,.03,.025,.06,mats.blue,.378,.05,0,.005);
  tube(tool,[[.20,-.11,-.04],[.28,-.10,-.18],[.31,.04,-.17],[.25,.08,-.12]],.015,mats.blue);
  let control=group(g,'Angled local operator pendant',1.35,0,-.16,-.15);foot(control,0,0);box(control,.10,1.03,.12,mats.steel,0,.68,0,.016);screen(control,.59,.39,0,1.36,0,'CELL '+code);
  box(control,.83,.13,.24,mats.panel,0,1.05,.02,.025);cyl(control,.071,.071,.055,mats.red,.30,1.135,.075);cyl(control,.06,.06,.015,mats.yellow,.30,1.10,.075);
  text(g,code,.49,.12,0,.42,.655,{fg:'#2c3335'});warning(g,-.34,.42,.65);d.setLamps=statusTower(g,1.14,1.49,-.13);
  // Grounded junction box, pneumatic fittings, and flexible protective conduit.
  box(g,.49,.39,.25,mats.dark,-.82,.32,-.28,.04);for(let zz of [-.35,-.19])cyl(g,.05,.05,.10,mats.steel,-1.08,.34,zz,[0,0,Math.PI/2],16);
  tube(g,[[-1.05,.24,-.26],[-1.27,.12,-.48],[-1.35,.08,-.8],[-1.35,.08,-1.08],[-1.1,.09,-1.18]],.044,mats.black);
  animations.push({type:'robot',base,shoulder,elbow,wrist,tool,fingers,phase,device:d});return d;
 }
 const rb1=robot(2,'RB-01',-5.2,2.25,0),rb2=robot(3,'RB-02',4.0,2.25,1.7);
 rail(root,-7.35,1.9,-7.35,3.7);rail(root,-7.35,3.7,-3.1,3.7);rail(root,1.9,3.7,6.25,3.7);rail(root,6.25,3.7,6.25,1.9);
 // Machine housings: CNC cell with recessed glazing and visible spindle interior.
 let cnc=device(4,'CNC-01','精密加工中心','MACHINING CENTER',-3.6,-5.7);cnc.anchor=[-3.6,3.42,-5.7];cnc.focus=[-3.6,1.7,-5.7];cnc.power=11.8;
 let ng=cnc.node;box(ng,4.6,.28,2.9,mats.dark,0,.2,0,.1);box(ng,4.45,.52,2.78,mats.panel,0,.6,0,.09);box(ng,4.45,.36,2.78,mats.white,0,3.2,0,.1);box(ng,.63,2.3,2.7,mats.panel,-1.89,1.91,0,.08);box(ng,.88,2.3,2.7,mats.panel,1.76,1.91,0,.08);box(ng,3.9,2.7,.18,mats.dark,-.04,1.89,-1.27,.04);

 box(ng,3.18,2.20,.15,mats.wallDark,-.18,1.90,-1.14,.03);
 for(const xx of [-1.33,1.05]){
  box(ng,.24,1.98,.29,mats.steel,xx,1.88,-.77,.025);box(ng,.065,1.76,.042,mats.silver,xx,1.88,-.602,.018);
  for(let yy=1.13;yy<2.8;yy+=.28)bolt(ng,xx,yy,-.57,.023,'z');
 }
 box(ng,2.54,.28,.57,mats.steel,-.15,2.51,-.72,.04);box(ng,2.27,.055,.055,mats.dark,-.15,2.63,-.40,.015);
 box(ng,2.7,.12,2.04,mats.steel,-.27,.97,0,.02);
 for(let i=0;i<9;i++)box(ng,.031,.025,1.82,mats.dark,-1.38+i*.278,1.038,.10,.003);
 box(ng,1.13,.22,.91,mats.dark,-.18,1.15,.10,.035);box(ng,.62,.22,.80,mats.silver,-.15,1.33,.12,.035);
 for(const xx of [-.55,.27]){box(ng,.18,.25,.85,mats.steel,xx,1.39,.12,.025);for(const zz of [-.16,.39])bolt(ng,xx,1.525,zz,.035)}
 box(ng,.44,.21,.50,mats.orange,-.15,1.47,.1,.035);
 box(ng,.59,.51,.52,mats.orange,-.15,2.45,-.16,.07);box(ng,.43,.54,.05,mats.orangeDark,-.15,2.45,.126,.033);
 for(let i=0;i<5;i++)box(ng,.34,.025,.05,mats.dark,-.15,2.28+i*.078,.155,.009);
 cyl(ng,.24,.24,.30,mats.silver,-.15,2.06,-.03,[0,0,0],48);torus(ng,.22,.020,mats.dark,-.15,1.95,-.03);
 cyl(ng,.075,.13,.22,mats.steel,-.15,1.83,-.03,[0,0,0],32);cyl(ng,.027,.044,.14,mats.silver,-.15,1.65,-.03,[0,0,0],24);
 for(const xx of [-.56,.24]){tube(ng,[[xx,2.34,-.06],[xx,2.10,.06],[xx*.6,1.82,.18]],.028,mats.blue);cyl(ng,.049,.037,.077,mats.orange,xx*.6,1.78,.18,[0,0,0],16)}
 box(ng,2.65,.045,.08,mats.light,-.20,2.97,.89,.015);
 for(const xx of [-1.9,1.8])for(const zz of [-1.03,1.04])foot(ng,xx,zz);
 for(let xx of [-1.10,.51]){box(ng,1.48,1.9,.045,mats.glass,xx,2.02,1.42,.02);for(let dx of [-.75,.75])box(ng,.065,1.98,.1,mats.steel,xx+dx,2.02,1.43,.01);box(ng,1.56,.065,.1,mats.steel,xx,1.02,1.43,.01);box(ng,1.56,.065,.1,mats.steel,xx,3.02,1.43,.01)}
 for(let xx of [-.48,-.18])box(ng,.06,.64,.12,mats.dark,xx,1.87,1.51,.025);
 box(ng,4.36,.065,.055,mats.teal,0,3.29,1.43,.015);screen(ng,.48,.40,1.75,2.46,1.40,'CNC / 01');cyl(ng,.085,.085,.04,mats.red,1.94,1.92,1.5,[Math.PI/2,0,0]);vents(ng,1.74,1.24,1.42,.52,.5);
 text(ng,'CNC-01',.7,.16,-.72,3.22,1.423,{fg:'#273d45'});cnc.setLamps=statusTower(ng,1.79,3.40,-.9);

 // CNC sheet-metal service seams, slide tracks, panel screws and cable gland block.
 for(const zz of [-1.09,.89])for(const xx of [-2.236,2.236])box(ng,.014,2.21,.024,mats.dark,xx,1.85,zz,.004);
 for(const yy of [.9,3.01])box(ng,3.34,.038,.10,mats.dark,-.21,yy,1.48,.01);
 for(const xx of [-2.04,1.54,2.00])for(const yy of [.94,2.88])bolt(ng,xx,yy,1.45,.029,'z');
 for(const yy of [1.2,2.7])box(ng,.13,.18,.07,mats.steel,-1.84,yy,1.47,.02);
 warning(ng,1.73,1.90,1.46);text(ng,'VMC-850',.58,.105,1.72,.65,1.411,{fg:'#586b71'});
 // Side-mounted closed cooling unit, protected within the machinery service zone.
 box(ng,.55,1.38,1.11,mats.panel,-2.51,1.22,-.24,.075);
 for(let yy of [.91,1.43])coolingFan(ng,-2.51,yy,.335,.20);
 tube(ng,[[-2.53,1.88,-.4],[-2.53,2.30,-.59],[-2.20,2.45,-.68]],.056,mats.black);
 // Input magazine / feeder.
 let feeder=group(root,'Feed magazine',-9.25,0,-4.9);
 box(feeder,2.55,.26,2.2,mats.dark,0,.2,0,.07);box(feeder,2.42,1.66,2.08,mats.panel,0,1.15,0,.08);box(feeder,2.47,.12,2.12,mats.steel,0,2.04,0,.025);for(let x of [-.84,0,.84]){box(feeder,.68,.75,1.6,mats.dark,x,2.48,0,.04);for(let y=2.17;y<2.83;y+=.16)box(feeder,.59,.10,1.37,mats.steel,x,y,0,.022)}screen(feeder,.53,.33,-.52,1.56,1.07,'FEED');vents(feeder,.48,.8,1.05,.65,.43);text(feeder,'上料仓',.62,.15,0,1.86,1.046,{fg:'#324951'});
 // Vision tunnel surrounding the moving conveyor.
 let qc=device(5,'QC-01','在线视觉检测','VISION INSPECTION',7.6,.15);qc.anchor=[7.6,3.1,.15];qc.focus=[7.6,1.8,.15];qc.power=1.25;
 let qg=qc.node;for(let zz of [-1.02,1.02]){box(qg,.64,2.63,.26,mats.panel,0,1.40,zz,.07);box(qg,1.10,.10,.55,mats.dark,0,.08,zz,.025);for(const xx of [-.38,.38])bolt(qg,xx,.15,zz,.047)}box(qg,.91,.48,2.4,mats.white,0,2.81,0,.12);box(qg,.1,.75,.12,mats.dark,0,2.19,0,.035);cyl(qg,.17,.17,.26,mats.dark,0,2.29,0);cyl(qg,.108,.108,.04,mats.blue,0,2.13,0);torus(qg,.128,.019,mats.silver,0,2.11,0);for(let xx of [-.27,.27])box(qg,.06,.04,1.8,mats.light,xx,2.54,0,.017);
 for(let zz of [-.87,.87])box(qg,.032,1.5,.032,mats.blue,0,1.88,zz,.008);box(qg,.036,.016,1.65,mats.blue,0,1.435,0,.007);
  for(const zz of [-1.02,1.02]){box(qg,.036,2.2,.035,mats.dark,-.22,1.4,zz+.15,.008);for(const yy of [.42,2.25])bolt(qg,0,yy,zz+Math.sign(zz)*.148,.032,'z')}
 text(qg,'QC-01',.5,.14,0,2.79,1.227,{fg:'#263d48'});qc.setLamps=statusTower(qg,.14,3.08,-.83);
 // End-of-line packaging, segmented roll-up safety door and pallet staging.
 let pack=device(6,'PK-01','自动封装单元','PACKAGING CELL',8.0,-5.45);pack.anchor=[8,3.35,-5.45];pack.focus=[8,1.8,-5.45];pack.power=6.2;
 let pg=pack.node;box(pg,4.1,.24,2.72,mats.dark,0,.21,0,.07);box(pg,3.99,.62,2.62,mats.panel,0,.61,0,.06);for(let xx of [-1.67,1.67])box(pg,.59,2.31,2.57,mats.panel,xx,1.99,0,.07);box(pg,3.99,.40,2.62,mats.white,0,3.07,0,.07);
 box(pg,2.53,2.04,.065,mats.glassDark,0,1.9,-1.27,.03);box(pg,2.37,.17,2.13,mats.steel,0,1.12,0,.025);for(let xx of [-.9,.9]){box(pg,.095,1.6,.095,mats.steel,xx,2.02,.22,.015)}box(pg,2.00,.30,.81,mats.orange,0,2.60,.20,.05);box(pg,.85,.34,.78,mats.pallet,0,1.39,.2,.02);
 for(let xx of [-1.31,1.31])box(pg,.06,2.04,.07,mats.steel,xx,1.92,1.35,.01);for(let yy of [1.02,2.94])box(pg,2.69,.065,.07,mats.steel,0,yy,1.35,.01);box(pg,2.60,1.8,.016,mats.glass,0,2.00,1.35,.005);box(pg,3.91,.055,.045,mats.teal,0,3.12,1.35,.01);screen(pg,.48,.38,1.64,2.45,1.34,'PACK / 01');vents(pg,1.62,1.36,1.322,.40,.45);text(pg,'PK-01',.62,.16,-.32,3.055,1.342,{fg:'#2e454c'});pack.setLamps=statusTower(pg,1.56,3.31,-.9);

 for(const xx of [-1.55,1.55])for(const zz of [-1.04,1.02])foot(pg,xx,zz);
 for(let xx=-1.04;xx<1.1;xx+=.22){cyl(pg,.085,.085,1.70,mats.steel,xx,1.235,.08,[Math.PI/2,0,0],24);cyl(pg,.052,.052,1.76,mats.dark,xx,1.235,.08,[Math.PI/2,0,0],20)}
 for(const xx of [-.88,.88]){box(pg,.24,.24,.39,mats.dark,xx,2.45,.20,.036);cyl(pg,.055,.055,1.28,mats.silver,xx,1.91,.20);cyl(pg,.07,.095,.20,mats.steel,xx,1.49,.20);bolt(pg,xx,2.61,.20,.057)}
 box(pg,1.58,.10,.49,mats.silver,0,2.37,.20,.025);box(pg,.88,.04,.035,mats.orange,0,2.30,.455,.01);
 for(const xx of [-.85,.85])tube(pg,[[xx,2.72,-.05],[xx,2.93,-.14],[xx*.6,2.92,-.28],[xx*.5,2.74,-.29]],.027,mats.blue);
 for(const yy of [1.03,2.90])box(pg,2.79,.026,.11,mats.dark,0,yy,1.405,.01);
 box(pg,2.30,.044,.10,mats.light,0,2.91,.70,.016);
 for(const xx of [-.60,.60])box(pg,.04,.38,.09,mats.dark,xx,1.94,1.39,.019);
 for(const xx of [-1.67,1.67])for(const yy of [.98,2.83])bolt(pg,xx,yy,1.34,.03,'z');
 // Exterior film mandrels and a separate pneumatic conditioning block.
 for(const yy of [1.31,2.40]){cyl(pg,.21,.21,1.62,mats.white,-2.22,yy,0,[Math.PI/2,0,0],40);for(const zz of [-.85,.85])cyl(pg,.24,.24,.035,mats.steel,-2.22,yy,zz,[Math.PI/2,0,0],40)}
 for(const zz of [-.83,.83])box(pg,.08,1.63,.09,mats.dark,-2.22,1.72,zz,.016);
 box(pg,.50,.66,.16,mats.dark,2.05,1.48,.80,.04);for(const xx of [1.91,2.12]){cyl(pg,.06,.06,.30,mats.steel,xx,1.32,.91);cyl(pg,.08,.08,.11,mats.blue,xx,1.56,.91)}
 warning(pg,1.66,2.08,1.36);
 // Service pallet with nested payloads.
 function palletStack(x,z){let g=group(root,'Pallet staging',x,0,z);for(let zz of [-.56,0,.56])box(g,1.6,.12,.20,mats.pallet,0,.18,zz,.01);for(let xx of [-.65,0,.65])box(g,.2,.14,1.35,mats.dark,xx,.11,0,.01);for(let x2 of [-.4,.4])for(let z2 of [-.35,.35]){box(g,.67,.52,.59,mats.panel,x2,.52,z2,.055);box(g,.69,.05,.6,mats.dark,x2,.81,z2,.008);box(g,.037,.58,.01,mats.teal,x2,.53,z2+.30,.002)}}
 palletStack(12.3,3.22);palletStack(-11.0,3.32);
 // AGVs with wheel assemblies, collision bumpers, LiDAR, scanning arc and stack lights.
 function agv(id,code,x,z,state){let d=device(id,code,id===7?'自主搬运 AGV':'待命搬运 AGV','AUTONOMOUS VEHICLE',x,z,state);d.node.dynamic=true;d.anchor=[x,1.7,z];d.focus=[x,.8,z];d.power=id===7?1.8:.35;
  let g=d.node;box(g,1.95,.23,1.38,mats.dark,0,.32,0,.15);box(g,1.91,.43,1.31,mats.panel,0,.59,0,.17);box(g,1.96,.018,1.35,mats.black,0,.798,0,.08);box(g,1.86,.085,1.27,mats.white,0,.847,0,.075);box(g,1.96,.055,1.32,mats.yellow,0,.45,0,.03);
  const wheels=[];
  for(let xx of [-.58,.58])for(let zz of [-.68,.68]){
   const w=group(g,'Driven wheel with hub',xx,.231,zz,0,true);wheels.push(w);
   cyl(w,.196,.196,.125,mats.rubber,0,0,0,[Math.PI/2,0,0],40);
   for(const z of [-.044,.044])torus(w,.169,.037,mats.rubber,0,0,z,[Math.PI/2,0,0]);
   cyl(w,.12,.12,.145,mats.steel,0,0,0,[Math.PI/2,0,0],40);cyl(w,.08,.08,.151,mats.dark,0,0,0,[Math.PI/2,0,0],32);cyl(w,.046,.046,.16,mats.steel,0,0,0,[Math.PI/2,0,0],32);
   const side=Math.sign(zz);for(let i=0;i<6;i++){let a=i*TAU/6;bolt(w,Math.cos(a)*.096,Math.sin(a)*.096,side*.08,.015,'z')}
  }

  for(let xx of [-.96,.96]){box(g,.052,.12,.76,mats.dark,xx,.37,0,.045);box(g,.037,.055,.18,mats.light,xx,.57,-.42,.012);box(g,.037,.055,.18,mats.light,xx,.57,.42,.012);box(g,.065,.08,.33,mats.glassDark,xx,.62,0,.04)}
  cyl(g,.13,.15,.14,mats.dark,-.64,.94,0);cyl(g,.105,.105,.07,mats.blue,-.64,1.05,0);cyl(g,.12,.12,.04,mats.dark,-.64,1.11,0);
  let payload=moduleProduct(g);payload.position=[.12,.94,0];payload.scale=[.86,.86,.86];text(g,code,.59,.11,0,.70,.663,{fg:'#203b46'});
  let lamp=new Material(state==='idle'?'#ffc684':'#72e8c0',.2,0,1.8);box(g,.034,.08,.45,lamp,.989,.61,0,.013);d.setLamps=s=>{lamp.color=color(s==='alarm'?'#ff6542':s==='idle'?'#ffbe6e':'#72e8c0');lamp.emission=2};

  for(const xx of [-.77,.77])for(const zz of [-.48,.48]){bolt(g,xx,.9,zz,.030);torus(g,.046,.010,mats.dark,xx,.90,zz)}
  for(const zz of [-.669,.669]){box(g,.52,.045,.011,mats.dark,.03,.67,zz,.016);for(let i=0;i<7;i++)box(g,.028,.084,.015,mats.dark,.34+i*.05,.58,zz,.009)}
  // Recessed navigation scanner and double-lens headlights, all below bumper envelope.
  for(const zz of [-.41,.41]){box(g,.030,.115,.25,mats.black,.967,.56,zz,.038);box(g,.033,.035,.19,mats.light,.985,.584,zz,.011)}
  box(g,.036,.145,.33,mats.black,.979,.68,0,.045);box(g,.042,.045,.22,mats.blue,.998,.67,0,.013);
  cyl(g,.055,.055,.052,mats.red,.63,.92,-.43,[0,0,0],24);cyl(g,.076,.076,.02,mats.yellow,.63,.895,-.43,[0,0,0],24);
  animations.push({type:'agv',node:g,wheels,device:d});return d
 }
 const agv1=agv(7,'AGV-01',-8.3,7.5,'running'),agv2=agv(8,'AGV-02',10.5,8,'idle');
 // Charger's docking bay is explicitly marked and has recessed contact pads.
 let dock=group(root,'Low-profile contact charging station',11.98,0,8.12);
 box(dock,.77,.07,1.42,mats.dark,0,.062,0,.043);box(dock,.49,.98,1.19,mats.dark,0,.585,0,.095);
 for(const xx of [-.251,.251])box(dock,.018,.67,.96,mats.panel,xx,.62,0,.03);
 for(const zz of [-.35,.35]){box(dock,.095,.14,.23,mats.black,-.29,.46,zz,.026);box(dock,.107,.09,.17,mats.orange,-.347,.46,zz,.021)}
 box(dock,.026,.033,.84,mats.green,-.265,.98,0,.01);box(dock,.18,.06,.41,mats.glassDark,0,1.10,0,.032);
 for(const zz of [-.53,.53])for(const xx of [-.28,.28])bolt(dock,xx,.12,zz,.031);
 tube(dock,[[.25,.19,-.39],[.47,.12,-.46],[.51,.062,-.65],[.35,.06,-.96],[-.1,.06,-1.08]],.026,mats.rubber);
 text(dock,'DC / 48V',.50,.084,-.266,.75,0,{fg:'#263e48',rotate:[Math.PI/2,0,Math.PI/2]});
 floorText('充电位',11.6,9.95,.9,.28,'#d8d4b0');


 // Under-belt extrusion channels, bearings, photoeyes, wiring trunks and adjustable braces.
 for(const zz of [-.83,.83]){
  for(const yy of [1.08,1.19])box(cg,23.20,.018,.015,mats.dark,0,yy,zz,.003);
  for(let xx=-10.8;xx<=11;xx+=2.7){box(cg,.07,.10,1.32,mats.steel,xx,.91,0,.012);link(cg,[xx-.38,1.005,Math.sign(zz)*.72],[xx,.53,Math.sign(zz)*.72],.036,mats.dark)}
 }
 for(let xx of [-9.1,-4.1,.6,5.9,10.5]){
  for(const zz of [-.82,.82]){box(cg,.16,.20,.19,mats.dark,xx,1.40,zz,.025);cyl(cg,.038,.038,.024,mats.blue,xx,1.42,zz-Math.sign(zz)*.106,[Math.PI/2,0,0],20);box(cg,.21,.06,.20,mats.steel,xx,1.31,zz,.011)}
  tube(cg,[[xx,1.24,-.84],[xx,.73,-.88],[xx+.25,.67,-.9],[xx+.65,.67,-.9]],.021,mats.black);
 }
 for(const x of [-11.6,11.6])for(const z of [-.81,.81]){cyl(cg,.12,.12,.085,mats.dark,x,1.13,z,[Math.PI/2,0,0],32);boltRing(cg,x,1.13,z+Math.sign(z)*.05,.08,6,'z',.018)}
 box(cg,22.5,.12,.18,mats.dark,0,.70,-.95,.026);for(let xx=-10;xx<11;xx+=.8)box(cg,.33,.025,.016,mats.steel,xx,.73,-1.047,.006);
 // Free-standing metrology/service cell with a granite table, probes and work light.
 const met=group(root,'Metrology & process service',2.26,0,-6.23);
 for(const xx of [-1.14,1.14])for(const zz of [-.64,.64]){foot(met,xx,zz);box(met,.12,.96,.12,mats.steel,xx,.63,zz,.015)}
 box(met,2.64,.13,1.68,mats.dark,0,1.20,0,.04);box(met,2.47,.035,1.52,mats.steel,0,1.287,0,.02);
 for(const xx of [-1.02,1.02])box(met,.11,1.72,.13,mats.panel,xx,2.08,-.58,.025);
 box(met,2.19,.22,.26,mats.panel,0,2.90,-.58,.04);box(met,1.94,.045,.032,mats.teal,0,2.925,-.43,.015);
 box(met,.28,.33,.32,mats.dark,.12,2.67,-.47,.04);cyl(met,.043,.043,.72,mats.steel,.12,2.22,-.40,[0,0,0],20);cyl(met,.017,.023,.16,mats.orange,.12,1.80,-.40,[0,0,0],16);
 let tray=moduleProduct(met);tray.position=[-.23,1.36,.18];tray.scale=[.86,.86,.86];screen(met,.52,.33,1.03,1.65,.72,'METROLOGY');
 text(met,'检测台',.46,.13,-.28,2.91,-.438,{fg:'#304b58'});
 for(const zz of [-.57,.57])box(met,2.2,.055,.055,mats.dark,0,.37,zz,.012);
 // Routed overhead service tray: separate rails, ladder rungs and retained cable bundles.
 const service=group(root,'Overhead utility systems');
 for(const zz of [-8.58,-8.08]){box(service,26.5,.19,.052,mats.steel,0,5.51,zz,.009);box(service,26.5,.028,.09,mats.dark,0,5.42,zz,.005)}
 for(let xx=-13;xx<13.2;xx+=.38)box(service,.055,.035,.51,mats.steel,xx,5.435,-8.33,.008);
 for(let i=0;i<4;i++)tube(service,[[-13.1,5.46,-8.5+i*.106],[-6,5.46,-8.5+i*.106],[5,5.46,-8.5+i*.106],[13,5.46,-8.5+i*.106]],.028,i===1?mats.teal:mats.rubber);
 for(const xx of [-12,-6,0,6,12]){link(service,[xx,5.61,-8.33],[xx,6.36,-8.33],.016,mats.steel);box(service,.74,.04,.085,mats.dark,xx,5.40,-8.33,.008)}
 // Main stainless extraction duct, flanges and downturned outlets.
 tube(service,[[-13.9,4.95,-9.66],[-13.2,4.95,-9.66],[-7,4.95,-9.66],[0,4.95,-9.66],[7,4.95,-9.66],[13.4,4.95,-9.66]],.23,mats.steel);
 for(let xx=-13;xx<14;xx+=2.25){flange(service,xx,4.95,-9.66,.275,'x');box(service,.055,.67,.085,mats.dark,xx,5.46,-9.66,.01);bolt(service,xx,5.77,-9.59,.033,'z')}
 for(const xx of [-8.2,4.15,12.5]){
  tube(service,[[xx,4.95,-9.66],[xx,4.95,-9.18],[xx,4.85,-8.92],[xx,4.56,-8.79],[xx,3.34,-8.79]],.135,mats.steel);
  flange(service,xx,3.58,-8.79,.178,'y');cyl(service,.18,.18,.31,mats.dark,xx,3.25,-8.79);
 }
 // Structural splice plates, braces and rivets. Steel is no longer inadvertently alarm-highlighted.
 for(const xx of [-12,-6,0,6,12])for(const zz of [-10.3,-5]){
  box(root,.50,.39,.052,mats.steel,xx,6.33,zz+.24,.015);for(const dx of [-.16,.16])for(const dy of [-.115,.115])bolt(root,xx+dx,6.33+dy,zz+.277,.032,'z');
  link(root,[xx-1.15,6.31,zz],[xx,5.66,zz],.035,mats.edge);link(root,[xx,5.66,zz],[xx+1.15,6.31,zz],.035,mats.edge);
 }
 for(const z of [-10.3,-5.0]){
  for(const xx of [-.14,.14])box(root,.12,6.35,.36,mats.dark,14.3+xx,3.21,z,.015);
  box(root,.26,6.35,.09,mats.edge,14.3,3.21,z,.014);box(root,.72,.08,.66,mats.steel,14.3,.06,z,.015);
  for(const dx of [-.24,.24])for(const dz of [-.2,.2])bolt(root,14.3+dx,.13,z+dz,.05);
 }
 // Facade ventilation louvres and a labelled utility station, tucked into service aisle.
 for(const xx of [-12,-6,0,6,12]){
  box(northShell,1.22,.62,.09,mats.dark,xx,1.86,-10.44,.02);
  for(let yy=1.63;yy<2.13;yy+=.075)box(northShell,1.08,.028,.095,mats.steel,xx,yy,-10.37,.004,[.25,0,0]);
 }
 const fire=group(root,'Safety / fire point',-13.30,0,-6.5);
 box(fire,.16,1.48,.15,mats.dark,0,.76,0,.024);cyl(fire,.13,.13,.53,mats.orangeDark,0,.56,.17,[0,0,0],32);cyl(fire,.07,.13,.16,mats.red,0,.91,.17);box(fire,.25,.055,.11,mats.dark,.055,1.03,.17,.025);
 tube(fire,[[.06,1.0,.17],[.21,.91,.18],[.24,.58,.18],[.15,.36,.18]],.017,mats.black);text(fire,'灭火器',.40,.15,0,1.43,.12,{fg:'#ffffff',bg:'#b8322a'});
 // Perforated service racks and tote storage; every shelf has four grounded legs.
 const rack=group(root,'Incoming material racks',-12.72,0,-1.92);
 for(const xx of [-.57,.57])for(const zz of [-.66,.66]){box(rack,.055,2.71,.055,mats.steel,xx,1.39,zz,.009);box(rack,.17,.07,.17,mats.dark,xx,.055,zz,.012)}
 for(const yy of [.27,1.16,2.05]){
  box(rack,1.28,.075,1.48,mats.steel,0,yy,0,.02);
  for(const xx of [-.29,.29]){box(rack,.49,.47,1.14,mats.pallet,xx,yy+.28,0,.043);box(rack,.44,.025,1.07,mats.dark,xx,yy+.53,0,.012);box(rack,.25,.10,.028,mats.dark,xx,yy+.33,.588,.019)}
 }
 text(rack,'来料',.5,.18,0,2.60,.73,{fg:'#c8dad7'});
 // Column feet: non-shrink grout under the base plate and yellow/black impact guards along traffic routes.
 function columnGuard(p,x,z,w=.52,d=.52){for(let i=0;i<5;i++)box(p,w,.2,d,i%2?mats.black:mats.yellow,x,.1+i*.2,z,.01)}
 for(const z of [-10.3,-4,3.9])box(root,.92,.035,.88,mats.concrete,-14.2,.0175,z,0);
 for(const z of [-10.3,-5.0])box(root,.9,.035,.84,mats.concrete,14.3,.0175,z,0);
 columnGuard(root,-14.2,3.9,.56,.58);columnGuard(root,14.3,-5.0,.52,.56);
 // Equipment foundations: cast concrete pads with a painted edge, fixed by anchor bolts.
 function foundation(x,z,w,d){box(root,w,.05,d,mats.concrete,x,.025,z,.01);for(const s of [-1,1]){box(root,w,.052,.05,mats.yellow,x,.026,z+s*(d/2-.025),0);box(root,.05,.052,d,mats.yellow,x+s*(w/2-.025),.026,z,0)}}
 foundation(-3.6,-5.7,5.1,3.4);foundation(8.0,-5.45,4.6,3.2);foundation(-9.25,-4.9,2.9,2.5);
 for(const x of [-5.2,4.0]){box(root,1.9,.045,1.85,mats.concrete,x,.0225,2.25,.01);for(const dx of [-.8,.8])for(const dz of [-.78,.78]){bolt(root,x+dx,.06,2.25+dz,.03);cyl(root,.012,.012,.07,mats.steel,x+dx,.08,2.25+dz,[0,0,0],6)}}
 // Vertical ladder tray drops from the overhead run to the machine tops.
 function trayRun(p,a,b,w=.32){
  const axis=[0,1,2].find(i=>Math.abs(b[i]-a[i])>.01),len=Math.abs(b[axis]-a[axis]),mid=a.map((v,i)=>(v+b[i])/2),side=axis===1?0:axis===0?2:0;
  for(const s of [-1,1]){const o=[...mid];o[side]+=s*w/2;const size=[.03,.03,.03];size[axis]=len;if(axis!==1)size[1]=.09;box(p,size[0],size[1],size[2],mats.steel,o[0],o[1],o[2],.004)}
  for(let t=.15;t<len;t+=.3){const q=[...mid];q[axis]=Math.min(a[axis],b[axis])+t;const size=[.025,.02,.025];size[side]=w;box(p,size[0],size[1],size[2],mats.steel,q[0],q[1],q[2],0)}
  const cable=[...mid];cable[side]+=.04;const cs=[.07,.05,.07];cs[axis]=len;if(axis===1)cs[side]=.16;else cs[1]=.05;box(p,cs[0],cs[1],cs[2],mats.rubber,cable[0],cable[1],cable[2],.02);
 }
 trayRun(service,[-3.6,5.38,-8.33],[-3.6,3.55,-8.33]);trayRun(service,[-3.6,3.52,-8.33],[-3.6,3.52,-6.95]);
 trayRun(service,[8.0,5.38,-8.33],[8.0,3.45,-8.33]);trayRun(service,[8.0,3.42,-8.33],[8.0,3.42,-6.7]);
 // Warning signs on the robot cell guards (GB 2894 style triangle with a text panel).
 const signMats=new Map();
 function sign(p,label,x,y,z,rotate){
  let mat=signMats.get(label);if(!mat){const c=document.createElement('canvas');c.width=256;c.height=320;const ctx=c.getContext('2d');
   ctx.fillStyle='#f4f2ea';ctx.fillRect(0,0,256,320);ctx.fillStyle='#e8b923';ctx.strokeStyle='#161616';ctx.lineWidth=14;ctx.lineJoin='round';
   ctx.beginPath();ctx.moveTo(128,24);ctx.lineTo(230,200);ctx.lineTo(26,200);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle='#161616';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 104px Arial';ctx.fillText('!',128,136);
   ctx.font='bold 38px "Microsoft YaHei", "PingFang SC", sans-serif';ctx.fillText(label,128,262,236);
   mat=new Material('#ffffff',.7,0,.1);mat.texture=renderer.canvasTexture(c);signMats.set(label,mat)}
  const n=mesh(p,G.plane(.34,.425),mat,[x,y,z],rotate);n.castShadow=false;return n;
 }
 sign(root,'当心机械伤人',-5.2,.95,3.76,[Math.PI/2,0,0]);sign(root,'当心机械伤人',4.0,.95,3.76,[Math.PI/2,0,0]);
 sign(root,'当心机械伤人',-7.42,.95,2.8,[Math.PI/2,0,Math.PI/2]);
 sign(root,'当心 AGV',-13.9,1.6,3.9,[Math.PI/2,0,-Math.PI/2]);
 // Indoor fire hydrant cabinet on the west column line.
 const hydrant=group(root,'Fire hydrant cabinet',-13.78,0,-4);
 box(hydrant,.24,1.0,.72,mats.signRed,0,1.05,0,.012);box(hydrant,.012,.62,.5,mats.glassDark,.125,1.12,0,0);
 text(hydrant,'消火栓',.36,.1,.127,1.44,0,{fg:'#ffffff',rotate:[Math.PI/2,0,-Math.PI/2]});
 // Selection positions and low-frequency contact shading follow the actual moving equipment.
 function cameraVisibility(eye){northShell.visible=eye[2]>-9.85;westShell.visible=eye[0]>-14.25;hallBack.visible=eye[2]>-17.7;hallWest.visible=eye[0]>-29}
 function contacts(){return new Float32Array([
  -5.2,2.25,1.05,.95, 4,2.25,1.05,.95, -3.6,-5.7,2.5,1.55, 8,-5.45,2.2,1.55,
  agv1.node.position[0],agv1.node.position[2],1,.7, agv2.node.position[0],agv2.node.position[2],1,.7,
  -9.25,-4.9,1.4,1.2, 2.26,-6.23,1.3,.85
 ])}
 // Keep the two status halos independent of animation and exempt from shadow casting.
 function halo(mat){let n=group(root,'Device focus',0,0,0,0,true);for(let i=0;i<4;i++){let a=group(n,'corner',0,0,0,i*Math.PI/2);box(a,.55,.014,.035,mat,1.05,.055,1.05,.004).castShadow=false;box(a,.035,.014,.55,mat,1.05,.055,.79,.004).castShadow=false}n.visible=false;return n}
 const selectedHalo=halo(new Material('#2f7a5c',.7,0,.35)),alarmHalo=halo(new Material('#ff8254',.4,0,1.4));
  // Compile static geometry into per-material draw batches; robot joints stay articulated.
 optimize(root);root.update();
 const stateCache=new Map();
 function update(t,dt){
  for(let d of devices)if(stateCache.get(d.id)!==d.state){d.setLamps(d.state);stateCache.set(d.id,d.state)}
  for(let a of animations){let run=a.device.state==='running';
   if(a.type==='product'){a.progress=(a.progress??a.offset*22.4)+(run?dt*.40:0);a.node.position[0]=((a.progress+22.4)%22.4)-11.2}
   if(a.type==='robot'){
    a.t=(a.t??a.phase)+(run?dt:0);const tt=a.t,L1=1.92,L2=1.62,reach=2.14+.09*Math.sin(tt*.56),height=1.40+.18*(.5+.5*Math.sin(tt*.56+.4));
    const c=Math.max(-1,Math.min(1,(reach*reach+height*height-L1*L1-L2*L2)/(2*L1*L2))),b=-Math.acos(c);
    const j2=Math.atan2(height,reach)-Math.atan2(L2*Math.sin(b),L1+L2*Math.cos(b))-Math.PI/2;
    a.base.rotation[1]=Math.PI/2+.105*Math.sin(tt*.56);a.shoulder.rotation[2]=j2;a.elbow.rotation[2]=b;
    a.wrist.rotation[2]=Math.PI-j2-b;a.tool.rotation[1]=.12*Math.sin(tt*.56+.6);
    a.fingers.forEach((f,i)=>f.position[0]=(i?1:-1)*(.202+.012*Math.sin(tt*.56)));
   }
   if(a.type==='agv'){
    a.t=(a.t??0)+(run?dt:0);const left=-10,right=7.1,r=.85,line=right-left,arc=Math.PI*r,total=line*2+arc*2;
    let travel=a.t*.72+1.7;
    if(a.device.id===8){
     if(a.t<5.0){let u=a.t/5;a.node.position=[10.5-3.4*u,0,8+.35*u];a.node.rotation[1]=Math.PI+.103;travel=null}
     else travel=line+arc+(a.t-5)*.72;
    }
    if(travel!==null){let s=((travel%total)+total)%total,x,z,theta;
     if(s<line){x=left+s;z=7.5-r;theta=0}
     else if((s-=line)<arc){let a=-Math.PI/2+s/r;x=right+r*Math.cos(a);z=7.5+r*Math.sin(a);theta=-(a+Math.PI/2)}
     else if((s-=arc)<line){x=right-s;z=7.5+r;theta=Math.PI}
     else{let a=Math.PI/2+(s-line)/r;x=left+r*Math.cos(a);z=7.5+r*Math.sin(a);theta=-(a+Math.PI/2)}
     a.node.position=[x,0,z];a.node.rotation[1]=theta;
    }
    a.wheels.forEach(w=>w.rotation[2]=-a.t*.72/.206);
    a.device.anchor=[a.node.position[0],1.65,a.node.position[2]];a.device.focus=[a.node.position[0],.72,a.node.position[2]];
   }
  }
 }
 function selection(d){selectedHalo.visible=!!d;if(d){selectedHalo.position=[d.focus[0],0,d.focus[2]];selectedHalo.scale=d.id===1?[2,1,1]:[1,1,1]}}
 function alarm(d,t){alarmHalo.visible=!!d;if(d){alarmHalo.position=[d.focus[0],0,d.focus[2]];alarmHalo.scale=[1.2+Math.sin(t*3)*.04,1,1.2+Math.sin(t*3)*.04]}}
 return {root,devices,update,selection,alarm,animations,mats,cameraVisibility,contacts};
}
window.buildFactory=buildFactory;
})();
