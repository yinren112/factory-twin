#!/usr/bin/env python3
"""Browser acceptance and real screenshots.

Requires: Python 3, playwright, an installed Chromium browser.
Normal use: python tests/browser_acceptance.py --url http://localhost:4173
Without a server: --memory (or --file) opens index.html via file://; the page
uses classic deferred scripts, so the multi-file build runs unchanged.
Linux software rendering may need a running Xvfb and DISPLAY=:99.
"""
import argparse, asyncio, json, os, pathlib, time, hashlib
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://localhost:4173')
parser.add_argument('--memory','--file',dest='memory',action='store_true')
parser.add_argument('--browser',default=os.environ.get('CHROMIUM'))
args=parser.parse_args()

async def main():
 results=[];errors=[];warnings=[];external=[]
 def check(name,condition,detail=None):
  row={'test':name,'passed':bool(condition)}
  if detail is not None:row['detail']=detail
  results.append(row);(ROOT/'docs/browser-test-progress.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(('PASS ' if condition else 'FAIL ')+name,flush=True)
  if not condition:raise AssertionError(name+': '+str(detail))
 async with async_playwright() as p:
  launch_opts={'headless':True}
  if args.browser:launch_opts['executable_path']=args.browser;launch_opts['args']=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--use-gl=angle']
  browser=await p.chromium.launch(**launch_opts)
  ctx=await browser.new_context(viewport={'width':1600,'height':1000},device_scale_factor=1)
  page=await ctx.new_page()
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:errors.append(m.text) if m.type=='error' else warnings.append(m.text) if m.type=='warning' else None)
  page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http://','https://')) and not r.url.startswith(('http://localhost','http://127.0.0.1')) else None)
  async def click(selector):
   await page.locator(selector).click(force=True)
   await page.mouse.move(20,90)
   await page.wait_for_timeout(450)
  async def capture(name):
   was_balanced=(await state())['render']['quality']=='balanced' and await page.locator('#quality').is_visible()
   if was_balanced:await click('#quality')
   await page.locator('.panel').evaluate('(e)=>e.scrollTop=0')
   await page.wait_for_timeout(800)
   await page.screenshot(path=str(ROOT/'screenshots'/name),timeout=45000)
   print('SHOT '+name,flush=True)
   if was_balanced:await click('#quality')
  async def state():return await page.evaluate('window.__twin.snapshot()')
  try:
   if args.memory:await page.goto((ROOT/'index.html').as_uri(),wait_until='load',timeout=40000)
   else:await page.goto(args.url,wait_until='load',timeout=40000)
   await page.wait_for_function('window.__twin?.ready || window.__twinError',timeout=45000)
   check('WebGL scene initializes',await page.evaluate('!!window.__twin?.ready'))
   initial=await state()
   check('8 devices and initial 7 running / 1 standby',len(initial['devices'])==8 and initial['summary']['running']==7 and initial['summary']['idle']==1)
   check('Real GPU geometry, shadow / reflection rendering active',initial['render']['triangles']>20000 and initial['render']['quality']=='high',initial['render'])
   await page.wait_for_timeout(2400)
   live=await state()
   check('Telemetry advances while simulation is running',live['seconds']>initial['seconds'])
   await capture('01-overview.png')
   await click('#toggle-simulation')
   await click('#quality')
   paused=await state();await page.wait_for_timeout(1200)
   check('Pause freezes telemetry values',paused['devices']==(await state())['devices'] and paused['seconds']==(await state())['seconds'])
   await click('.device-row[data-device="8"]')
   check('Sidebar device row switches information panel',(await state())['selected']==8 and await page.locator('#device-code').inner_text()=='AGV-02')
   # Pick an actual visible CNC roof pixel, through mouse events on the WebGL canvas.
   pos=await page.evaluate('window.__twin.projectPoint([-2.8,3.38,-5.0])');rect=await page.locator('#scene').bounding_box()
   await page.mouse.click(rect['x']+pos['x'],rect['y']+pos['y']);await page.wait_for_timeout(1200)
   check('3D mesh ID-buffer picking selects the clicked CNC', (await state())['selected']==4,await state())
   # Real pointer dragging, scrolling and right-button panning.
   before=(await state())['camera'];x=rect['x']+rect['width']*.54;y=rect['y']+rect['height']*.63
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+75,y+18,steps=6);await page.mouse.up();await page.wait_for_timeout(700)
   after=(await state())['camera'];check('Orbit rotation responds to pointer drag',abs(before['theta']-after['theta'])>.1)
   await page.mouse.wheel(0,-180);await page.wait_for_timeout(700);zoom=(await state())['camera'];check('Wheel zoom changes camera distance',zoom['distance']<after['distance'])
   await page.mouse.move(x,y);await page.mouse.down(button='right');await page.mouse.move(x+40,y+12,steps=4);await page.mouse.up(button='right');await page.wait_for_timeout(700)
   check('Right-button drag pans camera target',(await state())['camera']['target']!=zoom['target'])
   await click('#view-home');await page.wait_for_timeout(1800)
   await click('.device-row[data-device="3"]');await click('#focus-device');await page.wait_for_timeout(1800)
   check('Focus flies camera to selected equipment',(await state())['camera']['distance']<15)
   await capture('02-robot-detail.png')
   # Briefly resume to prove all articulated mechanisms have actual time-varying poses.
   anim_before=await page.evaluate('window.__twin.deviceAnimations()')
   await click('#toggle-simulation');await page.wait_for_timeout(1800);await click('#toggle-simulation')
   anim_after=await page.evaluate('window.__twin.deviceAnimations()')
   check('Robots and AGV change pose during simulation',anim_before[0]['angles']!=anim_after[0]['angles'] and anim_before[2]['position']!=anim_after[2]['position'])
   await click('#toggle-device');check('Standby transition updates panel and state',(await state())['devices'][2]['state']=='idle')
   await click('#toggle-device');check('Resume transition restores running state',(await state())['devices'][2]['state']=='running')
   await click('#toggle-online');offline=await state();check('Offline simulation changes online count and power',offline['summary']['online']==7 and offline['devices'][2]['power']==0)
   await click('#toggle-online');check('Reconnect restores prior running state',(await state())['summary']['online']==8 and (await state())['devices'][2]['state']=='running')
   await click('#trigger-alarm');alarm=await state()
   check('Alarm synchronizes device, counter, panel and temperature',alarm['alarm']['id']==3 and alarm['devices'][2]['state']=='alarm' and alarm['devices'][2]['temperature']>80 and (await page.locator('#event-count').inner_text()).startswith('1') and await page.locator('#event-active').is_visible())
   check('3D alarm label is marked and reset action is available', 'alarm' in (await page.locator('.device-pin[data-device="3"]').get_attribute('class')) and await page.locator('#recover-alarm').is_visible())
   await capture('03-alarm-focus.png')
   await click('#view-home');await page.wait_for_timeout(1800);await capture('04-alarm-overview.png')
   # Verify alarm freezes RB-02 while RB-01 continues moving, without any test-only time mutation.
   a1=await page.evaluate('window.__twin.deviceAnimations()');await click('#toggle-simulation');await page.wait_for_timeout(1500);await click('#toggle-simulation');a2=await page.evaluate('window.__twin.deviceAnimations()')
   check('Alarm freezes affected robot, other robot continues',a1[1]['angles']==a2[1]['angles'] and a1[0]['angles']!=a2[0]['angles'])
   await click('#recover-alarm');recovered=await state();check('Reset clears alarm and restores equipment',recovered['alarm'] is None and recovered['devices'][2]['state']=='running' and await page.locator('#event-empty').is_visible())
   await click('#view-top');await page.wait_for_timeout(1800);check('Top view control changes camera elevation',(await state())['camera']['phi']<.2);await capture('05-top-view.png')
   await click('.device-row[data-device="7"]');await click('#focus-device');await page.wait_for_timeout(1800);await capture('06-agv-detail.png')
   await click('#view-home');await page.wait_for_timeout(1800);await click('#view-tour');t1=(await state())['camera']['theta'];await page.wait_for_timeout(1300);t2=(await state())['camera']['theta'];check('Camera cruise rotates without simulated-data changes',t2!=t1 and (await state())['paused']);await click('#view-tour')
   await click('#toggle-labels');check('Label visibility toggle works',await page.locator('#labels').evaluate('(e)=>getComputedStyle(e).display')=='none');await click('#toggle-labels')
   await click('#quality');check('High quality can be restored',(await state())['render']['quality']=='high');await click('#quality');check('Balanced quality switch remains renderable',(await state())['render']['quality']=='balanced' and not (await state())['render']['contextLost'])
   await page.set_viewport_size({'width':1280,'height':800});await click('#view-home');await page.wait_for_timeout(1800)
   check('1280 x 800 layout has no horizontal overflow',await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   await click('#quality')  # Enable high quality before the compact mobile toolbar hides this control.
   await page.set_viewport_size({'width':390,'height':844});await click('#view-home');await page.wait_for_timeout(1800)
   check('390 x 844 responsive layout renders with no horizontal overflow',await page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not (await state())['render']['contextLost']);await capture('07-mobile.png')
   check('No external assets or API calls needed',len(external)==0,external)
   check('No JavaScript, GLSL or framebuffer errors',len(errors)==0,errors)
   report={'passed':all(r['passed'] for r in results),'count':len(results),'browser':browser.version,'loadMode':'file:// index.html (multi-file)' if args.memory else args.url,'renderer':'Chromium / ANGLE SwiftShader (software)','index_sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'initialRender':initial['render'],'checks':results,'errors':errors,'warnings':warnings,'externalRequests':external,'screenshots':sorted(p.name for p in (ROOT/'screenshots').glob('[0-9][0-9]-*.png'))}
   (ROOT/'docs/browser-test-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
   print('COMPLETE',len(results),'checks',flush=True)
  except Exception:
   (ROOT/'docs/browser-test-failure.json').write_text(json.dumps({'checks':results,'errors':errors,'warnings':warnings},ensure_ascii=False,indent=2))
   await page.screenshot(path=str(ROOT/'screenshots/failure.png'),timeout=45000)
   raise
  finally:await browser.close()
asyncio.run(main())
