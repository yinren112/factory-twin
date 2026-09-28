/* Application orchestration: connects the scene, simulated telemetry and the docked panels. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const stateNames={running:'运行中',idle:'待机',alarm:'告警'};
const shortNames={1:'输送线',2:'上料机器人',3:'装配机器人',4:'加工中心',5:'视觉检测',6:'封装单元',7:'搬运 AGV',8:'待命 AGV'};
const typeNames={1:'辊道输送线',2:'六轴机器人',3:'六轴机器人',4:'立式加工中心',5:'视觉检测工位',6:'封装单元',7:'搬运 AGV',8:'搬运 AGV'};
let toastTimer;
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400)}
function fail(error){console.error(error);$('fatal').hidden=false;$('fatal-message').textContent=error.message||String(error);$('loading').hidden=true;window.__twinError=String(error)}
const fmtTime=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');
window.addEventListener('renderlost',()=>fail(new Error('图形上下文已丢失。请关闭其他高负载页面后重新加载；流畅画质可以减少显存占用。')));
if(document.readyState==='complete')requestAnimationFrame(()=>requestAnimationFrame(init));
else window.addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(init)));

function init(){
 try{
  const canvas=$('scene'),renderer=new TwinGL.Renderer(canvas),camera=new TwinGL.OrbitCamera(canvas),factory=buildFactory(renderer),sim=new Telemetry(factory.devices);
  const phone=()=>window.innerWidth<641,narrow=()=>window.innerWidth<901;
  let selected=factory.devices.find(d=>d.id===3),labelsVisible=true,mode='home',night=false,nightMix=0;
  let frames=0,fpsT=performance.now(),fpsValue=0,raf=0,last=performance.now(),lastRender=0,lastStamp='';
  const pins=new Map(),rows=new Map();
  function renderScene(){factory.cameraVisibility(camera.eye());renderer.contacts=factory.contacts();renderer.night=nightMix;renderer.render(factory.root,camera)}

  for(const d of factory.devices){
   const pin=document.createElement('button');pin.type='button';pin.className='device-pin';pin.dataset.device=String(d.id);
   pin.innerHTML=`<span class="tag">${d.code}<span>${d.name}</span></span><i class="stem"></i><i class="foot"></i>`;
   pin.title=`${d.name} · 点击查看，双击聚焦`;pin.addEventListener('click',()=>select(d.id));pin.addEventListener('dblclick',()=>focus(d.id));
   $('labels').appendChild(pin);pins.set(d.id,pin);
   const row=document.createElement('button');row.type='button';row.className='device-row';row.dataset.device=String(d.id);
   row.innerHTML=`<i></i><code>${d.code}</code><span>${shortNames[d.id]}</span>`;row.title=d.name;
   row.addEventListener('click',()=>select(d.id));row.addEventListener('dblclick',()=>focus(d.id));
   $('device-picker').appendChild(row);rows.set(d.id,row);
  }

  function viewTitle(){
   const names={home:'总览',top:'俯视',tour:'环绕'};
   $('view-title').innerHTML=mode==='focus'?`${selected.code}<small>${selected.name}</small>`:names[mode]||'自由视角';
  }
  function select(id,notify=false){
   const d=factory.devices.find(d=>d.id===id);if(!d)return;
   selected=d;renderer.selected=d.id;factory.selection(d);
   $('device-name').textContent=d.name;$('device-code').textContent=d.code;$('device-category').textContent=typeNames[d.id]||d.type;
   if(mode==='focus')viewTitle();updateUI();if(notify)toast(`${d.code} · ${d.name}`);
  }
  function focus(id=selected.id){
   select(id);const d=factory.devices.find(d=>d.id===id);setMode('focus');
   camera.fly(d.focus,d.id===1?21:d.id>=7?8.2:12.3,d.id>=7?-.72:.72,1.03);
  }
  function setMode(value){mode=value;for(const s of ['home','top','tour'])$('view-'+s).classList.toggle('active',value===s);viewTitle()}
  function homeDistance(){return phone()?60:narrow()?52:40}
  function home(){camera.touring=false;setMode('home');camera.fly([0,1.45,0],homeDistance(),.57,1.01)}
  function top(){camera.touring=false;setMode('top');camera.fly([0,.3,0],phone()?52:36,.02,.10)}
  function toggleTour(){
   if(camera.touring){camera.touring=false;setMode('focus');mode='free';viewTitle();return}
   setMode('tour');camera.tween=null;camera.target=[0,1.1,0];camera.distance=phone()?60:42;camera.phi=.93;camera.touring=true;
  }
  function setCheck(el,on){el.classList.toggle('active',on);el.setAttribute('aria-pressed',String(on))}
  function pause(){
   sim.paused=!sim.paused;setCheck($('toggle-simulation'),!sim.paused);
   toast(sim.paused?'模拟数据已暂停，场景仍可自由查看':'模拟数据继续运行');
  }
  function cinematic(){
   document.body.classList.toggle('cinematic');renderer.resize();renderScene();updateLabels();
  }
  function toggleLabels(){labelsVisible=!labelsVisible;$('labels').style.display=labelsVisible?'':'none';setCheck($('toggle-labels'),labelsVisible);if(labelsVisible)updateLabels()}
  function toggleNight(){
   night=!night;document.body.classList.toggle('night',night);setCheck($('toggle-night'),night);
   document.querySelector('meta[name=theme-color]').content=night?'#1a262b':'#f5f7f5';
  }
  function trigger(){
   const target=factory.devices.find(d=>d.id===3);if(!target.online)sim.toggleOnline(3);
   const a=sim.trigger(3);select(a.id);renderer.alarmId=a.id;updateUI();toast('已模拟 RB-02 驱动器温度越限');
  }
  function recover(){if(!sim.recover())return;renderer.alarmId=0;updateUI();toast('模拟故障已复位，设备回到原状态')}
  function setQuality(){
   renderer.quality=renderer.quality==='high'?'balanced':'high';renderer.resize();
   const hi=renderer.quality==='high';$('quality').textContent=hi?'画质：精细':'画质：流畅';$('quality').setAttribute('aria-pressed',String(hi));
  }
  function capture(){
   renderScene();const a=document.createElement('a'),t=new Date();
   a.download=`01号装配车间-${t.getFullYear()}${String(t.getMonth()+1).padStart(2,'0')}${String(t.getDate()).padStart(2,'0')}-${String(t.getHours()).padStart(2,'0')}${String(t.getMinutes()).padStart(2,'0')}.png`;
   a.href=canvas.toDataURL('image/png');a.click();toast('已导出当前画面');
  }

  function updateUI(){
   const s=sim.summary(),d=selected,offline=factory.devices.filter(x=>!x.online).length;
   $('kpi-output').textContent=s.output.toLocaleString('en-US');$('kpi-efficiency').textContent=s.efficiency.toFixed(1);
   $('kpi-power').textContent=s.power.toFixed(1);$('kpi-online').textContent=`${s.online}/${factory.devices.length}`;
   $('count-alarm').textContent=s.alarms;$('stat-alarms').classList.toggle('is-alarm',s.alarms>0);
   $('count-running').textContent=s.running;$('count-idle').textContent=s.idle-offline;$('count-offline').textContent=offline;$('energy').textContent=s.energy.toFixed(1);
   $('fleet-count').textContent=`运行 ${s.running} · 待机 ${s.idle-offline}`;
   // Inspector
   const st=!d.online?'offline':d.state;
   $('device-state').textContent=d.online?stateNames[d.state]:'离线';$('device-state-dot').className='st-'+st;
   $('device-link').textContent=d.online?'模拟连接正常':'模拟连接已断开';
   document.querySelector('.status-line').classList.toggle('alarm',d.state==='alarm');
   $('device-temp').textContent=d.temperature.toFixed(1);$('reading').classList.toggle('alarm',d.state==='alarm');
   $('device-power').textContent=d.power.toFixed(1);$('device-output').textContent=d.output.toLocaleString('en-US');
   $('device-cycle').textContent=d.state==='running'?d.cycle.toFixed(1):'—';
   $('toggle-online').disabled=d.state==='alarm';$('toggle-online').textContent=d.online?'模拟断开':'恢复连接';
   $('toggle-device').disabled=d.state==='alarm'||!d.online;
   $('toggle-device').textContent=d.state==='idle'?'恢复运行':d.state==='alarm'?'等待复位':'切换待机';
   // Alarm section
   $('event-count').textContent=sim.alarm?'1 项':'0';$('event-empty').hidden=!!sim.alarm;$('event-active').hidden=!sim.alarm;
   if(sim.alarm){const ad=factory.devices.find(x=>x.id===sim.alarm.id);$('alarm-code').textContent=ad.code;$('alarm-reading').textContent=ad.temperature.toFixed(1);$('alarm-time').textContent='模拟时刻 '+fmtTime(sim.alarm.at)}
   // Sidebar rows and 3D pins
   for(const dd of factory.devices){
    const cls=(dd.id===d.id?' active':'')+(dd.state==='alarm'?' alarm':!dd.online?' offline':dd.state==='idle'?' idle':'');
    rows.get(dd.id).className='device-row'+cls;rows.get(dd.id).setAttribute('aria-pressed',String(dd.id===d.id));
    pins.get(dd.id).className='device-pin'+cls;pins.get(dd.id).setAttribute('aria-label',`${dd.code} ${dd.name} ${dd.online?stateNames[dd.state]:'离线'}`);
   }
   // Temperature trend
   const lo=Math.min(...d.history),hi=Math.max(...d.history),min=Math.floor((lo-4)/5)*5,max=Math.ceil((hi+4)/5)*5;
   const y=v=>(62-(v-min)/(max-min)*60).toFixed(2);
   $('trend-line').setAttribute('d',d.history.map((v,i)=>(i?'L':'M')+(i/39*260).toFixed(2)+','+y(v)).join(''));
   $('trend-line').classList.toggle('alarm',d.state==='alarm');
   $('trend-threshold').setAttribute('d',`M0 ${y(80)}H260`);$('trend-threshold').setAttribute('opacity',max>=80?'1':'0');
   $('chart-min').textContent=min+' °C';$('chart-max').textContent=max+' °C';
   $('trend').setAttribute('aria-label',`${d.code} 最近 40 个温度样本，最低 ${lo.toFixed(1)}，最高 ${hi.toFixed(1)} 摄氏度`);
  }
  function updateLabels(){
   if(!labelsVisible)return;const rect=canvas.getBoundingClientRect(),occupied=[];
   const rank=d=>d.state==='alarm'?3:d.id===selected.id?2:0;
   for(const d of [...factory.devices].sort((a,b)=>rank(b)-rank(a))){
    const p=renderer.project(d.anchor),el=pins.get(d.id),key=rank(d)>0,w=key?(phone()?70:170):56,h=40;
    const collision=occupied.some(o=>Math.abs(p.x-o.x)<(w+o.w)/2+6&&Math.abs(p.y-o.y)<h);
    const show=p.visible&&p.y>h+28&&p.y<rect.height-40&&p.x>w*.5+4&&p.x<rect.width-w*.5-4&&(!collision||key);
    el.style.display=show?'':'none';if(show){el.style.left=p.x.toFixed(1)+'px';el.style.top=p.y.toFixed(1)+'px';occupied.push({x:p.x,y:p.y,w})}
   }
  }

  $('view-home').onclick=home;$('view-top').onclick=top;$('view-tour').onclick=toggleTour;$('reset-view').onclick=home;
  $('project-home').onclick=e=>{e.preventDefault();home()};
  $('toggle-labels').onclick=toggleLabels;$('toggle-simulation').onclick=pause;$('toggle-night').onclick=toggleNight;
  $('focus-device').onclick=()=>focus();$('trigger-alarm').onclick=trigger;$('recover-alarm').onclick=recover;
  $('locate-alarm').onclick=()=>{if(sim.alarm)focus(sim.alarm.id)};
  $('stat-alarms').onclick=()=>{if(sim.alarm)focus(sim.alarm.id);else toast('当前没有未处理告警')};
  $('toggle-device').onclick=()=>{if(sim.toggleDevice(selected.id)){updateUI();toast(selected.code+(selected.state==='idle'?' 已切换待机':' 已恢复运行'))}};
  $('toggle-online').onclick=()=>{if(sim.toggleOnline(selected.id)){updateUI();toast(selected.code+(selected.online?' 模拟连接已恢复':' 已模拟断开连接'))}};
  $('quality').onclick=setQuality;$('capture').onclick=capture;$('cinematic').onclick=cinematic;$('exit-presentation').onclick=cinematic;
  camera.onInteract=()=>{if(mode!=='free'){mode='free';for(const s of ['home','top','tour'])$('view-'+s).classList.remove('active');viewTitle()}};
  let down=null;
  canvas.addEventListener('pointerdown',e=>{if(e.button===0)down=[e.clientX,e.clientY]});
  canvas.addEventListener('pointerup',e=>{if(e.button!==0||!down)return;const moved=Math.hypot(e.clientX-down[0],e.clientY-down[1]);down=null;if(moved>5)return;const id=renderer.pick(e.clientX,e.clientY);if(id)select(id,true)});
  canvas.addEventListener('dblclick',e=>{const id=renderer.pick(e.clientX,e.clientY);if(id)focus(id)});
  document.addEventListener('keydown',e=>{
   if(e.target.matches('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey)return;let handled=true;
   switch(e.key.toLowerCase()){
    case 'escape':if(document.body.classList.contains('cinematic'))cinematic();else home();break;
    case 'f':focus();break;case 'g':toggleLabels();break;case 'n':toggleNight();break;case 'p':case 'c':cinematic();break;case ' ':pause();break;
    case 'arrowup':case 'w':camera.pan(0,-.45);break;case 'arrowdown':case 's':camera.pan(0,.45);break;
    case 'arrowleft':case 'a':camera.pan(-.45,0);break;case 'arrowright':case 'd':camera.pan(.45,0);break;
    default:handled=false;
   }
   if(handled)e.preventDefault();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=performance.now();lastRender=0}});

  camera.target=[0,1.45,0];camera.distance=homeDistance();camera.theta=.57;camera.phi=1.01;
  select(3);factory.update(0,0);renderScene();updateLabels();
  $('loading').classList.add('done');setTimeout(()=>$('loading').hidden=true,320);

  function frame(now){
   raf=requestAnimationFrame(frame);if(document.hidden||renderer.contextLost)return;if(now-lastRender<31)return;
   const dt=Math.min((now-last)/1000,1);last=now;lastRender=now;
   try{
    camera.update(dt);
    nightMix+=((night?1:0)-nightMix)*Math.min(1,dt*5);if(Math.abs(nightMix-(night?1:0))<.002)nightMix=night?1:0;
    const stamp=[...camera.target,camera.distance,camera.theta,camera.phi,selected.id,!!sim.alarm,renderer.quality,labelsVisible,nightMix,canvas.clientWidth,canvas.clientHeight,factory.devices.map(d=>d.state+'-'+d.online).join(',')].join(':');
    if(sim.paused&&stamp===lastStamp)return;lastStamp=stamp;
    const changed=sim.step(dt);factory.update(sim.seconds,sim.paused?0:dt);factory.selection(selected);
    factory.alarm(sim.alarm?factory.devices.find(d=>d.id===sim.alarm.id):null,sim.seconds);
    renderer.time=sim.seconds;renderScene();updateLabels();if(changed)updateUI();
    frames++;if(now-fpsT>1600){fpsValue=Math.round(frames*1000/(now-fpsT));frames=0;fpsT=now}
   }catch(e){cancelAnimationFrame(raf);fail(e)}
  }
  raf=requestAnimationFrame(frame);

  // Read-only state plus explicit controls make the included acceptance tests reproducible.
  window.__twin={ready:true,version:'2.1.0',engine:'WebGL 2 (native)',cinematic,select,focus,home,top,toggleNight,triggerAlarm:trigger,recoverAlarm:recover,pause,toggleLabels,
   step:dt=>{sim.step(dt);factory.update(sim.seconds,dt);updateUI()},
   snapshot:()=>({...sim.snapshot(),selected:selected.id,mode,night,camera:{target:[...camera.target],distance:camera.distance,theta:camera.theta,phi:camera.phi,touring:camera.touring},render:{quality:renderer.quality,width:renderer.width,height:renderer.height,fps:fpsValue,drawCalls:renderer.drawCalls,triangles:renderer.triangles,hdr:renderer.hdr,msaa:renderer.msaa?.samples||0,contextLost:renderer.contextLost}}),
   projectDevice:id=>{const d=factory.devices.find(x=>x.id===id);return renderer.project(d.focus)},projectPoint:p=>renderer.project(p),renderOnce:()=>renderScene(),
   inspectView:(config={})=>{
    if(config.target&&!config.target.every(Number.isFinite))throw new TypeError('Invalid camera target');
    if(config.target)camera.target=[...config.target];
    for(const k of ['distance','theta','phi'])if(config[k]!==undefined){if(!Number.isFinite(config[k]))throw new TypeError('Invalid camera parameter');camera[k]=config[k]}
    camera.tween=null;camera.touring=false;factory.update(sim.seconds,0);factory.selection(selected);factory.alarm(sim.alarm?factory.devices.find(d=>d.id===sim.alarm.id):null,sim.seconds);renderScene();updateLabels();
    return {eye:camera.eye(),contextError:renderer.gl.getError()};
   },
   poseAudit:()=>factory.animations.filter(a=>a.type==='robot').map(a=>({id:a.device.id,wrist:TwinGL.M.point(a.wrist.world,[0,0,0]),toolTip:TwinGL.M.point(a.tool.world,[0,.4675,0]),down:TwinGL.M.dir(a.tool.world,[0,1,0]),angles:[a.shoulder.rotation[2],a.elbow.rotation[2],a.wrist.rotation[2]]})),
   geometryAudit:()=>{
    const items=renderer.list(factory.root),errors=[];let triangles=0;
    for(const n of items){if(!Array.from(n.world).every(Number.isFinite))errors.push('non-finite world: '+n.name);if(!n.geometry.v.every(Number.isFinite)||!n.geometry.n.every(Number.isFinite))errors.push('non-finite geometry: '+n.name);triangles+=n.geometry.v.length/9}
    return {meshes:items.length,sceneTriangles:triangles,geometryBuffers:renderer.geometries.size,errors};
   },
   deviceAnimations:()=>factory.animations.filter(a=>a.type==='robot'||a.type==='agv').map(a=>({id:a.device.id,type:a.type,time:a.t||0,position:a.node?[...a.node.position]:null,angles:a.base?[a.base.rotation[1],a.shoulder.rotation[2],a.elbow.rotation[2]]:null}))};
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);renderer.dispose();camera.dispose(canvas)},{once:true});
 }catch(e){fail(e)}
}
})();
