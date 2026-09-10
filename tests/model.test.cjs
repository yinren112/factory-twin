'use strict';
// Geometry/kinematics tests use the actual model builder. Canvas text is stubbed;
// real texture, shader and framebuffer correctness is separately browser-tested.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const draw={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
const context={window:{},console,document:{createElement(){return{getContext(){return draw}}}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/engine.js'),'utf8'),context);
context.TwinGL=context.window.TwinGL;
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/factory.js'),'utf8'),context);
const {M,V,G}=context.TwinGL;
const factory=context.window.buildFactory({canvasTexture(){return {testStub:true}}});
const robots=factory.animations.filter(a=>a.type==='robot');
const agvs=factory.animations.filter(a=>a.type==='agv');
const outline=[[-.4,0],[.4,0],[.24,1.4],[.12,1.9],[-.14,1.9],[-.3,1.4]];
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const nodes=()=>{let out=[];const walk=n=>{out.push(n);n.children.forEach(walk)};walk(factory.root);return out};
function restart(){for(const a of factory.animations)if(a.type==='robot'||a.type==='agv')a.t=0;factory.devices.forEach(d=>d.state=d.id===8?'idle':'running');factory.update(0,0);factory.root.update()}
restart();
test('cast housings have finite positions, unit normals and matching UV streams',()=>{
 const g=G.bevelExtrude(outline,.63,.064,.12);assert.ok(g.v.every(Number.isFinite));assert.equal(g.v.length,g.n.length);assert.equal(g.uv.length,g.v.length*2/3);
 for(let i=0;i<g.n.length;i+=3)near(Math.hypot(...g.n.slice(i,i+3)),1);
});
test('cast face winding agrees with outward shading normals',()=>{
 const g=G.bevelExtrude(outline,.63,.064,.12);let checked=0;
 for(let i=0;i<g.v.length;i+=9){const a=g.v.slice(i,i+3),b=g.v.slice(i+3,i+6),c=g.v.slice(i+6,i+9),n=V.cross(V.sub(b,a),V.sub(c,a));if(Math.hypot(...n)<1e-10)continue;const shade=V.add(V.add(g.n.slice(i,i+3),g.n.slice(i+3,i+6)),g.n.slice(i+6,i+9));assert.ok(V.dot(n,shade)>=-1e-7);checked++}assert.ok(checked>300);
});
test('clockwise and counterclockwise input both generate closed thickness bounds',()=>{
 for(const p of [outline,[...outline].reverse()]){const g=G.bevelExtrude(p,.63,.064,.12),z=g.v.filter((_,i)=>i%3===2);near(Math.min(...z),-.315);near(Math.max(...z),.315)}
});
test('inverse-transpose normals remain perpendicular under nonuniform scale',()=>{
 const mat=M.mul(M.ry(.61),M.scale(2,.45,1.3)),n=M.normalDir(mat,V.norm([1,1,0]));
 const tangent=M.dir(mat,[1,-1,0]);near(V.dot(n,tangent),0);near(Math.hypot(...n),1);
});
test('singular normal transforms fail finite instead of producing NaN',()=>assert.ok(Array.from(M.normal(M.scale(0,1,1))).every(Number.isFinite)));
test('model builder preserves eight unique equipment IDs after batching',()=>{
 assert.equal(factory.devices.length,8);assert.equal(new Set(factory.devices.map(d=>d.id)).size,8);
 const ids=new Set(nodes().filter(n=>n.geometry).map(n=>n.pickId));for(let id=1;id<=8;id++)assert.ok(ids.has(id));
});
test('all static/dynamic merged geometry and world matrices remain finite',()=>{
 for(const n of nodes()){assert.ok(Array.from(n.world).every(Number.isFinite));if(n.geometry){assert.ok(n.geometry.v.every(Number.isFinite));assert.ok(n.geometry.n.every(Number.isFinite))}}
});
test('both robot tools remain vertical and clear all cassette tops over a full motion cycle',()=>{
 restart();let minimum=Infinity,maximumDeviation=0;
 for(let i=0;i<=160;i++){factory.update(i*.1,.1);factory.root.update();for(const a of robots){const down=M.dir(a.tool.world,[0,1,0]),tip=M.point(a.tool.world,[0,.4675,0]);minimum=Math.min(minimum,tip[1]);maximumDeviation=Math.max(maximumDeviation,Math.hypot(down[0],down[2]),Math.abs(down[1]+1));assert.ok(tip[1]>1.8475+.08)}}
 assert.ok(maximumDeviation<1e-5);console.log(JSON.stringify({sampledRobotCycleSeconds:16,samplesPerRobot:161,minimumToolTipMetres:minimum,highestCassetteMetres:1.8475,maxDownwardAxisDeviation:maximumDeviation}));
});
test('AGV loop is position-continuous through both semicircle joins and wraparound',()=>{
 restart();let last=[...agvs[0].node.position],maxStep=0;
 for(let i=1;i<=800;i++){factory.update(i*.1,.1);const p=agvs[0].node.position,delta=Math.hypot(p[0]-last[0],p[2]-last[2]);maxStep=Math.max(maxStep,delta);assert.ok(delta<.073);assert.ok(p[0]>=-10.851&&p[0]<=7.951&&p[2]>=6.649&&p[2]<=8.351);last=[...p]}
 console.log(JSON.stringify({agvSampleSeconds:80,samples:800,maxStepMetres:maxStep}));
});
test('standby AGV stays docked and wheel hubs stay still',()=>{
 restart();const a=agvs[1],p=[...a.node.position],rot=a.wheels[0].rotation[2];factory.update(3,3);assert.deepEqual([...a.node.position],p);assert.equal(a.wheels[0].rotation[2],rot);
});
test('AGV leaves charging position without teleporting when operation resumes',()=>{
 restart();const a=agvs[1];a.device.state='running';let last=[...a.node.position];for(let i=1;i<=70;i++){factory.update(i*.1,.1);const p=a.node.position;assert.ok(Math.hypot(p[0]-last[0],p[2]-last[2])<.073);last=[...p]}
});
test('an alarm freezes only the affected robot pose',()=>{
 restart();robots[1].device.state='alarm';const t1=robots[0].t,t2=robots[1].t;factory.update(2,2);assert.ok(robots[0].t>t1);assert.equal(robots[1].t,t2);
});
test('camera cutaway hides near exterior wall and restores it on return',()=>{
 const shells=nodes().filter(n=>/cutaway facade/i.test(n.name));assert.equal(shells.length,2);
 factory.cameraVisibility([20,20,30]);assert.ok(shells.every(n=>n.visible));factory.cameraVisibility([-20,20,-20]);assert.ok(shells.every(n=>!n.visible));factory.cameraVisibility([20,20,30]);assert.ok(shells.every(n=>n.visible));
});
test('contact-shadow coordinates follow AGVs and contain finite positive radii',()=>{
 restart();factory.update(10,10);const values=factory.contacts();assert.equal(values.length,32);assert.ok(Array.from(values).every(Number.isFinite));for(let i=0;i<8;i++){assert.ok(values[i*4+2]>0&&values[i*4+3]>0)}
});
