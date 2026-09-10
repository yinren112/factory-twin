#!/usr/bin/env python3
"""Captures the actual delivered HTML. No image generation or screenshot retouching.
Each view is rendered with the same runtime and controls used by the normal UI.
"""
import asyncio,json,pathlib,argparse,time,hashlib
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
P=argparse.ArgumentParser();P.add_argument('--round',default='round-1');P.add_argument('--views',default='overview,robot,cnc,reverse,agv,hero');P.add_argument('--width',type=int,default=1440);P.add_argument('--height',type=int,default=960);args=P.parse_args()
views={
 'overview':dict(target=[0,1.45,0],distance=47,theta=.57,phi=1.01),
 'robot':dict(target=[4,1.90,1.60],distance=11.0,theta=.73,phi=1.08,device=3),
 'robot-reverse':dict(target=[4,1.90,1.60],distance=10.5,theta=-1.80,phi=1.12,device=3),
 'cnc':dict(target=[-3.6,1.85,-5.5],distance=10.0,theta=.40,phi=1.16,device=4),
 'pack':dict(target=[8,1.8,-5.40],distance=10,theta=.52,phi=1.08,device=6),
 'reverse':dict(target=[0,1,-1.4],distance=42,theta=3.9,phi=.99),
 'top':dict(target=[0,.3,0],distance=42,theta=0,phi=.10),
 'agv':dict(target=[10.5,.65,8],distance=7.6,theta=-.70,phi=1.17,device=8),
 'hero':dict(target=[.0,.5,-.6],distance=44,theta=.61,phi=1.02,cinematic=True),
 'robot-macro':dict(target=[4,2,1.25],distance=7.8,theta=.48,phi=1.13,device=3,cinematic=True),
 'robot-side':dict(target=[4,2.0,1.3],distance=9.4,theta=-1.7,phi=1.10,device=3,cinematic=True),
 'alarm':dict(target=[4,1.9,1.6],distance=12.0,theta=.95,phi=1.11,device=3,alarm=True),
 'qc':dict(target=[8,2.0,.1],distance=8.0,theta=.65,phi=1.14,device=5),
 'eye-level':dict(target=[0,1.5,-.2],distance=28,theta=1.22,phi=1.39,cinematic=True),
}
async def main():
 out=(ROOT/'screenshots'/'final') if args.round=='final' else (ROOT/'screenshots'/'iterations'/args.round);out.mkdir(parents=True,exist_ok=True)
 errors=[];warnings=[];requests=[];record={'round':args.round,'views':[]}
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--use-gl=angle'])
  page=await browser.new_page(viewport={'width':args.width,'height':args.height},device_scale_factor=1)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:errors.append(m.text) if m.type=='error' else warnings.append(m.text) if m.type=='warning' else None)
  page.on('request',lambda r:requests.append(r.url))
  try:
   record['loading_method']='Unchanged offline HTML via set_content on a fresh about:blank page. Local URL navigation failed in environment preflight.'
   # Versioned build is always the exact offline HTML under test, not a modified mock.
   html=(ROOT/'factory-twin-offline.html').read_text();record['build_sha256']=hashlib.sha256(html.encode()).hexdigest()
   await page.set_content(html,wait_until='load',timeout=90000)
   await page.wait_for_function('window.__twin?.ready || window.__twinError',timeout=120000)
   if await page.evaluate('!!window.__twinError'):raise RuntimeError(await page.evaluate('window.__twinError'))
   await page.evaluate('if(!__twin.snapshot().paused)__twin.pause()')
   await page.wait_for_timeout(700)
   record['initial']=await page.evaluate('__twin.snapshot()')
   record['poses']=await page.evaluate('__twin.poseAudit()')
   record['geometry']=await page.evaluate('__twin.geometryAudit()')
   print('READY',record['geometry'],flush=True)
   cinematic=False
   for name in args.views.split(','):
    view=dict(views[name]);cin=view.pop('cinematic',False);device=view.pop('device',3);alarm=view.pop('alarm',False)
    if alarm:await page.evaluate('__twin.triggerAlarm()')
    elif (await page.evaluate('__twin.snapshot().alarm')) is not None:await page.evaluate('__twin.recoverAlarm()')
    if cin!=cinematic:
     await page.evaluate('__twin.cinematic()');cinematic=cin
    await page.evaluate('(id)=>__twin.select(id)',device)
    inspect=await page.evaluate('(config)=>__twin.inspectView(config)',view)
    await page.wait_for_timeout(400)
    # Do not modify image pixels; omit transient toast only after its normal timer elapses.
    await page.wait_for_function("!document.getElementById('toast').classList.contains('show')",timeout=30000)
    await page.wait_for_function("Number(getComputedStyle(document.getElementById('toast')).opacity)<.01",timeout=30000)
    await page.wait_for_timeout(1000)
    await page.evaluate("__twin.renderOnce()")
    await page.screenshot(path=str(out/(name+'.png')),timeout=90000)
    record['views'].append({'name':name,'camera':view,'cinematic':cin,**inspect})
    print('SHOT',name,flush=True)
   record['final']=await page.evaluate('__twin.snapshot()')
   record['checks']=[{'test':'No non-finite scene geometry','passed':not record['geometry']['errors']},{'test':'All captured cameras complete without GL errors','passed':all(v['contextError']==0 for v in record['views'])},{'test':'No external resource requests','passed':len(requests)==0}]
   if cinematic:
    await page.keyboard.press('c');await page.wait_for_timeout(700)
    record['checks'].append({'test':'C key exits cinematic view and restores normal UI','passed':await page.evaluate("!document.body.classList.contains('cinematic') && document.getElementById('device-name').offsetHeight>0")})
    await page.keyboard.press('c');await page.wait_for_timeout(700)
    record['checks'].append({'test':'C key enters cinematic view','passed':await page.evaluate("document.body.classList.contains('cinematic')")})
  except Exception as e:
   errors.append(str(e));print('ERROR',str(e),flush=True)
   await page.screenshot(path=str(out/'failure.png'),timeout=90000)
  record.update(errors=errors,warnings=warnings,requests=requests)
  (ROOT/'docs'/f'visual-{args.round}.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
  await browser.close()
  print('FINISHED',len(record['views']),'views; errors:',errors,flush=True)
asyncio.run(main())
